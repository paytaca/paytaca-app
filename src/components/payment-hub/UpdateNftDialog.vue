<template>
  <q-dialog ref="dialogRef" @hide="onDialogHide">
    <q-card class="q-dialog-plugin br-20" :class="getDarkModeClass(darkMode)">
      <q-card-section>
        <div class="text-h6 text-weight-bold">{{ $t('UpdateSubscription') || 'Update Subscription' }}</div>
        <div class="text-caption text-grey q-mb-md">
          {{ $t('UpdateNFTDescription') || 'Modify the pledge amount or billing period for this subscription.' }}
        </div>

        <q-form @submit.prevent="submitUpdate">
          <q-input
            v-model.number="form.pledge"
            type="number"
            :label="$t('NewPledgeSats') || 'New Pledge (Satoshis)'"
            outlined
            dense
            class="q-mb-md"
            :rules="[
              val => !!val || 'Pledge is required',
              val => val <= subscription.max_pledge || `Cannot exceed max pledge of ${subscription.max_pledge} sats`
            ]"
          />

          <q-input
            v-model.number="form.period"
            type="number"
            :label="$t('NewPeriodBlocks') || 'New Period (Blocks)'"
            outlined
            dense
            class="q-mb-md"
            :rules="[
              val => !!val || 'Period is required',
              val => !subscription.min_period || val >= subscription.min_period || `Cannot be less than min period of ${subscription.min_period} blocks`,
              val => !subscription.max_period || val <= subscription.max_period || `Cannot exceed max period of ${subscription.max_period} blocks`
            ]"
          />

          <div class="row justify-end q-gutter-sm">
            <q-btn flat :label="$t('Cancel') || 'Cancel'" color="grey" v-close-popup />
            <q-btn unelevated rounded :label="$t('Update') || 'Update'" color="pt-primary1" type="submit" />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useStore } from 'vuex'
import { useDialogPluginComponent } from 'quasar'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

const props = defineProps({
  subscription: {
    type: Object,
    required: true
  }
})

const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent()

const $store = useStore()
const darkMode = computed(() => $store.state.global.darkMode)

const form = ref({
  pledge: props.subscription.pledge_satoshis,
  period: props.subscription.period_blocks
})

function submitUpdate() {
  onDialogOK({
    new_pledge: form.value.pledge,
    new_period: form.value.period
  })
}
</script>
