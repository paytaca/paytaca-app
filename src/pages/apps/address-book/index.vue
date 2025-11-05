<template>
  <q-layout>
    <q-page-container>
      <q-page>
        <div
          id="app-container"
          class="sticky-header-container text-bow"
          :class="getDarkModeClass(darkMode)"
        >
          <header-nav
            class="apps-header"
            backnavpath="/apps"
            :title="'Address Book'"
            id="header-nav"
          />

          
          <div class="q-px-md">
            <!-- loading skeletons animation -->

            <!-- <template> -->
              <!-- search bar -->
              <div
                class="full-width q-mb-md"
                id="search-filter-div"
              >
                <q-input
                  rounded
                  outlined
                  clearable
                  dense
                  label="Search name"
                >
                  <template v-slot:prepend>
                    <q-icon name="search"></q-icon>
                  </template>
                </q-input>
              </div>
  
              <!-- lists container -->
              <div id="lists-container">
                <!-- favorites list -->
                <div v-if="favoritesList.length > 0">
                  <record-list :list="favoritesList" />
                </div>
    
                <!-- contacts list -->
                 <div v-if="recordsList.length > 0">
                  <record-list :list="recordsList" />
                 </div>
    
                 <div
                  class="text-center text-h6 q-mt-md"
                  :class="darkMode ? 'text-grey-5' : 'text-grey-7'"
                  v-else
                >
                  <p>Empty address book</p>
                  <p>
                    Click on <q-icon name="mdi-account-plus" size="sm" />
                    to add a new record
                  </p>
                 </div>
              </div>
            <!-- </template> -->
          </div>

          <!-- add new record sticky button -->
          <add-record-sticky />
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

import HeaderNav from 'src/components/header-nav.vue'
import AddRecordSticky from 'src/components/address-book/AddRecordSticky.vue'
import RecordList from 'src/components/address-book/RecordList.vue'

export default {
  name: 'AddressBook',

  components: {
    HeaderNav,
    AddRecordSticky,
    RecordList
  },

  data () {
    return {
      /** 
       * id: Number
       * name: String
       * is_favorite: Boolean
       * date_created: Date
       * date_updated: Date
       * address_list: Array
       *   address: String
       *   type: BCH | CT
      */
     favoritesList: [
      {
        letter_group: 'favorites',
        data: [
          {
            id: 2,
            name: '_hearty737',
            address_count: 5
          },
          {
            id: 3,
            name: 'Fiona Apple',
            address_count: 1
          },
          {
            id: 4,
            name: 'Wendy Darling',
            address_count: 0
          }
        ]
      },
     ],
     // non-favorite contacts
     recordsList: [
      {
        letter_group: '...',
        data: [
          {
            id: 1,
            name: '_hearty737',
            address_count: 5
          },
          {
            id: 1,
            name: '_hearty737',
            address_count: 1
          },
          {
            id: 1,
            name: '_hearty737',
            address_count: 0
          }
        ]
      },
      {
        letter_group: 'a',
        data: [
          {
            id: 1,
            name: 'Alice Johnson',
            address_count: 5
          }
        ]
      },
      {
        letter_group: 'b',
        data: [
          {
            id: 1,
            name: 'Bob Smith',
            address_count: 5
          },
        ]
      },
      {
        letter_group: 'j',
        data: [
          {
            id: 1,
            name: 'Jane Doe',
            address_count: 5
          },
          {
            id: 1,
            name: 'John Doe',
            address_count: 5
          },
        ]
      },
      {
        letter_group: 'l',
        data: [
          {
            id: 1,
            name: 'Laura Croft',
            address_count: 5
          }
        ]
      },
     ]
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
    const headerHeight = document.getElementById('header-nav').clientHeight
    const searchFilterEl = document.getElementById('search-filter-div')
    searchFilterEl.style.top = `${headerHeight}px`

    const aboveDivsHeight = searchFilterEl.clientHeight + headerHeight
    const listsContainerHeight = this.$q.screen.height - aboveDivsHeight - 70
    document.getElementById('lists-container').style.height = `${listsContainerHeight}px`
  }
}
</script>

<style lang="scss" scoped>
#search-filter-div {
  position: sticky;
  z-index: 100;
}

#lists-container {
  height: 100%;
  overflow-y: auto;
}
</style>