<template>
  <div>
    <q-card
      class="pt-card text-bow shadow-1 br-15" :class="getDarkModeClass(darkMode)"
      style="max-width:min(80vw, 500px);margin:auto;"
    >
      <q-card-section class="q-pa-lg">
        <div class="text-center text-h6 q-mb-md">Arbiter Login</div>
        <div v-if="loggingIn" class="text-center q-py-md">
          <q-spinner size="3rem"/>
          <div v-if="loginStatus" class="q-mt-md">{{ loginStatus }}</div>
        </div>
        <q-form v-else @submit="() => login()">
          <q-banner dense rounded class="bg-grey text-white q-my-md">
            <template v-slot:avatar>
              <q-icon name="info" size="1.75em"/>
            </template>
            Input WIF key of arbiter to login
          </q-banner>
          <!-- <div class="text-body2 q-my-sm text-center">
            Input WIF key of arbiter to login
          </div> -->
          <q-input
            dense
            outlined
            :disable="loggingIn"
            :type="showLoginInput ? 'text' :'password'"
            v-model="loginInput"
            bottom-slots
          >
            <template v-slot:append>
              <q-btn
                flat
                :icon="showLoginInput ? 'visibility' : 'visibility_off'"
                padding="sm"
                :disable="loggingIn"
                @click="() => showLoginInput = !showLoginInput"
              />
            </template>
          </q-input>

          <q-btn
            :disable="loggingIn"
            type="submit"
            no-caps
            label="Login"
            color="brandblue"
            class="full-width"
          />
        </q-form>
      </q-card-section>
    </q-card>
  </div>
</template>
<script setup>
import { getDarkModeClass } from "src/utils/theme-darkmode-utils";
import { generateKeypair } from "src/marketplace/chat/keys";
import { arbiterBackend, ecdsaSign, parseWif, setArbiterKeys } from "src/marketplace/arbiter";
import { cachedBackend } from "src/marketplace/backend";
import { useStore } from "vuex";
import { computed, ref } from "vue";
import { EscrowArbiter } from "src/marketplace/objects";

const $emit = defineEmits([
  'login',
])

const $store = useStore()
const darkMode = computed(() => $store.getters['darkmode/getStatus'])

const showLoginInput = ref(false)
const loginInput = ref('')

const loggingIn = ref(false)
const loginStatus = ref('')
const loginError = ref('')

async function login() {
  loggingIn.value = true

  loginError.value = ''
  return loginProcess()
    .catch(error => {
      console.error(error)
      if (!loginError.value) loginError.value = 'Unknown error'
    })
    .finally(() => {
      loggingIn.value = false
      loginStatus.value = ''
    })
}

const lastNonce = ref({ pubkey: '', nonce: '', expiresAt: 0 })
async function loginProcess() {
  const { wif, pubkey, address, chat } = parseWif(loginInput.value)

  if (lastNonce.value.pubkey != pubkey || lastNonce.value.expiresAt + 5000 < Date.now()) {
    loginStatus.value = 'Generating authentication challenge'
    const authChallengeResponse = await arbiterBackend.post(
      `connecta/escrow-arbiters/auth_token/`,
      { type: 'nonce', pubkey: pubkey },
    ).catch(error => {
      loginError.value = 'Unable to fetch authentication challenge'
      if (error?.response?.data?.detail?.indexOf?.('No matching arbiter found')) {
        loginError.value = 'No arbiter found with the provided key'
      }
      return Promise.reject(error)
    })
    const nonce = authChallengeResponse.data?.nonce
    const expiresAt = new Date(authChallengeResponse.data?.expires_at).getTime()
    lastNonce.value = { pubkey: pubkey, nonce: nonce, expiresAt: expiresAt }
  }

  loginStatus.value = 'Signing authentication challenge'
  let signature
  try {
    signature = ecdsaSign(wif, lastNonce.value.nonce)
  } catch(error) {
    loginError.value = 'Error in signing'
    return Promise.reject(error)
  }

  loginStatus.value = 'Sending authentication challenge'
  const authResponse = await arbiterBackend.post(
    `connecta/escrow-arbiters/auth_token/`,
    { type: 'authtoken', nonce: lastNonce.value.nonce, pubkey: pubkey, signature: signature },
  ).catch(error => {
    loginError.value = 'Error in fetching auth token'
    return Promise.reject(error)
  })

  const authToken = authResponse.data.auth_token
  const escrowArbiter = EscrowArbiter.parse(authResponse.data?.arbiter)
  if (!escrowArbiter.pubkey === pubkey) {
    loginError.value = 'Found incorrect arbiter data'
    return 
  }

  loginStatus.value = 'Saving authentication credentials'
  const storeResponse = await setArbiterKeys(wif, authToken)
  if (!storeResponse.success) {
    console.error(storeResponse)
    loginError.value = storeResponse?.error || 'Error in saving keys'
    return
  }

  $emit('login', { escrowArbiter })
  return {
    wif, pubkey, address, chat,
    escrowArbiter,
  }
}
</script>
