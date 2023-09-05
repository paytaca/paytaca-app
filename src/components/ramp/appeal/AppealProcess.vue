<template>
  <div v-if="isloaded">
    <div v-if="state === 'release-form'">
      <ReleaseForm
        :appealInfo="appeal"
        @back="$emit('back')"
      />
    </div>

    <div v-if="state === 'verify-transfer'">
      <VerifyTransfer
        @back="$emit('back')"
      />
    </div>
  </div>
</template>
<script>
import ReleaseForm from './ReleaseForm.vue'
import VerifyTransfer from './VerifyTransfer.vue'

export default {
  data () {
    return {
      state: 'release-form',
      appeal: null,
      isloaded: false
    }
  },
  props: {
    selectedAppeal: Object
  },
  emits: ['back'],
  components: {
    ReleaseForm,
    VerifyTransfer
  },
  async mounted () {
    this.appeal = this.selectedAppeal
    console.log(this.appeal)

    this.isloaded = true
  }
}
</script>
