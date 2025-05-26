<template>
  <q-chip
    dark
    clickable
    size="15px"
    :color="parseSaleChipColor(saleGroup)"
    :label="parseSaleGroup(saleGroup)"
  />
</template>

<script>
const SALE_GROUP_CHIP = {
  all: { label: 'All', color: 'purple' },
  seed: { label: 'Seed Round', color: 'red' },
  priv: { label: 'Private Round', color: 'blue' },
  pblc: { label: 'Public Round', color: 'green' }
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
    }
  }
}
</script>