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

export function parseRouteString (value) {
  if (!value || typeof value !== 'string') return null

  if (value.startsWith('/')) {
    if (value.startsWith('//')) return null
    const [path, queryString] = value.split('?')
    if (!queryString) return { path }
    return { path, query: Object.fromEntries(new URLSearchParams(queryString)) }
  }

  try {
    let base64 = value.replace(/-/g, '+').replace(/_/g, '/').replace(/ /g, '+')
    while (base64.length % 4) base64 += '='
    const parsed = JSON.parse(atob(base64))
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    if (typeof parsed.path !== 'string') return null
    if (!parsed.path.startsWith('/') || parsed.path.startsWith('//')) return null
    const route = { path: parsed.path }
    if (parsed.query && typeof parsed.query === 'object' && !Array.isArray(parsed.query)) {
      route.query = parsed.query
    }
    return route
  } catch (error) {
    return null
  }
}

export function stringifyRoute (route) {
  let parsed = null
  if (typeof route === 'string') {
    parsed = parseRouteString(route)
  } else if (route && typeof route === 'object' && !Array.isArray(route)) {
    if (typeof route.path === 'string' && route.path.startsWith('/') && !route.path.startsWith('//')) {
      parsed = { path: route.path }
      if (route.query && typeof route.query === 'object' && !Array.isArray(route.query)) {
        parsed.query = route.query
      }
    }
  }
  if (!parsed) return null
  return btoa(JSON.stringify(parsed))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
