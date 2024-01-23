<template>
  <div class="row justify-center q-pb-xs text-capitalize text-weight-bold">{{ `${mode} Mode` }}</div>
  <body :class="`theme-${theme}`">
    <div id="app-container" :class="`${mode}`">
      <!-- bch card -->
      <q-card id="bch-card">
        <q-card-section horizontal>
          <q-card-section class="col flex items-center q-px-xs q-py-sm">
            <q-skeleton bordered type="rect" height="20px" width="100%" :dark="!isDark(theme)" />
          </q-card-section>
          <q-card-section class="col-4 flex items-center justify-end q-pa-xs">
            <q-skeleton bordered type="circle" size="20px" :dark="!isDark(theme)" />
          </q-card-section>
        </q-card-section>
      </q-card>

      <!-- tokens section -->
      <div class="q-mx-sm q-my-xs">
        <q-skeleton bordered type="text" height="20px" width="100%" :dark="!isDark(null, mode)" />
      </div>

      <!-- transactions section -->
      <div :class="`col transaction-container ${mode}`">
        <div class="row items-center justify-between q-px-sm">
          <q-skeleton bordered type="text" height="20px" width="50%" :dark="!isDark(theme, mode)" />
          <q-skeleton bordered type="circle" size="15px" :dark="!isDark(theme, mode)" />
        </div>
        <div class="row flex-center q-px-md">
          <q-skeleton bordered type="rect" height="15px" width="100%" :dark="!isDark(theme, mode)" />
        </div>
        <div class="row flex-center q-pt-xs q-px-sm">
          <q-skeleton bordered type="rect" height="25px" width="100%" :dark="!isDark(theme, mode)" />
        </div>
      </div>

      <!-- footer -->
      <div :class="`row justify-center absolute-bottom fixed-footer text-bow ${mode}`">
        <div
          v-for="index in 5"
          v-bind:key="index"
          :class="`col row justify-evenly items-center q-mb-xs ${theme}`"
        >
          <q-skeleton bordered type="QToggle" size="10px" :dark="!isDark(theme, mode)" />
        </div>
      </div>
    </div>
  </body>
</template>

<script>
export default {
  name: 'PreviewTemplate',
  props: {
    theme: { type: String },
    mode: { type: String }
  },
  methods: {
    isDark (theme = null, mode = null) {
      if (theme) {
        if (mode) {
          return theme === 'default' && mode === 'light'
        } else {
          return theme === 'default'
        }
      } else if (!theme && mode) {
        return mode === 'light'
      } else {
        return false
      }
    }
  }
}
</script>

<style lang="scss" scoped>
  #app-container {
    height: 170px !important;
    min-height: 170px !important;
    max-height: 170px !important;
    width: 110px;
    border-radius: 10px;
    font-size: 8px;
  }
  #bch-card {
    margin: 10px 10px 0 10px;
    border-radius: 5px;
  }
  .transaction-container {
    border-radius: 10px;
  }
  .fixed-footer {
    height: 25px;
    padding-top: 5px;
    box-shadow: 1px -0.5px 2px 1px rgba(99, 103, 103, .1);
    z-index: 6;
    border-radius: 10px !important;
  }
  .q-skeleton--anim {
    cursor: default !important;
  }
</style>
