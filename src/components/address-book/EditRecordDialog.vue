<template>
  <q-dialog
    persistent
    seamless
    ref="editRecordDialogRef"
    class="no-click-outside"
  >
    <q-card
      class="full-width pt-card-2 text-bow edit-record-card"
      :class="getDarkModeClass(darkMode)"
    >
      <q-card-section class="row justify-between items-center">
        <span class="text-h6 text-weight-bold">{{ title }}</span>
        <q-btn
          flat
          round
          padding="sm"
          icon="close"
          class="close-button"
          v-close-popup
        />
      </q-card-section>

      <q-separator />

      <div class="edit-record-body">
        <record-name-input-card v-model="recordName" v-if="isEditName" />
        <div v-else class="addresses-wrapper q-pa-sm">
          <addresses-form-card v-model="addresses" />
        </div>
      </div>

      <q-separator />

      <q-card-actions class="row full-width justify-evenly q-gutter-x-md q-pa-sm">
        <q-btn
          unelevated
          rounded
          flat
          no-caps
          :class="getDarkModeClass(darkMode)"
          :label="$t('Cancel')"
          :disable="isLoading"
          v-close-popup
        />
        <q-btn
          unelevated
          rounded
          no-caps
          class="button"
          :class="getDarkModeClass(darkMode)"
          :label="$t('Update')"
          :disable="!canSaveRecord || isLoading"
          :loading="isLoading"
          @click="updateRecord"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
import { Address } from 'watchtower-cash-js'
import { encryptMemo } from 'src/utils/transaction-memos';
import { ensureKeypair } from 'src/utils/memo-service';
import { raiseNotifyError } from 'src/utils/notify-utils';
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';
import {
  patchRecord,
  addAddress,
  patchAddress,
  deleteAddress
} from 'src/utils/address-book-utils';

import AddressesFormCard from './AddressesFormCard.vue';
import RecordNameInputCard from './RecordNameInputCard.vue';

export default {
  name: 'EditRecordDialog',

  components: {
    RecordNameInputCard,
    AddressesFormCard
  },

  props: {
    title: {
      type: String,
      required: true,
      default: ''
    },
    isEditName: {
      type: Boolean,
      required: true,
      default: false
    },
    record: { 
      type: Object,
      required: true,
      default: null
    },
    addressesProps: {
      type: Array,
      required: false,
      default: new Array
    }
  },

  data () {
    return {
      recordName: '',
      addresses: [],
      originalAddresses: [],
      isLoading: false
    }
  },

  computed: {
    darkMode() {
      return this.$store.getters["darkmode/getStatus"];
    },

    canSaveRecord () {
      if (this.isEditName) return Boolean(this.recordName)
      else {
        const { toCreate, toUpdate, toDelete } = this.computeAddressDiff()
        return !(toCreate.length === 0 && toUpdate.length === 0 && toDelete.length === 0)
      }
    }
  },

  methods: {
    getDarkModeClass,

    cloneAddresses (addresses) {
      const source = Array.isArray(addresses) ? addresses : []

      // Prefer structuredClone when available; fallback to JSON deep clone.
      // Addresses are expected to be plain objects (serializable).
      if (typeof globalThis !== 'undefined' && typeof globalThis.structuredClone === 'function') {
        return globalThis.structuredClone(source)
      }
      return JSON.parse(JSON.stringify(source)) // NOSONAR - fallback deep clone for older runtimes
    },

    normalizeAddressInput (val) {
      return (typeof val === 'string' ? val : '').trim()
    },

    inferAddressType (address) {
      // Mirrors add-record.vue behavior
      const addressObj = new Address(address)
      return addressObj.isTokenAddress() ? 'ct' : 'bch'
    },

    isValidAddress (address) {
      try {
        // eslint-disable-next-line no-new
        new Address(address)
        return true
      } catch (e) { // NOSONAR - invalid inputs may throw; this is treated as validation failure
        return false
      }
    },

    mapAddressesById (addresses) {
      const list = Array.isArray(addresses) ? addresses : []
      return new Map(
        list
          .filter(a => a && (a.id !== undefined && a.id !== null))
          .map(a => [a.id, a])
      )
    },

    normalizeAddressType (addressObj) {
      const normalized = this.normalizeAddressInput(addressObj?.address)
      const explicit = (addressObj?.address_type || '').toLowerCase()
      if (explicit) return explicit
      if (!normalized) return ''
      return this.inferAddressType(normalized)
    },

    buildCreatePayloads (current) {
      const list = Array.isArray(current) ? current : []
      return list
        .filter(a => a && (a.id === undefined || a.id === null))
        .map(a => {
          const normalized = this.normalizeAddressInput(a.address)
          return {
            address: normalized,
            address_type: normalized ? this.inferAddressType(normalized) : (a.address_type || 'bch'),
            address_book_id: this.record.id
          }
        })
    },

    buildUpdatePayloads (originalById, currentById) {
      const updates = []
      for (const [id, cur] of currentById.entries()) {
        const orig = originalById.get(id)
        if (!orig) continue

        const curAddress = this.normalizeAddressInput(cur.address)
        const origAddress = this.normalizeAddressInput(orig.address)

        const curType = this.normalizeAddressType(cur)
        const origType = this.normalizeAddressType(orig)

        if (curAddress !== origAddress || curType !== origType) {
          updates.push({
            id,
            address: curAddress,
            address_type: curAddress ? this.inferAddressType(curAddress) : (cur.address_type || orig.address_type)
          })
        }
      }
      return updates
    },

    buildDeletePayloads (originalById, currentById) {
      const deletes = []
      for (const [id] of originalById.entries()) {
        if (!currentById.has(id)) deletes.push({ id })
      }
      return deletes
    },

    computeAddressDiff () {
      const original = Array.isArray(this.originalAddresses) ? this.originalAddresses : []
      const current = Array.isArray(this.addresses) ? this.addresses : []

      const originalById = this.mapAddressesById(original)
      const currentById = this.mapAddressesById(current)

      const toCreate = this.buildCreatePayloads(current)
      const toUpdate = this.buildUpdatePayloads(originalById, currentById)
      const toDelete = this.buildDeletePayloads(originalById, currentById)

      return { toCreate, toUpdate, toDelete }
    },

    async updateRecordName () {
      const keypair = await ensureKeypair()
      const encryptedName = await encryptMemo(keypair.privkey, keypair.pubkey, this.recordName)
      if (!encryptedName) throw new Error('Failed to encrypt record name')

      const payload = { name: encryptedName }
      const patchSuccess = await patchRecord(this.record.id, payload)
      if (!patchSuccess) throw new Error('Server error. Check networks tab.')
    },

    async updateRecordAddresses () {
      // Basic validations (keep in sync with AddressesFormCard rules)
      const normalizedAddresses = (Array.isArray(this.addresses) ? this.addresses : [])
        .map(a => ({ ...a, address: this.normalizeAddressInput(a?.address) }))

      const hasEmpty = normalizedAddresses.some(a => !a.address)
      if (hasEmpty) throw new Error('Please fill in all address fields.')

      const hasInvalid = normalizedAddresses.some(a => !this.isValidAddress(a.address))
      if (hasInvalid) throw new Error('One or more addresses are invalid.')

      // Update local state to normalized values before diffing
      this.addresses = normalizedAddresses

      const { toCreate, toUpdate, toDelete } = this.computeAddressDiff()
      const resps = await Promise.all([
        ...toCreate.map(a => addAddress(a)),
        ...toUpdate.map(a => patchAddress(a.id, a)),
        ...toDelete.map(a => deleteAddress(a.id))
      ])
      if (resps.some(resp => !resp)) {
        this.$q.notify({
          type: 'warning',
          timeout: 4000,
          message: 'Some addresses were not updated successfully. Please check them manually and try again.',
          position: 'top'
        })
      }
    },

    async updateRecord () {
      this.isLoading = true

      try {
        if (this.isEditName) await this.updateRecordName()
        else await this.updateRecordAddresses()

        this.$refs.editRecordDialogRef.$emit('ok')
        this.$refs.editRecordDialogRef.hide()
      } catch (error) {
        console.error('An error occured while updating record: ', error)
        const fallback = this.isEditName
          ? 'Failed to update name. Please try again later.'
          : 'Failed to update addresses. Please try again later.'
        raiseNotifyError(error?.message || fallback, 3000, 'top')
      } finally {
        this.isLoading = false
      }
    }
  },

  mounted () {
    if (this.isEditName) this.recordName = this.record.name
    else {
      this.originalAddresses = this.cloneAddresses(this.addressesProps)
      this.addresses = this.cloneAddresses(this.addressesProps)
    }
  }
}
</script>

<style lang="scss" scoped>
.edit-record-card {
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.edit-record-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.addresses-wrapper {
  flex: 1;
  min-height: 0;
  display: flex;
}
</style>