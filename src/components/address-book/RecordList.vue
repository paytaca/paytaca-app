<template>
  <q-list>
    <template
      v-for="record in list"
      :key="record.letter_group"
    >
      <template v-if="record.data.length > 0">
        <q-item-label 
          header 
          class="text-weight-bold text-bow"
          :class="getDarkModeClass(darkMode)"
          :id="`letter-group-${record.letter_group}`"
        >
          {{ record.letter_group === 'favorites' 
              ? $t('Favorites').toLocaleUpperCase() 
              : record.letter_group.toLocaleUpperCase() 
          }}
        </q-item-label>
  
        <q-card
          flat
          bordered
          class="q-mb-sm q-mx-md record-card"
          :class="{ 'record-loading': loadingRecordId === rec.id }"
          v-for="rec in record.data"
          :key="rec.id"
        >
          <q-item
            clickable
            v-ripple
            :disable="loadingRecordId !== null"
            @click="onRecordClick(rec)"
          >
            <q-item-section>
              <q-item-label id="name-label">{{ rec.name }}</q-item-label>
              <q-item-label caption>
                {{ rec.address_count }}
                {{ rec.address_count === 1 ? $t('Address') : $t('Addresses') }}
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-spinner
                v-if="loadingRecordId === rec.id"
                color="primary"
                size="20px"
              />
              <q-icon
                v-else-if="isSelectionMode"
                name="mdi-chevron-right"
                color="primary"
              />
            </q-item-section>
          </q-item>
        </q-card>
      </template>
    </template>
  </q-list>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';

export default {
  name: 'RecordList',

  props: {
    list: { type: Array, default: new Array() },
    isSelectionMode: { type: Boolean, default: false },
    loadingRecordId: { type: Number, default: null }
  },

  emits: ['select-record'],

  computed: {
    darkMode() {
      return this.$store.getters["darkmode/getStatus"];
    }
  },

  methods: {
    getDarkModeClass,
    onRecordClick(rec) {
      if (this.isSelectionMode) {
        this.$emit('select-record', rec)
      } else {
        this.$router.push(`view-record/${rec.id}/`)
      }
    }
  }
}
</script>

<style lang="scss" scoped>
#name-label {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.record-loading {
  opacity: 0.7;
}
</style>