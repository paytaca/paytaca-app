export function getUserAvatarLink (name) {
  return `https://ui-avatars.com/api/?background=random&name=${ name }&color=fffff&length=1`
}

export function getCountryFlag(code) {
  return `https://flagsapi.com/${code}/flat/24.png`
}