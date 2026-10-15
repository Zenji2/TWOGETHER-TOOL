
// document.body.style.backgroundColor = "red";
// find out intro modal

const introModal = document.getElementById("intro-modal");
// console.log(introModal);
// find modal close button
const introModalCloseButton = document.getElementById("intro-modal-close");

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
introModalCloseButton.addEventListener("click", function closeIntroModal(){
    // close our modal
    introModal.close();
});


// when dialog closes by whatever means, load audio system
introModal.addEventListener("close", toneInit);


// console.log(introModal);
// console.log("test");
// console.log(1 + 2);


///////// Tone
///////// Tone

const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: {
        type: "sine"
    },
    envelope: {
        attack: 0.08,
        decay: 0.2,
        sustain: 0.6,
        release: 1.2
    },
    volume: -12
});

const filter = new Tone.Filter({
    frequency: 1200,
    type: "lowpass",
    rolloff: -12,
    Q: 1
});

const reverb = new Tone.JCReverb(0.25);
reverb.wet.value = 0.2;

const limiter = new Tone.Limiter(-6);

function toneInit() {
    synth.connect(filter);
    filter.connect(reverb);
    reverb.connect(limiter);
    limiter.toDestination();
}

// Keyboard player
// get letter key buttons
const keyboardKeys = document.querySelectorAll(".keyboard-key");

// find pressed button
function findKeyboardKey(pressedKey) {
    let letter = pressedKey.toUpperCase();
    for (const key of keyboardKeys) {
        if (key.textContent === letter) {
            return key;
        }
    }
    return null;
}
// only want to b true while key is held down
function handleKeyDown(e) {
    if (e.repeat) {
        return;
    }
    let key = findKeyboardKey(e.key);
    if (key === null) {
        return;
    }
    key.classList.add("active");
    synth.triggerAttack(key.dataset.note);
}

function handleKeyUp(e) {
    let key = findKeyboardKey(e.key);
    if (key === null) {
        return;
    }
    key.classList.remove("active");
    synth.triggerRelease(key.dataset.note);
}

window.addEventListener("keydown", handleKeyDown);
window.addEventListener("keyup", handleKeyUp);

// Mouse player
// canvas
const mouseCanvas = document.getElementById("mouse-canvas");
const canvasContext = mouseCanvas.getContext("2d");

let trail = [];
const maxTrailLength = 20;

let currentFrequency = 200;
let currentWetness = 0;

function resizeCanvas() {
    mouseCanvas.width = mouseCanvas.clientWidth;
    mouseCanvas.height = mouseCanvas.clientHeight;
    drawScene();
}

function drawScene() {
    canvasContext.clearRect(0, 0, mouseCanvas.width, mouseCanvas.height);
    drawBlob(currentFrequency, currentWetness);
    drawTrail();
}

// the blob that shows visual feedback
function drawBlob(frequency, wetness) {
    let midX = mouseCanvas.width / 2;
    let midY = mouseCanvas.height / 2;

    let radius = mapRange(frequency, 200, 5000, 20, 150);
    let glow = mapRange(wetness, 0, 1, 0, 60);

    canvasContext.save();
    canvasContext.shadowColor = "blue";
    canvasContext.shadowBlur = glow;
    canvasContext.fillStyle = "navy";

    canvasContext.beginPath();
    canvasContext.arc(midX, midY, radius, 0, Math.PI * 2);
    canvasContext.fill();
    canvasContext.restore();
}

// draw trail of mouse movement
function drawTrail() {
    for (let i = 0; i < trail.length; i++) {
        let point = trail[i];
        let progress = i / trail.length;
        let radius = mapRange(progress, 0, 1, 2, 10);
        let opacity = mapRange(progress, 0, 1, 0.1, 0.8);

        canvasContext.beginPath();
        canvasContext.fillStyle = "rgba(0, 0, 128, " + opacity + ")";
        canvasContext.arc(point.x, point.y, radius, 0, Math.PI * 2);
        canvasContext.fill();
    }
}

// map a value from one range to another
function mapRange(value, inMin, inMax, outMin, outMax) {
    return outMin + ((value - inMin) * (outMax - outMin)) / (inMax - inMin);
}

// handle mouse movement
function handleMouseMove(e) {
    let x = e.offsetX;
    let y = e.offsetY;

    let midX = mouseCanvas.width / 2;
    let midY = mouseCanvas.height / 2;

    let dx = x - midX;
    let dy = y - midY;

// distance from centre controls tone
    let distance = Math.sqrt(dx * dx + dy * dy);
    let maxDistance = Math.sqrt(midX * midX + midY * midY);
    let frequency = mapRange(distance, 0, maxDistance, 300, 3000);
    filter.frequency.rampTo(frequency, 0.1);

// angle around centre controls reverb
    let angle = Math.atan2(dy, dx) + Math.PI;
    let wetness = mapRange(angle, 0, Math.PI * 2, 0.05, 0.55);
    reverb.wet.rampTo(wetness, 0.15);

    currentFrequency = frequency;
    currentWetness = wetness;

    trail.push({ x: x, y: y });

    if (trail.length > maxTrailLength) {
        trail.shift();
    }

    drawScene();
}

mouseCanvas.addEventListener("mousemove", handleMouseMove);
window.addEventListener("resize", resizeCanvas);

resizeCanvas();