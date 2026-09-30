
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
    trail = [];
    drawScene();
}

let trail = [];
const maxTrailLength = 50;
 
function drawScene() {
    canvasContext.clearRect(0, 0, mouseCanvas.width, mouseCanvas.height);
    drawTrail();
    drawToneGuide();
}
 
// the trail is our reverb signifier, since reverb comes from speed,
// not a location, there's nothing sensible to draw a marker "at"
function drawTrail() {
    for (let i = 0; i < trail.length; i++) {
        let point = trail[i];
        let progress = i / trail.length;
        let radius = mapRange(progress, 0, 1, 2, 9);
        let opacity = mapRange(progress, 0, 1, 0.15, 0.85);
 
        canvasContext.beginPath();
        canvasContext.fillStyle = "rgba(0, 0, 128, " + opacity + ")";
        canvasContext.arc(point.x, point.y, radius, 0, Math.PI * 2);
        canvasContext.fill();
    }
}
 
// the tone guide is just one thin bar along the top, since tone only cares
// about x position, there's no reason to divide the whole canvas up
// (kept it up here, not the bottom, so it doesn't sit under the keyboard keys)
function drawToneGuide() {
    let barHeight = 16;
    let barY = 60;
 
    let gradient = canvasContext.createLinearGradient(0, 0, mouseCanvas.width, 0);
    gradient.addColorStop(0, "navy");
    gradient.addColorStop(1, "blue");
    canvasContext.fillStyle = gradient;
    canvasContext.fillRect(0, barY, mouseCanvas.width, barHeight);
 
    // labels sit just below the thin bar rather than crammed inside it
    canvasContext.fillStyle = "gray";
    canvasContext.font = "14px sans-serif";
    canvasContext.textAlign = "left";
    canvasContext.fillText("less tone", 4, barY + barHeight + 16);
    canvasContext.textAlign = "right";
    canvasContext.fillText("more tone", mouseCanvas.width - 4, barY + barHeight + 16);
 
    // marker showing the current x position on the bar
    if (lastX !== null) {
        canvasContext.strokeStyle = "navy";
        canvasContext.lineWidth = 3;
        canvasContext.beginPath();
        canvasContext.moveTo(lastX, barY);
        canvasContext.lineTo(lastX, barY + barHeight);
        canvasContext.stroke();
    }
}

// map range
function mapRange(value, inMin, inMax, outMin, outMax) {
    return outMin + ((value - inMin) * (outMax - outMin)) / (inMax - inMin);
}

function handleMouseMove(e) {
    let x = e.offsetX;
    let y = e.offsetY;
    let now = performance.now();

// filter control
    let frequency = mapRange(x, 0, mouseCanvas.width, 200, 5000);

    filter.frequency.rampTo(frequency, 0.05);

// speed

    if (lastX !== null) {
        let distance = Math.sqrt((x - lastX) ** 2 + (y - lastY) ** 2);
        let timePassed = (now - lastTime) / 1000;
        let speed = distance / timePassed;
    

    let wetness = Math.min(mapRange(speed, 0, 3000, 0, 1), 1);
    reverb.wet.rampTo(wetness, 0.1);

    }

    lastX = x;
    lastY = y;
    lastTime = now;
}

mouseCanvas.addEventListener("mousemove", handleMouseMove);

window.addEventListener("resize", resizeCanvas);
resizeCanvas();