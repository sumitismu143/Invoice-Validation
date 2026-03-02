// ============================================================
// DUMMY DATA: Purchase Orders, Contracts, and Invoices
// 6 scenarios covering: perfect match, price deviation,
// quantity deviation, both deviations, missing PO, tax mismatch
// ============================================================

const TOLERANCE = {
  price: 2,      // 2% price tolerance
  quantity: 5,   // 5% quantity tolerance
  tax: 0.5       // 0.5% tax tolerance
};

// ---- VENDORS ----
const VENDORS = {
  "V001": { name: "Rajesh Steel & Alloys Pvt. Ltd.", gstin: "27AABCR1234A1Z5", state: "Maharashtra" },
  "V002": { name: "Kumar Logistics Solutions", gstin: "29BBFKL5678B2Z3", state: "Karnataka" },
  "V003": { name: "Patel Industrial Supplies", gstin: "24CDEPQ9012C3Z7", state: "Gujarat" },
  "V004": { name: "Singh Transport & Freight Co.", gstin: "07GHIST3456D4Z1", state: "Delhi" },
  "V005": { name: "Gupta Packaging Materials", gstin: "09JKLMN7890E5Z9", state: "Uttar Pradesh" },
  "V006": { name: "Sharma Electrical Components", gstin: "33OPQRS2345F6Z2", state: "Tamil Nadu" }
};

// ---- CONTRACTS ----
const CONTRACTS = {
  "CON-2025-001": {
    id: "CON-2025-001",
    vendorId: "V001",
    vendorName: "Rajesh Steel & Alloys Pvt. Ltd.",
    startDate: "2025-01-01",
    endDate: "2025-12-31",
    items: [
      { code: "STL-001", description: "MS Round Bar 12mm", unitPrice: 4850, unit: "MT", minQty: 10, maxQty: 500 },
      { code: "STL-002", description: "SS Flat Bar 25mm", unitPrice: 12200, unit: "MT", minQty: 5, maxQty: 200 },
      { code: "STL-003", description: "GI Pipe 2 inch", unitPrice: 385, unit: "Pcs", minQty: 100, maxQty: 5000 }
    ],
    paymentTerms: "Net 30",
    gstRate: 18
  },
  "CON-2025-002": {
    id: "CON-2025-002",
    vendorId: "V002",
    vendorName: "Kumar Logistics Solutions",
    startDate: "2025-01-01",
    endDate: "2025-12-31",
    items: [
      { code: "LOG-001", description: "Full Truck Load - Intra-State", unitPrice: 28000, unit: "Trip", minQty: 1, maxQty: 100 },
      { code: "LOG-002", description: "Part Truck Load - Intra-State", unitPrice: 14500, unit: "Trip", minQty: 1, maxQty: 200 },
      { code: "LOG-003", description: "Warehouse Handling Charges", unitPrice: 3.50, unit: "Kg", minQty: 500, maxQty: 50000 }
    ],
    paymentTerms: "Net 15",
    gstRate: 18
  },
  "CON-2025-003": {
    id: "CON-2025-003",
    vendorId: "V003",
    vendorName: "Patel Industrial Supplies",
    startDate: "2025-02-01",
    endDate: "2026-01-31",
    items: [
      { code: "IND-001", description: "Safety Helmets ISI Mark", unitPrice: 420, unit: "Pcs", minQty: 50, maxQty: 2000 },
      { code: "IND-002", description: "Industrial Gloves (Pair)", unitPrice: 185, unit: "Pair", minQty: 100, maxQty: 5000 },
      { code: "IND-003", description: "Safety Goggles", unitPrice: 310, unit: "Pcs", minQty: 50, maxQty: 1000 }
    ],
    paymentTerms: "Net 30",
    gstRate: 12
  },
  "CON-2025-004": {
    id: "CON-2025-004",
    vendorId: "V004",
    vendorName: "Singh Transport & Freight Co.",
    startDate: "2025-03-01",
    endDate: "2026-02-28",
    items: [
      { code: "FRT-001", description: "Inter-State Freight 20ft Container", unitPrice: 45000, unit: "Container", minQty: 1, maxQty: 50 },
      { code: "FRT-002", description: "Local Delivery (within 50km)", unitPrice: 3500, unit: "Trip", minQty: 1, maxQty: 300 },
      { code: "FRT-003", description: "Loading/Unloading Labor", unitPrice: 12, unit: "Kg", minQty: 100, maxQty: 20000 }
    ],
    paymentTerms: "Net 45",
    gstRate: 18
  },
  "CON-2025-005": {
    id: "CON-2025-005",
    vendorId: "V005",
    vendorName: "Gupta Packaging Materials",
    startDate: "2025-01-15",
    endDate: "2025-12-31",
    items: [
      { code: "PKG-001", description: "Corrugated Box 18x12x10", unitPrice: 42, unit: "Pcs", minQty: 500, maxQty: 20000 },
      { code: "PKG-002", description: "Bubble Wrap Roll 1m x 100m", unitPrice: 1850, unit: "Roll", minQty: 10, maxQty: 500 },
      { code: "PKG-003", description: "Stretch Film 18 inch", unitPrice: 680, unit: "Roll", minQty: 20, maxQty: 1000 }
    ],
    paymentTerms: "Net 30",
    gstRate: 18
  },
  "CON-2025-006": {
    id: "CON-2025-006",
    vendorId: "V006",
    vendorName: "Sharma Electrical Components",
    startDate: "2025-04-01",
    endDate: "2026-03-31",
    items: [
      { code: "ELC-001", description: "MCB 32A Single Pole", unitPrice: 245, unit: "Pcs", minQty: 20, maxQty: 1000 },
      { code: "ELC-002", description: "Copper Wire 4 sq mm (90m)", unitPrice: 4800, unit: "Coil", minQty: 5, maxQty: 200 },
      { code: "ELC-003", description: "LED Panel Light 40W", unitPrice: 1150, unit: "Pcs", minQty: 10, maxQty: 500 }
    ],
    paymentTerms: "Net 30",
    gstRate: 18
  }
};

// ---- PURCHASE ORDERS ----
const PURCHASE_ORDERS = {
  "PO-2025-1001": {
    id: "PO-2025-1001",
    contractId: "CON-2025-001",
    vendorId: "V001",
    vendorName: "Rajesh Steel & Alloys Pvt. Ltd.",
    date: "2025-07-10",
    deliveryDate: "2025-07-25",
    items: [
      { code: "STL-001", description: "MS Round Bar 12mm", quantity: 50, unitPrice: 4850, unit: "MT", amount: 242500 },
      { code: "STL-003", description: "GI Pipe 2 inch", quantity: 500, unitPrice: 385, unit: "Pcs", amount: 192500 }
    ],
    subtotal: 435000,
    gstRate: 18,
    gstAmount: 78300,
    total: 513300,
    status: "Approved"
  },
  "PO-2025-1002": {
    id: "PO-2025-1002",
    contractId: "CON-2025-002",
    vendorId: "V002",
    vendorName: "Kumar Logistics Solutions",
    date: "2025-08-01",
    deliveryDate: "2025-08-15",
    items: [
      { code: "LOG-001", description: "Full Truck Load - Intra-State", quantity: 12, unitPrice: 28000, unit: "Trip", amount: 336000 },
      { code: "LOG-003", description: "Warehouse Handling Charges", quantity: 8000, unitPrice: 3.50, unit: "Kg", amount: 28000 }
    ],
    subtotal: 364000,
    gstRate: 18,
    gstAmount: 65520,
    total: 429520,
    status: "Approved"
  },
  "PO-2025-1003": {
    id: "PO-2025-1003",
    contractId: "CON-2025-003",
    vendorId: "V003",
    vendorName: "Patel Industrial Supplies",
    date: "2025-07-20",
    deliveryDate: "2025-08-05",
    items: [
      { code: "IND-001", description: "Safety Helmets ISI Mark", quantity: 200, unitPrice: 420, unit: "Pcs", amount: 84000 },
      { code: "IND-002", description: "Industrial Gloves (Pair)", quantity: 500, unitPrice: 185, unit: "Pair", amount: 92500 },
      { code: "IND-003", description: "Safety Goggles", quantity: 150, unitPrice: 310, unit: "Pcs", amount: 46500 }
    ],
    subtotal: 223000,
    gstRate: 12,
    gstAmount: 26760,
    total: 249760,
    status: "Approved"
  },
  "PO-2025-1004": {
    id: "PO-2025-1004",
    contractId: "CON-2025-004",
    vendorId: "V004",
    vendorName: "Singh Transport & Freight Co.",
    date: "2025-08-05",
    deliveryDate: "2025-08-20",
    items: [
      { code: "FRT-001", description: "Inter-State Freight 20ft Container", quantity: 8, unitPrice: 45000, unit: "Container", amount: 360000 },
      { code: "FRT-002", description: "Local Delivery (within 50km)", quantity: 25, unitPrice: 3500, unit: "Trip", amount: 87500 }
    ],
    subtotal: 447500,
    gstRate: 18,
    gstAmount: 80550,
    total: 528050,
    status: "Approved"
  },
  "PO-2025-1005": {
    id: "PO-2025-1005",
    contractId: "CON-2025-005",
    vendorId: "V005",
    vendorName: "Gupta Packaging Materials",
    date: "2025-07-15",
    deliveryDate: "2025-07-30",
    items: [
      { code: "PKG-001", description: "Corrugated Box 18x12x10", quantity: 5000, unitPrice: 42, unit: "Pcs", amount: 210000 },
      { code: "PKG-002", description: "Bubble Wrap Roll 1m x 100m", quantity: 30, unitPrice: 1850, unit: "Roll", amount: 55500 },
      { code: "PKG-003", description: "Stretch Film 18 inch", quantity: 50, unitPrice: 680, unit: "Roll", amount: 34000 }
    ],
    subtotal: 299500,
    gstRate: 18,
    gstAmount: 53910,
    total: 353410,
    status: "Approved"
  },
  "PO-2025-1006": {
    id: "PO-2025-1006",
    contractId: "CON-2025-006",
    vendorId: "V006",
    vendorName: "Sharma Electrical Components",
    date: "2025-08-10",
    deliveryDate: "2025-08-25",
    items: [
      { code: "ELC-001", description: "MCB 32A Single Pole", quantity: 100, unitPrice: 245, unit: "Pcs", amount: 24500 },
      { code: "ELC-002", description: "Copper Wire 4 sq mm (90m)", quantity: 20, unitPrice: 4800, unit: "Coil", amount: 96000 },
      { code: "ELC-003", description: "LED Panel Light 40W", quantity: 50, unitPrice: 1150, unit: "Pcs", amount: 57500 }
    ],
    subtotal: 178000,
    gstRate: 18,
    gstAmount: 32040,
    total: 210040,
    status: "Approved"
  }
};

// ---- INVOICES (what the demo user will "upload") ----
// Scenario 1: Perfect match
// Scenario 2: Price deviation on one item
// Scenario 3: Quantity deviation
// Scenario 4: Both price + quantity deviation
// Scenario 5: Tax rate mismatch
// Scenario 6: Perfect match (second clean case)

const INVOICES = {
  "INV-RS-2025-0451": {
    id: "INV-RS-2025-0451",
    poId: "PO-2025-1001",
    vendorId: "V001",
    vendorName: "Rajesh Steel & Alloys Pvt. Ltd.",
    vendorGstin: "27AABCR1234A1Z5",
    invoiceDate: "2025-07-26",
    dueDate: "2025-08-25",
    items: [
      { code: "STL-001", description: "MS Round Bar 12mm", quantity: 50, unitPrice: 4850, unit: "MT", amount: 242500 },
      { code: "STL-003", description: "GI Pipe 2 inch", quantity: 500, unitPrice: 385, unit: "Pcs", amount: 192500 }
    ],
    subtotal: 435000,
    gstRate: 18,
    cgst: 39150,
    sgst: 39150,
    total: 513300,
    scenario: "perfect_match"
  },
  "INV-KL-2025-0872": {
    id: "INV-KL-2025-0872",
    poId: "PO-2025-1002",
    vendorId: "V002",
    vendorName: "Kumar Logistics Solutions",
    vendorGstin: "29BBFKL5678B2Z3",
    invoiceDate: "2025-08-16",
    dueDate: "2025-08-31",
    items: [
      { code: "LOG-001", description: "Full Truck Load - Intra-State", quantity: 12, unitPrice: 29500, unit: "Trip", amount: 354000 },
      { code: "LOG-003", description: "Warehouse Handling Charges", quantity: 8000, unitPrice: 3.50, unit: "Kg", amount: 28000 }
    ],
    subtotal: 382000,
    gstRate: 18,
    cgst: 34380,
    sgst: 34380,
    total: 450760,
    scenario: "price_deviation"
  },
  "INV-PI-2025-0334": {
    id: "INV-PI-2025-0334",
    poId: "PO-2025-1003",
    vendorId: "V003",
    vendorName: "Patel Industrial Supplies",
    vendorGstin: "24CDEPQ9012C3Z7",
    invoiceDate: "2025-08-06",
    dueDate: "2025-09-05",
    items: [
      { code: "IND-001", description: "Safety Helmets ISI Mark", quantity: 220, unitPrice: 420, unit: "Pcs", amount: 92400 },
      { code: "IND-002", description: "Industrial Gloves (Pair)", quantity: 540, unitPrice: 185, unit: "Pair", amount: 99900 },
      { code: "IND-003", description: "Safety Goggles", quantity: 150, unitPrice: 310, unit: "Pcs", amount: 46500 }
    ],
    subtotal: 238800,
    gstRate: 12,
    cgst: 14328,
    sgst: 14328,
    total: 267456,
    scenario: "quantity_deviation"
  },
  "INV-ST-2025-0567": {
    id: "INV-ST-2025-0567",
    poId: "PO-2025-1004",
    vendorId: "V004",
    vendorName: "Singh Transport & Freight Co.",
    vendorGstin: "07GHIST3456D4Z1",
    invoiceDate: "2025-08-21",
    dueDate: "2025-10-05",
    items: [
      { code: "FRT-001", description: "Inter-State Freight 20ft Container", quantity: 10, unitPrice: 47500, unit: "Container", amount: 475000 },
      { code: "FRT-002", description: "Local Delivery (within 50km)", quantity: 25, unitPrice: 3500, unit: "Trip", amount: 87500 }
    ],
    subtotal: 562500,
    gstRate: 18,
    cgst: 50625,
    sgst: 50625,
    total: 663750,
    scenario: "price_and_quantity_deviation"
  },
  "INV-GP-2025-0789": {
    id: "INV-GP-2025-0789",
    poId: "PO-2025-1005",
    vendorId: "V005",
    vendorName: "Gupta Packaging Materials",
    vendorGstin: "09JKLMN7890E5Z9",
    invoiceDate: "2025-07-31",
    dueDate: "2025-08-30",
    items: [
      { code: "PKG-001", description: "Corrugated Box 18x12x10", quantity: 5000, unitPrice: 42, unit: "Pcs", amount: 210000 },
      { code: "PKG-002", description: "Bubble Wrap Roll 1m x 100m", quantity: 30, unitPrice: 1850, unit: "Roll", amount: 55500 },
      { code: "PKG-003", description: "Stretch Film 18 inch", quantity: 50, unitPrice: 680, unit: "Roll", amount: 34000 }
    ],
    subtotal: 299500,
    gstRate: 28,
    cgst: 41930,
    sgst: 41930,
    total: 383360,
    scenario: "tax_mismatch"
  },
  "INV-SE-2025-0923": {
    id: "INV-SE-2025-0923",
    poId: "PO-2025-1006",
    vendorId: "V006",
    vendorName: "Sharma Electrical Components",
    vendorGstin: "33OPQRS2345F6Z2",
    invoiceDate: "2025-08-26",
    dueDate: "2025-09-25",
    items: [
      { code: "ELC-001", description: "MCB 32A Single Pole", quantity: 100, unitPrice: 245, unit: "Pcs", amount: 24500 },
      { code: "ELC-002", description: "Copper Wire 4 sq mm (90m)", quantity: 20, unitPrice: 4800, unit: "Coil", amount: 96000 },
      { code: "ELC-003", description: "LED Panel Light 40W", quantity: 50, unitPrice: 1150, unit: "Pcs", amount: 57500 }
    ],
    subtotal: 178000,
    gstRate: 18,
    cgst: 16020,
    sgst: 16020,
    total: 210040,
    scenario: "perfect_match"
  }
};
