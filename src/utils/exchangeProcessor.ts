/**
 * Exchange Processor Module
 * 
 * Handles retail POS exchange workflows:
 * - When new item price > returned item: Creates new sales invoice, collects difference
 * - When new item price < returned item: Creates return/credit note, processes refund
 * 
 * This module isolates exchange logic from UI components for better maintainability.
 */

import type { Sale, SaleItem } from '@/store/sales'
import type { RefundItem, RefundType } from '@/store/refunds'
// Store functions imported for typeof - needed for ReturnType<typeof useXStore>
// @ts-ignore - TS1371: importsNotUsedAsValues - typeof requires actual value
import { useSalesStore } from '@/store/sales'
// @ts-ignore - TS1371: importsNotUsedAsValues - typeof requires actual value
import { useProductsStore } from '@/store/products'
// @ts-ignore - TS1371: importsNotUsedAsValues - typeof requires actual value
import { useRefundsStore } from '@/store/refunds'
// @ts-ignore - TS1371: importsNotUsedAsValues - typeof requires actual value
import { useAuthStore } from '@/store/auth'

export type ExchangeCalculation = {
  returnValue: number
  exchangeValue: number
  difference: number
  customerPays: number
  customerReceives: number
  isEvenExchange: boolean
}

export type ExchangeResult = {
  success: boolean
  refundRecordId?: string
  newSaleInvoiceId?: string
  newSaleInvoiceNumber?: string
  returnInvoiceId?: string
  returnInvoiceNumber?: string
  difference: number
  paymentCollected?: number
  refundIssued?: number
  refundMethod?: 'cash' | 'store_credit' | 'wallet'
  message: string
}

export type ExchangeValidation = {
  valid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Calculate exchange difference and determine payment/refund requirements
 */
export function calculateExchangeDifference(
  returnedItems: RefundItem[],
  exchangedItems: RefundItem[]
): ExchangeCalculation {
  const returnValue = returnedItems.reduce((sum, item) => sum + item.lineTotal, 0)
  const exchangeValue = exchangedItems.reduce((sum, item) => sum + item.lineTotal, 0)
  const difference = returnValue - exchangeValue

  return {
    returnValue,
    exchangeValue,
    difference,
    customerPays: difference < 0 ? Math.abs(difference) : 0,
    customerReceives: difference > 0 ? difference : 0,
    isEvenExchange: difference === 0,
  }
}

/**
 * Validate exchange requirements before processing
 */
export function validateExchange(
  originalSale: Sale | null,
  returnedItems: RefundItem[],
  exchangedItems: RefundItem[],
  productsStore: ReturnType<typeof useProductsStore>
): ExchangeValidation {
  const errors: string[] = []
  const warnings: string[] = []

  // Validation 1: Original invoice must be selected
  if (!originalSale) {
    errors.push('Original invoice must be selected before processing exchange.')
    return { valid: false, errors, warnings }
  }

  // Validation 2: Must have items to return and exchange
  if (returnedItems.length === 0) {
    errors.push('Please select items to return.')
  }

  if (exchangedItems.length === 0) {
    errors.push('Please select items for exchange.')
  }

  // Validation 3: Check returned quantities don't exceed sold quantities
  const soldQuantities = new Map<number, number>()
  originalSale.items.forEach((item) => {
    soldQuantities.set(item.id, item.quantity)
  })

  for (const returnedItem of returnedItems) {
    const soldQty = soldQuantities.get(returnedItem.id) || 0
    if (returnedItem.quantity > soldQty) {
      errors.push(
        `Cannot return ${returnedItem.quantity} of "${returnedItem.name}". Only ${soldQty} were purchased.`
      )
    }
  }

  // Validation 4: Check stock availability for new items
  for (const exchangeItem of exchangedItems) {
    const product = productsStore.products.find((p) => p.id === exchangeItem.id)
    if (!product) {
      errors.push(`Product "${exchangeItem.name}" not found in inventory.`)
      continue
    }

    const availableStock = product.stock || 0
    if (exchangeItem.quantity > availableStock) {
      errors.push(
        `Insufficient stock for "${exchangeItem.name}". Available: ${availableStock}, Required: ${exchangeItem.quantity}`
      )
    }

    // Warning for low stock
    if (availableStock - exchangeItem.quantity < 3) {
      warnings.push(`Low stock warning: "${exchangeItem.name}" will have ${availableStock - exchangeItem.quantity} units remaining.`)
    }
  }

  // Validation 5: Check for expired or non-returnable items (placeholder - can be extended)
  // This would require additional product metadata like expiryDate, isReturnable, etc.

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Update stock levels for returned and exchanged items
 */
export function updateStockForExchange(
  returnedItems: RefundItem[],
  exchangedItems: RefundItem[],
  productsStore: ReturnType<typeof useProductsStore>
): void {
  // Restore stock for returned items
  returnedItems.forEach((item) => {
    const product = productsStore.products.find((p) => p.id === item.id)
    if (product) {
      productsStore.update(product.id, { stock: (product.stock || 0) + item.quantity })
    }
  })

  // Consume stock for exchanged items
  if (exchangedItems.length > 0) {
    productsStore.decrementStock(
      exchangedItems.map((item) => ({ id: item.id, quantity: item.quantity }))
    )
  }
}

/**
 * Create a new sales invoice for exchanged items
 */
export function createExchangeSaleInvoice(
  exchangedItems: RefundItem[],
  originalSale: Sale,
  paymentType: 'cash' | 'card' | 'mobile',
  salesStore: ReturnType<typeof useSalesStore>,
  authStore: ReturnType<typeof useAuthStore>
): Sale {
  const subtotal = exchangedItems.reduce((sum, item) => sum + item.lineTotal, 0)

  const saleItems: SaleItem[] = exchangedItems.map((item) => ({
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    discountMode: 'flat',
    discountValue: 0,
    lineDiscount: 0,
    lineTotal: item.lineTotal,
  }))

  return salesStore.recordSale({
    datetime: new Date().toISOString(),
    items: saleItems,
    subtotal,
    productDiscountTotal: 0,
    invoiceDiscountMode: 'flat',
    invoiceDiscountValue: 0,
    invoiceDiscountAmount: 0,
    totalDiscount: 0,
    total: subtotal,
    paymentType,
    cashier: authStore.user?.displayName || authStore.user?.username || 'Cashier',
    customerId: originalSale.customerId,
    customerName: originalSale.customerName,
  })
}

/**
 * Create a return/credit note for returned items
 */
export function createReturnInvoice(
  returnedItems: RefundItem[],
  originalSale: Sale,
  salesStore: ReturnType<typeof useSalesStore>,
  authStore: ReturnType<typeof useAuthStore>
): Sale {
  const subtotal = returnedItems.reduce((sum, item) => sum + item.lineTotal, 0)

  const saleItems: SaleItem[] = returnedItems.map((item) => ({
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    discountMode: 'flat',
    discountValue: 0,
    lineDiscount: 0,
    lineTotal: item.lineTotal,
  }))

  // Return invoice has negative total to indicate credit
  return salesStore.recordSale({
    datetime: new Date().toISOString(),
    items: saleItems,
    subtotal,
    productDiscountTotal: 0,
    invoiceDiscountMode: 'flat',
    invoiceDiscountValue: 0,
    invoiceDiscountAmount: 0,
    totalDiscount: 0,
    total: -subtotal, // Negative to indicate return
    paymentType: 'cash', // Placeholder - return invoices don't have payment type
    cashier: authStore.user?.displayName || authStore.user?.username || 'Cashier',
    customerId: originalSale.customerId,
    customerName: originalSale.customerName,
  })
}

/**
 * Process exchange: Main orchestrator function
 * 
 * Handles two scenarios:
 * 1. New item price > returned item: Creates new sale, collects difference
 * 2. New item price < returned item: Creates return note, processes refund
 */
export async function processExchange(
  originalSale: Sale,
  returnedItems: RefundItem[],
  exchangedItems: RefundItem[],
  refundReason: string | undefined,
  refundMethod: 'cash' | 'store_credit' | 'wallet',
  paymentType: 'cash' | 'card' | 'mobile',
  salesStore: ReturnType<typeof useSalesStore>,
  productsStore: ReturnType<typeof useProductsStore>,
  refundsStore: ReturnType<typeof useRefundsStore>,
  authStore: ReturnType<typeof useAuthStore>
): Promise<ExchangeResult> {
  try {
    // Step 1: Calculate exchange difference
    const calculation = calculateExchangeDifference(returnedItems, exchangedItems)

    // Step 2: Validate exchange
    const validation = validateExchange(originalSale, returnedItems, exchangedItems, productsStore)
    if (!validation.valid) {
      return {
        success: false,
        difference: calculation.difference,
        message: `Validation failed: ${validation.errors.join(' ')}`,
      }
    }

    // Step 3: Update stock
    updateStockForExchange(returnedItems, exchangedItems, productsStore)

    let newSaleInvoiceId: string | undefined
    let newSaleInvoiceNumber: string | undefined
    let returnInvoiceId: string | undefined
    let returnInvoiceNumber: string | undefined
    let paymentCollected: number | undefined
    let refundIssued: number | undefined

    // Step 4: Process based on difference
    if (calculation.difference < 0) {
      // Scenario 1: New item price > returned item
      // Customer pays the difference
      const newSale = createExchangeSaleInvoice(exchangedItems, originalSale, paymentType, salesStore, authStore)
      newSaleInvoiceId = newSale.id
      newSaleInvoiceNumber = newSale.invoiceNumber
      paymentCollected = calculation.customerPays

      // Record refund for returned items
      const refundRecord = refundsStore.recordRefund({
        saleId: originalSale.id,
        invoiceNumber: originalSale.invoiceNumber,
        refundType: 'exchange' as RefundType,
        refundReason: refundReason || 'Exchange - Customer pays difference',
        refundedItems: returnedItems,
        exchangedItems,
        totalRefund: 0, // No refund, customer pays difference
        refundMethod: 'Exchange - New Sale',
        paymentMethod: paymentType,
        exchangeDifference: calculation.difference,
        exchangeSaleId: newSale.id,
        cashier: authStore.user?.displayName || authStore.user?.username || 'Cashier',
      })

      return {
        success: true,
        refundRecordId: refundRecord?.refundId,
        newSaleInvoiceId,
        newSaleInvoiceNumber,
        difference: calculation.difference,
        paymentCollected,
        message: `Exchange complete. New invoice #${newSaleInvoiceNumber} created. Customer pays ₹${paymentCollected.toFixed(2)}.`,
      }
    } else if (calculation.difference > 0) {
      // Scenario 2: New item price < returned item
      // Customer receives refund
      const newSale = createExchangeSaleInvoice(exchangedItems, originalSale, paymentType, salesStore, authStore)
      newSaleInvoiceId = newSale.id
      newSaleInvoiceNumber = newSale.invoiceNumber

      const returnInvoice = createReturnInvoice(returnedItems, originalSale, salesStore, authStore)
      returnInvoiceId = returnInvoice.id
      returnInvoiceNumber = returnInvoice.invoiceNumber
      refundIssued = calculation.customerReceives

      // Record refund with refund method
      const refundRecord = refundsStore.recordRefund({
        saleId: originalSale.id,
        invoiceNumber: originalSale.invoiceNumber,
        refundType: 'exchange' as RefundType,
        refundReason: refundReason || `Exchange - Refund via ${refundMethod}`,
        refundedItems: returnedItems,
        exchangedItems,
        totalRefund: refundIssued,
        refundMethod: refundMethod === 'cash' ? 'Cash Refund' : refundMethod === 'store_credit' ? 'Store Credit' : 'Wallet Credit',
        paymentMethod: originalSale.paymentType,
        exchangeDifference: calculation.difference,
        exchangeSaleId: newSale.id,
        cashier: authStore.user?.displayName || authStore.user?.username || 'Cashier',
      })

      return {
        success: true,
        refundRecordId: refundRecord?.refundId,
        newSaleInvoiceId,
        newSaleInvoiceNumber,
        returnInvoiceId,
        returnInvoiceNumber,
        difference: calculation.difference,
        refundIssued,
        refundMethod,
        message: `Exchange complete. New invoice #${newSaleInvoiceNumber} created. Return note #${returnInvoiceNumber} issued. Refund ₹${refundIssued.toFixed(2)} via ${refundMethod}.`,
      }
    } else {
      // Scenario 3: Even exchange (difference = 0)
      const newSale = createExchangeSaleInvoice(exchangedItems, originalSale, paymentType, salesStore, authStore)
      newSaleInvoiceId = newSale.id
      newSaleInvoiceNumber = newSale.invoiceNumber

      const refundRecord = refundsStore.recordRefund({
        saleId: originalSale.id,
        invoiceNumber: originalSale.invoiceNumber,
        refundType: 'exchange' as RefundType,
        refundReason: refundReason || 'Even exchange - No balance due',
        refundedItems: returnedItems,
        exchangedItems,
        totalRefund: 0,
        refundMethod: 'Even Exchange',
        paymentMethod: originalSale.paymentType,
        exchangeDifference: 0,
        exchangeSaleId: newSale.id,
        cashier: authStore.user?.displayName || authStore.user?.username || 'Cashier',
      })

      return {
        success: true,
        refundRecordId: refundRecord?.refundId,
        newSaleInvoiceId,
        newSaleInvoiceNumber,
        difference: 0,
        message: `Even exchange complete. New invoice #${newSaleInvoiceNumber} created. No balance due.`,
      }
    }
  } catch (error) {
    return {
      success: false,
      difference: 0,
      message: error instanceof Error ? error.message : 'Unknown error occurred during exchange processing.',
    }
  }
}

