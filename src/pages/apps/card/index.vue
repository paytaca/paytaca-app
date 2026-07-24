<template>
  <q-layout view="lHh Lpr lFf" :class="$q.dark.isActive ? 'bg-dark' : 'card-page-bg-light'">
    <q-header v-if="isloaded" class="bg-transparent text-bow">
      <CardPageHeader />
    </q-header>
    <div v-else class="row items-center q-pa-md" style="min-height: 60px;">
      <q-btn flat round dense icon="arrow_back" color="primary" style="opacity: 0.3" />
      <div class="col">
        <q-skeleton type="text" width="150px" height="30px" class="q-mx-auto" />
      </div>
      <div style="width: 40px;"></div>
    </div>
    <q-page-container :class="$q.dark.isActive ? '' : 'card-page-bg-light'">
        <router-view :key="$route.path"></router-view>
    </q-page-container>

  </q-layout>
</template>

<script>
import CardPageHeader from 'src/components/card/CardPageHeader.vue';
import { createCardLogic } from 'src/components/card/createCard.js';
import { clearCardUserCache, loadCardUser } from 'src/services/card/user';
import { cardLogger } from 'src/utils/debug-logger.js'

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

  async mounted () {
    document.documentElement.classList.add('cards-page')
    try {
      await this.loadData()
    } catch (err) {
      cardLogger.error('Error loading card layout data:', err)
    } finally {
      this.isloaded = true
    }
  },

  beforeUnmount () {
    document.documentElement.classList.remove('cards-page')
    clearCardUserCache()
    this.clearCards()
  },

  methods: {
    async loadData () {
      await this.loadUser()
    },

    async loadUser (forceLogin = false) {
      if (forceLogin) {
        clearCardUserCache() // Clear cache to force fresh load
        this.showLoading(this.$t('Refreshing session...'))
      }
      this.user = await loadCardUser(forceLogin).then(user => {
        return user
      }).catch(err => {
        return null
      }).finally(() => {
        this.hideLoading()
      })
    },

    clearCards () {
      this.$store.commit('card/clearCards')
    },

    goToHome () {
      this.$router.push({ name: 'app-card' })
    },

    goToCardsList () {
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

<style lang="scss">
@import 'src/css/app-card.scss';
</style>
