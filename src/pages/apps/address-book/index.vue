<template>
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

      <!-- search bar -->
      <div
        class="full-width q-mb-md row items-center q-gutter-sm"
        id="search-filter-div"
      >
        <q-input
          class="col"
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

        <q-btn
          class="flex-shrink-0"
          round
          icon="mdi-account-plus"
          color="primary"
        />
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

      <!-- Alphabet index -->
      <div 
        id="alphabet-index" 
        class="alphabet-index"
        :class="darkMode ? 'dark' : ''"
      >
        <div
          v-for="letter in alphabetIndex"
          :key="letter"
          class="alphabet-letter"
          :class="{
            'enabled': isLetterEnabled(letter),
            'disabled': !isLetterEnabled(letter)
          }"
          @click="isLetterEnabled(letter) && scrollToLetter(letter)"
        >
          {{ letter === '...' ? '...' : letter.toUpperCase() }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

import HeaderNav from 'src/components/header-nav.vue'
import RecordList from 'src/components/address-book/RecordList.vue'

export default {
  name: 'AddressBook',

  components: {
    HeaderNav,
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
    },
    
    alphabetIndex() {
      // Generate alphabet array with '...' at the beginning, then A-Z
      const letters = ['...']
      for (let i = 65; i <= 90; i++) {
        letters.push(String.fromCodePoint(i).toLowerCase())
      }
      return letters
    },
    
    availableLetterGroups() {
      // Extract all unique letter_group values from both lists
      const groups = new Set()
      
      this.favoritesList.forEach(item => {
        if (item.letter_group) {
          groups.add(item.letter_group.toLowerCase())
        }
      })
      
      this.recordsList.forEach(item => {
        if (item.letter_group) {
          groups.add(item.letter_group.toLowerCase())
        }
      })
      
      return Array.from(groups)
    }
  },

  methods: {
    getDarkModeClass,
    
    isLetterEnabled(letter) {
      // Check if the letter has corresponding data
      return this.availableLetterGroups.includes(letter.toLowerCase())
    },
    
    scrollToLetter(letter) {
      // Find the target element within the scrollable container
      const container = document.getElementById('lists-container')
      if (!container) return
      
      const targetId = `letter-group-${letter.toLowerCase()}`
      const targetElement = document.getElementById(targetId)
      
      if (targetElement) {
        // Calculate the position relative to the container
        const containerRect = container.getBoundingClientRect()
        const targetRect = targetElement.getBoundingClientRect()
        const scrollTop = container.scrollTop + (targetRect.top - containerRect.top)
        
        // Smooth scroll within the container
        container.scrollTo({
          top: scrollTop - 10, // Add small offset for better visibility
          behavior: 'smooth'
        })
      }
    }
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

<style lang="scss">
.record-card {
  border-radius: 16px;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &.light {
    background: rgba(255, 255, 255, 0.8);
    border: 1px solid rgba(0, 0, 0, 0.08);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }
  
  &.dark {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }
}
</style>

<style lang="scss" scoped>
#search-filter-div {
  position: sticky;
  z-index: 100;
}

#lists-container {
  height: 100%;
  overflow-y: auto;
  /* Hide scrollbar */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
  
  &::-webkit-scrollbar {
    display: none; /* Chrome, Safari, Opera */
  }
}

.alphabet-index {
  position: fixed;
  right: 4px;
  top: 55%;
  transform: translateY(-50%);
  z-index: 200;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: 4px 2px;
  pointer-events: none;
  max-height: 90vh;
  overflow: hidden;
  
  .alphabet-letter {
    font-size: 12px;
    line-height: 1.2;
    padding: 2px 3px;
    min-width: 20px;
    text-align: center;
    transition: all 0.2s ease;
    pointer-events: auto;
    user-select: none;
    
    &.enabled {
      cursor: pointer;
      font-weight: 500;
      
      &:hover {
        transform: scale(1.2);
      }
    }
    
    &.disabled {
      opacity: 0.3;
      cursor: default;
    }
  }
  
  &.dark {
    .alphabet-letter.enabled {
      color: rgba(255, 255, 255, 0.9);
      
      &:hover {
        color: rgba(255, 255, 255, 1);
      }
    }
    
    .alphabet-letter.disabled {
      color: rgba(255, 255, 255, 0.3);
    }
  }
  
  &:not(.dark) {
    .alphabet-letter.enabled {
      color: rgba(0, 0, 0, 0.7);
      
      &:hover {
        color: rgba(0, 0, 0, 1);
      }
    }
    
    .alphabet-letter.disabled {
      color: rgba(0, 0, 0, 0.3);
    }
  }
}
</style>