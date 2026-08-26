/* ===========================================================
   Music Lab — the tunes.
   -----------------------------------------------------------
   Every melody is written in plain letters so it is easy to
   read and easy to add to. One space between notes:

       "E4 D4 C4 | E4 D4 C4"

       C4 … E5     a note (letter + octave number)
       C#4         a black key (a sharp)
       C4:2        a note held for 2 beats  (default is 1)
       C4:0.5      a quick half-beat note (an eighth note)
       |           a bar line — only used to space out the
                   note-track on screen, it plays nothing

   Everything lives inside the piano's range (C4 → E5).
   Songs marked  tricky: true  use the black keys.
   All of these melodies are traditional / public domain.
   The list is ordered easiest → hardest.
   =========================================================== */

const SONGS = [
  {
    title: "Hot Cross Buns",
    emoji: "🥐",
    teaches: "3 notes: E D C",
    notes: "E4 D4 C4:2 | E4 D4 C4:2 | C4 C4 C4 C4 D4 D4 D4 D4 | E4 D4 C4:2"
  },
  {
    title: "The C Major Scale",
    emoji: "🪜",
    teaches: "all 7 letters, up then down",
    notes: "C4 D4 E4 F4 G4 A4 B4 C5:2 | C5 B4 A4 G4 F4 E4 D4 C4:2"
  },
  {
    title: "Mary Had a Little Lamb",
    emoji: "🐑",
    teaches: "steps up & down",
    notes: "E4 D4 C4 D4 | E4 E4 E4:2 | D4 D4 D4:2 | E4 G4 G4:2 | " +
           "E4 D4 C4 D4 | E4 E4 E4 E4 | D4 D4 E4 D4 | C4:2"
  },
  {
    title: "Twinkle, Twinkle",
    emoji: "⭐",
    teaches: "big jumps C → G",
    notes: "C4 C4 G4 G4 | A4 A4 G4:2 | F4 F4 E4 E4 | D4 D4 C4:2 | " +
           "G4 G4 F4 F4 | E4 E4 D4:2 | G4 G4 F4 F4 | E4 E4 D4:2 | " +
           "C4 C4 G4 G4 | A4 A4 G4:2 | F4 F4 E4 E4 | D4 D4 C4:2"
  },
  {
    title: "Row, Row, Row Your Boat",
    emoji: "🚣",
    teaches: "a climbing scale",
    notes: "C4 C4 C4 D4 | E4:2 D4 E4 | F4 G4:2 | " +
           "C5 C5 C5 G4 G4 G4 E4 E4 E4 C4 C4 C4 | G4 F4 E4 D4 C4:2"
  },
  {
    title: "Frère Jacques",
    emoji: "🔔",
    teaches: "repeating patterns",
    notes: "C4 D4 E4 C4 | C4 D4 E4 C4 | E4 F4 G4:2 | E4 F4 G4:2 | " +
           "G4 A4 G4 F4 E4 C4 | G4 A4 G4 F4 E4 C4 | C4 G4 C4:2 | C4 G4 C4:2"
  },
  {
    title: "London Bridge",
    emoji: "🌉",
    teaches: "notes above & below G",
    notes: "G4 A4 G4 F4 | E4 F4 G4:2 | D4 E4 F4:2 | E4 F4 G4:2 | " +
           "G4 A4 G4 F4 | E4 F4 G4:2 | D4:2 G4:2 | E4 C4:2"
  },
  {
    title: "This Old Man",
    emoji: "🦴",
    teaches: "a five-note run down",
    notes: "G4 E4 G4 | G4 E4 G4 | A4 G4 F4 E4 D4:2 | E4 F4 G4:2 | " +
           "C4 D4 E4 F4 G4:2 | G4 D4 E4 F4 E4 D4 C4:2"
  },
  {
    title: "Old MacDonald",
    emoji: "🐄",
    teaches: "the same line, twice",
    notes: "C4 C4 C4 G4 A4 A4 G4:2 | E4 E4 D4 D4 C4:2 | " +
           "C4 C4 C4 G4 A4 A4 G4:2 | E4 E4 D4 D4 C4:2 | " +
           "G4 G4 C4 C4 C4 | G4 G4 C4 C4 C4 | " +
           "C4 C4 C4 G4 A4 A4 G4:2 | E4 E4 D4 D4 C4:2"
  },
  {
    title: "When the Saints Go Marching In",
    emoji: "🎺",
    teaches: "skipping notes",
    notes: "C4 E4 F4 G4:2 | C4 E4 F4 G4:2 | C4 E4 F4 G4:2 E4 | " +
           "C4 E4 D4:2 | E4 E4 D4 C4 | C4 E4 G4 G4 F4:2 | E4 F4 G4 E4 | C4 D4 C4:2"
  },
  {
    title: "Itsy Bitsy Spider",
    emoji: "🕷️",
    teaches: "a long tune with a story",
    notes: "G4 C4 C4 C4 D4 E4 E4:2 | E4 D4 C4 D4 E4 C4:2 | " +
           "E4 E4 F4 G4:2 | G4 F4 E4 F4 G4 E4:2 | " +
           "C4 C4 D4 E4:2 | E4 D4 C4 D4 E4 C4:2 | " +
           "C4 C4 C4 D4 E4 E4:2 | E4 D4 C4 D4 E4 C4:2"
  },
  {
    title: "Ode to Joy",
    emoji: "🎼",
    teaches: "Beethoven, one step at a time",
    notes: "E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | E4:1.5 D4:0.5 D4:2 | " +
           "E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | D4:1.5 C4:0.5 C4:2"
  },
  {
    title: "Happy Birthday",
    emoji: "🎂",
    teaches: "the octave jump C → C",
    notes: "C4:0.5 C4:0.5 D4 C4 F4 E4:2 | C4:0.5 C4:0.5 D4 C4 G4 F4:2 | " +
           "C4:0.5 C4:0.5 C5 A4 F4 E4 D4:2 | " +
           "A4:0.5 A4:0.5 A4 F4 G4 F4:2"
  },
  {
    title: "Jingle Bells",
    emoji: "🛷",
    teaches: "a long tune to remember",
    notes: "E4 E4 E4:2 | E4 E4 E4:2 | E4 G4 C4 D4 E4:2 | " +
           "F4 F4 F4 F4 | F4 E4 E4 E4 | E4 D4 D4 E4 D4:2 G4:2"
  },
  {
    title: "Oh! Susanna",
    emoji: "🎻",
    teaches: "quick notes, then a long one",
    notes: "C4:0.5 D4:0.5 E4 G4 G4 A4 G4 E4 | C4 D4 E4 E4 D4 C4 D4:2 | " +
           "C4:0.5 D4:0.5 E4 G4 G4 A4 G4 E4 | C4 D4 E4 E4 D4 D4 C4:2 | " +
           "F4 F4 A4 A4 A4 G4 E4 C4 | C4 D4 E4 E4 D4 C4 D4:2"
  },
  {
    title: "Amazing Grace",
    emoji: "🙏",
    teaches: "high notes & long holds",
    notes: "G4 C5:2 E5 | C5:2 E5 D5:3 | C5:2 A4 G4:3 | " +
           "G4 C5:2 E5 | C5:2 E5 D5:3 | E5:3"
  },
  {
    title: "Chromatic Climb",
    emoji: "🐛",
    teaches: "every key in a row — sharps too",
    tricky: true,
    notes: "C4 C#4 D4 D#4 E4 F4 F#4 G4 G#4 A4 A#4 B4 C5:2 | " +
           "C5 B4 A#4 A4 G#4 G4 F#4 F4 E4 D#4 D4 C#4 C4:2"
  },
  {
    title: "Für Elise",
    emoji: "🎩",
    teaches: "Beethoven's black-key tune",
    tricky: true,
    notes: "E5:0.5 D#5:0.5 E5:0.5 D#5:0.5 E5:0.5 B4:0.5 D5:0.5 C5:0.5 A4:2 | " +
           "C4:0.5 E4:0.5 A4:0.5 B4:2 | E4:0.5 G#4:0.5 B4:0.5 C5:2 | " +
           "E4:0.5 E5:0.5 D#5:0.5 E5:0.5 D#5:0.5 E5:0.5 B4:0.5 D5:0.5 C5:0.5 A4:2"
  }
];

/* Turn a melody string into [{note, beats}] — bar lines become
   {bar:true} markers so the on-screen note track can breathe. */
function parseSong(str) {
  return String(str).trim().split(/\s+/).map(function (tok) {
    if (tok === "|") return { bar: true };
    var bits = tok.split(":");
    var beats = bits[1] ? Number(bits[1]) : 1;
    if (!(beats > 0)) beats = 1;
    return { note: bits[0], beats: beats };
  });
}
