<template>
  <q-card
    class="br-15 q-pt-sm q-mx-md"
    :class="[ darkMode ? 'text-white pt-dark-card-2' : 'text-black',]"
    style="min-height:50vh;"
  >
    <div>
      <q-btn
        flat
        padding="md"
        icon="arrow_back"
        @click="$emit('back')"
      />
    </div>
    <div class="text-center q-pt-none" v-if="isloaded">
      <q-icon size="5em" name='o_account_circle' :color="darkMode ? 'blue-grey-1' : 'blue-grey-6'"/>
      <div class="bold-text lg-font-size q-pt-sm">
        {{ user.name }} <q-icon @click="editNickname = true" v-if="type === 'self'" size="sm" name='o_edit' color="blue-grey-6"/>
      </div>
    </div>
  </q-card>
  <MiscDialogs
    v-if="editNickname"
    :type="'editNickname'"
    v-on:back="editNickname = false"
    v-on:submit="updateUserName"
  />
</template>
<script>
import MiscDialogs from './dialogs/MiscDialogs.vue'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      isloaded: false,
      user: null,
      editNickname: false
    }
  },
  props: {
    userInfo: {
      type: Object,
      default: null
    },
    type: {
      type: String,
      default: 'self'
    }
  },
  emits: ['back'],
  components: {
    MiscDialogs
  },
  methods: {
    processUserData () {
      if (this.type === 'self') {
        // get this user's info
        this.user = {
          name: this.$store.getters['global/getRampNickName']
        }
      } else {
        this.user = this.userInfo
      }
    },
    updateUserName(info) {
      this.$store.commit('global/editRampNickname', info.nickname)
      this.processUserData()
    }
  },
  async mounted () {
    const vm = this
    await this.processUserData()
    vm.isloaded = true
  }
}
</script>

<!-- REQUEST USER INFO? -->
