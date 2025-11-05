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
      <div class="row justify-end items-center q-gutter-x-sm">
        <q-btn
          round
          flat
          :icon="record.is_favorite ? 'mdi-star' : 'mdi-star-outline'"
          color="primary"
        />
        <!-- icon="mdi-star-outline" -->
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
      </div>
      <!-- record details -->
      <div class="q-mt-sm">
        <!-- name and date created -->
        <q-card class="text-center q-pa-sm q-mb-md">
          <p class="text-h6 q-mb-none">{{ record.name }}</p>
          <p class="text-caption q-mb-none">
            Created last {{ record.date_created }}
          </p>
        </q-card>

        <!-- addresses list -->
        <div>
          <span class="row text-subtitle1 text-weight-bold">Addresses List</span>

          <div v-if="record.address_list.length > 0">
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
  }
}
</script>