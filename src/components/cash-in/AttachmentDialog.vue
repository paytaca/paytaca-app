<template>
    <q-dialog :model-value="show" @before-hide="$emit('back')" full-width>
      <q-card class="cashin-card br-15 pt-card-2 text-bow" :class="getDarkModeClass(darkMode)">
        <q-icon name="close" size="sm" color="red" class="q-pt-sm q-pl-sm" v-close-popup/>
        <div class="q-pb-md q-pt-sm q-px-sm">
          <q-img
            :src="url"
            >
            <template v-slot:error>
              <div class="absolute-full flex flex-center text-white">
                {{ $t('CannotLoadImage') }}
              </div>
            </template>
          </q-img>
        </div>
      </q-card>
    </q-dialog>
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus']
    }
  },
  emits: ['back'],
  props: {
    show: {
      type: Boolean,
      default: true
    },
    url: String
  },
  methods: {
    getDarkModeClass
  }
}
</script>
