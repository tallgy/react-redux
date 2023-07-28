/**
 * 浅比较的 is
 * 将 0 和 -0 区分开了
 * 同时考虑到 NaN 的判断
 * @param x 
 * @param y 
 * @returns 
 */
function is(x: unknown, y: unknown) {
  if (x === y) {
    //  0 -0
    return x !== 0 || y !== 0 || 1 / x === 1 / y
  } else {
    // NaN
    return x !== x && y !== y
  }
}

/**
 * 浅比较逻辑
 * @param objA 
 * @param objB 
 * @returns 
 */
export default function shallowEqual(objA: any, objB: any) {
  if (is(objA, objB)) return true

  if (
    typeof objA !== 'object' ||
    objA === null ||
    typeof objB !== 'object' ||
    objB === null
  ) {
    return false
  }

  const keysA = Object.keys(objA)
  const keysB = Object.keys(objB)

  if (keysA.length !== keysB.length) return false

  for (let i = 0; i < keysA.length; i++) {
    if (
      !Object.prototype.hasOwnProperty.call(objB, keysA[i]) ||
      !is(objA[keysA[i]], objB[keysA[i]])
    ) {
      return false
    }
  }

  return true
}
