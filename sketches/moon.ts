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
  // duration: 3,
  // playbackRate: "throttle",
  // animate: false,
  // fps: 10,
}

const canvas = document.createElement("canvas")
canvas.getContext("2d")

const RADIUS = 10
const OPTIMIZE = true

canvasSketch(function sketch(context) {
  return (renderParams) => {
    const { width, height } = renderParams

    const center = Point(width / 2, height / 2)
    const arcs = [Arc(center, RADIUS)]

    const svgLines = arcs.map(ArcToSvg)
    return renderPaths(svgLines, { ...renderParams, optimize: OPTIMIZE })
  }
}, settings)

type Point = {
  x: number
  y: number
}
function Point(x: number, y: number): Point {
  return { x, y }
}

type Arc = {
  center: Point
  radius: number
  startAngle: number
  endAngle: number
}
function Arc(
  center: Point,
  radius: number,
  startAngle = 0,
  endAngle = Math.PI * 2,
) {
  return { center, radius, startAngle, endAngle }
}

function ArcToSvg(arc: Arc) {
  const { center, radius, startAngle, endAngle } = arc
  return createPath((path) => {
    path.arc(center.x, center.y, radius, startAngle, endAngle)
  })
}
