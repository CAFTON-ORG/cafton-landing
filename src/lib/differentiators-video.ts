export const FRAME_COUNT = 92;

const FRAME_DIR = "/differentiators-frames";

export function framePath(index: number): string {
  return `${FRAME_DIR}/${String(index + 1).padStart(3, "0")}.webp`;
}
