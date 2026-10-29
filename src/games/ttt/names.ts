export const CELL_NAMES: readonly string[] = [
  "top left",
  "top middle",
  "top right",
  "middle left",
  "centre",
  "middle right",
  "bottom left",
  "bottom middle",
  "bottom right",
];

export function cellName(index: number): string {
  return CELL_NAMES[index] ?? `cell ${index + 1}`;
}
