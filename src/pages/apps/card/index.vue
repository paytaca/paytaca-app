<template>
  <q-layout view="lHh Lpr lFf" :class="$q.dark.isActive ? 'bg-dark' : 'card-page-bg-light'">
    <q-page-container :class="$q.dark.isActive ? '' : 'card-page-bg-light'">
        <!-- Show skeleton header while loading -->
        <div v-if="!isloaded" class="row items-center q-pa-md" style="min-height: 60px;">
          <q-btn flat round dense icon="arrow_back" color="primary" style="opacity: 0.3" />
          <div class="col">
            <q-skeleton type="text" width="150px" height="30px" class="q-mx-auto" />
          </div>
          <div style="width: 40px;"></div>
        </div>
        <!-- Show actual header when loaded -->
        <CardPageHeader v-else />
        <router-view v-if="isloaded" :key="$route.path"></router-view>
    </q-page-container>

  </q-layout>
</template>

<script>
import CardPageHeader from 'src/components/card/CardPageHeader.vue';
import { linkCardLogic } from 'src/components/card/linkCard.js';
import { clearCardUserCache, loadCardUser } from 'src/services/card/user';
import { bus } from 'src/wallet/event-bus';

export default {
  mixins: [linkCardLogic],
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

  created() {
    bus.on('sessionExpired', this.handleSessionExpiredEvent)
  },

  async mounted () {
    await this.loadData()
    this.isloaded = true
  },

  beforeUnmount () {
    clearCardUserCache()
    this.clearCards()
  },

  methods: {
    handleSessionExpiredEvent() {
      this.loadUser(true) // Force login to refresh session
    },

    async loadData () {
      await this.loadUser()
      console.log('USER:', this.user)
      if (this.user?.cardCount > 0) {
        console.log('User has existing cards, redirecting to cards list')
        this.goToCardsList()
      } else {
        console.log('No existing cards for user')
        this.goToHome()
      }
      clearCardUserCache() // temporary only
    },

    async loadUser (forceLogin = false) {
      if (forceLogin) {
        clearCardUserCache() // Clear cache to force fresh load
        this.showLoading(this.$t('Refreshing session...'))
      }
      this.user = await loadCardUser(forceLogin).then(user => {
        console.log('Loaded card user:', user)
        return user
      }).catch(err => {
        console.error('Error loading card user:', err)
        return null
      }).finally(() => {
        this.hideLoading()
      })
      console.log('Card user after loading:', this.user)
    },

    clearCards () {
      this.$store.commit('card/clearCards')
    },

    goToHome () {
      console.log('Going to card home page')
      this.$router.push({ name: 'app-card' })
    },

    goToCardsList () {
      console.log('Going to cards list page')
      this.$router.push({ name: 'card-list' })
    },
    
    showLoading(message) {
      this.$q.loading.show({
        message: message || this.$t('Loading...')
      });
    },

    hideLoading() {
      this.$q.loading.hide();
    }
  }
}
</script>

<style lang="scss" scoped>
@import 'src/css/app-card.scss';
</style>

<style>
.card-page-bg-light {
  background: color-mix(in srgb, var(--q-primary) 8%, rgba(248, 249, 253, 0.95)) !important;
}
</style>
