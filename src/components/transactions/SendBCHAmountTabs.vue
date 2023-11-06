<template>
  <div>
    <div class="buttons-container">
      <q-btn label="Add Recipient" class="button" @click.prevent="addTab" />
      <q-btn label="Remove Recipient" class="button" @click.prevent="removeTab" />
    </div>
    <div class="tabs-container">
      <div v-for="(tab, index) in tabs" :key="index">
        <q-btn :label="`R${index + 1}`" class="button" @click.prevent="setActiveTab(index)" />
        <!-- <div v-if="isActiveTab(index)">
          <SendBCHAmountInputFields />
        </div> -->
      </div>
    </div>
  </div>
</template>

<script>
import SendBCHAmountInputFields from 'src/components/transactions/SendBCHAmountInputFields.vue'

export default {
  data () {
    return {
      tabs: [{ title: 'New Tab', content: 'Tab Content' }],
      activeTab: 0
    }
  },
  components: {
    SendBCHAmountInputFields
  },
  methods: {
    addTab () {
      if (this.tabs.length >= 5) {
        console.log('Cannot add anymore. Remove some tabs')
      } else {
        this.tabs.push({ title: 'New Tab', content: 'Tab Content' })
      }
    },
    removeTab () {
      if (this.tabs.length <= 1) {
        console.log('Cannot remove main recipient')
      } else {
        this.tabs.pop()
      }
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

<style lang="scss" scoped>
.buttons-container {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 15px;
}
.tabs-container {
  display: flex;
  align-items: flex-start;
  margin: 10px 0;
}
</style>
