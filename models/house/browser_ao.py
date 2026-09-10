"""Optional, bounded vertex ambient occlusion for the browser export.

No Blender import until BVH construction. Geometry and byte order use the
exporter's browser world coordinates (Y up), including opened doors. The byte
buffer adds no fields to the existing six-float position/normal mesh stream.
This is a static, low-ray approximation; runtime applies it to ambient light.
"""
import array
import math
import random
import struct
import time
import zlib


def peak_memory_mib():
    """Small benchmark receipt; no optional packages or process enumeration."""
    import sys
    if sys.platform == 'win32':
        import ctypes
        from ctypes import wintypes
        class Counters(ctypes.Structure):
            _fields_ = [('cb', wintypes.DWORD), ('faults', wintypes.DWORD)] + [
                (n, ctypes.c_size_t) for n in ('peak', 'working', 'peakPaged', 'paged',
                                             'peakNonpaged', 'nonpaged', 'pagefile', 'peakPagefile')]
        data = Counters()
        data.cb = ctypes.sizeof(data)
        ctypes.windll.kernel32.GetCurrentProcess.restype = wintypes.HANDLE
        get_info = ctypes.windll.psapi.GetProcessMemoryInfo
        get_info.argtypes = [wintypes.HANDLE, ctypes.POINTER(Counters), wintypes.DWORD]
        if get_info(ctypes.windll.kernel32.GetCurrentProcess(), ctypes.byref(data), data.cb):
            return round(data.peak / 2**20, 2)
        return None
    try:
        import resource
        scale = 2**20 if sys.platform == 'darwin' else 1024
        return round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / scale, 2)
    except ImportError:
        return None


def occludes(name, finish):
    return (finish.get('surface') not in {'glass', 'foliage'} and
            finish.get('opacity', 1) >= .95 and
            not any(s in name.lower() for s in ('leaf', 'leaves', 'needle', 'net strand')))


def architectural_receiver(name, collection):
    """Only broad, near-house floor/wall surfaces receive added sample vertices."""
    n = name.lower()
    if collection[:2] not in {'01', '02', '03', '07', '14', '17', '24', '28', '30', '35', '39'}:
        return False
    return (any(s in n for s in ('floor', 'wall', 'partition', 'foundation', 'slab')) and
            not any(s in n for s in ('ceiling', 'skirt', 'sill', 'roof', 'siding', 'shingle', 'exterior')))


def sample_key(corner):
    """10 micrometre positions and split normals; identical seams share a value."""
    return struct.pack('<6i', *(round(corner[i] * (100000 if i < 3 else 10000)) for i in range(6)))


def subdivide_triangle(corners, edge=.7, max_triangles=1024):
    """Longest-edge splits preserve winding/area, with a strict output bound.

    Unlike an n*n grid this does not explode long, narrow floorboard triangles.
    Planar neighbours can have T junctions, but their positions remain on the
    original shared edge. Hard-edge split normals are never merged.
    """
    if edge <= 0 or max_triangles < 1:
        raise ValueError('Positive edge target and triangle budget required')
    if any(sum(corners[0][k] * n[k] for k in range(3, 6)) < .999 for n in corners[1:]):
        return [tuple(corners)]  # keep curved/beveled transitions intact
    def mix(a, b, t):
        p = tuple(a[k] + (b[k]-a[k])*t for k in range(6))
        length = math.sqrt(sum(v*v for v in p[3:]))
        return p[:3] + tuple(v/length for v in p[3:])
    lengths = [sum((corners[i][k]-corners[(i+1)%3][k])**2 for k in range(3)) for i in range(3)]
    longest = max(range(3), key=lengths.__getitem__)
    a, b, c = corners[longest], corners[(longest+1)%3], corners[(longest+2)%3]
    length = math.sqrt(lengths[longest])
    if length > edge:
        axis = tuple((b[k]-a[k])/length for k in range(3))
        def along(p): return sum((p[k]-a[k])*axis[k] for k in range(3))
        height = math.sqrt(max(0, sum((c[k]-a[k])**2 for k in range(3))-along(c)**2))
        if height < edge*.45:
            # Slice very narrow boards across their long axis, avoiding the
            # dense fan produced by repeatedly bisecting both long edges.
            slices = math.ceil(length/(math.sqrt(edge*edge-height*height)*.999))
            if slices*2+1 <= max_triangles:
                def clip(poly, cut, sign):
                    result = []
                    for p, q in zip(poly, poly[1:]+poly[:1]):
                        dp, dq = (along(p)-cut)*sign, (along(q)-cut)*sign
                        if dp >= 0: result.append(p)
                        if (dp >= 0) != (dq >= 0): result.append(mix(p,q,dp/(dp-dq)))
                    return result
                def nonzero(a,b,c):
                    u, v = [b[k]-a[k] for k in range(3)], [c[k]-a[k] for k in range(3)]
                    return sum((u[(k+1)%3]*v[(k+2)%3]-u[(k+2)%3]*v[(k+1)%3])**2 for k in range(3)) > 1e-20
                strips = []
                for i in range(slices):
                    poly = clip(clip(list(corners),i*length/slices,1),(i+1)*length/slices,-1)
                    strips.extend((poly[0],poly[j],poly[j+1]) for j in range(1,len(poly)-1)
                                  if nonzero(poly[0],poly[j],poly[j+1]))
                return strips
    todo, done = [tuple(corners)], []
    while todo:
        tri = todo.pop()
        lengths = [sum((tri[i][k] - tri[(i + 1) % 3][k]) ** 2 for k in range(3)) for i in range(3)]
        i = max(range(3), key=lengths.__getitem__)
        if lengths[i] <= edge * edge or len(todo) + len(done) + 2 > max_triangles:
            done.append(tri)
            continue
        a, b, c = tri[i], tri[(i + 1) % 3], tri[(i + 2) % 3]
        mid = mix(a, b, .5)
        todo.extend(((mid, b, c), (a, mid, c)))
    return done


def trace_occlusion(bvh, origin, direction, radius, bias, counters, max_skips=4):
    """Ignore/retry near self hits and back faces instead of baking black specks.

    Same-object distant hits remain valid (a chair can occlude its own seat).
    Retrying beyond ignored hits still sees a real wall or leg behind them.
    """
    travelled = 0.0
    for _ in range(max_skips + 1):
        location, normal, _, distance = bvh.ray_cast(origin, direction, radius - travelled)
        if location is None:
            return 0.0
        near = distance < bias * 2
        back = normal.dot(direction) >= -1e-5
        if not near and not back:
            counters['acceptedHits'] += 1
            return max(0.0, 1 - (travelled + distance) / radius) ** 2
        counters['ignoredNearHits'] += int(near)
        counters['ignoredBackfaceHits'] += int(back)
        step = max(0.0, distance) + bias * 2
        travelled += step
        if travelled >= radius:
            return 0.0
        origin = origin + direction * step
    counters['retryLimitHits'] += 1
    return 0.0


def benchmark_samples(groups, limit):
    """Representative deterministic reservoir; no partial bake is published."""
    if not 1 <= limit <= 10000:
        raise ValueError('Benchmark is bounded to 1..10000 samples')
    seen, selected = set(), []
    rng = random.Random(20260910)
    for group in groups:
        if not occludes('', group['finish']):
            continue
        values = group['values']
        for i in range(0, len(values), 6):
            corner = values[i:i + 6]
            key = sample_key(corner)
            if key in seen:
                continue
            seen.add(key)
            if len(selected) < limit:
                selected.append(corner)
            else:
                replace = rng.randrange(len(seen))
                if replace < limit:
                    selected[replace] = corner
    return array.array('f', (c for vertex in selected for c in vertex)), len(seen)


class VertexAO:
    def __init__(self, rays=8, radius=1.0, bias=.002, edge=.7,
                 max_extra_vertices=180000, max_unique_samples=1000000):
        if rays not in (8, 12) or not .05 <= radius <= 2 or not .0005 <= bias <= .01:
            raise ValueError('AO requires 8/12 rays, .05..2 m radius and .5..10 mm bias')
        if not .35 <= edge <= 2 or not 0 <= max_extra_vertices <= 600000:
            raise ValueError('AO edge must be .35..2 m and extra vertex budget 0..600000')
        self.rays, self.radius, self.bias, self.edge = rays, radius, bias, edge
        self.max_extra_vertices, self.max_unique_samples = max_extra_vertices, max_unique_samples
        self.positions, self.triangles = array.array('f'), array.array('I')
        self.cache, self.bvh = {}, None
        self.stats = dict(rays=rays, radiusMetres=radius, normalBiasMetres=bias,
                          targetEdgeMetres=edge, maxExtraVertices=max_extra_vertices,
                          extraVertices=0, tessellatedTriangles=0, cappedTriangles=0,
                          bvhTriangles=0, uniqueSamples=0, cacheHits=0,
                          acceptedHits=0, ignoredNearHits=0, ignoredBackfaceHits=0,
                          retryLimitHits=0)
        self.bake_seconds = 0.0

    def tessellate(self, corners, enabled):
        if not enabled:
            return [corners]
        remaining = self.max_extra_vertices - self.stats['extraVertices']
        limit = min(1024, remaining // 3 + 1)
        result = subdivide_triangle(corners, self.edge, limit)
        extra = (len(result) - 1) * 3
        self.stats['extraVertices'] += extra
        self.stats['tessellatedTriangles'] += int(extra > 0)
        if len(result) == limit and any(
                sum((t[i][k] - t[(i + 1) % 3][k]) ** 2 for k in range(3)) > self.edge ** 2
                for t in result for i in range(3)):
            self.stats['cappedTriangles'] += 1
        return result

    def add_occluder_mesh(self, positions, triangles):
        if not triangles:
            return
        base = len(self.positions) // 3
        self.positions.extend(c for p in positions for c in p)
        self.triangles.extend(base + i for tri in triangles for i in tri)

    def build(self):
        from mathutils import Vector
        from mathutils.bvhtree import BVHTree
        self.Vector = Vector
        started = time.perf_counter()
        self.stats['bvhTriangles'] = len(self.triangles) // 3
        # Packed buffers keep extraction memory low; BVH needs temporary tuples.
        vertices = [tuple(self.positions[i:i + 3]) for i in range(0, len(self.positions), 3)]
        triangles = [tuple(self.triangles[i:i + 3]) for i in range(0, len(self.triangles), 3)]
        self.positions, self.triangles = array.array('f'), array.array('I')
        self.bvh = BVHTree.FromPolygons(vertices, triangles, all_triangles=True, epsilon=0)
        self.stats['bvhBuildSeconds'] = round(time.perf_counter() - started, 3)
        print('AO_BVH', self.stats['bvhTriangles'], 'triangles', flush=True)

    def bake_group(self, values, receive=True):
        if len(values) % 6:
            raise ValueError('AO requires six-float position/normal vertices')
        if not receive:
            return bytes([255]) * (len(values) // 6)
        if self.bvh is None:
            raise RuntimeError('Build the AO BVH before baking')
        started = time.perf_counter()
        out = bytearray()
        for i in range(0, len(values), 6):
            corner = values[i:i + 6]
            key = sample_key(corner)
            value = self.cache.get(key)
            if value is None:
                if len(self.cache) >= self.max_unique_samples:
                    raise RuntimeError('AO unique sample budget exceeded; reduce tessellation before retrying')
                n = self.Vector(corner[3:])
                if n.length_squared < .5:
                    value = 255
                else:
                    n.normalize()
                    tangent = n.cross(self.Vector((0, 0, 1)) if abs(n.z) < .92 else self.Vector((0, 1, 0))).normalized()
                    bitangent = n.cross(tangent)
                    origin = self.Vector(corner[:3]) + n * self.bias
                    phase = zlib.crc32(key) / 2 ** 32 * math.tau
                    total = 0.0
                    for ray in range(self.rays):
                        u = (ray + .5) / self.rays
                        phi = ray * 2.399963229728653 + phase
                        direction = (tangent * (math.sqrt(u) * math.cos(phi)) +
                                     bitangent * (math.sqrt(u) * math.sin(phi)) + n * math.sqrt(1 - u))
                        total += trace_occlusion(self.bvh, origin, direction, self.radius, self.bias, self.stats)
                    value = round(255 * max(0.0, min(1.0, 1 - total / self.rays)))
                self.cache[key] = value
                if len(self.cache) % 25000 == 0:
                    print('AO_SAMPLES', len(self.cache), flush=True)
            else:
                self.stats['cacheHits'] += 1
            out.append(value)
        self.bake_seconds += time.perf_counter() - started
        self.stats['uniqueSamples'] = len(self.cache)
        self.stats['bakeSeconds'] = round(self.bake_seconds, 3)
        self.stats['peakWorkingSetMiB'] = peak_memory_mib()
        return out
