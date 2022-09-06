import { boot } from 'quasar/wrappers'
import Footer from '../components/footer-menu'

export default boot(({ app }) => {
    app.component('footer-menu', Footer)
})
