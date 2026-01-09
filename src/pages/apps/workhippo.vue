<template>
  <div id="app-container" class="workhippo-page text-bow" :class="getDarkModeClass(darkMode)">
    <header-nav 
      :title="$t('WorkHippo', {}, 'WorkHippo')"
      backnavpath="/apps/get-bch"
    />
    
    <div class="content-container q-pa-lg">
      <!-- Hero Section -->
      <div class="hero-section text-center q-mb-xl">
        <q-icon name="work" size="4em" color="primary" class="q-mb-md" />
        <h4 class="text-h4 text-weight-bold q-mb-sm" :class="getDarkModeClass(darkMode)">
          {{ $t('WorkHippo', {}, 'WorkHippo') }}
        </h4>
        <p class="text-body1 q-mb-lg" :class="darkMode ? 'text-grey-5' : 'text-grey-7'" style="max-width: 600px; margin: 0 auto;">
          {{ $t('WorkHippoTagline', {}, 'An upcoming freelance work platform') }}
        </p>
      </div>

      <!-- Content Section -->
      <div class="info-content q-mb-xl">
        <q-card class="info-card br-15" :class="getDarkModeClass(darkMode)">
          <q-card-section class="q-pa-lg">
            <div class="text-h6 text-weight-bold q-mb-md" :class="getDarkModeClass(darkMode)">
              {{ $t('AboutWorkHippo', {}, 'About WorkHippo') }}
            </div>
            <div class="text-body1 q-mb-md" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
              {{ $t('WorkHippoDescription', {}, 'WorkHippo is an upcoming freelance work platform that will allow you to earn Bitcoin Cash by completing various freelance tasks and projects.') }}
            </div>
            <div class="text-body1 q-mb-md" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
              {{ $t('WorkHippoComingSoon', {}, 'This platform is currently under development. Stay tuned for updates!') }}
            </div>
          </q-card-section>
        </q-card>

        <!-- Contact Section -->
        <q-card class="info-card br-15 q-mt-md" :class="getDarkModeClass(darkMode)">
          <q-card-section class="q-pa-lg">
            <div class="text-h6 text-weight-bold q-mb-md" :class="getDarkModeClass(darkMode)">
              {{ $t('Contact', {}, 'Contact') }}
            </div>
            <div class="text-body1 q-mb-md" :class="darkMode ? 'text-grey-5' : 'text-grey-7'">
              {{ $t('WorkHippoContact', {}, 'For more information or collaboration opportunities, visit the WorkHippo website.') }}
            </div>
            <div class="q-mt-md">
              <q-btn
                unelevated
                no-caps
                color="primary"
                icon="language"
                :label="$t('VisitWebsite', {}, 'Visit workhippo.app')"
                @click="openWebsite"
                class="full-width"
              />
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import HeaderNav from 'src/components/header-nav'

export default {
  name: 'WorkHippo',
  components: {
    HeaderNav
  },
  computed: {
    darkMode() {
      return this.$store.getters['darkmode/getStatus']
    }
  },
  methods: {
    getDarkModeClass,
    openWebsite() {
      window.open('https://workhippo.app', '_blank')
    }
  }
}
</script>

<style lang="scss">
#app-container.workhippo-page {
  height: 100vh !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  display: block !important;
  padding-bottom: 80px;
  
  .header-nav-wrapper {
    position: -webkit-sticky !important;
    position: sticky !important;
    top: 0 !important;
    z-index: 1000 !important;
  }
}

#app-container.workhippo-page .content-container {
  max-width: 800px;
  margin: 0 auto;
}

#app-container.workhippo-page .hero-section {
  padding: 20px 0;
}

#app-container.workhippo-page .info-content {
  .info-card {
    transition: all 0.3s ease;
    border: 1px solid transparent;
  }
}

#app-container.workhippo-page.dark {
  .info-card {
    border-color: rgba(255, 255, 255, 0.1);
  }
}
</style>

