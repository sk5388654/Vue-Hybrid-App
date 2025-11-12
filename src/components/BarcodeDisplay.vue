<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import JsBarcode from 'jsbarcode'

const props = defineProps<{
  value: string
}>()

const svgRef = ref<SVGSVGElement | null>(null)

function render() {
  if (svgRef.value && props.value) {
    JsBarcode(svgRef.value, props.value, {
      format: 'CODE128',
      width: 2,
      height: 60,
      displayValue: true,
      fontSize: 14,
      margin: 2,
    })
  }
}

onMounted(render)
watch(() => props.value, render)
</script>

<template>
  <svg ref="svgRef"></svg>
</template>

<style scoped>
</style>

