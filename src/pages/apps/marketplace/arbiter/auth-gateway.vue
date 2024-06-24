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
import { User } from "src/marketplace/objects";
import { arbiterBackend, getAuthKey } from "src/marketplace/arbiter";
import { cachedBackend } from "src/marketplace/backend";
import { useStore } from "vuex";
import { computed, ref } from "vue";

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
  const authKeyResp = await getAuthKey({
    wif: loginInput.value, 
    saveAuthToken: true,
    onUpdateStep: step => {
      if (step === 'nonce') loginStatus.value = 'Generating authentication challenge'
      if (step === 'sign') loginStatus.value = 'Signing authentication challenge'
      if (step === 'authtoken') loginStatus.value = 'Sending authentication challenge'
      if (step === 'store') loginStatus.value = 'Saving authentication credentials'
    }
  }).catch(error => {
    let errorMessage = 'Unknwon error occurred'
    if (error.name !== 'ArbiterAuthError') {
      dialog.update({ message: errorMessage })
      return Promise.reject(error)
    }

    const msg = error?.message
    if (msg == 'NoMatchingArbiterFound') {
      errorMessage = 'No arbiter found with the provided key'
    } else if (msg === 'FetchChallengeFailed') {
      errorMessage = 'Unable to fetch authentication challenge'
    } else if (msg === 'AuthChallengeSignError') {
      errorMessage = 'Error in signing'
    } else if (msg === 'IncorrectArbiterData') {
      errorMessage = 'Error in fetching auth token'
    } else if (msg === 'SaveAuthKeyError') {
      errorMessage = 'Error in saving keys'
    }
    dialog.update({ message: errorMessage })
    return Promise.reject(error)
  })

  const fetchUserResp = await arbiterBackend.get(`users/me/`).catch(console.error)
  const user = User.parse(fetchUserResp?.data)
  const result = Object.assign({}, authKeyResp, { user })
  $emit('login', result)
  return result
}

defineExpose({
  loginInput,
  login,
})
</script>
