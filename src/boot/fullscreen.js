import { boot } from 'quasar/wrappers'
import VueFullscreen from 'vue-fullscreen'

export default boot(({ app }) => {
    app.use(VueFullscreen)
})