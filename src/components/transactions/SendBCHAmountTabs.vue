<template>
  <div>
    <button @click="addTab">Add Tab</button>
    <div v-for="(tab, index) in tabs" :key="index">
      <button @click="setActiveTab(index)">{{ tab.title }}</button>
      <div v-if="isActiveTab(index)">
        <SendBCHAmountInputFields />
      </div>
    </div>
  </div>
</template>

<script>
import SendBCHAmountInputFields from 'src/components/transactions/SendBCHAmountInputFields.vue'

export default {
  data () {
    return {
      tabs: [],
      activeTab: 0
    }
  },
  components: {
    SendBCHAmountInputFields
  },
  methods: {
    addTab () {
      this.tabs.push({ title: 'New Tab', content: 'Tab Content' })
    },
    setActiveTab (index) {
      this.activeTab = index
    },
    isActiveTab (index) {
      return this.activeTab === index
    }
  }
}
</script>
