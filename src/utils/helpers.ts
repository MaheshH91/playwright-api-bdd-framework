/**
 * Replaces {{placeholders}} in a string with values previously stored on the
 * World (e.g. a token captured from a login response). Unknown placeholders
 * are left untouched so problems are visible in the request URL.
 */
export function interpolate(text: string, values: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? values[key] : match
  );
}

/**
 * Resolves a dotted path against a parsed JSON body.
 * Supports object keys ("data.email"), numeric keys for arrays ("data.0.id"),
 * explicit indices ("data[2].name") and the synthetic "length" key on arrays
 * ("data.length").
 */
export function getValueByPath(value: unknown, path: string): unknown {
  let current: unknown = value;

  for (const rawSegment of path.split('.')) {
    if (current === null || current === undefined) return undefined;

    const match = rawSegment.match(/^([^\[\]]+?)(?:\[(\d+)\])?$/);
    if (!match) return undefined;
    const [, key, index] = match;

    if (Array.isArray(current)) {
      if (key === 'length' && index === undefined) {
        current = current.length;
      } else {
        current = current[Number(key)];
      }
    } else if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }

    if (index !== undefined) {
      current = Array.isArray(current) ? current[Number(index)] : undefined;
    }
  }

  return current;
}
