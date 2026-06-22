declare module 'ffprobe-static' {
  /** Absolute path to the bundled ffprobe binary for the current platform. */
  const ffprobeStatic: { path: string };
  export default ffprobeStatic;
}
