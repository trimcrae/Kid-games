/* ===========================================================
   World Trek — the geography data.
   -----------------------------------------------------------
   Two maps, both drawn as simple grids of squares so they are
   easy to read, easy to tap, and easy to edit here:

   1. WORLD_MAP — a chunky pixel map of the whole planet.
      One letter per square (48 across, 22 down). Capital
      letters are land, small letters are ocean:

        N North America   S South America   E Europe
        A Africa          I Asia            O Oceania
        T Antarctica
        p Pacific   t Atlantic   i Indian   r Arctic   s Southern

   2. STATE_GRID — all 50 US states laid out on an 11 × 8 grid
      of squares, each state next to (roughly) its real
      neighbours. It's a puzzle-map, not a traced outline: the
      point is which state is where, and who it touches.

   Everything else here is what a square teaches when you tap
   it — capitals, regions and one true fact each.
   =========================================================== */

/* ---------------- the world ---------------- */
const WORLD_MAP = [
  "rrrrrrrrNNNNNNNNNNNNNNrrrrrrrrrIIIIIIIIrrrrrrrrr",
  "rrNNNNNNNNNNNNNNNNNNNNrrrrEEEIIIIIIIIIIIIIIIIIII",
  "pNNNNNNNNNNNNNNNNNNNNNEtEEEEEIIIIIIIIIIIIIIIIIII",
  "pNNNNNNNNNNNNNNNNtttttEEEEEEEIIIIIIIIIIIIIIIIIII",
  "ppppppNNNNNNNNNNNtttttEEEEEEEIIIIIIIIIIIIIIIpppp",
  "pppppppNNNNNNNNtttttttEEEEEEIIIIIIIIIIIIIIIIpppp",
  "pppppppNNNNNNNptttttttEEEEEEIIIIIIIIIIIIIIIppppp",
  "ppppppppNNNNNNptttttttAAAAAAIIIIIIIIIIIIIppppppp",
  "pppppppppNNNNNNttttttAAAAAAAAIIIIIIIIIIipppppppp",
  "pppppppppppNNNSStttttAAAAAAAAIIiiIIIIIIipppppppp",
  "pppppppppppppSSSStttttAAAAAAAAiiiiiiIIIIIppppppp",
  "pppppppppppppSSSSSSStttttAAAAAiiiiiiiIIIIIIppppp",
  "pppppppppppppSSSSSSStttttAAAAAiiiiiiiiiippOOOppp",
  "ppppppppppppppSSSSSttttttAAAAAAiiiiiiiiOOOOOpppp",
  "ppppppppppppppSSSStttttttAAAAAAiiiiiiiiOOOOOOppp",
  "ppppppppppppppSSStttttttttAAAiiiiiiiiiiOOOOOOppp",
  "ppppppppppppppSStttttttttttiiiiiiiiiiiiippppppOO",
  "ppppppppppppppSStttttttttttiiiiiiiiiiiiipppppppp",
  "ssssssssssssssssssssssssssssssssssssssssssssssss",
  "ssssssssssssssssssssssssssssssssssssssssssssssss",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT"
];

const PLACES = {
  N: {
    name: "North America", emoji: "🦅", kind: "continent", color: "#3ddc84",
    fact: "Canada, the USA, Mexico and Central America. It has the Grand Canyon, the Great Lakes and the Rocky Mountains.",
    where: "We live here!"
  },
  S: {
    name: "South America", emoji: "🦜", kind: "continent", color: "#ffd166",
    fact: "Home of the Amazon rainforest and the Andes, the longest mountain range on Earth. Brazil is its biggest country.",
    where: "South of us, past Central America."
  },
  E: {
    name: "Europe", emoji: "🏰", kind: "continent", color: "#8a5cff",
    fact: "Small but packed — more than forty countries, with castles, the Alps and lots of different languages.",
    where: "Across the Atlantic Ocean from us."
  },
  A: {
    name: "Africa", emoji: "🦁", kind: "continent", color: "#f4791f",
    fact: "The second-biggest continent. It has the Sahara Desert and the Nile, one of the longest rivers in the world.",
    where: "South of Europe, across the Mediterranean Sea."
  },
  I: {
    name: "Asia", emoji: "🐼", kind: "continent", color: "#ff5d8f",
    fact: "The biggest continent, with the most people — and Mount Everest, the tallest mountain on Earth.",
    where: "Way east, on the other side of the world."
  },
  O: {
    name: "Australia & Oceania", emoji: "🦘", kind: "continent", color: "#00b8a9",
    fact: "Australia plus thousands of Pacific islands. Kangaroos, koalas and the Great Barrier Reef live here.",
    where: "Down under, in the south Pacific."
  },
  T: {
    name: "Antarctica", emoji: "🐧", kind: "continent", color: "#bfe3ff",
    fact: "The coldest place on Earth — almost all ice, with no countries at all. Just penguins, seals and scientists.",
    where: "The very bottom of the world."
  },
  p: {
    name: "Pacific Ocean", emoji: "🌊", kind: "ocean", color: "#5cc6ff",
    fact: "The biggest ocean — wider than all the land on Earth put together, and the deepest too.",
    where: "Between America and Asia."
  },
  t: {
    name: "Atlantic Ocean", emoji: "🌊", kind: "ocean", color: "#38a8f0",
    fact: "The ocean the Pilgrims sailed across. It's getting wider by a few centimetres every year!",
    where: "Between the Americas and Europe & Africa."
  },
  i: {
    name: "Indian Ocean", emoji: "🌊", kind: "ocean", color: "#2f8fd8",
    fact: "The warmest ocean in the world, with monsoon rains that blow one way in summer and the other way in winter.",
    where: "South of Asia, east of Africa."
  },
  r: {
    name: "Arctic Ocean", emoji: "🧊", kind: "ocean", color: "#a8dcff",
    fact: "The smallest and coldest ocean — much of it is covered by floating sea ice, where polar bears hunt.",
    where: "The very top of the world."
  },
  s: {
    name: "Southern Ocean", emoji: "🧊", kind: "ocean", color: "#7cc2ea",
    fact: "It goes all the way around Antarctica in a giant circle, with the strongest winds on the planet.",
    where: "Around the bottom of the world."
  }
};

/* ---------------- the United States ---------------- */
const STATE_GRID = [
  "AK .. .. .. .. .. .. .. .. .. ME",
  ".. .. .. .. .. .. .. .. .. VT NH",
  "WA ID MT ND MN WI MI .. NY MA RI",
  "OR NV WY SD IA IL IN OH PA NJ CT",
  "CA UT CO NE MO KY WV VA MD DE ..",
  ".. AZ NM KS AR TN NC SC .. .. ..",
  ".. .. OK LA MS AL GA .. .. .. ..",
  "HI .. TX .. .. .. .. FL .. .. .."
];

const REGIONS = {
  West:      { color: "#3ddc84", emoji: "🏔️" },
  Midwest:   { color: "#ffd166", emoji: "🌽" },
  South:     { color: "#ff8fab", emoji: "🌴" },
  Northeast: { color: "#8a5cff", emoji: "🍁" }
};

// code: [name, capital, region, one true fact]
const STATES = {
  AL: ["Alabama", "Montgomery", "South", "Rockets built in Huntsville helped astronauts fly to the Moon."],
  AK: ["Alaska", "Juneau", "West", "The biggest state — with more coastline than all the others put together."],
  AZ: ["Arizona", "Phoenix", "West", "The Grand Canyon is here, and it is about a mile deep."],
  AR: ["Arkansas", "Little Rock", "South", "At Crater of Diamonds you can dig for real diamonds and keep them."],
  CA: ["California", "Sacramento", "West", "Giant sequoia trees grow here — the biggest trees on Earth."],
  CO: ["Colorado", "Denver", "West", "More than fifty of its Rocky Mountain peaks are over 14,000 feet tall."],
  CT: ["Connecticut", "Hartford", "Northeast", "Noah Webster wrote the first American dictionary here."],
  DE: ["Delaware", "Dover", "South", "The very first state to join the United States."],
  FL: ["Florida", "Tallahassee", "South", "Rockets launch from Cape Canaveral, and alligators live in the Everglades."],
  GA: ["Georgia", "Atlanta", "South", "Peaches, peanuts — and the world's busiest airport."],
  HI: ["Hawaii", "Honolulu", "West", "A chain of islands built by volcanoes in the middle of the Pacific."],
  ID: ["Idaho", "Boise", "West", "Famous for potatoes — and for canyons deeper than the Grand Canyon."],
  IL: ["Illinois", "Springfield", "Midwest", "Chicago built some of the very first skyscrapers."],
  IN: ["Indiana", "Indianapolis", "Midwest", "The Indy 500 race goes 500 miles around one oval track."],
  IA: ["Iowa", "Des Moines", "Midwest", "So much corn grows here that it's the heart of the Corn Belt."],
  KS: ["Kansas", "Topeka", "Midwest", "Flat prairie, golden wheat fields and lots of thunderstorms."],
  KY: ["Kentucky", "Frankfort", "South", "Mammoth Cave has hundreds of miles of tunnels underground."],
  LA: ["Louisiana", "Baton Rouge", "South", "Jazz music was invented in New Orleans."],
  ME: ["Maine", "Augusta", "Northeast", "Lobster boats, lighthouses — and the first sunrise in the USA."],
  MD: ["Maryland", "Annapolis", "South", "The Star-Spangled Banner was written about a battle at Fort McHenry."],
  MA: ["Massachusetts", "Boston", "Northeast", "The Pilgrims landed at Plymouth here in 1620."],
  MI: ["Michigan", "Lansing", "Midwest", "Shaped like a mitten, and it touches four of the five Great Lakes."],
  MN: ["Minnesota", "Saint Paul", "Midwest", "Land of 10,000 lakes — and the Mississippi River starts here."],
  MS: ["Mississippi", "Jackson", "South", "The Mississippi River forms its whole western edge."],
  MO: ["Missouri", "Jefferson City", "Midwest", "The Gateway Arch in St. Louis is the tallest arch in the world."],
  MT: ["Montana", "Helena", "West", "Glacier National Park is full of mountains, bears and real glaciers."],
  NE: ["Nebraska", "Lincoln", "Midwest", "Its Sandhills are giant grass-covered sand dunes full of cattle."],
  NV: ["Nevada", "Carson City", "West", "Mostly desert and mountains — plus the bright lights of Las Vegas."],
  NH: ["New Hampshire", "Concord", "Northeast", "Mount Washington has some of the windiest weather on Earth."],
  NJ: ["New Jersey", "Trenton", "Northeast", "Thomas Edison invented the light bulb in his New Jersey lab."],
  NM: ["New Mexico", "Santa Fe", "West", "White Sands is a whole desert of soft white gypsum dunes."],
  NY: ["New York", "Albany", "Northeast", "The Statue of Liberty welcomes ships into New York Harbor."],
  NC: ["North Carolina", "Raleigh", "South", "The Wright brothers flew the first airplane at Kitty Hawk."],
  ND: ["North Dakota", "Bismarck", "Midwest", "Wild bison still roam its badlands."],
  OH: ["Ohio", "Columbus", "Midwest", "Seven US presidents were born in Ohio."],
  OK: ["Oklahoma", "Oklahoma City", "South", "Home to 39 Native American nations."],
  OR: ["Oregon", "Salem", "West", "Crater Lake sits inside an old volcano — the deepest lake in the USA."],
  PA: ["Pennsylvania", "Harrisburg", "Northeast", "The Declaration of Independence was signed in Philadelphia."],
  RI: ["Rhode Island", "Providence", "Northeast", "The smallest state of all — you can drive across it in an hour."],
  SC: ["South Carolina", "Columbia", "South", "Warm beaches and huge old oak trees draped in Spanish moss."],
  SD: ["South Dakota", "Pierre", "Midwest", "Four presidents' faces are carved into Mount Rushmore."],
  TN: ["Tennessee", "Nashville", "South", "Nashville is called Music City — the home of country music."],
  TX: ["Texas", "Austin", "South", "The second-biggest state, with cowboys, oil and NASA in Houston."],
  UT: ["Utah", "Salt Lake City", "West", "Red rock arches — and a lake so salty that you float in it."],
  VT: ["Vermont", "Montpelier", "Northeast", "The maple syrup champion: it comes from sugar maple tree sap."],
  VA: ["Virginia", "Richmond", "South", "Eight US presidents were born here — more than any other state."],
  WA: ["Washington", "Olympia", "West", "Mount Rainier is a snowy volcano you can see from Seattle."],
  WV: ["West Virginia", "Charleston", "South", "Almost entirely mountains — that's why it's the Mountain State."],
  WI: ["Wisconsin", "Madison", "Midwest", "Famous for cheese, dairy farms and long snowy winters."],
  WY: ["Wyoming", "Cheyenne", "West", "Yellowstone, the world's first national park, with the geyser Old Faithful."]
};

/* ===========================================================
   DEPTH PACK — added so every place has a real card behind it
   -----------------------------------------------------------
   * WORLD_EXTRA  — size, tallest peak, longest river & how many
                    countries, for each continent / ocean.
   * STATE_EXTRA  — nickname, year it joined, area in square
                    miles, and its BIGGEST city (which is very
                    often NOT the capital — that's the whole
                    point of the "why" explanations).
   * COUNTRIES    — 44 countries with capital, continent, size
                    and a true fact.
   * FLAGS        — each flag drawn as tiny inline SVG, so it
                    looks the same on every device (emoji flags
                    don't render at all on Windows) and needs no
                    downloads.
   =========================================================== */

/* ---------------- continents & oceans, in more detail ------- */
const WORLD_EXTRA = {
  N: { area: 9540000, nations: 23, peak: "Denali, Alaska — 20,310 ft", river: "The Missouri–Mississippi, about 3,900 miles" },
  S: { area: 6890000, nations: 12, peak: "Aconcagua, Argentina — 22,838 ft", river: "The Amazon — it carries more water than any river on Earth" },
  E: { area: 3930000, nations: 44, peak: "Mount Elbrus, Russia — 18,510 ft", river: "The Volga, about 2,200 miles" },
  A: { area: 11730000, nations: 54, peak: "Mount Kilimanjaro, Tanzania — 19,341 ft", river: "The Nile, about 4,100 miles" },
  I: { area: 17210000, nations: 48, peak: "Mount Everest, Nepal & China — 29,032 ft", river: "The Yangtze, about 3,900 miles" },
  O: { area: 3290000, nations: 14, peak: "Puncak Jaya, New Guinea — 16,024 ft", river: "The Murray, about 1,560 miles" },
  T: { area: 5500000, nations: 0, peak: "Vinson Massif — 16,050 ft", river: "No rivers — the water is all frozen" },
  p: { area: 63800000, deep: "Mariana Trench — nearly 36,000 ft down, deeper than Everest is tall" },
  t: { area: 41100000, deep: "Puerto Rico Trench — about 27,500 ft down" },
  i: { area: 27240000, deep: "Java Trench — about 23,900 ft down" },
  r: { area: 5430000, deep: "Molloy Hole — about 18,200 ft down" },
  s: { area: 7850000, deep: "South Sandwich Trench — about 24,400 ft down" }
};

/* ---------------- every state, in more detail ---------------
   [ nickname, year it became a state, area in sq miles,
     biggest city ]                                            */
const STATE_EXTRA = {
  AL: ["the Yellowhammer State", 1819, 52420, "Huntsville"],
  AK: ["the Last Frontier", 1959, 665384, "Anchorage"],
  AZ: ["the Grand Canyon State", 1912, 113990, "Phoenix"],
  AR: ["the Natural State", 1836, 53179, "Little Rock"],
  CA: ["the Golden State", 1850, 163695, "Los Angeles"],
  CO: ["the Centennial State", 1876, 104094, "Denver"],
  CT: ["the Constitution State", 1788, 5543, "Bridgeport"],
  DE: ["the First State", 1787, 2489, "Wilmington"],
  FL: ["the Sunshine State", 1845, 65758, "Jacksonville"],
  GA: ["the Peach State", 1788, 59425, "Atlanta"],
  HI: ["the Aloha State", 1959, 10932, "Honolulu"],
  ID: ["the Gem State", 1890, 83569, "Boise"],
  IL: ["the Prairie State", 1818, 57914, "Chicago"],
  IN: ["the Hoosier State", 1816, 36420, "Indianapolis"],
  IA: ["the Hawkeye State", 1846, 56273, "Des Moines"],
  KS: ["the Sunflower State", 1861, 82278, "Wichita"],
  KY: ["the Bluegrass State", 1792, 40408, "Louisville"],
  LA: ["the Pelican State", 1812, 52378, "New Orleans"],
  ME: ["the Pine Tree State", 1820, 35380, "Portland"],
  MD: ["the Old Line State", 1788, 12406, "Baltimore"],
  MA: ["the Bay State", 1788, 10554, "Boston"],
  MI: ["the Great Lakes State", 1837, 96714, "Detroit"],
  MN: ["the North Star State", 1858, 86936, "Minneapolis"],
  MS: ["the Magnolia State", 1817, 48432, "Jackson"],
  MO: ["the Show Me State", 1821, 69707, "Kansas City"],
  MT: ["the Treasure State", 1889, 147040, "Billings"],
  NE: ["the Cornhusker State", 1867, 77348, "Omaha"],
  NV: ["the Silver State", 1864, 110572, "Las Vegas"],
  NH: ["the Granite State", 1788, 9349, "Manchester"],
  NJ: ["the Garden State", 1787, 8723, "Newark"],
  NM: ["the Land of Enchantment", 1912, 121590, "Albuquerque"],
  NY: ["the Empire State", 1788, 54555, "New York City"],
  NC: ["the Tar Heel State", 1789, 53819, "Charlotte"],
  ND: ["the Peace Garden State", 1889, 70698, "Fargo"],
  OH: ["the Buckeye State", 1803, 44826, "Columbus"],
  OK: ["the Sooner State", 1907, 69899, "Oklahoma City"],
  OR: ["the Beaver State", 1859, 98379, "Portland"],
  PA: ["the Keystone State", 1787, 46054, "Philadelphia"],
  RI: ["the Ocean State", 1790, 1545, "Providence"],
  SC: ["the Palmetto State", 1788, 32020, "Charleston"],
  SD: ["the Mount Rushmore State", 1889, 77116, "Sioux Falls"],
  TN: ["the Volunteer State", 1796, 42144, "Nashville"],
  TX: ["the Lone Star State", 1845, 268596, "Houston"],
  UT: ["the Beehive State", 1896, 84897, "Salt Lake City"],
  VT: ["the Green Mountain State", 1791, 9616, "Burlington"],
  VA: ["the Old Dominion", 1788, 42775, "Virginia Beach"],
  WA: ["the Evergreen State", 1889, 71298, "Seattle"],
  WV: ["the Mountain State", 1863, 24230, "Charleston"],
  WI: ["the Badger State", 1848, 65496, "Milwaukee"],
  WY: ["the Equality State", 1890, 97813, "Cheyenne"]
};

/* ---------------- flags, drawn as tiny SVG ------------------
   Emoji flags do not render on Windows (they come out as two
   letters, which would literally spell the answer), so every
   flag here is drawn from rectangles, circles and stars in a
   60 x 40 box. No downloads, identical everywhere.            */
function _bars(colors, vertical) {
  var n = colors.length, out = "", i;
  for (i = 0; i < n; i++) {
    out += vertical
      ? '<rect x="' + (60 * i / n) + '" width="' + (60 / n + 0.2) + '" height="40" fill="' + colors[i] + '"/>'
      : '<rect y="' + (40 * i / n) + '" width="60" height="' + (40 / n + 0.2) + '" fill="' + colors[i] + '"/>';
  }
  return out;
}
function _star(cx, cy, r, fill) {
  var pts = [], i, a, rr;
  for (i = 0; i < 10; i++) {
    a = (Math.PI / 5) * i - Math.PI / 2;
    rr = i % 2 ? r * 0.382 : r;
    pts.push((cx + rr * Math.cos(a)).toFixed(2) + "," + (cy + rr * Math.sin(a)).toFixed(2));
  }
  return '<polygon points="' + pts.join(" ") + '" fill="' + fill + '"/>';
}
function _pentagram(cx, cy, r, stroke, w) {
  var p = [], i, a;
  for (i = 0; i < 5; i++) {
    a = (Math.PI * 2 / 5) * i - Math.PI / 2;
    p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  var order = [0, 2, 4, 1, 3], d = "", j;
  for (j = 0; j < 5; j++) d += (j ? "L" : "M") + p[order[j]][0].toFixed(2) + "," + p[order[j]][1].toFixed(2);
  return '<path d="' + d + 'Z" fill="none" stroke="' + stroke + '" stroke-width="' + (w || 1.6) + '"/>';
}
function _nordic(bg, cross, edge) {
  var s = '<rect width="60" height="40" fill="' + bg + '"/>';
  if (edge) s += '<path d="M18,0 V40 M0,20 H60" stroke="' + edge + '" stroke-width="12" fill="none"/>';
  s += '<path d="M18,0 V40 M0,20 H60" stroke="' + cross + '" stroke-width="' + (edge ? 6 : 9) + '" fill="none"/>';
  return s;
}
var _UJ =
  '<rect width="60" height="40" fill="#012169"/>' +
  '<path d="M0,0 60,40 M60,0 0,40" stroke="#fff" stroke-width="8" fill="none"/>' +
  '<path d="M0,0 60,40 M60,0 0,40" stroke="#C8102E" stroke-width="4" fill="none"/>' +
  '<path d="M30,0 V40 M0,20 H60" stroke="#fff" stroke-width="13" fill="none"/>' +
  '<path d="M30,0 V40 M0,20 H60" stroke="#C8102E" stroke-width="7" fill="none"/>';

var _MAPLE = "50,2 55,22 68,18 64,34 80,30 74,44 92,42 78,56 95,64 56,72 60,96 50,88 " +
             "40,96 44,72 5,64 22,56 8,42 26,44 20,30 36,34 32,18 45,22";

const FLAGS = {
  US: (function () {
    var s = '<rect width="60" height="40" fill="#fff"/>', i;
    for (i = 0; i < 7; i++) s += '<rect y="' + (i * 6.154).toFixed(2) + '" width="60" height="3.2" fill="#B22234"/>';
    s += '<rect width="24" height="21.54" fill="#3C3B6E"/>';
    for (var r = 0; r < 5; r++) for (var c = 0; c < 6; c++)
      s += '<circle cx="' + (2.4 + c * 4).toFixed(1) + '" cy="' + (2.4 + r * 4.3).toFixed(1) + '" r="1.15" fill="#fff"/>';
    return s;
  })(),
  CA: '<rect width="60" height="40" fill="#fff"/><rect width="15" height="40" fill="#D80621"/>' +
      '<rect x="45" width="15" height="40" fill="#D80621"/>' +
      '<polygon points="' + _MAPLE + '" fill="#D80621" transform="translate(30,20) scale(0.30,0.33) translate(-50,-50)"/>',
  BR: '<rect width="60" height="40" fill="#009B3A"/><polygon points="30,3.5 56.5,20 30,36.5 3.5,20" fill="#FEDF00"/>' +
      '<circle cx="30" cy="20" r="9" fill="#002776"/>' +
      '<clipPath id="brc"><circle cx="30" cy="20" r="9"/></clipPath>' +
      '<g clip-path="url(#brc)"><path d="M18,26.5 Q30,15 42,26.5" fill="none" stroke="#fff" stroke-width="3.2"/></g>' +
      '<circle cx="26" cy="19" r="0.9" fill="#fff"/><circle cx="32" cy="16.5" r="0.8" fill="#fff"/>' +
      '<circle cx="34" cy="22" r="0.9" fill="#fff"/><circle cx="27.5" cy="23.5" r="0.7" fill="#fff"/>',
  AR: _bars(["#74ACDF", "#FFFFFF", "#74ACDF"], false) +
      '<circle cx="30" cy="20" r="6.4" fill="none" stroke="#F6B40E" stroke-width="2.2" stroke-dasharray="1.1 1.3"/>' +
      '<circle cx="30" cy="20" r="3.6" fill="#F6B40E"/>',
  PE: _bars(["#D91023", "#FFFFFF", "#D91023"], true),
  CO: '<rect width="60" height="20.2" fill="#FCD116"/><rect y="20" width="60" height="10.2" fill="#003893"/>' +
      '<rect y="30" width="60" height="10" fill="#CE1126"/>',
  CL: '<rect width="60" height="40" fill="#fff"/><rect y="20" width="60" height="20" fill="#D52B1E"/>' +
      '<rect width="20" height="20" fill="#0039A6"/>' + _star(10, 10, 6.2, "#fff"),
  GB: _UJ,
  FR: _bars(["#0055A4", "#FFFFFF", "#EF4135"], true),
  DE: _bars(["#000000", "#DD0000", "#FFCE00"], false),
  IT: _bars(["#008C45", "#F4F5F0", "#CD212A"], true),
  IE: _bars(["#169B62", "#FFFFFF", "#FF883E"], true),
  NL: _bars(["#AE1C28", "#FFFFFF", "#21468B"], false),
  PL: _bars(["#FFFFFF", "#DC143C"], false),
  ES: '<rect width="60" height="40" fill="#AA151B"/><rect y="10" width="60" height="20" fill="#F1BF00"/>',
  PT: '<rect width="60" height="40" fill="#DA020E"/><rect width="24" height="40" fill="#006600"/>' +
      '<circle cx="24" cy="20" r="7" fill="none" stroke="#FFE900" stroke-width="1.8"/>' +
      '<rect x="21" y="16.5" width="6" height="7.5" rx="2" fill="#DA020E" stroke="#fff" stroke-width="0.9"/>',
  GR: (function () {
    var s = "", i;
    for (i = 0; i < 9; i++) s += '<rect y="' + (i * 4.444).toFixed(2) + '" width="60" height="4.6" fill="' + (i % 2 ? "#fff" : "#0D5EAF") + '"/>';
    s += '<rect width="22.22" height="22.22" fill="#0D5EAF"/>';
    s += '<path d="M11.11,0 V22.22 M0,11.11 H22.22" stroke="#fff" stroke-width="4.44" fill="none"/>';
    return s;
  })(),
  NO: _nordic("#BA0C2F", "#00205B", "#fff"),
  SE: _nordic("#006AA7", "#FECC00"),
  CH: '<rect width="60" height="40" fill="#D52B1E"/><path d="M30,9 V31 M19,20 H41" stroke="#fff" stroke-width="7" fill="none"/>',
  JP: '<rect width="60" height="40" fill="#fff"/><circle cx="30" cy="20" r="12" fill="#BC002D"/>',
  CN: '<rect width="60" height="40" fill="#DE2910"/>' + _star(11, 11, 6.5, "#FFDE00") +
      _star(21, 4, 2.2, "#FFDE00") + _star(25.5, 9, 2.2, "#FFDE00") +
      _star(25.5, 15.5, 2.2, "#FFDE00") + _star(21, 20.5, 2.2, "#FFDE00"),
  IN: _bars(["#FF9933", "#FFFFFF", "#138808"], false) +
      '<circle cx="30" cy="20" r="5.4" fill="none" stroke="#000080" stroke-width="0.9"/>' +
      '<circle cx="30" cy="20" r="2.7" fill="none" stroke="#000080" stroke-width="4.4" stroke-dasharray="0.55 0.85"/>' +
      '<circle cx="30" cy="20" r="0.9" fill="#000080"/>',
  KR: '<rect width="60" height="40" fill="#fff"/><circle cx="30" cy="20" r="9.5" fill="#0047A0"/>' +
      '<path d="M20.5,20 a4.75,4.75 0 0,1 9.5,0 a4.75,4.75 0 0,0 9.5,0 a9.5,9.5 0 0,1 -19,0" fill="#CD2E3A"/>' +
      '<g fill="#000">' +
      '<g transform="translate(10,8) rotate(56)"><rect x="-4.5" y="-2.8" width="9" height="1.5"/><rect x="-4.5" y="-0.75" width="9" height="1.5"/><rect x="-4.5" y="1.3" width="9" height="1.5"/></g>' +
      '<g transform="translate(50,8) rotate(-56)"><rect x="-4.5" y="-2.8" width="9" height="1.5"/><rect x="-4.5" y="-0.75" width="9" height="1.5"/><rect x="-4.5" y="1.3" width="9" height="1.5"/></g>' +
      '<g transform="translate(10,32) rotate(-56)"><rect x="-4.5" y="-2.8" width="9" height="1.5"/><rect x="-4.5" y="-0.75" width="9" height="1.5"/><rect x="-4.5" y="1.3" width="9" height="1.5"/></g>' +
      '<g transform="translate(50,32) rotate(56)"><rect x="-4.5" y="-2.8" width="9" height="1.5"/><rect x="-4.5" y="-0.75" width="9" height="1.5"/><rect x="-4.5" y="1.3" width="9" height="1.5"/></g>' +
      '</g>',
  VN: '<rect width="60" height="40" fill="#DA251D"/>' + _star(30, 20, 11, "#FFFF00"),
  TH: '<rect width="60" height="40" fill="#A51931"/><rect y="6.67" width="60" height="26.66" fill="#F4F5F8"/>' +
      '<rect y="13.33" width="60" height="13.34" fill="#2D2A4A"/>',
  ID: '<rect width="60" height="40" fill="#fff"/><rect width="60" height="20" fill="#CE1126"/>',
  TR: '<rect width="60" height="40" fill="#E30A17"/><circle cx="24" cy="20" r="9" fill="#fff"/>' +
      '<circle cx="27.6" cy="20" r="7.2" fill="#E30A17"/>' + _star(38, 20, 4.4, "#fff"),
  NG: _bars(["#008751", "#FFFFFF", "#008751"], true),
  GH: _bars(["#CE1126", "#FCD116", "#006B3F"], false) + _star(30, 20, 5.6, "#000"),
  MA: '<rect width="60" height="40" fill="#C1272D"/>' + _pentagram(30, 20, 10.5, "#006233", 1.7),
  ET: _bars(["#078930", "#FCDD09", "#DA121A"], false) +
      '<circle cx="30" cy="20" r="9" fill="#0F47AF"/>' + _pentagram(30, 20, 6.6, "#FCDD09", 1.3),
  AU: '<rect width="60" height="40" fill="#00247D"/><g transform="scale(0.5)">' + _UJ + '</g>' +
      _star(15, 30, 5, "#fff") + _star(47, 8, 3, "#fff") + _star(53, 20, 3.4, "#fff") +
      _star(46, 31, 3, "#fff") + _star(40, 21, 2.6, "#fff") + _star(50, 13.5, 1.8, "#fff"),
  NZ: '<rect width="60" height="40" fill="#00247D"/><g transform="scale(0.5)">' + _UJ + '</g>' +
      _star(49, 9, 3.2, "#fff") + _star(49, 9, 2.2, "#CC142B") +
      _star(54, 21, 3.6, "#fff") + _star(54, 21, 2.5, "#CC142B") +
      _star(44, 23, 3.2, "#fff") + _star(44, 23, 2.2, "#CC142B") +
      _star(49, 33, 3.4, "#fff") + _star(49, 33, 2.3, "#CC142B")
};

/* ---------------- countries -------------------------------
   [ name, capital, continent code, area in sq miles, fact ]
   The key doubles as the FLAGS key when there is a flag.     */
const COUNTRIES = {
  US: ["United States", "Washington, D.C.", "N", 3796742, "Fifty states — and a capital city, Washington, D.C., that sits in no state at all."],
  CA: ["Canada", "Ottawa", "N", 3855100, "It has more lakes than the rest of the world put together, and two official languages."],
  MX: ["Mexico", "Mexico City", "N", 761610, "Mexico City is built on top of the old Aztec capital, Tenochtitlan, on a drained lake."],
  CU: ["Cuba", "Havana", "N", 42426, "The biggest island in the Caribbean Sea."],
  BR: ["Brazil", "Brasília", "S", 3287956, "The biggest country in South America. Brasília was built from nothing in the 1950s to be the capital."],
  AR: ["Argentina", "Buenos Aires", "S", 1073500, "Home of the tango — and of Aconcagua, the tallest mountain outside Asia."],
  PE: ["Peru", "Lima", "S", 496225, "The lost Inca city of Machu Picchu sits high in Peru's Andes mountains."],
  CO: ["Colombia", "Bogotá", "S", 440831, "The only South American country that touches both the Pacific and the Caribbean."],
  CL: ["Chile", "Santiago", "S", 291933, "A ribbon of a country: over 2,600 miles long but hardly ever 150 miles wide."],
  GB: ["United Kingdom", "London", "E", 93628, "Four parts in one country: England, Scotland, Wales and Northern Ireland."],
  FR: ["France", "Paris", "E", 248573, "The Eiffel Tower was the tallest building in the world for 41 years."],
  DE: ["Germany", "Berlin", "E", 137988, "Some stretches of its autobahn highways have no speed limit at all."],
  IT: ["Italy", "Rome", "E", 116348, "Shaped like a boot. Tiny Vatican City sits right inside Rome."],
  IE: ["Ireland", "Dublin", "E", 27133, "Called the Emerald Isle because soft rain keeps it green all year."],
  NL: ["Netherlands", "Amsterdam", "E", 16040, "Amsterdam is the capital, but the government works in another city, The Hague."],
  PL: ["Poland", "Warsaw", "E", 120733, "Europe's oldest forest, Białowieża, is here — with wild bison in it."],
  ES: ["Spain", "Madrid", "E", 195364, "Madrid sits almost exactly in the middle of the country, on a high plateau."],
  PT: ["Portugal", "Lisbon", "E", 35603, "Portuguese sailors were the first Europeans to reach India by sea."],
  GR: ["Greece", "Athens", "E", 50949, "The Olympic Games started here almost 2,800 years ago."],
  NO: ["Norway", "Oslo", "E", 148729, "Deep fjords cut into its coast, and in the far north the summer sun never sets."],
  SE: ["Sweden", "Stockholm", "E", 173860, "Stockholm is built across fourteen islands."],
  CH: ["Switzerland", "Bern", "E", 15940, "The Alps cover most of it, and it has four official languages."],
  RU: ["Russia", "Moscow", "I", 6601700, "The biggest country on Earth — it stretches across eleven time zones, in both Europe and Asia.", "E"],
  EG: ["Egypt", "Cairo", "A", 386662, "The Great Pyramid of Giza is about 4,500 years old. The Nile runs the whole length of the country."],
  NG: ["Nigeria", "Abuja", "A", 356669, "More people live here than in any other African country."],
  KE: ["Kenya", "Nairobi", "A", 224081, "The Great Rift Valley runs through it, and huge herds cross the Maasai Mara every year."],
  GH: ["Ghana", "Accra", "A", 92098, "The first country in sub-Saharan Africa to become independent, in 1957 — its flag has a black star."],
  MA: ["Morocco", "Rabat", "A", 172414, "The Sahara Desert is in the south and the snowy Atlas Mountains run down the middle."],
  ET: ["Ethiopia", "Addis Ababa", "A", 426373, "It has its own alphabet and its own calendar — and coffee was first found here."],
  ZA: ["South Africa", "Pretoria", "A", 470693, "It has three capital cities: Pretoria, Cape Town and Bloemfontein."],
  TZ: ["Tanzania", "Dodoma", "A", 365756, "Kilimanjaro, Africa's tallest mountain, is here. Dodoma is the capital, but Dar es Salaam is far bigger."],
  CN: ["China", "Beijing", "I", 3705410, "The Great Wall stretches more than 13,000 miles and took about 2,000 years to build."],
  JP: ["Japan", "Tokyo", "I", 145937, "Nearly 14,000 islands — and bullet trains that run at over 180 miles an hour."],
  IN: ["India", "New Delhi", "I", 1269219, "More people live here than in any other country in the world. The Taj Mahal is here."],
  KR: ["South Korea", "Seoul", "I", 38690, "Mountains cover about seven tenths of the country."],
  TH: ["Thailand", "Bangkok", "I", 198117, "The only country in Southeast Asia never taken over by a European empire."],
  VN: ["Vietnam", "Hanoi", "I", 128066, "Hanoi is the capital, but Ho Chi Minh City is the biggest city."],
  ID: ["Indonesia", "Jakarta", "I", 735358, "More than 17,000 islands — and it is building a brand-new capital city called Nusantara."],
  TR: ["Türkiye", "Ankara", "I", 302535, "It sits in both Europe and Asia. Istanbul has one foot on each continent.", "E"],
  SA: ["Saudi Arabia", "Riyadh", "I", 830000, "Most of it is desert, including the Empty Quarter — the biggest sand desert on Earth."],
  AU: ["Australia", "Canberra", "O", 2969907, "Canberra is the capital, but Sydney is the biggest city. The Great Barrier Reef is the largest living thing on Earth."],
  NZ: ["New Zealand", "Wellington", "O", 103483, "Two main islands — and many more sheep than people."],
  FJ: ["Fiji", "Suva", "O", 7056, "More than 300 islands scattered across the South Pacific."],
  PG: ["Papua New Guinea", "Port Moresby", "O", 178703, "More than 800 languages are spoken here — more than in any other country."]
};
