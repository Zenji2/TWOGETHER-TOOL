
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

// scaling canvas to screen
function resizeCanvas(){
    mouseCanvas.width = mouseCanvas.clientWidth;
    mouseCanvas.height = mouseCanvas.clientHeight;
    drawBlob(200, 0);
}

// cross in canvas to split into 4 sections
function drawBlob(frequency, wetness) {
    canvasContext.clearRect(0, 0, mouseCanvas.width, mouseCanvas.height);

    let midX = mouseCanvas.width / 2;
    let midY = mouseCanvas.height / 2;

    // more tone makes the blob bigger
    let radius = mapRange(frequency, 200, 5000, 20, 150);
    // more reverb makes glow bigger
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

// map range
function mapRange(value, inMin, inMax, outMin, outMax) {
    return outMin + ((value - inMin) * (outMax - outMin)) / (inMax - inMin);
}

function handleMouseMove(e) {
    let x = e.offsetX;
    let y = e.offsetY;
// filter control
    let frequency = mapRange(x, 0, mouseCanvas.width, 200, 5000);

    filter.frequency.rampTo(frequency, 0.05);

    let wetness = mapRange(y, 0, mouseCanvas.height, 1, 0);
    reverb.wet.rampTo(wetness, 0.05);

    drawBlob(frequency, wetness);
}

mouseCanvas.addEventListener("mousemove", handleMouseMove);

window.addEventListener("resize", resizeCanvas);
resizeCanvas();