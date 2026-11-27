<template>
  <q-dialog
    v-model="show"
    position="bottom"
    full-width
    transition-show="slide-up"
    transition-hide="slide-down"
  >
    <q-card class="br-15 bottom-card pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
      <div class="row justify-center q-pt-sm">
        <div class="sheet-handle" :class="getDarkModeClass(darkMode)" />
      </div>
      <q-card-section class="q-pt-sm q-pb-xs row no-wrap items-start">
        <div class="q-space">
          <div class="text-subtitle1 text-weight-medium ellipsis">
            {{ title }}
          </div>
          <div class="text-caption text-grey">
            {{ $t('DeviceActions', {}, 'Device actions') }}
          </div>
        </div>
        <q-btn flat round dense icon="close" v-close-popup />
      </q-card-section>
      <q-separator :color="darkMode ? 'grey-8' : 'grey-4'" />
      <q-list :dark="darkMode" class="q-py-xs q-pb-md" style="max-height: 65vh; overflow-y: auto;">
        <q-item
          clickable
          v-close-popup
          @click="$emit('sales-report')"
        >
          <q-item-section avatar>
            <q-icon name="assessment" />
          </q-item-section>
          <q-item-section>
            {{ $t('SalesReport', {}, 'Sales Report') }}
          </q-item-section>
        </q-item>
        <q-item
          clickable
          v-close-popup
          @click="$emit('edit')"
        >
          <q-item-section avatar>
            <q-icon name="edit" />
          </q-item-section>
          <q-item-section>
            {{ $t('Update', {}, 'Update') }}
          </q-item-section>
        </q-item>
        <q-item
          v-if="isLinked && unlinkRequestId"
          clickable
          v-close-popup
          @click="$emit('cancel-unlink')"
        >
          <q-item-section avatar>
            <q-icon name="phonelink_erase" />
          </q-item-section>
          <q-item-section>
            {{ $t('Cancel', {}, 'Cancel') }}
            {{ $t('Unlink', {}, 'Unlink').toLowerCase() }}
          </q-item-section>
        </q-item>
        <q-item
          v-else-if="isLinked"
          clickable
          v-close-popup
          @click="$emit('unlink')"
        >
          <q-item-section avatar>
            <q-icon name="phonelink_erase" />
          </q-item-section>
          <q-item-section>
            {{ $t('Unlink', {}, 'Unlink') }}
          </q-item-section>
        </q-item>
        <q-item
          v-else
          clickable
          v-close-popup
          @click="$emit('link')"
        >
          <q-item-section avatar>
            <q-icon name="phonelink" />
          </q-item-section>
          <q-item-section>
            {{ $t('Link', {}, 'Link') }}
          </q-item-section>
        </q-item>
        <q-item
          clickable
          v-close-popup
          :disable="!branchId"
          @click="$emit('create-admin-invite')"
        >
          <q-item-section avatar>
            <q-icon name="admin_panel_settings" />
          </q-item-section>
          <q-item-section>
            {{ $t('CreateMarketplaceAdminInviteLink', {}, 'Create marketplace admin link') }}
          </q-item-section>
          <q-item-section v-if="!branchId" side>
            <q-item-label caption>
              {{ $t('POSDeviceNoBranch', {}, 'No branch assigned') }}
            </q-item-label>
          </q-item-section>
        </q-item>
        <q-item
          v-if="!isNfcEnabled && isLinked"
          clickable
          v-close-popup
          @click="$emit('enable-nfc')"
        >
          <q-item-section avatar>
            <q-icon name="nfc" />
          </q-item-section>
          <q-item-section>
            {{ $t('EnableNFCPayments', {}, 'Enable NFC payments') }}
          </q-item-section>
        </q-item>
        <q-item
          v-if="isLinked"
          clickable
          v-close-popup
          @click="$emit('toggle-suspension')"
        >
          <q-item-section avatar>
            <q-icon :name="isSuspended ? 'play_circle_outline' : 'pause_circle_outline'" />
          </q-item-section>
          <q-item-section>
            <template v-if="isSuspended">
              {{ $t('UnsuspendDevice', {}, 'Unsuspend device') }}
            </template>
            <template v-else>
              {{ $t('SuspendDevice', {}, 'Suspend device') }}
            </template>
          </q-item-section>
        </q-item>
        <q-item
          clickable
          v-close-popup
          @click="$emit('remove')"
        >
          <q-item-section avatar>
            <q-icon name="delete_outline" color="negative" />
          </q-item-section>
          <q-item-section class="text-negative">
            {{ $t('Remove', {}, 'Remove') }}
          </q-item-section>
        </q-item>
      </q-list>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { padPosId } from 'src/wallet/pos'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

const $t = useI18n().t

const props = defineProps({
  modelValue: Boolean,
  posDevice: Object,
  darkMode: Boolean,
})

const emit = defineEmits([
  'update:modelValue',
  'sales-report',
  'edit',
  'cancel-unlink',
  'unlink',
  'link',
  'create-admin-invite',
  'enable-nfc',
  'toggle-suspension',
  'remove',
])

const show = computed({
  get: () => Boolean(props.modelValue),
  set: (val) => emit('update:modelValue', val),
})

const isLinked = computed(() => Boolean(props.posDevice?.isLinked?.()))
const isSuspended = computed(() => Boolean(props.posDevice?.linkedDevice?.isSuspended))
const isNfcEnabled = computed(() => Boolean(props.posDevice?.isNFCPaymentsEnabled?.()))
const unlinkRequestId = computed(() => props.posDevice?.linkedDevice?.unlinkRequest?.id)
const branchId = computed(() => props.posDevice?.branchId)

const title = computed(() => {
  const name = props.posDevice?.name || 'POSID'
  const posid = props.posDevice?.posid
  if (posid === undefined || posid === null) return name
  return `${name} #${padPosId(posid)}`
})
</script>

<style lang="scss" scoped>
  .sheet-handle {
    width: 40px;
    height: 4px;
    border-radius: 2px;

    &.dark {
      background-color: rgba(255, 255, 255, 0.3);
    }

    &.light {
      background-color: rgba(0, 0, 0, 0.2);
    }
  }
</style>
