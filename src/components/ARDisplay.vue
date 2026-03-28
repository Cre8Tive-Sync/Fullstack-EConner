<template>
  <div style="width: 100%; height: 100vh; position: relative">
    <div ref="arMount" style="width: 100%; height: 100%"></div>

    <!-- Minimal Vue-driven UI panel that opens when AR emits an event -->
    <div
      v-if="uiPanelOpen"
      style="
        position: fixed;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 70;
      "
    >
      <div
        style="
          width: 340px;
          max-width: 90%;
          background: rgba(10, 10, 20, 0.95);
          color: #fff;
          border-radius: 12px;
          padding: 16px;
          position: relative;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
        "
      >
        <button
          @click="closePanel"
          style="
            position: absolute;
            right: 12px;
            top: 12px;
            background: transparent;
            border: none;
            color: #fff;
            font-size: 18px;
            cursor: pointer;
          "
        >
          ✕
        </button>
        <h3 style="margin: 0 0 8px 0; font-family: 'DM Sans', sans-serif">AR Details</h3>
        <div style="font-size: 0.9rem; max-height: 320px; overflow: auto">
          <pre style="white-space: pre-wrap; color: #dfefff">{{ selectedMetaLabel }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { createElement } from 'react'
import { on, off, emit } from '../eventBridge/index.js'

type ArHandlers = {
  targeted: (event: Event) => void
  select: (event: Event) => void
  panelOpened: (event: Event) => void
  enter: (event: Event) => void
}

const noop = () => {}

export default defineComponent({
  data() {
    return {
      arRoot: null as Root | null,
      targeted: false,
      uiPanelOpen: false,
      selectedMeta: null as unknown | null,
      arHandlers: {
        targeted: noop,
        select: noop,
        panelOpened: noop,
        enter: noop,
      } as ArHandlers,
    }
  },
  computed: {
    selectedMetaLabel(): string {
      try {
        return this.selectedMeta
          ? JSON.stringify(this.selectedMeta, null, 2)
          : 'No details available.'
      } catch {
        return String(this.selectedMeta)
      }
    },
  },
  mounted() {
    import('./ar/ARScene.jsx').then(({ default: ARScene }) => {
      this.arRoot = createRoot(this.$refs.arMount as Element)
      if (this.arRoot) {
        this.arRoot.render(createElement(ARScene))
      }
    })

    // Register bridge listeners
    this.arHandlers = {
      targeted: (event: Event) => {
        const detail = (event as CustomEvent<{ targeted?: boolean }>).detail ?? {}
        this.targeted = detail.targeted ?? false
      },
      select: (event: Event) => {
        this.selectedMeta = (event as CustomEvent<unknown>).detail ?? null
        this.uiPanelOpen = true
      },
      panelOpened: (event: Event) => {
        const detail = (event as CustomEvent<{ open?: boolean }>).detail ?? {}
        this.uiPanelOpen = detail.open ?? this.uiPanelOpen
      },
      enter: () => {
        /* reserved: AR entered */
      },
    }

    on('ar:targeted', this.arHandlers.targeted)
    on('ar:select', this.arHandlers.select)
    on('ar:panelOpened', this.arHandlers.panelOpened)
    on('ar:enter', this.arHandlers.enter)
  },
  beforeUnmount() {
    if (this.arRoot) {
      this.arRoot.unmount()
    }
    // Remove listeners
    off('ar:targeted', this.arHandlers.targeted)
    off('ar:select', this.arHandlers.select)
    off('ar:panelOpened', this.arHandlers.panelOpened)
    off('ar:enter', this.arHandlers.enter)
  },
  methods: {
    closePanel() {
      this.uiPanelOpen = false
      this.selectedMeta = null
      emit('ui:closePanel', {})
    },
  },
})
</script>
