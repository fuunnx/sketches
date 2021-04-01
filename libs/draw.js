import { perform, withHandler } from "performative-ts"
import { pathsToSVG } from "canvas-sketch-util/penplot"

export function draw(params, renderFunction) {
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

  return [
    {
      data: pathsToSVG(lines, {
        width,
        height,
        units,
      }),
      extension: ".svg",
    },
  ]
}

export function drawLine(...points) {
  if (points.length < 2) {
    return
  }

  const context = perform("getCanvasContext")

  const startXY = points.shift()
  context.moveTo(...startXY)

  points.forEach((point) => {
    if (point.length === 4) {
      context.lineTo(...point[0])
      context.bezierCurveTo(...point[1], ...point[2], ...point[3])
    } else {
      context.lineTo(...point)
    }
  })

  // draw line for svg polylines
  perform("pushLine", points)
}
