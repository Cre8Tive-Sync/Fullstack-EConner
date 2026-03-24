<template>
  <div ref="arMount" style="width: 100%; height: 100vh"></div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { createElement } from 'react'

export default defineComponent({
  data() {
    return {
      arRoot: null as Root | null,
    }
  },
  mounted() {
    import('./ar/ARScene.jsx').then(({ default: ARScene }) => {
      this.arRoot = createRoot(this.$refs.arMount as Element)
      this.arRoot?.render(createElement(ARScene))
    })
  },
  beforeUnmount() {
    this.arRoot?.unmount()
  },
})
</script>
