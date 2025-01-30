<template>
  <q-dialog v-model="innerVal" ref="dialogRef" position="bottom" @hide="onDialogHide">
    <q-card class="pt-card text-bow bottom-card" :class="getDarkModeClass(darkMode)">
      <q-card-section>
        <div class="row no-wrap items-center justify-center">
          <div class="text-h6">
            {{
              $t(
                'OrderIdNoSmall',
                { ID: order?.id },
                `Order #${ order?.id }`
              )
            }}
          </div>
          <q-chip :color="order?.statusColor" class="text-weight-medium text-white">
            {{ order?.formattedStatus }}
          </q-chip>
          <q-space/>
          <q-btn
            flat
            padding="sm"
            icon="close"
            v-close-popup
          />
        </div>
        <div v-if="order?.createdAt" class="text-grey text-caption bottom">
          {{ formatTimestampToText(order?.createdAt) }}
        </div>
        <div v-if="order?.customer?.fullName" class="q-mb-sm">
          <div class="text-subtitle1">{{ $t('Customer') }}</div>
          <div>{{ order?.customer?.fullName }}</div>
          <div>{{ order?.customer?.phoneNumber }}</div>
        </div>
        <div v-if="order?.deliveryAddress" class="q-mb-sm">
          <div class="text-subtitle1">{{ $t('Delivery') }}</div>
          <div v-if="order?.deliveryAddress?.fullName !== order?.customer?.fullName">
            {{ order?.deliveryAddress?.fullName }}
          </div>
          <div v-if="order?.deliveryAddress?.phoneNumber !== order?.customer?.phoneNumber">
            {{ order?.deliveryAddress?.phoneNumber }}
          </div>
          <div>{{ order?.deliveryAddress?.location?.formatted }}</div>
        </div>
        <table class="items-table full-width q-mt-md">
          <thead>
            <tr>
              <th>{{ $t('Item') }}</th>
              <th>{{ $t('Qty') }}</th>
              <th>{{ $t('Price') }}</th>
              <th>{{ $t('Subtotal') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="orderItem in order?.items" :key="orderItem?.id">
              <td class="text-weight-medium">
                <div class="row items-center justify-left no-wrap full-width text-left q-my-xs">
                  <q-img
                    v-if="orderItem?.variant?.itemImage"
                    :src="orderItem?.variant?.itemImage"
                    width="35px"
                    ratio="1"
                    class="rounded-borders q-mr-xs"
                  />
                  <div>{{ orderItem?.variant?.itemName }}</div>
                </div>
              </td>
              <td class="text-center" style="white-space:nowrap;">{{ orderItem?.quantity }}</td>
              <td class="text-center" style="white-space:nowrap;">{{ orderItem?.price }} {{ orderCurrency }}</td>
              <td class="text-center" style="white-space:nowrap;">{{ orderItem?.price * orderItem?.quantity }} {{ orderCurrency }}</td>
            </tr>
          </tbody>
        </table>
        <q-separator spaced/>
        <div class="row items-start">
          <div>{{ $t('Subtotal') }}</div>
          <q-space/>
          <div>{{ order?.subtotal }} {{ orderCurrency }}</div>
        </div>

        <div class="row items-start">
          <div>{{ $t('Markup') }}</div>
          <q-space/>
          <div>{{ order?.markupAmount }} {{ orderCurrency }}</div>
        </div>

        <div class="row items-start">
          <div>{{ $t('DeliveryFee') }}</div>
          <q-space/>
          <div>{{ order?.payment?.deliveryFee }} {{ orderCurrency }}</div>
        </div>
        <div class="row items-start">
          <div class="text-subtitle1">{{ $t('Total') }}</div>
          <q-space/>
          <div>{{ order?.total }} {{ orderCurrency }}</div>
        </div>
        <!-- <q-btn
          no-caps label="Go to page"
          color="brandblue"
          class="full-width q-mt-md"
          :to="{ name: 'marketplace-storefront-order', params: { orderId: order?.id }}"
        /> -->
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
<script>
import { Order } from 'src/marketplace/objects'
import { useDialogPluginComponent } from 'quasar'
import { computed, defineComponent, ref, watch } from 'vue'
import { formatTimestampToText } from 'src/marketplace/utils'
import { useStore } from 'vuex'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default defineComponent({
  name: 'OrderDetailDialog',
  emits: [
    'update:modelValue',

    // REQUIRED; need to specify some events that your
    // component will emit through useDialogPluginComponent()
    ...useDialogPluginComponent.emits,
  ],
  props: {
    modelValue: Boolean,
    order: Order,
  },
  setup(props, { emit: $emit }) {
    const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()
    const innerVal = ref(props.modelValue)
    watch(innerVal, () => $emit('update:modelValue', innerVal.value))
    watch(() => [props.modelValue], () => innerVal.value = props.modelValue)

    const $store = useStore()
    const darkMode = computed(() => $store?.state?.darkmode?.darkmode)

    const orderCurrency = computed(() => props.order?.currency?.symbol)

    return {
      dialogRef, onDialogHide, onDialogOK, onDialogCancel,
      innerVal,

      darkMode,

      orderCurrency,

      getDarkModeClass,
      formatTimestampToText,
    }
  },
})
</script>
<style scoped lang="scss">
table.items-table {
  border-spacing: map-get($space-md, 'x') * -0.5 0;
}
table.items-table tr td:last-child {
  text-align: end;
}
table.items-table tr td:first-child {
 width: 100%;
}
</style>
