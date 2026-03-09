import { DB_VERSION, DEFAULT_SETTINGS, SAMPLE_PRODUCTS, SAMPLE_VARIANTS, SAMPLE_TEMPLATES, SAMPLE_SUPPLIERS, SAMPLE_CUSTOMERS, SAMPLE_INVENTORY, SAMPLE_PURCHASE_ORDERS, SAMPLE_INVOICES, SAMPLE_STOCK_MOVEMENTS } from './initialData.js'
import { uid, today } from '../utils/csv.js'

export function loadState() {
  try {
    const raw = localStorage.getItem('lfp_v4')
    if (!raw) return buildInitial()
    const saved = JSON.parse(raw)
    if (saved.settings?.dbVersion !== DB_VERSION) return buildInitial()
    return saved
  } catch { return buildInitial() }
}

function buildInitial() {
  return {
    settings: { ...DEFAULT_SETTINGS },
    products: SAMPLE_PRODUCTS,
    variants: SAMPLE_VARIANTS,
    templates: SAMPLE_TEMPLATES,
    printJobs: [],
    suppliers: SAMPLE_SUPPLIERS,
    customers: SAMPLE_CUSTOMERS,
    inventory: SAMPLE_INVENTORY,
    stockMovements: SAMPLE_STOCK_MOVEMENTS,
    purchaseOrders: SAMPLE_PURCHASE_ORDERS,
    salesInvoices: SAMPLE_INVOICES,
    auditLogs: [],
  }
}

export function saveState(state) {
  try { localStorage.setItem('lfp_v4', JSON.stringify(state)) } catch(e) { console.warn('Save failed', e) }
}

function addAudit(state, action, detail) {
  const log = { id: uid(), action, detail, timestamp: new Date().toISOString(), date: today() }
  return { ...state, auditLogs: [log, ...state.auditLogs].slice(0, 500) }
}

export function appReducer(state, action) {
  switch (action.type) {
    case 'SET_SETTINGS':
      return addAudit({ ...state, settings: { ...state.settings, ...action.payload } }, 'Settings Updated', 'System settings changed')

    case 'ADD_PRODUCT':    return addAudit({ ...state, products: [...state.products, action.payload] }, 'Product Added', action.payload.name)
    case 'UPDATE_PRODUCT': return addAudit({ ...state, products: state.products.map(p => p.id === action.payload.id ? action.payload : p) }, 'Product Updated', action.payload.name)
    case 'DELETE_PRODUCT': return addAudit({ ...state, products: state.products.filter(p => p.id !== action.payload), variants: state.variants.filter(v => v.productId !== action.payload) }, 'Product Deleted', action.payload)

    case 'ADD_VARIANT':    return { ...state, variants: [...state.variants, action.payload] }
    case 'ADD_VARIANTS':   return { ...state, variants: [...state.variants, ...action.payload] }
    case 'UPDATE_VARIANT': return { ...state, variants: state.variants.map(v => v.id === action.payload.id ? action.payload : v) }
    case 'DELETE_VARIANT': return { ...state, variants: state.variants.filter(v => v.id !== action.payload) }

    case 'ADD_TEMPLATE':    return { ...state, templates: [...state.templates, action.payload] }
    case 'UPDATE_TEMPLATE': return { ...state, templates: state.templates.map(t => t.id === action.payload.id ? action.payload : t) }
    case 'DELETE_TEMPLATE': return { ...state, templates: state.templates.filter(t => t.id !== action.payload) }

    case 'ADD_PRINT_JOB':    return { ...state, printJobs: [action.payload, ...state.printJobs] }
    case 'DELETE_PRINT_JOB': return { ...state, printJobs: state.printJobs.filter(j => j.id !== action.payload) }

    // SUPPLIERS
    case 'ADD_SUPPLIER':    return addAudit({ ...state, suppliers: [...state.suppliers, action.payload] }, 'Supplier Added', action.payload.name)
    case 'UPDATE_SUPPLIER': return addAudit({ ...state, suppliers: state.suppliers.map(s => s.id === action.payload.id ? action.payload : s) }, 'Supplier Updated', action.payload.name)
    case 'DELETE_SUPPLIER': return addAudit({ ...state, suppliers: state.suppliers.filter(s => s.id !== action.payload) }, 'Supplier Deleted', action.payload)

    // CUSTOMERS
    case 'ADD_CUSTOMER':    return addAudit({ ...state, customers: [...state.customers, action.payload] }, 'Customer Added', action.payload.name)
    case 'UPDATE_CUSTOMER': return addAudit({ ...state, customers: state.customers.map(c => c.id === action.payload.id ? action.payload : c) }, 'Customer Updated', action.payload.name)
    case 'DELETE_CUSTOMER': return addAudit({ ...state, customers: state.customers.filter(c => c.id !== action.payload) }, 'Customer Deleted', action.payload)

    // INVENTORY
    case 'SET_STOCK': {
      const exists = state.inventory.find(i => i.variantId === action.payload.variantId)
      const inv = exists
        ? state.inventory.map(i => i.variantId === action.payload.variantId ? { ...i, qty: action.payload.qty, updatedAt: today() } : i)
        : [...state.inventory, { id: uid(), ...action.payload, reservedQty: 0, location: 'Main Store', updatedAt: today() }]
      return { ...state, inventory: inv }
    }
    case 'ADJUST_STOCK': {
      const { variantId, delta, type, refType, refId, refNumber, note } = action.payload
      const inv = state.inventory.map(i => {
        if (i.variantId !== variantId) return i
        return { ...i, qty: Math.max(0, (i.qty || 0) + delta), updatedAt: today() }
      })
      const missing = !state.inventory.find(i => i.variantId === variantId)
      const finalInv = missing
        ? [...inv, { id: uid(), variantId, qty: Math.max(0, delta), reservedQty: 0, location: 'Main Store', updatedAt: today() }]
        : inv
      const movement = { id: uid(), variantId, type, qty: delta, refType, refId, refNumber, note, date: today(), createdAt: new Date().toISOString() }
      return { ...state, inventory: finalInv, stockMovements: [movement, ...state.stockMovements] }
    }

    // PURCHASE ORDERS
    case 'ADD_PURCHASE_ORDER': return addAudit({ ...state, purchaseOrders: [action.payload, ...state.purchaseOrders] }, 'PO Created', action.payload.poNumber)
    case 'UPDATE_PURCHASE_ORDER': return addAudit({ ...state, purchaseOrders: state.purchaseOrders.map(p => p.id === action.payload.id ? action.payload : p) }, 'PO Updated', action.payload.poNumber)
    case 'RECEIVE_PO': {
      const { poId, items } = action.payload
      const po = state.purchaseOrders.find(p => p.id === poId)
      let newState = { ...state, purchaseOrders: state.purchaseOrders.map(p => p.id === poId ? { ...p, status: 'received', receivedDate: today() } : p) }
      items.forEach(item => {
        newState = appReducer(newState, { type: 'ADJUST_STOCK', payload: { variantId: item.variantId, delta: item.qty, type: 'purchase', refType: 'PO', refId: poId, refNumber: po?.poNumber || '', note: 'Purchase receipt' } })
      })
      return addAudit(newState, 'PO Received', po?.poNumber)
    }

    // SALES INVOICES
    case 'ADD_INVOICE': {
      let newState = { ...state, salesInvoices: [action.payload, ...state.salesInvoices] }
      // Deduct stock for each line item
      action.payload.items.forEach(item => {
        newState = appReducer(newState, { type: 'ADJUST_STOCK', payload: { variantId: item.variantId, delta: -item.qty, type: 'sale', refType: 'INV', refId: action.payload.id, refNumber: action.payload.invoiceNumber, note: 'Sales invoice' } })
      })
      return addAudit(newState, 'Invoice Created', action.payload.invoiceNumber)
    }
    case 'UPDATE_INVOICE': return addAudit({ ...state, salesInvoices: state.salesInvoices.map(i => i.id === action.payload.id ? action.payload : i) }, 'Invoice Updated', action.payload.invoiceNumber)
    case 'DELETE_INVOICE': return addAudit({ ...state, salesInvoices: state.salesInvoices.filter(i => i.id !== action.payload) }, 'Invoice Deleted', action.payload)

    case 'RESET_ALL': return buildInitial()
    default: return state
  }
}
