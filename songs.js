// the three songs in my game
(function (root) {
  const twinkleA = [["C3",1],["C3",1],["G3",1],["G3",1],["A3",1],["A3",1],["G3",2]];
  const twinkleB = [["F3",1],["F3",1],["E3",1],["E3",1],["D3",1],["D3",1],["C3",2]];
  const twinkleC = [["G3",1],["G3",1],["F3",1],["F3",1],["E3",1],["E3",1],["D3",2]];
  const joyA = [["E4",1],["E4",1],["F4",1],["G4",1],["G4",1],["F4",1],["E4",1],["D4",1],["C4",1],["C4",1],["D4",1],["E4",1],["E4",1.5],["D4",0.5],["D4",2]];
  const joyB = [...joyA.slice(0,12),["D4",1.5],["C4",0.5],["C4",2]];
  const joyC = [["D4",1],["D4",1],["E4",1],["C4",1],["D4",1],["E4",0.5],["F4",0.5],["E4",1],["C4",1],["D4",1],["E4",0.5],["F4",0.5],["E4",1],["D4",1],["C4",1],["D4",1],["G3",2]];
  const frereA = [["C5",1],["D5",1],["E5",1],["C5",1]];
  const frereB = [["E5",1],["F5",1],["G5",2]];
  const frereC = [["G5",0.5],["A5",0.5],["G5",0.5],["F5",0.5],["E5",1],["C5",1]];
  const frereD = [["C5",1],["G4",1],["C5",2]];

  const songs = [
    { id: "twinkle", title: "Twinkle Twinkle", description: "A familiar melody in a lower octave.", bpm: 96, melody: [...twinkleA,...twinkleB,...twinkleC,...twinkleC,...twinkleA,...twinkleB] },
    { id: "ode", title: "Ode to Joy", description: "Beethoven's theme, with a few lower notes.", bpm: 104, melody: [...joyA,...joyB,...joyC,...joyB] },
    { id: "frere", title: "Frère Jacques", description: "A higher melody with a lower ending to each phrase.", bpm: 104, melody: [...frereA,...frereA,...frereB,...frereB,...frereC,...frereC,...frereD,...frereD] }
  ];
  root.TWOGETHER_SONGS = songs;
  if (typeof module !== "undefined" && module.exports) module.exports = songs;
})(typeof window === "undefined" ? globalThis : window);