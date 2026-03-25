<template>
  <div ref="arMount" style="width: 100%; height: 100vh;" />
</template>

<script lang="ts">
import { createRoot } from 'react-dom/client'
import { createElement } from 'react'

export default {
  mounted() {
    import('./ar/ARScene.jsx').then(({ default: ARScene }) => {
      this._arRoot = createRoot(this.$refs.arMount)
      this._arRoot.render(createElement(ARScene))
    })
  },
  beforeUnmount() {
    this._arRoot?.unmount()
  }
}
</script>