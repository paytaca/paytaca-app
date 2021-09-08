<template>
  <div id="transaction">
    <q-dialog ref="dialog" full-width @hide="hide">
      <q-card v-if="collectible">
        <template v-if="collectible.image_url.length > 0">
          <q-img :src="collectible.image_url" fit="fill"></q-img>
        </template>
        <template v-else>
          <gravatar
            :hash="collectible.token_id"
          />
        </template>
        <q-card-section style="text-align: center;">
          <div class="text-h6">{{ collectible.name }}</div>
          <a
            :href="'https://simpleledger.info/#token/' + collectible.token_id"
            style="text-decoration: none; color: gray;"
            target="_blank"
          >
            {{ collectible.token_id.slice(0, 15) }}
            <q-icon name="exit_to_app" />
          </a>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script>
import Gravatar from 'vue-gravatar'

export default {
  name: 'collectible',
  components: { Gravatar },
  data () {
    return {
      collectible: null
    }
  },
  methods: {
    show (collectible) {
      try {
        this.collectible = collectible
        this.$refs.dialog.show()
      } catch (err) {}
    },
    hide () {
      this.$refs.dialog.hide()
    }
  }
}
</script>
