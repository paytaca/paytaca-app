<template>
  <div class="static-container">
    <div id="app-container" class="text-bow" :class="getDarkModeClass(darkMode)">
      <HeaderNav
        :title="$t('Card')"
        backnavpath="/apps"
        class="q-px-sm apps-header"
      />
      <div class="q-mx-lg">
        <div class="row items-center q-mt-md">
          <div class="col">
            <!-- Title -->
            <div class="row justify-center text-h6 text-bow">Authentication NFTs</div>
            
            
            <!-- Search -->
            <div class="row justify-center q-mt-sm q-mx-md">
              <q-input class="col" dense label="Search by merchant..">
                <template v-slot:append>
                  <q-btn flat dense icon="search" class="cursor-pointer" />
                </template>
              </q-input>
              <q-btn
                flat
                dense
                size="md"
                icon="add_circle"
                class="col-auto q-ml-sm"
                color="primary"
                label="new"
              />
            </div>

            <!-- <div class="row justify-end q-mx-md">
              <q-btn
                flat
                dense
                icon="add"
                class="q-ml-sm col-auto"
                color="primary"
                label="issue"
              />
            </div> -->

            <!-- Loading -->
            <div v-if="loading" class="row justify-center q-mt-lg">
              <q-spinner color="primary" size="40px" class="q-mr-md" />
            </div>

            <div v-if="!loading" class="row justify-center" style="margin-top: 50%;">
              <div v-if="authTokens.length === 0">
                <div class="text-subtitle2 text-bow" style="opacity: 0.5;">No authentication NFTs found.</div>
              </div>
              <div v-else>
                <q-card v-for="token in authTokens" :key="token.id" class="my-card">
                  <q-card-section>
                    <div class="text-h6">{{ token.name }}</div>
                    <div class="text-subtitle2">{{ token.description }}</div>
                  </q-card-section>
                </q-card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import HeaderNav from 'components/header-nav'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  components: {
    HeaderNav
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      authTokens: [],
      loading: false
    }
  },
  methods: {
    getDarkModeClass
    // async createCard () {
    //   this.createCardLoading = true
    //   try {
    //     const wallet = await loadWallet()
    //     this.cardInfo = await createCard({ walletId: wallet.id, isCashToken: this.isCt })
    //   } catch (error) {
    //     console.error('Error creating card:', error)
    //   } finally {
    //     this.createCardLoading = false
    //   }
    // }
  },
}
</script>
