<template>
  <!--
    This page contains setting up the username. 
  -->
  <div
    id="app-container"
    class="auction-container"
    :class="getDarkModeClass(darkMode)"
  >
    <HeaderNav :title="$t('Auction Profile')" :backnavpath="username ? '/apps/auction' : '/apps'" class="header-nav">
      <template v-slot:top-right-menu>
        <AuctionHeaderMenu />
      </template>
    </HeaderNav>
    
    <div v-if="isLoading" class="row q-col-gutter-md q-px-md q-mt-xl q-mb-md">
      <div class="col-12">
        <q-skeleton type="text" width="30%" class="q-mb-xs" height="24px" />
        <q-skeleton type="QInput" />
      </div>
      <div class="col-12 row justify-end q-mt-md">
        <q-skeleton type="QBtn" width="150px" />
      </div>
    </div>
    
    <q-form
      v-else
      ref="auctionFormRef"
      @submit.prevent="handleEditUserProfile"
    >
      <div class="row q-col-gutter-md q-px-md q-mt-xl q-mb-md">
        <div class="col-12">
          <label class="text-md text-weight-bold block q-mb-xs">Username</label>
          <q-input
            outlined
            dense
            v-model="username"
            placeholder="Enter username"
            color="pt-primary1"
            :maxlength="25"
            :bg-color="$q.dark.isActive ? 'pt-dark' : 'pt-light'"
            lazy-rules hide-bottom-space
            :rules="[ 
              val => val && val.trim().length > 0 || 'Username is required',
              val => !val || val.length <= 25 || 'Character limit reached'
            ]"
          />
          <div 
            class="text-right text-caption q-mt-xs" 
            :class="(username || '').length >= 25 ? 'text-negative' : 'text-grey-6'"
          >
            {{ (username || '').length }} / 25
          </div>
        </div>
      </div>

      <div class="row justify-end q-pr-md">
        <q-btn
          type="submit"
          no-caps
          color="primary"
          text-color="white"
          label="Update User Profile"
          class="q-px-xl q-py-sm text-bold"
          size="md"
        />
      </div>
    </q-form>
  </div>
</template>

<script setup>
import { useQuasar } from 'quasar'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { ref, computed, onMounted } from 'vue'
import { Store } from 'src/store'
//import { getBidderPublicKey } from 'src/auction/payment'
import { callAPI } from 'src/auction/api'
import { deriveOAuthCredentials } from 'src/auction/bch-oauth'

// Components
import HeaderNav from 'src/components/header-nav.vue'
import AuctionHeaderMenu from 'src/components/auction/AuctionHeaderMenu.vue'

// Quasar-related variables
const $q = useQuasar()
const $store = useStore()
const $router = useRouter()

// System variables
const darkMode = computed(() => $store.getters['darkmode/getStatus'])
const isLoading = ref(true)

// Username
const storedUsername = computed(() => $store.getters['auction/username'])
const username = ref('')

// Mounts the username (if it exists)
onMounted(async () => {
  console.log('bruh')
  username.value = $store.getters['auction/username']
  if (!username.value) console.error('No existing profile username saved.')
  isLoading.value = false
})

// Handles any username updates
const handleEditUserProfile = async () => {
  // Show loading screen while it processes
  isLoading.value = true

  try {
    const walletHash = Store.getters['global/getWallet']('bch')?.walletHash
    const credentials = await deriveOAuthCredentials()

    const method = storedUsername.value ? 'patch' : 'post'
    // api data
    const data = {
      username: username.value,
      ...(method === 'post' && { user: walletHash } ),
      ...(method === 'post' && { address: credentials.address } ),
      ...(method === 'post' && { pub_key: credentials.publicKey } )
    } 

    const response = await callAPI(
      `user-details${method === 'post' ? '' : `/${walletHash}/update`}`, 
      null, 
      method, 
      data
    )

    const timeout = 3000
    if (response.success) {
      $q.notify({
        type: 'positive',
        message: `User profile ${method === 'post' ?  'created' : 'updated'}!` ,
        timeout
      })

      $router.push('/apps/auction')
    } else {
      // Couldn't save the username to database
      // Notify based if it was a network error or something else
      const hasNetworkError = $store.getters['auction/hasNetworkError']
      $q.notify({
        type: 'negative',
        message: hasNetworkError ? 'Network error occurred. Please try again.' : 'Username already exists!',
        timeout
      })
    }   
    
  } catch (err) {
    // Something unexpected occurred
    $q.notify({ 
      type: 'negative', 
      message: err.message || 'Something went wrong.' 
    })
  }

  // End loading screen
  isLoading.value = false
}



</script>