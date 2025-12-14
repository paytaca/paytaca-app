<template>
  <div id="app-container" class="sticky-header-container" :class="getDarkModeClass(darkMode)">
    <header-nav :title="$t('Support', {}, 'Support')" backnavpath="/apps" class="header-nav header-nav apps-header" />
    <div class="row" :style="{ 'margin-top': $q.platform.is.ios ? '-5px' : '-25px'}">
      <div class="col-12 q-px-lg q-mt-md">
        <p class="q-px-sm q-my-sm section-title text-subtitle1" :class="getDarkModeClass(darkMode)">
          {{ $t('GetHelp') }}
        </p>
        <q-list class="pt-card settings-list" :class="getDarkModeClass(darkMode)">
          <q-item clickable v-ripple @click="openUrl('https://paytaca.com/support')">
            <q-item-section>
              <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">
                {{ $t('HelpCenter') }}
              </q-item-label>
              <q-item-label caption style="line-height:1;margin-top:3px;" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
                {{ $t('HelpCenterDescription') }}
              </q-item-label>
            </q-item-section>
            <q-item-section avatar>
              <q-icon name="help" :class="darkMode ? 'pt-setting-avatar-dark' : 'text-grey'"></q-icon>
            </q-item-section>
          </q-item>
          <q-item clickable v-ripple @click="openUrl('https://paytaca.com/faq')">
            <q-item-section>
              <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">
                {{ $t('FAQ') }}
              </q-item-label>
              <q-item-label caption style="line-height:1;margin-top:3px;" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
                {{ $t('FAQDescription') }}
              </q-item-label>
            </q-item-section>
            <q-item-section avatar>
              <q-icon name="quiz" :class="darkMode ? 'pt-setting-avatar-dark' : 'text-grey'"></q-icon>
            </q-item-section>
          </q-item>
          <q-item clickable v-ripple @click="openUrl('mailto:support@paytaca.com')">
            <q-item-section>
              <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">
                {{ $t('ContactSupport') }}
              </q-item-label>
              <q-item-label caption style="line-height:1;margin-top:3px;" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
                {{ $t('ContactSupportDescription', { supportEmail: 'support@paytaca.com' }, `Email us at support@paytaca.com`) }}
              </q-item-label>
            </q-item-section>
            <q-item-section avatar>
              <q-icon name="email" :class="darkMode ? 'pt-setting-avatar-dark' : 'text-grey'"></q-icon>
            </q-item-section>
          </q-item>
        </q-list>
      </div>

      <div class="col-12 q-px-lg q-mt-md">
        <p class="q-px-sm q-my-sm section-title text-subtitle1" :class="getDarkModeClass(darkMode)">{{ $t('Community', {}, 'Community') }}</p>
        <q-list class="pt-card settings-list" :class="getDarkModeClass(darkMode)">
          <q-item clickable v-ripple @click="openUrl('https://t.me/PaytacaWalletApp')">
            <q-item-section>
              <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">
                {{ $t('Telegram') }}
              </q-item-label>
              <q-item-label caption style="line-height:1;margin-top:3px;" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
                {{ $t('TelegramDescription') }}
              </q-item-label>
            </q-item-section>
            <q-item-section avatar>
              <q-icon name="mdi-telegram" :class="darkMode ? 'pt-setting-avatar-dark' : 'text-grey'"></q-icon>
            </q-item-section>
          </q-item>
          <q-item clickable v-ripple @click="openUrl('https://github.com/paytaca/paytaca-app')">
            <q-item-section>
              <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">
                {{ $t('GitHub') }}
              </q-item-label>
              <q-item-label caption style="line-height:1;margin-top:3px;" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
                {{ $t('GitHubDescription') }}
              </q-item-label>
            </q-item-section>
            <q-item-section avatar>
              <q-icon name="code" :class="darkMode ? 'pt-setting-avatar-dark' : 'text-grey'"></q-icon>
            </q-item-section>
          </q-item>
        </q-list>
      </div>

      <div class="col-12 q-px-lg q-mt-md" style="padding-bottom: 30px;">
        <p class="q-px-sm q-my-sm section-title text-subtitle1" :class="getDarkModeClass(darkMode)">{{ $t('Resources', {}, 'Resources') }}</p>
        <q-list class="pt-card settings-list" :class="getDarkModeClass(darkMode)">
          <q-item clickable v-ripple @click="openUrl('https://paytaca.com')">
            <q-item-section>
              <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">
                {{ $t('Website') }}
              </q-item-label>
              <q-item-label caption style="line-height:1;margin-top:3px;" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
                {{ $t('WebsiteDescription', { website: 'paytaca.com' }, 'Visit paytaca.com') }}
              </q-item-label>
            </q-item-section>
            <q-item-section avatar>
              <q-icon name="language" :class="darkMode ? 'pt-setting-avatar-dark' : 'text-grey'"></q-icon>
            </q-item-section>
          </q-item>
          <q-item clickable v-ripple @click="openUrl('https://paytaca.com/docs')">
            <q-item-section>
              <q-item-label class="pt-setting-menu" :class="getDarkModeClass(darkMode)">
                {{ $t('Documentation') }}
              </q-item-label>
              <q-item-label caption style="line-height:1;margin-top:3px;" :class="darkMode ? 'text-grey-5' : 'text-grey-8'">
                {{ $t('DocumentationDescription') }}
              </q-item-label>
            </q-item-section>
            <q-item-section avatar>
              <q-icon name="menu_book" :class="darkMode ? 'pt-setting-avatar-dark' : 'text-grey'"></q-icon>
            </q-item-section>
          </q-item>
        </q-list>
      </div>
    </div>
  </div>
</template>

<script>
import HeaderNav from '../../components/header-nav'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
export default {
  name: 'app-support',
  components: {
    HeaderNav
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus']
    }
  },
  computed: {
    toggleColor () {
      const theme = this.$store.getters['global/theme']
      if (theme === 'glassmorphic-red') return 'pink-6'
      if (theme === 'glassmorphic-green') return 'green-6'
      if (theme === 'glassmorphic-gold') return 'amber-7'
      return 'blue-6'
    }
  },
  methods: {
    getDarkModeClass,
    showDeleteDialog () {
      const vm = this
      vm.disableDeleteButton = true
      vm.$q.dialog({
        title: this.$t('DeleteWallet'),
        message: this.$t('DeleteWalletDescription'),
        dark: true,
        cancel: this.$t('Cancel'),
        seamless: true,
        ok: this.$t('Yes')
      }).onOk(() => {
        vm.deletingWalletDialog()
        vm.deleteWallet(vm)
      }).onCancel(() => {
        vm.disableDeleteButton = false
      })
    },
    switchWallet (index) {
      const vm = this
      const currentWalletIndex = this.$store.getters['global/getWalletIndex']
      if (index !== currentWalletIndex) {
        const asset = this.$store.getters['assets/getAllAssets']
        vm.$store.commit('assets/updateVaultSnapshot', { index: currentWalletIndex, snapshot: asset })
        vm.$store.commit('assets/updatedCurrentAssets', index)

        vm.$store.dispatch('global/switchWallet', index).then(function () {
          vm.$router.push('/')
          setTimeout(() => { location.reload() }, 500)
        })
      }
    },
    openUrl (url) {
      if (url.startsWith('mailto:')) {
        window.location.href = url
      } else {
        window.open(url, '_blank', 'noopener,noreferrer')
      }
    }
  },
}
</script>

<style lang="scss" scoped>
  .section-title {
    font-weight: 600;
    font-size: 16px;
    letter-spacing: 0.5px;
    opacity: 0.85;
    
    &.dark {
      color: rgba(255, 255, 255, 0.8);
    }
    &.light {
      color: rgba(0, 0, 0, 0.6);
    }
  }

  .pt-setting-menu {
    font-weight: 400;
    font-size: 15px;
    &.dark {
      color: #e0e2e5;
    }
    &.light {
      color: rgba(0, 0, 0, 0.87);
    }
  }
  
  .pt-setting-avatar-dark {
    color: #A6ACAF;
  }

  .pt-label {
    font-size: 14px;
    &.dark {
      color: #e0e2e5;
    }
    &.light {
      color: rgba(0, 0, 0, 0.87);
    }
  }
  
  .pt-card {
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  .settings-list {
    .q-item {
      padding: 16px 20px;
      min-height: 64px;
      
      &:not(:last-child) {
        border-bottom: 1px solid rgba(0, 0, 0, 0.06);
      }

      &.dark:not(:last-child) {
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      }
    }

    :deep(.q-item__label--caption) {
      opacity: 0.7;
      margin-top: 4px;
      line-height: 1.3;
      font-size: 13px;
    }
  }

  #app-container {
    &.dark {
      .settings-list .q-item {
        &:not(:last-child) {
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
      }
    }
    
    &.light {
      .settings-list .q-item {
        &:not(:last-child) {
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
        }
      }
    }
  }
</style>
