<template>
  <div class="accounts-layout-safe">
    <router-view />
  </div>
</template>

<script>

export default {
  name: 'accounts-layout',
  data () {
    return {
    }
  }
}
</script>

<style lang="scss">
/* Ensure /accounts and /lock routes respect device safe areas (notch/status bar). */
.accounts-layout-safe {
  box-sizing: border-box;
  min-height: 100vh;

  /* iOS (legacy + modern) */
  padding-top: max(constant(safe-area-inset-top), var(--pt-android-statusbar, 0px));
  padding-top: max(env(safe-area-inset-top, 0px), var(--pt-android-statusbar, 0px));
  padding-bottom: max(constant(safe-area-inset-bottom), 0px);
  padding-bottom: max(env(safe-area-inset-bottom, 0px), 0px);

  /* Rounded corners / display cutouts on the sides */
  padding-left: env(safe-area-inset-left, 0px);
  padding-right: env(safe-area-inset-right, 0px);
}
</style>
