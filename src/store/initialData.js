export const DB_VERSION = 4

export const DEFAULT_SETTINGS = {
  brandName: 'Hari Vastra', brandCode: 'HV', currency: '₹',
  skuFormat: '{BRAND}-{FAMILY}-{VARIANT}', defaultGst: 5,
  address: 'Jaipur, Rajasthan', phone: '', gstin: '', pan: '',
  bankName: '', bankAccount: '', bankIFSC: '',
  invoicePrefix: 'INV', poPrefix: 'PO',
  lowStockThreshold: 10,
  dbVersion: DB_VERSION,
}

export const SAMPLE_PRODUCTS = [
  { id:'p1', name:'Pearl Stone Shringar Lehenga Patka', shortName:'Shringar Patka', familyCode:'HVK034', category:'Lehenga', subcategory:'Patka', brand:'Hari Vastra', mrp:349, discountedPrice:null, gst:5, hsnCode:'62046990', description:'', status:'active', createdAt:'2025-01-15' },
  { id:'p2', name:'Royal Silk Dupatta with Zari Border', shortName:'Zari Dupatta', familyCode:'HVD012', category:'Dupatta', subcategory:'Silk', brand:'Hari Vastra', mrp:499, discountedPrice:449, gst:5, hsnCode:'62142090', description:'', status:'active', createdAt:'2025-01-20' },
  { id:'p3', name:'Cotton Printed Kurta Fabric', shortName:'Kurta Fabric', familyCode:'HVF088', category:'Fabric', subcategory:'Cotton', brand:'Hari Vastra', mrp:229, discountedPrice:null, gst:5, hsnCode:'52081200', description:'', status:'active', createdAt:'2025-02-01' },
]

export const SAMPLE_VARIANTS = [
  { id:'v1',  productId:'p1', size:'2NO', color:'', style:'', sku:'HV-HVK034-2NO', priceOverride:null, status:'active', createdAt:'2025-01-15' },
  { id:'v2',  productId:'p1', size:'3NO', color:'', style:'', sku:'HV-HVK034-3NO', priceOverride:null, status:'active', createdAt:'2025-01-15' },
  { id:'v3',  productId:'p1', size:'4NO', color:'', style:'', sku:'HV-HVK034-4NO', priceOverride:null, status:'active', createdAt:'2025-01-15' },
  { id:'v4',  productId:'p1', size:'5NO', color:'', style:'', sku:'HV-HVK034-5NO', priceOverride:null, status:'active', createdAt:'2025-01-15' },
  { id:'v5',  productId:'p1', size:'6NO', color:'', style:'', sku:'HV-HVK034-6NO', priceOverride:null, status:'active', createdAt:'2025-01-15' },
  { id:'v6',  productId:'p2', size:'FREE', color:'Red',   style:'', sku:'HV-HVD012-RED', priceOverride:null, status:'active', createdAt:'2025-01-20' },
  { id:'v7',  productId:'p2', size:'FREE', color:'Blue',  style:'', sku:'HV-HVD012-BLU', priceOverride:null, status:'active', createdAt:'2025-01-20' },
  { id:'v8',  productId:'p2', size:'FREE', color:'Green', style:'', sku:'HV-HVD012-GRN', priceOverride:449, status:'active', createdAt:'2025-01-20' },
  { id:'v9',  productId:'p3', size:'1M',   color:'Blue Print', style:'', sku:'HV-HVF088-1MB', priceOverride:null, status:'active', createdAt:'2025-02-01' },
  { id:'v10', productId:'p3', size:'2.5M', color:'Blue Print', style:'', sku:'HV-HVF088-25B', priceOverride:null, status:'active', createdAt:'2025-02-01' },
]

export const SAMPLE_TEMPLATES = [
  { id:'t1', name:'Standard Retail Label', description:'62×38mm · 3×7 per A4 page (21 labels)', pageWidthMm:210, pageHeightMm:297, marginTopMm:10, marginRightMm:8, marginBottomMm:10, marginLeftMm:10, labelWidthMm:62, labelHeightMm:38, gapXMm:3, gapYMm:3, showBrand:true, showProductName:true, showBarcode:true, showSkuText:true, showSize:true, showColor:false, showMrp:true, showDiscountedPrice:false, showCategory:false, showBorder:true, brandFontSizePt:7, nameFontSizePt:8, priceFontSizePt:11, sizeFontSizePt:8, skuFontSizePt:6, barcodeHeightMm:14, isDefault:true, createdAt:'2025-01-01' },
  { id:'t2', name:'Barcode Only Strip', description:'62×25mm · 3×10 per A4 page', pageWidthMm:210, pageHeightMm:297, marginTopMm:12, marginRightMm:8, marginBottomMm:10, marginLeftMm:8, labelWidthMm:62, labelHeightMm:25, gapXMm:3, gapYMm:3, showBrand:false, showProductName:false, showBarcode:true, showSkuText:true, showSize:true, showColor:false, showMrp:true, showDiscountedPrice:false, showCategory:false, showBorder:true, brandFontSizePt:0, nameFontSizePt:0, priceFontSizePt:9, sizeFontSizePt:8, skuFontSizePt:6, barcodeHeightMm:12, isDefault:false, createdAt:'2025-01-01' },
]

export const SAMPLE_SUPPLIERS = [
  { id:'s1', name:'Jaipur Textile Mills', contactPerson:'Ramesh Sharma', phone:'9876543210', email:'ramesh@jtm.com', address:'MI Road, Jaipur', gstin:'08AAACJ1234A1Z5', pan:'AAACJ1234A', paymentTerms:30, status:'active', notes:'Primary fabric supplier', createdAt:'2025-01-01' },
  { id:'s2', name:'Mumbai Fabric House', contactPerson:'Sunita Gupta', phone:'9123456780', email:'sunita@mfh.com', address:'Bhiwandi, Mumbai', gstin:'27AAACM5678B1Z3', pan:'AAACM5678B', paymentTerms:15, status:'active', notes:'Silk and dupatta supplier', createdAt:'2025-01-05' },
]

export const SAMPLE_CUSTOMERS = [
  { id:'c1', name:'Priya Fashion Store', contactPerson:'Priya Agarwal', phone:'9012345678', email:'priya@fashion.com', address:'Sindhi Camp, Jaipur', gstin:'08AAACPF001A1Z2', pan:'', type:'wholesale', creditLimit:50000, status:'active', createdAt:'2025-01-10' },
  { id:'c2', name:'Walk-in Customer', contactPerson:'', phone:'', email:'', address:'', gstin:'', pan:'', type:'retail', creditLimit:0, status:'active', createdAt:'2025-01-01' },
]

export const SAMPLE_INVENTORY = [
  { id:'i1',  variantId:'v1',  qty:150, reservedQty:0, location:'Main Store', updatedAt:'2025-01-15' },
  { id:'i2',  variantId:'v2',  qty:200, reservedQty:0, location:'Main Store', updatedAt:'2025-01-15' },
  { id:'i3',  variantId:'v3',  qty:180, reservedQty:0, location:'Main Store', updatedAt:'2025-01-15' },
  { id:'i4',  variantId:'v4',  qty:8,   reservedQty:0, location:'Main Store', updatedAt:'2025-01-15' },
  { id:'i5',  variantId:'v5',  qty:95,  reservedQty:0, location:'Main Store', updatedAt:'2025-01-15' },
  { id:'i6',  variantId:'v6',  qty:60,  reservedQty:0, location:'Main Store', updatedAt:'2025-01-20' },
  { id:'i7',  variantId:'v7',  qty:45,  reservedQty:0, location:'Main Store', updatedAt:'2025-01-20' },
  { id:'i8',  variantId:'v8',  qty:5,   reservedQty:0, location:'Main Store', updatedAt:'2025-01-20' },
  { id:'i9',  variantId:'v9',  qty:300, reservedQty:0, location:'Main Store', updatedAt:'2025-02-01' },
  { id:'i10', variantId:'v10', qty:250, reservedQty:0, location:'Main Store', updatedAt:'2025-02-01' },
]

export const SAMPLE_PURCHASE_ORDERS = [
  {
    id:'po1', poNumber:'PO-2025-0001', supplierId:'s1', supplierName:'Jaipur Textile Mills',
    status:'received', date:'2025-01-10', expectedDate:'2025-01-20', receivedDate:'2025-01-18',
    items:[
      { variantId:'v1', sku:'HV-HVK034-2NO', productName:'Shringar Patka 2NO', qty:200, receivedQty:200, unitCost:180, gstRate:5 },
      { variantId:'v2', sku:'HV-HVK034-3NO', productName:'Shringar Patka 3NO', qty:200, receivedQty:200, unitCost:180, gstRate:5 },
    ],
    notes:'First order of the season', subtotal:72000, totalGst:3600, grandTotal:75600, createdAt:'2025-01-10'
  },
]

export const SAMPLE_INVOICES = [
  {
    id:'inv1', invoiceNumber:'INV-2025-0001', customerId:'c1', customerName:'Priya Fashion Store',
    customerAddress:'Sindhi Camp, Jaipur', customerGstin:'08AAACPF001A1Z2',
    date:'2025-02-05', dueDate:'2025-03-05', status:'paid', paymentDate:'2025-02-10',
    interstate:false,
    items:[
      { variantId:'v1', sku:'HV-HVK034-2NO', productName:'Shringar Patka 2NO', qty:50, unitPrice:349, gstRate:5, discount:10, hsnCode:'62046990' },
      { variantId:'v6', sku:'HV-HVD012-RED', productName:'Zari Dupatta Red', qty:20, unitPrice:499, gstRate:5, discount:0, hsnCode:'62142090' },
    ],
    subtotal:27420, totalDiscount:1745, taxable:25675, totalGst:1284, grandTotal:26959,
    notes:'', createdAt:'2025-02-05'
  },
]

export const SAMPLE_STOCK_MOVEMENTS = [
  { id:'sm1', variantId:'v1', type:'purchase', qty:200, refType:'PO', refId:'po1', refNumber:'PO-2025-0001', note:'Purchase receipt', date:'2025-01-18', createdAt:'2025-01-18' },
  { id:'sm2', variantId:'v2', type:'purchase', qty:200, refType:'PO', refId:'po1', refNumber:'PO-2025-0001', note:'Purchase receipt', date:'2025-01-18', createdAt:'2025-01-18' },
  { id:'sm3', variantId:'v1', type:'sale',     qty:-50, refType:'INV', refId:'inv1', refNumber:'INV-2025-0001', note:'Sales invoice', date:'2025-02-05', createdAt:'2025-02-05' },
  { id:'sm4', variantId:'v6', type:'sale',     qty:-20, refType:'INV', refId:'inv1', refNumber:'INV-2025-0001', note:'Sales invoice', date:'2025-02-05', createdAt:'2025-02-05' },
]
