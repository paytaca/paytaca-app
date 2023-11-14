<script>
import { Browser } from '@capacitor/browser';

export default {
    async mounted () {
        const vm = this
        await Browser.open({ url: 'https://www.paytaca.com/map/' }).then(() => {
            vm.$router.push('/apps')
        });
    }
}
</script>