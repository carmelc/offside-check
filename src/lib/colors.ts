const OFFSIDE_COLORS = [
  "#FF4444", // red
  "#44FF44", // green
  "#FFFF44", // yellow
  "#FF8844", // orange
  "#44FFFF", // cyan
  "#FF44FF", // magenta
  "#88FF44", // lime
  "#4488FF", // blue
  "#FF4488", // pink
  "#44FF88", // mint
  "#FFAA44", // amber
  "#AA44FF", // purple
];

export function getOffsideColor(index: number): string {
  return OFFSIDE_COLORS[index % OFFSIDE_COLORS.length];
}
