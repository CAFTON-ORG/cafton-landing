/**
 * A stored document with every key it is missing filled in from the bundled one. Pages grow new
 * fields over time; without this, a document saved before the field existed would fail its schema
 * and the whole page would fall back to the bundled text, silently dropping the editor's changes.
 * Stored values always win, arrays are taken whole, and nothing the document already has is touched.
 */
export function fillDefaults<T>(stored: unknown, bundled: T): unknown {
  if (!isPlainObject(stored) || !isPlainObject(bundled)) return stored;
  const result: Record<string, unknown> = { ...stored };
  for (const [key, value] of Object.entries(bundled)) {
    result[key] = key in stored ? fillDefaults(stored[key], value) : value;
  }
  return result;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
