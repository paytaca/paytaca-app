<template>
  <q-layout view="lHh Lpr lFf">
    <q-page-container :class="$q.dark.isActive ? 'bg-dark' : 'bg-grey-1'">
      <CardPageHeader />
      
      <q-page class="flex flex-center q-pa-md">
        <div class="column items-center full-width" style="max-width: 650px;">
          
          <!-- Hero Section -->
          <div 
            class="text-center q-mb-lg"
            :class="$q.dark.isActive ? 'text-white' : 'text-dark'"
          >
            <div class="text-subtitle1 text-grey-6">
              {{ $t('Manage your Paytaca cards') }}
            </div>
          </div>
          
          <!-- Main Create Card Button - Large Card Style -->
          <q-card
            flat
            class="create-card-action q-pa-xl text-center full-width cursor-pointer"
            :class="$q.dark.isActive ? 'bg-grey-9' : 'bg-white'"
            @click="openCreateCardDialog"
          >
            <div class="text-h4 text-weight-bold q-mb-sm" :class="textColor">
              {{ $t('Create New Card') }}
            </div>
            
            <div class="text-body1 text-grey-6 q-mb-lg" style="max-width: 300px; margin: 0 auto;">
              {{ $t('Start using secure blockchain payments') }}
            </div>
            
            <div class="create-card-icon q-mb-md">
              <q-icon name="add_circle_outline" size="48px" color="primary" />
            </div>
            
            <div class="tap-icon-container text-center">
              <q-icon name="touch_app" size="24px" color="grey-5" class="tap-icon q-mb-xs" />
              <div class="text-caption text-grey-6">
                {{ $t('Tap anywhere to create') }}
              </div>
            </div>
          </q-card>
          
          <!-- Or View Existing Cards -->
          <div v-if="subCards.length > 0" class="q-mt-md text-center">
            <q-btn
              flat
              no-caps
              color="grey-7"
              class="view-cards-btn"
              @click="$router.push({ name: 'stacked-cards' })"
            >
              <q-icon name="credit_card" class="q-mr-sm" />
              {{ $t('View') }} {{ subCards.length }} {{ $t('existing card(s)') }}
              <q-icon name="chevron_right" class="q-ml-xs" />
            </q-btn>
          </div>
          
          <!-- Features Section - Modern Design -->
          <div class="features-container q-mt-xl full-width">
            <div class="text-caption text-grey-6 text-uppercase text-center q-mb-md">
              {{ $t('Features') }}
            </div>
            
            <div class="row q-col-gutter-md">
              <div class="col-12 col-sm-4">
                <div 
                  class="feature-item text-center q-pa-md"
                  :class="$q.dark.isActive ? 'feature-dark' : 'feature-light'"
                >
                  <div class="feature-icon-wrapper q-mb-sm">
                    <q-icon name="security" color="positive" size="28px" />
                  </div>
                  <div class="text-subtitle2 text-weight-bold">{{ $t('Secure') }}</div>
                  <div class="text-caption text-grey-6 q-mt-xs">{{ $t('Blockchain protected') }}</div>
                </div>
              </div>
              <div class="col-12 col-sm-4">
                <div 
                  class="feature-item text-center q-pa-md"
                  :class="$q.dark.isActive ? 'feature-dark' : 'feature-light'"
                >
                  <div class="feature-icon-wrapper q-mb-sm">
                    <q-icon name="bolt" color="warning" size="28px" />
                  </div>
                  <div class="text-subtitle2 text-weight-bold">{{ $t('Fast') }}</div>
                  <div class="text-caption text-grey-6 q-mt-xs">{{ $t('Instant payments') }}</div>
                </div>
              </div>
              <div class="col-12 col-sm-4">
                <div 
                  class="feature-item text-center q-pa-md"
                  :class="$q.dark.isActive ? 'feature-dark' : 'feature-light'"
                >
                  <div class="feature-icon-wrapper q-mb-sm">
                    <q-icon name="language" color="info" size="28px" />
                  </div>
                  <div class="text-subtitle2 text-weight-bold">{{ $t('Global') }}</div>
                  <div class="text-caption text-grey-6 q-mt-xs">{{ $t('Worldwide access') }}</div>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </q-page>
    </q-page-container>
    
    <!-- Create Card Dialog -->
    <createCardDialog 
      v-model="createCardDialog"
      v-model:newCardName="newCardName"
      @handleCreateCard="handleCreateCard"
    />
  </q-layout>
</template>

<script>
import { createCardLogic } from './createCard.js'
// import createCardDialog from './createCardDialog.vue';
import CardPageHeader from './CardPageHeader.vue';

export default {
  mixins: [createCardLogic],
  components: {
    CardPageHeader,
  },

  computed: {
    textColor () {
      return this.$q.dark.isActive ? 'text-white' : 'text-dark'
    },
    textColorGrey () {
      return this.$q.dark.isActive ? 'text-grey-5' : 'text-grey-7'
    }
  },

  mounted () {
    // Check if cards exists as soon as the component loads
    this.checkExistingCards()
    // TODO: Switch to backend - use await this.getCards() instead
  }
}
</script>

<style lang="scss" scoped>
@import "src/css/app-card.scss";
</style>
