import { boot } from 'quasar/wrappers'
import VueGravatar from 'vue3-gravatar'

export default boot(({ app }) => {
  app.use(VueGravatar)
})
