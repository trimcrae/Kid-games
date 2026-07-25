/* ===========================================================
   Crossword — kid-friendly themed mini crosswords.
   -----------------------------------------------------------
   Read a clue, then type the answer one letter per box. Tap a
   cell (or tap again to switch Across/Down), or tap a clue to
   jump to it. Check shows which letters to fix; Reveal fills it
   in. Progress is saved per puzzle.

   Teaches: spelling, vocabulary and clue-reading. Themes include
   plain kid knowledge plus safe pop culture (Minecraft, Bluey,
   Frozen, favourite books, taekwondo, animals).

   The grids are built offline by tools/gen-crossword.js, which
   auto-interlocks a theme word list — so adding a NEW theme is
   just adding a {answer, clue} list there and regenerating. The
   PUZZLES data below is that generator output.
   =========================================================== */

(function () {
  "use strict";

  const PUZZLES = [{"name":"Minecraft Mash","emoji":"🟩","blurb":"Blocks, mobs and tools!","rows":9,"cols":10,"cells":[[null,null,null,"S","W","O","R","D",null,null],[null,null,null,null,null,null,null,"I",null,null],[null,null,null,"P","I","C","K","A","X","E"],[null,"T",null,null,null,"R",null,"M",null,"N"],["Z","O","M","B","I","E",null,"O",null,"D"],[null,"R",null,null,null,"E",null,"N",null,"E"],[null,"C",null,null,null,"P",null,"D",null,"R"],[null,"H",null,null,null,"E",null,null,null,null],[null,null,null,null,null,"R",null,null,null,null]],"numbers":{"0,3":1,"0,7":2,"2,3":3,"2,5":4,"2,9":5,"3,1":6,"4,0":7},"entries":[{"num":1,"dir":"across","row":0,"col":3,"answer":"SWORD","clue":"You craft this to fight mobs."},{"num":2,"dir":"down","row":0,"col":7,"answer":"DIAMOND","clue":"The shiny blue gem you dig for deep down."},{"num":3,"dir":"across","row":2,"col":3,"answer":"PICKAXE","clue":"The tool you mine stone and ore with."},{"num":4,"dir":"down","row":2,"col":5,"answer":"CREEPER","clue":"Green mob that goes SSSS… then BOOM!"},{"num":5,"dir":"down","row":2,"col":9,"answer":"ENDER","clue":"An ___man teleports when you look at it."},{"num":6,"dir":"down","row":3,"col":1,"answer":"TORCH","clue":"Place this to keep the dark (and mobs) away."},{"num":7,"dir":"across","row":4,"col":0,"answer":"ZOMBIE","clue":"Green undead mob that moans at night."}]},{"name":"Bluey Time","emoji":"🐶","blurb":"Play games with the Heeler family!","rows":11,"cols":7,"cells":[[null,"B",null,null,null,null,null],["D","A","N","C","E",null,null],[null,"N",null,"H",null,null,null],[null,"D",null,"I",null,null,null],[null,"I",null,"L",null,null,null],[null,"T",null,"L",null,null,null],[null,null,"B","I","N","G","O"],[null,null,"L",null,null,null,null],[null,"M","U","F","F","I","N"],[null,null,"E",null,null,null,null],[null,null,"Y",null,null,null,null]],"numbers":{"0,1":1,"1,0":2,"1,3":3,"6,2":4,"8,1":5},"entries":[{"num":1,"dir":"down","row":0,"col":1,"answer":"BANDIT","clue":"Bluey's dad who loves to play."},{"num":2,"dir":"across","row":1,"col":0,"answer":"DANCE","clue":"Move to music — there's a Bluey ___ mode!"},{"num":3,"dir":"down","row":1,"col":3,"answer":"CHILLI","clue":"Bluey's mum."},{"num":4,"dir":"across","row":6,"col":2,"answer":"BINGO","clue":"Bluey's little orange sister."},{"num":4,"dir":"down","row":6,"col":2,"answer":"BLUEY","clue":"The big blue puppy this show is named after."},{"num":5,"dir":"across","row":8,"col":1,"answer":"MUFFIN","clue":"Bluey's silly little cousin."}]},{"name":"Animal Friends","emoji":"🦁","blurb":"Creatures big and small.","rows":10,"cols":7,"cells":[[null,"O","T","T","E","R",null],[null,null,"I",null,null,null,null],[null,null,"G",null,null,null,"Z"],[null,null,"E","A","G","L","E"],[null,null,"R",null,null,null,"B"],[null,null,null,null,"S",null,"R"],[null,null,"P","A","N","D","A"],[null,null,null,null,"A",null,null],[null,null,null,null,"K",null,null],["H","O","R","S","E",null,null]],"numbers":{"0,1":1,"0,2":2,"2,6":3,"3,2":4,"5,4":5,"6,2":6,"9,0":7},"entries":[{"num":1,"dir":"across","row":0,"col":1,"answer":"OTTER","clue":"A playful river animal that floats on its back."},{"num":2,"dir":"down","row":0,"col":2,"answer":"TIGER","clue":"A big orange cat with black stripes."},{"num":3,"dir":"down","row":2,"col":6,"answer":"ZEBRA","clue":"A horse-like animal in black and white."},{"num":4,"dir":"across","row":3,"col":2,"answer":"EAGLE","clue":"A huge bird with sharp eyes."},{"num":5,"dir":"down","row":5,"col":4,"answer":"SNAKE","clue":"A long animal with no legs."},{"num":6,"dir":"across","row":6,"col":2,"answer":"PANDA","clue":"A bear that munches bamboo."},{"num":7,"dir":"across","row":9,"col":0,"answer":"HORSE","clue":"An animal you can ride that says 'neigh'."}]},{"name":"Frozen Magic","emoji":"❄️","blurb":"Adventures in Arendelle.","rows":9,"cols":7,"cells":[[null,null,null,"S","N","O","W"],[null,null,null,"V",null,null,null],[null,"M",null,"E",null,null,null],[null,"A","N","N","A",null,null],[null,"G",null,null,null,null,null],["W","I","N","T","E","R",null],[null,"C",null,null,"L",null,null],[null,null,null,null,"S",null,null],[null,null,"O","L","A","F",null]],"numbers":{"0,3":1,"2,1":2,"3,1":3,"5,0":4,"5,4":5,"8,2":6},"entries":[{"num":1,"dir":"across","row":0,"col":3,"answer":"SNOW","clue":"White fluffy stuff Elsa can make."},{"num":1,"dir":"down","row":0,"col":3,"answer":"SVEN","clue":"Kristoff's reindeer buddy."},{"num":2,"dir":"down","row":2,"col":1,"answer":"MAGIC","clue":"Elsa's special icy power."},{"num":3,"dir":"across","row":3,"col":1,"answer":"ANNA","clue":"Elsa's brave younger sister."},{"num":4,"dir":"across","row":5,"col":0,"answer":"WINTER","clue":"The cold, snowy season."},{"num":5,"dir":"down","row":5,"col":4,"answer":"ELSA","clue":"The queen with icy magic powers."},{"num":6,"dir":"across","row":8,"col":2,"answer":"OLAF","clue":"The happy snowman who loves warm hugs."}]},{"name":"Book Heroes","emoji":"📚","blurb":"Stars from favourite kids' books.","rows":8,"cols":9,"cells":[[null,null,null,"C",null,null,null,null,null],[null,"H",null,"A",null,null,null,null,null],["R","O","W","L","E","Y",null,null,null],[null,"B",null,"V",null,null,null,null,null],[null,"B",null,"I",null,"G",null,null,null],[null,"E",null,"N","O","R","Y",null,null],[null,"S",null,null,null,"E",null,null,null],[null,null,null,"D","O","G","M","A","N"]],"numbers":{"0,3":1,"1,1":2,"2,0":3,"4,5":4,"5,3":5,"7,3":6},"entries":[{"num":1,"dir":"down","row":0,"col":3,"answer":"CALVIN","clue":"The boy with a stuffed tiger named Hobbes."},{"num":2,"dir":"down","row":1,"col":1,"answer":"HOBBES","clue":"Calvin's tiger, real to him!"},{"num":3,"dir":"across","row":2,"col":0,"answer":"ROWLEY","clue":"Greg's best friend in the Wimpy Kid books."},{"num":4,"dir":"down","row":4,"col":5,"answer":"GREG","clue":"The main kid in 'Diary of a Wimpy Kid'."},{"num":5,"dir":"across","row":5,"col":3,"answer":"NORY","clue":"The wonky-magic hero of 'Upside Down Magic'."},{"num":6,"dir":"across","row":7,"col":3,"answer":"DOGMAN","clue":"Part dog, part cop, all hero! (one word)"}]},{"name":"Taekwondo Class","emoji":"🥋","blurb":"Kicks, belts and respect!","rows":10,"cols":10,"cells":[["B","O","W",null,null,null,null,null,null,null],[null,null,"H",null,null,null,null,null,null,null],[null,"K","I","C","K",null,null,null,null,null],[null,null,"T",null,null,null,null,null,null,null],[null,"B","E","L","T",null,null,null,null,null],[null,"L",null,null,null,null,null,null,null,null],["F","O","R","M",null,"S",null,null,null,null],[null,"C",null,null,null,"P","U","N","C","H"],[null,"K","O","R","E","A",null,null,null,null],[null,null,null,null,null,"R",null,null,null,null]],"numbers":{"0,0":1,"0,2":2,"2,1":3,"4,1":4,"6,0":5,"6,5":6,"7,5":7,"8,1":8},"entries":[{"num":1,"dir":"across","row":0,"col":0,"answer":"BOW","clue":"You do this to show respect before you spar."},{"num":2,"dir":"down","row":0,"col":2,"answer":"WHITE","clue":"The belt colour you start with as a beginner."},{"num":3,"dir":"across","row":2,"col":1,"answer":"KICK","clue":"Striking with your foot — taekwondo's specialty!"},{"num":4,"dir":"across","row":4,"col":1,"answer":"BELT","clue":"The coloured band tied around your uniform."},{"num":4,"dir":"down","row":4,"col":1,"answer":"BLOCK","clue":"Move your arm to stop an attack."},{"num":5,"dir":"across","row":6,"col":0,"answer":"FORM","clue":"A set pattern of moves you practice (a 'poomsae')."},{"num":6,"dir":"down","row":6,"col":5,"answer":"SPAR","clue":"To practice-fight a partner."},{"num":7,"dir":"across","row":7,"col":5,"answer":"PUNCH","clue":"A straight strike with your fist."},{"num":8,"dir":"across","row":8,"col":1,"answer":"KOREA","clue":"The country where taekwondo began."}]},{"name":"Pokémon Party","emoji":"⚡","blurb":"Catch and battle your favourites!","rows":11,"cols":10,"cells":[[null,"P","I","K","A","C","H","U",null,null],[null,null,null,null,null,"H",null,null,null,"T"],[null,"B","U","L","B","A","S","A","U","R"],[null,null,null,null,null,"R",null,null,null,"A"],[null,"S",null,null,null,"I",null,null,null,"I"],[null,"N",null,"E",null,"Z",null,null,null,"N"],["P","O","K","E","B","A","L","L",null,"E"],[null,"R",null,"V",null,"R",null,null,null,"R"],[null,"L",null,"E",null,"D",null,null,null,null],[null,"A",null,"E",null,null,null,null,null,null],[null,"X",null,null,null,null,null,null,null,null]],"numbers":{"0,1":1,"0,5":2,"1,9":3,"2,1":4,"4,1":5,"5,3":6,"6,0":7},"entries":[{"num":1,"dir":"across","row":0,"col":1,"answer":"PIKACHU","clue":"The yellow electric mouse Pokémon."},{"num":2,"dir":"down","row":0,"col":5,"answer":"CHARIZARD","clue":"A big orange fire-and-flying dragon Pokémon."},{"num":3,"dir":"down","row":1,"col":9,"answer":"TRAINER","clue":"A person who catches and battles Pokémon."},{"num":4,"dir":"across","row":2,"col":1,"answer":"BULBASAUR","clue":"A grass Pokémon with a plant bulb on its back."},{"num":5,"dir":"down","row":4,"col":1,"answer":"SNORLAX","clue":"A huge Pokémon that loves to sleep."},{"num":6,"dir":"down","row":5,"col":3,"answer":"EEVEE","clue":"A fluffy Pokémon that can evolve many ways."},{"num":7,"dir":"across","row":6,"col":0,"answer":"POKEBALL","clue":"The red-and-white ball you catch Pokémon in."}]},{"name":"Gabby's Dollhouse","emoji":"🐱","blurb":"Welcome to the kitty house!","rows":7,"cols":8,"cells":[[null,null,"C","A","T","N","I","P"],[null,null,"A",null,null,null,null,"A"],["M","E","R","C","A","T",null,"N"],[null,null,"L",null,null,null,null,"D"],[null,"K","I","T","T","Y",null,"Y"],[null,null,"T",null,null,null,null,null],[null,"G","A","B","B","Y",null,null]],"numbers":{"0,2":1,"0,7":2,"2,0":3,"4,1":4,"6,1":5},"entries":[{"num":1,"dir":"across","row":0,"col":2,"answer":"CATNIP","clue":"DJ ___, the music-loving green cat."},{"num":1,"dir":"down","row":0,"col":2,"answer":"CARLITA","clue":"Gabby's toy car that's also a cat!"},{"num":2,"dir":"down","row":0,"col":7,"answer":"PANDY","clue":"___ Paws, the cuddly panda-cat."},{"num":3,"dir":"across","row":2,"col":0,"answer":"MERCAT","clue":"The half-mermaid, half-cat of the bathroom."},{"num":4,"dir":"across","row":4,"col":1,"answer":"KITTY","clue":"A baby cat."},{"num":5,"dir":"across","row":6,"col":1,"answer":"GABBY","clue":"The girl who shrinks down to visit the dollhouse."}]},{"name":"Outer Space","emoji":"🚀","blurb":"Blast off to the stars!","rows":11,"cols":10,"cells":[["S",null,null,null,null,null,null,null,null,null],["A",null,null,null,null,null,null,null,null,null],["T",null,null,"P","L","A","N","E","T",null],["U",null,null,null,null,"S",null,null,null,null],["R","O","C","K","E","T",null,null,null,null],["N",null,"O",null,null,"R",null,null,null,null],[null,null,"M",null,null,"O","R","B","I","T"],[null,null,"E",null,null,"N",null,null,null,null],[null,null,"T",null,"G","A","L","A","X","Y"],[null,null,null,null,null,"U",null,null,null,null],[null,null,null,null,null,"T",null,null,null,null]],"numbers":{"0,0":1,"2,3":2,"2,5":3,"4,0":4,"4,2":5,"6,5":6,"8,4":7},"entries":[{"num":1,"dir":"down","row":0,"col":0,"answer":"SATURN","clue":"The planet famous for its rings."},{"num":2,"dir":"across","row":2,"col":3,"answer":"PLANET","clue":"Earth, Mars and Jupiter are each one."},{"num":3,"dir":"down","row":2,"col":5,"answer":"ASTRONAUT","clue":"A person who travels into space."},{"num":4,"dir":"across","row":4,"col":0,"answer":"ROCKET","clue":"A ship that blasts off into space."},{"num":5,"dir":"down","row":4,"col":2,"answer":"COMET","clue":"An icy space ball with a glowing tail."},{"num":6,"dir":"across","row":6,"col":5,"answer":"ORBIT","clue":"The path a planet or moon travels around."},{"num":7,"dir":"across","row":8,"col":4,"answer":"GALAXY","clue":"A huge swirl of millions of stars."}]},{"name":"Soccer Stars","emoji":"⚽","blurb":"Kick, pass and score!","rows":7,"cols":9,"cells":[[null,null,"P","A","S","S",null,"B",null],[null,null,null,null,null,"T","E","A","M"],["K","I","C","K",null,"R",null,"L",null],[null,null,"O",null,"F","I","E","L","D"],[null,null,"A",null,null,"K",null,null,null],[null,"S","C","O","R","E",null,null,null],[null,null,"H",null,null,"R",null,null,null]],"numbers":{"0,2":1,"0,5":2,"0,7":3,"1,5":4,"2,0":5,"2,2":6,"3,4":7,"5,1":8},"entries":[{"num":1,"dir":"across","row":0,"col":2,"answer":"PASS","clue":"To kick the ball to a teammate."},{"num":2,"dir":"down","row":0,"col":5,"answer":"STRIKER","clue":"The player whose job is to score goals."},{"num":3,"dir":"down","row":0,"col":7,"answer":"BALL","clue":"The round thing you kick around the field."},{"num":4,"dir":"across","row":1,"col":5,"answer":"TEAM","clue":"The group of players you play with."},{"num":5,"dir":"across","row":2,"col":0,"answer":"KICK","clue":"How you move the ball with your foot."},{"num":6,"dir":"down","row":2,"col":2,"answer":"COACH","clue":"The grown-up who teaches the team."},{"num":7,"dir":"across","row":3,"col":4,"answer":"FIELD","clue":"The grassy place where you play."},{"num":8,"dir":"across","row":5,"col":1,"answer":"SCORE","clue":"The number of goals each team has."}]},{"name":"Dinosaur Dig","emoji":"🦕","blurb":"Stomp back to the age of dinos!","rows":13,"cols":6,"cells":[["R","E","X",null,null,null],["O",null,null,null,null,null],["A",null,null,"S",null,null],["R","A","P","T","O","R"],[null,null,null,"E",null,null],[null,null,"E","G","G",null],[null,"B",null,"O",null,null],["F","O","S","S","I","L"],[null,"N",null,"A",null,null],[null,"E",null,"U",null,null],[null,"S",null,"R",null,null],[null,null,null,"U",null,null],[null,null,null,"S",null,null]],"numbers":{"0,0":1,"2,3":2,"3,0":3,"5,2":4,"6,1":5,"7,0":6},"entries":[{"num":1,"dir":"across","row":0,"col":0,"answer":"REX","clue":"Tyrannosaurus ___, the giant meat-eater."},{"num":1,"dir":"down","row":0,"col":0,"answer":"ROAR","clue":"The big loud sound a dinosaur makes."},{"num":2,"dir":"down","row":2,"col":3,"answer":"STEGOSAURUS","clue":"A dino with plates on its back and a spiky tail."},{"num":3,"dir":"across","row":3,"col":0,"answer":"RAPTOR","clue":"A fast, clever hunting dinosaur."},{"num":4,"dir":"across","row":5,"col":2,"answer":"EGG","clue":"A baby dinosaur hatches out of this."},{"num":5,"dir":"down","row":6,"col":1,"answer":"BONES","clue":"What scientists dig up to learn about dinos."},{"num":6,"dir":"across","row":7,"col":0,"answer":"FOSSIL","clue":"Old bones that turned to stone."}]},{"name":"Yummy Food","emoji":"🍕","blurb":"Snacks and treats we love!","rows":11,"cols":7,"cells":[[null,"B","R","E","A","D",null],[null,null,null,null,"P",null,null],[null,null,null,null,"P",null,null],[null,null,null,null,"L",null,null],["J","U","I","C","E",null,null],[null,null,null,"O",null,null,"B"],["T","A","C","O",null,null,"A"],[null,null,null,"K",null,null,"N"],[null,null,"P","I","Z","Z","A"],[null,null,null,"E",null,null,"N"],[null,null,null,null,null,null,"A"]],"numbers":{"0,1":1,"0,4":2,"4,0":3,"4,3":4,"5,6":5,"6,0":6,"8,2":7},"entries":[{"num":1,"dir":"across","row":0,"col":1,"answer":"BREAD","clue":"You toast it or make a sandwich with it."},{"num":2,"dir":"down","row":0,"col":4,"answer":"APPLE","clue":"A crunchy red or green fruit."},{"num":3,"dir":"across","row":4,"col":0,"answer":"JUICE","clue":"A sweet drink squeezed from fruit."},{"num":4,"dir":"down","row":4,"col":3,"answer":"COOKIE","clue":"A sweet treat that's great with milk."},{"num":5,"dir":"down","row":5,"col":6,"answer":"BANANA","clue":"A long yellow fruit monkeys love."},{"num":6,"dir":"across","row":6,"col":0,"answer":"TACO","clue":"A folded shell stuffed with yummy fillings."},{"num":7,"dir":"across","row":8,"col":2,"answer":"PIZZA","clue":"A round, cheesy slice with toppings."}]},{"name":"Princess Party","emoji":"👑","blurb":"Crowns, castles and royal magic!","rows":9,"cols":11,"cells":[[null,null,null,"P",null,null,null,null,null,null,null],[null,null,"C","R","O","W","N",null,null,null,null],[null,null,null,"I",null,null,null,null,null,null,null],["W",null,null,"N",null,null,null,null,null,null,null],["A",null,null,"C","A","S","T","L","E",null,"B"],["N",null,null,"E",null,null,"I",null,null,null,"A"],["D","R","E","S","S",null,"A",null,null,null,"L"],[null,null,null,"S",null,null,"R","O","Y","A","L"],[null,null,null,null,null,null,"A",null,null,null,null]],"numbers":{"0,3":1,"1,2":2,"3,0":3,"4,3":4,"4,6":5,"4,10":6,"6,0":7,"7,6":8},"entries":[{"num":1,"dir":"down","row":0,"col":3,"answer":"PRINCESS","clue":"A royal daughter of a king and queen."},{"num":2,"dir":"across","row":1,"col":2,"answer":"CROWN","clue":"The sparkly gold circle a queen wears on her head."},{"num":3,"dir":"down","row":3,"col":0,"answer":"WAND","clue":"A fairy godmother waves this to make magic."},{"num":4,"dir":"across","row":4,"col":3,"answer":"CASTLE","clue":"The giant stone home where royals live."},{"num":5,"dir":"down","row":4,"col":6,"answer":"TIARA","clue":"A small jewelled half-crown for fancy parties."},{"num":6,"dir":"down","row":4,"col":10,"answer":"BALL","clue":"A big fancy royal dance party."},{"num":7,"dir":"across","row":6,"col":0,"answer":"DRESS","clue":"A twirly thing to wear to the ball."},{"num":8,"dir":"across","row":7,"col":6,"answer":"ROYAL","clue":"A word that means 'belonging to a king or queen'."}]},{"name":"Number Land","emoji":"🔢","blurb":"Spell the math words!","rows":12,"cols":10,"cells":[[null,null,null,null,"P",null,null,null,null,null],[null,null,"H",null,"L",null,null,null,null,null],[null,null,"U",null,"U",null,null,null,null,null],["M","I","N","U","S",null,null,null,null,null],[null,null,"D",null,null,null,null,null,null,null],[null,null,"R",null,null,"S",null,null,null,null],["T","W","E","L","V","E",null,"D",null,null],[null,null,"D",null,null,"V",null,"O",null,null],[null,null,null,null,null,"E","Q","U","A","L"],[null,null,null,null,null,"N",null,"B",null,null],[null,null,null,null,null,null,null,"L",null,null],[null,null,null,null,null,null,"Z","E","R","O"]],"numbers":{"0,4":1,"1,2":2,"3,0":3,"5,5":4,"6,0":5,"6,7":6,"8,5":7,"11,6":8},"entries":[{"num":1,"dir":"down","row":0,"col":4,"answer":"PLUS","clue":"The + sign means to add, or '___'."},{"num":2,"dir":"down","row":1,"col":2,"answer":"HUNDRED","clue":"Ten groups of ten make one ___."},{"num":3,"dir":"across","row":3,"col":0,"answer":"MINUS","clue":"The − sign means to take away, or '___'."},{"num":4,"dir":"down","row":5,"col":5,"answer":"SEVEN","clue":"How many days are in one week."},{"num":5,"dir":"across","row":6,"col":0,"answer":"TWELVE","clue":"The number after eleven — a dozen!"},{"num":6,"dir":"down","row":6,"col":7,"answer":"DOUBLE","clue":"To make twice as many — 4 becomes 8!"},{"num":7,"dir":"across","row":8,"col":5,"answer":"EQUAL","clue":"What the = sign means: the same amount."},{"num":8,"dir":"across","row":11,"col":6,"answer":"ZERO","clue":"The number that means 'nothing at all'."}]},{"name":"Under the Sea","emoji":"🌊","blurb":"Dive down with the sea creatures!","rows":7,"cols":12,"cells":[["S","E","A","W","E","E","D",null,null,null,null,null],["H",null,null,null,null,null,"O",null,"W","A","V","E"],["A",null,"C","O","R","A","L",null,"H",null,null,null],["R",null,"R",null,null,null,"P",null,"A",null,null,null],["K",null,"A",null,null,"S","H","E","L","L",null,null],[null,null,"B",null,null,null,"I",null,"E",null,null,null],[null,null,null,null,null,null,"N",null,null,null,null,null]],"numbers":{"0,0":1,"0,6":2,"1,8":3,"2,2":4,"4,5":5},"entries":[{"num":1,"dir":"across","row":0,"col":0,"answer":"SEAWEED","clue":"The green, slippery plant that grows in the ocean."},{"num":1,"dir":"down","row":0,"col":0,"answer":"SHARK","clue":"A big fish with lots and lots of teeth."},{"num":2,"dir":"down","row":0,"col":6,"answer":"DOLPHIN","clue":"A smart, friendly sea animal that leaps and clicks."},{"num":3,"dir":"across","row":1,"col":8,"answer":"WAVE","clue":"It rolls across the ocean and crashes on the sand."},{"num":3,"dir":"down","row":1,"col":8,"answer":"WHALE","clue":"The biggest animal in the whole ocean."},{"num":4,"dir":"across","row":2,"col":2,"answer":"CORAL","clue":"A colourful underwater reef is made of this."},{"num":4,"dir":"down","row":2,"col":2,"answer":"CRAB","clue":"A sideways-walking animal with two pinchy claws."},{"num":5,"dir":"across","row":4,"col":5,"answer":"SHELL","clue":"You find these on the beach — some hide hermit crabs."}]},{"name":"Weather Watch","emoji":"🌦️","blurb":"Sun, storms and rainbows!","rows":8,"cols":11,"cells":[[null,null,null,"S","T","O","R","M",null,null,null],[null,null,null,null,"H",null,"A",null,null,null,null],[null,null,"F",null,"U",null,"I",null,null,null,null],[null,null,"R",null,"N",null,"N",null,"S",null,null],["C","L","O","U","D",null,"B",null,"U",null,null],[null,null,"S",null,"E",null,"O",null,"N",null,null],[null,null,"T",null,"R",null,"W","I","N","D","Y"],[null,null,null,null,null,null,null,null,"Y",null,null]],"numbers":{"0,3":1,"0,4":2,"0,6":3,"2,2":4,"3,8":5,"4,0":6,"6,6":7},"entries":[{"num":1,"dir":"across","row":0,"col":3,"answer":"STORM","clue":"Wild weather with wind, rain and thunder."},{"num":2,"dir":"down","row":0,"col":4,"answer":"THUNDER","clue":"The big rumbling BOOM after lightning."},{"num":3,"dir":"down","row":0,"col":6,"answer":"RAINBOW","clue":"The coloured arc in the sky after rain and sun."},{"num":4,"dir":"down","row":2,"col":2,"answer":"FROST","clue":"The sparkly ice that covers grass on cold mornings."},{"num":5,"dir":"down","row":3,"col":8,"answer":"SUNNY","clue":"A bright day with no clouds is this."},{"num":6,"dir":"across","row":4,"col":0,"answer":"CLOUD","clue":"A white fluffy thing floating in the sky."},{"num":7,"dir":"across","row":6,"col":6,"answer":"WINDY","clue":"The kind of day that's perfect for flying a kite."}]},{"name":"Music Makers","emoji":"🎹","blurb":"Notes, beats and instruments!","rows":6,"cols":13,"cells":[["S","O","N","G",null,null,null,null,null,null,null,null,"B"],["H",null,null,"U",null,null,"N",null,null,null,null,null,"E"],["A",null,"P","I","A","N","O",null,null,null,null,null,"A"],["R",null,null,"T",null,null,"T","R","U","M","P","E","T"],["P",null,null,"A",null,null,"E",null,null,null,null,null,null],[null,null,"D","R","U","M",null,null,null,null,null,null,null]],"numbers":{"0,0":1,"0,3":2,"0,12":3,"1,6":4,"2,2":5,"3,6":6,"5,2":7},"entries":[{"num":1,"dir":"across","row":0,"col":0,"answer":"SONG","clue":"Words and a tune you can sing."},{"num":1,"dir":"down","row":0,"col":0,"answer":"SHARP","clue":"The ♯ sign makes a note one step higher — a '___'."},{"num":2,"dir":"down","row":0,"col":3,"answer":"GUITAR","clue":"You strum its six strings."},{"num":3,"dir":"down","row":0,"col":12,"answer":"BEAT","clue":"The steady pulse you clap along to."},{"num":4,"dir":"down","row":1,"col":6,"answer":"NOTE","clue":"One single sound in a song — A, B or C!"},{"num":5,"dir":"across","row":2,"col":2,"answer":"PIANO","clue":"Black and white keys you press to make notes."},{"num":6,"dir":"across","row":3,"col":6,"answer":"TRUMPET","clue":"A shiny brass horn you blow."},{"num":7,"dir":"across","row":5,"col":2,"answer":"DRUM","clue":"You hit this one with sticks to keep the beat."}]},{"name":"Around the World","emoji":"🌍","blurb":"Continents, oceans and maps!","rows":7,"cols":11,"cells":[[null,null,null,null,"I",null,null,null,"M","A","P"],[null,null,"R",null,"S",null,"E",null,null,"S",null],[null,null,"I",null,"L",null,"U",null,null,"I",null],[null,null,"V",null,"A","F","R","I","C","A",null],["O","C","E","A","N",null,"O",null,null,null,null],[null,null,"R",null,"D",null,"P",null,null,null,null],[null,null,null,null,null,"D","E","S","E","R","T"]],"numbers":{"0,4":1,"0,8":2,"0,9":3,"1,2":4,"1,6":5,"3,4":6,"4,0":7,"6,5":8},"entries":[{"num":1,"dir":"down","row":0,"col":4,"answer":"ISLAND","clue":"Land with water all the way around it."},{"num":2,"dir":"across","row":0,"col":8,"answer":"MAP","clue":"A picture of a place from above."},{"num":3,"dir":"down","row":0,"col":9,"answer":"ASIA","clue":"The biggest continent of them all."},{"num":4,"dir":"down","row":1,"col":2,"answer":"RIVER","clue":"Water that flows all the way to the sea."},{"num":5,"dir":"down","row":1,"col":6,"answer":"EUROPE","clue":"The continent with castles and the Alps."},{"num":6,"dir":"across","row":3,"col":4,"answer":"AFRICA","clue":"The continent with the Sahara Desert and lions."},{"num":7,"dir":"across","row":4,"col":0,"answer":"OCEAN","clue":"A huge body of salty water — there are five."},{"num":8,"dir":"across","row":6,"col":5,"answer":"DESERT","clue":"A very dry place with hardly any rain."}]},{"name":"Rock Hunter","emoji":"🪨","blurb":"Geology words for rock detectives!","rows":11,"cols":11,"cells":[[null,null,null,null,null,"C",null,null,null,null,null],[null,null,null,null,null,"R",null,"M",null,null,null],[null,null,null,null,null,"Y",null,"I",null,null,null],[null,null,null,null,null,"S","A","N","D",null,null],[null,"G",null,null,null,"T",null,"E",null,null,null],[null,"E",null,null,null,"A",null,"R",null,null,"Q"],["F","O","S","S","I","L",null,"A",null,null,"U"],[null,"D",null,null,null,null,null,"L","A","V","A"],[null,"E",null,null,null,null,null,null,null,null,"R"],[null,null,null,null,null,null,null,null,null,null,"T"],[null,null,null,null,null,null,null,null,null,null,"Z"]],"numbers":{"0,5":1,"1,7":2,"3,5":3,"4,1":4,"5,10":5,"6,0":6,"7,7":7},"entries":[{"num":1,"dir":"down","row":0,"col":5,"answer":"CRYSTAL","clue":"A mineral that grew in a shape with flat, shiny sides."},{"num":2,"dir":"down","row":1,"col":7,"answer":"MINERAL","clue":"The natural stuff rocks are made of."},{"num":3,"dir":"across","row":3,"col":5,"answer":"SAND","clue":"Zillions of tiny bits of worn-down rock."},{"num":4,"dir":"down","row":4,"col":1,"answer":"GEODE","clue":"A plain-looking rock that's full of crystals inside."},{"num":5,"dir":"down","row":5,"col":10,"answer":"QUARTZ","clue":"A very common mineral, often clear or milky white."},{"num":6,"dir":"across","row":6,"col":0,"answer":"FOSSIL","clue":"The shape of an old plant or animal left in stone."},{"num":7,"dir":"across","row":7,"col":7,"answer":"LAVA","clue":"Melted rock that pours out of a volcano."}]},{"name":"My Amazing Body","emoji":"🫀","blurb":"The parts that keep you going!","rows":7,"cols":12,"cells":[[null,null,"L",null,"M",null,null,null,null,null,null,null],[null,null,"U",null,"U",null,null,null,null,null,null,null],["B","O","N","E","S",null,null,"T",null,null,null,null],["R",null,"G",null,"C",null,null,"E","L","B","O","W"],["A",null,"S",null,"L",null,null,"E",null,null,null,null],["I",null,null,"H","E","A","R","T",null,null,null,null],["N",null,null,null,null,null,null,"H",null,null,null,null]],"numbers":{"0,2":1,"0,4":2,"2,0":3,"2,7":4,"3,7":5,"5,3":6},"entries":[{"num":1,"dir":"down","row":0,"col":2,"answer":"LUNGS","clue":"The two air bags you breathe with."},{"num":2,"dir":"down","row":0,"col":4,"answer":"MUSCLE","clue":"You flex this to lift and move."},{"num":3,"dir":"across","row":2,"col":0,"answer":"BONES","clue":"The hard parts that hold you up — you have 206!"},{"num":3,"dir":"down","row":2,"col":0,"answer":"BRAIN","clue":"The thinking part inside your head."},{"num":4,"dir":"down","row":2,"col":7,"answer":"TEETH","clue":"You chew with these and brush them twice a day."},{"num":5,"dir":"across","row":3,"col":7,"answer":"ELBOW","clue":"The bendy joint in the middle of your arm."},{"num":6,"dir":"across","row":5,"col":3,"answer":"HEART","clue":"The muscle that pumps your blood all day and night."}]},{"name":"Bug Hunt","emoji":"🐛","blurb":"Creepy crawlies in the garden!","rows":11,"cols":6,"cells":[[null,null,null,null,null,"M"],[null,null,null,"L",null,"O"],[null,null,null,"A","N","T"],[null,null,null,"D",null,"H"],[null,null,null,"Y",null,null],[null,"S",null,"B",null,null],[null,"P",null,"U",null,null],["W","I","N","G","S",null],[null,"D",null,null,null,"W"],["B","E","E","T","L","E"],[null,"R",null,null,null,"B"]],"numbers":{"0,5":1,"1,3":2,"2,3":3,"5,1":4,"7,0":5,"8,5":6,"9,0":7},"entries":[{"num":1,"dir":"down","row":0,"col":5,"answer":"MOTH","clue":"A night-time flutterer drawn to a light."},{"num":2,"dir":"down","row":1,"col":3,"answer":"LADYBUG","clue":"A little red beetle with black spots."},{"num":3,"dir":"across","row":2,"col":3,"answer":"ANT","clue":"A tiny bug that marches in a line to your picnic."},{"num":4,"dir":"down","row":5,"col":1,"answer":"SPIDER","clue":"Eight legs and a sticky web."},{"num":5,"dir":"across","row":7,"col":0,"answer":"WINGS","clue":"Bees and butterflies fly with these."},{"num":6,"dir":"down","row":8,"col":5,"answer":"WEB","clue":"The sticky trap a spider spins."},{"num":7,"dir":"across","row":9,"col":0,"answer":"BEETLE","clue":"A bug with a hard shiny shell on its back."}]}];

  /* ---------- saved progress ---------- */
  const SAVE_KEY = "crossword.v1";
  function load() {
    try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && typeof s === "object") return s; }
    catch (e) {}
    return {};
  }
  function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(saved)); } catch (e) {} }
  const saved = load();
  function slot(i) { if (!saved["p" + i] || typeof saved["p" + i] !== "object") saved["p" + i] = { letters: null, solved: false }; return saved["p" + i]; }

  /* ---------- refs ---------- */
  const $ = (id) => document.getElementById(id);
  const el = {
    puzzles: $("puzzles"), puzGrid: $("puz-grid"), play: $("play"),
    title: $("puz-title"), feedback: $("feedback"), grid: $("xgrid"),
    across: $("across-clues"), down: $("down-clues"),
    check: $("check-btn"), reveal: $("reveal-btn"), clear: $("clear-btn"), quit: $("quit-btn"),
    next: $("next-btn"), hint: $("hint-btn"), progress: $("puz-progress"),
    curClue: $("cur-clue"), curClueText: $("cur-clue-text"),
    cluePrev: $("clue-prev"), clueNext: $("clue-next"),
  };

  /* ---------- live state ---------- */
  let pi = 0;
  let puzzle = null;
  let user = [];            // user[r][c] letter or "" ; null for blocks
  let inputs = [];          // inputs[r][c] = <input> or null
  let cellEntries = {};     // "r,c" -> {across, down}
  let curDir = "across";
  let curCell = null;       // {r,c}
  let solvedNow = false;
  let doneKeys = {};        // "num-dir" -> true for entries already finished (for the little ding)
  let revealArmed = 0;      // timestamp while the Reveal button waits for a confirming 2nd tap

  function show(section) {
    el.puzzles.classList.toggle("hidden", section !== "puzzles");
    el.play.classList.toggle("hidden", section !== "play");
  }

  /* ---------- picker ---------- */
  function renderPuzzles() {
    el.puzGrid.innerHTML = "";
    let wins = 0;
    PUZZLES.forEach((p, i) => {
      const done = slot(i).solved;
      if (done) wins++;
      const card = document.createElement("button");
      card.type = "button";
      card.className = "puz-card" + (done ? " solved" : "");
      card.innerHTML =
        '<span class="pz-emoji" aria-hidden="true">' + p.emoji + "</span>" +
        "<h3>" + p.name + "</h3>" +
        '<span class="pz-blurb">' + (done ? "Solved ✓" : p.blurb) + "</span>";
      card.addEventListener("click", () => startPuzzle(i));
      el.puzGrid.appendChild(card);
    });
    if (el.progress) {
      el.progress.textContent = wins === 0
        ? "Pick a crossword:"
        : wins === PUZZLES.length
          ? "🏆 All " + PUZZLES.length + " crosswords solved — wow!"
          : "Solved " + wins + " of " + PUZZLES.length + " — pick a crossword:";
    }
  }

  /* ---------- start ---------- */
  function entryCells(e) {
    const out = [];
    for (let i = 0; i < e.answer.length; i++) {
      out.push(e.dir === "across" ? { r: e.row, c: e.col + i } : { r: e.row + i, c: e.col });
    }
    return out;
  }

  function startPuzzle(i) {
    pi = i;
    puzzle = PUZZLES[i];
    solvedNow = false;
    curDir = "across";
    curCell = null;
    doneKeys = {};
    disarmReveal();
    el.feedback.textContent = "";
    el.next.classList.add("hidden");
    el.title.textContent = puzzle.emoji + " " + puzzle.name;

    // map cells -> entries
    cellEntries = {};
    puzzle.entries.forEach((e) => {
      entryCells(e).forEach((cell) => {
        const k = cell.r + "," + cell.c;
        if (!cellEntries[k]) cellEntries[k] = {};
        cellEntries[k][e.dir] = e;
      });
    });

    // restore or init user letters
    const st = slot(i);
    user = puzzle.cells.map((row, r) => row.map((ch) => (ch === null ? null : "")));
    if (Array.isArray(st.letters)) {
      for (let r = 0; r < puzzle.rows; r++)
        for (let c = 0; c < puzzle.cols; c++)
          if (user[r] && user[r][c] === "" && st.letters[r] && typeof st.letters[r][c] === "string")
            user[r][c] = st.letters[r][c];
    }

    buildGrid();
    buildClues();
    markDoneClues(true); // seed quietly so restored words don't re-ding
    // focus the first across entry
    const first = puzzle.entries.find((e) => e.dir === "across") || puzzle.entries[0];
    if (first) selectEntry(first);
    show("play");
  }

  function buildGrid() {
    const cell = "min(8.5vw, 40px)";
    el.grid.style.gridTemplateColumns = "repeat(" + puzzle.cols + ", " + cell + ")";
    el.grid.style.gridAutoRows = cell;
    el.grid.innerHTML = "";
    inputs = [];
    for (let r = 0; r < puzzle.rows; r++) {
      inputs[r] = [];
      for (let c = 0; c < puzzle.cols; c++) {
        const sol = puzzle.cells[r][c];
        if (sol === null) {
          const block = document.createElement("div");
          block.className = "block";
          el.grid.appendChild(block);
          inputs[r][c] = null;
          continue;
        }
        const wrap = document.createElement("div");
        wrap.className = "xcell";
        wrap.dataset.r = r; wrap.dataset.c = c;
        const num = puzzle.numbers[r + "," + c];
        if (num) {
          const n = document.createElement("span");
          n.className = "cellnum"; n.textContent = num;
          wrap.appendChild(n);
        }
        const inp = document.createElement("input");
        inp.className = "xinput";
        inp.maxLength = 1;
        inp.value = user[r][c] || "";
        inp.dataset.r = r; inp.dataset.c = c; inp.dataset.sol = sol;
        inp.setAttribute("inputmode", "text");
        inp.setAttribute("autocomplete", "off");
        inp.setAttribute("autocapitalize", "characters");
        inp.setAttribute("aria-label", "row " + (r + 1) + " column " + (c + 1));
        inp.addEventListener("focus", () => onFocus(r, c));
        inp.addEventListener("mousedown", () => onClickCell(r, c));
        inp.addEventListener("touchstart", () => onClickCell(r, c), { passive: true });
        inp.addEventListener("input", () => onInput(r, c));
        inp.addEventListener("keydown", (e) => onKeyDown(e, r, c));
        wrap.appendChild(inp);
        el.grid.appendChild(wrap);
        inputs[r][c] = inp;
      }
    }
    // size the font relative to cell
    el.grid.style.fontSize = "min(4.5vw, 22px)";
  }

  function buildClues() {
    el.across.innerHTML = "";
    el.down.innerHTML = "";
    puzzle.entries.forEach((e) => {
      const li = document.createElement("li");
      li.className = "clue-li";
      li.dataset.num = e.num; li.dataset.dir = e.dir;
      li.innerHTML = '<span class="cnum">' + e.num + ".</span><span class=\"ctext\">" + e.clue + "</span>";
      li.addEventListener("click", () => selectEntry(e));
      (e.dir === "across" ? el.across : el.down).appendChild(li);
    });
  }

  /* ---------- selection / navigation ---------- */
  function entriesAt(r, c) { return cellEntries[r + "," + c] || {}; }

  function selectCell(r, c, toggle) {
    const e = entriesAt(r, c);
    let dir = curDir;
    if (toggle && curCell && curCell.r === r && curCell.c === c) dir = curDir === "across" ? "down" : "across";
    if (!e[dir]) dir = e.across ? "across" : "down";
    curDir = dir;
    curCell = { r, c };
    highlight();
  }
  function selectEntry(e) {
    curDir = e.dir;
    // jump to first empty cell of the entry, else first cell
    const cells = entryCells(e);
    let target = cells.find((cell) => !user[cell.r][cell.c]) || cells[0];
    curCell = { r: target.r, c: target.c };
    const inp = inputs[target.r][target.c];
    if (inp) inp.focus();
    highlight();
  }

  let suppressFocusSelect = false;
  function onClickCell(r, c) {
    // toggle direction if re-clicking the focused cell
    suppressFocusSelect = true;
    selectCell(r, c, true);
  }
  function onFocus(r, c) {
    if (suppressFocusSelect) { suppressFocusSelect = false; return; }
    selectCell(r, c, false);
  }

  function highlight() {
    // clear
    el.grid.querySelectorAll(".xcell").forEach((w) => w.classList.remove("active", "cursor"));
    el.across.querySelectorAll(".clue-li").forEach((li) => li.classList.remove("active"));
    el.down.querySelectorAll(".clue-li").forEach((li) => li.classList.remove("active"));
    if (!curCell) { updateClueBar(null); return; }
    const e = entriesAt(curCell.r, curCell.c)[curDir];
    if (e) {
      entryCells(e).forEach((cell) => {
        const w = inputs[cell.r][cell.c] && inputs[cell.r][cell.c].parentElement;
        if (w) w.classList.add("active");
      });
      const list = e.dir === "across" ? el.across : el.down;
      list.querySelectorAll(".clue-li").forEach((li) => {
        if (+li.dataset.num === e.num && li.dataset.dir === e.dir) li.classList.add("active");
      });
    }
    updateClueBar(e || null);
    const cw = inputs[curCell.r][curCell.c].parentElement;
    cw.classList.add("cursor");
  }

  /* the big always-visible clue above the grid (a lifesaver on phones,
     where the clue lists sit below the fold) */
  function updateClueBar(e) {
    if (!el.curClueText) return;
    if (!e) { el.curClueText.textContent = "Tap a square to start!"; return; }
    el.curClueText.innerHTML =
      '<b>' + e.num + " " + (e.dir === "across" ? "Across" : "Down") + ":</b> " + e.clue;
  }

  // step to the previous/next clue (wrapping), like the NYT arrows
  function stepEntry(delta) {
    if (!puzzle) return;
    const list = puzzle.entries;
    let idx = 0;
    if (curCell) {
      const cur = entriesAt(curCell.r, curCell.c)[curDir];
      if (cur) idx = list.indexOf(cur);
    }
    const nxt = list[(idx + delta + list.length) % list.length];
    if (nxt) selectEntry(nxt);
  }

  function nextCellInEntry(dir, forward) {
    if (!curCell) return null;
    const e = entriesAt(curCell.r, curCell.c)[dir];
    if (!e) return null;
    const cells = entryCells(e);
    const idx = cells.findIndex((cell) => cell.r === curCell.r && cell.c === curCell.c);
    const ni = idx + (forward ? 1 : -1);
    return cells[ni] || null;
  }

  function moveTo(cell) {
    if (!cell) return;
    curCell = { r: cell.r, c: cell.c };
    const inp = inputs[cell.r][cell.c];
    if (inp) { suppressFocusSelect = true; inp.focus(); }
    highlight();
  }

  function onInput(r, c) {
    const inp = inputs[r][c];
    let v = (inp.value || "").toUpperCase().replace(/[^A-Z]/g, "");
    v = v.slice(-1);
    inp.value = v;
    user[r][c] = v;
    persist();
    el.grid.querySelectorAll(".xcell.bad").forEach((w) => w.classList.remove("bad"));
    if (v) {
      const nxt = nextCellInEntry(curDir, true);
      if (nxt) moveTo(nxt);
    }
    checkSolved();
  }

  function onKeyDown(e, r, c) {
    const k = e.key;
    if (k === "Backspace") {
      e.preventDefault();
      if (user[r][c]) { user[r][c] = ""; inputs[r][c].value = ""; persist(); }
      else { const prev = nextCellInEntry(curDir, false); if (prev) { user[prev.r][prev.c] = ""; inputs[prev.r][prev.c].value = ""; moveTo(prev); persist(); } }
      return;
    }
    if (k === "ArrowRight" || k === "ArrowLeft" || k === "ArrowUp" || k === "ArrowDown") {
      e.preventDefault();
      const dir = (k === "ArrowRight" || k === "ArrowLeft") ? "across" : "down";
      const fwd = (k === "ArrowRight" || k === "ArrowDown");
      if (curDir !== dir) { curDir = dir; highlight(); }
      const nxt = nextCellInEntry(dir, fwd);
      if (nxt) moveTo(nxt);
      return;
    }
    if (k === " ") { e.preventDefault(); selectCell(r, c, true); }
  }

  /* ---------- check / reveal / clear ---------- */
  function persist() {
    const st = slot(pi);
    st.letters = user.map((row) => row.map((x) => (x === null ? null : x)));
    save();
  }

  function isComplete() {
    for (let r = 0; r < puzzle.rows; r++)
      for (let c = 0; c < puzzle.cols; c++)
        if (puzzle.cells[r][c] !== null && user[r][c] !== puzzle.cells[r][c]) return false;
    return true;
  }

  function markDoneClues(silent) {
    [el.across, el.down].forEach((list) => list.querySelectorAll(".clue-li").forEach((li) => {
      const e = puzzle.entries.find((x) => x.num === +li.dataset.num && x.dir === li.dataset.dir);
      const done = e && entryCells(e).every((cell) => user[cell.r][cell.c] === puzzle.cells[cell.r][cell.c]);
      li.classList.toggle("done", !!done);
      if (!e) return;
      const k = e.num + "-" + e.dir;
      if (done && !doneKeys[k]) {
        doneKeys[k] = true;
        if (!silent && !solvedNow) {
          // a little word-finished celebration: ding + pop the letters
          window.SFX && SFX.good();
          entryCells(e).forEach((cell) => {
            const w = inputs[cell.r][cell.c] && inputs[cell.r][cell.c].parentElement;
            if (w) { w.classList.remove("pop"); void w.offsetWidth; w.classList.add("pop"); }
          });
        }
      } else if (!done && doneKeys[k]) {
        delete doneKeys[k];
      }
    }));
  }

  function checkSolved() {
    markDoneClues();
    if (isComplete() && !solvedNow) winGame();
  }

  function doCheck() {
    let wrong = 0, filled = 0;
    for (let r = 0; r < puzzle.rows; r++)
      for (let c = 0; c < puzzle.cols; c++) {
        if (puzzle.cells[r][c] === null) continue;
        const w = inputs[r][c].parentElement;
        w.classList.remove("good", "bad");
        if (!user[r][c]) continue;
        filled++;
        if (user[r][c] === puzzle.cells[r][c]) w.classList.add("good");
        else { w.classList.add("bad"); wrong++; }
      }
    markDoneClues();
    if (isComplete()) { winGame(); return; }
    if (filled === 0) flash("Type some answers, then press Check! ✏️", "var(--purple)");
    else if (wrong === 0) { flash("Everything so far is right — keep going! 👍", "var(--green)"); window.SFX && SFX.good(); }
    else { flash(wrong === 1 ? "1 letter to fix (pink box) 🩷" : wrong + " letters to fix (pink boxes) 🩷", "var(--pink)"); window.SFX && SFX.nope(); }
  }

  /* one gentle hint: fill in just the letter under the cursor */
  function doHint() {
    if (!puzzle || solvedNow) return;
    let cell = curCell;
    // if the cursor's cell is already right, hint the next empty/wrong cell of the entry
    if (cell && user[cell.r][cell.c] === puzzle.cells[cell.r][cell.c]) {
      const e = entriesAt(cell.r, cell.c)[curDir];
      const miss = e && entryCells(e).find((x) => user[x.r][x.c] !== puzzle.cells[x.r][x.c]);
      cell = miss || cell;
    }
    if (!cell || user[cell.r][cell.c] === puzzle.cells[cell.r][cell.c]) {
      flash("That word looks great — pick another clue for a hint! 💡", "var(--purple)");
      return;
    }
    user[cell.r][cell.c] = puzzle.cells[cell.r][cell.c];
    const inp = inputs[cell.r][cell.c];
    inp.value = puzzle.cells[cell.r][cell.c];
    const w = inp.parentElement;
    w.classList.remove("bad", "pop"); void w.offsetWidth; w.classList.add("pop");
    persist();
    flash("💡 One magic letter for you!", "var(--blue)");
    moveTo(cell);
    const nxt = nextCellInEntry(curDir, true);
    if (nxt) moveTo(nxt);
    checkSolved();
  }

  /* Reveal needs a confirming second tap so one stray finger
     can't spoil the whole puzzle */
  function disarmReveal() {
    revealArmed = 0;
    if (el.reveal) el.reveal.textContent = "👀 Reveal";
  }
  function doReveal() {
    if (!revealArmed || Date.now() - revealArmed > 4000) {
      revealArmed = Date.now();
      el.reveal.textContent = "Really? Tap again!";
      flash("This shows ALL the answers — tap Reveal again if you're sure.", "var(--purple)");
      return;
    }
    disarmReveal();
    for (let r = 0; r < puzzle.rows; r++)
      for (let c = 0; c < puzzle.cols; c++) {
        if (puzzle.cells[r][c] === null) continue;
        user[r][c] = puzzle.cells[r][c];
        inputs[r][c].value = puzzle.cells[r][c];
        inputs[r][c].parentElement.classList.remove("bad");
      }
    persist();
    winGame();
  }

  function doClear() {
    disarmReveal();
    el.grid.querySelectorAll(".xcell").forEach((w) => w.classList.remove("good", "bad"));
    for (let r = 0; r < puzzle.rows; r++)
      for (let c = 0; c < puzzle.cols; c++) {
        if (puzzle.cells[r][c] === null) continue;
        user[r][c] = ""; inputs[r][c].value = "";
      }
    solvedNow = false;
    doneKeys = {};
    slot(pi).solved = false;
    persist();
    markDoneClues(true);
    el.feedback.textContent = "";
  }

  function flash(msg, color) { el.feedback.style.color = color; el.feedback.textContent = msg; }

  function sparkleBurst() {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const emojis = ["✨", "🎉", "🌟", "✏️"];
    const cx = window.innerWidth / 2, cy = window.innerHeight / 3;
    for (let i = 0; i < 12; i++) {
      const s = document.createElement("div");
      s.className = "sparkle"; s.textContent = emojis[i % emojis.length];
      s.style.left = (cx + (Math.random() - 0.5) * 260) + "px";
      s.style.top = (cy + (Math.random() - 0.5) * 120) + "px";
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 900);
    }
  }

  function winGame() {
    solvedNow = true;
    slot(pi).solved = true;
    persist();
    markDoneClues();
    el.grid.querySelectorAll(".xcell").forEach((w) => { w.classList.remove("bad"); w.classList.add("good"); });
    flash("🏆 You solved the " + puzzle.name + " crossword! Awesome!", "var(--green)");
    sparkleBurst();
    window.Confetti && Confetti.burst({ count: 100 });
    if (window.SFX) SFX.win();
    const j = nextUnsolved();
    el.next.textContent = j === -1 ? "✏️ All puzzles" : "Next puzzle ▶";
    el.next.classList.remove("hidden");
    renderPuzzles();
  }

  // the next crossword the kid hasn't solved yet, searching forward from here
  function nextUnsolved() {
    for (let k = 1; k <= PUZZLES.length; k++) {
      const j = (pi + k) % PUZZLES.length;
      if (!slot(j).solved) return j;
    }
    return -1;
  }

  /* ---------- buttons ---------- */
  el.check.addEventListener("click", doCheck);
  el.reveal.addEventListener("click", doReveal);
  if (el.hint) el.hint.addEventListener("click", doHint);
  if (el.cluePrev) el.cluePrev.addEventListener("click", () => stepEntry(-1));
  if (el.clueNext) el.clueNext.addEventListener("click", () => stepEntry(1));
  el.clear.addEventListener("click", doClear);
  el.quit.addEventListener("click", () => { renderPuzzles(); show("puzzles"); });
  el.next.addEventListener("click", () => {
    const j = nextUnsolved();
    if (j === -1) { renderPuzzles(); show("puzzles"); }
    else startPuzzle(j);
  });

  /* ---------- go ---------- */
  renderPuzzles();
  show("puzzles");
})();
