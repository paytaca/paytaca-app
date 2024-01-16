
export function setAuthCookie (token, expiresAt) {
  document.cookie = `token=${token}; expires=${new Date(expiresAt).toUTCString()}; path=/`
  console.log('cookie:', document.cookie)
}

export function getAuthCookie () {
  const cookieArr = document.cookie.split('; ')
  for (let i = 0; i < cookieArr.length; i++) {
    const cookiePair = cookieArr[i].split('=')
    if (cookiePair[0] === 'token') {
      return decodeURIComponent(cookiePair[1])
    }
  }
  return null
}

export function clearAuthCookie () {
  document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
  console.log('cookie:', document.cookie)
}
