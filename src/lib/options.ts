/**
 * The list with `value` added when it is missing, so a saved value that is no longer one of the
 * suggestions (an older record's) stays selectable and never silently changes.
 */
export function withCurrent(options: readonly string[], value: string): string[] {
  return value && !options.includes(value) ? [...options, value] : [...options];
}
