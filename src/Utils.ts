/**
 * Helper method.
 * Checks if object contains a key.
 */
export function containsKey<Y extends PropertyKey, X extends Record<string, unknown>>(obj: X, prop: Y): obj is X & Record<Y, unknown> {
  return prop in obj;
}

/**
 * Helper method.
 * Essentially does what `typeof obj === object` should do.
 */
export function isObject(obj: unknown): obj is Record<PropertyKey, unknown> {
  return obj !== null && typeof obj === 'object';
}