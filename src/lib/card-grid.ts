/**
 * Column classes for a grid of cards that should stay visually centred
 * rather than leaving an empty trailing column when there are fewer cards
 * than the layout has columns.
 *
 * Returns only column-count and max-width classes; the caller still owns
 * `grid` itself and the gap, since those differ per collection.
 */
export function cardGridClass(count: number, maxColumns: 2 | 3 = 3): string {
  if (count <= 1) return "mx-auto max-w-md grid-cols-1";
  if (count === 2 || maxColumns === 2)
    return "mx-auto max-w-4xl grid-cols-1 sm:grid-cols-2";
  return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
}
