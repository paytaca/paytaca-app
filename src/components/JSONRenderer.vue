<template>
  <div>
    <q-tree
      :nodes="tree"
      dense
      node-key="hash"
      no-connectors
      class="text-black json-renderer"
    >
      <template v-slot:default-header="{ node }">
        <template v-if="node.label">
          {{ node.label }}
        </template>
        <template v-else>
          {{ node.property }} : {{ node.value }}
        </template>
      </template>
    </q-tree>
  </div>
</template>
<script>

function toNodes(value, prefix="") {
  if (typeof value !== 'object') return [ {
    hash: [prefix, String(value)].filter(Boolean).join('-'),
    label: String(value)
  } ]

  const nodes = []
  for (let property in value) {
    const children = toNodes(value[property])
    const node = {
      hash: [prefix, String(property)].filter(Boolean).join('-'),
    }
    if (children.length === 1) {
      node.property = property
      node.value = children[0].label
    } else {
      node.label = String(property)
      node.children = children
    }
    nodes.push(node)
  }
  return nodes
}

export default {
  name: 'JSONRenderer',
  props: {
    value: {}
  },
  computed: {
    tree() {
      try {
        return toNodes(JSON.parse(this.value))
      } catch (err){
        return toNodes(this.value)
      }
    }
  },
}
</script>
<style scoped>
.json-renderer::v-deep .q-tree__children::v-deep{
  padding-left: 15px;
}
</style>