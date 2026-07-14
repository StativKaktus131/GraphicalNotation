let img;
let imgWidth, imgHeight;
let thresh = 20;

let points = [];
let colors = [
    {r: 255, g: 255, b: 100},
    {r: 255, g: 100, b: 255},
    {r: 100, g: 255, b: 255},
    {r: 150, g: 150, b: 255},
    {r: 100, g: 255, b: 100},
    {r: 255, g: 100, b: 100},
];

const circleRadius = 70;
let show = true;

let creating = false;
let shapes = [];
let currentShapeIdx = 0;
let mouseDown = false;

const N_MOUSEPARTICLES = 300;
let mouseParticles = [];

let oscPort;
let port = 8081;


function preload() {
    img = loadImage('drawing.png');
}

function setup() {
    createCanvas(800, 600);
    setupOsc(4443, 4444);



    // setup text
    textAlign(CENTER, CENTER);
    textSize(30);
}

function draw() {
    let mp = createVector(mouseX, mouseY);

    if (img == null) {
        background(0);
        stroke(255);
        text('LOADING IMAGE ...', width / 2, height / 2);
        return;
    }
    
    image(img, 0, 0, width, height);
    
    paintMouse();

    let m = [];
    for (let i = 0; i < shapes.length; i++) {
        let shape = shapes[i];
        if (shape.filled) {
            let per = getOverlapPercentage(shape.points, mp, circleRadius, 50);
            if (per > 0)
                m.push(i, per);
        }
    }
    sendOsc('/values', m);

    noFill();
    stroke(255);
    circle(mouseX, mouseY, circleRadius * 2);

    if (shapes.length == 0 || !show)
        return;

    paintShapes();
}


function mousePressed() {
    let mp = createVector(mouseX, mouseY);
    

    if (!show) {
        mouseDown = true;
        return;
    }

    let currentShape = shapes[currentShapeIdx];
    let clickedOnNode = false;

    if (currentShape) {
        for (let i = 0; i < currentShape.points.length; i++) {
            let d = p5.Vector.dist(mp, currentShape.points[i]);
            if (d < thresh && !currentShape.filled) {
                if (currentShape.points.length >= 3) {
                    currentShape.filled = true;
                    creating = false;
                    currentShapeIdx++;
                }

                clickedOnNode = true;
                return;
            }
        }
    } 


    if (clickedOnNode)
        return;

    if (!creating) {
        shapes.push({
            points: [mp],
            filled: false
        });
        creating = true;
    }
    else
        currentShape.points.push(mp);
}


function keyPressed(e) {
    if (key == 'h')
        show = !show;
}

function mouseReleased() {
    if (!show)
        mouseDown = false;
}


function paintShapes() {

    for (let i = 0; i < shapes.length; i++) {
        
        let color = colors[i % colors.length];
        let currentShape = shapes[i];

        fill(color.r, color.g, color.b, 255);
        noStroke();

        for (let point of currentShape.points) {
            circle(point.x, point.y, 10);
        }

        strokeWeight(3);
        stroke(color.r, color.g, color.b, 200); 
        
        if (currentShape.filled)
            fill(color.r, color.g, color.b, 100); 
        else
            noFill();

        beginShape();
        for (let point of currentShape.points) {
            vertex(point.x, point.y);
        }
        if (currentShape.filled)
            endShape(CLOSE);
        else
            endShape();

        if (!currentShape.filled)
            continue;

        textSize(20);
        fill(0);
        stroke(255);
        let sum = createVector(0);
        for (let point of currentShape.points)
            sum = sum.add(point);
        sum = sum.div(currentShape.points.length);

        text(i, sum.x, sum.y);
    }
}

function paintMouse() {
    const addParticle = () => {
        if (mouseDown)
            mouseParticles.push(new Particle(createVector(mouseX, mouseY)))
        
        if (mouseParticles.length < N_MOUSEPARTICLES && mouseDown)
            setTimeout(addParticle, 660);
    };
    
    if (mouseParticles.length < N_MOUSEPARTICLES && mouseDown)
        addParticle();

    for (let particle of mouseParticles) {
        particle.tick();
        particle.render();
    }
}

function isPointInPoly(pt, poly) {
    let x = pt.x, y = pt.y;
    let inside = false;

    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        let xi = poly[i].x, yi = poly[i].y;
        let xj = poly[j].x, yj = poly[j].y;

        let intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

function getOverlapPercentage(poly, circlePos, radius, resolution = 20) {
    let insidePoints = 0;
    let totalCirclePoints = 0;

    let minX = circlePos.x - radius;
    let minY = circlePos.y - radius;
    let maxX = circlePos.x + radius;
    let maxY = circlePos.y + radius;

    let stepX = (maxX - minX) / resolution;
    let stepY = (maxY - minY) / resolution;


    for (let x = minX + stepX / 2; x < maxX; x += stepX) {
        for (let y = minY + stepY / 2; y < maxY; y += stepY) {
            let dx = x - circlePos.x;
            let dy = y - circlePos.y;

            if (dx * dx + dy * dy <= radius * radius) {
                totalCirclePoints++;

                if (isPointInPoly(createVector(x, y), poly)) {
                    insidePoints++;
                }
            }
        }
    }

    if (totalCirclePoints == 0) return 0;
    return (insidePoints * 1. / totalCirclePoints);
}


// Add these to the absolute bottom of your sketch.js file
function setupOsc(oscPortIn, oscPortOut) {

    let macIP = '192.168.0.230';
    
    let tunnel = 'https://bankroll-threefold-tartness.ngrok-free.dev';
    var socket = io.connect(tunnel, { 
        rememberTransport: false,
        transportOptions: {
            polling: {
                extraHeaders: {
                    'ngrok-skip-browser-warning': 'true'
                }
            }
        }
     });

    socket.on('connect', function() {
        socket.emit('config', { 
            server: { port: oscPortIn, host: '127.0.0.1' }, 
            client: { port: oscPortOut, host: '127.0.0.1' }
        });
    });

  
  // Make the socket variable globally accessible for sending
  window.socket = socket; 
}

function sendOsc(address, value) {
  if (window.socket && window.socket.connected) {
    window.socket.emit('message', [address].concat(value));
  }
}
