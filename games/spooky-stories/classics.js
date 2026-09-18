/* Familiar fairy tales, retold for Ellie. Sources and adaptation notes:
   classics/README.md. Keep text/ask strings literal for the narration builder. */
window.ELLIE_CLASSICS = [
  {
    id: "ellie-three-bears",
    title: "Ellie and the Three Bears",
    classic: "Goldilocks and the Three Bears",
    sticker: "🐻",
    color: "#b56d37",
    outfit: "A butter-yellow dress embroidered with tiny white daisies, white lace collar, a blue sash tied in a bow, brown ankle boots. No crown or tiara.",
    pages: [
      {
        text: "Once upon a time, Ellie followed a butterfly along a woodland path. Her yellow dress brushed the daisies. Beyond a bend stood a little cottage, with three coats by the door: a great big coat, a middle-sized coat, and a tiny little coat.",
        scene: "Sunny woodland cottage exterior. Preschool Ellie in her yellow daisy dress follows one blue butterfly toward a wooden porch. Exactly three differently sized coats hang on pegs beside the door. No bears yet.",
        vocab: { woodland: "a place with lots of trees growing together" }
      },
      {
        text: "Ellie knocked. Nobody answered. But the door was open a crack, and a delicious smell drifted out. She peeped inside. Three bowls of porridge waited on the table. Her tummy rumbled. She knew she ought to wait. Instead, she picked up a spoon.",
        scene: "Inside a cozy empty woodland cottage, Ellie stands at a rustic table lifting a wooden spoon. Exactly three porridge bowls: large blue, medium green, tiny red. Morning light, open door behind, no bears.",
        vocab: { porridge: "a warm breakfast made by cooking oats with milk or water" }
      },
      {
        text: "The big bowl was too hot. The middle-sized bowl was too cold. But the little bowl was just right. Ellie tried one spoonful, then another, then another. When she looked down, the little bowl was empty. Oh dear. That had been somebody else's breakfast.",
        scene: "Ellie at the same table looks sheepishly at the completely empty tiny red porridge bowl, holding a spoon. Large blue bowl gently steams and medium green bowl remains full. Exactly three bowls, no bears. Show the consequence, not three simultaneous Ellies.",
        vocab: { spoonful: "as much food as one spoon can hold" }
      },
      {
        text: "Next she tried the chairs. The big chair was too hard. The middle-sized chair was too soft. The little chair was just right. Ellie gave a happy wriggle. CRACK! Its seat broke, and she landed on the rug. Now she had something else to put right.",
        scene: "Ellie sits unharmed on a soft woven rug beside a small wooden chair with its seat broken. A large sturdy chair and a medium plush armchair stand beside it. Exactly three chairs. Ellie looks startled and regretful, no injury, no bears.",
        vocab: { wriggle: "a little twisting movement from side to side" }
      },
      {
        text: "Upstairs were three beds. The big bed was too hard. The middle-sized bed was too soft. The little bed was just right. Ellie meant to rest for only a moment. Her eyes closed. Downstairs, the front door creaked. The owners of the cottage were home.",
        scene: "Quiet cottage bedroom with exactly three wooden beds: huge blue quilt, medium green quilt, small red patchwork quilt. Ellie sleeps peacefully in the smallest bed, yellow dress visible above blanket, boots placed beside bed. No bears in bedroom yet.",
        vocab: { creaked: "made a long squeaky sound" }
      },
      {
        text: "“Someone has tasted my porridge,” rumbled Papa Bear. “Someone has tasted mine,” said Mama Bear. “Someone has eaten ALL of mine!” cried Baby Bear. Then they saw the chairs. “Someone has broken my chair, too!” Baby Bear's small voice began to wobble.",
        scene: "Downstairs discovery with exactly three brown bears: huge Papa in dark forest-green waistcoat, medium Mama in cream blouse and rose apron, small Baby in sky-blue overalls. They inspect the three bowls and broken tiny chair, Baby sad rather than angry. Ellie is upstairs and not visible.",
        vocab: { rumbled: "spoke in a deep, low voice, a little like distant thunder" }
      },
      {
        text: "Upstairs, Papa Bear found his rumpled bed. Mama Bear found hers. Baby Bear stood on tiptoe. “Someone is sleeping in MY bed, and here she is!” Ellie woke with a gasp. Three bears! She wanted to run. Then she saw Baby Bear's face.",
        scene: "Bedroom reveal: Ellie has just sat up awake in small red-quilted bed, surprised. Three bears stand beside it, Baby in blue overalls nearest with a sad face. Two larger beds behind. Gentle concern, no snarling, no threatening claws.",
        vocab: { rumpled: "creased and messy instead of smooth and tidy" }
      },
      {
        text: "“I'm sorry,” Ellie said. “I ate your breakfast. I broke your chair. I should have waited outside.” Mama Bear gave her a steady look. “Then let's start by making things right.” Ellie measured fresh oats. Papa repaired the chair while she held the seat still.",
        scene: "Repairing harm in warm cottage kitchen. Ellie holds the tiny chair seat steady while Papa Bear fits it by hand, no child using tools. Mama measures oats beside the three bowls; Baby watches hopefully. Exactly three bears and Ellie. No magic repair.",
        vocab: { repaired: "fixed something that was broken" }
      },
      {
        text: "Mama Bear walked Ellie back to the path. The next Saturday, Ellie returned with Dad and a basket of berries. This time she knocked and waited. Baby Bear opened the door. “Come in!” he said. He pointed to the mended little chair. “This one's just right.”",
        scene: "Sunny cottage doorway reunion. Ellie holds a small basket of ripe berries and stands beside her young adult father with short light-brown hair, clean-shaven, cream shirt and brown trousers. Baby Bear in blue overalls welcomes them through the open door. Repaired small chair visible inside. No crown.",
        vocab: { mended: "made whole and useful again after being broken" }
      }
    ],
    ending: "The End. 🐻",
    questions: [
      { ask: "Which bowl of porridge did Ellie finish?", choices: [["🥣", "Baby Bear's little bowl"], ["🐻", "Papa Bear's big bowl"], ["🍵", "Mama Bear's middle-sized bowl"]] },
      { ask: "What did Ellie do after she saw Baby Bear was upset?", choices: [["🛠️", "She said sorry and helped put things right"], ["🏃", "She hid in the woods"], ["🪑", "She took the little chair home"]] },
      { ask: "What did Ellie do differently on her next visit?", choices: [["🚪", "She knocked and waited to be invited in"], ["🥄", "She ate the porridge first"], ["🛏️", "She went straight to bed"]] }
    ]
  },
  {
    id: "ellie-beanstalk",
    title: "Ellie and the Beanstalk",
    classic: "Jack and the Beanstalk",
    sticker: "🌱",
    color: "#367f61",
    outfit: "A rich emerald-green dress with embroidered golden leaves, a cream lace collar, cream leggings and sturdy brown ankle boots, small brown cross-body satchel. No crown or tiara.",
    pages: [
      {
        text: "Once upon a time, Ellie and Mom lived in a cottage beside a very empty garden. Their cow, Buttercup, had stopped giving milk. “We must sell her for food,” Mom said. Ellie hugged Buttercup's soft neck. Then they set off for the market together.",
        scene: "Fairy-tale country cottage with sparse vegetable garden. Ellie in emerald leaf-embroidered dress tenderly hugs a gentle cream Jersey cow. Mom with gray-streaked brown bob and round glasses, teal country dress, carries an empty wicker basket. Warm morning, hopeful not destitute.",
        vocab: { market: "a place where people buy and sell things" }
      },
      {
        text: "While Mom spoke to the baker, a little man showed Ellie five shining beans. “Plant these, and see what grows.” Ellie traded Buttercup for them. Mom hurried over. “Five beans won't buy our supper!” Ellie looked at her closed hand. The beans suddenly felt very small.",
        scene: "Village market. Ellie displays exactly five glowing beans on her open palm, looking worried as Mom returns carrying her empty basket. Kindly small elderly trader in russet coat leads cream Jersey cow away nearby. No money or text. Tight composition keeps all five beans readable.",
        vocab: { traded: "gave one thing to get something else in return" }
      },
      {
        text: "At home, Ellie planted the beans by the kitchen window. That night came a rustle, a creak, a WHOOOOSH. By morning, a beanstalk thicker than the chimney reached right into the clouds. Ellie pulled on her boots. “I'll find out what's up there,” she said.",
        scene: "Morning at cottage, enormous twisting green beanstalk grows from garden into clouds. Ellie in unchanged emerald dress and boots looks up in amazement, Mom stands at kitchen window. Wide upward view conveys scale without losing Ellie's recognizable face.",
        vocab: { beanstalk: "the long stem of a bean plant" }
      },
      {
        text: "Up she climbed, past sparrows, past swallows, through a cool white cloud. Above it stood a castle with a door as tall as a church. A giant woman opened it. “Quick, little one. My husband doesn't like visitors.” She hid Ellie behind a flour barrel.",
        scene: "Cloud castle kitchen. A kindly giant woman in a plum dress and cream apron gestures tiny Ellie behind an enormous wooden flour barrel near the open door. Ellie is normal child proportions but tiny compared to giant furnishings. Floating cloud path and vine outside.",
        vocab: { barrel: "a big round container made from curved wooden boards" }
      },
      {
        text: "BOOM. BOOM. BOOM. In came the giant. “Fee-fi-fo-fum! Who has come to my house?” He sat down with a golden hen. “Lay!” he ordered. Out popped a golden egg. Then he called for his harp. It sang such a sleepy song that soon he was snoring.",
        scene: "Huge castle table. Burly sleepy giant with reddish beard in brown tunic rests in his chair, a golden-feathered hen beside exactly one golden egg. Beside the hen is a tiny ornate golden harp, only the size of Ellie's hand, small enough to fit her satchel; it is a magical self-playing instrument, not a giant-sized harp. Ellie peeks safely behind flour barrel. Giant comical and gruff, no weapons, teeth or menace.",
        vocab: { harp: "a musical instrument with strings you pluck with your fingers" }
      },
      {
        text: "“Please take us down,” whispered the hen. “We belong in the village. He carried us up here!” Ellie crept out. The hen tucked under her arm; the little harp slipped into her satchel. Step by careful step, she carried them toward the door.",
        scene: "Ellie sneaks toward giant kitchen door, carefully holding small golden hen under one arm and a hand-sized golden harp peeking from her brown satchel. Giant sleeps blurred in background. Flour barrel behind. This is the escape before the giant wakes. Maintain dress and satchel.",
        vocab: { crept: "moved slowly and quietly so nobody would notice" }
      },
      {
        text: "At the threshold, the harp bumped a stone. TWANG! The giant opened one eye. Then both. “Come back!” Ellie ran. Her green skirt flashed between the enormous leaves. She held her satchel close and began to climb down. Above her, the beanstalk shook.",
        scene: "Dynamic but gentle adventure: Ellie starts descending huge beanstalk from cloud edge, golden harp safely tucked in her brown satchel, golden hen nestled against her chest. Giant reaches the distant castle doorway behind, not touching her. Leaves form generous footholds, no falling.",
        vocab: { threshold: "the strip of floor across the bottom of a doorway" }
      },
      {
        text: "“Mom!” called Ellie. Mom reached up and caught the hen, then the harp, then Ellie. Far above, the giant put one enormous boot on a leaf. It bent. It buckled. “Too small!” he grumbled, pulling his foot back onto the cloud. Ellie had an idea.",
        scene: "Ground-level cottage garden: Mom helps Ellie step off lowest vine, golden hen and harp safely beside her. Far overhead, giant's boot retreats onto cloud as a leaf bends. Everyone safe, no falling giant. Ellie looks thoughtfully toward bean roots.",
        vocab: { buckled: "bent because something pressing on it was too heavy" }
      },
      {
        text: "“It grew from beans,” she said. “Perhaps we can ask it to go back.” She touched the root. “Down, please!” The leaves folded like umbrellas. The stalk curled smaller and smaller until five beans lay in the earth. The giant stayed safely on his cloud.",
        scene: "Magical shrinking vine in cottage garden. Ellie kneels touching the root, Mom and hen with harp nearby. Beanstalk curls downward like a green ribbon, leaves folding like umbrellas, giant safely seated on separate distant cloud. Show mid-shrink, no simultaneous pile of beans or danger.",
        vocab: { root: "the part of a plant that grows underground and drinks water" }
      },
      {
        text: "They returned the hen and harp to the village. That evening, the harp played in the square, and the hen's golden egg bought supper for everyone. The little man brought Buttercup home. Ellie kept the five beans in a jar. Some things were better planted with Mom.",
        scene: "Warm village feast at sunset. Ellie and Mom sit with a few friendly villagers. Golden hen stands proudly beside its harp, small elderly trader in russet coat returns cream Buttercup cow. A small clear jar containing exactly five beans rests near Ellie. Cozy plentiful supper, no castle party.",
        vocab: { supper: "the meal you eat in the evening" }
      }
    ],
    ending: "The End. 🌱",
    questions: [
      { ask: "What did Ellie get in exchange for Buttercup?", choices: [["🫘", "Five magic beans"], ["🍞", "A loaf of bread"], ["👑", "A golden crown"]] },
      { ask: "What woke the sleeping giant?", choices: [["🎵", "The harp bumped a stone and made a sound"], ["🐄", "Buttercup mooed in his kitchen"], ["🌧️", "Rain tapped on his window"]] },
      { ask: "Why did Ellie take the hen and harp down the beanstalk?", choices: [["🏘️", "They asked to go back to their village"], ["🎁", "She wanted to hide them in her room"], ["🥚", "The giant asked her to sell them"]] }
    ]
  },
  {
    id: "ellie-glass-slipper",
    title: "Cinderellie",
    classic: "Cinderella",
    sticker: "🥿",
    color: "#7160aa",
    outfit: "Before and after magic: a pretty dusty-rose dress with small embroidered flowers and a cream apron, brown flats, no crown. At the ball: a magnificent pearl-lavender gown with silver vine embroidery, sheer puff sleeves and layered luminous silk, a small silver hair comb, delicate transparent magical glass slippers. Always Cinderellie age three, never an adult bride.",
    pages: [
      {
        text: "Once upon a time, Cinderellie stayed in a tall old house with two grand cousins. One morning, an invitation arrived: every child was welcome at the palace ball. Cinderellie imagined the music, the lanterns, the swishing dresses. “May I come too?” she asked. Her cousins barely looked up.",
        scene: "Elegant old house morning. Cinderellie, preschooler in dusty-rose embroidered dress and cream apron, looks hopefully at a decorative invitation with no readable words. Two older girl cousins, about ten and twelve, one auburn-haired in coral, one dark-haired in teal, fuss with finery. No known family members, no tiara.",
        vocab: { invitation: "a message asking you to come to a party or another event" }
      },
      {
        text: "“After you tidy all this,” they said, leaving ribbons and shoes everywhere. Cinderellie worked until the floor shone. But the carriage was already rattling away. Her cousins had gone without her. She sat by the hearth in her dusty-rose dress. One tear made a dark little spot on her apron.",
        scene: "Cinderellie sits disappointed by a quiet hearth in cleaned old house, wearing same dusty-rose dress and cream apron. No fire close to her. Through window a carriage departs into early evening. One small tear, tender expression, no frightening neglect imagery.",
        vocab: { hearth: "the space in front of a fireplace" }
      },
      {
        text: "“A clean floor is lovely,” said a warm voice. “But you were invited too.” Her fairy godmother stood in the doorway. “Fetch me a pumpkin.” Cinderellie blinked. A pumpkin? Outside, the fairy tapped it with her wand. Its orange sides swelled into a magnificent golden carriage.",
        scene: "Twilight garden. Cinderellie in dusty-rose dress watches a plump pumpkin transforming into an ornate golden pumpkin carriage under a fairy godmother's wand. Kindly elderly fairy with silver curly hair, plum velvet cape and moonstone brooch, adult painted face matching Cinderellie. No glass slippers yet.",
        vocab: { magnificent: "wonderfully beautiful or impressive" }
      },
      {
        text: "Mice became little white horses. A lizard became a coachman. Then the wand brushed Cinderellie's dress. Pearl-lavender silk shimmered around her; silver leaves climbed the hem. On her feet glittered two glass slippers. “Be home before midnight,” said the fairy. “Then everything but the slippers becomes ordinary again.”",
        scene: "Fairy garden reveal. Cinderellie now wears exquisite pearl-lavender silk gown, silver vine embroidery, sheer puff sleeves, silver hair comb, two transparent glass slippers. Fairy godmother smiles beside her. Golden pumpkin coach, two small white horses and whimsical green-coated coachman behind. No pumpkin on ground or mice now.",
        vocab: { shimmered: "shone with a soft, gently changing light" }
      },
      {
        text: "At the palace, Cinderellie stopped beneath a thousand shining lights. Nobody asked her to tidy anything. The young prince bowed and held out his hand. “Will you join our dance?” Round went the children, their ribbons flying. Cinderellie laughed so hard she forgot to watch the clock.",
        scene: "Fairy-tale palace children's ball. Cinderellie age three in consistent pearl-lavender silver-leaf gown joins a circle dance with several other children. A friendly preschool boy prince in blue bows and offers his hand, inviting her to dance. Golden chandeliers and colorful ribbons, midnight clock high in background without readable digits. No proposal, wedding or lettering.",
        vocab: { palace: "a very grand home where a royal family lives" }
      },
      {
        text: "DONG. Cinderellie froze. DONG. The clock was striking midnight! She hurried through the ballroom, down the stairs, past the astonished guards. One glass slipper slipped from her heel. She reached back, then heard another DONG. There wasn't time. She ran on with one bare foot.",
        scene: "Cinderellie hurries down wide palace steps under moonlight, still in lavender gown, one foot barefoot and the other wearing a glass slipper. Exactly one abandoned glass slipper on a step behind her. Kind surprised guards at distant doorway. Urgent but safe, no fall. Golden coach waits below.",
        vocab: { astonished: "very surprised by something you did not expect" }
      },
      {
        text: "Just outside her garden, the last chime sounded. The carriage shrank into a pumpkin. The horses scurried away as mice. Cinderellie stood in her dusty-rose dress again. But in her hand was the other glass slipper, still shining. “It really happened,” she whispered. Then she tucked it safely away.",
        scene: "After transformation in garden beside cottage, Cinderellie in original dusty-rose dress holds exactly one glass slipper glowing in her hands, both feet bare. Plain orange pumpkin and two small white mice on path. No coach, horses, fairy or lavender gown. Wonder, not sadness.",
        vocab: { scurried: "ran quickly with lots of little steps" }
      },
      {
        text: "The next morning, the palace messenger knocked at every door. He carried the lost slipper on a cushion. “Who danced with us last night?” At Cinderellie's house, both cousins tried it. One foot was too wide; the other was too long. Cinderellie stepped forward. “May I try?”",
        scene: "House sitting room daylight. Kindly palace messenger in navy velvet holds cushion with exactly one tiny glass slipper. Older auburn cousin and dark-haired cousin look frustrated beside a chair, their bare feet clearly too large. Neither cousin wears a glass slipper; the only glass shoe visible is on the cushion. Little Cinderellie in dusty-rose dress politely steps forward. No fairy or prince present.",
        vocab: { messenger: "someone who carries news or a message to another person" }
      },
      {
        text: "Her cousins giggled. “You weren't even there!” The messenger offered the slipper. Cinderellie's foot slid in. It fitted exactly. She held up its shining twin. The prince stepped through the doorway. “Will you marry me?” he asked. “No Dude!” said Cinderellie. “But I'll dance with you!”",
        scene: "Illustrate the recognition moment just before the prince enters: messenger kneels offering tiny glass slipper, which fits Cinderellie's foot perfectly. Cinderellie in simple dusty-rose dress proudly holds its matching slipper. Two older cousins look surprised behind. Exactly two glass slippers total, one worn and one held. Cinderellie remains preschool age, no adult glamour. The proposal happens only after this successful fitting.",
        vocab: { twin: "another one just like it; here, the matching glass slipper" }
      },
      {
        text: "Her cousins looked at the polished floor, then at Cinderellie. “We should have waited,” they said. For the next ball, the fairy brought back the lavender gown. This time, her cousins helped Cinderellie dress. She took their hands and led them into the dance. No one was left behind.",
        scene: "Happy ending at second palace children's ball. Cinderellie in exquisite pearl-lavender silver-leaf gown and both glass slippers leads her two older cousins, auburn coral dress and dark-haired teal dress, by their hands into a dance. Silver-haired fairy godmother in plum cape smiles from doorway. Warm inclusive scene, no wedding, no romantic couple.",
        vocab: { polished: "rubbed until smooth and shiny" }
      }
    ],
    ending: "The End. 🥿",
    questions: [
      { ask: "What did the fairy godmother turn into a carriage?", choices: [["🎃", "A pumpkin"], ["🪑", "A chair"], ["🥣", "A porridge bowl"]] },
      { ask: "Why did Cinderellie leave the ball in such a hurry?", choices: [["🕛", "The clock was striking midnight"], ["🎶", "She did not like the music"], ["🌧️", "It had started to rain inside"]] },
      { ask: "How did Cinderellie show she was the child from the ball?", choices: [["🥿", "The slipper fitted, and she had its matching twin"], ["👑", "She borrowed the prince's crown"], ["🎃", "She brought a basket of pumpkins"]] }
    ]
  }
];
