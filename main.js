
// document.body.style.backgroundColor = "red";
// find out intro modal

const introModal = document.getElementById("intro-modal");
// console.log(introModal);
// find modal close button
const introModalCloseButton = document.getElementById("intro-modal-close");
let audioReady = false;
// is the mouse button held?
//let mouseButtonDown = false;
// update our variable based on the mouse being held down
//window.addEventListener("mousedown", function(){
    //mouseButtonDown = true;
//});
//window.addEventListener("mouseup", function(){
    //mouseButtonDown = false;
//});

///////// Modal
// Show modal on page load
// browser loads html > browser loads js > js to open modal > user presses ok on modal > modal closes > audio init
// user can also close modal with escape key
introModal.showModal();
// when ok clicked, close modal
// audio starts from click
introModalCloseButton.addEventListener("click", async function closeIntroModal() {
    introModalCloseButton.disabled = true;
    try {
        await toneInit();
        introModal.close();
    } catch (error) {
        console.error("Audio could not start:", error);
        introModalCloseButton.textContent = "try starting audio again";
    } finally {
        introModalCloseButton.disabled = false;
    }
});

// stop esc from closing before intro
introModal.addEventListener("cancel", function (event) {
    if (!audioReady) { event.preventDefault(); }
});

// when dialog closes by whatever means, load audio system
introModal.addEventListener("close", toneInit);


// console.log(introModal);
// console.log("test");
// console.log(1 + 2);


///////// Tone
///////// Tone

const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "triangle" },
    envelope: { attack: 0.018, decay: 0.18, sustain: 0.45, release: 0.35 },
    volume: -13
});

const filter = new Tone.Filter(3000, "lowpass");

const reverb = new Tone.JCReverb(0.25);
reverb.wet.value = 0.12;

const output = new Tone.Gain(0.65);

const limiter = new Tone.Limiter(-6);

async function toneInit() {
    await Tone.start();
    if (audioReady) { return; }

    synth.chain(filter, reverb, output, limiter);
    limiter.toDestination();
    Tone.getContext().lookAhead = 0.025;

    audioReady = true;
}

// Keyboard player
// get letter key buttons
const keyboardKeys = document.querySelectorAll(".keyboard-key");
const pitchInfo = document.getElementById("pitch-info");
// semitones and octaves
const semitoneShifts = [-2, -1, 0, 1, 2];
const octaveShifts = [12, 0, -12];
let mouseColumn = 2;
let mouseRow = 1;
const heldNotes = new Map(); // letter -> the note it started with

// work out a note from its base note and a mouse area
function getMappedNote(baseNote, column = mouseColumn, row = mouseRow) {
    return Tone.Frequency(baseNote).transpose(semitoneShifts[column] + octaveShifts[row]).toNote();
}

// display the same notes as tiles when moved
function updateKeyboardHints() {
    for (const key of keyboardKeys) {
        const note = tileNote(getMappedNote(key.dataset.note));
        key.querySelector("small").textContent = note;
        key.setAttribute("aria-label", key.dataset.key + ", " + note);
    }
    updatePitchReadout();
}

function updatePitchReadout() {
    const shift = semitoneShifts[mouseColumn];
    const octave = octaveShifts[mouseRow] / 12;
    const horizontal = shift === 0 ? "original pitch" : signedNumber(shift) + (Math.abs(shift) === 1 ? " semitone" : " semitones");
    const vertical = octave === 0 ? "original octave" : signedNumber(octave) + " octave";
    pitchInfo.textContent = "X: " + horizontal + " \u00B7 Y: " + vertical;
}

// find pressed button
function findKeyboardKey(pressedKey) {
    const letter = pressedKey.toUpperCase();
    for (const key of keyboardKeys) {
        if (key.dataset.key === letter) {
            return key;
        }
    }
    return null;
}

// stop every sounding note and clear the key highlights
function releaseAllNotes() {
    heldNotes.clear();
    keyboardKeys.forEach(function (key) { key.classList.remove("active"); });
    synth.releaseAll();
}

// only want to b true while key is held down
function handleKeyDown(e) {
    const letter = e.key.toUpperCase();
    if (!audioReady || introModal.open || e.repeat || e.ctrlKey || e.altKey || e.metaKey || heldNotes.has(letter)) { return; }
    const key = findKeyboardKey(letter);
    if (key === null) { return; }
    e.preventDefault();
    key.classList.add("active");

    if (round.phase === "playing") {
        heldNotes.set(letter, null);
        const madeIt = round.attempt(letter, pointer, gridBounds, performance.now());
        consumeEvents();
        if (!madeIt && round.orb !== null) {
            setMessage("Hover inside the circle and press " + round.orb.entry.key + ". You can try again before it disappears.");
        }
        return;
    }
    const note = getMappedNote(key.dataset.note);
    // two letters can reach the same pitch after the mouse moves
    if (![...heldNotes.values()].includes(note)) { synth.triggerAttack(note); }
    heldNotes.set(letter, note);
    key.classList.add("active");
}

// stop the note when let go
function handleKeyUp(e) {
    const letter = e.key.toUpperCase();
    if (!heldNotes.has(letter)) { return; }
    const note = heldNotes.get(letter);
    heldNotes.delete(letter);
    const key = findKeyboardKey(letter);
    if (key !== null) { key.classList.remove("active"); }
    // keep the sound going if another held letter still uses this note
    if (note !== null && ![...heldNotes.values()].includes(note)) { synth.triggerRelease(note); }
}

// stop stuck notes if the window loses focus
window.addEventListener("blur", releaseAllNotes);

window.addEventListener("keydown", handleKeyDown);
window.addEventListener("keyup", handleKeyUp);

// Mouse player
// canvas
const mouseCanvas = document.getElementById("mouse-canvas");
const canvasContext = mouseCanvas.getContext("2d");

mouseCanvas.style.cursor = "crosshair";

const canvasFont = '"Nunito Sans", sans-serif';

let gridBounds = { x: 0, y: 0, width: 0, height: 0 };

function updateGridBounds() {
    const canvasRect = mouseCanvas.getBoundingClientRect();
    const header = document.querySelector("header");
    const headerBottom = header === null ? 0 : header.getBoundingClientRect().bottom - canvasRect.top;
    const message = document.getElementById("round-message");
    const messageTop = message === null ? mouseCanvas.height - 150 : message.getBoundingClientRect().top - canvasRect.top;
    const side = Math.max(40, mouseCanvas.width * 0.06);
    const top = Math.max(100, headerBottom + 50);
    gridBounds = {
        x: side,
        y: top,
        width: Math.max(150, mouseCanvas.width - side * 2),
        height: Math.max(100, messageTop - top - 25)
    };
}

function resizeCanvas() {
    if (mouseCanvas.clientWidth === 0 || mouseCanvas.clientHeight === 0) { return; }
    mouseCanvas.width = mouseCanvas.clientWidth;
    mouseCanvas.height = mouseCanvas.clientHeight;
    updateGridBounds();
    drawFrame();
}

function tileNote(note) {
    return note.replace("#", "\u266F");
}

// "up 1 semitone, octave down" in plain words
function describeShift(column, row) {
    const semitones = semitoneShifts[column];
    const parts = [];
    if (semitones !== 0) {
        parts.push((semitones > 0 ? "up " : "down ") + Math.abs(semitones) + (Math.abs(semitones) === 1 ? " semitone" : " semitones"));
    }
    if (octaveShifts[row] !== 0) {
        parts.push(octaveShifts[row] > 0 ? "octave up" : "octave down");
    }
    return parts.length === 0 ? "original pitch" : parts.join(", ");
}

function signedNumber(value) {
    return value > 0 ? "+" + value : value < 0 ? "\u2212" + Math.abs(value) : "0";
}

// canvas highlights
function drawPitchGrid() {
    const bounds = gridBounds;
    const cellWidth = bounds.width / semitoneShifts.length;
    const cellHeight = bounds.height / octaveShifts.length;
    const gap = 6;
    const lowest = semitoneShifts[0] + octaveShifts[octaveShifts.length - 1];
    const highest = semitoneShifts[semitoneShifts.length - 1] + octaveShifts[0];

    canvasContext.clearRect(0, 0, mouseCanvas.width, mouseCanvas.height);
    canvasContext.textAlign = "center";
    canvasContext.textBaseline = "middle";

    // tiles
    for (let row = 0; row < octaveShifts.length; row++) {
        for (let column = 0; column < semitoneShifts.length; column++) {
            const x = bounds.x + column * cellWidth + gap / 2;
            const y = bounds.y + row * cellHeight + gap / 2;
            const width = cellWidth - gap;
            const height = cellHeight - gap;
            const isActive = column === mouseColumn && row === mouseRow;
            const pitch = (semitoneShifts[column] + octaveShifts[row] - lowest) / (highest - lowest);
            const note = tileNote(getMappedNote("C4", column, row));

            canvasContext.save();
            canvasContext.beginPath();
            canvasContext.roundRect(x, y, width, height, 14);
            if (isActive) {
                canvasContext.shadowColor = "rgba(110, 231, 213, 0.55)";
                canvasContext.shadowBlur = 28;
                canvasContext.fillStyle = "hsl(172, 65%, 68%)";
            } else {
                canvasContext.fillStyle = "hsl(180, 40%, " + (11 + pitch * 20) + "%)";
            }
            canvasContext.fill();
            canvasContext.restore();

            // hide orb text so its easier to read
            const holdsOrb = round.phase === "playing" && round.orb !== null && round.orb.entry.column === column && round.orb.entry.row === row;
            if (holdsOrb) {
            // no text here while the orb is on this tile
            } else if (isActive) {
                canvasContext.fillStyle = "#08191c";
                canvasContext.font = "800 " + Math.max(24, Math.min(64, height * 0.3)) + "px " + canvasFont;
                canvasContext.fillText(note, x + width / 2, y + height / 2 - 8, width - 10);
                canvasContext.font = "600 " + Math.max(11, Math.min(15, width / 14)) + "px " + canvasFont;
                canvasContext.fillText(describeShift(column, row), x + width / 2, y + height / 2 + Math.min(34, height * 0.2), width - 10);
            } else {
                canvasContext.fillStyle = "rgba(190, 240, 232, 0.4)";
                canvasContext.font = "700 " + Math.max(12, Math.min(22, height * 0.14)) + "px " + canvasFont;
                canvasContext.fillText(note, x + width / 2, y + height / 2, width - 10);
            }
        }
    }

    // scale across the top: semitones
    canvasContext.font = "700 14px " + canvasFont;
    for (let column = 0; column < semitoneShifts.length; column++) {
        canvasContext.fillStyle = column === mouseColumn ? "hsl(172, 65%, 68%)" : "rgba(190, 240, 232, 0.45)";
        canvasContext.fillText(signedNumber(semitoneShifts[column]), bounds.x + (column + 0.5) * cellWidth, bounds.y - 14);
    }
    canvasContext.fillStyle = "rgba(190, 240, 232, 0.45)";
    canvasContext.font = "600 12px " + canvasFont;
    canvasContext.textAlign = "center";
    canvasContext.fillText("semitones", bounds.x + bounds.width / 2, bounds.y - 36);

    // scale down the left: octaves
    canvasContext.textAlign = "right";
    for (let row = 0; row < octaveShifts.length; row++) {
        canvasContext.fillStyle = row === mouseRow ? "hsl(172, 65%, 68%)" : "rgba(190, 240, 232, 0.45)";
        canvasContext.font = "700 14px " + canvasFont;
        canvasContext.fillText(signedNumber(octaveShifts[row] / 12), bounds.x - 12, bounds.y + (row + 0.5) * cellHeight);
    }
    canvasContext.save();
    canvasContext.translate(bounds.x - 34, bounds.y + bounds.height / 2);
    canvasContext.rotate(-Math.PI / 2);
    canvasContext.textAlign = "center";
    canvasContext.fillStyle = "rgba(190, 240, 232, 0.45)";
    canvasContext.font = "600 12px " + canvasFont;
    canvasContext.fillText("octave", 0, 0);
    canvasContext.restore();
}

// where the mouse is
let pointer = { x: 0, y: 0, inside: false };

// draw the orb
function drawOrb() {
    if (round.phase !== "playing" || round.orb === null) { return; }
    const entry = round.orb.entry;
    const target = Game.orbGeometry(entry, gridBounds);

    canvasContext.save();
    canvasContext.shadowColor = "rgba(255, 184, 76, 0.75)";
    canvasContext.shadowBlur = 26;
    canvasContext.fillStyle = "hsl(38, 96%, 62%)";
    canvasContext.beginPath();
    canvasContext.arc(target.x, target.y, target.radius, 0, Math.PI * 2);
    canvasContext.fill();
    canvasContext.restore();

    canvasContext.fillStyle = "#2b1a00";
    canvasContext.textAlign = "center";
    canvasContext.textBaseline = "middle";
    canvasContext.font = "800 " + Math.round(target.radius * 1.05) + "px " + canvasFont;
    canvasContext.fillText(entry.key, target.x, target.y + 1);
}

function drawFrame() {
    drawPitchGrid();
    drawOrb();
}

// the mouse area picks the pitch
function handleMouseMove(e) {
    if (mouseCanvas.width === 0 || mouseCanvas.height === 0) { return; }
    const bounds = gridBounds;
    pointer.x = e.offsetX;
    pointer.y = e.offsetY;
    pointer.inside = pointer.x >= bounds.x && pointer.x <= bounds.x + bounds.width && pointer.y >= bounds.y && pointer.y <= bounds.y + bounds.height;

    const column = Math.max(0, Math.min(semitoneShifts.length - 1, Math.floor((pointer.x - bounds.x) / bounds.width * semitoneShifts.length)));
    const row = Math.max(0, Math.min(octaveShifts.length - 1, Math.floor((pointer.y - bounds.y) / bounds.height * octaveShifts.length)));
    if (column === mouseColumn && row === mouseRow) { return; }
    mouseColumn = column;
    mouseRow = row;
    updateKeyboardHints();
}

mouseCanvas.addEventListener("mousemove", handleMouseMove);
mouseCanvas.addEventListener("mouseleave", function () { pointer.inside = false; });
new ResizeObserver(resizeCanvas).observe(mouseCanvas);
document.fonts.ready.then(resizeCanvas);

updateKeyboardHints();

///////// songs and header
const Game = window.TWOGETHER_GAME;
const songSelect = document.getElementById("song-select");
const songProgress = document.getElementById("song-progress");
const helpButton = document.getElementById("help-button");
const songs = window.TWOGETHER_SONGS;
const scoreValue = document.getElementById("score-value");
const roundMessage = document.getElementById("round-message");
const playButton = document.getElementById("play-button");
const restartButton = document.getElementById("restart-button");

let selectedSong = songs[0];
let round = new Game.Round(selectedSong);

// fill the song dropdown from songs.js
for (const song of songs) {
    const option = document.createElement("option");
    option.value = song.id;
    option.textContent = song.title;
    songSelect.append(option);
}

function setMessage(text) {
    if (roundMessage.textContent !== text) { roundMessage.textContent = text; }
}

function updateScore() {
    scoreValue.textContent = round.score;
    songProgress.textContent = round.index + " / " + round.chart.length + " notes";
}

function updateControls() {
    const active = round.phase === "playing";
    playButton.disabled = active;
    restartButton.disabled = round.phase === "ready";
    songSelect.disabled = active;
    helpButton.disabled = active;
}

// react to what the round says happened (new circle, hit, miss, finished)
function consumeEvents() {
    const events = round.takeEvents();
    if (events.length === 0) { return; }
    for (const event of events) {
        if (event.type === "spawn") {
            setMessage("Move into the circle, then press " + event.entry.key + ".");
        } else if (event.type === "hit") {
            // the pitch comes from the key AND the mouse area, so the note can be wrong-sounding if they don't match
            synth.triggerAttackRelease(Game.midiToNote(event.playedMidi), Math.max(0.12, event.entry.duration * 0.9));
            setMessage("Made it! +100. Next note\u2026");
        } else if (event.type === "miss") {
            setMessage("Missed this one. Keep going.");
        } else if (event.type === "finished") {
            setMessage("Song finished. You made " + round.hits + " of " + round.chart.length + " notes.");
        }
    }
    updateScore();
    updateControls();
}

function beginGame() {
    if (!audioReady) {
        introModal.showModal();
        return;
    }
    if (document.activeElement) { document.activeElement.blur(); }
    releaseAllNotes();
    round = new Game.Round(selectedSong);
    round.start(performance.now());
    consumeEvents();
}

// go back to a fresh round for the chosen song
function resetRound() {
    releaseAllNotes();
    round = new Game.Round(selectedSong);
    setMessage("Choose a song and press Play. You can try the notes first.");
    updateScore();
    updateControls();
}

songSelect.addEventListener("change", function () {
    selectedSong = songs.find(function (song) { return song.id === songSelect.value; });
    resetRound();
    songSelect.blur();
});

helpButton.addEventListener("click", function () {
    introModal.showModal();
});

playButton.addEventListener("click", beginGame);
restartButton.addEventListener("click", beginGame);

// game loop
function gameLoop() {
    if (round.phase === "playing") {
        round.advance(performance.now());
        consumeEvents();
    }
    drawFrame();
    requestAnimationFrame(gameLoop);
}

updateScore();
updateControls();
requestAnimationFrame(gameLoop);