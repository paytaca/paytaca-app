import { registerPlugin } from '@capacitor/core'

const EscrowKey = registerPlugin('EscrowKey', {
  web: () => import('./web').then(m => new m.EscrowKeyWeb())
})

export { EscrowKey }
export default EscrowKey
