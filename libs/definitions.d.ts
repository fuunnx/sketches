declare module "canvas-sketch" {
  export type RenderContext = {}

  export type RenderParams = CanvasRenderingContext2D & {
    width: number
    height: number
  }

  export type RenderSettings = {}

  export type FileRenderDescriptor = { data: string; extension: `.${string}` }
  export type RenderDescriptor = HTMLCanvasElement | FileRenderDescriptor

  function canvasSketch(
    sketch: (
      context: RenderContext,
    ) => (renderParams: RenderParams) => RenderDescriptor | RenderDescriptor[],
    settings: RenderSettings,
  )

  export default canvasSketch
}

declare module "canvas-sketch-util/penplot" {
  import { FileRenderDescriptor, RenderParams } from "canvas-sketch"
  import { Path } from "d3-path"

  export { Path }

  export function renderPaths(
    paths: Path[],
    renderParams: RenderParams & { optimize: boolean },
  ): [HTMLCanvasElement, FileRenderDescriptor]

  export function createPath(factory: (path: Path) => void): Path
}
