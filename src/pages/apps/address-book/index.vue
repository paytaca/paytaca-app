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
      <!-- search bar -->
      <div
        class="full-width q-mb-md row items-center q-gutter-sm"
        id="search-filter-div"
      >
        <!-- loading skeletons animation -->
        <template v-if="isLoading">
          <q-skeleton type="QInput" class="col" height="40px" style="border-radius: 50px;" />
          <q-skeleton type="circle" height="40px" width="40px" style="border-radius: 50px;" />
        </template>

        <template v-else>
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
        </template>
      </div>

      <!-- lists container -->
      <div id="lists-container">
        <template v-if="isLoading">
          <!-- loading skeletons animation -->
          <div class="q-pa-md q-gutter-y-sm">
            <q-skeleton type="text" width="30%" />
            <q-skeleton type="rect" height="50px" width="95%" style="border-radius: 16px;" />
            <q-skeleton type="rect" height="50px" width="95%" style="border-radius: 16px;" />
            <q-skeleton type="rect" height="50px" width="95%" style="border-radius: 16px;" />
            <q-skeleton type="rect" height="50px" width="95%" style="border-radius: 16px;" />

            <q-skeleton type="text" width="30%" class="q-mt-sm" />
            <q-skeleton type="rect" height="50px" width="95%" style="border-radius: 16px;" />
            <q-skeleton type="rect" height="50px" width="95%" style="border-radius: 16px;" />
            <q-skeleton type="rect" height="50px" width="95%" style="border-radius: 16px;" />
            <q-skeleton type="rect" height="50px" width="95%" style="border-radius: 16px;" />
          </div>
        </template>

        <template v-else>
          <!-- favorites list -->
          <div v-if="!isLoading && favoritesList.length > 0">
            <record-list :list="favoritesList" />
          </div>
  
          <!-- contacts list -->
          <div v-if="!isLoading && recordsList.length > 0">
            <record-list :list="recordsList" />
          </div>
  
          <div
            class="text-center text-h6 q-mt-md"
            :class="darkMode ? 'text-grey-5' : 'text-grey-7'"
            v-if="!isLoading && favoritesList.length === 0 && recordsList.length === 0"
          >
            <p>Empty address book</p>
            <p>
              Click on <q-icon name="mdi-account-plus" size="sm" />
              to add a new record
            </p>
          </div>
        </template>
      </div>

      <!-- Alphabet index -->
      <div 
        id="alphabet-index" 
        class="alphabet-index"
        :class="darkMode ? 'dark' : ''"
        v-if="!isLoading"
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
import { ensureKeypair } from 'src/utils/memo-service';
import { decryptMemo } from 'src/utils/transaction-memos';

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
     favoritesList: [],
     // non-favorite contacts
     recordsList: [],

     isLoading: false
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

  async mounted () {
    this.isLoading = true

    const headerHeight = document.getElementById('header-nav').clientHeight
    const searchFilterEl = document.getElementById('search-filter-div')
    searchFilterEl.style.top = `${headerHeight}px`

    const aboveDivsHeight = searchFilterEl.clientHeight + headerHeight
    const listsContainerHeight = this.$q.screen.height - aboveDivsHeight - 70
    document.getElementById('lists-container').style.height = `${listsContainerHeight}px`

    try {
      const keypair = await ensureKeypair()
      const respData = [
        {
          id: 2,
          name: 'eyJkIjoiSjAzNFNZbTdVeWpOSEhBaFdKRG04QT09IiwiaXYiOiJFdnRVSitwWXpkYXdmNmJoZ255VlJBPT0iLCJwayI6IjAzNzgwMzU0YjZiMjI0NDgwMDk3ZjhmZDNiOWMxM2Y1ZmQ1MDY2Mzk4ZWU1MTNlYzI4ODM4NjA1MGQ5MWY3ZDdmMCIsInBrcyI6WyIwMzc4MDM1NGI2YjIyNDQ4MDA5N2Y4ZmQzYjljMTNmNWZkNTA2NjM5OGVlNTEzZWMyODgzODYwNTBkOTFmN2Q3ZjAiXX0=',
          address_count: 5,
          is_favorite: true
        },
        {
          id: 3,
          name: 'eyJkIjoiNmtCVnJpRU50RHVJejJlZHU4Tm5SUT09IiwiaXYiOiJlNXRDRUdQT2FpRTdwcVVqaGY4SEpnPT0iLCJwayI6IjAzNzgwMzU0YjZiMjI0NDgwMDk3ZjhmZDNiOWMxM2Y1ZmQ1MDY2Mzk4ZWU1MTNlYzI4ODM4NjA1MGQ5MWY3ZDdmMCIsInBrcyI6WyIwMzc4MDM1NGI2YjIyNDQ4MDA5N2Y4ZmQzYjljMTNmNWZkNTA2NjM5OGVlNTEzZWMyODgzODYwNTBkOTFmN2Q3ZjAiXX0=',
          address_count: 1,
          is_favorite: true
        },
        {
          id: 4,
          name: 'eyJkIjoiSlBaY1dNOEhXajZ2OXQ5Zk9nRE9Bdz09IiwiaXYiOiJPUGEzY3VhbnBYYmhsQTN1SlBXcXdnPT0iLCJwayI6IjAzNzgwMzU0YjZiMjI0NDgwMDk3ZjhmZDNiOWMxM2Y1ZmQ1MDY2Mzk4ZWU1MTNlYzI4ODM4NjA1MGQ5MWY3ZDdmMCIsInBrcyI6WyIwMzc4MDM1NGI2YjIyNDQ4MDA5N2Y4ZmQzYjljMTNmNWZkNTA2NjM5OGVlNTEzZWMyODgzODYwNTBkOTFmN2Q3ZjAiXX0=',
          address_count: 0,
          is_favorite: true
        },
        {
          id: 1,
          name: 'eyJkIjoiQlVxdG9qdktPSmovYlJRM2ViczNvdz09IiwiaXYiOiJJTTB1T2M0VlVlcENsUzdBdTJVSk1BPT0iLCJwayI6IjAzNzgwMzU0YjZiMjI0NDgwMDk3ZjhmZDNiOWMxM2Y1ZmQ1MDY2Mzk4ZWU1MTNlYzI4ODM4NjA1MGQ5MWY3ZDdmMCIsInBrcyI6WyIwMzc4MDM1NGI2YjIyNDQ4MDA5N2Y4ZmQzYjljMTNmNWZkNTA2NjM5OGVlNTEzZWMyODgzODYwNTBkOTFmN2Q3ZjAiXX0=',
          address_count: 5,
          is_favorite: false
        },
        {
          id: 1,
          name: 'eyJkIjoiRWswaXY5Tk8vdEVhVTdDeW9pZnFZdz09IiwiaXYiOiI0NGV2MWVBSVpOVzBkV1dDdDhlYWhRPT0iLCJwayI6IjAzNzgwMzU0YjZiMjI0NDgwMDk3ZjhmZDNiOWMxM2Y1ZmQ1MDY2Mzk4ZWU1MTNlYzI4ODM4NjA1MGQ5MWY3ZDdmMCIsInBrcyI6WyIwMzc4MDM1NGI2YjIyNDQ4MDA5N2Y4ZmQzYjljMTNmNWZkNTA2NjM5OGVlNTEzZWMyODgzODYwNTBkOTFmN2Q3ZjAiXX0=',
          address_count: 1,
          is_favorite: false
        },
        {
          id: 1,
          name: 'eyJkIjoiN21xd05hNGxTbkNaMGExS2RTN3Vxdz09IiwiaXYiOiIxZ3JlcEZUNnQyTTVDWVRyMTlkaUpRPT0iLCJwayI6IjAzNzgwMzU0YjZiMjI0NDgwMDk3ZjhmZDNiOWMxM2Y1ZmQ1MDY2Mzk4ZWU1MTNlYzI4ODM4NjA1MGQ5MWY3ZDdmMCIsInBrcyI6WyIwMzc4MDM1NGI2YjIyNDQ4MDA5N2Y4ZmQzYjljMTNmNWZkNTA2NjM5OGVlNTEzZWMyODgzODYwNTBkOTFmN2Q3ZjAiXX0=',
          address_count: 5,
          is_favorite: false
        },
        {
          id: 1,
          name: 'eyJkIjoiNGdURHBoRFpXd1RWdGhtakxrYzlyUT09IiwiaXYiOiJBSVFMRWdRQmRJTWZYVWdMVS9MS2FRPT0iLCJwayI6IjAzNzgwMzU0YjZiMjI0NDgwMDk3ZjhmZDNiOWMxM2Y1ZmQ1MDY2Mzk4ZWU1MTNlYzI4ODM4NjA1MGQ5MWY3ZDdmMCIsInBrcyI6WyIwMzc4MDM1NGI2YjIyNDQ4MDA5N2Y4ZmQzYjljMTNmNWZkNTA2NjM5OGVlNTEzZWMyODgzODYwNTBkOTFmN2Q3ZjAiXX0=',
          address_count: 5,
          is_favorite: false
        },
        {
          id: 1,
          name: 'eyJkIjoiREE4cG1NK1ZGTitMbTJ2emFpTEtXZz09IiwiaXYiOiJBVE1TZHF3T2VjS3hleW44aE9QWHpRPT0iLCJwayI6IjAzNzgwMzU0YjZiMjI0NDgwMDk3ZjhmZDNiOWMxM2Y1ZmQ1MDY2Mzk4ZWU1MTNlYzI4ODM4NjA1MGQ5MWY3ZDdmMCIsInBrcyI6WyIwMzc4MDM1NGI2YjIyNDQ4MDA5N2Y4ZmQzYjljMTNmNWZkNTA2NjM5OGVlNTEzZWMyODgzODYwNTBkOTFmN2Q3ZjAiXX0=',
          address_count: 5,
          is_favorite: false
        },
        {
          id: 1,
          name: 'eyJkIjoiRXlWUU9Bai8xdHBHTHBGVWVVRWRrQT09IiwiaXYiOiJremFka1hxWmlpQ0JMbVpiZjErendnPT0iLCJwayI6IjAzNzgwMzU0YjZiMjI0NDgwMDk3ZjhmZDNiOWMxM2Y1ZmQ1MDY2Mzk4ZWU1MTNlYzI4ODM4NjA1MGQ5MWY3ZDdmMCIsInBrcyI6WyIwMzc4MDM1NGI2YjIyNDQ4MDA5N2Y4ZmQzYjljMTNmNWZkNTA2NjM5OGVlNTEzZWMyODgzODYwNTBkOTFmN2Q3ZjAiXX0=',
          address_count: 5,
          is_favorite: false
        },
        {
          id: 1,
          name: 'eyJkIjoidVdoZEJ1NFU5eEcwbW1YbmNZZVhaQT09IiwiaXYiOiJNL2VFUWxHamFpVSttby9tMFZja1pnPT0iLCJwayI6IjAzNzgwMzU0YjZiMjI0NDgwMDk3ZjhmZDNiOWMxM2Y1ZmQ1MDY2Mzk4ZWU1MTNlYzI4ODM4NjA1MGQ5MWY3ZDdmMCIsInBrcyI6WyIwMzc4MDM1NGI2YjIyNDQ4MDA5N2Y4ZmQzYjljMTNmNWZkNTA2NjM5OGVlNTEzZWMyODgzODYwNTBkOTFmN2Q3ZjAiXX0=',
          address_count: 5,
          is_favorite: false
        }
      ]
      
      const tempFavoritesList = []
      const tempRecordsList = []
      for (const resp of respData) {
        const decryptedName = await decryptMemo(keypair.privkey, resp.name)
        const temp = {
          id: resp.id,
          name: decryptedName,
          address_count: resp.address_count
        }
        if (resp.is_favorite) tempFavoritesList.push(temp)
        else tempRecordsList.push(temp)
      }

      this.favoritesList = [{
        letter_group: 'favorites',
        data: tempFavoritesList.sort((a, b) => a.name.localeCompare(b.name))
      }]

      const groupedRecords = {}
      tempRecordsList.forEach(item => {
        const letterGroup = item.name && typeof item.name === 'string'
          ? item.name.charAt(0).toLowerCase()
          : ''
        if (!groupedRecords[letterGroup]) {
          groupedRecords[letterGroup] = []
        }
        groupedRecords[letterGroup].push(item)
      })

      this.recordsList = Object.keys(groupedRecords)
        .sort()
        .map(group => ({
          letter_group: group,
          data: groupedRecords[group].sort((a, b) => a.name.localeCompare(b.name))
        }))
    } catch (error) {
      console.log(error)
    }

    await new Promise(resolve => setTimeout(resolve, 1000))
    this.isLoading = false
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