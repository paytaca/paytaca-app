export default function Router () {
  return {
    resolve: (to) => ({ to, href: `#/${to?.name || ''}` })
  }
}
