<template>
  <div
    id="app-container"
    class="sticky-header-container text-bow"
    :class="getDarkModeClass(darkMode)"
  >
    <header-nav
      class="apps-header"
      backnavpath="/apps/address-book/"
      :title="'Address Book'"
      id="header-nav"
    />

    <div class="q-px-md">
      <!-- loading skeletons animation -->

      <!-- <template> -->
      <!-- buttons div -->
      <!-- <div id="buttons-div" class="row justify-end items-center q-gutter-x-sm">
        <q-btn
          round
          flat
          :icon="record.is_favorite ? 'mdi-star' : 'mdi-star-outline'"
          color="primary"
        />
        <q-btn
          round
          flat
          icon="edit"
          color="primary"
        />
        <q-btn
          round
          flat
          icon="delete"
          color="primary"
        />
      </div> -->

      <!-- record details -->
      <div class="q-mt-sm">
        <q-card id="record-details" class="q-pa-md q-mb-md record-card">
          <!-- name and date created -->
          <div class="text-left">
            <p class="text-h6 q-mb-none">{{ record.name }}</p>
            <p class="text-caption q-mb-md">
              Created last {{ record.date_created }}
            </p>
          </div>

          <!-- buttons div -->
          <div class="row justify-evenly items-center">
            <q-btn
              round
              :outline="!record.is_favorite"
              :icon="record.is_favorite ? 'mdi-star' : 'mdi-star-outline'"
              color="primary"
              @click="record.is_favorite = !record.is_favorite"
            />
            <q-btn
              round
              icon="edit"
              color="primary"
            />
            <q-btn
              round
              icon="delete"
              color="primary"
            />
          </div>
        </q-card>

        <!-- addresses list -->
        <div>
          <span
            id="addresses-list-label"
            class="row text-subtitle1 text-weight-bold"
          >
            Addresses List
          </span>

          <div id="addresses-list" v-if="record.address_list.length > 0">
            <q-list>
              <q-item v-for="address in record.address_list">
                <q-item-section>
                  <q-item-label style="line-break: anywhere;">
                    {{ address.address }}
                  </q-item-label>
                </q-item-section>

                <q-item-section side>
                  <q-btn
                    icon-right="mdi-send"
                    color="primary"
                    size="sm"
                  />
                </q-item-section>
              </q-item>
            </q-list>
          </div>

          <div
            class="text-body text-center q-mt-sm"
            :class="darkMode ? 'text-grey-5' : 'text-grey-7'"
            v-else
          >
            No addresses added yet
          </div>
        </div>
      </div>
      <!-- </template> -->
    </div>
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

import HeaderNav from 'src/components/header-nav.vue'

export default {
  name: 'ViewRecord',

  components: {
    HeaderNav
  },

  data () {
    return {
      record: {
        name: 'Name Name name_yey',
        is_favorite: false,
        date_created: new Date(),
        // address_list: []
        address_list: [
          {
            address: 'bitcoincash:qze93uuw8vt8v358f7eupg3t4jtkpz8ltguhg62pde',
            type: 'bch'
          },
          {
            address: 'bitcoincash:zze93uuw8vt8v358f7eupg3t4jtkpz8ltgmamyy8j2',
            type: 'ct'
          },
          {
            address: 'bitcoincash:qze93uuw8vt8v358f7eupg3t4jtkpz8ltguhg62pde',
            type: 'bch'
          },
          {
            address: 'bitcoincash:zze93uuw8vt8v358f7eupg3t4jtkpz8ltgmamyy8j2',
            type: 'ct'
          },
          {
            address: 'bitcoincash:qze93uuw8vt8v358f7eupg3t4jtkpz8ltguhg62pde',
            type: 'bch'
          },
          {
            address: 'bitcoincash:zze93uuw8vt8v358f7eupg3t4jtkpz8ltgmamyy8j2',
            type: 'ct'
          },
          {
            address: 'bitcoincash:qze93uuw8vt8v358f7eupg3t4jtkpz8ltguhg62pde',
            type: 'bch'
          },
          {
            address: 'bitcoincash:zze93uuw8vt8v358f7eupg3t4jtkpz8ltgmamyy8j2',
            type: 'ct'
          },
          {
            address: 'bitcoincash:qze93uuw8vt8v358f7eupg3t4jtkpz8ltguhg62pde',
            type: 'bch'
          },
          {
            address: 'bitcoincash:zze93uuw8vt8v358f7eupg3t4jtkpz8ltgmamyy8j2',
            type: 'ct'
          },
          {
            address: 'bitcoincash:qze93uuw8vt8v358f7eupg3t4jtkpz8ltguhg62pde',
            type: 'bch'
          },
          {
            address: 'bitcoincash:zze93uuw8vt8v358f7eupg3t4jtkpz8ltgmamyy8j2',
            type: 'ct'
          },
        ]
      }
    }
  },

  computed: {
    darkMode() {
      return this.$store.getters["darkmode/getStatus"];
    }
  },

  methods: {
    getDarkModeClass
  },

  mounted () {
    console.log(this.$route.params)

    // retrieve details of params.id from watchtower

    // set height of addresses-list
    if (this.record?.address_list.length > 0) {
      const headerHeight = document.getElementById('header-nav').clientHeight
      const recordDetailsHeight = document.getElementById('record-details').clientHeight
      const addressesListLabel = document.getElementById('addresses-list-label').clientHeight
  
      const aboveDivsHeight = headerHeight + recordDetailsHeight + addressesListLabel
      const overallHeight = this.$q.screen.height - aboveDivsHeight - 75
      document.getElementById('addresses-list').style.height = `${overallHeight}px`
    }
  }
}
</script>

<style lang="scss" scoped>
#addresses-list {
  height: 100%;
  overflow-y: auto;
}
</style>