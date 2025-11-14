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

      <!-- action buttons section -->
      <div :class="`row justify-center text-bow q-mt-sm ${mode}`">
        <div
          v-for="index in 4"
          v-bind:key="`${index}-action`"
          :class="`col row justify-evenly items-center q-mb-xs ${theme}`"
        >
          <q-skeleton
            bordered
            type="QToggle"
            size="15px"
            :dark="!isDark(mode)"
          />
        </div>
      </div>

      <!-- tokens section -->
      <div :class="`row justify-center text-bow q-mt-md ${mode}`">
        <div
          v-for="index in 2"
          v-bind:key="`${index}-action`"
          :class="`col row justify-evenly items-center q-mb-xs ${theme}`"
        >
          <q-skeleton
            bordered
            type="rect"
            height="25px"
            width="80%"
            :dark="!isDark(mode)"
          />
        </div>
      </div>

      <!-- footer -->
      <div :class="`row justify-center absolute-bottom p-fixed-footer text-bow ${mode}`">
        <div
          v-for="index in 5"
          v-bind:key="index"
          :class="`col row justify-evenly items-center q-mb-xs ${theme}`"
        >
          <q-skeleton
            bordered
            type="QToggle"
            :size="index === 3 ? '15px' : '10px'"
            :dark="!isDark(mode)"
          />
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
    isDark (mode = null) {
      return mode === 'light'
    }
  }
}
</script>

<style lang="scss" scoped>
  body.preview {
    margin: 0 !important;
    padding: 0 !important;
  }
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
    padding: 0; /* ensure no inner padding */
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
  /* when adding new themes, add their styles here as stated by the components above */

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
    .p-fixed-footer {
      background-color: #1f1f1f !important;
    }
  }

  body.theme-glassmorphic-blue.preview {
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
      cursor: pointer;
      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
    }
    .p-fixed-footer {
      border-top-right-radius: 20px;
      border-top-left-radius: 20px;

      &.dark {
        background-color: rgba(28, 40, 51, 0.85);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      }

      &.light {
        background-color: rgba(255, 255, 255, 0.85);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-top: 1px solid rgba(255, 255, 255, 0.5);
      }
    }
  }

  body.theme-glassmorphic-red.preview {
    #p-app-container {
      &.dark {
        background: #462733 !important;
      }

      &.light {
        background-color: #f3ecec !important;
      }
    }
    #p-bch-card {
      background-image: linear-gradient(
        to right bottom,
        rgba(246, 59, 123, 0.9),
        rgba(232, 54, 96, 0.9),
        rgba(218, 49, 72, 0.9),
        rgba(204, 44, 61, 0.9),
        rgba(190, 39, 50, 0.9)
      );
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 8px 32px 0 rgba(135, 31, 48, 0.15) !important;
      cursor: pointer;
      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
    }
    .p-fixed-footer {
      border-top-right-radius: 20px;
      border-top-left-radius: 20px;

      &.dark {
        background-color: rgba(51, 28, 40, 0.85);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      }

      &.light {
        background-color: rgba(255, 255, 255, 0.85);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-top: 1px solid rgba(255, 255, 255, 0.5);
      }
    }
  }

  body.theme-glassmorphic-green.preview {
    #p-app-container {
      &.dark {
        background: #263d32 !important;
      }

      &.light {
        background-color: #e8f5e9 !important;
      }
    }
    #p-bch-card {
      background-image: linear-gradient(
        to right bottom,
        rgba(67, 160, 71, 0.9),
        rgba(62, 164, 74, 0.9),
        rgba(57, 168, 77, 0.9),
        rgba(52, 172, 80, 0.9),
        rgba(47, 176, 83, 0.9)
      );
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 8px 32px 0 rgba(67, 160, 71, 0.15) !important;
      cursor: pointer;
      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
    }
    .p-fixed-footer {
      border-top-right-radius: 20px;
      border-top-left-radius: 20px;

      &.dark {
        background-color: rgba(28, 51, 42, 0.85);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      }

      &.light {
        background-color: rgba(255, 255, 255, 0.85);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-top: 1px solid rgba(255, 255, 255, 0.5);
      }
    }
  }

  body.theme-glassmorphic-gold.preview {
    #p-app-container {
      &.dark {
        background: #3d3224 !important;
      }

      &.light {
        background-color: #fff8e1 !important;
      }
    }
    #p-bch-card {
      background-image: linear-gradient(
        to right bottom,
        rgba(255, 167, 38, 0.9),
        rgba(255, 176, 56, 0.9),
        rgba(255, 184, 74, 0.9),
        rgba(255, 192, 92, 0.9),
        rgba(255, 200, 110, 0.9)
      );
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 8px 32px 0 rgba(255, 167, 38, 0.15) !important;
      cursor: pointer;
      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
    }
    .p-fixed-footer {
      border-top-right-radius: 20px;
      border-top-left-radius: 20px;

      &.dark {
        background-color: rgba(51, 40, 24, 0.85);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      }

      &.light {
        background-color: rgba(255, 255, 255, 0.85);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-top: 1px solid rgba(255, 255, 255, 0.5);
      }
    }
  }
</style>
