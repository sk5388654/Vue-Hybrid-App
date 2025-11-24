<template>
  <div class="space-y-2">
    <div class="payment-label text-sm font-medium">Payment Type</div>
    <div class="flex gap-2 items-center">
      <button
        :class="model === 'cash' ? 'bg-green-600 text-white' : 'dark-panel payment-btn'"
        class="rounded-md px-3 py-1 text-sm"
        @click="model = 'cash'"
      >Cash</button>
      <button
        :class="model === 'card' ? 'bg-green-600 text-white' : 'dark-panel payment-btn'"
        class="rounded-md px-3 py-1 text-sm"
        @click="model = 'card'"
      >Card</button>
      <button
        :class="model === 'mobile' ? 'bg-green-600 text-white' : 'dark-panel payment-btn'"
        class="rounded-md px-3 py-1 text-sm"
        @click="model = 'mobile'"
      >Mobile</button>

      <!-- Calculator Button -->
      <button
        @click="showCalc = true"
        class="ml-2 inline-flex items-center gap-2 rounded-md border border-transparent dark-panel px-3 py-1 text-sm payment-btn shadow-sm hover:shadow-md"
        title="Open calculator"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h8M8 11h8M8 15h8M5 5h14v14H5z" />
        </svg>
        Calc
      </button>

      <!-- Resume Sale Button -->
      <button
        @click="emit('open-resume')"
        class="ml-2 inline-flex items-center gap-2 rounded-md border border-transparent dark-panel px-3 py-1 text-sm payment-btn shadow-sm hover:shadow-md"
        title="Resume suspended sale"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h4v4H3zM7 6h4v4H7zM11 10h4v4h-4zM15 6h4v4h-4zM3 14h4v4H3zM7 18h4v-4H7z" />
        </svg>
        Resume Sale
      </button>

      <!-- Scan Mode moved to Settings page -->
    </div>

    <!-- Calculator Modal -->
    <div v-if="showCalc" class="fixed inset-0 z-40 flex items-center justify-center">
      <div class="absolute inset-0 bg-black/40" @click="showCalc = false"></div>
      <div class="relative z-50 w-[340px] rounded-lg dark-panel p-4">
        <div class="mb-3 flex items-center justify-between">
          <div class="text-lg font-semibold text-slate-100">Calculator</div>
          <button class="text-sm text-slate-300" @click="showCalc = false">Close</button>
        </div>

        <div class="mb-2 rounded-md border border-transparent dark-panel px-3 py-2 text-right text-2xl font-mono text-slate-100">{{ display }}</div>

        <div class="grid grid-cols-4 gap-2">
          <button class="rounded dark-panel p-3 text-sm text-slate-200" @click="clearAll">C</button>
          <button class="rounded dark-panel p-3 text-sm text-slate-200" @click="backspace">⌫</button>
          <button class="rounded dark-panel p-3 text-sm text-slate-200" @click="appendOperator('%')">%</button>
          <button class="rounded bg-indigo-600 p-3 text-sm text-white" @click="appendOperator('/')">÷</button>

          <button class="rounded dark-panel p-3 text-sm text-slate-200" @click="inputDigit('7')">7</button>
          <button class="rounded dark-panel p-3 text-sm text-slate-200" @click="inputDigit('8')">8</button>
          <button class="rounded dark-panel p-3 text-sm text-slate-200" @click="inputDigit('9')">9</button>
          <button class="rounded bg-indigo-600 p-3 text-sm text-white" @click="appendOperator('*')">×</button>

          <button class="rounded dark-panel p-3 text-sm text-slate-200" @click="inputDigit('4')">4</button>
          <button class="rounded dark-panel p-3 text-sm text-slate-200" @click="inputDigit('5')">5</button>
          <button class="rounded dark-panel p-3 text-sm text-slate-200" @click="inputDigit('6')">6</button>
          <button class="rounded bg-indigo-600 p-3 text-sm text-white" @click="appendOperator('-')">−</button>

          <button class="rounded dark-panel p-3 text-sm text-slate-200" @click="inputDigit('1')">1</button>
          <button class="rounded dark-panel p-3 text-sm text-slate-200" @click="inputDigit('2')">2</button>
          <button class="rounded dark-panel p-3 text-sm text-slate-200" @click="inputDigit('3')">3</button>
          <button class="rounded bg-indigo-600 p-3 text-sm text-white" @click="appendOperator('+')">+</button>

          <button class="col-span-2 rounded dark-panel p-3 text-sm text-center text-slate-200" @click="inputDigit('0')">0</button>
          <button class="rounded dark-panel p-3 text-sm text-slate-200" @click="inputDot">.</button>
          <button class="rounded bg-indigo-600 p-3 text-sm text-white" @click="evalExpression">=</button>
        </div>
        <div class="mt-3 flex gap-2">
          <button class="flex-1 rounded dark-panel px-3 py-2 text-sm text-slate-200" @click="clearAll">Clear</button>
        </div>
        
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const model = defineModel<'cash' | 'card' | 'mobile'>({ required: true })
const emit = defineEmits<{
  (e: 'apply-amount', value: number): void
  (e: 'open-resume'): void
}>()

import { ref, watch } from 'vue'

const showCalc = ref(false)
const display = ref('0')

function inputDigit(d: string) {
  if (display.value === '0') display.value = d
  else display.value += d
}

function inputDot() {
  if (!display.value.includes('.')) display.value += '.'
}

function clearAll() {
  display.value = '0'
}

function backspace() {
  if (display.value.length <= 1) display.value = '0'
  else display.value = display.value.slice(0, -1)
}

function applyAmount() {
  const n = Number(display.value || 0)
  if (!Number.isFinite(n)) return
  emit('apply-amount', n)
  showCalc.value = false
}

function appendOperator(op: string) {
  const last = display.value.slice(-1)
  if ('+-*/'.includes(last)) {
    display.value = display.value.slice(0, -1) + op
  } else {
    display.value += op
  }
}

function evalExpression() {
  try {
    const expr = display.value.replace(/[^0-9+\-*/().% ]/g, '')
    const normalized = expr.replace(/(\d+\.?\d*)%/g, '($1/100)')
    const res = Function(`return (${normalized})`)()
    if (Number.isFinite(res)) display.value = String(Number(res.toFixed(2)))
  } catch (e) {

  }
}

function evalAndApply() {
  evalExpression()
  applyAmount()
}

function onKeyDown(e: KeyboardEvent) {
  if (!showCalc.value) return
  const k = e.key
  if (/^[0-9]$/.test(k)) {
    e.preventDefault()
    inputDigit(k)
    return
  }
  if (k === '.') {
    e.preventDefault()
    inputDot()
    return
  }
  if (k === 'Enter' || k === '=') {
    e.preventDefault()
    evalExpression()
    return
  }
  if (k === 'Backspace') {
    e.preventDefault()
    backspace()
    return
  }
  if (k === 'Escape') {
    e.preventDefault()
    showCalc.value = false
    return
  }
  if (k === '+' || k === '-' || k === '*' || k === '/') {
    e.preventDefault()
    appendOperator(k)
    return
  }
  if (k === '%') {
    e.preventDefault()
    appendOperator('%')
    return
  }
  if (k.toLowerCase() === 'c') {
    e.preventDefault()
    clearAll()
    return
  }
}

watch(showCalc, (v) => {
  if (v) window.addEventListener('keydown', onKeyDown)
  else window.removeEventListener('keydown', onKeyDown)
})

</script>

<style scoped>
.calculator-key:focus { outline: none; }
</style>

