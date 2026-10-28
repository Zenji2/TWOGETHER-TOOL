
// document.body.style.backgroundColor = "red";
// find out intro modal

const introModal = document.getElementById("intro-modal");
// console.log(introModal);
// find modal close button
const introModalCloseButton = document.getElementById("intro-modal-close");
const resultModal = document.getElementById("result-modal");
const soundError = document.getElementById("sound-error");
// debugging sound errors
if (typeof Tone === "undefined") {
    soundError.textContent = "Keep the vendor folder beside index.html and reload to enable the sound.";
    soundError.hidden = false;
    introModal.showModal();
    throw new Error("Tone.js is missing. Keep the vendor folder beside index.html.");
}
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
    soundError.hidden = true;
    try {
        await toneInit();
        introModal.close();
        mouseCanvas.focus({ preventScroll: true });
    } catch (error) {
        console.error("Audio could not start:", error);
        soundError.textContent = "Sound could not start. Check your browser's sound permissions and output device, then try again.";
        soundError.hidden = false;
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

let audioPromise = null;

async function toneInit() {
    const resume = Tone.start();
    if (audioReady) { await resume; return; }
    if (audioPromise !== null) { return audioPromise; }
    audioPromise = (async function () {
        let timer;
        try {
            // give up after 8 seconds if the browser never turns the sound on
            await Promise.race([resume, new Promise(function (resolve, reject) {
                timer = setTimeout(function () { reject(new Error("audio-output-unavailable")); }, 8000);
            })]);
            synth.chain(filter, reverb, output, limiter);
            limiter.toDestination();
            Tone.getContext().lookAhead = 0.025;
            audioReady = true;
        } finally {
            clearTimeout(timer);
            audioPromise = null;
        }
    })();
    return audioPromise;
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
    if (introModal.open || resultModal.open) { return; }
    if (e.key === "Escape") {
        stopPreview();
        pauseGame();
        return;
    }
    const letter = e.key.toUpperCase();
    if (!audioReady || e.repeat || e.ctrlKey || e.altKey || e.metaKey || heldNotes.has(letter)) { return; }
    const key = findKeyboardKey(letter);
    if (key === null) { return; }
    e.preventDefault();
    if (round.phase === "paused" || preview !== null) { return; }
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
function handleFocusLost() {
    releaseAllNotes();
    stopPreview();
    pauseGame();
    pointer.inside = false;
}

window.addEventListener("blur", handleFocusLost);
document.addEventListener("visibilitychange", function () {
    if (document.hidden) { handleFocusLost(); }
});

// the letter keys can also be clicked to test a note
keyboardKeys.forEach(function (key) {
    key.addEventListener("click", function () {
        if (audioReady && preview === null && round.phase !== "playing" && round.phase !== "paused" && !resultModal.open) {
            synth.triggerAttackRelease(getMappedNote(key.dataset.note), 0.25);
        }
    });
});
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
    const messageTop = message === null ? canvasHeight - 150 : message.getBoundingClientRect().top - canvasRect.top;
    const side = canvasWidth < 580 ? 43 : Math.max(40, canvasWidth * 0.06);
    const top = Math.max(100, headerBottom + 50);
    gridBounds = {
        x: side,
        y: top,
        width: Math.max(150, canvasWidth - side * 2),
        height: Math.max(100, messageTop - top - 25)
    };
}

let canvasWidth = 0;
let canvasHeight = 0;

function resizeCanvas() {
    mouseCanvas.width = mouseCanvas.clientWidth;
    mouseCanvas.height = mouseCanvas.clientHeight;
    if (canvasWidth === 0 || canvasHeight === 0) { return; }
    // draw screen sharpness
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    mouseCanvas.width = Math.round(canvasWidth * ratio);
    mouseCanvas.height = Math.round(canvasHeight * ratio);
    canvasContext.setTransform(ratio, 0, 0, ratio, 0, 0);
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

    canvasContext.clearRect(0, 0, canvasWidth, canvasHeight);
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

// effects
let trail = [];   // recent mouse positions
let flash = null; // the "+100" or "Missed" popup
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
reducedMotion.addEventListener("change", function () { trail = []; });

// mouse trail
function drawTrail(now) {
    trail = trail.filter(function (point) { return now - point.time < 550; });
    for (const point of trail) {
        const life = 1 - (now - point.time) / 550;
        canvasContext.fillStyle = "rgba(255, 214, 140, " + life * 0.5 + ")";
        canvasContext.beginPath();
        canvasContext.arc(point.x, point.y, 1 + life * 4, 0, Math.PI * 2);
        canvasContext.fill();
    }
}

// draw the orb
function drawOrb(now) {
    if (round.phase !== "playing" || round.orb === null) { return; }
    const entry = round.orb.entry;
    const target = Game.orbGeometry(entry, gridBounds);
    const timeLeft = round.remaining(now) / 3000;
    const hovered = pointer.inside && Math.hypot(pointer.x - target.x, pointer.y - target.y) <= target.radius;

    // countdown ring
    canvasContext.strokeStyle = "rgba(255, 190, 90, 0.6)";
    canvasContext.lineWidth = 2;
    canvasContext.beginPath();
    if (reducedMotion.matches) {
        canvasContext.arc(target.x, target.y, target.radius + 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * timeLeft);
    } else {
        canvasContext.arc(target.x, target.y, target.radius + 5 + timeLeft * 18, 0, Math.PI * 2);
    }
    canvasContext.stroke();

    // orb highlights when mouse hovers over
    canvasContext.save();
    canvasContext.shadowColor = "rgba(255, 184, 76, " + (hovered ? 0.95 : 0.6) + ")";
    canvasContext.shadowBlur = hovered ? 38 : 22;
    canvasContext.fillStyle = hovered ? "hsl(40, 100%, 72%)" : "hsl(38, 96%, 58%)";
    canvasContext.beginPath();
    canvasContext.arc(target.x, target.y, target.radius, 0, Math.PI * 2);
    canvasContext.fill();
    if (hovered) {
        canvasContext.lineWidth = 3;
        canvasContext.strokeStyle = "#fff6e0";
        canvasContext.stroke();
    }
    canvasContext.restore();

    // key letter, note name and seconds left
    canvasContext.textAlign = "center";
    canvasContext.textBaseline = "middle";
    canvasContext.fillStyle = "#2b1a00";
    canvasContext.font = "800 " + Math.round(target.radius * 0.95) + "px " + canvasFont;
    canvasContext.fillText(entry.key, target.x, target.y - target.radius * 0.1);
    canvasContext.font = "700 " + Math.max(9, Math.round(target.radius * 0.34)) + "px " + canvasFont;
    canvasContext.fillText(tileNote(entry.note), target.x, target.y + target.radius * 0.55);
    canvasContext.fillStyle = "rgba(255, 224, 170, 0.9)";
    canvasContext.font = "700 12px " + canvasFont;
    canvasContext.fillText((round.remaining(now) / 1000).toFixed(1) + "s", target.x, target.y - target.radius - 28);
}

// fade +100 and missed
function drawFlash(now) {
    if (flash === null) { return; }
    const age = now - flash.startedAt;
    if (age > 650) {
        flash = null;
        return;
    }
    const fade = 1 - age / 650;
    const lift = reducedMotion.matches ? 0 : (1 - fade) * 22;
    canvasContext.save();
    canvasContext.globalAlpha = fade;
    canvasContext.shadowColor = "rgba(0, 0, 0, 0.45)";
    canvasContext.shadowBlur = 6;
    canvasContext.fillStyle = flash.good ? "#eafffb" : "hsl(8, 90%, 74%)";
    canvasContext.font = "800 22px " + canvasFont;
    canvasContext.textAlign = "center";
    canvasContext.textBaseline = "middle";
    canvasContext.fillText(flash.text, flash.x, flash.y - flash.radius - 8 - lift);
    canvasContext.restore();
}

// dim the grid while the song is paused
function drawPausedOverlay() {
    if (round.phase !== "paused") { return; }
    const bounds = gridBounds;
    canvasContext.fillStyle = "rgba(8, 25, 28, 0.78)";
    canvasContext.beginPath();
    canvasContext.roundRect(bounds.x, bounds.y, bounds.width, bounds.height, 14);
    canvasContext.fill();
    canvasContext.textAlign = "center";
    canvasContext.textBaseline = "middle";
    canvasContext.fillStyle = "#d9e5f2";
    canvasContext.font = "800 34px " + canvasFont;
    canvasContext.fillText("Paused", bounds.x + bounds.width / 2, bounds.y + bounds.height / 2 - 12);
    canvasContext.fillStyle = "rgba(190, 240, 232, 0.65)";
    canvasContext.font = "600 15px " + canvasFont;
    canvasContext.fillText("Press Resume when both of you are ready.", bounds.x + bounds.width / 2, bounds.y + bounds.height / 2 + 22);
}


function drawFrame() {
    const now = performance.now();
    drawPitchGrid();
    drawTrail(now);
    drawOrb(now);
    drawFlash(now);
    drawPausedOverlay();
}

// the mouse area picks the pitch
function handleMouseMove(e) {
    movePointer(e.offsetX, e.offsetY);
}

function movePointer(x, y) {    
    if (canvasWidth === 0 || canvasHeight === 0) { return; }
    const bounds = gridBounds;
    pointer.x = x;
    pointer.y = y;
    pointer.inside = pointer.x >= bounds.x && pointer.x <= bounds.x + bounds.width && pointer.y >= bounds.y && pointer.y <= bounds.y + bounds.height;

    if (pointer.inside && !reducedMotion.matches) {
        trail.push({ x: pointer.x, y: pointer.y, time: performance.now() });
        if (trail.length > 30) { trail.shift(); }
    }

    const column = Math.max(0, Math.min(semitoneShifts.length - 1, Math.floor((pointer.x - bounds.x) / bounds.width * semitoneShifts.length)));
    const row = Math.max(0, Math.min(octaveShifts.length - 1, Math.floor((pointer.y - bounds.y) / bounds.height * octaveShifts.length)));
    if (column === mouseColumn && row === mouseRow) { return; }
    mouseColumn = column;
    mouseRow = row;
    updateKeyboardHints();
}

// arrow keys can move the pointer when the canvas is focused
mouseCanvas.addEventListener("keydown", function (e) {
    const moves = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (!moves[e.key] || e.ctrlKey || e.altKey || e.metaKey) { return; }
    e.preventDefault();
    const bounds = gridBounds;
    if (!pointer.inside) {
        pointer.x = bounds.x + bounds.width / 2;
        pointer.y = bounds.y + bounds.height / 2;
    }
    const step = e.shiftKey ? 30 : 8;
    movePointer(
        Math.max(bounds.x, Math.min(bounds.x + bounds.width, pointer.x + moves[e.key][0] * step)),
        Math.max(bounds.y, Math.min(bounds.y + bounds.height, pointer.y + moves[e.key][1] * step))
    );
});

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
const pauseButton = document.getElementById("pause-button");
const listenButton = document.getElementById("listen-button");

let selectedSong = songs[0];
let round = new Game.Round(selectedSong);
let preview = null;
let previewVersion = 0;

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
    const active = round.phase === "playing" || round.phase === "paused";
    playButton.disabled = active;
    pauseButton.disabled = !active;
    pauseButton.textContent = round.phase === "paused" ? "Resume" : "Pause";
    restartButton.disabled = round.phase === "ready" || preview !== null;
    listenButton.disabled = active;
    listenButton.textContent = preview !== null ? "Stop listening" : "Listen";
    songSelect.disabled = active;
}

// results dialog at end of song
function showResults() {
    document.getElementById("result-song").textContent = round.song.title;
    document.getElementById("result-score").textContent = round.score;
    document.getElementById("maximum-score").textContent = round.chart.length * 100;
    document.getElementById("result-notes").textContent = round.hits + " notes made \u00B7 " + round.misses + " missed";
    document.getElementById("result-message").textContent = round.misses === 0
        ? "You played every note of the melody together!"
        : "Try again to fill in the missing notes, or choose another song.";
    // let last note finish
    heldNotes.clear();
    keyboardKeys.forEach(function (key) { key.classList.remove("active"); });
    if (!resultModal.open) { resultModal.showModal(); }
}

// pop score number
let scorePopTimer = null;
function popScore() {
    clearTimeout(scorePopTimer);
    scoreValue.classList.remove("scored");
    void scoreValue.offsetWidth; // lets the animation start again
    scoreValue.classList.add("scored");
    scorePopTimer = setTimeout(function () { scoreValue.classList.remove("scored"); }, 600);
}

// react to what the round says happened (new circle, hit, miss, finished)
function consumeEvents() {
    const events = round.takeEvents();
    if (events.length === 0) { return; }
    for (const event of events) {
        if (event.type === "spawn") {
            setMessage("Move into the circle, then press " + event.entry.key + ".");
        } else if (event.type === "hit") {
            synth.triggerAttackRelease(Game.midiToNote(event.playedMidi), Math.max(0.12, event.entry.duration * 0.9));
            flash = { x: event.target.x, y: event.target.y, radius: event.target.radius, text: "+100", good: true, startedAt: performance.now() };
            popScore();
            setMessage("Made it! +100. Next note\u2026");
        } else if (event.type === "miss") {
            const spot = Game.orbGeometry(event.entry, gridBounds);
            flash = { x: spot.x, y: spot.y, radius: spot.radius, text: "Missed", good: false, startedAt: performance.now() };
            setMessage("Missed this one. Keep going.");
        } else if (event.type === "finished") {
            setMessage("Song finished. You made " + round.hits + " of " + round.chart.length + " notes.");
            showResults();
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
    mouseCanvas.focus({ preventScroll: true });
    stopPreview();
    releaseAllNotes();
    if (resultModal.open) { resultModal.close(); }
    flash = null;
    round = new Game.Round(selectedSong);
    round.start(performance.now());
    consumeEvents();
}

function pauseGame() {
    if (round.phase === "playing") {
        round.pause(performance.now());
        releaseAllNotes();
        consumeEvents();
        if (round.phase === "paused") {
            setMessage("Paused. Press Resume when both of you are ready.");
        }
    }
    updateControls();
}

function resumeGame() {
    round.resume(performance.now());
    setMessage(round.orb !== null ? "Move into the circle, then press " + round.orb.entry.key + "." : "Next note\u2026");
    updateControls();
}

// stop the melody preview
function stopPreview() {
    previewVersion++;
    if (preview === null) { return; }
    preview.part.dispose();
    Tone.Transport.stop();
    Tone.Transport.cancel();
    preview = null;
    releaseAllNotes();
    setMessage("Listening stopped. Press Play when you're ready.");
    updateControls();
}

// listen to the song once
function listenToSong() {
    if (preview !== null) {
        stopPreview();
        setMessage("Choose a song and press Play. You can try the notes first.");
        return;
    }
    if (!audioReady) {
        introModal.showModal();
        return;
    }
    releaseAllNotes();
    const song = selectedSong;
    const version = ++previewVersion;
    let seconds = 0;
    const notes = song.melody.map(function (item) {
        const entry = { time: seconds, note: item[0], duration: item[1] * 60 / song.bpm };
        seconds += entry.duration;
        return entry;
    });

    Tone.Transport.stop();
    Tone.Transport.cancel();
    Tone.Transport.position = 0;
    preview = { song: song, part: null };
    preview.part = new Tone.Part(function (time, event) {
        synth.triggerAttackRelease(event.note, event.duration * 0.9, time);
        // show note on screen
        Tone.Draw.schedule(function () {
            if (preview !== null && version === previewVersion) {
                setMessage("Listening to " + song.title + " \u00B7 " + tileNote(event.note));
            }
        }, time);
    }, notes).start(0);

    // stops when song is over
    Tone.Transport.scheduleOnce(function (time) {
        Tone.Draw.schedule(function () {
            if (preview !== null && version === previewVersion) {
                stopPreview();
                setMessage("Your turn. Press Play to make the melody together.");
            }
        }, time);
    }, seconds + 0.4);

    Tone.Transport.start("+0.08");
    setMessage("Listening to " + song.title + ".");
    updateControls();
}

// go back to a fresh round for the chosen song
function resetRound() {
    releaseAllNotes();
    flash = null;
    round = new Game.Round(selectedSong);
    setMessage("Choose a song and press Play. You can try the notes first.");
    updateScore();
    updateControls();
}

songSelect.addEventListener("change", function () {
    selectedSong = songs.find(function (song) { return song.id === songSelect.value; });
    resetRound();
    mouseCanvas.focus({ preventScroll: true });
});

helpButton.addEventListener("click", function () {
    pauseGame();
    releaseAllNotes();
    if (!introModal.open) { introModal.showModal(); }
});

playButton.addEventListener("click", beginGame);
listenButton.addEventListener("click", listenToSong);
restartButton.addEventListener("click", beginGame);

pauseButton.addEventListener("click", function () {
    if (round.phase === "paused") {
        resumeGame();
    } else {
        pauseGame();
    }
    mouseCanvas.focus({ preventScroll: true });
});

document.getElementById("play-again-button").addEventListener("click", beginGame);
document.getElementById("choose-song-button").addEventListener("click", function () {
    resultModal.close();
    resetRound();
    songSelect.focus();
});

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