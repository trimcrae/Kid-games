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
