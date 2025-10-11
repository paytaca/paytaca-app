<template>
  <body :class="`theme-${theme} preview`">
    <div id="p-app-container" :class="`${mode}`">
      <!-- bch card -->
      <q-card id="p-bch-card">
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
      <div :class="`col p-transaction-container ${mode}`">
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
      <div :class="`row justify-center absolute-bottom p-fixed-footer text-bow ${mode}`">
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
  #p-app-container {
    height: 170px !important;
    min-height: 170px !important;
    max-height: 170px !important;
    width: 110px;
    border-radius: 10px;
    font-size: 8px;
    position: relative !important;
    flex-direction: column;
    display: flex;
  }
  #p-bch-card {
    margin: 10px 10px 0 10px;
    border-radius: 5px;
  }
  .p-transaction-container {
    border-radius: 10px;
  }
  .p-fixed-footer {
    height: 25px;
    padding-top: 5px;
    box-shadow: 1px -0.5px 2px 1px rgba(99, 103, 103, .1);
    z-index: 6;
    border-radius: 10px !important;
  }
  .q-skeleton--anim {
    cursor: default !important;
  }

  /* ===== hardcoded values ===== */
  /* this is to address a bug where changing themes */
  /* causes the template to follow that theme's styles */

  body.theme-default.preview {
    #p-app-container {
      &.dark {
        background: #273746 !important;
      }

      &.light {
        background-color: #ecf3f3 !important;
      }
    }
    #p-bch-card {
      background-image: linear-gradient(
        to right bottom,
        rgba(59, 123, 246, 0.9),
        rgba(54, 129, 232, 0.9),
        rgba(49, 139, 218, 0.9),
        rgba(44, 149, 204, 0.9),
        rgba(39, 159, 190, 0.9)
      );
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15) !important;
    }
    .p-transaction-container {
      &.dark {
        background-color: #212f3d;
      }

      &.light {
        background-color: #f9f8ff;
      }
    }
    .p-fixed-footer {
      border-top-right-radius: 20px;
      border-top-left-radius: 20px;

      &.dark {
        background-color: #1c2833;
      }

      &.light {
        background-color: white;
      }
    }
  }

  body.theme-payhero.preview {
    #p-app-container {
      &.dark {
        background: linear-gradient(
          180deg,
          #4872b8 0%,
          #000 100%
        ) !important;
      }

      &.light {
        background: linear-gradient(
          180deg,
          #fff 0%,
          #ffbf00 100%
        ) !important;
      }
    }
    #p-bch-card {
      background: rgba(0, 0, 0, 0.5);
      box-shadow: none !important;
    }
    .p-transaction-container {
      &.dark {
        background-color: #1a2a43;
      }

      &.light {
        background-color: #9b8447;
      }
    }
    .p-fixed-footer {
      background-color: #1f1f1f !important;
    }
  }
</style>
