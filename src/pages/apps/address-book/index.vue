<template>
  <q-layout>
    <q-page-container>
      <q-page>
        <div
          id="app-container"
          class="sticky-header-container"
          :class="getDarkModeClass(darkMode)"
        >
          <header-nav
            class="apps-header"
            backnavpath="/apps"
            :title="'Address Book'"
            id="header-nav"
          />
      
          <div class="q-px-md">
            <!-- search bar & filter -->
            <div class="row justify-around items-center">
              <q-input
                rounded
                outlined
                clearable
                dense
                label="Search name or address"
                style="width: 75vw"
              >
                <template v-slot:prepend>
                  <q-icon name="search"></q-icon>
                </template>
              </q-input>
              <q-btn
                round
                icon="filter_alt"
                color="primary"
              />
            </div>

            <!-- lists container -->
            <div class="q-mt-md">
              <!-- favorites list -->
              <div v-if="favoritesList.length > 0">
                yey
              </div>
  
              <!-- contacts list -->
               <div v-if="contactsList.length > 0">
                yey
               </div>
  
               <div v-else>
                hehe
               </div>
            </div>
          </div>

          <!-- add new contact sticky button -->
          <add-contact-sticky />
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

import HeaderNav from 'src/components/header-nav.vue'
import AddContactSticky from 'src/components/address-book/AddContactSticky.vue'

export default {
  name: 'AddressBook',

  components: {
    HeaderNav,
    AddContactSticky
  },

  data () {
    return {
      favoritesList: [],
      contactsList: []
    }
  },

  computed: {
    darkMode() {
      return this.$store.getters["darkmode/getStatus"];
    }
  },

  methods: {
    getDarkModeClass
  }
}
</script>