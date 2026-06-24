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

    <q-form
      ref="auctionFormRef"
      @submit.prevent="handleEditUserProfile"
    >
      <div class="row q-col-gutter-md q-px-md q-mt-xl q-mb-md">
        <div class="col-12 col-sm-6">
          <label class="text-md text-weight-bold block q-mb-xs">Username</label>
          <q-input
            outlined
            dense
            v-model="username"
            placeholder="Enter username"
            color="pt-primary1"
            :bg-color="$q.dark.isActive ? 'pt-dark' : 'pt-light'"
            lazy-rules hide-bottom-space
            :rules="[ val => val && val.trim().length > 0 || 'Username is required' ]"
          />
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
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import { ref, computed } from 'vue'
import { Store } from 'src/store'
import { callAPI } from 'src/auction/api'

// Components
import HeaderNav from 'src/components/header-nav.vue'
import AuctionHeaderMenu from 'src/components/auction/AuctionHeaderMenu.vue'

const $q = useQuasar()
const $store = useStore()
const $router = useRouter()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const username = ref('')

const handleEditUserProfile = async () => {
  try {
    const response = await callAPI('user-details', null , 'post', {
      username: username.value,
      user_id: Store.getters['global/getWallet']('bch')?.walletHash
    })

    if (response.success) {
      $q.notify({
        type: 'positive',
        message: 'User profile updated!',
        timeout: 3000
      })
    }
  } catch (err) {
    console.error(err)
    $q.notify({ type: 'negative', message: err.message || 'Something went wrong.' })
  } finally {
    $router.push('/apps/auction')
  }
}
</script>