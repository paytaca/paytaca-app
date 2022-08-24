import { boot } from 'quasar/wrappers'
import VueConfetti from 'vue-confetti'

export default boot(({ app }) => {
    app.use(VueConfetti)
})
