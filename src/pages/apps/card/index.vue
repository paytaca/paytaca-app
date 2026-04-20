<template>
  <q-layout view="lHh Lpr lFf">
    <q-page-container :class="$q.dark.isActive ? 'bg-dark' : 'bg-grey-1'">
        <CardPageHeader />
        <router-view v-if="isloaded" :key="$route.path"></router-view>
    </q-page-container>

  </q-layout>
</template>

<script>
import CardPageHeader from 'src/components/card/CardPageHeader.vue';
import { createCardLogic } from 'src/components/card/createCard.js';
import { clearCardUserCache, loadCardUser } from 'src/services/card/user';

export default {
  mixins: [createCardLogic],
  components: {
    CardPageHeader,
  },

  data () {
    return {
      user: null,
      isloaded: false,
    }
  },

  computed: {
    textColor () {
      return this.$q.dark.isActive ? 'text-white' : 'text-dark'
    },
    textColorGrey () {
      return this.$q.dark.isActive ? 'text-grey-5' : 'text-grey-7'
    }
  },

  watch: {
    isloaded(newVal) {
      console.log('isloaded changed:', newVal)
    }
  },

  async mounted () {
    await this.loadData()
    this.isloaded = true
  },

  beforeUnmount () {
    clearCardUserCache()
  },

  methods: {
    async loadData () {
      await this.loadUser()
      this.goToHome()
    //   if (this.user?.cardCount > 0) {
    //     console.log('User has existing cards, redirecting to cards list')
    //     this.goToCardsList()
    //   } else {
    //     console.log('No existing cards for user')
    //     this.goToHome()
    //   }
      clearCardUserCache() // temporary only
    },

    async loadUser () {
        this.user = await loadCardUser().then(user => {
            console.log('Loaded card user:', user)
            return user
        }).catch(err => {
            console.error('Error loading card user:', err)
            return null
        })   
        console.log('Card user after loading:', this.user)
    },

    goToHome () {
      console.log('Going to card home page')
      this.$router.push({ name: 'app-card' })
    },

    goToCardsList () {
        console.log('Going to cards list page')
        this.$router.push({ name: 'card-list' })
    }
  }
}
</script>

<style lang="scss" scoped>
@import 'src/css/app-card.scss';
</style>
