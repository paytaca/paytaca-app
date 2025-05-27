<template>
  <q-chip
    dark
    clickable
    size="15px"
    :square="parseSquare(saleGroup)"
    :color="parseSaleChipColor(saleGroup)"
    :label="parseSaleGroup(saleGroup)"
  />
</template>

<script>
const SALE_GROUP_CHIP = {
  all: { label: 'All', color: 'purple', isSquare: false },
  seed: { label: 'Seed Round', color: 'red', isSquare: false },
  priv: { label: 'Private Round', color: 'blue', isSquare: false },
  pblc: { label: 'Public Round', color: 'green', isSquare: false },
  lock: { label: 'Lockup', color: 'red', isSquare: true },
  vest: { label: 'Vesting', color: 'blue', isSquare: true }
}

export default {
  name: 'SaleGroupChip',

  props: {
    saleGroup: { type: String, default: 'all' }
  },

  methods: {
    parseSaleGroup (saleGroup) {
      return SALE_GROUP_CHIP[saleGroup].label
    },
    parseSaleChipColor (saleGroup) {
      return SALE_GROUP_CHIP[saleGroup].color
    },
    parseSquare (saleGroup) {
      return SALE_GROUP_CHIP[saleGroup].isSquare
    }
  }
}
</script>