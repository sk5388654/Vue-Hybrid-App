<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import JsBarcode from 'jsbarcode'

const props = defineProps<{
  value: string
}>()

const svgRef = ref<SVGSVGElement | null>(null)

function render() {
  if (svgRef.value && props.value) {
    const isDark = document.documentElement.classList.contains('dark')
    // Bars should contrast with background: black bars in light mode, white bars in dark mode
    const lineColor = isDark ? '#ffffff' : '#000000'
    const fontColor = isDark ? '#ffffff' : '#000000'

    // ensure svg has explicit pixel width and height so JsBarcode can draw correctly
    try {
      const parent = svgRef.value.parentElement as HTMLElement
      const widthPx = Math.max(100, Math.floor(parent?.clientWidth || 200))
      svgRef.value.setAttribute('width', String(widthPx))
    } catch (e) {
      svgRef.value.removeAttribute('width')
    }
    svgRef.value.setAttribute('height', '70')

    JsBarcode(svgRef.value, props.value, {
      format: 'CODE128',
      width: 2,
      height: 60,
      displayValue: true,
      fontSize: 14,
      margin: 2,
      background: isDark ? '#000000' : '#ffffff',
      lineColor,
    })

    // JsBarcode doesn't support `fontColor` in its Options type. Set the text color
    // on the generated <text> elements inside the SVG instead.
    try {
      const texts = svgRef.value.querySelectorAll('text')
      texts.forEach((t) => {
        ;(t as SVGTextElement).setAttribute('fill', fontColor)
      })
    } catch (e) {
      // ignore
    }

    // Make sure svg background follows CSS variable (some browsers don't resolve CSS var in inline style reliably)
    try {
      const bg = getComputedStyle(document.documentElement).getPropertyValue('--barcode-bg') || ''
      ;(svgRef.value.parentElement as HTMLElement).style.background = bg.trim() || 'transparent'
    } catch (e) {
      /* ignore */
    }
  }
}

onMounted(render)
watch(() => props.value, render)

// Re-render when the document's class attribute changes (theme toggle)
const observer = new MutationObserver((mutations) => {
  for (const m of mutations) {
    if (m.type === 'attributes' && m.attributeName === 'class') {
      render()
    }
  }
})

onMounted(() => {
  observer.observe(document.documentElement, { attributes: true })
})

onUnmounted(() => {
  observer.disconnect()
})
</script>

<template>
  <div class="barcode-svg">
    <svg ref="svgRef"></svg>
  </div>
</template>

<style scoped>
</style>

