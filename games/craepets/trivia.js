/* ===========================================================
   Craepets — THE TRIVIA VAULT.
   -----------------------------------------------------------
   Hand-written questions, kept out of data.js so the vault can
   grow without turning the rules file into a haystack.

   Every entry is the same four things:

       [ the question,
         the right answer,
         [ three wrong answers ],
         what it TEACHES you — printed whichever way you answer ]

   The teach line is not decoration. A question you got wrong
   goes into the review basket and comes back later, so the
   sentence underneath is the only chance the game has to
   actually tell a child the thing.

   Sorted by subject and by tier:
       mid   — Cory (6)      big — Jeannie (7)
       grown — Shannon & Tristan (genuinely hard, no free passes)
   =========================================================== */
window.CPTrivia = (function () {
  "use strict";

  /* =========================================================
     🌈 THE WIDE WORLD — science, geography, history, the body,
     space, animals and how things work.
     ========================================================= */

  var WONDER_MID = [
    /* --- animals --- */
    ["Which animal is the fastest on land?", "Cheetah", ["Lion", "Horse", "Ostrich"], "A cheetah hits 70 mph — but only for about 30 seconds."],
    ["What do you call a baby kangaroo?", "A joey", ["A cub", "A pup", "A kit"], "A joey rides in its mother's pouch for about six months."],
    ["Which bird cannot fly?", "Penguin", ["Eagle", "Robin", "Owl"], "Penguin wings became flippers — brilliant for swimming, useless for flying."],
    ["How many hearts does an octopus have?", "3", ["1", "2", "8"], "Two pump blood to the gills and one pumps it round the body."],
    ["What is a group of wolves called?", "A pack", ["A pride", "A herd", "A school"], "Wolves hunt in packs led by a breeding pair."],
    ["Which animal has black and white stripes?", "Zebra", ["Leopard", "Rhino", "Hippo"], "No two zebras have the same stripe pattern — like fingerprints."],
    ["What do bats use to find their way in the dark?", "Sound", ["Smell", "Starlight", "Heat"], "Echolocation: they squeak and listen for the echo bouncing back."],
    ["Which animal sleeps standing up?", "Horse", ["Cat", "Rabbit", "Mouse"], "Horses can lock their leg joints and doze on their feet."],
    ["A spider has how many legs?", "8", ["6", "10", "4"], "Eight legs and two body parts — that is what makes it an arachnid, not an insect."],
    ["What is the tallest animal in the world?", "Giraffe", ["Elephant", "Camel", "Moose"], "A giraffe's neck alone can be six feet long — with just seven bones in it, same as you."],
    ["Which sea animal squirts ink?", "Octopus", ["Dolphin", "Shark", "Turtle"], "The ink cloud hides it while it jets away."],
    ["What do frogs mostly eat?", "Insects", ["Grass", "Seeds", "Leaves"], "A frog's sticky tongue flips out and back in under a tenth of a second."],
    ["Which animal changes color to hide?", "Chameleon", ["Zebra", "Panda", "Wolf"], "Chameleons also change color to show mood and temperature."],
    ["What covers a bird's body?", "Feathers", ["Fur", "Scales", "Shells"], "Feathers keep birds warm, dry and in the air."],
    ["Which animal builds dams on rivers?", "Beaver", ["Otter", "Badger", "Duck"], "A beaver dam makes a deep pond, and the lodge door is underwater — safe from foxes."],
    ["What kind of animal is a tortoise?", "A reptile", ["A mammal", "An amphibian", "A fish"], "Scales, lungs and eggs laid on land: reptile."],
    ["Which animal is known for a very long memory?", "Elephant", ["Sheep", "Chicken", "Goldfish"], "Elephant herds remember water holes decades apart."],
    ["What do we call an animal that eats both plants and meat?", "An omnivore", ["A herbivore", "A carnivore", "A predator"], "Bears, pigs and people are omnivores."],
    ["Where do polar bears keep warm?", "Under thick fat and fur", ["In caves all year", "By eating snow", "In trees"], "A layer of blubber four inches thick does most of the work."],
    ["Which insect makes silk?", "Silkworm", ["Beetle", "Ant", "Wasp"], "One silkworm cocoon can unwind into nearly a mile of thread."],

    /* --- the body --- */
    ["Which part of you helps you smell?", "Your nose", ["Your ears", "Your knees", "Your elbow"], "Smell and taste work together — that is why food is boring with a blocked nose."],
    ["How many teeth does a grown-up usually have?", "32", ["20", "24", "40"], "Kids have 20 baby teeth, then 32 adult ones including wisdom teeth."],
    ["Which organ helps you think?", "The brain", ["The heart", "The lungs", "The liver"], "Your brain uses about a fifth of all the energy you eat."],
    ["What are your bones joined together by?", "Joints", ["Muscles only", "Skin", "Blood"], "Knees and elbows are hinge joints; your shoulder is a ball and socket."],
    ["What should you do to keep teeth healthy?", "Brush twice a day", ["Eat more sweets", "Never see a dentist", "Only rinse"], "Two minutes, twice a day — brushing removes the plaque that makes holes."],
    ["Which part of the body do your lungs help with?", "Breathing", ["Digesting", "Seeing", "Hearing"], "Lungs swap oxygen into your blood and carbon dioxide out."],
    ["How many fingers does a person usually have, thumbs included?", "10", ["8", "12", "9"], "Five on each hand — the thumb is the one that makes gripping work."],

    /* --- earth and weather --- */
    ["What do we call frozen rain?", "Hail", ["Fog", "Dew", "Mist"], "Hailstones grow in layers as they get blown up and down inside a storm cloud."],
    ["Where does thunder come from?", "Lightning heating the air", ["Clouds hitting each other", "Wind in trees", "Rain landing"], "The air expands so fast it bangs — you hear it after you see the flash."],
    ["What is fog?", "A cloud on the ground", ["Smoke", "Dust", "Rain that stopped"], "Fog is just a cloud that formed at ground level."],
    ["Which season is the coldest in the north?", "Winter", ["Spring", "Summer", "Autumn"], "In winter your half of Earth leans away from the Sun."],
    ["What instrument measures temperature?", "A thermometer", ["A barometer", "A compass", "A telescope"], "A barometer measures air pressure instead."],
    ["What is a volcano?", "An opening where lava comes out", ["A very tall hill", "A deep lake", "A kind of storm"], "Magma rises through a crack in the crust and erupts as lava."],
    ["What do we call a very long dry spell?", "A drought", ["A flood", "A blizzard", "A gale"], "A drought means far less rain than usual for a long time."],
    ["Which of these is a rock?", "Granite", ["Cotton", "Rubber", "Plastic"], "Granite is an igneous rock — cooled magma full of crystals."],
    ["What makes wind?", "Air moving from high to low pressure", ["Trees waving", "The sea", "Birds"], "Warm air rises, cooler air rushes in underneath — that rush is wind."],
    ["What is soil mostly made of?", "Broken rock and old plants", ["Only water", "Only sand", "Plastic"], "Weathered rock plus rotted plant matter, which is what makes it good for growing."],
    ["Which of these is a natural resource?", "Water", ["A television", "A bicycle", "A shoe"], "Natural resources come from the Earth; the rest are made from them."],
    ["What are the two poles of the Earth called?", "North and South", ["Up and Down", "East and West", "Left and Right"], "The poles are the two ends of the axis Earth spins around."],

    /* --- space --- */
    ["What do we orbit?", "The Sun", ["The Moon", "Mars", "Jupiter"], "Earth takes one year to go all the way round the Sun."],
    ["What orbits the Earth?", "The Moon", ["The Sun", "Venus", "Saturn"], "The Moon goes round us about once a month."],
    ["Why does the Moon shine?", "It reflects sunlight", ["It is on fire", "It makes its own light", "It is a star"], "The Moon has no light of its own — you are seeing sunlight bounce off it."],
    ["How many planets are in our solar system?", "8", ["7", "9", "12"], "Pluto was reclassified as a dwarf planet in 2006."],
    ["What is an astronaut?", "Someone who travels in space", ["A star watcher", "A pilot", "A scientist on ships"], "Astronaut comes from Greek words meaning 'star sailor'."],
    ["What is a shooting star really?", "A bit of rock burning up", ["A star falling", "A plane", "A comet landing"], "A meteor: dust or grit burning as it hits our atmosphere."],
    ["Which planet do we live on?", "Earth", ["Mars", "Venus", "Neptune"], "The only planet we know of with liquid water on the surface."],
    ["What do we call a huge group of stars?", "A galaxy", ["A planet", "A comet", "A crater"], "Ours is the Milky Way — a few hundred billion stars."],
    ["What are the round dents on the Moon called?", "Craters", ["Valleys", "Puddles", "Seas"], "Craters are made by rocks crashing into the surface."],

    /* --- plants --- */
    ["Which part of a plant is usually underground?", "The roots", ["The flower", "The leaf", "The stem"], "Roots drink water and hold the plant steady."],
    ["What do seeds need to start growing?", "Water and warmth", ["Only sunlight", "Only soil", "Nothing"], "Germination needs water, warmth and air — sunlight comes after the shoot is up."],
    ["Which of these do we eat the root of?", "Carrot", ["Lettuce", "Broccoli", "Apple"], "Carrots and beetroot are roots; lettuce is leaves; broccoli is a flower bud."],
    ["What do flowers make that bees collect?", "Nectar", ["Milk", "Sap", "Wax"], "Bees swap pollen between flowers while they collect nectar — that is pollination."],
    ["What are the tallest plants in the world?", "Trees", ["Grasses", "Ferns", "Mosses"], "Bamboo is a grass and grows fast, but redwoods grow far higher."],
    ["Which season do many trees lose their leaves?", "Autumn", ["Spring", "Summer", "Never"], "Deciduous trees drop leaves to save water through winter."],

    /* --- how things work --- */
    ["What makes a bicycle stop?", "Brakes rubbing on the wheel", ["The rider blinking", "Gravity", "The bell"], "Friction turns your speed into heat, which is why brakes get hot."],
    ["Which of these is a magnet attracted to?", "Iron nail", ["Plastic cup", "Wooden spoon", "Glass jar"], "Magnets pull on iron, nickel and cobalt — not plastic, wood or glass."],
    ["What does a battery store?", "Energy", ["Water", "Air", "Light"], "Chemical energy that turns into electrical energy when you switch on."],
    ["What is a wheel and axle an example of?", "A simple machine", ["A magnet", "A circuit", "A fuel"], "The six simple machines: lever, wheel and axle, pulley, ramp, wedge, screw."],
    ["Why do we wear seat belts?", "They stop you flying forward", ["They look smart", "They keep you warm", "They save fuel"], "A moving body keeps moving unless something stops it — that is inertia."],
    ["Which of these floats?", "A cork", ["A coin", "A brick", "A key"], "Things less dense than water float — cork is mostly air pockets."],
    ["What does a thermometer's liquid do when it is hot?", "It expands and rises", ["It shrinks", "It changes color", "It freezes"], "Most things expand when heated — that is thermal expansion."],
    ["What kind of energy comes from the Sun?", "Light and heat", ["Sound", "Nuclear waste", "Electricity directly"], "Solar panels turn that light into electricity for us."],

    /* --- maps and places --- */
    ["What does a map's key or legend tell you?", "What the symbols mean", ["Who drew it", "How old it is", "The weather"], "The key turns little pictures into places and roads."],
    ["Which direction is at the top of most maps?", "North", ["South", "East", "West"], "Most maps put north up — but that is a habit, not a rule."],
    ["What is the largest country by area?", "Russia", ["Canada", "China", "The USA"], "Russia spans eleven time zones."],
    ["Which country is shaped like a boot?", "Italy", ["Spain", "Greece", "Portugal"], "The 'heel' is Puglia and the 'toe' is Calabria."],
    ["What is the capital of the United States?", "Washington, D.C.", ["New York", "Boston", "Chicago"], "D.C. stands for District of Columbia — it is not in any state."],
    ["Which ocean is on the west coast of the USA?", "The Pacific", ["The Atlantic", "The Indian", "The Arctic"], "The Atlantic is on the east coast."],
    ["What is a river's start called?", "Its source", ["Its mouth", "Its bank", "Its bed"], "Water runs from the source downhill to the mouth, where it meets the sea."],
    ["Which of these is a country?", "Brazil", ["Africa", "Europe", "The Amazon"], "Africa and Europe are continents; the Amazon is a river and a rainforest."],
    ["What is the longest wall people ever built?", "The Great Wall of China", ["Hadrian's Wall", "The Berlin Wall", "The Wall of Troy"], "Thousands of miles of wall, built and rebuilt over centuries."],

    /* --- history for beginners --- */
    ["Who were the first people to walk on the Moon?", "Americans in 1969", ["Russians in 1961", "The Chinese in 1980", "Nobody yet"], "Neil Armstrong and Buzz Aldrin, 20 July 1969."],
    ["What did people use before electric light?", "Candles and oil lamps", ["Torch apps", "Neon signs", "Nothing at all"], "Electric lighting only became common a little over a century ago."],
    ["Which animals pulled carts before engines?", "Horses and oxen", ["Cats", "Chickens", "Rabbits"], "That is why an engine's power is still measured in horsepower."],
    ["What is a castle's deep water ring called?", "A moat", ["A pond", "A canal", "A trench"], "A moat made it very hard to reach the walls with ladders."],
    ["Who ruled ancient Egypt?", "Pharaohs", ["Presidents", "Emperors", "Sultans"], "Tutankhamun became pharaoh at about nine years old."],
    ["What were the first books written on?", "Scrolls", ["Paperbacks", "Screens", "Boards"], "Long sheets of papyrus or parchment, rolled up."],

    /* --- everyday science --- */
    ["What happens to water when it boils?", "It turns to steam", ["It freezes", "It disappears", "It gets heavier"], "Boiling is liquid turning to gas all through the liquid at once."],
    ["Why do we see a shadow?", "Something blocks the light", ["The sun is tired", "Air gets dark", "Shadows are painted"], "Light travels in straight lines, so a blocked patch stays dark."],
    ["Which of these is a mixture?", "Fruit salad", ["Pure water", "Pure gold", "Oxygen"], "In a mixture you can still pick the parts out again."],
    ["What is recycling?", "Turning used things into new things", ["Throwing things away", "Burning rubbish", "Burying rubbish"], "Recycling one aluminium can saves enough energy to run a TV for hours."],
    ["Which of these is renewable?", "Wind power", ["Coal", "Oil", "Natural gas"], "Renewable means it keeps coming back — wind, sun, water."],
    ["What colour do you get mixing blue and yellow paint?", "Green", ["Purple", "Orange", "Brown"], "Blue + yellow = green; red + blue = purple; red + yellow = orange."],
    ["What is the loudest thing on this list?", "A jet engine", ["A whisper", "A ticking clock", "Rain"], "Loudness is measured in decibels — a jet is around 140."],
    ["Which of these conducts electricity?", "Copper wire", ["Rubber band", "Wooden stick", "Glass bead"], "Metals conduct; rubber, wood and glass are insulators — which is why plugs use both."]
  ];

  var WONDER_BIG = [
    /* --- space --- */
    ["How long does the Moon take to orbit the Earth?", "About 27 days", ["About 7 days", "About 90 days", "About a year"], "That is also how long it takes to spin once — which is why we only ever see one side."],
    ["What is the Sun mostly made of?", "Hydrogen and helium", ["Rock and iron", "Burning coal", "Water vapour"], "It fuses hydrogen into helium, and that fusion is the sunlight."],
    ["Why is there no sound in space?", "There is almost no air to carry it", ["It is too cold", "It is too far", "Sound freezes"], "Sound needs particles to bump into each other; a vacuum has almost none."],
    ["What is a light year a measure of?", "Distance", ["Time", "Brightness", "Weight"], "The distance light travels in a year — about 9.5 trillion km."],
    ["Which planet has the biggest volcano in the solar system?", "Mars", ["Venus", "Earth", "Jupiter"], "Olympus Mons is about 22 km high — nearly three Everests."],
    ["What is a comet's tail made of?", "Gas and dust blown off by the Sun", ["Fire", "Ice shards only", "Smoke"], "The tail always points away from the Sun, whichever way the comet is going."],
    ["Why does Mars look red?", "Rusty iron in its soil", ["Red plants", "Fire", "Red sunlight"], "Iron oxide — literally rust — coats the surface."],
    ["What holds the planets in orbit?", "The Sun's gravity", ["Magnetism", "Air pressure", "Solar wind"], "Gravity bends their straight-line motion into a loop."],
    ["What is the asteroid belt?", "A ring of rocks between Mars and Jupiter", ["A ring around Saturn", "A group of comets", "A band of stars"], "Left-over material that Jupiter's gravity never let form a planet."],
    ["How many moons does Mars have?", "2", ["0", "1", "12"], "Phobos and Deimos — both tiny and lumpy, probably captured asteroids."],

    /* --- physics and chemistry --- */
    ["What is friction?", "A force that resists sliding", ["A kind of energy", "A type of magnet", "A liquid"], "Friction slows things down and makes heat — useful for brakes, annoying for engines."],
    ["What happens to sound as you get further away?", "It gets quieter", ["It gets faster", "It gets higher", "It stops instantly"], "The energy spreads out over a bigger area the further it travels."],
    ["What does a pulley do?", "Changes the direction of your pull", ["Creates energy", "Removes weight", "Stores power"], "A single pulley lets you pull down to lift up; more pulleys reduce the force needed."],
    ["What is an insulator?", "Something that stops heat or electricity passing", ["Something that speeds it up", "A kind of metal", "A liquid"], "Plastic, rubber and air are good insulators; metals are not."],
    ["What is a mixture you can separate by filtering?", "Sand in water", ["Salt in water", "Sugar in tea", "Air"], "Filtering catches particles that never dissolved; dissolved salt goes straight through."],
    ["What is evaporation?", "Liquid turning to gas at the surface", ["Gas turning to liquid", "Solid turning to liquid", "Liquid turning to solid"], "It happens below boiling point too — that is how puddles dry."],
    ["Which is a chemical change?", "Wood burning", ["Ice melting", "Water boiling", "Paper tearing"], "A chemical change makes new substances you cannot simply reverse."],
    ["What does pH measure?", "How acidic or alkaline something is", ["Temperature", "Weight", "Purity"], "7 is neutral; lemon juice is about 2, soap about 10."],
    ["Why does a heavy ship float?", "It displaces its own weight in water", ["Steel is light", "The engine lifts it", "The sea pushes air"], "Archimedes' principle — the hull shape matters more than the material."],
    ["What is potential energy?", "Stored energy waiting to be used", ["Energy in motion", "Heat energy", "Wasted energy"], "A raised weight or a stretched spring has potential energy."],

    /* --- biology --- */
    ["What do we call animals that are cold-blooded?", "Ectotherms", ["Endotherms", "Herbivores", "Nocturnal"], "Their body temperature follows their surroundings — which is why lizards bask."],
    ["What is a habitat?", "The place an animal naturally lives", ["A kind of nest", "An animal's diet", "A migration route"], "Change the habitat and the animals living in it are in trouble."],
    ["What does a decomposer do?", "Breaks down dead material", ["Eats live prey", "Makes food from sunlight", "Pollinates flowers"], "Fungi and bacteria return nutrients to the soil."],
    ["What is camouflage for?", "Blending in to hide", ["Attracting mates only", "Keeping warm", "Storing food"], "It hides prey from predators, and predators from prey."],
    ["What is the job of the skeleton?", "Support, movement and protection", ["Digestion", "Breathing", "Making blood sugar"], "It also makes blood cells inside the marrow."],
    ["Which system carries oxygen around your body?", "The circulatory system", ["The digestive system", "The nervous system", "The skeletal system"], "Heart, blood and vessels — about 60,000 miles of them in an adult."],
    ["What is a species?", "A group that can breed together", ["Any group of animals", "Animals of one colour", "Animals in one country"], "Members of a species produce offspring that can breed in turn."],
    ["Why do birds migrate?", "To follow food and warmth", ["To get lost", "To lose weight", "To change colour"], "Arctic terns fly pole to pole — about 44,000 miles a year."],
    ["What are the tiny units all living things are made of?", "Cells", ["Atoms", "Organs", "Fibres"], "You are made of roughly 30 trillion of them."],
    ["What is an adaptation?", "A feature that helps survival", ["A learned trick", "A random accident", "A disease"], "A camel's hump, a cactus spine and a polar bear's fur are all adaptations."],

    /* --- geography --- */
    ["What is the largest country in South America?", "Brazil", ["Argentina", "Peru", "Colombia"], "Brazil covers nearly half the continent."],
    ["Which mountain range runs down western South America?", "The Andes", ["The Rockies", "The Alps", "The Himalayas"], "The longest continental mountain range in the world — 4,300 miles."],
    ["What is the capital of Japan?", "Tokyo", ["Kyoto", "Osaka", "Nagoya"], "Kyoto was the capital until 1868."],
    ["Which river flows through Egypt?", "The Nile", ["The Congo", "The Danube", "The Ganges"], "Almost all Egyptians live within a few miles of it."],
    ["What is a delta?", "Where a river spreads out into the sea", ["A mountain pass", "A dry lake", "A sea cave"], "Silt drops as the current slows, building fan-shaped land."],
    ["Which US state is a chain of islands?", "Hawaii", ["Florida", "Alaska", "Maine"], "Eight main islands, all built by volcanoes."],
    ["What is the driest hot desert on Earth?", "The Atacama", ["The Sahara", "The Gobi", "The Kalahari"], "Parts of it have gone decades without measurable rain."],
    ["Which country has the most people?", "India", ["China", "The USA", "Indonesia"], "India passed China in 2023; both are over 1.4 billion."],
    ["What is an isthmus?", "A narrow strip joining two larger lands", ["An island chain", "A river mouth", "A deep bay"], "Panama is the famous one — which is why the canal was cut there."],
    ["Which line splits Earth into north and south?", "The Equator", ["The Prime Meridian", "The Tropic of Cancer", "The Date Line"], "The Prime Meridian splits it east and west instead."],

    /* --- history --- */
    ["Who was the first President of the United States?", "George Washington", ["Thomas Jefferson", "Abraham Lincoln", "John Adams"], "He took office in 1789 and refused a third term."],
    ["What was the Renaissance?", "A rebirth of art and learning in Europe", ["A war", "A plague", "A voyage"], "Roughly the 14th to 17th centuries — Leonardo, Michelangelo, printing presses."],
    ["Who wrote the Declaration of Independence?", "Thomas Jefferson", ["Benjamin Franklin", "George Washington", "Paul Revere"], "Adopted 4 July 1776 by the Continental Congress."],
    ["What did the printing press change?", "Books could be made quickly and cheaply", ["Ships sailed faster", "Cities got electricity", "Farming stopped"], "Gutenberg, around 1440 — ideas suddenly spread far faster than people could walk."],
    ["Which ancient people built the Colosseum?", "The Romans", ["The Greeks", "The Egyptians", "The Persians"], "Finished around AD 80; it held perhaps 50,000 spectators."],
    ["Who was Harriet Tubman?", "A guide who led enslaved people to freedom", ["A pilot", "A queen", "An inventor"], "She made about 13 rescue trips on the Underground Railroad."],
    ["What was the Silk Road?", "A trade route between Asia and Europe", ["A palace", "A river", "A festival"], "Silk went west; ideas, paper and disease travelled both ways."],
    ["Which war was fought between the American North and South?", "The Civil War", ["The Revolutionary War", "World War I", "The War of 1812"], "1861–1865; it ended slavery in the United States."],

    /* --- maths and logic in the world --- */
    ["What is a right angle?", "90 degrees", ["45 degrees", "180 degrees", "360 degrees"], "The corner of a square or a sheet of paper."],
    ["How many degrees are in a full turn?", "360", ["180", "270", "400"], "Half a turn is 180 — a straight line."],
    ["What is the perimeter of a shape?", "The distance all the way around", ["The space inside", "The longest side", "The height"], "Area is the space inside; perimeter is the fence around it."],
    ["Which is a prime number?", "17", ["15", "21", "27"], "A prime has exactly two factors: 1 and itself."],
    ["What does the average (mean) of numbers tell you?", "A typical middle value", ["The biggest one", "The smallest one", "How many there are"], "Add them all up, then divide by how many there were."],
    ["How many faces does a cube have?", "6", ["4", "8", "12"], "6 faces, 8 corners and 12 edges."],
    ["What is a fraction's bottom number called?", "The denominator", ["The numerator", "The divisor", "The remainder"], "The denominator says how many equal parts the whole was cut into."],
    ["What is the value of pi, roughly?", "3.14", ["2.71", "1.62", "9.81"], "Circumference divided by diameter, for every circle there has ever been."],

    /* --- technology --- */
    ["What does a computer's memory do?", "Holds information while it works", ["Cools the machine", "Displays pictures", "Connects to power"], "RAM is fast and temporary; a drive keeps things when the power is off."],
    ["What is a program?", "A list of instructions a computer follows", ["A kind of screen", "A power supply", "A type of cable"], "Computers do exactly what the instructions say — including the mistakes."],
    ["What does the internet actually connect?", "Computers all over the world", ["Only phones", "Only websites", "Televisions only"], "It is a network of networks, passing data in small packets."],
    ["Who is often called the first computer programmer?", "Ada Lovelace", ["Alan Turing", "Bill Gates", "Grace Hopper"], "In the 1840s she wrote an algorithm for a machine that was never finished."],
    ["What does a robot need in order to react to the world?", "Sensors", ["Wheels", "A voice", "A face"], "No sensors, no reaction — it can only repeat a fixed routine."],
    ["What is a binary digit?", "A 0 or a 1", ["Any number", "A letter", "A symbol"], "Eight bits make a byte, which is enough for one letter of text."]
  ];

  var WONDER_GROWN = [
    /* --- geography --- */
    ["What is the capital of Norway?", "Oslo", ["Bergen", "Stavanger", "Trondheim"], "Oslo sits at the head of a 60-mile fjord."],
    ["What is the capital of Morocco?", "Rabat", ["Casablanca", "Marrakesh", "Fez"], "Casablanca is much larger, but Rabat is the seat of government."],
    ["What is the capital of Vietnam?", "Hanoi", ["Ho Chi Minh City", "Da Nang", "Hue"], "Ho Chi Minh City is bigger; Hanoi has been the capital since reunification in 1976."],
    ["What is the capital of Nigeria?", "Abuja", ["Lagos", "Kano", "Ibadan"], "The capital moved from Lagos to purpose-built Abuja in 1991."],
    ["Which country surrounds Lesotho entirely?", "South Africa", ["Botswana", "Zimbabwe", "Namibia"], "One of only three countries completely enclosed by another."],
    ["Which two countries does the Strait of Gibraltar separate?", "Spain and Morocco", ["Italy and Tunisia", "Greece and Turkey", "France and Algeria"], "Only about 8 miles across at its narrowest."],
    ["What is the largest lake by surface area?", "The Caspian Sea", ["Lake Superior", "Lake Victoria", "Lake Baikal"], "Salty, and technically a lake — Baikal holds far more water but covers less ground."],
    ["Which country has the longest coastline?", "Canada", ["Russia", "Indonesia", "Australia"], "About 202,000 km once you count every Arctic island."],
    ["Iceland's capital is…", "Reykjavík", ["Akureyri", "Kópavogur", "Hafnarfjörður"], "The northernmost capital of a sovereign state."],
    ["Which African country was never colonised by a European power?", "Ethiopia", ["Kenya", "Ghana", "Senegal"], "It repelled Italy at Adwa in 1896; Italy occupied it only briefly in 1936–41."],
    ["The Danube flows into which sea?", "The Black Sea", ["The Baltic", "The Adriatic", "The Caspian"], "It passes through or borders ten countries on the way."],
    ["What is the highest capital city in the world?", "La Paz", ["Quito", "Bogotá", "Kathmandu"], "The seat of government sits above 3,600 m — Sucre is Bolivia's constitutional capital."],

    /* --- science --- */
    ["What is the second most abundant element in the universe?", "Helium", ["Oxygen", "Carbon", "Iron"], "Hydrogen is about 75% of ordinary matter, helium about 23%."],
    ["Which particle carries a negative charge?", "The electron", ["The proton", "The neutron", "The photon"], "Protons are positive, neutrons neutral, photons chargeless."],
    ["What is absolute zero in Celsius?", "-273.15°", ["-100°", "-459°", "0°"], "-459.67°F. It is the point where particles have minimal possible motion."],
    ["Which scientist proposed natural selection alongside Darwin?", "Alfred Russel Wallace", ["Gregor Mendel", "Thomas Huxley", "Charles Lyell"], "Wallace's 1858 letter prompted Darwin to publish."],
    ["What does the Doppler effect explain?", "Pitch changing as a source moves", ["Light bending in water", "Heat rising", "Magnetic attraction"], "The same effect redshifts light from receding galaxies."],
    ["Which blood component fights infection?", "White blood cells", ["Red blood cells", "Platelets", "Plasma"], "Platelets clot; plasma carries everything around."],
    ["What is the half-life of a radioactive isotope?", "The time for half of it to decay", ["Its total lifetime", "Half its mass", "Time to double"], "Carbon-14's is about 5,730 years, which is what makes radiocarbon dating work."],
    ["Which gas is responsible for most human-caused warming?", "Carbon dioxide", ["Ozone", "Argon", "Neon"], "Methane traps more heat per molecule but is far less abundant and shorter-lived."],
    ["What does an enzyme do?", "Speeds up a biological reaction", ["Stores energy", "Carries oxygen", "Builds bone"], "It is a catalyst — it is not used up in the reaction."],
    ["Who formulated the laws of planetary motion?", "Johannes Kepler", ["Galileo Galilei", "Tycho Brahe", "Nicolaus Copernicus"], "Kepler used Brahe's observations to show orbits are ellipses."],
    ["What is the most abundant metal in Earth's crust?", "Aluminium", ["Iron", "Copper", "Magnesium"], "About 8% of the crust — though it was once more precious than gold to extract."],
    ["What does 'entropy' broadly describe?", "The tendency towards disorder", ["The speed of light", "Stored heat", "Electrical resistance"], "The second law of thermodynamics: entropy in a closed system does not decrease."],
    ["Which organ produces insulin?", "The pancreas", ["The liver", "The kidney", "The thyroid"], "Type 1 diabetes is the immune system destroying those insulin-producing cells."],
    ["What is the Great Barrier Reef mostly made of?", "Coral polyp skeletons", ["Volcanic rock", "Compressed sand", "Seaweed"], "It is the largest structure built by living organisms — visible from orbit."],

    /* --- arts and letters --- */
    ["Who composed 'The Four Seasons'?", "Vivaldi", ["Bach", "Mozart", "Handel"], "Published in 1725, with a sonnet printed alongside each concerto."],
    ["Which Shakespeare play features the line 'To be, or not to be'?", "Hamlet", ["Macbeth", "Othello", "King Lear"], "Act 3, Scene 1 — Hamlet weighing existence itself."],
    ["Who painted 'Guernica'?", "Picasso", ["Dalí", "Miró", "Matisse"], "A 1937 response to the bombing of a Basque town."],
    ["Which novel opens 'Call me Ishmael'?", "Moby-Dick", ["Treasure Island", "The Old Man and the Sea", "Robinson Crusoe"], "Melville, 1851 — a commercial failure in his lifetime."],
    ["Who wrote 'Things Fall Apart'?", "Chinua Achebe", ["Wole Soyinka", "Ngũgĩ wa Thiong'o", "Ben Okri"], "Published 1958; among the most widely read African novels."],
    ["Which artist is known for cutting up painted paper in later life?", "Henri Matisse", ["Georges Braque", "Paul Klee", "Marc Chagall"], "Arthritis ended his painting, so he 'drew with scissors'."],
    ["Who composed the opera 'The Magic Flute'?", "Mozart", ["Verdi", "Wagner", "Puccini"], "Premiered in 1791, weeks before his death."],
    ["Which poet wrote 'The Road Not Taken'?", "Robert Frost", ["Walt Whitman", "Emily Dickinson", "T. S. Eliot"], "Routinely misread as a hymn to individualism; Frost called it tricky."],

    /* --- history --- */
    ["In which year did the Second World War end?", "1945", ["1918", "1939", "1949"], "Germany surrendered in May, Japan in September."],
    ["The Magna Carta was sealed in which year?", "1215", ["1066", "1315", "1415"], "At Runnymede, by King John, under pressure from his barons."],
    ["Who was the first woman to win a Nobel Prize?", "Marie Curie", ["Rosalind Franklin", "Dorothy Hodgkin", "Ada Lovelace"], "Physics in 1903, then Chemistry in 1911 — still the only person to win in two sciences."],
    ["Which empire was ruled from Constantinople?", "The Byzantine Empire", ["The Ottoman Empire only", "The Holy Roman Empire", "The Persian Empire"], "The eastern Roman empire, until the Ottomans took the city in 1453."],
    ["The Industrial Revolution began in which country?", "Britain", ["Germany", "France", "The United States"], "Coal, canals and textile machinery from the mid-18th century onwards."],
    ["Who led India's non-violent independence movement?", "Mahatma Gandhi", ["Jawaharlal Nehru", "Subhas Chandra Bose", "B. R. Ambedkar"], "Satyagraha — the 1930 Salt March covered 240 miles."],
    ["The Rosetta Stone helped decode which writing?", "Egyptian hieroglyphs", ["Sumerian cuneiform", "Mayan glyphs", "Linear B"], "The same decree appears in Greek, giving Champollion his key."],
    ["Which city was destroyed by Vesuvius in AD 79?", "Pompeii", ["Carthage", "Ephesus", "Syracuse"], "Ash buried it so completely that even loaves of bread survived."],
    ["The Berlin Airlift supplied the city in which years?", "1948–49", ["1945–46", "1953–54", "1961–62"], "Nearly 280,000 flights kept West Berlin fed through a Soviet blockade."],
    ["Who was the last Tsar of Russia?", "Nicholas II", ["Alexander III", "Peter III", "Paul I"], "He abdicated in March 1917."],

    /* --- language and general --- */
    ["What does 'per se' mean?", "By itself", ["Therefore", "For example", "In place of"], "Latin: 'through itself' — the thing considered on its own terms."],
    ["Which language contributed most English legal vocabulary?", "French", ["German", "Greek", "Dutch"], "Norman French after 1066 — 'jury', 'verdict', 'attorney'."],
    ["What is the meaning of 'schadenfreude'?", "Pleasure at another's misfortune", ["Fear of crowds", "Longing for home", "Sudden clarity"], "German: Schaden (harm) + Freude (joy)."],
    ["What does an actuary do?", "Measure and price risk", ["Design buildings", "Audit accounts", "Write law"], "Insurance and pensions run on actuarial tables."],
    ["What is a fiscal year?", "An accounting year that may not match the calendar", ["A leap year", "A tax-free year", "A decade"], "The US federal fiscal year runs October to September."],
    ["What does 'inflation' measure?", "The general rise in prices", ["The money supply", "Unemployment", "Interest rates"], "Interest rates are a tool used to influence it, not the same thing."],
    ["What is the Nash equilibrium about?", "Strategies no player gains by changing alone", ["Perfect cooperation", "Random choice", "Market prices"], "Game theory: everyone's choice is a best response to everyone else's."],
    ["What does 'sine qua non' mean?", "An essential condition", ["A minor detail", "A long delay", "A polite refusal"], "Latin: 'without which, not'."],
    ["Which body writes accounting standards used across the US?", "The FASB", ["The IMF", "The WTO", "The SEC alone"], "The SEC recognises FASB's standards as authoritative US GAAP."],
    ["What is the placebo effect?", "Improvement from expectation alone", ["A drug side effect", "A dosage error", "A statistical fluke"], "Why good trials are blinded — for the patients and the researchers."]
  ];

  /* =========================================================
     📖 WORDS — vocabulary, grammar and the sense behind them.
     Same four-part shape.
     ========================================================= */

  var WORD_MID = [
    ["What is a NOUN?", "A person, place or thing", ["An action", "A describing word", "A joining word"], "Dog, school and happiness are all nouns."],
    ["What is a VERB?", "An action or being word", ["A naming word", "A describing word", "A tiny word"], "Run, think and is are all verbs."],
    ["What is an ADJECTIVE?", "A word that describes a noun", ["An action", "A name", "A question word"], "In 'the red kite', red is the adjective."],
    ["Which word is a PLURAL?", "mice", ["mouse", "mousy", "mousing"], "Some plurals change the word instead of adding s: mouse → mice."],
    ["What is the plural of CHILD?", "children", ["childs", "childes", "childrens"], "An old English plural that survived — like ox → oxen."],
    ["What is the past tense of GO?", "went", ["goed", "gone", "going"], "Go/went/gone — an irregular verb, so it must be learned, not worked out."],
    ["What is the past tense of BRING?", "brought", ["bringed", "brang", "brung"], "Bring/brought/brought."],
    ["Which sentence is punctuated correctly?", "Where are my shoes?", ["Where are my shoes.", "where are my shoes?", "Where are my shoes"], "A question ends with a question mark and starts with a capital."],
    ["What does a comma do in a list?", "Separates the items", ["Ends the sentence", "Shows shouting", "Marks a question"], "Apples, pears, plums and figs."],
    ["Which word means MORE THAN ONE box?", "boxes", ["boxs", "boxen", "boxies"], "Words ending in x, s, ch or sh add -es."],
    ["What is a SYLLABLE?", "A beat in a word", ["A letter", "A sentence", "A sound only"], "But-ter-fly has three beats — clap them out."],
    ["Which word has three syllables?", "elephant", ["tiger", "monkey", "snake"], "El-e-phant. Ti-ger and mon-key have two; snake has one."],
    ["What is a CONTRACTION?", "Two words squashed with an apostrophe", ["A long word", "A rhyme", "A question"], "Do not → don't. The apostrophe stands where letters were removed."],
    ["What does the apostrophe show in 'the dog's bowl'?", "The bowl belongs to the dog", ["There are two dogs", "It is a contraction", "It is a plural"], "Possession. Two dogs sharing would be 'the dogs' bowl'."],
    ["Which is a complete sentence?", "The cat slept.", ["The very sleepy cat", "Under the warm bed", "Because it rained"], "A sentence needs a subject and a verb and a complete thought."],
    ["What is the opposite of ARRIVE?", "leave", ["stay", "wait", "travel"], "Arrive and depart (or leave) are antonyms."],
    ["What is the opposite of ROUGH?", "smooth", ["hard", "cold", "sharp"], "Rough surfaces catch; smooth ones slide."],
    ["Which word means very happy?", "delighted", ["annoyed", "puzzled", "worried"], "Delighted is a stronger word than pleased."],
    ["What does the word BRAVE mean?", "Not letting fear stop you", ["Very strong", "Very fast", "Very loud"], "Brave is about acting despite fear, not about having none."],
    ["What does CURIOUS mean?", "Wanting to find things out", ["Feeling angry", "Feeling sleepy", "Feeling lost"], "Curiosity is the engine of every science."],
    ["Which of these is a compound word?", "playground", ["playing", "player", "played"], "Play + ground. The others just add endings."],
    ["What does a PREFIX do?", "Goes at the start and changes meaning", ["Goes at the end", "Rhymes the word", "Makes it plural"], "Un-, re- and pre- are prefixes; -ful and -less are suffixes."],
    ["Which word rhymes with LIGHT?", "night", ["let", "lift", "lit"], "Rhyme is about the sound at the end, not the spelling."],
    ["What do you call words that sound the same but mean different things?", "Homophones", ["Synonyms", "Antonyms", "Adjectives"], "Pair and pear; there, their and they're."],
    ["What is the SUBJECT of 'The bird sang loudly'?", "The bird", ["sang", "loudly", "The"], "The subject is who or what does the verb."],
    ["Which word is an ADVERB in 'She ran quickly'?", "quickly", ["She", "ran", "She ran"], "Adverbs usually tell you how, when or where — many end in -ly."],
    ["What is a QUESTION word?", "Why", ["Because", "And", "The"], "Who, what, where, when, why and how."],
    ["What does the word MOIST mean?", "Slightly wet", ["Frozen solid", "Baking hot", "Perfectly dry"], "Damp and moist mean nearly the same thing."],
    ["Which word means to look at closely?", "examine", ["ignore", "forget", "shout"], "Examine, inspect and study are close cousins."],
    ["What is a FABLE?", "A short story that teaches a lesson", ["A true report", "A poem", "A recipe"], "Aesop's fables usually end with a moral, and often star animals."],
    ["What is the MAIN IDEA of a paragraph?", "What it is mostly about", ["Its first word", "Its longest sentence", "Its last word"], "Details support the main idea; they are not it."],
    ["What does the word GATHER mean?", "Bring together", ["Throw away", "Break apart", "Run off"], "You gather sticks, a crowd gathers, clouds gather."],
    ["What is a synonym for QUIET?", "silent", ["noisy", "bright", "heavy"], "Synonyms share a meaning; antonyms flip it."],
    ["Which is spelled correctly?", "tomorrow", ["tommorow", "tomorow", "tommorrow"], "One m, two r's: to-mor-row."],
    ["Which is spelled correctly?", "beginning", ["begining", "begginning", "beginnning"], "Double the n before -ing: begin → beginning."],
    ["What does the suffix -ABLE mean, as in READABLE?", "able to be done", ["without", "before", "one who"], "Readable = able to be read; breakable = able to be broken."],
    ["What is an ANTONYM of ANCIENT?", "modern", ["old", "dusty", "historic"], "Ancient and modern sit at opposite ends of time."],
    ["Which word completes it: 'I have ____ my homework.'?", "done", ["did", "doing", "does"], "'Have' needs the past participle: have done, have gone, have seen."],
    ["What is alliteration?", "Words starting with the same sound", ["Words that rhyme", "Words with the same meaning", "Very long words"], "Peter Piper picked a peck of pickled peppers."],
    ["What does the word ENORMOUS mean?", "Extremely large", ["Slightly odd", "Very fast", "Rather old"], "Enormous, huge, gigantic and immense are all bigger than big."]
  ];

  var WORD_BIG = [
    ["What is a metaphor?", "Saying one thing IS another", ["A direct comparison using like", "An exaggeration", "A sound word"], "'The classroom was a zoo.' A simile would say 'like a zoo'."],
    ["What is a simile?", "A comparison using like or as", ["Saying one thing is another", "A repeated sound", "An opposite"], "'As quiet as a mouse.'"],
    ["What is personification?", "Giving human traits to things", ["Comparing two people", "Exaggerating", "Rhyming"], "'The wind whispered through the trees.'"],
    ["What is hyperbole?", "Deliberate exaggeration", ["A gentle hint", "A precise fact", "A quiet insult"], "'I've told you a million times.'"],
    ["What is onomatopoeia?", "A word that sounds like its meaning", ["A rhyming pair", "A long word", "A word with two meanings"], "Buzz, crash, sizzle, thud."],
    ["What does 'infer' mean?", "Work something out from clues", ["State it plainly", "Guess at random", "Copy it down"], "The text implies; the reader infers."],
    ["What is the THEME of a story?", "The big idea it explores", ["The plot events", "The setting", "The narrator"], "Plot is what happens; theme is what it is about."],
    ["Who is the PROTAGONIST?", "The main character", ["The villain", "The narrator", "The author"], "The antagonist is whoever opposes them."],
    ["What is a synonym for 'meticulous'?", "careful", ["hasty", "generous", "cheerful"], "Meticulous means showing great attention to detail."],
    ["What does 'inevitable' mean?", "Certain to happen", ["Easily avoided", "Highly unlikely", "Recently begun"], "You cannot dodge the inevitable — only prepare for it."],
    ["What does 'reluctant' mean?", "Unwilling", ["Eager", "Confused", "Exhausted"], "A reluctant volunteer had to be talked into it."],
    ["What does 'diligent' mean?", "Hard-working and careful", ["Lucky", "Wealthy", "Talkative"], "Diligence is steady effort, not sudden brilliance."],
    ["What does 'obsolete' mean?", "No longer used", ["Brand new", "Extremely rare", "Very expensive"], "Floppy disks are obsolete; the word means out of date, not broken."],
    ["What does 'inevitably' signal in a sentence?", "That the result could not be avoided", ["That it was surprising", "That it was chosen", "That it was optional"], "Signal words like inevitably, however and therefore steer the argument."],
    ["What is a prefix that means 'against'?", "anti-", ["pro-", "post-", "sub-"], "Antifreeze, antisocial, antibiotic."],
    ["What does the root 'aqua' mean?", "water", ["air", "earth", "fire"], "Aquarium, aquatic, aqueduct."],
    ["What does the root 'port' mean?", "carry", ["door", "sea", "town"], "Transport, portable, export — all about carrying."],
    ["What does the root 'graph' mean?", "write or draw", ["light", "sound", "life"], "Autograph, photograph, paragraph."],
    ["What does 'bio' mean?", "life", ["book", "body", "two"], "Biology, biography, antibiotic."],
    ["Which sentence uses a semicolon correctly?", "It rained hard; we stayed inside.", ["It rained hard; and we stayed inside.", "It rained; hard we stayed inside.", "It rained hard; because we stayed inside."], "A semicolon joins two complete sentences that belong together."],
    ["What is the purpose of a topic sentence?", "To say what the paragraph is about", ["To end the paragraph", "To add a quotation", "To ask a question"], "It usually comes first and the rest of the paragraph supports it."],
    ["What is an idiom?", "A phrase that does not mean its literal words", ["A spelling rule", "A kind of poem", "A long sentence"], "'Break a leg' is a wish for good luck, not an injury."],
    ["What is the difference between 'affect' and 'effect'?", "Affect is usually the verb", ["Effect is always the verb", "They are identical", "Affect is a noun only"], "The rain affected the game; the effect was a delay."],
    ["Which is the correct plural of 'analysis'?", "analyses", ["analysises", "analysis's", "analysi"], "Greek-derived words often shift -is to -es: crisis → crises."],
    ["What does 'concise' mean?", "Short and clear", ["Long and detailed", "Confusing", "Rude"], "Concise writing says as much in fewer words, not less in fewer words."],
    ["What is the tone of a piece of writing?", "The author's attitude", ["The volume", "The subject", "The length"], "The same facts can be told in a warm, bitter or amused tone."],
    ["What is a claim in an argument?", "The point you are trying to prove", ["A fact you cite", "A question you ask", "A story you tell"], "Claim, evidence, reasoning — in that order."],
    ["What does 'evidence' do in an argument?", "Supports the claim", ["Restates the claim", "Introduces the topic", "Ends the essay"], "Without evidence a claim is just an opinion said firmly."],
    ["What does 'ambiguous' mean?", "Open to more than one meaning", ["Perfectly clear", "Deliberately false", "Very long"], "Good instructions avoid ambiguity; good poems sometimes want it."],
    ["What does 'coherent' mean?", "Logical and clearly connected", ["Loud", "Handwritten", "Repeated"], "A coherent paragraph is one where each sentence follows the last."],
    ["What is the mood of a story?", "The feeling the reader gets", ["The narrator's name", "The number of chapters", "The setting only"], "Setting, word choice and pacing all build mood."],
    ["What is a homograph?", "Same spelling, different meaning", ["Same sound, different spelling", "Same meaning", "Opposite meaning"], "'Bow' (to bend) and 'bow' (for arrows)."],
    ["What does 'perspective' mean in a story?", "The viewpoint it is told from", ["The number of pages", "The vocabulary", "The ending"], "First person uses 'I'; third person uses 'he', 'she' or 'they'."],
    ["What does 'summarize' mean?", "Give the main points briefly", ["Copy it out", "Add opinions", "Translate it"], "A summary keeps what matters and drops the detail."],
    ["What does 'persuade' mean?", "Convince someone to agree or act", ["Explain neutrally", "Describe carefully", "Entertain"], "Persuasive writing has a goal beyond being understood."],
    ["Which word means 'very short-lived'?", "fleeting", ["enduring", "constant", "sturdy"], "A fleeting glance is gone before you register it."],
    ["What does 'gradual' mean?", "Happening slowly by degrees", ["All at once", "Backwards", "In secret"], "Gradual change is easy to miss and hard to reverse."],
    ["Which word means 'to make clear'?", "clarify", ["obscure", "complicate", "conceal"], "Clarify comes from the same root as clear."],
    ["What is the past participle of 'write'?", "written", ["wrote", "writing", "writed"], "I write, I wrote, I have written."],
    ["What does 'relevant' mean?", "Connected to the matter at hand", ["Recently written", "Very important", "Officially approved"], "Something can be true and interesting and still not be relevant."]
  ];

  var WORD_GROWN = [
    ["What does 'ostensible' mean?", "Apparent but perhaps not real", ["Openly hostile", "Enormously large", "Officially banned"], "The ostensible reason is the one given aloud."],
    ["What does 'salient' mean?", "Most noticeable or important", ["Salty", "Hidden", "Optional"], "The salient point is the one that sticks out."],
    ["What does 'ubiquity' describe?", "Being everywhere at once", ["Being unique", "Being unwelcome", "Being ancient"], "The ubiquity of phones changed how we make plans."],
    ["What does 'canonical' mean?", "Accepted as the standard", ["Explosive", "Religious only", "Newly invented"], "The canonical version is the one everything else is measured against."],
    ["What does 'to abrogate' mean?", "To repeal or abolish formally", ["To argue loudly", "To delay", "To summarise"], "Treaties are abrogated; arguments are merely abandoned."],
    ["What does 'apocryphal' mean?", "Widely told but probably untrue", ["Officially documented", "Deeply offensive", "Extremely old"], "That famous quote is almost certainly apocryphal."],
    ["What does 'bellicose' mean?", "Eager to fight", ["Beautifully made", "Extremely fat", "Bell-shaped"], "From the Latin bellum, war — as in antebellum."],
    ["What does 'desultory' mean?", "Aimless and without method", ["Extremely bitter", "Highly organised", "Long-delayed"], "A desultory search finds nothing because it was never a plan."],
    ["What does 'histrionic' mean?", "Excessively theatrical", ["Historically accurate", "Deeply moving", "Written by hand"], "From the Latin for actor."],
    ["What does 'inchoate' mean?", "Only just begun and unformed", ["Fully finished", "Unable to speak", "Deeply confusing"], "An inchoate plan is not yet a plan."],
    ["What does 'meretricious' mean?", "Showy but worthless", ["Deserving of merit", "Merciful", "Carefully measured"], "It looks expensive and is not — the opposite of meritorious."],
    ["What does 'ossify' mean?", "To become rigid and set", ["To dissolve", "To multiply", "To brighten"], "Literally to turn to bone; usually said of institutions."],
    ["What does 'parsimonious' mean?", "Extremely unwilling to spend", ["Generous to a fault", "Full of parsley", "Divided in parts"], "Parsimony can be a virtue in explanations and a vice in employers."],
    ["What does 'sanction' mean when a government uses it?", "It can mean either permit or penalise", ["Only to permit", "Only to punish", "To ignore"], "A contronym — the context has to do the work."],
    ["What does 'tautology' mean?", "Saying the same thing twice", ["A logical proof", "A false claim", "A tight knot"], "'Free gift' and 'advance planning' are tautologies."],
    ["What does 'vicissitude' mean?", "A change of fortune", ["A vicious act", "A close neighbour", "A long journey"], "The vicissitudes of life are its ups and downs."],
    ["What does 'winnow' mean?", "To separate the good from the worthless", ["To complain", "To wind up", "To narrow a road"], "Originally to blow chaff off grain."],
    ["What does 'zeitgeist' mean?", "The spirit of the times", ["A ghost story", "A German city", "A sudden idea"], "German: Zeit (time) + Geist (spirit)."],
    ["What is a 'non sequitur'?", "A conclusion that does not follow", ["A repeated phrase", "A missing word", "A formal apology"], "Latin: 'it does not follow'."],
    ["What does 'a priori' mean?", "Known by reasoning, before evidence", ["Proven by experiment", "Agreed in advance", "Highest priority"], "A posteriori knowledge comes from experience instead."],
    ["What does 'de facto' mean?", "In practice, whether or not official", ["By law", "In writing", "After the fact"], "De jure means by law; the two often disagree."],
    ["What does 'caveat' mean?", "A warning or qualification", ["A cave dweller", "A formal invitation", "A large debt"], "Caveat emptor: let the buyer beware."],
    ["What does 'nascent' mean?", "Just coming into existence", ["Unpleasant smelling", "Fully grown", "Nearly finished"], "A nascent industry has more promise than revenue."],
    ["What does 'byzantine' mean when describing rules?", "Excessively complex", ["Beautifully decorated", "Ancient", "Eastern"], "From the famously intricate bureaucracy of the Byzantine Empire."],
    ["What is 'litotes'?", "Understatement using a negative", ["Wild exaggeration", "A pun", "A rhyming couplet"], "'Not bad' meaning very good."],
    ["What does 'peruse' strictly mean?", "To read carefully", ["To skim quickly", "To ignore", "To publish"], "It is very widely used to mean the opposite, which is how meanings drift."],
    ["What does 'enormity' strictly mean?", "Great wickedness", ["Great size", "Great speed", "Great age"], "'Enormousness' is the size word — though enormity is losing that fight."],
    ["What does 'disinterested' properly mean?", "Impartial, with nothing to gain", ["Bored", "Uninformed", "Opposed"], "Uninterested is the bored one. A judge should be disinterested, never uninterested."],
    ["What does 'penultimate' mean?", "Second to last", ["The very last", "The very first", "Halfway"], "Antepenultimate is third from last."],
    ["What does 'fulsome' properly mean?", "Excessive to the point of insincerity", ["Generous and warm", "Complete", "Filling"], "Fulsome praise is a criticism, not a compliment."],
    ["What is 'anaphora' in rhetoric?", "Repeating the opening words of clauses", ["Ending on a question", "A false comparison", "Silence for effect"], "'We shall fight on the beaches, we shall fight on the landing grounds…'"],
    ["What does 'aphorism' mean?", "A short, pointed saying of a truth", ["A long poem", "A logical fallacy", "A medical term"], "'Brevity is the soul of wit' is itself an aphorism."],
    ["What does 'sui generis' mean?", "In a class of its own", ["Self-employed", "Legally binding", "Self-taught"], "Latin: 'of its own kind'."],
    ["What does 'ad hominem' describe?", "Attacking the person, not the argument", ["Arguing in circles", "Appealing to pity", "Arguing from authority"], "It is a fallacy because the person's character is not the claim."],
    ["What does 'specious' mean?", "Superficially plausible but wrong", ["Clearly false", "Rare and valuable", "Highly specific"], "A specious argument survives on how it sounds."],
    ["What does 'equanimity' mean?", "Calmness under strain", ["Fair division", "Horse riding", "Equal rights"], "From aequus (even) + animus (mind)."],
    ["What does 'lugubrious' mean?", "Mournful, often exaggeratedly so", ["Warmly cheerful", "Slippery", "Luxurious"], "A lugubrious expression belongs on a bloodhound."],
    ["What does 'propitious' mean?", "Favourable for what you are about to do", ["Correctly proportioned", "Legally proper", "Extremely large"], "A propitious moment is the right one to act."],
    ["What does 'redoubtable' mean?", "Formidable and worthy of respect", ["Easily doubted", "Repeated twice", "Very forgetful"], "A redoubtable opponent is one you prepare for."],
    ["What does 'temerity' mean?", "Reckless boldness", ["Great fear", "Mild temperature", "Careful timing"], "Timidity is its opposite — and its near-anagram cousin timorous."]
  ];

  /* =========================================================
     🔢 NUMBERS IN THE WORLD — the written maths questions.
     Arithmetic is generated elsewhere and never runs out; these
     are the ones that need a human to have written them.
     ========================================================= */

  var MATH_MID = [
    ["A dozen eggs is how many?", "12", ["10", "6", "20"], "Half a dozen is 6; a baker's dozen is 13."],
    ["How many minutes are in an hour?", "60", ["30", "100", "24"], "And 60 seconds in a minute — the system is 4,000 years old."],
    ["How many hours are in a day?", "24", ["12", "60", "10"], "12 hours of clock face, twice round."],
    ["How many days are in a week?", "7", ["5", "10", "12"], "Five weekdays and two weekend days."],
    ["How many months have exactly 30 days?", "4", ["6", "7", "12"], "April, June, September and November."],
    ["How many sides does a pentagon have?", "5", ["4", "6", "7"], "Penta means five — like a pentagon building or a pentathlon."],
    ["What is a quarter of 20?", "5", ["4", "10", "15"], "A quarter means divide by 4."],
    ["What is half of 50?", "25", ["20", "30", "45"], "Half of 50 is 25, so half of 100 is 50."],
    ["Which is bigger: 1/2 or 1/3?", "1/2", ["1/3", "They are equal", "You cannot tell"], "The bigger the bottom number, the more pieces — so each piece is smaller."],
    ["What is 3 x 4?", "12", ["7", "34", "16"], "Three lots of four, or four lots of three — multiplication does not mind the order."],
    ["What comes next: 5, 10, 15, 20, …?", "25", ["21", "30", "24"], "Counting in fives — every answer ends in 5 or 0."],
    ["What comes next: 2, 4, 8, 16, …?", "32", ["18", "20", "24"], "Doubling each time."],
    ["How many cents make a dollar?", "100", ["50", "10", "1000"], "Which is why 25 cents is called a quarter."],
    ["How many sides does a cube have on the outside?", "6", ["4", "8", "12"], "Six square faces — like a dice."],
    ["What is 100 - 45?", "55", ["65", "45", "55.5"], "Count up from 45 to 100: 5 to make 50, then 50 more."],
    ["Which is an EVEN number?", "18", ["17", "21", "35"], "Even numbers end in 0, 2, 4, 6 or 8 and split into two equal halves."],
    ["What does the 7 mean in 472?", "70", ["7", "700", "7000"], "Hundreds, tens, ones — the 7 sits in the tens column."],
    ["What is 9 x 9?", "81", ["72", "89", "99"], "The nines trick: the digits of every answer add to 9."],
    ["How many legs do 4 chairs have altogether, at 4 legs each?", "16", ["8", "12", "20"], "4 x 4 = 16."],
    ["What shape has no straight sides at all?", "A circle", ["A triangle", "A square", "A hexagon"], "A circle is every point the same distance from the centre."],
    ["What is the perimeter of a square with 3 cm sides?", "12 cm", ["9 cm", "6 cm", "3 cm"], "Four sides of 3: 3 + 3 + 3 + 3."],
    ["What is the area of a rectangle 4 by 5?", "20", ["9", "18", "45"], "Area = length x width."],
    ["If you share 24 sweets between 6 friends, how many each?", "4", ["3", "6", "8"], "24 ÷ 6 = 4."],
    ["What is 1/2 written as a decimal?", "0.5", ["0.2", "1.2", "0.05"], "Half of one whole is five tenths."],
    ["How many quarters make a whole?", "4", ["2", "3", "8"], "Four quarter-turns get you all the way round."],
    ["What time is it 30 minutes after 2:45?", "3:15", ["2:75", "3:45", "2:15"], "15 minutes to 3:00, then 15 minutes more."],
    ["Which is the heaviest?", "1 kilogram", ["500 grams", "100 grams", "10 grams"], "A kilogram is 1,000 grams."],
    ["How many millimetres are in a centimetre?", "10", ["100", "1000", "5"], "And 100 centimetres in a metre."],
    ["What is 6 x 7?", "42", ["36", "48", "56"], "The one everyone forgets. 6 x 7 = 42."],
    ["What is the value of three 20s?", "60", ["23", "40", "203"], "20 + 20 + 20, or 3 x 20."],
    ["Which number is a multiple of 5?", "35", ["32", "37", "41"], "Multiples of 5 end in 0 or 5."],
    ["What is the next number: 1, 4, 9, 16, …?", "25", ["20", "24", "36"], "The square numbers: 1x1, 2x2, 3x3, 4x4, 5x5."],
    ["If a pencil costs 30¢, what do 3 cost?", "90¢", ["60¢", "33¢", "$3"], "3 x 30 = 90."],
    ["How many corners does a triangle have?", "3", ["2", "4", "6"], "As many corners as sides."],
    ["What is 0 x 15?", "0", ["15", "1", "150"], "Zero lots of anything is nothing at all."]
  ];

  var MATH_BIG = [
    ["What is 15% of 200?", "30", ["15", "20", "45"], "10% is 20, 5% is 10 — add them."],
    ["What is 3/4 as a decimal?", "0.75", ["0.34", "0.43", "1.33"], "Three quarters: 0.25 x 3."],
    ["What is the LCM of 4 and 6?", "12", ["10", "24", "8"], "The lowest number both divide into."],
    ["What is the GCF of 12 and 18?", "6", ["3", "9", "12"], "The biggest number that divides both exactly."],
    ["What is 2 to the power of 5?", "32", ["10", "25", "16"], "2 x 2 x 2 x 2 x 2."],
    ["What is the square root of 144?", "12", ["14", "24", "72"], "12 x 12 = 144."],
    ["A triangle's angles always add to…", "180°", ["90°", "270°", "360°"], "Any triangle, any shape — always 180."],
    ["What is the area of a triangle with base 10 and height 6?", "30", ["60", "16", "26"], "Half of base times height."],
    ["What is 0.2 as a fraction?", "1/5", ["1/2", "2/5", "1/20"], "Two tenths simplifies to one fifth."],
    ["If a shirt costs $40 and is 25% off, what do you pay?", "$30", ["$25", "$35", "$15"], "25% of 40 is 10, so you pay 30."],
    ["What is the mean of 4, 8 and 12?", "8", ["12", "6", "24"], "24 ÷ 3 = 8."],
    ["What is the median of 3, 9, 4, 1, 7?", "4", ["3", "7", "4.8"], "Sort them: 1, 3, 4, 7, 9 — the middle one is 4."],
    ["What is the mode of 2, 3, 3, 5, 9?", "3", ["2", "5", "4.4"], "The mode is the value that appears most often."],
    ["What is -5 + 8?", "3", ["-3", "13", "-13"], "Start at -5 on the number line and move 8 to the right."],
    ["What is -4 x -3?", "12", ["-12", "-7", "7"], "A negative times a negative is a positive."],
    ["Solve: x + 7 = 12", "x = 5", ["x = 19", "x = 7", "x = 12"], "Take 7 from both sides."],
    ["Solve: 3x = 21", "x = 7", ["x = 18", "x = 24", "x = 63"], "Divide both sides by 3."],
    ["What is the circumference formula for a circle?", "2πr", ["πr²", "2r", "πd²"], "πr² is the area; 2πr (or πd) is the way round."],
    ["A right-angled triangle's longest side is called the…", "hypotenuse", ["base", "altitude", "radius"], "It is always opposite the right angle."],
    ["What does a² + b² = c² describe?", "The Pythagorean theorem", ["The area of a circle", "The mean", "A quadratic"], "It only works for right-angled triangles."],
    ["What is 7/8 + 1/8?", "1", ["8/16", "7/16", "8/8 = 0"], "Same denominator, so add the tops: 8/8 is one whole."],
    ["What is 1/2 x 1/4?", "1/8", ["1/6", "2/8", "1/2"], "Multiply the tops and the bottoms: half of a quarter."],
    ["How many faces does a triangular prism have?", "5", ["3", "4", "6"], "Two triangles and three rectangles."],
    ["What is the volume of a 2 x 3 x 4 box?", "24", ["9", "12", "18"], "Volume = length x width x height."],
    ["Which is a rational number?", "0.75", ["π", "√2", "√3"], "A rational number can be written as a fraction of two integers."],
    ["What is 20% expressed as a fraction?", "1/5", ["1/2", "2/10 only", "1/20"], "20/100 simplifies to 1/5."],
    ["If 5 pencils cost $2.50, what does 1 cost?", "$0.50", ["$0.25", "$1.00", "$5.00"], "2.50 ÷ 5."],
    ["A car travels 120 miles in 2 hours. What is its speed?", "60 mph", ["120 mph", "240 mph", "30 mph"], "Speed = distance ÷ time."],
    ["What is the probability of rolling a 6 on a fair die?", "1/6", ["1/2", "1/3", "6/6"], "One favourable outcome out of six equally likely ones."],
    ["What is the probability of a coin landing heads twice in a row?", "1/4", ["1/2", "1/8", "2/2"], "1/2 x 1/2 — independent events multiply."],
    ["What is 10³?", "1000", ["30", "100", "10000"], "10 x 10 x 10."],
    ["Which shape has exactly one pair of parallel sides?", "A trapezoid", ["A rectangle", "A rhombus", "A triangle"], "A parallelogram has two pairs."],
    ["What is 45 minutes as a fraction of an hour?", "3/4", ["1/2", "4/5", "2/3"], "45 out of 60 minutes."],
    ["If a map scale is 1 cm = 5 km, how far is 7 cm?", "35 km", ["12 km", "5 km", "70 km"], "7 x 5."],
    ["What is the sum of the angles in a quadrilateral?", "360°", ["180°", "270°", "540°"], "Any four-sided shape splits into two triangles."]
  ];

  var MATH_GROWN = [
    ["What is 17 x 23?", "391", ["371", "381", "401"], "17 x 23 = 17 x 20 + 17 x 3 = 340 + 51."],
    ["What is 15% of 340?", "51", ["45", "48", "56"], "10% is 34, 5% is 17."],
    ["A $60 item rises 20%, then falls 20%. What is the price?", "$57.60", ["$60.00", "$62.40", "$56.00"], "Percentages are not symmetric: 72 then minus 14.40."],
    ["What is the compound interest idea in one line?", "You earn interest on your interest", ["Interest is charged twice", "Interest never changes", "Interest is refunded"], "Which is why time matters more than rate for long savings."],
    ["What is 7! (seven factorial)?", "5040", ["49", "720", "40320"], "7 x 6 x 5 x 4 x 3 x 2 x 1. (6! is 720, 8! is 40,320.)"],
    ["What is the derivative of x²?", "2x", ["x", "x³/3", "2"], "Bring the power down and reduce it by one."],
    ["What is the integral of 2x?", "x² + C", ["2", "x²", "2x² + C"], "Antidifferentiation always carries a constant."],
    ["What is log₁₀(1000)?", "3", ["10", "100", "1"], "The power you raise 10 to in order to get 1,000."],
    ["What is the sum of the first 100 whole numbers?", "5050", ["5000", "10100", "4950"], "n(n+1)/2 — Gauss's schoolboy trick."],
    ["What is the standard deviation a measure of?", "Spread around the mean", ["The middle value", "The largest value", "The total"], "Two data sets can share a mean and look nothing alike."],
    ["What is a median useful for that a mean is not?", "Resisting extreme outliers", ["Being easier to add", "Working with negatives", "Handling zero"], "One billionaire ruins a mean income; the median shrugs."],
    ["In statistics, what is a p-value?", "The chance of data this extreme if the null were true", ["The chance the claim is true", "The size of an effect", "The sample size"], "It is very commonly misread as the first of the wrong answers."],
    ["What is the probability of at least one head in three coin flips?", "7/8", ["1/2", "3/8", "1/3"], "1 minus the chance of no heads (1/8)."],
    ["What does 'correlation is not causation' warn against?", "Assuming one thing caused the other", ["Measuring twice", "Using small samples", "Rounding errors"], "Ice cream sales and drownings both rise in summer."],
    ["What is the value of e, roughly?", "2.718", ["3.142", "1.618", "0.577"], "The base of natural logarithms — 3.142 is π, 1.618 is φ."],
    ["What is the golden ratio, roughly?", "1.618", ["3.142", "2.718", "1.414"], "φ, where a/b = (a+b)/a."],
    ["What is the hypotenuse of a 5-12 right triangle?", "13", ["15", "17", "60"], "5-12-13 is a Pythagorean triple, like 3-4-5."],
    ["What is 2⁻²?", "1/4", ["-4", "4", "-1/4"], "A negative exponent means the reciprocal."],
    ["Solve: 2x + 5 = 3x - 4", "x = 9", ["x = 1", "x = -9", "x = 4.5"], "Subtract 2x from both sides, then add 4."],
    ["What is the slope of the line y = 3x - 2?", "3", ["-2", "1/3", "2"], "In y = mx + b, m is the slope and b the y-intercept."],
    ["How many diagonals does a hexagon have?", "9", ["6", "12", "15"], "n(n-3)/2 = 6 x 3 / 2."],
    ["What is the area of a circle with radius 3?", "9π", ["6π", "3π", "36π"], "πr² = π x 9."],
    ["What is the mode of a data set where every value appears once?", "There is no mode", ["The mean", "The first value", "Zero"], "Modes need repetition; some data sets simply have none."],
    ["What does the Pareto principle roughly claim?", "About 80% of effects come from 20% of causes", ["Everything averages out", "Small errors compound", "Half of all data is below average"], "A rule of thumb from Italian land ownership, borrowed everywhere since."],
    ["If a job takes 6 workers 10 days, how long for 15 workers?", "4 days", ["3 days", "5 days", "25 days"], "60 worker-days total, assuming the work divides cleanly."],
    ["What is 1/3 + 1/4?", "7/12", ["2/7", "1/7", "5/12"], "Common denominator 12: 4/12 + 3/12."],
    ["A number is divisible by 3 if…", "its digits add to a multiple of 3", ["it is even", "it ends in 3", "it ends in 0"], "2,451 → 2+4+5+1 = 12, so yes."],
    ["What is an asymptote?", "A line a curve approaches but never meets", ["A steep slope", "A turning point", "A break in a graph"], "1/x approaches both axes forever."],
    ["What is the mean of the numbers 1 to 9?", "5", ["4.5", "45", "9"], "For evenly spaced numbers the mean is the middle one."],
    ["What does exponential growth mean?", "The rate of growth is proportional to the size", ["It grows very fast", "It grows in steps", "It doubles daily"], "Which is why it looks slow, then suddenly does not."]
  ];

  return {
    wonder: { mid: WONDER_MID, big: WONDER_BIG, grown: WONDER_GROWN },
    word:   { mid: WORD_MID,   big: WORD_BIG,   grown: WORD_GROWN },
    math:   { mid: MATH_MID,   big: MATH_BIG,   grown: MATH_GROWN }
  };
})();
