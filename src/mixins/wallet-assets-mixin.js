export default {
  methods: {
    getAssetStats (id) {
      return this.$store.getters['assets/getAssetStats'](id)
    },
    getAssetLogo (id) {
      return this.$store.getters['assets/getAssetLogo'](id)
    }
	}
}