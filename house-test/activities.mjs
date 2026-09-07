// Each service has a physical address in the Blender house. Coordinates are
// shared with the tour's room jump points, never with a second virtual map.
export const activities = [
  {id:'nest',room:'Living room',icon:'💛',name:'Pet & family',detail:'Wishes, mail, review, celebrations and learning level',view:'nest'},
  {id:'feed',room:'Kitchen',icon:'🍽️',name:'Feed your pet',detail:'Food, favourite snacks and cooking',view:'nest',action:'feed'},
  {id:'farm',room:'Back yard',icon:'🍓',name:'Garden & maths',detail:'Grow food by solving number questions',view:'farm'},
  {id:'well',room:'Basement office',icon:'📚',name:'Word library',detail:'Reading, spelling and vocabulary',view:'well'},
  {id:'read',room:'Basement office',icon:'📖',name:'Read a book',detail:'Read the books in your bag',view:'nest',action:'read'},
  {id:'pool',room:'Sunroom',icon:'🌈',name:'Rainbow studio',detail:'Wonder questions, brushes and pet colours',view:'pool'},
  {id:'wash',room:'Green bathroom',icon:'🫧',name:'Bath time',detail:'Wash and care for your Craepet',view:'nest',action:'wash'},
  {id:'rest',room:'Nursery',icon:'🌙',name:'Rest',detail:'A cosy place to recover energy',view:'nest',action:'rest'},
  {id:'dress',room:'Master bedroom',icon:'👒',name:'Wardrobe',detail:'Hats, glasses and scarves',view:'nest',action:'dress'},
  {id:'play',room:'Family room',icon:'🎾',name:'Play together',detail:'Toys and happiness',view:'nest',action:'play'},
  {id:'games',room:'Basement playroom',icon:'🎮',name:'Games room',detail:'Sky Catch and Memory Match',view:'games'},
  {id:'market',room:'Garage',icon:'🛍️',name:'Market',detail:'Food, books, furniture, petpets and family shops',view:'market'},
  {id:'bank',room:'Basement office',icon:'🏦',name:'Family bank',detail:'Deposits, withdrawals and interest',view:'bank'},
  {id:'stall',room:'Front porch',icon:'🏪',name:'Your shop',detail:'Stock, price and sell your things',view:'stall'},
  {id:'arena',room:'Front yard',icon:'⚔️',name:'Shadow Tower',detail:'Learning battles, family allies and rewards',view:'arena'},
  {id:'home',room:'Living room',icon:'🛋️',name:'Furnish & decorate',detail:'Furniture, homes, styles and their bonuses',view:'home'},
  {id:'bag',room:'Shared bedroom entry',icon:'🎒',name:'Your belongings',detail:'Food, toys, books, brushes and petpets',view:'bag'},
  {id:'quests',room:'Dining room',icon:'🎁',name:'Daily board',detail:'Quests, gifts and the prize wheel',view:'quests'},
  {id:'diary',room:'Pink-curtain bedroom',icon:'📔',name:'Diary',detail:'Write, draw and remember your adventures',view:'diary'},
  {id:'case',room:'White-curtain bedroom',icon:'🏆',name:'Trophies & visits',detail:'Achievements, family visits and presents',view:'case'},
];
export function destinationFor(view,action) {
  return activities.find(a=>action ? a.action===action : a.id===(view==='catch'?'games':view));
}
