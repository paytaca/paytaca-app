<template>
  <div class="static-container">
    <div
      id="app-container"
      style="background-color: #ECF3F3; min-height: 100vh;"
      class="q-pt-xl"
      :class="{ 'pt-dark': darkMode }"
    >
      <HeaderNav
        title="Gifts"
        backnavpath="/apps"
        style="position: fixed; top: 0; background: #ECF3F3; width: 100%; z-index: 100 !important;"
        class="q-px-sm"
      />
      <div class="row" style="margin-top: 50px;">
        <div class="col q-mt-sm q-pl-lg q-pr-lg q-pb-none flex" style="font-size: 16px; color: #444655;">
          <p :class="{'text-white': darkMode}">Choose one</p>
        </div>
      </div>
      <div>
        <div @click="$router.push({ name: 'create-gift'})" role="button" class="row q-pl-lg q-pr-lg q-mb-sm round" style="height: 50px">
          <q-btn color="primary">Create Gift</q-btn>
        </div>
        <div @click="$router.push({ name: 'claim-gift'})" role="button" class="row q-pl-lg q-pr-lg q-mt-sm" style="height: 50px">
          <q-btn color="primary">Claim Gift</q-btn>
        </div>
      </div>
    </div>
` </div>
</template>

<script>
import HeaderNav from '../../../components/header-nav'

export default {
  name: 'Gift',
  components: { HeaderNav },
  props: {
    uri: {
      type: String,
      default: ''
    }
  },
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus']
    }
  }
}
</script>
