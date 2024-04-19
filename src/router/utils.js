export const castNumberSafe = val => !Number.isNaN(Number(val)) ? Number(val) : val
export const castBooleanSafe = val => {
  switch(val) {
    case 'true': return true
    case 'false': return false
    default: val
  }
}

export function removeNullish(obj) {
  if (!obj) return obj
  Object.getOwnPropertyNames(obj).forEach(name => {
    if (obj[name] === null || obj[name] === undefined) delete obj[name]
  }) 
  return obj
}
