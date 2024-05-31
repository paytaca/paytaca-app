<template>
  <q-dialog full-width persistent>
    <q-card class="br-15">
      <div class="row justify-between q-pt-md q-pb-md">
        <span class="text-h6 q-pl-lg">Settings</span>
        <div>
          <q-btn
            flat
            padding=""
            icon="close"
            class="close-button"
            v-close-popup
          />
        </div>
      </div>

      <q-scroll-area style="height: 325px;" class="q-mb-md">
        <div class="q-mx-lg q-mb-lg">
          <!-- Name -->
          <div>
            <div>Name</div>
            <div>
              <q-input
                ref="inputRef"
                outlined
                v-model="username"
                dense
                :readonly="readOnlyState"
              >
              <template v-slot:append>
                <q-icon v-if="readOnlyState" @click="editName" name="o_edit" color="blue" />

                <q-icon v-if="!readOnlyState" name="close" color="grey"
                  @click="() => {
                    readOnlyState=true
                    $refs.inputRef.blur()
                  }"/>
                <q-icon @click="saveName" v-if="!readOnlyState" name="check" color="blue" />
              </template>
            </q-input>
            </div>

          </div>
          <!-- Status -->
          <div class="q-pt-md">
            <div>Status <q-icon :class="isActive? 'active-color' : 'inactive-color'" size="13px" name="mdi-checkbox-blank-circle"/></div>
            <div>
              <q-input
                outlined
                v-model="status"
                dense
                readonly
              >
                <template v-slot:append>
                  <q-icon size="md" @click="isActive = !isActive" :name="isActive ? 'toggle_on' : 'toggle_off'" :color="isActive ? 'blue' : 'grey'" />
                </template>
              </q-input>
            </div>
          </div>

          <div class="q-pt-md">
            <div>Currency</div>
            <q-list dense bordered padding class="rounded-borders">
              <q-item v-for="(currency, index) in currencies" :key="index" :style="separator(darkMode, index)">
                <q-item-section>
                  {{ currency }}
                </q-item-section>
              </q-item>
            </q-list>
          </div>
        </div>
      </q-scroll-area>
    </q-card>
  </q-dialog>
</template>
<script>
import { getDarkModeClass } from 'src/utils/theme-darkmode-utils'

export default {
  data () {
    return {
      darkMode: this.$store.getters['darkmode/getStatus'],
      username: 'Arbiter 1',
      isActive: true,
      status: 'Active',
      readOnlyState: true,
      currencies: ['PHP', 'USD', 'CAD']
    }
  },
  watch: {
    isActive (stat) {
      if (stat) {
        this.status = 'Active'
      } else {
        this.status = 'Inactive'
      }
    }
  },
  methods: {
    getDarkModeClass,
    editName () {
      this.readOnlyState = false
      this.$refs.inputRef.focus()
    },
    saveName () {
      // save name

      this.readOnlyState = true
      this.$refs.inputRef.blur()
    },
    separator (mode, index) {
      if (this.currencies.length - 2 < index) {
        return ''
      } else {
        return mode ? 'border-bottom: 1px solid grey' : 'border-bottom: 1px solid #DAE0E7'
      }
    }
  }
}
</script>
<style lang="scss" scoped>
.inactive-color {
  color: #ed5e59;
  -webkit-text-fill-color: #ed5e59;
}
.active-color {
  color: #8ec351;
  -webkit-text-fill-color: #8ec351;
}
</style>
