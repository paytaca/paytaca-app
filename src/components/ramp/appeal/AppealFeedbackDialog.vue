<template>
  <q-dialog ref="dialog" full-width no-shake v-model="showDialog" position="bottom">
    <q-card class="br-15 pt-card text-bow" style="width: 70%;" :class="getDarkModeClass(darkMode)">
      <div class="q-py-sm q-my-lg q-mx-lg q-px-sm">
        <div v-if="loading" class="row justify-center"><ProgressLoader/></div>
        <div v-else>
          <div class="q-mb-md text-center text-bold">
            <span style="font-size: large;">Your Feedback</span>
          </div>

          <!-- Arrow Button -->
          <div class="fixed" style="margin-top: -5px;">
            <q-btn
              rounded
              no-caps
              icon="arrow_back"
              flat
              color="blue"
              @click="index--"
            />
          </div>
          <div class="fixed" style="margin-top: -5px; width: 83%;" >
            <div class="row justify-end">
              <q-btn
                rounded
                no-caps
                icon="arrow_forward"
                flat
                color="blue"
                @click="index++"
              />
            </div>
          </div>

          <!-- Feedback Contents -->
          <!-- <div class="text-center">
            <span style="font-size: medium;">User Name</span><br>
            <span style="font-size: small; color: gray;">(Arbiter)</span>
          </div>
          <div class="q-py-xs text-center">
            <q-rating
              readonly
              v-model="arbiterFeedback.rating"
              size="3em"
              color="yellow-9"
              icon="star"
            />
          </div>
          <div class="q-py-sm q-px-xs">
            <q-input
              v-if="!arbiterFeedback.created_at || arbiterFeedback.rating > 0 && arbiterFeedback.comment.length > 0"
              v-model="arbiterFeedback.comment"
              :dark="darkMode"
              readonly
              dense
              outlined
              autogrow
            />
          </div> -->
        </div>
      </div>
    </q-card>
  </q-dialog>
</template>
<script>
import { backend } from 'src/wallet/ramp/backend'
import { bus } from 'src/wallet/event-bus'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'
import ProgressLoader from 'src/components/ProgressLoader.vue'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      showDialog: true,
      loading: false,
      index: 1,
      reviews: ['1']
    }
  },
  components: {
    ProgressLoader
  },
  methods: {
    getDarkModeClass
  }
}
</script>

