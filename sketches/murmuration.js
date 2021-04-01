const canvasSketch = require("canvas-sketch")
const seedRandom = require("seed-random")
const { perform, withHandler } = require("performative-ts")
const { pathsToSVG } = require("canvas-sketch-util/penplot")

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
}

const params = new URLSearchParams(location.search)
const seed = params.get("seed") || Math.round(Math.random() * 1000000)
const searchParam = `?seed=${seed}`
if (searchParam !== location.search) {
  location.search = `?seed=${seed}`
}

const getRandom = seedRandom(seed)

// function to generate a random number between min and max
const random = (min, max) => getRandom() * (max - min) + min

canvasSketch(sketch, settings)

function sketch(context) {
  const origin = { x: context.width / 2, y: context.height / 2, z: 0 }
  const diameter = 8
  const fov = 4
  const angleOfView = 20
  const boidSize = 0.25
  const baseSpeed = 0.3
  const count = 100
  const inertia = 7
  const rightSpot = 0.8

  const boids = Array.from(Array(count), () => {
    return {
      x: origin.x + random(-diameter / 2, diameter / 2),
      y: origin.y + random(-diameter / 2, diameter / 2),
      z: origin.z + random(-diameter, diameter),
      speed: baseSpeed * random(0.95, 1.05),
      angle: random(-360, 360),
      anglesCache: new Map(),
    }
  })

  return (renderParams) => {
    const { context, width, height, playhead } = renderParams
    update({ playhead })

    return draw(renderParams, () => {
      // white background
      context.fillStyle = "white"
      context.fillRect(0, 0, width, height)

      context.beginPath()
      context.strokeStyle = "black"
      context.lineWidth = 0.02
      context.lineCap = "round"

      boids.forEach((boid) => {
        const size = boidSize * (1 + boid.z / diameter)
        drawLine(boid.x, boid.y, size, boid.angle)
      })

      context.stroke()
    })
  }

  function update({ playhead }) {
    boids.forEach((boid) => {
      boid.anglesCache = new Map()
    })

    boids.forEach((boid, index) => {
      const prevPos = { x: boid.x, y: boid.y, z: boid.z }
      move(boid)

      boid.angle += Math[index % 2 ? "cos" : "sin"](playhead * 10) * 4

      const sqrDistToOrigin = squareDistance(boid, origin)
      if (
        sqrDistToOrigin > diameter ** 2 &&
        squareDistance(prevPos, origin) < sqrDistToOrigin
      ) {
        boid.angle = boid.angle + random(-90, 0)
        boid.speed *= -1
      }
      boids.forEach((other) => {
        if (isViewing(boid, other)) {
          interact(boid, other)
        }
      })
    })
  }

  function isViewing(point, target) {
    const sqDistance = squareDistance(point, target)
    if (sqDistance > fov ** 2) {
      return false
    }
    const angleBetween = angle(point, target)
    if (angleBetween > angleOfView / 2 || angleBetween < -(angleOfView / 2)) {
      return false
    }
    return true
  }

  function interact(boid, other) {
    if (boid === other) return

    const angleBetween = angle(boid, other)
    const distance = squareDistance(boid, other)
    if (distance > fov ** 2) {
      return
    }
    if (distance > (fov * (0.5 + rightSpot / 2)) ** 2) {
      // too far
      boid.angle = nudgeAngle(inertia, boid.angle, boid.angle + angleBetween)
      return
    }
    if (distance < (fov * (0.5 - rightSpot / 2)) ** 2) {
      // too close
      boid.angle = nudgeAngle(
        inertia / 10,
        boid.angle,
        boid.angle - angleBetween,
      )
      return
    }
    // just right
    boid.angle = nudgeAngle(inertia, boid.angle, other.angle)
  }
}

function nudgeAngle(inertia, current, target) {
  return (current * inertia + target) / (inertia + 1)
}

const history = []
function draw(params, renderFunction) {
  const { context, width, height, units } = params

  const lines = []

  withHandler(
    {
      getCanvasContext() {
        return context
      },
      pushLine(line) {
        lines.push(line)
      },
    },
    renderFunction,
  )

  history.push(lines)
  return [
    // context.canvas,
    {
      data: pathsToSVG(lines, {
        width,
        height,
        units,
      }),
      extension: ".svg",
    },
    history.length > 2 && {
      data: pathsToSVG(history.shift(), {
        width,
        height,
        units,
      }),
      extension: ".svg",
    },
  ].filter(Boolean)
}

// draw a square in a single line
// and rotate it if needed
function drawLine(cx, cy, width, angle) {
  const context = perform("getCanvasContext")

  // calculate rotated coordinates
  const startXY = rotate(cx, cy, cx - width / 2, cy, angle)
  const endXY = rotate(cx, cy, cx + width / 2, cy, angle)

  // draw line on context
  context.moveTo(...startXY)
  context.lineTo(...endXY)

  // draw line for svg polylines
  perform("pushLine", [startXY, endXY])
}

// rotate [x,y] around the center [cx, cy] with angle in degrees
// and y-axis moving downward
function rotate(cx, cy, x, y, angle) {
  if (angle === 0) return [x, y]

  const radians = (Math.PI / 180) * angle
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  const nx = cos * (x - cx) - sin * (y - cy) + cx
  const ny = cos * (y - cy) + sin * (x - cx) + cy
  return [nx, ny]
}

function move(boid) {
  const [newX, newY] = rotate(
    boid.x,
    boid.y,
    boid.x + boid.speed,
    boid.y,
    boid.angle,
  )

  boid.x = newX
  boid.y = newY
}

function squareDistance(point1, point2) {
  const x = Math.abs(point1.x - point2.x)
  const y = Math.abs(point1.y - point2.y)
  return x ** 2 + y ** 2
}

function angle(c, e) {
  if (c.anglesCache?.has(e)) {
    return c.anglesCache.get(e)
  }
  if (e.anglesCache?.has(c)) {
    return e.anglesCache.get(c)
  }

  const dy = e.y - c.y
  const dx = e.x - c.x
  let theta = Math.atan2(dy, dx) // range (-PI, PI]
  theta *= 180 / Math.PI // rads to degs, range (-180, 180]

  c.anglesCache && c.anglesCache.set(e, theta)
  e.anglesCache && e.anglesCache.set(c, -theta)

  return theta
}
