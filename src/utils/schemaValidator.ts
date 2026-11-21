interface JsonSchema {
  type?: string;
  required?: string[];
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
}

const TYPE_CHECKS: Record<string, (value: unknown) => boolean> = {
  object: v => typeof v === 'object' && v !== null && !Array.isArray(v),
  array: Array.isArray,
  string: v => typeof v === 'string',
  number: v => typeof v === 'number' && Number.isFinite(v),
  integer: v => typeof v === 'number' && Number.isInteger(v),
  boolean: v => typeof v === 'boolean',
  null: v => v === null
};

const describe = (value: unknown): string => {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
};

/**
 * Lightweight JSON schema validation supporting the subset used by the
 * schemas/ directory: type, required, properties and items.
 * Returns a list of human-readable errors (empty when valid).
 */
export function validateSchema(value: unknown, schema: JsonSchema, path = '$'): string[] {
  const errors: string[] = [];

  if (schema.type) {
    const check = TYPE_CHECKS[schema.type];
    if (!check) {
      errors.push(`${path}: unknown schema type "${schema.type}"`);
    } else if (!check(value)) {
      errors.push(`${path}: expected ${schema.type}, got ${describe(value)}`);
    }
  }

  if (schema.required && typeof value === 'object' && value !== null && !Array.isArray(value)) {
    for (const key of schema.required) {
      if (!(key in (value as object))) {
        errors.push(`${path}: missing required property "${key}"`);
      }
    }
  }

  if (schema.properties && typeof value === 'object' && value !== null && !Array.isArray(value)) {
    for (const [key, childSchema] of Object.entries(schema.properties)) {
      const childValue = (value as Record<string, unknown>)[key];
      if (childValue !== undefined) {
        errors.push(...validateSchema(childValue, childSchema, `${path}.${key}`));
      }
    }
  }

  if (schema.items && Array.isArray(value)) {
    value.forEach((item, index) => {
      errors.push(...validateSchema(item, schema.items!, `${path}[${index}]`));
    });
  }

  return errors;
}
