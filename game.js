////// game controls
// score when key is pressed inside orb
(function (root) {
  "use strict";

  const keyNotes = [
    ["A",60],["S",62],["D",64],["F",65],["G",67],
    ["H",69],["J",71],["K",72],["L",74]
  ];
  const pitchShifts = [-2,-1,0,1,2];
  const octaveShifts = [12,0,-12];
  const clamp = (number, min, max) => Math.min(max, Math.max(min, number));
  const noteNames = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];

  function noteToMidi(note) {
    const match = /^([A-G])(#|b)?(-?\d+)$/.exec(note);
    if (!match) throw new Error("Invalid note: " + note);
    const natural = { C:0,D:2,E:4,F:5,G:7,A:9,B:11 }[match[1]];
    return (Number(match[3]) + 1) * 12 + natural + (match[2] === "#" ? 1 : match[2] === "b" ? -1 : 0);
  }

  function midiToNote(midi) {
    return noteNames[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1);
  }

  function zoneAt(x, y) {
    return {
      column: clamp(Math.floor(x * pitchShifts.length), 0, pitchShifts.length - 1),
      row: clamp(Math.floor(y * octaveShifts.length), 0, octaveShifts.length - 1)
    };
  }

  function mappedMidi(letter, column, row) {
    const key = keyNotes.find(item => item[0] === letter.toUpperCase());
    return key ? key[1] + pitchShifts[column] + octaveShifts[row] : null;
  }

  function makeChart(song) {
    let seed = [...song.id].reduce((value, letter) => value * 31 + letter.charCodeAt(0), 7) >>> 0;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    let previous;
    return song.melody.map(([note, beats], index) => {
      const midi = noteToMidi(note);
      const options = [];
      for (let row = 0; row < octaveShifts.length; row++) {
        for (let column = 0; column < pitchShifts.length; column++) {
          for (const [key] of keyNotes) {
            if (mappedMidi(key, column, row) === midi) options.push({ key, column, row });
          }
        }
      }
      if (!options.length) throw new Error(`${note} cannot be reached by this keyboard and X/Y map.`);
      // try and get a different spawn area for the orb
      const alternatives = options.filter(option => !previous || option.column !== previous.column || option.row !== previous.row);
      const choices = alternatives.length ? alternatives : options;
      let mapping = choices[Math.floor(random() * choices.length)];

      if (song.id === "twinkle" && index === 0) mapping = options.find(option => option.key === "A" && option.column === 2 && option.row === 2);
      previous = mapping;
      return { ...mapping, note, midi, beats, duration: beats * 60 / song.bpm, jitterX: random() * 2 - 1, jitterY: random() * 2 - 1, index };
    });
  }

  function orbGeometry(entry, bounds) {
    const cellWidth = bounds.width / pitchShifts.length;
    const cellHeight = bounds.height / octaveShifts.length;
    const radius = Math.max(6, Math.min(34, cellWidth * 0.34, cellHeight * 0.29));
    const marginX = Math.max(0, cellWidth / 2 - radius - 7);
    const marginY = Math.max(0, cellHeight / 2 - radius - 7);
    return {
      x: bounds.x + (entry.column + 0.5) * cellWidth + entry.jitterX * marginX * 0.7,
      y: bounds.y + (entry.row + 0.5) * cellHeight + entry.jitterY * marginY * 0.7,
      radius
    };
  }

  class Round {
    constructor(song) {
      this.song = song;
      this.chart = makeChart(song);
      this.phase = "ready";
      this.score = 0;
      this.hits = 0;
      this.misses = 0;
      this.index = 0;
      this.orb = null;
      this.nextAt = 0;
      this.pausedAt = 0;
      this.events = [];
    }

    start(now) {
      this.phase = "playing";
      this.nextAt = now;
      this.advance(now);
    }

    advance(now) {
      if (this.phase !== "playing") return;
      if (this.orb && now > this.orb.deadline) {
        this.misses++;
        this.events.push({ type:"miss", entry:this.orb.entry });
        this.orb = null;
        this.index++;
        this.nextAt = now + 160;
      }
      if (this.index >= this.chart.length) {
        this.phase = "finished";
        this.events.push({ type:"finished" });
      } else if (!this.orb && now >= this.nextAt) {
        this.orb = { entry:this.chart[this.index], startedAt:now, deadline:now + 3000 };
        this.events.push({ type:"spawn", entry:this.orb.entry });
      }
    }

    attempt(letter, pointer, bounds, now) {
      // check deadline
      this.advance(now);
      if (this.phase !== "playing" || !this.orb) return false;
      const { entry } = this.orb;
      const target = orbGeometry(entry, bounds);
      const dx = pointer.x - target.x;
      const dy = pointer.y - target.y;
      const zone = zoneAt((pointer.x - bounds.x) / bounds.width, (pointer.y - bounds.y) / bounds.height);
      if (!pointer.inside || dx * dx + dy * dy > target.radius * target.radius || letter.toUpperCase() !== entry.key || mappedMidi(letter, zone.column, zone.row) !== entry.midi) return false;
      this.score += 100;
      this.hits++;
      this.events.push({ type:"hit", entry, target, playedMidi:mappedMidi(letter, zone.column, zone.row) });
      this.orb = null;
      this.index++;
      // preserves written note lengths without precise timing
      this.nextAt = now + entry.duration * 1000;
      if (this.index >= this.chart.length) {
        this.phase = "finished";
        this.events.push({ type:"finished" });
      }
      return true;
    }

    pause(now) {
      if (this.phase !== "playing") return;
      this.advance(now);
      if (this.phase !== "playing") return;
      this.phase = "paused";
      this.pausedAt = now;
    }

    resume(now) {
      if (this.phase !== "paused") return;
      const pausedFor = now - this.pausedAt;
      if (this.orb) { this.orb.startedAt += pausedFor; this.orb.deadline += pausedFor; }
      this.nextAt += pausedFor;
      this.phase = "playing";
    }

    remaining(now) {
      return this.orb ? Math.max(0, this.orb.deadline - (this.phase === "paused" ? this.pausedAt : now)) : 0;
    }

    takeEvents() { const events = this.events; this.events = []; return events; }
  }

  const api = { keyNotes, pitchShifts, octaveShifts, noteToMidi, midiToNote, zoneAt, mappedMidi, makeChart, orbGeometry, Round };
  root.TWOGETHER_GAME = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window === "undefined" ? globalThis : window);
