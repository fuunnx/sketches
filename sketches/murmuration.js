const canvasSketch = require("canvas-sketch");
const seedRandom = require("seed-random");
const { perform, withHandler } = require("performative-ts");
const { polylinesToSVG } = require("canvas-sketch-util/penplot");

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
  let origin = { x: context.width / 2, y: context.height / 2, z: 0 };
  let diameter = 8;
  let fov = 4;
  let angleOfView = 10;
  let boidSize = 0.8;
  let baseSpeed = 0.2;
  let count = 500;
  let inertia = 5;
  let rightSpot = 0.8;

  let boids = Array.from(Array(count), () => {
    return {
      x: origin.x + random(-diameter / 2, diameter / 2),
      y: origin.y + random(-diameter / 2, diameter / 2),
      z: origin.z + random(-diameter / 2, diameter / 2),
      speed: baseSpeed * random(0.9, 1.1),
      angle: random(-360, 360),
      anglesCache: new Map(),
    };
  });

  return ({ context, width, height, units }) => {
    boids.forEach((boid) => {
      boid.anglesCache = new Map();
    });

    boids.forEach((boid) => {
      let prevPos = { x: boid.x, y: boid.y };
      move(boid);

      const sqrDistToOrigin = squareDistance(boid, origin);
      if (
        sqrDistToOrigin > diameter ** 2 &&
        squareDistance(prevPos, origin) < sqrDistToOrigin
      ) {
        // boid.speed = -1 * boid.speed;
        boid.angle = nudgeAngle(0.5, boid.angle, boid.angle - 180);
        // const angleBetween = angle(origin, boid);
        // boid.angle = angleReflect(boid.angle, angleBetween - 90);
      }

      let closestSqrDistance = fov ** 2;
      const closest = boids.reduce((closer, other) => {
        if (other === boid) return closer;

        const sqDistance = squareDistance(boid, other);
        if (sqDistance < closestSqrDistance) {
          const angleBetween = angle(boid, other);
          if (
            angleBetween > angleOfView / 2 ||
            angleBetween < -(angleOfView / 2)
          )
            return closer;

          closestSqrDistance = sqDistance;
          return other;
        }

        return closer;
      });

      if (closest) {
        interact(boid, closest);
      }
    });

    const [canvas, lines] = draw(context, () => {
      // white background
      context.fillStyle = "white";
      context.fillRect(0, 0, width, height);

      boids.forEach((boid) => {
        const size = boidSize * (1 + boid.z / diameter);
        drawLine(boid.x, boid.y, size, boid.angle);
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
    const distance = squareDistance(boid, other);
    if (distance > fov ** 2) {
      return;
    }
    if (distance > (fov * (0.5 + rightSpot / 2)) ** 2) {
      // too far
      boid.angle = nudgeAngle(inertia, boid.angle, boid.angle + angleBetween);
      return;
    }
    if (distance < (fov * (0.5 - rightSpot / 2)) ** 2) {
      // too close
      boid.angle = nudgeAngle(
        inertia / 10,
        boid.angle,
        boid.angle - angleBetween
      );
      return;
    }
    // just right
    boid.angle = nudgeAngle(inertia, boid.angle, other.angle);
  }
}

function angleReflect(incidenceAngle, surfaceAngle) {
  return normalizeAngle(surfaceAngle * 2 - incidenceAngle);
}

function normalizeAngle(angle) {
  if (angle > 360) return angle - 360;
  if (angle < -360) return angle + 360;
  return angle;
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
  context.lineWidth = 0.02;
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
  if (c.anglesCache?.has(e)) {
    return c.anglesCache.get(e);
  }
  if (e.anglesCache?.has(c)) {
    return e.anglesCache.get(c);
  }

  var dy = e.y - c.y;
  var dx = e.x - c.x;
  var theta = Math.atan2(dy, dx); // range (-PI, PI]
  theta *= 180 / Math.PI; // rads to degs, range (-180, 180]

  c.anglesCache && c.anglesCache.set(e, theta);
  e.anglesCache && e.anglesCache.set(c, -theta);

  return theta;
}
