// Stable evidence identities; runtime names stay unchanged for saves/activities.
import {rooms as runtimeRooms} from '../../house-test/rooms.mjs';

export const aspects = ['layout', 'openings', 'dimensions', 'materials', 'furniture', 'lighting'];
export const checklist = {
  layout: 'Entry and exit; continuous connection to the next room; all wall directions and a reverse view; stairs/level changes. State where the camera stands and faces; distinguish mirrors from openings.',
  openings: 'Each doorway/window: wall, order, corner offsets, sill/head height, trim, swing and adjoining space. Include both sides of important transitions.',
  dimensions: 'Room width/depth, ceiling height, wall thickness, opening sizes and stair count/rise/run. Record units, method and uncertainty. Perspective or standard furniture sizes are estimates, not measurements.',
  materials: 'Floor/wall/ceiling/trim and fixed fixtures: pattern scale/direction, color, roughness, sheen, grain, fabric and wear. Check close and wide views; separate surface color from lighting and auto white balance.',
  furniture: 'Fixed fixtures and large furniture: wall relationship, orientation, size, silhouette and clearance. Check reverse views and both bed ends; omit people, personal pictures and transient clutter.',
  lighting: 'Window direction, daylight/time/weather if known, fixture positions, light color, shadows and reflections. Exposure is not a measured light level. Compare in the browser as well as Blender.'
};

const entries = [
  ['front-entry','Front entry',['entry']],
  ['living','Living room',['living']],
  ['kitchen','Kitchen',['kitchen','kitchen_access']],
  ['dining','Dining room',['entry','kitchen']],
  ['sunroom','Sunroom',['sunroom']],
  ['garage','Garage',['garage','kitchen_access']],
  ['upper-hall','Upstairs hall',['hall','upper_plan','stairs']],
  ['primary','Mom & Dad\'s bedroom',['primary']],
  ['ensuite','Mom & Dad\'s bathroom',['ensuite','primary']],
  ['green-bathroom','Green bathroom',['bathroom']],
  ['kieran','Kieran\'s bedroom',['nursery']],
  ['cory','Cory\'s bedroom',['bedroom']],
  ['family','Family room',['family','stairs','basement_stairs']],
  ['lower-entry','Shared bedroom entry',['lower_entry']],
  ['ellie','Ellie\'s bedroom',['pink_bedroom']],
  ['jeannie','Jeannie\'s bedroom',['lower_bedroom']],
  ['lower-bathroom','Downstairs bathroom',['lower_bathroom']],
  ['basement-play','Basement playroom',['basement_play','basement_entry','basement_stairs']],
  ['office','Mom & Dad\'s office',['basement_office','basement_entry']],
  ['laundry','Laundry',['basement_laundry']],
  ['porch','Front porch',['porch']],
  ['front-yard','Front yard',['front_yard']],
  ['back-yard','Back yard',['back_yard']]
];
export const rooms = entries.map(([id,name,cameras]) => {
  const r = runtimeRooms.find(r => r[1] === name);
  if (!r) throw new Error(`Evidence room missing from runtime: ${name}`);
  return {id,name,level:r[0],cameras,estimatedBlenderPosition:[r[2],r[3],r[4]]};
});

export const initialQuestions = [
  ['ensuite-attachment','ensuite','Which bedroom wall contains the ensuite doorway? Follow a continuous path from bedroom entry past the closet/dresser to the bathroom, then reverse it. The current rotation is unconfirmed.'],
  ['basement-reverse','basement-play','Reconcile bunk, bookcase, dollhouse, foosball and stairs from both ends. From the bottom stair facing into the basement, homeowner-confirmed office right/play left supersedes older photo interpretations.'],
  ['office-window','office','Locate the high office window and office/laundry wall relative to the stairs and outside footprint; their absolute rotation remains estimated.'],
  ['ellie-bed','ellie','Show both ends of the bed and the doorway/window corner to resolve its head/foot orientation.'],
  ['cory-bed','cory','Check the inferred head near the entrance and foot toward the ottoman with a reverse angle; preserve window/handles/bookcase ordering.'],
  ['upper-stairs','upper-hall','Count upper stair risers, locate landing and first-left bathroom, and verify that the hall continues straight. Record measured rise/run if available.'],
  ['lower-stairs','family','Trace both parallel split-level flights and the adjacent basement return; count steps and measure elevations if available.'],
  ['lower-entry-offset','lower-entry','Trace the family-room stairs into the shared entry: Ellie left, bathroom ahead, Jeannie right. Establish the entry offset and doorway spacing.'],
  ['garage-opening','kitchen','Trace the garage door beyond the glass cupboard on the sink wall; show both sides, cabinet clearance and level change.'],
  ['sunroom-bays','sunroom','Count glazing bays, show the house-side door/window and roof/ceiling, and establish the floor step and connection to the yard.'],
  ['envelope','front-yard','Relate exterior walls, roof and split levels to interior windows and transitions. Keep unseen roof areas and lot distances explicitly estimated.']
].map(([id,roomId,question]) => ({id,roomId,question,status:'open',resolutionObservationIds:[]}));
