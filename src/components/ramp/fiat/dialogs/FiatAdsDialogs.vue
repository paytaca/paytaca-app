<template>
  <!-- Delete Ad -->
  <q-dialog v-model="deleteAd" @before-hide="$emit('back')">
    <q-card class="br-15 pt-card-2 text-bow" style="width: 90%;" :class="getDarkModeClass(darkMode)">
      <q-card-section>
        <div class="text-h6 text-center">{{ $t('DeleteThisAd') }}</div>
        <div class="text-center">{{ $t('DeleteAdWarning') }}</div>
      </q-card-section>
      <q-card-actions class="text-center" align="center">
        <q-btn flat :label="$t('Cancel')" color="red-6" @click="$emit('back')"  v-close-popup />
        <q-btn flat :label="$t('Confirm')" class="button button-text-primary" @click="selected('confirm')" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <!-- Notiify Delete -->
  <q-dialog persistent v-model="notifyDeleteAd">
    <q-card class="br-15 pt-card-2 text-bow" style="width: 70%;" :class="getDarkModeClass(darkMode)">
      <q-card-section>
        <div class="text-h6 text-center">
          <span class="q-pr-sm">{{ $t('AdDeleted') }}</span>
          <q-icon flat name="task_alt"></q-icon>
        </div>
      </q-card-section>
      <q-card-actions class="text-center" align="center">
        <q-btn flat :label="$t('OK')" class="button" @click="$emit('back')" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      state: '',
      deleteAd: false,
      notifyDeleteAd: false
    }
  },
  props: {
    type: String
  },
  emits: ['back', 'selectedOption'],
  methods: {
    getDarkModeClass,
    checkDialogType () {
      const vm = this
      switch (vm.type) {
        case 'deleteAd':
          vm.deleteAd = true
          break
        case 'notifyDeleteAd':
          // console.log('notifyDeleteAd')
          vm.notifyDeleteAd = true
          break
      }
    },
    selected (option) {
      const vm = this

      vm.$emit('selectedOption', option)
      vm.$emit('back')
    }
  },
  async mounted () {
    const vm = this
    vm.state = vm.type

    vm.checkDialogType()
  }
}
</script>
