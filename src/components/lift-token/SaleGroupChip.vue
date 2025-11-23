<template>
  <q-chip
    clickable
    size="15px"
    :square="parseSquare(saleGroup)"
    :color="parseSaleChipColor(saleGroup)"
    :label="parseSaleGroup(saleGroup)"
    :text-color="getChipTextColor(saleGroup)"
    :outline="outline"
    class="sale-group-chip"
    :class="[getDarkModeClass(darkMode), getChipClass(saleGroup)]"
  />
</template>

<script>
import { getDarkModeClass } from "src/utils/theme-darkmode-utils"

const SALE_GROUP_CHIP = {
  all: { label: "All", color: "purple-6", isSquare: false, category: "all" },
  seed: { label: "SeedRound", color: "green-6", isSquare: false, category: "round" },
  priv: { label: "PrivateRound", color: "blue-6", isSquare: false, category: "round" },
  lock: { label: "Lockup", color: "orange-7", isSquare: true, category: "status" },
  vest: { label: "Vesting", color: "light-blue-6", isSquare: true, category: "status" },
  comp: { label: "Complete", color: "teal-6", isSquare: true, category: "status" },
};

export default {
  name: "SaleGroupChip",

  props: {
    saleGroup: { type: String, default: "all" },
    outline: { type: Boolean, default: false },
  },

  computed: {
    darkMode() {
      return this.$store.getters["darkmode/getStatus"]
    },
    theme() {
      return this.$store.getters["global/theme"]
    },
  },

  methods: {
    getDarkModeClass,
    parseSaleGroup(saleGroup) {
      return this.$t(SALE_GROUP_CHIP[saleGroup].label);
    },
    parseSaleChipColor(saleGroup) {
      return SALE_GROUP_CHIP[saleGroup].color;
    },
    parseSquare(saleGroup) {
      return SALE_GROUP_CHIP[saleGroup].isSquare;
    },
    getChipTextColor() {
      if (this.outline) {
        return this.darkMode ? 'white' : 'grey-8'
      }
      return 'white'
    },
    getChipClass(saleGroup) {
      const category = SALE_GROUP_CHIP[saleGroup]?.category
      return category ? `chip-${category}` : ''
    },
  },
};
</script>

<style lang="scss" scoped>
.sale-group-chip {
  font-weight: 500;
  transition: all 0.3s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18);
  }
  
  &.dark {
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    
    &:hover {
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.4);
    }
  }
}
</style>
