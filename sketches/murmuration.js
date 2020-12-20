/**
 * A Canvas2D + SVG Pen Plotter example of "Cubic Disarray"
 * (a recreation of an artwork by Georg Nees in 1968-71).
 *
 * @author Stephane Tombeur (https://github.com/stombeur)
 */

const canvasSketch = require("canvas-sketch");
const seedRandom = require("seed-random");
const { perform, withHandler } = require("performative-ts");
const { polylinesToSVG } = require("canvas-sketch-util/penplot");
const { clamp } = require("canvas-sketch-util/math");

const settings = {
  dimensions: "A4",
  orientation: "portrait",
  pixelsPerInch: 300,
  scaleToView: true,
  units: "cm",
  // animation
  duration: 3,
  playbackRate: "throttle",
  animate: true,
  fps: 24,
};

let params = new URLSearchParams(location.search);
const seed = params.get("seed") || Math.round(Math.random() * 1000000);
const searchParam = `?seed=${seed}`;
if (searchParam !== location.search) {
  location.search = `?seed=${seed}`;
}

const getRandom = seedRandom(seed);

// function to generate a random number between min and max
const random = (min, max) => getRandom() * (max - min) + min;

canvasSketch(sketch, settings);

function sketch(context) {
  let origin = { x: context.width / 2, y: context.height / 2 };
  let diameter = 7;
  let fov = 1;
  let influence = 1;
  let maxAngle = 10;
  let boidSize = 0.5;
  let baseSpeed = 0.1;
  let count = 500;

  let boids = Array.from(Array(count), () => {
    return {
      x: origin.x + random(-diameter / 2, diameter / 2),
      y: origin.y + random(-diameter / 2, diameter / 2),
      speed: baseSpeed,
      angle: random(-180, 180),
    };
  });

  return ({ context, width, height, units, playhead }) => {
    boids.forEach((boid, index) => {
      move(boid);
      const sqrDistToOrigin = squareDistance(boid, origin);
      if (sqrDistToOrigin > diameter ** 2) {
        boid.speed = -1 * boid.speed;
      }

      let closestSqrDistance = fov ** 2;
      const closest = boids.reduce((closer, other) => {
        if (other === boid) return closer;
        if (!closer) return other;
        const sqDistance = squareDistance(boid, other);
        if (sqDistance < closestSqrDistance) {
          closestSqrDistance = sqDistance;
          return other;
        }
        return closer;
      });
      if (!closest) return;
      interact(boid, closest);

      // boids.forEach((other) => interact(boid, other));
    });

    const [canvas, lines] = draw(context, () => {
      // white background
      context.fillStyle = "white";
      context.fillRect(0, 0, width, height);

      boids.forEach((boid) => {
        drawLine(boid.x, boid.y, boidSize, boid.angle);
      });
    });

    return [
      canvas,
      {
        data: polylinesToSVG(lines, {
          width,
          height,
          units,
        }),
        extension: ".svg",
      },
    ];
  };

  function interact(boid, other) {
    if (boid === other) return;

    const angleBetween = angle(boid, other);
    if (angleBetween > 30 || angleBetween < -30) return;

    const distance = squareDistance(boid, other);
    if (distance > fov ** 2) {
      return;
    }
    if (distance > (fov * 0.6) ** 2) {
      // too far
      boid.angle = nudgeAngle(10, boid.angle, angleBetween);
      return;
    }
    if (distance < (fov * 0.4) ** 2) {
      // too close
      boid.angle = nudgeAngle(10, boid.angle, -angleBetween);
      return;
    }
    // just right
    boid.angle = nudgeAngle(10, boid.angle, other.angle);
  }
}

function nudgeAngle(inertia, current, target) {
  return (current * inertia + target) / (inertia + 1);
}

function draw(context, renderFunction) {
  let lines = [];

  withHandler(
    {
      getCanvasContext() {
        return context;
      },
      pushLine(line) {
        lines.push(line);
      },
    },
    renderFunction
  );

  return [context.canvas, lines];
}

// draw a square in a single line
// and rotate it if needed
function drawLine(cx, cy, width, angle) {
  const context = perform("getCanvasContext");

  // calculate rotated coordinates
  let startXY = rotate(cx, cy, cx - width / 2, cy, angle);
  let endXY = rotate(cx, cy, cx + width / 2, cy, angle);

  context.beginPath();
  context.strokeStyle = "black";
  context.lineWidth = 0.04;
  context.lineCap = "round";

  // draw line on context
  context.moveTo(...startXY);
  context.lineTo(...endXY);
  context.stroke();

  // draw line for svg polylines
  // perform("pushLine", [startXY, endXY]);
}

// rotate [x,y] around the center [cx, cy] with angle in degrees
// and y-axis moving downward
function rotate(cx, cy, x, y, angle) {
  if (angle === 0) return [x, y];

  const radians = (Math.PI / 180) * angle;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const nx = cos * (x - cx) - sin * (y - cy) + cx;
  const ny = cos * (y - cy) + sin * (x - cx) + cy;
  return [nx, ny];
}

function move(boid) {
  const [newX, newY] = rotate(
    boid.x,
    boid.y,
    boid.x + boid.speed,
    boid.y,
    boid.angle
  );

  boid.x = newX;
  boid.y = newY;
}

function squareDistance(point1, point2) {
  const x = Math.abs(point1.x - point2.x);
  const y = Math.abs(point1.y - point2.y);
  return x ** 2 + y ** 2;
}

function distance(point1, point2) {
  return Math.sqrt(squareDistance(point1, point2));
}

function angle(c, e) {
  var dy = e.y - c.y;
  var dx = e.x - c.x;
  var theta = Math.atan2(dy, dx); // range (-PI, PI]
  theta *= 180 / Math.PI; // rads to degs, range (-180, 180]
  return theta;
}
