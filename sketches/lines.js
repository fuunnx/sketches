import canvasSketch from "canvas-sketch"
import { renderPaths, createPath } from "canvas-sketch-util/penplot"
import { getRandom, randomInterval } from "../libs/random"
import { range } from "../libs/range"

const settings = {
  dimensions: "A4",
  orientation: "portrait",
  pixelsPerInch: 300,
  scaleToView: true,
  units: "cm",
  // animation
  duration: 3,
  playbackRate: "throttle",
  animate: false,
  fps: 10,
}

canvasSketch(sketch, settings)

const WIDTH = 10
const GRIDSIZE = 50
const WAVE_LENGTH = 15
const WAVE_HEIGHT = 1
const ITERATION_COUNT = GRIDSIZE * 5
const DECISION_PROBA = 0.5 / GRIDSIZE
const DECISION_NUDGE = 2
const CLOSE_PATH = false
const DRAW_WAVES = true
const DRAW_LINES = true

function Bezier(start, cp1, cp2, end) {
  return [start, cp1, cp2, end]
}

function Point(x, y) {
  return [x, y]
}

function Wave(startPoint, direction = 1) {
  return Bezier(
    Point(startPoint[0] + 0, startPoint[1]),
    Point(startPoint[0] + WAVE_LENGTH / 2, startPoint[1]),
    Point(startPoint[0] + WAVE_LENGTH / 2, startPoint[1] + 1 * direction),
    Point(startPoint[0] + WAVE_LENGTH, startPoint[1] + 1 * direction),
  )
}

function sketch(context) {
  let lines = []
  range(ITERATION_COUNT).forEach(() => {
    lines = iterate(lines)
  })

  return (renderParams) => {
    const { width, height } = renderParams
    const center = [width / 2, height / 2]

    const svgLines = lines.map((line) => toSvg(line))
    return renderPaths(svgLines, { ...renderParams, optimize: false })

    function toRelativeCoordinates([x, y]) {
      return [
        (Math.min(x, GRIDSIZE) / GRIDSIZE) * WIDTH - WIDTH / 2 + center[0],
        (y / GRIDSIZE) * WIDTH - WIDTH / 2 + center[1],
      ]
    }

    function toSvg(line) {
      let x = 0
      let y = line.startY

      const path = createPath()
      line.behavior.forEach((act, i) => {
        if (x > GRIDSIZE) return

        if (act === 0) {
          const point = toRelativeCoordinates(Point(x, y))
          x += 1

          if (!DRAW_LINES) return

          if (i === 0) {
            path.moveTo(...point)
          } else {
            path.lineTo(...point)
          }
          return
        }

        if (act !== 0) {
          const wave = Wave(Point(x, y), act).map(toRelativeCoordinates)
          y += act
          x += WAVE_LENGTH

          if (!DRAW_WAVES) return

          if (i === 0) {
            path.moveTo(...wave[0])
          } else {
            path.lineTo(...wave[0])
          }

          path.bezierCurveTo(...wave[1], ...wave[2], ...wave[3])
        }
      })

      if (CLOSE_PATH) {
        path.closePath()
      }
      return path
    }
  }
}

function iterate(lines) {
  lines.push(newLine(lines))
  return lines
}

function newLine(lines) {
  let y = Math.round(randomInterval(0, GRIDSIZE))
  let moveUpProba = DECISION_PROBA
  let moveDownProba = DECISION_PROBA
  let oldNeighbors = []
  const behavior = range(GRIDSIZE).map((index) => {
    const currentNeighbors = lines.filter((x) => x.computedY[index] === y)
    oldNeighbors.forEach((old) => {
      const act = old.behavior[index - 1]
      if (act > 0) {
        moveDownProba *= DECISION_NUDGE
      }
      if (act < 0) {
        moveUpProba *= DECISION_NUDGE
      }
    })

    oldNeighbors = currentNeighbors

    if (getRandom() <= moveUpProba) {
      const direction = -WAVE_HEIGHT
      y += direction
      return direction
    }

    if (getRandom() <= moveDownProba) {
      const direction = WAVE_HEIGHT
      y += direction
      return direction
    }

    return 0
  })

  return {
    startY: y,
    behavior: behavior,
    computedY: behavior.map((act) => {
      y += act
      return y
    }),
  }
}
