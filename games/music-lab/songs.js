/* ===========================================================
   Music Lab — the tunes.
   -----------------------------------------------------------
   Every melody is written in plain letters so it is easy to
   read and easy to add to. One space between notes:

       "E4 D4 C4 | E4 D4 C4"

       C4 … E5     a note (letter + octave number)
       C4:2        a note held for 2 beats  (default is 1)
       |           a bar line — only used to space out the
                   note-track on screen, it plays nothing

   Everything lives inside the piano's range (C4 → E5) and uses
   no sharps or flats, so a kid can always find the next key.
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
    title: "When the Saints Go Marching In",
    emoji: "🎺",
    teaches: "skipping notes",
    notes: "C4 E4 F4 G4:2 | C4 E4 F4 G4:2 | C4 E4 F4 G4:2 E4 | " +
           "C4 E4 D4:2 | E4 E4 D4 C4 | C4 E4 G4 G4 F4:2 | E4 F4 G4 E4 | C4 D4 C4:2"
  },
  {
    title: "Ode to Joy",
    emoji: "🎼",
    teaches: "Beethoven, one step at a time",
    notes: "E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | E4:2 D4 D4:2 | " +
           "E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4 | D4:2 C4 C4:2"
  },
  {
    title: "Happy Birthday",
    emoji: "🎂",
    teaches: "the octave jump C → C",
    notes: "C4 C4 D4 C4 F4 E4:2 | C4 C4 D4 C4 G4 F4:2 | " +
           "C4 C4 C5 A4 F4 G4 F4:2"
  },
  {
    title: "Jingle Bells",
    emoji: "🛷",
    teaches: "a long tune to remember",
    notes: "E4 E4 E4:2 | E4 E4 E4:2 | E4 G4 C4 D4 E4:2 | " +
           "F4 F4 F4 F4 | F4 E4 E4 E4 | E4 D4 D4 E4 D4:2 G4:2"
  }
];

/* Turn a melody string into [{note, beats}] — bar lines become
   {bar:true} markers so the on-screen note track can breathe. */
function parseSong(str) {
  return String(str).trim().split(/\s+/).map(function (tok) {
    if (tok === "|") return { bar: true };
    var bits = tok.split(":");
    return { note: bits[0], beats: bits[1] ? Number(bits[1]) : 1 };
  });
}
