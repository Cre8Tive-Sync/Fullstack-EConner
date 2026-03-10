<template>
  <div ref="arMount" style="width: 100%; height: 100vh;" />
</template>

<script>
import { createRoot } from 'react-dom/client'
import { createElement } from 'react'
import ARScene from './ar/ARScene'

export default {
  mounted() {
    this._arRoot = createRoot(this.$refs.arMount)
    this._arRoot.render(createElement(ARScene))
  },
  beforeUnmount() {
    this._arRoot.unmount()
  }
}
</script>