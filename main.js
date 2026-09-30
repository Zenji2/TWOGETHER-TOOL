
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
    drawGrid();
}

// tone and reverb steps
const numToneSteps = 8;
const numReverbSteps = 4;
 
// grid lines
function drawGrid(highlightColumn, highlightRow) {
    canvasContext.clearRect(0, 0, mouseCanvas.width, mouseCanvas.height);
 
    let columnWidth = mouseCanvas.width / numToneSteps;
    let rowHeight = mouseCanvas.height / numReverbSteps;
 
    if (highlightColumn !== undefined) {
        canvasContext.fillStyle = "lightblue";
        canvasContext.fillRect(
            highlightColumn * columnWidth,
            highlightRow * rowHeight,
            columnWidth,
            rowHeight
        );
    }
 
    canvasContext.strokeStyle = "navy";
    canvasContext.lineWidth = 1;
 
    for (let col = 1; col < numToneSteps; col++) {
        canvasContext.beginPath();
        canvasContext.moveTo(col * columnWidth, 0);
        canvasContext.lineTo(col * columnWidth, mouseCanvas.height);
        canvasContext.stroke();
    }
 
    for (let row = 1; row < numReverbSteps; row++) {
        canvasContext.beginPath();
        canvasContext.moveTo(0, row * rowHeight);
        canvasContext.lineTo(mouseCanvas.width, row * rowHeight);
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

    // detect mouse whens over each grid
    let columnWidth = mouseCanvas.width / numToneSteps;
    let rowHeight = mouseCanvas.height / numReverbSteps;
    let column = Math.floor(x / columnWidth);
    let row = Math.floor(y / rowHeight);   

    let frequency = mapRange(column, 0, numToneSteps - 1, 200, 5000);

    filter.frequency.rampTo(frequency, 0.05);

    let wetness = mapRange(row, 0, numReverbSteps - 1, 1, 0);
    reverb.wet.rampTo(wetness, 0.05);

    drawGrid(column, row);
}

mouseCanvas.addEventListener("mousemove", handleMouseMove);

window.addEventListener("resize", resizeCanvas);
resizeCanvas();