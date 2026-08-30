
export function cardGridClass(count: number, maxColumns: 2 | 3 = 3): string {
  if (count <= 1) return "mx-auto max-w-md grid-cols-1";
  if (count === 2 || maxColumns === 2)
    return "mx-auto max-w-4xl grid-cols-1 sm:grid-cols-2";
  return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
}
