<template>
    <div class="text-center">
        <div class="row justify-center q-mx-md" style="font-size: 25px;">
            {{ title }}
        </div>
        <div class="row justify-center q-px-lg q-mx-lg" style="font-size: medium; opacity: .7;">
            {{ subtitle }}
        </div>
        <q-spinner-hourglass v-if="spinner" class="col q-pt-sm" color="blue-6" size="3em"/>
        <div v-if="button" @click="$emit('btn-click')" class="text-center q-pt-sm text-weight-medium text-underline" :class=" darkMode ? 'text-blue-6' : 'text-blue-8'" style="font-size: medium;">
            {{ buttonLabel }}
        </div>
        <div class="text-center row q-mx-lg" style="position: fixed; bottom: 20px; left: 0; right: 0; margin: auto;">
            <div class="col" style="opacity: .55;">
                <div class="row justify-center text-bow" style="font-size: 15px;">Powered by</div>
                <div class="row justify-center text-weight-bold" :class="darkMode ? 'text-blue-6' : 'text-blue-8'" style="font-size: 20px;">P2P Exchange</div>
            </div>
        </div>
    </div>
</template>
<script>
export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus']
    }
  },
  props: {
    title: String,
    subtitle: String,
    buttonLabel: String,
    spinner: {
      type: Boolean,
      default: false
    },
    button: {
      type: Boolean,
      default: false
    }
  },
  emits: ['btn-click']
}
</script>
