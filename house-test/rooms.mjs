// Blender plan: name, X, plan Y (negative Three Z), floor height, camera yaw.
import {neighborhoodRooms} from './neighborhood-layout.mjs';
export const rooms=[
  ['Main floor','Front entry',5.65,.7,0,0],
  ['Main floor','Living room',5.8,2.0,0,-1.25],
  ['Main floor','Kitchen',2,6.8,0,1.4],
  ['Main floor','Dining room',5.6,7.5,0,Math.PI],
  ['Main floor','Sunroom',5.0,8.6,-.10,0],
  ['Main floor','Garage',-.7,7.5,-.16,1.4],
  ['Upstairs','Upstairs hall',11.5,4.01,1.26,-Math.PI/2],
  ['Upstairs',"Mom & Dad's bedroom",13.45,5.1,1.26,0],
  ['Upstairs',"Mom & Dad's bathroom",11.4,7.85,1.26,Math.PI/2],
  ['Upstairs','Green bathroom',11.1,5.0,1.26,0],
  ['Upstairs',"Kieran's bedroom",12.5,3.0,1.26,Math.PI],
  ['Upstairs',"Cory's bedroom",15.8,4.1,1.26,-Math.PI/2],
  ['Downstairs','Family room',10.3,2.7,-1.05,-Math.PI/2],
  ['Downstairs','Shared bedroom entry',11.5,5.1,-1.05,0],
  ['Downstairs',"Ellie's bedroom",10.4,6.2,-1.05,Math.PI/2],
  ['Downstairs',"Jeannie's bedroom",12.6,5.75,-1.05,-Math.PI/2],
  ['Downstairs','Downstairs bathroom',11.5,7.0,-1.05,0],
  ['Basement','Basement playroom',4.8,3.55,-3.15,Math.PI],
  ['Basement',"Mom & Dad's office",4.7,6.0,-3.15,0],
  ['Basement','Laundry',6.3,6.6,-3.15,0],
  ['Outside','Front porch',4.2,-.9,-.06,Math.PI/2],
  ['Outside','Front yard',6.5,-5.9,-.82,Math.PI],
  ['Outside','Back yard',5.1,13.5,-.82,0],
  ...neighborhoodRooms,
];
export const familyRooms={cory:"Cory's bedroom",kieran:"Kieran's bedroom",ellie:"Ellie's bedroom",jeannie:"Jeannie's bedroom",shannon:"Mom & Dad's office",tristan:"Mom & Dad's office",guest:'Living room'};
