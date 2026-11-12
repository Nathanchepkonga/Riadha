// hls.js ships types for its full build only; the light build (no subtitles/DRM) has the same API.
declare module "hls.js/light" {
  export { default } from "hls.js";
  export * from "hls.js";
}
