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

  const PUZZLES = [{"name":"Minecraft Mash","emoji":"🟩","blurb":"Blocks, mobs and tools!","level":"medium","rows":9,"cols":10,"cells":[[null,null,null,"S","W","O","R","D",null,null],[null,null,null,null,null,null,null,"I",null,null],[null,null,null,"P","I","C","K","A","X","E"],[null,"T",null,null,null,"R",null,"M",null,"N"],["Z","O","M","B","I","E",null,"O",null,"D"],[null,"R",null,null,null,"E",null,"N",null,"E"],[null,"C",null,null,null,"P",null,"D",null,"R"],[null,"H",null,null,null,"E",null,null,null,null],[null,null,null,null,null,"R",null,null,null,null]],"numbers":{"0,3":1,"0,7":2,"2,3":3,"2,5":4,"2,9":5,"3,1":6,"4,0":7},"entries":[{"num":1,"dir":"across","row":0,"col":3,"answer":"SWORD","clue":"You craft this to fight mobs.","teach":"Five letters, and the W is silent — you say it 'sord'."},{"num":2,"dir":"down","row":0,"col":7,"answer":"DIAMOND","clue":"The shiny blue gem you dig for deep down.","teach":"Real diamonds are the hardest natural thing on Earth — that's why the pickaxe is so good."},{"num":3,"dir":"across","row":2,"col":3,"answer":"PICKAXE","clue":"The tool you mine stone and ore with.","teach":"A compound word: PICK + AXE squashed together into one."},{"num":4,"dir":"down","row":2,"col":5,"answer":"CREEPER","clue":"Green mob that goes SSSS… then BOOM!","teach":"Creep + er. Lots of English words add '-er' to a verb to mean 'the one that does it': a creeper creeps."},{"num":5,"dir":"down","row":2,"col":9,"answer":"ENDER","clue":"An ___man teleports when you look at it.","teach":"'Teleport' means to vanish from one place and appear in another."},{"num":6,"dir":"down","row":3,"col":1,"answer":"TORCH","clue":"Place this to keep the dark (and mobs) away.","teach":"Ends with the CH sound, like 'lunch' and 'match'."},{"num":7,"dir":"across","row":4,"col":0,"answer":"ZOMBIE","clue":"Green undead mob that moans at night.","teach":"One of the few English words that starts with Z. It ends in -IE, like 'cookie'."}]},{"name":"Bluey Time","emoji":"🐶","blurb":"Play games with the Heeler family!","level":"easy","rows":11,"cols":7,"cells":[[null,"B",null,null,null,null,null],["D","A","N","C","E",null,null],[null,"N",null,"H",null,null,null],[null,"D",null,"I",null,null,null],[null,"I",null,"L",null,null,null],[null,"T",null,"L",null,null,null],[null,null,"B","I","N","G","O"],[null,null,"L",null,null,null,null],[null,"M","U","F","F","I","N"],[null,null,"E",null,null,null,null],[null,null,"Y",null,null,null,null]],"numbers":{"0,1":1,"1,0":2,"1,3":3,"6,2":4,"8,1":5},"entries":[{"num":1,"dir":"down","row":0,"col":1,"answer":"BANDIT","clue":"Bluey's dad who loves to play.","teach":"The Heelers are blue heeler dogs, a cattle dog from Australia."},{"num":2,"dir":"across","row":1,"col":0,"answer":"DANCE","clue":"Move to music — there's a Bluey ___ mode!","teach":"The C sounds like an S here, because a C before E, I or Y goes soft."},{"num":3,"dir":"down","row":1,"col":3,"answer":"CHILLI","clue":"Bluey's mum.","teach":"Spelled with double L and an I at the end — same as the spicy red pepper."},{"num":4,"dir":"across","row":6,"col":2,"answer":"BINGO","clue":"Bluey's little orange sister.","teach":"Five letters, two of them O and I — and it's also the name of a number game."},{"num":4,"dir":"down","row":6,"col":2,"answer":"BLUEY","clue":"The big blue puppy this show is named after.","teach":"Blue + Y. Adding Y to a colour makes a name, like 'Bluey' and 'Ginger'."},{"num":5,"dir":"across","row":8,"col":1,"answer":"MUFFIN","clue":"Bluey's silly little cousin.","teach":"Double F in the middle, like 'puffin' and 'toffee'."}]},{"name":"Animal Friends","emoji":"🦁","blurb":"Creatures big and small.","level":"easy","rows":10,"cols":7,"cells":[[null,"O","T","T","E","R",null],[null,null,"I",null,null,null,null],[null,null,"G",null,null,null,"Z"],[null,null,"E","A","G","L","E"],[null,null,"R",null,null,null,"B"],[null,null,null,null,"S",null,"R"],[null,null,"P","A","N","D","A"],[null,null,null,null,"A",null,null],[null,null,null,null,"K",null,null],["H","O","R","S","E",null,null]],"numbers":{"0,1":1,"0,2":2,"2,6":3,"3,2":4,"5,4":5,"6,2":6,"9,0":7},"entries":[{"num":1,"dir":"across","row":0,"col":1,"answer":"OTTER","clue":"A playful river animal that floats on its back.","teach":"Sea otters hold hands while they sleep so they don't drift apart."},{"num":2,"dir":"down","row":0,"col":2,"answer":"TIGER","clue":"A big orange cat with black stripes.","teach":"Every tiger's stripe pattern is different, like a fingerprint."},{"num":3,"dir":"down","row":2,"col":6,"answer":"ZEBRA","clue":"A horse-like animal in black and white.","teach":"Starts with Z — the very last letter of the alphabet."},{"num":4,"dir":"across","row":3,"col":2,"answer":"EAGLE","clue":"A huge bird with sharp eyes.","teach":"An eagle can spot a rabbit from over a mile away."},{"num":5,"dir":"down","row":5,"col":4,"answer":"SNAKE","clue":"A long animal with no legs.","teach":"The 'magic E' on the end makes the A say its own name: snayk."},{"num":6,"dir":"across","row":6,"col":2,"answer":"PANDA","clue":"A bear that munches bamboo.","teach":"A giant panda eats bamboo for about 12 hours a day."},{"num":7,"dir":"across","row":9,"col":0,"answer":"HORSE","clue":"An animal you can ride that says 'neigh'.","teach":"Horses can sleep standing up."}]},{"name":"Frozen Magic","emoji":"❄️","blurb":"Adventures in Arendelle.","level":"easy","rows":9,"cols":7,"cells":[[null,null,null,"S","N","O","W"],[null,null,null,"V",null,null,null],[null,"M",null,"E",null,null,null],[null,"A","N","N","A",null,null],[null,"G",null,null,null,null,null],["W","I","N","T","E","R",null],[null,"C",null,null,"L",null,null],[null,null,null,null,"S",null,null],[null,null,"O","L","A","F",null]],"numbers":{"0,3":1,"2,1":2,"3,1":3,"5,0":4,"5,4":5,"8,2":6},"entries":[{"num":1,"dir":"across","row":0,"col":3,"answer":"SNOW","clue":"White fluffy stuff Elsa can make.","teach":"Every snowflake has six sides."},{"num":1,"dir":"down","row":0,"col":3,"answer":"SVEN","clue":"Kristoff's reindeer buddy.","teach":"Reindeer are real, and they live in the freezing lands near the North Pole."},{"num":2,"dir":"down","row":2,"col":1,"answer":"MAGIC","clue":"Elsa's special icy power.","teach":"The G sounds like a J, because a G before E, I or Y usually goes soft."},{"num":3,"dir":"across","row":3,"col":1,"answer":"ANNA","clue":"Elsa's brave younger sister.","teach":"A palindrome — it reads the same forwards and backwards!"},{"num":4,"dir":"across","row":5,"col":0,"answer":"WINTER","clue":"The cold, snowy season.","teach":"The four seasons are spring, summer, autumn (fall) and winter."},{"num":5,"dir":"down","row":5,"col":4,"answer":"ELSA","clue":"The queen with icy magic powers.","teach":"Four letters. It's a short form of the name Elisabeth."},{"num":6,"dir":"across","row":8,"col":2,"answer":"OLAF","clue":"The happy snowman who loves warm hugs.","teach":"An old Norwegian name — Arendelle is based on Norway."}]},{"name":"Book Heroes","emoji":"📚","blurb":"Stars from favourite kids' books.","level":"tricky","rows":8,"cols":9,"cells":[[null,null,null,"C",null,null,null,null,null],[null,"H",null,"A",null,null,null,null,null],["R","O","W","L","E","Y",null,null,null],[null,"B",null,"V",null,null,null,null,null],[null,"B",null,"I",null,"G",null,null,null],[null,"E",null,"N","O","R","Y",null,null],[null,"S",null,null,null,"E",null,null,null],[null,null,null,"D","O","G","M","A","N"]],"numbers":{"0,3":1,"1,1":2,"2,0":3,"4,5":4,"5,3":5,"7,3":6},"entries":[{"num":1,"dir":"down","row":0,"col":3,"answer":"CALVIN","clue":"The boy with a stuffed tiger named Hobbes.","teach":"'Calvin and Hobbes' is a comic strip — a story told in little boxes called panels."},{"num":2,"dir":"down","row":1,"col":1,"answer":"HOBBES","clue":"Calvin's tiger, real to him!","teach":"Double B in the middle. Everyone else sees just a stuffed toy — that's the whole joke."},{"num":3,"dir":"across","row":2,"col":0,"answer":"ROWLEY","clue":"Greg's best friend in the Wimpy Kid books.","teach":"Six letters, ending in -EY, like 'monkey' and 'donkey'."},{"num":4,"dir":"down","row":4,"col":5,"answer":"GREG","clue":"The main kid in 'Diary of a Wimpy Kid'.","teach":"His full name is Greg Heffley, and he tells the story himself — that's a 'first-person' narrator."},{"num":5,"dir":"across","row":5,"col":3,"answer":"NORY","clue":"The wonky-magic hero of 'Upside Down Magic'.","teach":"Nory's magic goes 'wonky' — a word that means crooked or not quite right."},{"num":6,"dir":"across","row":7,"col":3,"answer":"DOGMAN","clue":"Part dog, part cop, all hero! (one word)","teach":"A compound word: DOG + MAN. The books are graphic novels — stories told in pictures."}]},{"name":"Taekwondo Class","emoji":"🥋","blurb":"Kicks, belts and respect!","level":"medium","rows":10,"cols":10,"cells":[["B","O","W",null,null,null,null,null,null,null],[null,null,"H",null,null,null,null,null,null,null],[null,"K","I","C","K",null,null,null,null,null],[null,null,"T",null,null,null,null,null,null,null],[null,"B","E","L","T",null,null,null,null,null],[null,"L",null,null,null,null,null,null,null,null],["F","O","R","M",null,"S",null,null,null,null],[null,"C",null,null,null,"P","U","N","C","H"],[null,"K","O","R","E","A",null,null,null,null],[null,null,null,null,null,"R",null,null,null,null]],"numbers":{"0,0":1,"0,2":2,"2,1":3,"4,1":4,"6,0":5,"6,5":6,"7,5":7,"8,1":8},"entries":[{"num":1,"dir":"across","row":0,"col":0,"answer":"BOW","clue":"You do this to show respect before you spar.","teach":"One word, two sounds: a BOW you make (rhymes with 'cow') and a BOW in your hair (rhymes with 'go')."},{"num":2,"dir":"down","row":0,"col":2,"answer":"WHITE","clue":"The belt colour you start with as a beginner.","teach":"White stands for a fresh start — you haven't learned anything yet, and that's fine."},{"num":3,"dir":"across","row":2,"col":1,"answer":"KICK","clue":"Striking with your foot — taekwondo's specialty!","teach":"'Tae' actually means foot, 'kwon' means fist and 'do' means way."},{"num":4,"dir":"across","row":4,"col":1,"answer":"BELT","clue":"The coloured band tied around your uniform.","teach":"The uniform itself is called a dobok."},{"num":4,"dir":"down","row":4,"col":1,"answer":"BLOCK","clue":"Move your arm to stop an attack.","teach":"BL is a blend — two letters you say quickly together, like in 'blue' and 'black'."},{"num":5,"dir":"across","row":6,"col":0,"answer":"FORM","clue":"A set pattern of moves you practice (a 'poomsae').","teach":"A form is like a dance of blocks and kicks that you memorise in order."},{"num":6,"dir":"down","row":6,"col":5,"answer":"SPAR","clue":"To practice-fight a partner.","teach":"Sparring is gentle and controlled — the point is to practise, not to hurt anyone."},{"num":7,"dir":"across","row":7,"col":5,"answer":"PUNCH","clue":"A straight strike with your fist.","teach":"Ends in -CH, and the N before it is why it sounds like 'punsh'."},{"num":8,"dir":"across","row":8,"col":1,"answer":"KOREA","clue":"The country where taekwondo began.","teach":"Korea is in East Asia. Taekwondo became an Olympic sport in the year 2000."}]},{"name":"Pokémon Party","emoji":"⚡","blurb":"Catch and battle your favourites!","level":"tricky","rows":11,"cols":10,"cells":[[null,"P","I","K","A","C","H","U",null,null],[null,null,null,null,null,"H",null,null,null,"T"],[null,"B","U","L","B","A","S","A","U","R"],[null,null,null,null,null,"R",null,null,null,"A"],[null,"S",null,null,null,"I",null,null,null,"I"],[null,"N",null,"E",null,"Z",null,null,null,"N"],["P","O","K","E","B","A","L","L",null,"E"],[null,"R",null,"V",null,"R",null,null,null,"R"],[null,"L",null,"E",null,"D",null,null,null,null],[null,"A",null,"E",null,null,null,null,null,null],[null,"X",null,null,null,null,null,null,null,null]],"numbers":{"0,1":1,"0,5":2,"1,9":3,"2,1":4,"4,1":5,"5,3":6,"6,0":7},"entries":[{"num":1,"dir":"across","row":0,"col":1,"answer":"PIKACHU","clue":"The yellow electric mouse Pokémon.","teach":"Seven letters. In Japanese, 'pika' is the sound of a sparkle and 'chu' is a mouse squeak."},{"num":2,"dir":"down","row":0,"col":5,"answer":"CHARIZARD","clue":"A big orange fire-and-flying dragon Pokémon.","teach":"A blend of 'char' (to burn) and 'lizard'."},{"num":3,"dir":"down","row":1,"col":9,"answer":"TRAINER","clue":"A person who catches and battles Pokémon.","teach":"Train + er. The '-er' ending means 'the person who does it', like teacher and painter."},{"num":4,"dir":"across","row":2,"col":1,"answer":"BULBASAUR","clue":"A grass Pokémon with a plant bulb on its back.","teach":"'Bulb' is the round root a plant grows from, and '-saur' means lizard."},{"num":5,"dir":"down","row":4,"col":1,"answer":"SNORLAX","clue":"A huge Pokémon that loves to sleep.","teach":"From 'snore' plus 'relax' — the name tells you exactly what it does."},{"num":6,"dir":"down","row":5,"col":3,"answer":"EEVEE","clue":"A fluffy Pokémon that can evolve many ways.","teach":"Double E three times! To 'evolve' means to change into something new."},{"num":7,"dir":"across","row":6,"col":0,"answer":"POKEBALL","clue":"The red-and-white ball you catch Pokémon in.","teach":"A compound word: POKE + BALL."}]},{"name":"Gabby's Dollhouse","emoji":"🐱","blurb":"Welcome to the kitty house!","level":"easy","rows":7,"cols":8,"cells":[[null,null,"C","A","T","N","I","P"],[null,null,"A",null,null,null,null,"A"],["M","E","R","C","A","T",null,"N"],[null,null,"L",null,null,null,null,"D"],[null,"K","I","T","T","Y",null,"Y"],[null,null,"T",null,null,null,null,null],[null,"G","A","B","B","Y",null,null]],"numbers":{"0,2":1,"0,7":2,"2,0":3,"4,1":4,"6,1":5},"entries":[{"num":1,"dir":"across","row":0,"col":2,"answer":"CATNIP","clue":"DJ ___, the music-loving green cat.","teach":"Catnip is a real herb — its smell makes many cats go bouncy."},{"num":1,"dir":"down","row":0,"col":2,"answer":"CARLITA","clue":"Gabby's toy car that's also a cat!","teach":"CAR + lita. In Spanish, adding '-ita' to a word means 'little'."},{"num":2,"dir":"down","row":0,"col":7,"answer":"PANDY","clue":"___ Paws, the cuddly panda-cat.","teach":"Pandy is a panda AND a cat — a mash-up of two animals."},{"num":3,"dir":"across","row":2,"col":0,"answer":"MERCAT","clue":"The half-mermaid, half-cat of the bathroom.","teach":"MER + CAT. 'Mer' comes from an old word for the sea."},{"num":4,"dir":"across","row":4,"col":1,"answer":"KITTY","clue":"A baby cat.","teach":"Double T then Y. A baby cat is really called a kitten."},{"num":5,"dir":"across","row":6,"col":1,"answer":"GABBY","clue":"The girl who shrinks down to visit the dollhouse.","teach":"Double B, then Y on the end — the Y sounds like a long E."}]},{"name":"Outer Space","emoji":"🚀","blurb":"Blast off to the stars!","level":"medium","rows":11,"cols":10,"cells":[["S",null,null,null,null,null,null,null,null,null],["A",null,null,null,null,null,null,null,null,null],["T",null,null,"P","L","A","N","E","T",null],["U",null,null,null,null,"S",null,null,null,null],["R","O","C","K","E","T",null,null,null,null],["N",null,"O",null,null,"R",null,null,null,null],[null,null,"M",null,null,"O","R","B","I","T"],[null,null,"E",null,null,"N",null,null,null,null],[null,null,"T",null,"G","A","L","A","X","Y"],[null,null,null,null,null,"U",null,null,null,null],[null,null,null,null,null,"T",null,null,null,null]],"numbers":{"0,0":1,"2,3":2,"2,5":3,"4,0":4,"4,2":5,"6,5":6,"8,4":7},"entries":[{"num":1,"dir":"down","row":0,"col":0,"answer":"SATURN","clue":"The planet famous for its rings.","teach":"Saturn's rings are made of billions of chunks of ice and rock."},{"num":2,"dir":"across","row":2,"col":3,"answer":"PLANET","clue":"Earth, Mars and Jupiter are each one.","teach":"There are eight planets going around our Sun."},{"num":3,"dir":"down","row":2,"col":5,"answer":"ASTRONAUT","clue":"A person who travels into space.","teach":"Nine letters! It comes from Greek words meaning 'star sailor'."},{"num":4,"dir":"across","row":4,"col":0,"answer":"ROCKET","clue":"A ship that blasts off into space.","teach":"A rocket pushes flames down so it goes up — every push has an equal push back."},{"num":5,"dir":"down","row":4,"col":2,"answer":"COMET","clue":"An icy space ball with a glowing tail.","teach":"The tail always points away from the Sun, because sunlight blows it back."},{"num":6,"dir":"across","row":6,"col":5,"answer":"ORBIT","clue":"The path a planet or moon travels around.","teach":"Earth takes one year to make one orbit of the Sun."},{"num":7,"dir":"across","row":8,"col":4,"answer":"GALAXY","clue":"A huge swirl of millions of stars.","teach":"Ours is called the Milky Way. The X here sounds like 'ks'."}]},{"name":"Soccer Stars","emoji":"⚽","blurb":"Kick, pass and score!","level":"easy","rows":7,"cols":9,"cells":[[null,null,"P","A","S","S",null,"B",null],[null,null,null,null,null,"T","E","A","M"],["K","I","C","K",null,"R",null,"L",null],[null,null,"O",null,"F","I","E","L","D"],[null,null,"A",null,null,"K",null,null,null],[null,"S","C","O","R","E",null,null,null],[null,null,"H",null,null,"R",null,null,null]],"numbers":{"0,2":1,"0,5":2,"0,7":3,"1,5":4,"2,0":5,"2,2":6,"3,4":7,"5,1":8},"entries":[{"num":1,"dir":"across","row":0,"col":2,"answer":"PASS","clue":"To kick the ball to a teammate.","teach":"Double S at the end, like 'grass' and 'class'."},{"num":2,"dir":"down","row":0,"col":5,"answer":"STRIKER","clue":"The player whose job is to score goals.","teach":"Strike + er. When a word ends in silent E you drop the E before adding -ER."},{"num":3,"dir":"down","row":0,"col":7,"answer":"BALL","clue":"The round thing you kick around the field.","teach":"Double L at the end, like 'tall', 'wall' and 'small'."},{"num":4,"dir":"across","row":1,"col":5,"answer":"TEAM","clue":"The group of players you play with.","teach":"EA together says a long E, like in 'dream' and 'beach'. A soccer team has 11 players."},{"num":5,"dir":"across","row":2,"col":0,"answer":"KICK","clue":"How you move the ball with your foot.","teach":"The CK ending comes after a short vowel, like 'sock', 'duck' and 'back'."},{"num":6,"dir":"down","row":2,"col":2,"answer":"COACH","clue":"The grown-up who teaches the team.","teach":"OA says long O, and CH finishes it — like 'roach' and 'poach'."},{"num":7,"dir":"across","row":3,"col":4,"answer":"FIELD","clue":"The grassy place where you play.","teach":"I before E here — 'field', 'shield' and 'yield' all follow the same pattern."},{"num":8,"dir":"across","row":5,"col":1,"answer":"SCORE","clue":"The number of goals each team has.","teach":"The magic E makes the O say its name."}]},{"name":"Dinosaur Dig","emoji":"🦕","blurb":"Stomp back to the age of dinos!","level":"medium","rows":13,"cols":6,"cells":[["R","E","X",null,null,null],["O",null,null,null,null,null],["A",null,null,"S",null,null],["R","A","P","T","O","R"],[null,null,null,"E",null,null],[null,null,"E","G","G",null],[null,"B",null,"O",null,null],["F","O","S","S","I","L"],[null,"N",null,"A",null,null],[null,"E",null,"U",null,null],[null,"S",null,"R",null,null],[null,null,null,"U",null,null],[null,null,null,"S",null,null]],"numbers":{"0,0":1,"2,3":2,"3,0":3,"5,2":4,"6,1":5,"7,0":6},"entries":[{"num":1,"dir":"across","row":0,"col":0,"answer":"REX","clue":"Tyrannosaurus ___, the giant meat-eater.","teach":"'Rex' is Latin for 'king' — so T. rex means 'king tyrant lizard'."},{"num":1,"dir":"down","row":0,"col":0,"answer":"ROAR","clue":"The big loud sound a dinosaur makes.","teach":"Nobody actually knows what dinosaurs sounded like — scientists are still guessing."},{"num":2,"dir":"down","row":2,"col":3,"answer":"STEGOSAURUS","clue":"A dino with plates on its back and a spiky tail.","teach":"Eleven letters! It means 'roofed lizard', because of the plates."},{"num":3,"dir":"across","row":3,"col":0,"answer":"RAPTOR","clue":"A fast, clever hunting dinosaur.","teach":"'Raptor' means 'one who seizes' — it's also used for birds of prey like hawks."},{"num":4,"dir":"across","row":5,"col":2,"answer":"EGG","clue":"A baby dinosaur hatches out of this.","teach":"Double G at the end. Real fossil dinosaur eggs have been found."},{"num":5,"dir":"down","row":6,"col":1,"answer":"BONES","clue":"What scientists dig up to learn about dinos.","teach":"A scientist who digs up fossils is called a palaeontologist."},{"num":6,"dir":"across","row":7,"col":0,"answer":"FOSSIL","clue":"Old bones that turned to stone.","teach":"Double S in the middle. Fossils take thousands of years to form."}]},{"name":"Yummy Food","emoji":"🍕","blurb":"Snacks and treats we love!","level":"easy","rows":11,"cols":7,"cells":[[null,"B","R","E","A","D",null],[null,null,null,null,"P",null,null],[null,null,null,null,"P",null,null],[null,null,null,null,"L",null,null],["J","U","I","C","E",null,null],[null,null,null,"O",null,null,"B"],["T","A","C","O",null,null,"A"],[null,null,null,"K",null,null,"N"],[null,null,"P","I","Z","Z","A"],[null,null,null,"E",null,null,"N"],[null,null,null,null,null,null,"A"]],"numbers":{"0,1":1,"0,4":2,"4,0":3,"4,3":4,"5,6":5,"6,0":6,"8,2":7},"entries":[{"num":1,"dir":"across","row":0,"col":1,"answer":"BREAD","clue":"You toast it or make a sandwich with it.","teach":"Here EA makes a short E sound — like 'head' and 'ready', not like 'bead'."},{"num":2,"dir":"down","row":0,"col":4,"answer":"APPLE","clue":"A crunchy red or green fruit.","teach":"Double P. Apples float, because a fifth of an apple is air."},{"num":3,"dir":"across","row":4,"col":0,"answer":"JUICE","clue":"A sweet drink squeezed from fruit.","teach":"The tricky bit is UI in the middle, and the C sounds like an S."},{"num":4,"dir":"down","row":4,"col":3,"answer":"COOKIE","clue":"A sweet treat that's great with milk.","teach":"Double O then -IE, like 'rookie' and 'bookie'."},{"num":5,"dir":"down","row":5,"col":6,"answer":"BANANA","clue":"A long yellow fruit monkeys love.","teach":"Three A's! Bananas grow on giant plants, not trees."},{"num":6,"dir":"across","row":6,"col":0,"answer":"TACO","clue":"A folded shell stuffed with yummy fillings.","teach":"A Spanish word from Mexico. Four letters, no double anything."},{"num":7,"dir":"across","row":8,"col":2,"answer":"PIZZA","clue":"A round, cheesy slice with toppings.","teach":"Double Z in the middle — an Italian word, and Italy is where pizza comes from."}]},{"name":"Princess Party","emoji":"👑","blurb":"Crowns, castles and royal magic!","level":"easy","rows":9,"cols":11,"cells":[[null,null,null,"P",null,null,null,null,null,null,null],[null,null,"C","R","O","W","N",null,null,null,null],[null,null,null,"I",null,null,null,null,null,null,null],["W",null,null,"N",null,null,null,null,null,null,null],["A",null,null,"C","A","S","T","L","E",null,"B"],["N",null,null,"E",null,null,"I",null,null,null,"A"],["D","R","E","S","S",null,"A",null,null,null,"L"],[null,null,null,"S",null,null,"R","O","Y","A","L"],[null,null,null,null,null,null,"A",null,null,null,null]],"numbers":{"0,3":1,"1,2":2,"3,0":3,"4,3":4,"4,6":5,"4,10":6,"6,0":7,"7,6":8},"entries":[{"num":1,"dir":"down","row":0,"col":3,"answer":"PRINCESS","clue":"A royal daughter of a king and queen.","teach":"Double S at the end. The '-ESS' ending used to mean 'a lady who…', like in 'lioness'."},{"num":2,"dir":"across","row":1,"col":2,"answer":"CROWN","clue":"The sparkly gold circle a queen wears on her head.","teach":"OW says 'ow!' here, like in 'down' and 'town'."},{"num":3,"dir":"down","row":3,"col":0,"answer":"WAND","clue":"A fairy godmother waves this to make magic.","teach":"The A sounds like the O in 'want' — W often bends the A that follows it."},{"num":4,"dir":"across","row":4,"col":3,"answer":"CASTLE","clue":"The giant stone home where royals live.","teach":"The T is silent! Same in 'listen', 'whistle' and 'thistle'."},{"num":5,"dir":"down","row":4,"col":6,"answer":"TIARA","clue":"A small jewelled half-crown for fancy parties.","teach":"Say it 'tee-AR-uh'. It's a Greek word for a fancy headband."},{"num":6,"dir":"down","row":4,"col":10,"answer":"BALL","clue":"A big fancy royal dance party.","teach":"Same spelling as a bouncy ball — one word, two very different meanings."},{"num":7,"dir":"across","row":6,"col":0,"answer":"DRESS","clue":"A twirly thing to wear to the ball.","teach":"Double S at the end, like 'press' and 'mess'."},{"num":8,"dir":"across","row":7,"col":6,"answer":"ROYAL","clue":"A word that means 'belonging to a king or queen'.","teach":"Roy-al. The '-AL' ending turns a thing into a describing word."}]},{"name":"Number Land","emoji":"🔢","blurb":"Spell the math words!","level":"medium","rows":12,"cols":10,"cells":[[null,null,null,null,"P",null,null,null,null,null],[null,null,"H",null,"L",null,null,null,null,null],[null,null,"U",null,"U",null,null,null,null,null],["M","I","N","U","S",null,null,null,null,null],[null,null,"D",null,null,null,null,null,null,null],[null,null,"R",null,null,"S",null,null,null,null],["T","W","E","L","V","E",null,"D",null,null],[null,null,"D",null,null,"V",null,"O",null,null],[null,null,null,null,null,"E","Q","U","A","L"],[null,null,null,null,null,"N",null,"B",null,null],[null,null,null,null,null,null,null,"L",null,null],[null,null,null,null,null,null,"Z","E","R","O"]],"numbers":{"0,4":1,"1,2":2,"3,0":3,"5,5":4,"6,0":5,"6,7":6,"8,5":7,"11,6":8},"entries":[{"num":1,"dir":"down","row":0,"col":4,"answer":"PLUS","clue":"The + sign means to add, or '___'.","teach":"3 plus 4 equals 7. Adding in any order gives the same answer: 4 plus 3 is 7 too."},{"num":2,"dir":"down","row":1,"col":2,"answer":"HUNDRED","clue":"Ten groups of ten make one ___.","teach":"100 has two zeros. Ten hundreds make a thousand."},{"num":3,"dir":"across","row":3,"col":0,"answer":"MINUS","clue":"The − sign means to take away, or '___'.","teach":"Unlike adding, order matters: 7 minus 3 is 4, but 3 minus 7 is below zero."},{"num":4,"dir":"down","row":5,"col":5,"answer":"SEVEN","clue":"How many days are in one week.","teach":"Seven is a prime number — only 1 and 7 divide into it evenly."},{"num":5,"dir":"across","row":6,"col":0,"answer":"TWELVE","clue":"The number after eleven — a dozen!","teach":"Twelve divides evenly by 1, 2, 3, 4, 6 and 12 — that's why eggs come in dozens."},{"num":6,"dir":"down","row":6,"col":7,"answer":"DOUBLE","clue":"To make twice as many — 4 becomes 8!","teach":"Doubling is the same as multiplying by 2."},{"num":7,"dir":"across","row":8,"col":5,"answer":"EQUAL","clue":"What the = sign means: the same amount.","teach":"QU always travel together in English — 'queen', 'quick', 'equal'."},{"num":8,"dir":"across","row":11,"col":6,"answer":"ZERO","clue":"The number that means 'nothing at all'.","teach":"Add zero to any number and it stays the same. Multiply by zero and it all disappears."}]},{"name":"Under the Sea","emoji":"🌊","blurb":"Dive down with the sea creatures!","level":"medium","rows":7,"cols":12,"cells":[["S","E","A","W","E","E","D",null,null,null,null,null],["H",null,null,null,null,null,"O",null,"W","A","V","E"],["A",null,"C","O","R","A","L",null,"H",null,null,null],["R",null,"R",null,null,null,"P",null,"A",null,null,null],["K",null,"A",null,null,"S","H","E","L","L",null,null],[null,null,"B",null,null,null,"I",null,"E",null,null,null],[null,null,null,null,null,null,"N",null,null,null,null,null]],"numbers":{"0,0":1,"0,6":2,"1,8":3,"2,2":4,"4,5":5},"entries":[{"num":1,"dir":"across","row":0,"col":0,"answer":"SEAWEED","clue":"The green, slippery plant that grows in the ocean.","teach":"A compound word: SEA + WEED. Both halves use EA and EE for long E sounds."},{"num":1,"dir":"down","row":0,"col":0,"answer":"SHARK","clue":"A big fish with lots and lots of teeth.","teach":"Sharks grow new teeth their whole lives — some lose 30,000 in a lifetime."},{"num":2,"dir":"down","row":0,"col":6,"answer":"DOLPHIN","clue":"A smart, friendly sea animal that leaps and clicks.","teach":"PH says F — like 'phone' and 'elephant'. Dolphins are mammals, not fish."},{"num":3,"dir":"across","row":1,"col":8,"answer":"WAVE","clue":"It rolls across the ocean and crashes on the sand.","teach":"Waves are mostly made by wind pushing on the water's surface."},{"num":3,"dir":"down","row":1,"col":8,"answer":"WHALE","clue":"The biggest animal in the whole ocean.","teach":"WH at the start, like 'when' and 'wheel'. A blue whale's heart is the size of a car."},{"num":4,"dir":"across","row":2,"col":2,"answer":"CORAL","clue":"A colourful underwater reef is made of this.","teach":"Coral is alive! It's made of thousands of tiny animals called polyps."},{"num":4,"dir":"down","row":2,"col":2,"answer":"CRAB","clue":"A sideways-walking animal with two pinchy claws.","teach":"CR is a blend, like 'crash' and 'crack'. Crabs wear their skeleton on the outside."},{"num":5,"dir":"across","row":4,"col":5,"answer":"SHELL","clue":"You find these on the beach — some hide hermit crabs.","teach":"Double L at the end, like 'bell' and 'smell'."}]},{"name":"Weather Watch","emoji":"🌦️","blurb":"Sun, storms and rainbows!","level":"medium","rows":8,"cols":11,"cells":[[null,null,null,"S","T","O","R","M",null,null,null],[null,null,null,null,"H",null,"A",null,null,null,null],[null,null,"F",null,"U",null,"I",null,null,null,null],[null,null,"R",null,"N",null,"N",null,"S",null,null],["C","L","O","U","D",null,"B",null,"U",null,null],[null,null,"S",null,"E",null,"O",null,"N",null,null],[null,null,"T",null,"R",null,"W","I","N","D","Y"],[null,null,null,null,null,null,null,null,"Y",null,null]],"numbers":{"0,3":1,"0,4":2,"0,6":3,"2,2":4,"3,8":5,"4,0":6,"6,6":7},"entries":[{"num":1,"dir":"across","row":0,"col":3,"answer":"STORM","clue":"Wild weather with wind, rain and thunder.","teach":"ST is a blend. Storms happen when warm wet air rushes upward fast."},{"num":2,"dir":"down","row":0,"col":4,"answer":"THUNDER","clue":"The big rumbling BOOM after lightning.","teach":"Light travels faster than sound — that's why you see the flash before you hear the boom."},{"num":3,"dir":"down","row":0,"col":6,"answer":"RAINBOW","clue":"The coloured arc in the sky after rain and sun.","teach":"RAIN + BOW. Raindrops split sunlight into seven colours."},{"num":4,"dir":"down","row":2,"col":2,"answer":"FROST","clue":"The sparkly ice that covers grass on cold mornings.","teach":"Frost forms when water vapour freezes straight onto a cold surface."},{"num":5,"dir":"down","row":3,"col":8,"answer":"SUNNY","clue":"A bright day with no clouds is this.","teach":"Sun + N + Y. Short words double the last letter before adding Y: sunny, funny, muddy."},{"num":6,"dir":"across","row":4,"col":0,"answer":"CLOUD","clue":"A white fluffy thing floating in the sky.","teach":"OU makes the 'ow' sound here, like 'loud' and 'proud'. Clouds are tiny water droplets."},{"num":7,"dir":"across","row":6,"col":6,"answer":"WINDY","clue":"The kind of day that's perfect for flying a kite.","teach":"Wind + Y. Wind is just air moving from a crowded place to an emptier one."}]},{"name":"Music Makers","emoji":"🎹","blurb":"Notes, beats and instruments!","level":"tricky","rows":6,"cols":13,"cells":[["S","O","N","G",null,null,null,null,null,null,null,null,"B"],["H",null,null,"U",null,null,"N",null,null,null,null,null,"E"],["A",null,"P","I","A","N","O",null,null,null,null,null,"A"],["R",null,null,"T",null,null,"T","R","U","M","P","E","T"],["P",null,null,"A",null,null,"E",null,null,null,null,null,null],[null,null,"D","R","U","M",null,null,null,null,null,null,null]],"numbers":{"0,0":1,"0,3":2,"0,12":3,"1,6":4,"2,2":5,"3,6":6,"5,2":7},"entries":[{"num":1,"dir":"across","row":0,"col":0,"answer":"SONG","clue":"Words and a tune you can sing.","teach":"The NG ending makes one sound, like 'ring' and 'long'."},{"num":1,"dir":"down","row":0,"col":0,"answer":"SHARP","clue":"The ♯ sign makes a note one step higher — a '___'.","teach":"Its opposite is a flat (♭), which lowers a note one step."},{"num":2,"dir":"down","row":0,"col":3,"answer":"GUITAR","clue":"You strum its six strings.","teach":"The U is silent — it's only there to keep the G hard instead of soft."},{"num":3,"dir":"down","row":0,"col":12,"answer":"BEAT","clue":"The steady pulse you clap along to.","teach":"EA says long E here. Most pop songs group beats in fours: 1-2-3-4."},{"num":4,"dir":"down","row":1,"col":6,"answer":"NOTE","clue":"One single sound in a song — A, B or C!","teach":"Music only uses seven letter names, A to G, then it starts over."},{"num":5,"dir":"across","row":2,"col":2,"answer":"PIANO","clue":"Black and white keys you press to make notes.","teach":"A piano has 88 keys. Its full name, 'pianoforte', means 'soft-loud' in Italian."},{"num":6,"dir":"across","row":3,"col":6,"answer":"TRUMPET","clue":"A shiny brass horn you blow.","teach":"You change the note with three valves and by buzzing your lips harder or softer."},{"num":7,"dir":"across","row":5,"col":2,"answer":"DRUM","clue":"You hit this one with sticks to keep the beat.","teach":"Drums are percussion instruments — you play them by hitting or shaking them."}]},{"name":"Around the World","emoji":"🌍","blurb":"Continents, oceans and maps!","level":"tricky","rows":7,"cols":11,"cells":[[null,null,null,null,"I",null,null,null,"M","A","P"],[null,null,"R",null,"S",null,"E",null,null,"S",null],[null,null,"I",null,"L",null,"U",null,null,"I",null],[null,null,"V",null,"A","F","R","I","C","A",null],["O","C","E","A","N",null,"O",null,null,null,null],[null,null,"R",null,"D",null,"P",null,null,null,null],[null,null,null,null,null,"D","E","S","E","R","T"]],"numbers":{"0,4":1,"0,8":2,"0,9":3,"1,2":4,"1,6":5,"3,4":6,"4,0":7,"6,5":8},"entries":[{"num":1,"dir":"down","row":0,"col":4,"answer":"ISLAND","clue":"Land with water all the way around it.","teach":"The S is silent — say it 'eye-land'."},{"num":2,"dir":"across","row":0,"col":8,"answer":"MAP","clue":"A picture of a place from above.","teach":"A map's key (or legend) explains what each symbol and colour means."},{"num":3,"dir":"down","row":0,"col":9,"answer":"ASIA","clue":"The biggest continent of them all.","teach":"More than half of all the people on Earth live in Asia."},{"num":4,"dir":"down","row":1,"col":2,"answer":"RIVER","clue":"Water that flows all the way to the sea.","teach":"The Nile and the Amazon are the two longest rivers on Earth."},{"num":5,"dir":"down","row":1,"col":6,"answer":"EUROPE","clue":"The continent with castles and the Alps.","teach":"Europe is the second-smallest continent but has around 44 countries."},{"num":6,"dir":"across","row":3,"col":4,"answer":"AFRICA","clue":"The continent with the Sahara Desert and lions.","teach":"Africa has 54 countries — more than any other continent."},{"num":7,"dir":"across","row":4,"col":0,"answer":"OCEAN","clue":"A huge body of salty water — there are five.","teach":"The CE sounds like 'sh'. The five are Pacific, Atlantic, Indian, Southern and Arctic."},{"num":8,"dir":"across","row":6,"col":5,"answer":"DESERT","clue":"A very dry place with hardly any rain.","teach":"One S = a dry place. Two S's (dessert) = pudding. Remember: dessert is so good you want two."}]},{"name":"Rock Hunter","emoji":"🪨","blurb":"Geology words for rock detectives!","level":"tricky","rows":11,"cols":11,"cells":[[null,null,null,null,null,"C",null,null,null,null,null],[null,null,null,null,null,"R",null,"M",null,null,null],[null,null,null,null,null,"Y",null,"I",null,null,null],[null,null,null,null,null,"S","A","N","D",null,null],[null,"G",null,null,null,"T",null,"E",null,null,null],[null,"E",null,null,null,"A",null,"R",null,null,"Q"],["F","O","S","S","I","L",null,"A",null,null,"U"],[null,"D",null,null,null,null,null,"L","A","V","A"],[null,"E",null,null,null,null,null,null,null,null,"R"],[null,null,null,null,null,null,null,null,null,null,"T"],[null,null,null,null,null,null,null,null,null,null,"Z"]],"numbers":{"0,5":1,"1,7":2,"3,5":3,"4,1":4,"5,10":5,"6,0":6,"7,7":7},"entries":[{"num":1,"dir":"down","row":0,"col":5,"answer":"CRYSTAL","clue":"A mineral that grew in a shape with flat, shiny sides.","teach":"The Y does the vowel's job here, like in 'gym' and 'myth'."},{"num":2,"dir":"down","row":1,"col":7,"answer":"MINERAL","clue":"The natural stuff rocks are made of.","teach":"A rock is a mixture; a mineral is one pure ingredient of it."},{"num":3,"dir":"across","row":3,"col":5,"answer":"SAND","clue":"Zillions of tiny bits of worn-down rock.","teach":"Wind and water grinding rock down for ages is called erosion."},{"num":4,"dir":"down","row":4,"col":1,"answer":"GEODE","clue":"A plain-looking rock that's full of crystals inside.","teach":"Say it 'JEE-ode'. It comes from a Greek word meaning 'earth-like'."},{"num":5,"dir":"down","row":5,"col":10,"answer":"QUARTZ","clue":"A very common mineral, often clear or milky white.","teach":"Q is always followed by U, and this one ends in TZ — a rare English ending."},{"num":6,"dir":"across","row":6,"col":0,"answer":"FOSSIL","clue":"The shape of an old plant or animal left in stone.","teach":"Fossils are usually found in sedimentary rock, which forms in layers."},{"num":7,"dir":"across","row":7,"col":7,"answer":"LAVA","clue":"Melted rock that pours out of a volcano.","teach":"Underground it's called magma; once it pours out it's called lava."}]},{"name":"My Amazing Body","emoji":"🫀","blurb":"The parts that keep you going!","level":"medium","rows":7,"cols":12,"cells":[[null,null,"L",null,"M",null,null,null,null,null,null,null],[null,null,"U",null,"U",null,null,null,null,null,null,null],["B","O","N","E","S",null,null,"T",null,null,null,null],["R",null,"G",null,"C",null,null,"E","L","B","O","W"],["A",null,"S",null,"L",null,null,"E",null,null,null,null],["I",null,null,"H","E","A","R","T",null,null,null,null],["N",null,null,null,null,null,null,"H",null,null,null,null]],"numbers":{"0,2":1,"0,4":2,"2,0":3,"2,7":4,"3,7":5,"5,3":6},"entries":[{"num":1,"dir":"down","row":0,"col":2,"answer":"LUNGS","clue":"The two air bags you breathe with.","teach":"They pull oxygen out of the air and push carbon dioxide back out."},{"num":2,"dir":"down","row":0,"col":4,"answer":"MUSCLE","clue":"You flex this to lift and move.","teach":"The C is silent — say it 'muss-ul'. You have over 600 muscles."},{"num":3,"dir":"across","row":2,"col":0,"answer":"BONES","clue":"The hard parts that hold you up — you have 206!","teach":"Babies are born with about 300 bones; some fuse together as you grow."},{"num":3,"dir":"down","row":2,"col":0,"answer":"BRAIN","clue":"The thinking part inside your head.","teach":"AI says long A, like 'rain' and 'train'. Your brain uses a fifth of all your energy."},{"num":4,"dir":"down","row":2,"col":7,"answer":"TEETH","clue":"You chew with these and brush them twice a day.","teach":"An odd plural: one tooth, two teeth — the vowel changes instead of adding S."},{"num":5,"dir":"across","row":3,"col":7,"answer":"ELBOW","clue":"The bendy joint in the middle of your arm.","teach":"A hinge joint — it bends one way only, like a door."},{"num":6,"dir":"across","row":5,"col":3,"answer":"HEART","clue":"The muscle that pumps your blood all day and night.","teach":"It beats about 100,000 times a day and never gets a day off."}]},{"name":"Bug Hunt","emoji":"🐛","blurb":"Creepy crawlies in the garden!","level":"easy","rows":11,"cols":6,"cells":[[null,null,null,null,null,"M"],[null,null,null,"L",null,"O"],[null,null,null,"A","N","T"],[null,null,null,"D",null,"H"],[null,null,null,"Y",null,null],[null,"S",null,"B",null,null],[null,"P",null,"U",null,null],["W","I","N","G","S",null],[null,"D",null,null,null,"W"],["B","E","E","T","L","E"],[null,"R",null,null,null,"B"]],"numbers":{"0,5":1,"1,3":2,"2,3":3,"5,1":4,"7,0":5,"8,5":6,"9,0":7},"entries":[{"num":1,"dir":"down","row":0,"col":5,"answer":"MOTH","clue":"A night-time flutterer drawn to a light.","teach":"TH at the end, like 'both' and 'cloth'. Moths fly at night; butterflies fly by day."},{"num":2,"dir":"down","row":1,"col":3,"answer":"LADYBUG","clue":"A little red beetle with black spots.","teach":"LADY + BUG. Gardeners love them because they eat the aphids that chew plants."},{"num":3,"dir":"across","row":2,"col":3,"answer":"ANT","clue":"A tiny bug that marches in a line to your picnic.","teach":"Ants follow a smell trail left by the ant in front."},{"num":4,"dir":"down","row":5,"col":1,"answer":"SPIDER","clue":"Eight legs and a sticky web.","teach":"Spiders aren't insects — insects have six legs, spiders have eight."},{"num":5,"dir":"across","row":7,"col":0,"answer":"WINGS","clue":"Bees and butterflies fly with these.","teach":"A bee's wings beat about 200 times every second."},{"num":6,"dir":"down","row":8,"col":5,"answer":"WEB","clue":"The sticky trap a spider spins.","teach":"Only some of the threads are sticky — the spider walks on the dry ones."},{"num":7,"dir":"across","row":9,"col":0,"answer":"BEETLE","clue":"A bug with a hard shiny shell on its back.","teach":"Double E then -TLE, like 'kettle' and 'little'. Beetles are the biggest animal group on Earth."}]},{"name":"Colour Crayons","emoji":"🎨","blurb":"Name every colour in the box!","level":"easy","rows":11,"cols":7,"cells":[[null,null,null,null,null,null,"P"],[null,null,null,"G",null,null,"I"],[null,null,"B","R","O","W","N"],[null,"P",null,"E",null,null,"K"],[null,"U",null,"E",null,null,null],["O","R","A","N","G","E",null],[null,"P",null,null,null,null,null],[null,"L",null,"B",null,null,null],["Y","E","L","L","O","W",null],[null,null,null,"U",null,null,null],[null,null,"R","E","D",null,null]],"numbers":{"0,6":1,"1,3":2,"2,2":3,"3,1":4,"5,0":5,"7,3":6,"8,0":7,"10,2":8},"entries":[{"num":1,"dir":"down","row":0,"col":6,"answer":"PINK","clue":"Red mixed with white makes this soft colour.","teach":"The NK ending, like 'think' and 'sink'."},{"num":2,"dir":"down","row":1,"col":3,"answer":"GREEN","clue":"The colour of grass and leaves.","teach":"Double E. Mix blue and yellow to make it."},{"num":3,"dir":"across","row":2,"col":2,"answer":"BROWN","clue":"The colour of mud, bears and chocolate.","teach":"OWN here says 'ow-n', like 'clown' and 'frown'."},{"num":4,"dir":"down","row":3,"col":1,"answer":"PURPLE","clue":"Mix red and blue and you get this royal colour.","teach":"Six letters, and BOTH vowels are the same: P-U-R-P-L-E."},{"num":5,"dir":"across","row":5,"col":0,"answer":"ORANGE","clue":"A colour that is also a fruit.","teach":"Mix red and yellow to make it. Almost nothing rhymes with 'orange'!"},{"num":6,"dir":"down","row":7,"col":3,"answer":"BLUE","clue":"The colour of the sky on a sunny day.","teach":"BL is a blend, and the UE on the end says 'oo' — like 'glue' and 'true'."},{"num":7,"dir":"across","row":8,"col":0,"answer":"YELLOW","clue":"The colour of the sun and a banana.","teach":"Double L in the middle, like 'pillow' and 'fellow'."},{"num":8,"dir":"across","row":10,"col":2,"answer":"RED","clue":"The colour of a stop sign and a strawberry.","teach":"Red, yellow and blue are the primary colours — you can't mix any other colours to make them."}]},{"name":"Farm Friends","emoji":"🐄","blurb":"Who lives down on the farm?","level":"easy","rows":13,"cols":10,"cells":[[null,null,null,null,null,null,null,"T",null,null],[null,null,null,null,null,null,null,"R",null,null],[null,null,null,null,null,null,null,"A",null,null],[null,null,null,null,null,"H",null,"C","O","W"],[null,null,null,null,"G","O","A","T",null,null],[null,null,null,null,null,"R",null,"O",null,null],[null,null,null,"C",null,"S",null,"R",null,null],[null,null,"S","H","E","E","P",null,null,null],[null,null,null,"I",null,null,null,null,null,null],[null,"D","U","C","K",null,null,null,null,null],[null,null,null,"K",null,null,null,null,null,null],[null,null,null,"E",null,null,null,null,null,null],["B","A","R","N",null,null,null,null,null,null]],"numbers":{"0,7":1,"3,5":2,"3,7":3,"4,4":4,"6,3":5,"7,2":6,"9,1":7,"12,0":8},"entries":[{"num":1,"dir":"down","row":0,"col":7,"answer":"TRACTOR","clue":"The big machine that pulls the plough.","teach":"It comes from 'traction', which means gripping and pulling."},{"num":2,"dir":"down","row":3,"col":5,"answer":"HORSE","clue":"You can ride this one around the paddock.","teach":"A baby horse is a foal, and horses are measured in 'hands'."},{"num":3,"dir":"across","row":3,"col":7,"answer":"COW","clue":"It says 'moo' and gives us milk.","teach":"A cow has one stomach with four rooms so it can chew grass twice."},{"num":4,"dir":"across","row":4,"col":4,"answer":"GOAT","clue":"A bouncy animal with horns that eats almost anything.","teach":"OA says long O, like 'boat' and 'coat'."},{"num":5,"dir":"down","row":6,"col":3,"answer":"CHICKEN","clue":"The farm bird that lays your breakfast eggs.","teach":"CH at the start, CK in the middle. A girl chicken is a hen."},{"num":6,"dir":"across","row":7,"col":2,"answer":"SHEEP","clue":"Woolly animal that says 'baa'.","teach":"One sheep, two sheep — the plural doesn't change at all."},{"num":7,"dir":"across","row":9,"col":1,"answer":"DUCK","clue":"It waddles, swims and says 'quack'.","teach":"CK after a short vowel, like 'luck' and 'rock'. Duck feathers are waterproof."},{"num":8,"dir":"across","row":12,"col":0,"answer":"BARN","clue":"The big red building where hay and animals are kept.","teach":"The AR makes an 'ar' sound, like 'car' and 'star'."}]},{"name":"Sneaky Silent Letters","emoji":"🤫","blurb":"Letters you write but never say!","level":"tricky","rows":14,"cols":7,"cells":[[null,null,"C",null,null,null,null],[null,null,"A",null,null,null,null],["W",null,"S",null,null,null,null],["R",null,"T",null,"K",null,null],["I","S","L","A","N","D",null],["N",null,"E",null,"U",null,null],["K",null,null,null,"C",null,null],["L",null,"G",null,"K",null,null],["E",null,"N",null,"L",null,null],[null,"H","O","N","E","S","T"],[null,null,"M",null,null,null,"H"],[null,null,"E",null,null,null,"U"],[null,null,null,null,null,null,"M"],[null,null,null,null,null,null,"B"]],"numbers":{"0,2":1,"2,0":2,"3,4":3,"4,0":4,"7,2":5,"9,1":6,"9,6":7},"entries":[{"num":1,"dir":"down","row":0,"col":2,"answer":"CASTLE","clue":"A stone fortress — the T in the middle is silent.","teach":"STLE words drop the T: listen, whistle, thistle, rustle."},{"num":2,"dir":"down","row":2,"col":0,"answer":"WRINKLE","clue":"A crease in your shirt — the W at the front says nothing.","teach":"WR words hide the W: write, wrong, wrist, wrap, wreck."},{"num":3,"dir":"down","row":3,"col":4,"answer":"KNUCKLE","clue":"A bumpy joint in your finger — it starts with a silent K.","teach":"KN words all keep a silent K: knee, knight, knock, knife, know."},{"num":4,"dir":"across","row":4,"col":0,"answer":"ISLAND","clue":"Land with sea all around it — and a silent S.","teach":"Say it 'eye-land'. The S was added by mistake hundreds of years ago and just stuck."},{"num":5,"dir":"down","row":7,"col":2,"answer":"GNOME","clue":"A little garden statue with a pointy hat and a silent G.","teach":"GN words start with a silent G: gnaw, gnat, gnash."},{"num":6,"dir":"across","row":9,"col":1,"answer":"HONEST","clue":"Telling the truth — but the H stays quiet.","teach":"Say it 'ON-est'. Same silent H in 'hour' and 'honour'."},{"num":7,"dir":"down","row":9,"col":6,"answer":"THUMB","clue":"Your shortest, fattest finger — with a silent B on the end.","teach":"MB words end with a silent B: lamb, comb, climb, crumb, numb."}]},{"name":"Shape Squad","emoji":"🔺","blurb":"Sides, corners and solid shapes!","level":"medium","rows":10,"cols":9,"cells":[["S","P","H","E","R","E",null,null,null],[null,"R",null,null,null,null,null,null,null],[null,"I",null,"C",null,"T",null,null,null],[null,"S","Q","U","A","R","E",null,null],[null,"M",null,"B",null,"I",null,null,"A"],[null,null,"H","E","X","A","G","O","N"],[null,null,null,null,null,"N",null,null,"G"],[null,null,null,null,null,"G",null,null,"L"],[null,"C","I","R","C","L","E",null,"E"],[null,null,null,null,null,"E",null,null,null]],"numbers":{"0,0":1,"0,1":2,"2,3":3,"2,5":4,"3,1":5,"4,8":6,"5,2":7,"8,1":8},"entries":[{"num":1,"dir":"across","row":0,"col":0,"answer":"SPHERE","clue":"A ball shape — a solid, 3D circle.","teach":"Starts with SPH, and the PH says F. A globe is a sphere."},{"num":2,"dir":"down","row":0,"col":1,"answer":"PRISM","clue":"A solid with the same shape at both ends, joined by flat sides.","teach":"A glass prism splits white light into a rainbow."},{"num":3,"dir":"down","row":2,"col":3,"answer":"CUBE","clue":"A solid box with six square faces — like a dice.","teach":"6 faces, 12 edges and 8 corners. Cubing a number means times it by itself twice."},{"num":4,"dir":"down","row":2,"col":5,"answer":"TRIANGLE","clue":"A shape with three sides and three corners.","teach":"'Tri' means three — like tricycle and triplets."},{"num":5,"dir":"across","row":3,"col":1,"answer":"SQUARE","clue":"Four equal sides and four square corners.","teach":"Every square is a rectangle, but not every rectangle is a square."},{"num":6,"dir":"down","row":4,"col":8,"answer":"ANGLE","clue":"The corner where two lines meet.","teach":"A square corner is 90 degrees and is called a right angle."},{"num":7,"dir":"across","row":5,"col":2,"answer":"HEXAGON","clue":"A six-sided shape — bees build these in the hive.","teach":"'Hex' means six. A pentagon has five sides, an octagon has eight."},{"num":8,"dir":"across","row":8,"col":1,"answer":"CIRCLE","clue":"A perfectly round shape with no corners at all.","teach":"The line straight across the middle is the diameter; halfway is the radius."}]},{"name":"Coding Club","emoji":"💻","blurb":"How computers follow instructions.","level":"medium","rows":10,"cols":9,"cells":[[null,null,"P",null,null,null,null,null,null],[null,"B","I","N","A","R","Y",null,null],[null,null,"X",null,"L",null,null,null,null],[null,null,"E",null,"G",null,null,"D",null],[null,null,"L","O","O","P",null,"E",null],[null,null,null,null,"R",null,null,"B",null],[null,null,null,null,"I","N","P","U","T"],["R","O","B","O","T",null,null,"G",null],[null,null,null,null,"H",null,null,null,null],[null,null,null,null,"M",null,null,null,null]],"numbers":{"0,2":1,"1,1":2,"1,4":3,"3,7":4,"4,2":5,"6,4":6,"7,0":7},"entries":[{"num":1,"dir":"down","row":0,"col":2,"answer":"PIXEL","clue":"One tiny coloured dot in a picture on a screen.","teach":"Short for 'picture element'. Minecraft's blocky look is pixels made huge on purpose."},{"num":2,"dir":"across","row":1,"col":1,"answer":"BINARY","clue":"The number system computers use, with only 0 and 1.","teach":"'Bi' means two. In binary, 1-0-1 means five."},{"num":3,"dir":"down","row":1,"col":4,"answer":"ALGORITHM","clue":"A step-by-step recipe a computer follows.","teach":"Nine letters, and TH in the middle. A recipe for pancakes is an algorithm too."},{"num":4,"dir":"down","row":3,"col":7,"answer":"DEBUG","clue":"To hunt down and fix a mistake in your code.","teach":"The very first computer 'bug' was a real moth stuck inside a machine in 1947."},{"num":5,"dir":"across","row":4,"col":2,"answer":"LOOP","clue":"Code that repeats the same steps over and over.","teach":"Instead of writing 'jump' 100 times, you write a loop that says: repeat 100 times."},{"num":6,"dir":"across","row":6,"col":4,"answer":"INPUT","clue":"Anything you give a computer: a tap, a key, a click.","teach":"Input goes in, output comes out — like a screen or a speaker."},{"num":7,"dir":"across","row":7,"col":0,"answer":"ROBOT","clue":"A machine that follows a program to do a job.","teach":"The word comes from a Czech play in 1920 — it means 'forced work'."}]},{"name":"Grown-Up: Word Nerd","emoji":"🧠","blurb":"A real vocabulary puzzle for the grown-ups.","level":"grown-up","rows":9,"cols":14,"cells":[[null,null,null,null,"N",null,null,null,null,null,null,null,null,null],["V","E","R","B","O","S","E",null,null,null,null,null,null,null],[null,null,null,null,"V",null,"L","U","M","I","N","O","U","S"],[null,null,null,null,"E",null,"O",null,null,null,null,null,null,"E"],[null,null,null,null,"L",null,"Q","U","I","R","K",null,null,"R"],[null,null,null,null,null,null,"U",null,null,null,null,null,null,"E"],[null,null,null,null,null,"M","E","A","N","D","E","R",null,"N"],[null,null,null,null,null,null,"N",null,null,null,null,null,null,"E"],[null,null,null,null,null,null,"T","R","I","V","I","A",null,null]],"numbers":{"0,4":1,"1,0":2,"1,6":3,"2,6":4,"2,13":5,"4,6":6,"6,5":7,"8,6":8},"entries":[{"num":1,"dir":"down","row":0,"col":4,"answer":"NOVEL","clue":"New and unusual — or a book-length story.","teach":"Both meanings come from Latin 'novus', new."},{"num":2,"dir":"across","row":1,"col":0,"answer":"VERBOSE","clue":"Using far more words than are needed.","teach":"From Latin 'verbum', word — same family as verb and verbatim."},{"num":3,"dir":"down","row":1,"col":6,"answer":"ELOQUENT","clue":"Fluent and persuasive in speech or writing.","teach":"Shares a root with 'loquacious' — Latin 'loqui', to speak."},{"num":4,"dir":"across","row":2,"col":6,"answer":"LUMINOUS","clue":"Giving off light; glowing.","teach":"From Latin 'lumen', light — the same root as illuminate and luminary."},{"num":5,"dir":"down","row":2,"col":13,"answer":"SERENE","clue":"Calm, peaceful and completely untroubled.","teach":"The noun is 'serenity', and a clear evening sky is where the word started."},{"num":6,"dir":"across","row":4,"col":6,"answer":"QUIRK","clue":"A small, odd habit that makes someone themselves.","teach":"Five letters starting QU. 'Quirky' is the adjective."},{"num":7,"dir":"across","row":6,"col":5,"answer":"MEANDER","clue":"To wander along without hurrying, or the way a lazy river bends.","teach":"From the Maeander, a famously winding river in ancient Turkey."},{"num":8,"dir":"across","row":8,"col":6,"answer":"TRIVIA","clue":"Small details of little importance — but great in a quiz.","teach":"Latin 'tri' + 'via' = three roads: gossip swapped where roads meet."}]},{"name":"Grown-Up: World Atlas","emoji":"🗺️","blurb":"Capitals, rivers and ranges.","level":"grown-up","rows":10,"cols":9,"cells":[[null,null,"L","I","S","B","O","N",null],[null,null,null,"C",null,null,null,null,null],["A","N","D","E","S",null,null,null,null],[null,null,null,"L",null,null,null,null,null],[null,null,"S","A","H","A","R","A",null],[null,null,null,"N",null,null,null,null,"P"],[null,null,null,"D","A","N","U","B","E"],[null,null,null,null,null,"I",null,null,"R"],[null,null,null,"O","S","L","O",null,"U"],[null,null,null,null,null,"E",null,null,null]],"numbers":{"0,2":1,"0,3":2,"2,0":3,"4,2":4,"5,8":5,"6,3":6,"6,5":7,"8,3":8},"entries":[{"num":1,"dir":"across","row":0,"col":2,"answer":"LISBON","clue":"The capital of Portugal, on the river Tagus.","teach":"In Portuguese it's Lisboa. It's the westernmost capital on mainland Europe."},{"num":2,"dir":"down","row":0,"col":3,"answer":"ICELAND","clue":"North Atlantic island nation of volcanoes and geysers.","teach":"Its capital, Reykjavik, is the world's northernmost capital of a sovereign state."},{"num":3,"dir":"across","row":2,"col":0,"answer":"ANDES","clue":"The mountain range running down the western edge of South America.","teach":"About 7,000 km long — the longest continental mountain range there is."},{"num":4,"dir":"across","row":4,"col":2,"answer":"SAHARA","clue":"The vast desert across northern Africa.","teach":"Roughly the size of the United States, and it's still growing."},{"num":5,"dir":"down","row":5,"col":8,"answer":"PERU","clue":"The South American country that is home to Machu Picchu.","teach":"Its capital is Lima, and it shares Lake Titicaca with Bolivia."},{"num":6,"dir":"across","row":6,"col":3,"answer":"DANUBE","clue":"Europe's second-longest river, flowing past Vienna and Budapest.","teach":"It passes through ten countries — more than any other river on Earth."},{"num":7,"dir":"down","row":6,"col":5,"answer":"NILE","clue":"The river that runs north through Egypt to the Mediterranean.","teach":"One of very few great rivers that flows northward."},{"num":8,"dir":"across","row":8,"col":3,"answer":"OSLO","clue":"The capital of Norway, at the head of a long fjord.","teach":"A fjord is a deep sea inlet carved out by an ancient glacier."}]}];

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
