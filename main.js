
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
// create instrument

// change to polysynth
const synth = new Tone.PolySynth();
// tone and reverb
const filter = new Tone.Filter(1000, "lowpass");
const reverb = new Tone.JCReverb(0.4);


function toneInit(){
    // connect synth to audio output
    synth.connect(filter);
    filter.connect(reverb);
    reverb.connect(Tone.Destination);
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

let currentX = null;
let currentY = null;
let currentFrequency = 200;
let currentWetness = 0;

// scaling canvas to screen
function resizeCanvas(){
    mouseCanvas.width = mouseCanvas.clientWidth;
    mouseCanvas.height = mouseCanvas.clientHeight;
    drawFeedback();
}

// map range
function mapRange(value, inMin, inMax, outMin, outMax) {
    return outMin + ((value - inMin) * (outMax - outMin)) / (inMax - inMin);
}

function drawFeedback() {
    canvasContext.clearRect(0, 0, mouseCanvas.width, mouseCanvas.height);

    //// Tone meter
    let meterMargin = 40;
    let meterWidth = mouseCanvas.width - meterMargin * 2;
    let meterHeight = 20;
    let toneY = 60;

    // bg
    canvasContext.fillStyle = "lightgray";
    canvasContext.fillRect(meterMargin, toneY, meterWidth, meterHeight);

    let toneProgress = mapRange(currentFrequency, 200, 5000, 0, 1);
    canvasContext.fillStyle = "navy";
    canvasContext.fillRect(meterMargin, toneY, meterWidth * toneProgress, meterHeight);

    canvasContext.fillStyle = "gray";
    canvasContext.font = "16px sans-serif";
    canvasContext.textAlign = "left";
    canvasContext.fillText("Tone / brightness", meterMargin, toneY - 10);

    canvasContext.textAlign = "right";
    canvasContext.fillText(Math.round(currentFrequency) + " Hz", mouseCanvas.width - meterMargin, toneY - 10);

    /// Reverb meter
    let reverbY = 130;

    canvasContext.fillStyle = "lightgray";
    canvasContext.fillRect(meterMargin, reverbY, meterWidth, meterHeight);

    canvasContext.fillStyle = "navy";
    canvasContext.fillRect(meterMargin, reverbY, meterWidth * currentWetness, meterHeight);

    canvasContext.fillStyle = "gray";
    canvasContext.textAlign = "left";
    canvasContext.fillText("Reverb", meterMargin, reverbY - 10);

    canvasContext.textAlign = "right";
    canvasContext.fillText(Math.round(currentWetness * 100) + "%", mouseCanvas.width - meterMargin, reverbY - 10);

    /// Mouse point
    if (currentX !== null && currentY !== null) {
        canvasContext.beginPath();
        canvasContext.fillStyle = "navy";
        canvasContext.arc(currentX, currentY, 10, 0, Math.PI * 2);
        canvasContext.fill();
    }
}

function handleMouseMove(e) {
    let x = e.offsetX;
    let y = e.offsetY;
    currentX = x;
    currentY = y;

// filter control
    let frequency = mapRange(x, 0, mouseCanvas.width, 200, 5000);

    filter.frequency.rampTo(frequency, 0.05);

    let wetness = mapRange(y, 0, mouseCanvas.height, 1, 0);
    reverb.wet.rampTo(wetness, 0.05);

    currentFrequency = frequency;
    currentWetness = wetness;
    drawFeedback();
}

mouseCanvas.addEventListener("mousemove", handleMouseMove);

window.addEventListener("resize", resizeCanvas);
resizeCanvas();