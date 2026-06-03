<template>
  <q-pull-to-refresh
    id="app-container"
    :class="getDarkModeClass(darkMode)"
    @refresh="refreshPage"
  >
    <HeaderNav
      :title="$t('PaymentHub', {}, 'Payment Hub')"
      backnavpath="/apps"
      class="apps-header"
    />

    <div class="q-px-md q-pb-md" :class="darkMode ? 'text-grey-2' : 'text-grey-10'">
      <!-- Header Section -->
      <div class="row items-center q-mt-md q-mb-md">
        <div class="text-h5 q-mr-sm">{{ $t('Stores', {}, 'Stores') }}</div>
        <q-space/>
        <q-btn
          round
          icon="add"
          class="button text-white bg-grad"
          size="md"
          @click="openStoreInfoDialog()"
        />
      </div>

      <!-- Loading Progress -->
      <div class="q-pt-sm q-mb-md">
        <q-linear-progress v-if="fetchingStores" query reverse rounded color="pt-primary1"/>
        <div v-else class="q-pb-xs"></div>
      </div>

      <!-- Empty State -->
      <div v-if="!fetchingStores && !storesList?.length" class="text-center q-mt-xl">
        <q-icon name="store" size="4em" class="text-grey q-mb-md" />
        <div class="text-h6 text-grey q-mb-xs">{{ $t('NoStores', {}, 'No Stores') }}</div>
        <div class="text-body2 text-grey q-mb-lg">{{ $t('NoRecords', {}, 'No records') }}</div>
        <q-btn
          unelevated
          rounded
          color="pt-primary1"
          :label="$t('AddStore', {}, 'Add Store')"
          icon="add"
          class="button"
          @click="openStoreInfoDialog()"
        />
      </div>

      <!-- Stores List -->
      <div v-else class="stores-grid">
        <q-card
          v-for="store in storesList"
          :key="store.id"
          class="store-card br-15 pt-card text-bow q-mb-md"
          :class="getDarkModeClass(darkMode)"
          v-ripple
          @click="goToStorePage(store)"
        >
          <q-card-section class="q-pa-md">
            <div class="row items-center">
              <div class="store-icon-wrapper q-mr-md">
                <q-icon name="storefront" size="2em" :color="darkMode ? 'white' : 'pt-primary1'" />
              </div>

              <div class="col">
                <div class="text-h6 text-weight-medium">{{ store.name }}</div>
                <div class="text-caption text-grey">ID: #{{ store.id }}</div>
              </div>

              <q-btn
                flat
                round
                dense
                icon="more_vert"
                @click.stop
              >
                <q-menu class="pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
                  <q-list style="min-width: 150px;">
                    <q-item clickable v-close-popup @click="goToStorePage(store)">
                      <q-item-section avatar><q-icon name="visibility" /></q-item-section>
                      <q-item-section>{{ $t('View') }}</q-item-section>
                    </q-item>
                    <q-item clickable v-close-popup @click="openStoreInfoDialog(store)">
                      <q-item-section avatar><q-icon name="edit" /></q-item-section>
                      <q-item-section>{{ $t('Edit') }}</q-item-section>
                    </q-item>
                    <q-separator />
                    <q-item clickable v-close-popup @click="confirmDeleteStore(store)">
                      <q-item-section avatar><q-icon name="delete" color="red" /></q-item-section>
                      <q-item-section class="text-red">{{ $t('Delete') }}</q-item-section>
                    </q-item>
                  </q-list>
                </q-menu>
              </q-btn>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Dialog Placeholder -->
    <!-- You should import and use StoreInfoDialog here -->
  </q-pull-to-refresh>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useI18n } from 'vue-i18n'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import HeaderNav from 'src/components/header-nav'
import StoreInfoDialog from 'src/components/payment-hub/StoreInfoDialog.vue'

const $store = useStore()
const $router = useRouter()
const $q = useQuasar()
const { t: $t } = useI18n()

const darkMode = computed(() => $store.getters['darkmode/getStatus'])

// Placeholder data
const storesList = ref([
  { id: 1, name: 'Main Store' },
  { id: 2, name: 'Secondary Store' }
])
const fetchingStores = ref(false)

onMounted(() => {
  refreshPage()
})

async function refreshPage(done) {
  fetchingStores.value = true
  // TODO: Implement auto-registration/login logic here
  // Check if user has a token, if not, generate one
  
  // TODO: Fetch stores from API
  setTimeout(() => {
    fetchingStores.value = false
    if (done) done()
  }, 1000)
}

function openStoreInfoDialog(storeData) {
  $q.dialog({
    component: StoreInfoDialog,
    componentProps: {
      storeData: storeData
    }
  }).onOk((data) => {
    // TODO: Update local list or re-fetch
    console.log('Store saved:', data)
  })
}

function goToStorePage(store) {
  $router.push({
    name: 'payment-hub-store-detail',
    params: { storeId: store.id },
    query: { name: store.name }
  })
}

function confirmDeleteStore(store) {
  $q.dialog({
    title: $t('DeleteStore', {}, 'Delete Store'),
    message: $t('AreYouSure', {}, 'Are you sure?'),
    ok: { label: $t('Delete'), color: 'red', unelevated: true, rounded: true },
    cancel: { label: $t('Cancel'), flat: true, color: 'grey' },
    class: `br-15 pt-card-2 text-bow ${getDarkModeClass(darkMode.value)}`
  }).onOk(() => {
    // TODO: Implement delete logic
    console.log('Deleting store:', store.id)
    storesList.value = storesList.value.filter(s => s.id !== store.id)
  })
}
</script>

<style lang="scss" scoped>
.stores-grid {
  display: flex;
  flex-direction: column;
}

.store-card {
  transition: all 0.3s ease;
  cursor: pointer;
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
}

.store-icon-wrapper {
  background: rgba(var(--q-primary-rgb), 0.1);
  padding: 10px;
  border-radius: 12px;
}
</style>
