<template>
  <div
    id="app-container"
    class="sticky-header-container text-bow"
    :class="getDarkModeClass(darkMode)"
  >
    <HeaderNav
      class="apps-header"
      backnavpath="/apps/address-book/"
      :title="'Address Book'"
      id="header-nav"
    />

    <div class="q-px-md">
      <div class="row justify-between items-center">
        <span class="text-subtitle1 text-bold">
          {{ 'Create New Record'.toLocaleUpperCase() }}
        </span>
        <div class="row justify-end items-center q-gutter-x-md" id="action-buttons">
          <q-btn
            round
            flat
            :outline="!favorite"
            :icon="favorite ? 'mdi-star' : 'mdi-star-outline'"
            color="primary"
            @click="favorite = !favorite"
          />
    
          <q-btn
            rounded
            class="button"
            label="Save"
          />
        </div>
      </div>

      <q-separator class="q-my-md" />

      <div class="row">
        <q-input
          v-model="recordName"
          label="Name"
          class="full-width"
          dense
          :dark="darkMode"
        />
      </div>

      <q-separator class="q-my-md" />

      <div class="row justify-between items-center q-mb-md">
        <span class="text-subtitle1">Addresses</span>
        <q-btn
          round
          icon="mdi-plus"
          color="primary"
          @click="addresses.push({ address: '' })"
        />
      </div>

      <div v-for="(address, index) in addresses" :key="index">
        <div class="row justify-between items-center q-mb-md">
          <q-input
            dense
            v-model="address.address"
            label="Address"
            :dark="darkMode"
          />
          <q-btn
            round
            outline
            icon="mdi-minus"
            color="negative"
            size="sm"
            @click="addresses.splice(index, 1)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

import HeaderNav from 'src/components/header-nav.vue'

export default {
  name: 'AddRecord',

  components: {
    HeaderNav
  },

  data () {
    return {
      recordName: '',
      favorite: false,
      addresses: [{ address: '' }, { address: '' }],
    }
  },

  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    }
  },

  methods: {
    getDarkModeClass
  }
}
</script>