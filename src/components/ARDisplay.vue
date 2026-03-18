<template>
  <div ref="arMount" style="width: 100%; height: 100vh;" />
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { createElement } from 'react'

export default defineComponent({
  data() {
    return {
      _arRoot: null as Root | null
    }
  },
  mounted() {
    import('./ar/ARScene.jsx').then(({ default: ARScene }) => {
      this._arRoot = createRoot(this.$refs.arMount as Element)
      this._arRoot.render(createElement(ARScene))
    })
  },
  beforeUnmount() {
    this._arRoot?.unmount()
  }
})
</script>
