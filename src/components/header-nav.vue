<template>
  <div class="header-nav-wrapper">
    <template v-if="rewardsPage === ''">
      <div
        ref="header-nav"
        class="pt-header row no-wrap"
        :style="{'padding-top': $q.platform.is.ios ? '73px' : '18px', 'height': $q.platform.is.ios ? '95px' : '70px', 'padding-bottom': $q.platform.is.ios ? '45px' : '0px'}"
        :class="getDarkModeClass(darkMode)"
      >
        <div class="col-1">
          <router-link
            :to="backTo"
            class="pt-arrow-left-link"
            :class="{'text-grad': darkMode}"
            :style="{width: $q.platform.is.bex ? '375px' : '20%', 'margin-top': $q.platform.is.ios ? '-5px' : '0'}">
            <span class="material-icons" @click="onClick">
                arrow_back
            </span>
          </router-link>
        </div>
        <div class="col-10">
          <p
            ref="header-title"
            class="text-h5 text-uppercase text-center q-my-none"
            :class="{'text-grad': darkMode}"
            :style="{'margin-top': $q.platform.is.ios ? '-5px' : '0'}"
          >
            {{ title }}
          </p>
        </div>
        <div class="col-1">
          <slot name="top-right-menu">&nbsp;</slot>
        </div>
      </div>
    </template>

    <template v-else>
      <div
        ref="header-nav"
        class="row no-wrap pt-header justify-between"
        :style="{
          'padding-top': $q.platform.is.ios ? '73px' : '18px',
          'height': $q.platform.is.ios ? '95px' : '70px',
          'padding-bottom': $q.platform.is.ios ? '45px' : '0px'
        }"
        :class="{'pt-card-3': darkMode}"
      >
        <div class="col-1">
          <router-link
            :to="backTo"
            class="pt-arrow-left-link"
            :class="{'text-grad': darkMode}"
            :style="{width: $q.platform.is.bex ? '375px' : '20%', 'margin-top': $q.platform.is.ios ? '-5px' : '0'}">
            <span class="material-icons" @click="onClick">
                arrow_back
            </span>
          </router-link>
        </div>
        <div>
          <p
            ref="header-title"
            class="text-h5 text-uppercase text-center q-my-none"
            :class="{'text-grad': darkMode}"
            :style="{'margin-top': $q.platform.is.ios ? '-5px' : '0'}"
          >
            {{ title }}
          </p>
        </div>
        <div class="col-1 q-mr-sm">
          <q-btn
            round
            class="button"
            icon="question_mark"
            size="sm"
            @click="openRewardsHelpDialog"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<script>
import HelpDialog from 'src/components/rewards/dialogs/HelpDialog.vue'
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils';

export default {
  name: 'header-nav',
  props: {
    title: {
      type: String,
      default: ''
    },
    backnavpath: {
      type: [String, Object],
      default: ''
    },
    rewardsPage: {
      type: String,
      default: ''
    }
  },
  components: {
    HelpDialog
  },
  emits: ['click'],
  data () {
    return {
      addedBodyPadding: false
    }
  },
  computed: {
    darkMode () {
      return this.$store.getters['darkmode/getStatus']
    },
    backTo () {
      if (typeof this.backnavpath === 'object') {
        return this.backnavpath
      }
      return { path: this.backnavpath }
    }
  },
  mounted () {
    // adjust header-nav div height when header title breaks into two lines
    const headerTitleHeight = this.$refs['header-title'].clientHeight
    const headerNavHeight = this.$refs['header-nav'].clientHeight

    if (headerNavHeight === 70) { // not iOS
      this.$refs['header-nav'].setAttribute('style', `height: ${headerTitleHeight > 32 ? '100' : '70'}px;`)
      if (headerTitleHeight > 32) {
        // move all elements 30px down due to the change in height
        document.body.style.paddingTop = '30px'
        this.addedBodyPadding = true
      }
    }
  },
  beforeUnmount () {
    if (this.addedBodyPadding) document.body.style.paddingTop = ''
  },
  methods: {
    getDarkModeClass,
    async onClick () {
      if (this.backnavpath) {
        if (typeof this.backnavpath === 'object') {
          await this.$router.push(this.backnavpath)
        } else {
          await this.$router.push({ path: this.backnavpath })
        }
      } else {
        this.$router.go(-1)
      }
      this.$emit('click')
    },
    openRewardsHelpDialog () {
      this.$q.dialog({
        component: HelpDialog,
        componentProps: { page: this.rewardsPage }
      })
    }
  }
}
</script>

<style lang="scss">
.pt-header {
  color: #3B7BF6;
  margin-top: 0;
  margin-left: auto;
  margin-right: auto;
  padding-top: 20px;
  z-index: 100;
  background: #ecf3f3;
}
.pt-arrow-left-link {
  position: absolute;
  font-size: 30px;
  left: 20px;
  color: #3B7BF6;
  text-decoration: none;
  display: flex;
  justify-items: center;
  align-items: center;
}
.pt-settings-icon {
  position: absolute;
  font-size: 28px;
  right: 20px;
  color: #3B7BF6;
  display: flex;
  justify-items: center;
  align-items: center;
}
</style>
