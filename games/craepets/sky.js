/* ===========================================================
   Craepets — THE SKY.
   -----------------------------------------------------------
   A see-through weather layer that sits over the painted scenery:
   twinkling stars, aurora curtains, rain, snow, a warm dusk haze,
   drifting summer motes. It is one small fragment shader (WebGL),
   so it costs the phone almost nothing, and it draws ONLY the
   atmosphere — the hills, the well, the pet and the room stay the
   crisp pixel/vector art underneath. No WebGL? It quietly draws
   nothing, and the scene looks exactly as it did before.

       var sky = CPSky.attach(sceneElement);   // adds a canvas
       sky.set("rain");                        // clear | rain | snow |
                                               // stars | aurora | dusk | motes
       sky.detach();
   =========================================================== */
window.CPSky = (function () {
  "use strict";

  var MODES = { clear: 0, motes: 1, rain: 2, snow: 3, stars: 4, aurora: 5, dusk: 6 };

  var VS = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";
  var FS = [
    "precision mediump float;",
    "uniform float t;uniform vec2 res;uniform int mode;uniform float sky;",   // sky = fraction of height that is sky (0..1)
    "float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}",
    "float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);",
    " return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}",
    "void main(){",
    " vec2 uv=gl_FragCoord.xy/res; float ar=res.x/res.y;",
    " vec3 col=vec3(0.); float a=0.;",
    " float up=smoothstep(1.-sky-0.15,1.-sky+0.05,uv.y);",   // 1 in the sky, fading to 0 at the ground
    " if(mode==4||mode==5){",
    "  vec2 sp=uv*vec2(ar,1.)*55.; vec2 si=floor(sp); float h=hash(si);",
    "  if(h>0.955){vec2 c=fract(sp)-0.5;float d=length(c);float tw=0.5+0.5*sin(t*2.2+h*90.);",
    "   float s=tw*smoothstep(0.32,0.0,d)*up; col+=s*vec3(1.0,0.97,0.9); a+=s;}",
    "  float sh=fract(t*0.08); vec2 sc=vec2(0.15+sh*1.2, 0.95-sh*0.35); vec2 d2=uv*vec2(ar,1.)-sc*vec2(ar,1.);",   // one shooting star, now and then
    "  float along=dot(d2,normalize(vec2(1.,-0.3)))*-1.0; float off=abs(dot(d2,normalize(vec2(0.3,1.))));",
    "  float star=smoothstep(0.02,0.0,off)*smoothstep(0.0,0.02,along)*smoothstep(0.25,0.0,along)*step(sh,0.5)*up;",
    "  col+=star*0.9; a+=star*0.9;",
    " }",
    " if(mode==5){ float band=0.;",
    "  for(int k=0;k<3;k++){float fk=float(k);float ce=0.55+0.12*fk+0.05*sin(uv.x*3.+t*0.35+fk*1.7);",
    "   float w=0.06+0.03*sin(uv.x*7.-t*0.5+fk*2.);float n=noise(vec2(uv.x*5.+t*0.2,fk*3.+t*0.12));",
    "   band+=exp(-pow((uv.y-ce)/w,2.))*(0.3+0.7*n);}",
    "  vec3 ac=mix(vec3(0.25,0.95,0.6),vec3(0.65,0.35,0.95),clamp(uv.x+0.25*sin(t*0.3),0.,1.));",
    "  float s=band*0.55*up; col+=s*ac; a+=s*0.8; }",
    " if(mode==2){ vec2 rp=uv*vec2(ar,1.); rp.y+=t*1.5; rp.x+=rp.y*0.1;",
    "  vec2 cell=vec2(46.,6.); vec2 id=floor(rp*cell); vec2 rc=fract(rp*cell); float on=step(0.62,hash(id));",
    "  float drop=smoothstep(0.09,0.,abs(rc.x-0.5))*smoothstep(0.,0.35,rc.y)*smoothstep(1.,0.55,rc.y)*on;",
    "  col+=drop*vec3(0.85,0.92,1.0); a+=drop*0.55; }",
    " if(mode==3){ float acc=0.;",
    "  for(int l=0;l<3;l++){float fl=float(l)+1.;vec2 s2=uv*vec2(ar,1.)*(9.*fl); s2.y+=t*0.25*fl; s2.x+=sin(t*0.5+fl)*0.2;",
    "   vec2 id=floor(s2); vec2 c=fract(s2)-0.5; c.x+=(hash(id)-0.5)*0.6; c.y+=(hash(id+3.)-0.5)*0.6;",
    "   acc+=smoothstep(0.13/fl+0.03,0.0,length(c))*(0.5+0.5*hash(id+7.));}",
    "  col+=acc; a+=acc*0.95; }",
    " if(mode==1){ float acc=0.;",
    "  for(int l=0;l<2;l++){float fl=float(l)+1.;vec2 s2=uv*vec2(ar,1.)*(6.*fl); s2.y-=t*0.05*fl; s2.x+=sin(t*0.3+fl+s2.y)*0.15;",
    "   vec2 id=floor(s2); vec2 c=fract(s2)-0.5; c.x+=(hash(id)-0.5)*0.7; c.y+=(hash(id+3.)-0.5)*0.7;",
    "   float tw=0.5+0.5*sin(t*1.5+hash(id+9.)*20.); acc+=smoothstep(0.05,0.0,length(c))*tw*step(0.4,hash(id+5.));}",
    "  col+=acc*vec3(1.0,0.95,0.75); a+=acc*0.7; }",
    " if(mode==6){ float g=smoothstep(0.35,1.0,uv.y)*(0.22+0.05*noise(vec2(uv.x*3.+t*0.1,uv.y*2.)));",
    "  col+=g*vec3(1.0,0.62,0.35); a+=g*0.9; }",
    " gl_FragColor=vec4(col,clamp(a,0.,1.));",
    "}"].join("\n");

  function attach(host, opts) {
    opts = opts || {};
    var cv = document.createElement("canvas");
    cv.className = "sky-layer";
    cv.setAttribute("aria-hidden", "true");
    host.appendChild(cv);
    var gl = null;
    try { gl = cv.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false }); } catch (e) { gl = null; }
    var api = { canvas: cv, mode: "clear", set: function () {}, detach: function () { if (cv.parentNode) cv.parentNode.removeChild(cv); } };
    if (!gl) return api;   // no WebGL: an empty, invisible canvas

    function sh(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    }
    var v = sh(gl.VERTEX_SHADER, VS), f = sh(gl.FRAGMENT_SHADER, FS);
    if (!v || !f) return api;
    var prog = gl.createProgram();
    gl.attachShader(prog, v); gl.attachShader(prog, f); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return api;
    gl.useProgram(prog);
    api.live = true;
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var uT = gl.getUniformLocation(prog, "t"), uR = gl.getUniformLocation(prog, "res"),
        uM = gl.getUniformLocation(prog, "mode"), uS = gl.getUniformLocation(prog, "sky");
    gl.clearColor(0, 0, 0, 0);

    var mode = 0, skyFrac = opts.sky === undefined ? 0.55 : opts.sky, running = false, raf = 0, start = performance.now();
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function size() {
      // half resolution is plenty for soft weather and kind to phones
      var w = Math.max(1, Math.round(cv.clientWidth / 2)), h = Math.max(1, Math.round(cv.clientHeight / 2));
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; gl.viewport(0, 0, w, h); }
    }
    function frame() {
      raf = 0;
      if (!running || !cv.parentNode) return;
      size();
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(uT, (performance.now() - start) / 1000);
      gl.uniform2f(uR, cv.width, cv.height);
      gl.uniform1i(uM, mode);
      gl.uniform1f(uS, skyFrac);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (!reduce && !document.hidden) raf = requestAnimationFrame(frame);
    }
    function go() { if (!raf && running) raf = requestAnimationFrame(frame); }
    api.set = function (name, o) {
      o = o || {};
      if (o.sky !== undefined) skyFrac = o.sky;
      mode = MODES[name] || 0;
      api.mode = name;
      running = mode !== 0;
      cv.style.display = running ? "" : "none";
      if (running) { size(); go(); }
      else if (gl) gl.clear(gl.COLOR_BUFFER_BIT);
    };
    document.addEventListener("visibilitychange", function () { if (!document.hidden) go(); });
    return api;
  }

  /* Which sky goes with the calendar's weather and the time of day.
     weather: "sun"|"cloud"|"rain"|"snow"|"storm"|"fog"|... tod: "day"|"dawn"|"dusk"|"night" */
  function modeFor(weather, tod, season) {
    weather = weather || "sun";
    if (weather === "rain" || weather === "storm") return "rain";
    if (weather === "snow") return "snow";
    if (tod === "night") return (season === "winter" || weather === "aurora") ? "aurora" : "stars";
    if (tod === "dusk" || tod === "dawn") return "dusk";
    if (season === "summer" && weather === "sun") return "motes";
    return "clear";
  }

  return { attach: attach, modeFor: modeFor, MODES: MODES };
})();
