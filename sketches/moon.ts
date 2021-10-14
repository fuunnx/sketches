import canvasSketch from "canvas-sketch"
import { renderPaths, createPath, Path } from "canvas-sketch-util/penplot"
import { random } from "../libs/random2"

const settings = {
  dimensions: "A4",
  orientation: "landscape",
  pixelsPerInch: 300,
  scaleToView: true,
  units: "mm",
  // animation
  // duration: 3,
  // playbackRate: "throttle",
  // animate: false,
  // fps: 10,
}

const canvas = document.createElement("canvas")
canvas.getContext("2d")

const RADIUS = 50
const OPTIMIZE = false
const CHILD_COUNT = 0
const AURA_QUANTITY = 360 * 1

canvasSketch(function sketch(context) {
  return (renderParams) => {
    const { width, height } = renderParams

    const center = Point(width / 2, height / 2)
    const arcs = [
      ...Moon(center, RADIUS, 1),
      ...Aura({ ...center, y: center.y - 2.5 }, RADIUS),
      ...Aura({ ...center, x: center.x - 2.5 }, RADIUS),
      ...Aura({ ...center, y: center.y + 2.5 }, RADIUS),
      ...Aura({ ...center, x: center.x + 2.5 }, RADIUS),
    ]
    console.log("Number of shapes", arcs.length)

    const svgLines = arcs.map(toSvg)
    return renderPaths(svgLines, { ...renderParams, optimize: OPTIMIZE })
  }
}, settings)

function Aura(center: Point, radius: number): PolyLine[] {
  const quantity = AURA_QUANTITY
  return Array.from({ length: quantity }, (_, index) => {
    const angle = (360 / quantity) * index
    console.log(angle)
    return PolyLine([
      addPoints(pointFromPolar(angle, radius), center),
      addPoints(pointFromPolar(angle, radius * 4), center),
    ])
  })
}

function Moon(
  center: Point,
  radius: number,
  direction: 1 | -1,
): (Arc | Circle)[] {
  const result: (Arc | Circle)[] = []

  function draw(center: Point, radius: number) {
    result.push(Circle(center, radius))
    result.push(
      ...spread(radius * 1.5, center, radius, {
        interval: 2.4,
        direction,
      }),
    )
  }

  draw(center, radius)
  return result
}

function spread(
  count: number,
  center: Point,
  radius: number,
  opts: { interval: number; direction: 1 | -1; outside?: boolean },
): Arc[] {
  const { interval, direction, outside } = opts
  const outsideMul = outside ? -1 : 1
  return Array.from({ length: Math.round(count) }, (_, index) => {
    return Arc(
      center,
      Point(
        direction *
          (radius - outsideMul * Math.pow((interval * index) / (count / 2), 2)),
        radius,
      ),
    )
  })
}

function degToRad(x: number) {
  return (x / 180) * Math.PI
}

function toSvg(element: Arc | Circle | PolyLine) {
  if (element.$type === "Arc") return arcToSvg(element)
  if (element.$type === "Circle") return circleToSvg(element)
  if (element.$type === "PolyLine") return polyLineToSvg(element)
  throw Error(`Unexpected element type. ${JSON.stringify(element)}`)
}

type Point = {
  $type: "Point"
  x: number
  y: number
}
function Point(x: number, y: number): Point {
  return { $type: "Point", x, y }
}

type PolyLine = {
  $type: "PolyLine"
  points: Point[]
}
function PolyLine(points: Point[]): PolyLine {
  return { $type: "PolyLine", points }
}
function polyLineToSvg(polyline: PolyLine): Path {
  return createPath((path) => {
    polyline.points.forEach((point, index) => {
      if (index === 0) path.moveTo(point.x, point.y)
      else path.lineTo(point.x, point.y)
    })
  })
}

function pointFromPolar(angle: number, radius: number): Point {
  return Point(
    Math.cos(degToRad(angle)) * radius,
    Math.sin(degToRad(angle)) * radius,
  )
}
function addPoints(pointA: Point, pointB: Point) {
  return Point(pointA.x + pointB.x, pointA.y + pointB.y)
}

type Circle = {
  $type: "Circle"
  center: Point
  radius: number
  startAngle: number
  endAngle: number
}
function Circle(
  center: Point,
  radius: number,
  startAngle = 0,
  endAngle = Math.PI * 2,
): Circle {
  return { $type: "Circle", center, radius, startAngle, endAngle }
}
function circleToSvg(circle: Circle): Path {
  const { center, radius, startAngle, endAngle } = circle
  return createPath((path) => {
    path.arc(center.x, center.y, radius, startAngle, endAngle)
  })
}

type Arc = {
  $type: "Arc"
  center: Point
  radii: Point
}
function Arc(center: Point, radii: Point): Arc {
  return { $type: "Arc", center, radii }
}

function arcToSvg(arc: Arc): Path {
  const { center, radii } = arc
  const radiiY = Math.abs(radii.y)
  const radiiX = Math.abs(radii.x)

  if (radiiY < radiiX) {
    const reverse = radii.y < 0 ? 1 : 0
    const pathData = `
    M ${center.x - radiiX} ${center.y}
    L ${center.x - radiiX} ${center.y}
    A ${radiiX} ${radiiY} 0 0 ${reverse} ${center.x + radiiX} ${center.y}`
    return Object.assign(new Path2D(pathData), {
      toString: () => pathData,
    })
  } else {
    const reverse = radii.x < 0 ? 1 : 0
    const pathData = `
    M ${center.x} ${center.y - radiiY}
    L ${center.x} ${center.y - radiiY}
    A ${radiiX} ${radiiY} 0 0 ${reverse} ${center.x} ${center.y + radiiY}`
    return Object.assign(new Path2D(pathData), {
      toString: () => pathData,
    })
  }
}
