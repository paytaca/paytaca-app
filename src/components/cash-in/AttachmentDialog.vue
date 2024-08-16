<template>
    <q-dialog :model-value="show" @before-hide="$emit('back')" full-width full-height>
      <q-card class="cashin-card br-15 pt-card-2 text-bow q-pb-lg" :class="getDarkModeClass(darkMode)">
        <q-img
          :src="url"
          >
          <template v-slot:error>
            <div class="absolute-full flex flex-center text-white">
              Cannot load image
            </div>
          </template>
          <q-icon @click="$emit('back')" class="absolute all-pointer-events" size="30px" name="close" color="white" style="top: 8px; right: 8px"></q-icon>
        </q-img>
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
