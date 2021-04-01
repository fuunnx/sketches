export function range(min = 0, max) {
  if (max === undefined) {
    max = min
    min = 0
  }

  const result = []
  for (let i = min; i <= max; i++) {
    result.push(i)
  }

  return result
}
