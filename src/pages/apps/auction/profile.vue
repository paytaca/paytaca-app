<template>
  <div
    id="app-container"
    class="auction-container"
    :class="getDarkModeClass(darkMode)"
  >
    <HeaderNav :title="$t('Profile')" backnavpath="/apps/auction" class="header-nav">
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
            :maxlength="20"
            :bg-color="$q.dark.isActive ? 'pt-dark' : 'pt-light'"
            lazy-rules hide-bottom-space
            :rules="[ 
              val => val && val.trim().length > 0 || 'Username is required',
              val => !val || val.length <= 20 || 'Character limit reached'
            ]"
          />
          <div 
            class="text-right text-caption q-mt-xs" 
            :class="(username || '').length >= 20 ? 'text-negative' : 'text-grey-6'"
          >
            {{ (username || '').length }} / 20
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
import { getBidderPublicKey } from 'src/auction/payment'
import { callAPI } from 'src/auction/api'
import { deriveOAuthCredentials } from 'src/auction/bch-oauth'

// Components
import HeaderNav from 'src/components/header-nav.vue'
import AuctionHeaderMenu from 'src/components/auction/AuctionHeaderMenu.vue'

const $q = useQuasar()
const $store = useStore()
const $router = useRouter()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const username = ref('')
const isLoading = ref(true)

onMounted(async () => {
  try {
    if ($store.getters['auction/username']) {
      username.value = $store.getters['auction/username']
    }
  } catch (err) {
    console.error('Failed to fetch existing profile username:', err)
  } finally {
    isLoading.value = false
  }
})

const handleEditUserProfile = async () => {
  try {
    const walletHash = Store.getters['global/getWallet']('bch')?.walletHash
    const credentials = await deriveOAuthCredentials()
    const method = $store.getters['auction/username'] ? 'patch' : 'post'

    let response

    if (method === 'post') {
      response = await callAPI('user-details', null, method, {
        username: username.value,
        user: walletHash,
        address: credentials.address
      })
    } else {
      response = await callAPI(`user-details/${walletHash}/update`, null, method, { username: username.value })
    }

    if (response.success) {
      $q.notify({
        type: 'positive',
        message: $store.getters['auction/username'] ? 'User profile updated!' : 'User profile created!',
        timeout: 3000
      })

      $router.push('/apps/auction')
    } else {
      $q.notify({
        type: 'negative',
        message: 'Username already exists!',
        timeout: 3000
      })
    }
  } catch (err) {
    console.error(err)
    $q.notify({ type: 'negative', message: err.message || 'Something went wrong.' })
  }
}
</script>