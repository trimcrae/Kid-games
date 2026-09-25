/* Original family tales. Literal text/ending/ask strings are also the audio source.
   Each spread teaches through the story; the first quiz choice is correct. */
window.FAMILY_STORIES = [
  {
    id: "shy-shadow", title: "Ellie and the Shy Shadow", sticker: "🔦", color: "#674484",
    style: "Painted bedtime mystery", artStyle: "shadow",
    pages: [
      {
        title: "Who's there?",
        text: "At bedtime, Princess Ellie carried her lantern through the castle. Beside the fern, a tall shadow wore a pointy crown. Ellie stopped. “Hello?” she whispered. The shadow was very quiet.",
        wonder: "Look closely. What does the shadow's crown remind you of?",
        img: "picture-book-test/art/ellie-1.webp",
        alt: "Ellie notices a crowned shadow beside a fern in the lantern-lit castle hallway.",
        vocab: { shadow: "a dark shape made when something blocks the light" }
      },
      {
        title: "A familiar wave",
        text: "Ellie put down her lantern and waved. The shadow waved too! She wiggled her fingers. So did the shadow. “You're me!” Ellie laughed. Her body was blocking the lantern's light and making a shadow on the wall.",
        wonder: "Can you wave just like Ellie and her shadow?",
        img: "picture-book-test/art/ellie-2.webp",
        alt: "Ellie waves beside a lantern on the floor and her large shadow waves back."
      },
      {
        title: "Goodnight, little shadow",
        text: "Ellie held her hands in the light. Two fingers became long ears. A shadow bunny appeared on the wall! “Goodnight, bunny,” she whispered. The castle felt cozy again. Sometimes a little looking turns a mystery into a game.",
        wonder: "With a grown-up and a flashlight, try making a hand shadow.",
        img: "picture-book-test/art/ellie-3.webp",
        alt: "Ellie sits on a cushion making a rabbit hand shadow in the warm lantern light.",
        vocab: { mystery: "something puzzling that you can try to understand" }
      }
    ],
    ending: "The End. Goodnight, Ellie. Goodnight, little shadow.",
    questions: [
      { ask: "What made Ellie's shadow?", choices: [["🔦", "Ellie blocking the lantern's light"], ["👻", "A hidden ghost"], ["🌧️", "Rain on the window"]] },
      { ask: "How did Ellie find out what the shadow was?", choices: [["👋", "She waved and watched it wave too"], ["🚪", "She shut her eyes"], ["👑", "She asked her crown"]] }
    ]
  },
  {
    id: "jeannie-paper-river", title: "Jeannie and the Paper River", sticker: "🗺️", color: "#367a78",
    style: "Layered paper-cut adventure", artStyle: "paper",
    pages: [
      { title: "A gap in the map", text: "Jeannie unfolded an old map on the library floor. A blue paper river wound between tiny hills, then stopped at a ragged hole. Beside it someone had written: Follow the tributary. “A tributary,” Jeannie read, “is a smaller stream that joins a river. That sounds like a clue.”", alt: "Jeannie kneels beside an unfolded map with a gap in its blue river.", vocab: { tributary: "a smaller stream or river that flows into a larger one" }, wonder: "Trace the little stream with your finger. Where might it lead?" },
      { title: "Upstream", text: "She traced the little stream upstream, toward the hills. Under a folded paper tree she found a scrap with a blue stripe. Jeannie tried it in the hole. The stripe pointed toward the sky! She turned the scrap halfway around. Now the two blue edges met, but one corner was still missing.", alt: "A folded tree hides a blue-striped map scrap; Jeannie turns it to join the river.", vocab: { upstream: "toward the place a river or stream comes from" }, wonder: "What changes when you turn a puzzle piece around?" },
      { title: "The wrong blue", text: "A bright blue square lay beside the paper village. It was exactly the right size. Jeannie almost pressed it into place. Then she noticed tiny white waves. “This belongs to the sea,” she said. Matching the shape was useful. Matching the picture mattered too.", alt: "Jeannie compares a square of sea with white waves to the winding river map.", vocab: { noticed: "saw something by paying careful attention" }, wonder: "How did Jeannie know the blue square was the wrong piece?" },
      { title: "A reader's clue", text: "On the back of the map, Jeannie found another sentence: The river passes the mill before the meadow. She looked beside the little paper mill. There, tucked under its wheel, was the missing corner. A green bank curved around a strip of blue. It fitted perfectly.", alt: "The missing green-and-blue corner rests beneath a paper watermill beside the river.", vocab: { meadow: "a grassy field, often full of wildflowers" }, wonder: "Which place does the river pass first: the mill or the meadow?" },
      { title: "Room for another explorer", text: "The river now reached all the way to the sea. Jeannie added a key: blue meant water, green meant grass, and a little square meant a building. Then she wrote a clue for Cory. She left the map open beside him. Every good explorer, she decided, could also make a path for someone else.", alt: "Jeannie and Cory share the completed paper map from the hills to the sea.", vocab: { key: "a guide that explains the symbols on a map" }, wonder: "Draw a tiny map of a room. What symbols could go in its key?" }
    ],
    ending: "The End. Jeannie followed the words, checked the picture, and made a map to share.",
    questions: [
      { ask: "What is a tributary?", choices: [["💧", "A smaller stream that joins a river"], ["🌳", "A folded paper tree"], ["🏠", "A house beside the sea"]] },
      { ask: "Why was the bright blue square the wrong piece?", choices: [["🌊", "Its waves belonged to the sea"], ["📏", "It was much too big"], ["🟩", "It was green"]] },
      { ask: "What did Jeannie's map key explain?", choices: [["🗺️", "What the colors and symbols meant"], ["🔑", "How to unlock the library"], ["🕰️", "What time it was"]] }
    ]
  },
  {
    id: "cory-block-bridge", title: "Cory and the Six-Block Bridge", sticker: "🌉", color: "#37639b",
    style: "Isometric block-world adventure", artStyle: "blocks",
    pages: [
      { title: "The last delivery", text: "Cory's block village had one last parcel to deliver. Across the river, the lighthouse keeper was waiting for a new lamp. Cory parked his little cart at the bank. The old bridge was gone. In his building box he found six long blocks, all the same size.", alt: "Cory and a small parcel cart wait across the river from a block-built lighthouse.", wonder: "How could Cory use his blocks to cross the river?" },
      { title: "A wobbly idea", text: "Cory stacked all six blocks into a tall tower. It looked impressive, but it did not reach across the water. He took it down carefully. “I need a bridge, not a tower.” He laid three blocks end to end on the rug. They reached exactly as far as the gap.", alt: "Cory has laid three blocks end to end and keeps his three spare blocks in a small stack.", vocab: { impressive: "making you stop and look because something seems special" }, wonder: "How many blocks are left after Cory sets out three?" },
      { title: "Two tracks", text: "The cart had two rows of wheels. One narrow track would not hold both. Cory made a second row of three blocks beside the first. Three and three made six. Both tracks reached the far bank. He nudged the blocks together until there were no gaps for a wheel to catch.", alt: "Six blocks form two parallel tracks of three across the toy river.", vocab: { nudged: "pushed something gently a little way" }, wonder: "Count three blocks in each row. How many altogether?" },
      { title: "Test, then travel", text: "Before loading the parcel, Cory rolled the empty cart onto his bridge. One block tipped. He moved its end farther onto the bank and tested again. This time the cart rolled smoothly. Cory grinned. Finding a wobble before the delivery was part of building something that worked.", alt: "Cory adjusts a tipping bridge block while testing the bridge with an empty cart.", vocab: { smoothly: "easily, without bumps or sudden stops" }, wonder: "Why did Cory test with an empty cart first?" },
      { title: "A light across the river", text: "Cory set the parcel in the cart and pushed it slowly across. Jeannie fitted the new lamp into the toy lighthouse. A warm circle shone over their block village. “Tomorrow,” she said, “we need a road.” Cory opened his building box. “First,” he said, “let's measure how far.”", alt: "Cory's cart reaches Jeannie at the glowing toy lighthouse across the finished bridge.", wonder: "Build a bridge for a toy. Test it, and change one thing if it wobbles." }
    ],
    ending: "The End. Six blocks, two tracks, and one bright idea. Cory measured, tested, and tried again.",
    questions: [
      { ask: "How many blocks were in the two tracks altogether?", choices: [["6️⃣", "Six: three plus three"], ["3️⃣", "Three"], ["9️⃣", "Nine"]] },
      { ask: "Why did Cory take down his tower?", choices: [["🌉", "He needed to reach across the river"], ["🎨", "He did not like its color"], ["📦", "The parcel was already delivered"]] },
      { ask: "What did Cory do when a block tipped?", choices: [["🛠️", "He adjusted it and tested again"], ["🏃", "He pushed the full cart faster"], ["🗑️", "He threw all the blocks away"]] }
    ]
  },
  {
    id: "kieran-moon-song", title: "Kieran and the Moon's Song", sticker: "🌙", color: "#76659b",
    style: "Stitched felt bedtime book", artStyle: "felt",
    pages: [
      { title: "Tap, tap", text: "Kieran sat on Mum's lap by the window. Rain tapped the glass. Tap, tap. Tap, tap. Kieran patted his blanket. Pat, pat. Mum smiled. “You heard a pattern.” Above the roof, the moon peeped through a little hole in the clouds.", alt: "Baby Kieran sits safely on Mum's lap under a quilt while rain taps the moonlit window.", vocab: { pattern: "something that repeats in a way you can notice" }, wonder: "Pat your knees gently: pat, pat. Pat, pat." },
      { title: "One soft sound", text: "Jeannie came in with a bedtime book. She turned one page. Swish. Kieran turned his head. Cory brushed the curtain with his hand. Swish. Two different things had made almost the same soft sound. Kieran smiled at both of them.", alt: "Jeannie turns a book page and Cory brushes a curtain beside Kieran and Mum.", wonder: "Can you make a quiet swishing sound?" },
      { title: "Loud and quiet", text: "Ellie hurried in. “I have a moon song!” she announced. Her first note was very loud. Kieran blinked and tucked into Mum. Ellie stopped. Then she tried a tiny humming sound. Kieran looked up again. A bedtime song needed room for little ears.", alt: "Ellie hums softly as Kieran settles against Mum beneath the moon window.", vocab: { humming: "singing softly with your lips closed" }, wonder: "Try a gentle hum. Can you make it even quieter?" },
      { title: "All together", text: "Rain went tap, tap. The page went swish. Ellie hummed one soft note. Cory waited, then patted the blanket twice. Tap, tap. Swish. Hmmm. Pat, pat. They made their little song again. This time Kieran lifted his hand just before the pats.", alt: "The family makes a quiet repeating rhythm around Kieran's patchwork blanket.", wonder: "What comes after the hum in their song?" },
      { title: "The quietest ending", text: "The rain slowed. The book closed. Kieran's hand rested on the blanket. Mum carried him to bed while the others whispered goodnight. Behind the clouds, the moon kept shining. Their song ended with the smallest sound of all: everyone listening to the quiet.", alt: "Mum holds sleepy Kieran beside his bed while the siblings say goodnight under a soft felt moon.", wonder: "Listen quietly together. What is the softest sound you can hear?" }
    ],
    ending: "The End. Goodnight, Kieran. Goodnight, Jeannie, Cory, and Ellie. Goodnight, little moon.",
    questions: [
      { ask: "What did Kieran copy at the window?", choices: [["🌧️", "The rain's tapping pattern"], ["🚗", "A racing car"], ["🔔", "A loud bell"]] },
      { ask: "What did Ellie change to help Kieran settle?", choices: [["🤫", "She hummed more quietly"], ["📣", "She sang louder"], ["💡", "She turned on every light"]] },
      { ask: "What came after the hum in the family song?", choices: [["👏", "Two gentle pats"], ["📖", "Three page turns"], ["🚪", "A slamming door"]] }
    ]
  }
];
