// ============================================================
// AI CHAT ENGINE — Answers questions about POs, Contracts, Invoices
// Uses keyword matching + data lookups to simulate AI responses
// ============================================================

class ChatEngine {
  constructor(options = {}) {
    this.context = []; // conversation history
    this.apiBaseUrl = options.apiBaseUrl || '';
    this.ingestedDocuments = [];
  }

  setIngestedDocuments(documents = []) {
    this.ingestedDocuments = Array.isArray(documents) ? documents : [];
  }

  buildKnowledgeContext(runtimeContext = {}) {
    const processedInvoices = Array.isArray(runtimeContext.processedInvoices)
      ? runtimeContext.processedInvoices
      : [];

    const poLines = Object.values(PURCHASE_ORDERS).map(po =>
      `${po.id} | ${po.vendorName} | Total: Rs.${po.total} | Contract: ${po.contractId}`
    );
    const contractLines = Object.values(CONTRACTS).map(c =>
      `${c.id} | ${c.vendorName} | Period: ${c.startDate} to ${c.endDate} | GST: ${c.gstRate}%`
    );
    const invoiceLines = Object.values(INVOICES).map(inv =>
      `${inv.id} | ${inv.vendorName} | PO: ${inv.poId} | Total: Rs.${inv.total} | GST: ${inv.gstRate}%`
    );

    const processedLines = processedInvoices.map(r =>
      `${r.invoiceId} | Status: ${r.overallStatus} | Deviation: Rs.${Math.abs(r.summary.totalDeviation || 0)} | Issues: ${r.deviations.length}`
    );

    const docLines = this.ingestedDocuments.slice(0, 30).map(doc => {
      const excerpt = (doc.excerpt || '').slice(0, 350);
      return `${doc.fileName} (${doc.type}, ${doc.size} bytes)\nExcerpt: ${excerpt || 'No text extracted.'}`;
    });

    return [
      `Tolerance Rules: Price ±${TOLERANCE.price}%, Quantity ±${TOLERANCE.quantity}%, Tax ±${TOLERANCE.tax}%`,
      `Purchase Orders:\n${poLines.join('\n')}`,
      `Contracts:\n${contractLines.join('\n')}`,
      `Invoices:\n${invoiceLines.join('\n')}`,
      processedLines.length ? `Processed Validation Results:\n${processedLines.join('\n')}` : 'Processed Validation Results: None yet.',
      docLines.length ? `Ingested ZIP Documents:\n${docLines.join('\n\n')}` : 'Ingested ZIP Documents: None uploaded yet.'
    ].join('\n\n');
  }

  async respondWithAI(query, runtimeContext = {}) {
    this.context.push({ role: 'user', text: query });

    try {
      const response = await fetch(`${this.apiBaseUrl}/api/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: query,
          history: this.context.slice(-8),
          knowledgeContext: this.buildKnowledgeContext(runtimeContext)
        })
      });

      if (!response.ok) {
        throw new Error(`AI endpoint error ${response.status}`);
      }

      const payload = await response.json();
      const answer = payload.answer || '';
      if (!answer.trim()) {
        throw new Error('AI returned empty answer.');
      }

      this.context.push({ role: 'bot', text: answer });
      return answer.replace(/\n/g, '<br>');
    } catch (error) {
      const fallback = this.respond(query, { skipContext: true });
      this.context.push({ role: 'bot', text: fallback });
      return `${fallback}<br><br><small style="color:#6B7280">(AI unavailable, showing rule-based response.)</small>`;
    }
  }

  respond(query, options = {}) {
    const q = query.toLowerCase().trim();
    const shouldTrack = !options.skipContext;
    if (shouldTrack) {
      this.context.push({ role: 'user', text: query });
    }

    let response = '';

    // ---- ROUTE: List all POs ----
    if (this.matches(q, ['show all po', 'list po', 'all purchase order', 'show po', 'what po', 'how many po'])) {
      response = this.listAllPOs();
    }
    // ---- ROUTE: List all Contracts ----
    else if (this.matches(q, ['show all contract', 'list contract', 'what contract', 'how many contract'])) {
      response = this.listAllContracts();
    }
    // ---- ROUTE: List all Invoices ----
    else if (this.matches(q, ['show all invoice', 'list invoice', 'what invoice', 'how many invoice'])) {
      response = this.listAllInvoices();
    }
    // ---- ROUTE: Show deviations ----
    else if (this.matches(q, ['deviation', 'mismatch', 'discrepancy', 'issue', 'problem', 'error', 'flag'])) {
      response = this.showDeviations(q);
    }
    // ---- ROUTE: Compare invoice vs PO ----
    else if (this.matches(q, ['compare', 'vs', 'versus', 'match', 'difference between'])) {
      response = this.compareInvoicePO(q);
    }
    // ---- ROUTE: Specific PO lookup ----
    else if (q.match(/po[-\s]?2025[-\s]?\d{4}/i)) {
      const poId = this.extractPOId(q);
      response = poId ? this.getPODetails(poId) : 'I couldn\'t find that PO number. Try something like PO-2025-1001.';
    }
    // ---- ROUTE: Specific Contract lookup ----
    else if (q.match(/con[-\s]?2025[-\s]?\d{3}/i)) {
      const conId = this.extractContractId(q);
      response = conId ? this.getContractDetails(conId) : 'I couldn\'t find that contract. Try CON-2025-001.';
    }
    // ---- ROUTE: Specific Invoice lookup ----
    else if (q.match(/inv[-\s]/i) || this.matches(q, ['invoice'])) {
      const invId = this.extractInvoiceId(q);
      if (invId) {
        response = this.getInvoiceDetails(invId);
      } else {
        // Try vendor name
        response = this.findByVendor(q) || this.listAllInvoices();
      }
    }
    // ---- ROUTE: Vendor lookup ----
    else if (this.matchesVendor(q)) {
      response = this.findByVendor(q);
    }
    // ---- ROUTE: Tolerance / rules ----
    else if (this.matches(q, ['tolerance', 'rule', 'threshold', 'limit', 'policy'])) {
      response = this.showToleranceRules();
    }
    // ---- ROUTE: Total / amount ----
    else if (this.matches(q, ['total', 'amount', 'value', 'worth', 'cost', 'how much', 'payment'])) {
      response = this.handleAmountQuery(q);
    }
    // ---- ROUTE: GST / tax ----
    else if (this.matches(q, ['gst', 'tax', 'cgst', 'sgst'])) {
      response = this.handleTaxQuery(q);
    }
    // ---- ROUTE: Help ----
    else if (this.matches(q, ['help', 'what can you', 'how to', 'capability'])) {
      response = this.showHelp();
    }
    // ---- FALLBACK ----
    else {
      response = this.smartFallback(q);
    }

    if (shouldTrack) {
      this.context.push({ role: 'bot', text: response });
    }
    return response;
  }

  // ---- MATCHERS ----
  matches(q, keywords) {
    return keywords.some(k => q.includes(k));
  }

  matchesVendor(q) {
    const vendorNames = ['rajesh', 'steel', 'kumar', 'logistics', 'patel', 'industrial', 'singh', 'transport', 'gupta', 'packaging', 'sharma', 'electrical'];
    return vendorNames.some(v => q.includes(v));
  }

  extractPOId(q) {
    const match = q.match(/po[-\s]?2025[-\s]?(\d{4})/i);
    if (match) {
      const id = `PO-2025-${match[1]}`;
      return PURCHASE_ORDERS[id] ? id : null;
    }
    return null;
  }

  extractContractId(q) {
    const match = q.match(/con[-\s]?2025[-\s]?(\d{3})/i);
    if (match) {
      const id = `CON-2025-${match[1]}`;
      return CONTRACTS[id] ? id : null;
    }
    return null;
  }

  extractInvoiceId(q) {
    const match = q.match(/inv[-\s]?[a-z]{2}[-\s]?2025[-\s]?\d{4}/i);
    if (match) {
      const raw = match[0].toUpperCase().replace(/\s/g, '-');
      // Normalize to proper format
      for (const id of Object.keys(INVOICES)) {
        if (raw.replace(/-/g, '').includes(id.replace(/-/g, ''))) return id;
      }
      // Try fuzzy
      for (const id of Object.keys(INVOICES)) {
        if (id.includes(raw) || raw.includes(id.substring(0,6))) return id;
      }
    }
    return null;
  }

  // ---- RESPONSES ----
  listAllPOs() {
    let html = `<strong>All Purchase Orders (${Object.keys(PURCHASE_ORDERS).length}):</strong><br><br>`;
    html += '<table class="chat-table"><tr><th>PO #</th><th>Vendor</th><th>Total</th><th>Date</th></tr>';
    Object.values(PURCHASE_ORDERS).forEach(po => {
      html += `<tr><td><strong>${po.id}</strong></td><td>${po.vendorName}</td><td>Rs.${po.total.toLocaleString('en-IN')}</td><td>${po.date}</td></tr>`;
    });
    html += '</table>';
    const grandTotal = Object.values(PURCHASE_ORDERS).reduce((s, p) => s + p.total, 0);
    html += `<br><strong>Combined PO Value: Rs.${grandTotal.toLocaleString('en-IN')}</strong>`;
    return html;
  }

  listAllContracts() {
    let html = `<strong>All Active Contracts (${Object.keys(CONTRACTS).length}):</strong><br><br>`;
    html += '<table class="chat-table"><tr><th>Contract #</th><th>Vendor</th><th>Period</th><th>GST</th></tr>';
    Object.values(CONTRACTS).forEach(c => {
      html += `<tr><td><strong>${c.id}</strong></td><td>${c.vendorName}</td><td>${c.startDate} to ${c.endDate}</td><td>${c.gstRate}%</td></tr>`;
    });
    html += '</table>';
    return html;
  }

  listAllInvoices() {
    let html = `<strong>All Invoices in System (${Object.keys(INVOICES).length}):</strong><br><br>`;
    html += '<table class="chat-table"><tr><th>Invoice #</th><th>Vendor</th><th>PO Ref</th><th>Total</th><th>Type</th></tr>';
    Object.values(INVOICES).forEach(inv => {
      const scenario = inv.scenario === 'perfect_match' ? '✅ Match' :
                       inv.scenario === 'price_deviation' ? '🔴 Price' :
                       inv.scenario === 'quantity_deviation' ? '🟡 Qty' :
                       inv.scenario === 'price_and_quantity_deviation' ? '🔴 Price+Qty' :
                       inv.scenario === 'tax_mismatch' ? '🟠 Tax' : inv.scenario;
      html += `<tr><td><strong>${inv.id}</strong></td><td>${inv.vendorName}</td><td>${inv.poId}</td><td>Rs.${inv.total.toLocaleString('en-IN')}</td><td>${scenario}</td></tr>`;
    });
    html += '</table>';
    return html;
  }

  showDeviations(q) {
    const engine = new MatchingEngine(TOLERANCE);
    let deviationInvoices = [];

    // Check if asking about a specific vendor/invoice
    const vendorMatch = this.findVendorInQuery(q);
    const invId = this.extractInvoiceId(q);

    if (invId) {
      const inv = INVOICES[invId];
      const report = engine.validate(inv);
      if (report.deviations.length === 0) {
        return `<strong>${invId}</strong> from ${inv.vendorName} has <span style="color:#059669"><strong>no deviations</strong></span>. It's a perfect match! ✅`;
      }
      return this.formatDeviationReport(report);
    }

    // Show all deviations
    let html = '<strong>Deviation Summary Across All Invoices:</strong><br><br>';
    let hasAny = false;

    Object.values(INVOICES).forEach(inv => {
      const report = engine.validate(inv);
      if (report.deviations.length > 0) {
        hasAny = true;
        html += this.formatDeviationReport(report) + '<br>';
      }
    });

    if (!hasAny) html += '✅ No deviations found in any invoice!';
    return html;
  }

  formatDeviationReport(report) {
    let html = `<div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:12px;margin-bottom:8px">`;
    html += `<strong style="color:#DC2626">⚠️ ${report.invoiceId}</strong> — ${report.vendorName}<br>`;
    html += `<small>PO: ${report.poId} | Invoice Total: Rs.${report.summary.invoiceTotal?.toLocaleString('en-IN')} vs PO Total: Rs.${report.summary.poTotal?.toLocaleString('en-IN')}</small><br>`;
    html += '<ul style="margin:6px 0 0 16px;padding:0">';
    report.deviations.forEach(d => {
      html += `<li style="font-size:13px;margin:2px 0">${d.message}</li>`;
    });
    html += '</ul></div>';
    return html;
  }

  compareInvoicePO(q) {
    const invId = this.extractInvoiceId(q);
    const vendorMatch = this.findVendorInQuery(q);

    let invoice = null;
    if (invId) {
      invoice = INVOICES[invId];
    } else if (vendorMatch) {
      invoice = Object.values(INVOICES).find(i => i.vendorId === vendorMatch);
    }

    if (!invoice) {
      return 'Please specify which invoice to compare. For example: <em>"Compare INV-KL-2025-0872 with its PO"</em>';
    }

    const po = PURCHASE_ORDERS[invoice.poId];
    const contract = CONTRACTS[po.contractId];

    let html = `<strong>3-Way Comparison for ${invoice.id}</strong><br><br>`;
    html += '<table class="chat-table"><tr><th>Field</th><th>Invoice</th><th>PO</th><th>Contract</th></tr>';

    html += `<tr><td>Vendor</td><td>${invoice.vendorName}</td><td>${po.vendorName}</td><td>${contract.vendorName}</td></tr>`;
    html += `<tr><td>Subtotal</td><td>Rs.${invoice.subtotal.toLocaleString('en-IN')}</td><td>Rs.${po.subtotal.toLocaleString('en-IN')}</td><td>—</td></tr>`;
    html += `<tr><td>GST Rate</td><td>${invoice.gstRate}%</td><td>${po.gstRate}%</td><td>${contract.gstRate}%</td></tr>`;
    html += `<tr><td><strong>Total</strong></td><td><strong>Rs.${invoice.total.toLocaleString('en-IN')}</strong></td><td><strong>Rs.${po.total.toLocaleString('en-IN')}</strong></td><td>—</td></tr>`;

    html += '</table><br><strong>Line Items:</strong><br>';
    html += '<table class="chat-table"><tr><th>Item</th><th>Inv Qty</th><th>PO Qty</th><th>Inv Rate</th><th>PO Rate</th><th>Contract Rate</th></tr>';

    invoice.items.forEach(invItem => {
      const poItem = po.items.find(p => p.code === invItem.code);
      const cItem = contract.items.find(c => c.code === invItem.code);
      const priceDev = poItem ? ((invItem.unitPrice - poItem.unitPrice) / poItem.unitPrice * 100) : 0;
      const qtyDev = poItem ? ((invItem.quantity - poItem.quantity) / poItem.quantity * 100) : 0;

      const priceColor = Math.abs(priceDev) > 2 ? 'color:#DC2626;font-weight:700' : 'color:#059669';
      const qtyColor = Math.abs(qtyDev) > 5 ? 'color:#DC2626;font-weight:700' : 'color:#059669';

      html += `<tr>
        <td>${invItem.code}</td>
        <td style="${qtyColor}">${invItem.quantity}</td>
        <td>${poItem ? poItem.quantity : '—'}</td>
        <td style="${priceColor}">Rs.${invItem.unitPrice.toLocaleString('en-IN')}</td>
        <td>${poItem ? 'Rs.' + poItem.unitPrice.toLocaleString('en-IN') : '—'}</td>
        <td>${cItem ? 'Rs.' + cItem.unitPrice.toLocaleString('en-IN') : '—'}</td>
      </tr>`;
    });
    html += '</table>';

    const totalDev = invoice.total - po.total;
    if (totalDev !== 0) {
      html += `<br><div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:6px;padding:8px;color:#DC2626"><strong>Total Deviation: Rs.${totalDev.toLocaleString('en-IN')} (${((totalDev/po.total)*100).toFixed(1)}%)</strong></div>`;
    } else {
      html += `<br><div style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:6px;padding:8px;color:#059669"><strong>✅ Perfect match — no deviations!</strong></div>`;
    }

    return html;
  }

  getPODetails(poId) {
    const po = PURCHASE_ORDERS[poId];
    let html = `<strong>Purchase Order: ${po.id}</strong><br><br>`;
    html += `<strong>Vendor:</strong> ${po.vendorName}<br>`;
    html += `<strong>Contract:</strong> ${po.contractId}<br>`;
    html += `<strong>PO Date:</strong> ${po.date}<br>`;
    html += `<strong>Delivery Date:</strong> ${po.deliveryDate}<br>`;
    html += `<strong>Status:</strong> ${po.status}<br><br>`;

    html += '<table class="chat-table"><tr><th>Item</th><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr>';
    po.items.forEach(item => {
      html += `<tr><td><strong>${item.code}</strong></td><td>${item.description}</td><td>${item.quantity} ${item.unit}</td><td>Rs.${item.unitPrice.toLocaleString('en-IN')}</td><td>Rs.${item.amount.toLocaleString('en-IN')}</td></tr>`;
    });
    html += '</table>';

    html += `<br><strong>Subtotal:</strong> Rs.${po.subtotal.toLocaleString('en-IN')}<br>`;
    html += `<strong>GST (${po.gstRate}%):</strong> Rs.${po.gstAmount.toLocaleString('en-IN')}<br>`;
    html += `<strong>Grand Total: Rs.${po.total.toLocaleString('en-IN')}</strong>`;
    return html;
  }

  getContractDetails(conId) {
    const c = CONTRACTS[conId];
    let html = `<strong>Contract: ${c.id}</strong><br><br>`;
    html += `<strong>Vendor:</strong> ${c.vendorName}<br>`;
    html += `<strong>Period:</strong> ${c.startDate} to ${c.endDate}<br>`;
    html += `<strong>Payment:</strong> ${c.paymentTerms}<br>`;
    html += `<strong>GST Rate:</strong> ${c.gstRate}%<br><br>`;

    html += '<table class="chat-table"><tr><th>Item</th><th>Description</th><th>Unit Price</th><th>Unit</th><th>Min Qty</th><th>Max Qty</th></tr>';
    c.items.forEach(item => {
      html += `<tr><td><strong>${item.code}</strong></td><td>${item.description}</td><td>Rs.${item.unitPrice.toLocaleString('en-IN')}</td><td>${item.unit}</td><td>${item.minQty}</td><td>${item.maxQty}</td></tr>`;
    });
    html += '</table>';
    return html;
  }

  getInvoiceDetails(invId) {
    const inv = INVOICES[invId];
    const engine = new MatchingEngine(TOLERANCE);
    const report = engine.validate(inv);

    let html = `<strong>Invoice: ${inv.id}</strong><br><br>`;
    html += `<strong>Vendor:</strong> ${inv.vendorName}<br>`;
    html += `<strong>GSTIN:</strong> ${inv.vendorGstin}<br>`;
    html += `<strong>Date:</strong> ${inv.invoiceDate}<br>`;
    html += `<strong>Due Date:</strong> ${inv.dueDate}<br>`;
    html += `<strong>PO Reference:</strong> ${inv.poId}<br>`;
    html += `<strong>Status:</strong> ${report.overallStatus === 'matched' ? '✅ Matched' : '⚠️ Mismatch Detected'}<br><br>`;

    html += '<table class="chat-table"><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th></tr>';
    inv.items.forEach(item => {
      html += `<tr><td><strong>${item.code}</strong> — ${item.description}</td><td>${item.quantity} ${item.unit}</td><td>Rs.${item.unitPrice.toLocaleString('en-IN')}</td><td>Rs.${item.amount.toLocaleString('en-IN')}</td></tr>`;
    });
    html += '</table>';

    html += `<br><strong>Subtotal:</strong> Rs.${inv.subtotal.toLocaleString('en-IN')}<br>`;
    html += `<strong>CGST (${inv.gstRate/2}%):</strong> Rs.${inv.cgst.toLocaleString('en-IN')}<br>`;
    html += `<strong>SGST (${inv.gstRate/2}%):</strong> Rs.${inv.sgst.toLocaleString('en-IN')}<br>`;
    html += `<strong>Grand Total: Rs.${inv.total.toLocaleString('en-IN')}</strong>`;

    if (report.deviations.length > 0) {
      html += '<br><br>' + this.formatDeviationReport(report);
    }
    return html;
  }

  findVendorInQuery(q) {
    const vendorMap = {
      'rajesh': 'V001', 'steel': 'V001',
      'kumar': 'V002', 'logistics': 'V002',
      'patel': 'V003', 'industrial': 'V003',
      'singh': 'V004', 'transport': 'V004', 'freight': 'V004',
      'gupta': 'V005', 'packaging': 'V005',
      'sharma': 'V006', 'electrical': 'V006'
    };
    for (const [key, vid] of Object.entries(vendorMap)) {
      if (q.includes(key)) return vid;
    }
    return null;
  }

  findByVendor(q) {
    const vid = this.findVendorInQuery(q);
    if (!vid) return null;

    const vendor = VENDORS[vid];
    const po = Object.values(PURCHASE_ORDERS).find(p => p.vendorId === vid);
    const contract = Object.values(CONTRACTS).find(c => c.vendorId === vid);
    const inv = Object.values(INVOICES).find(i => i.vendorId === vid);

    let html = `<strong>All documents for ${vendor.name}:</strong><br><br>`;

    if (contract) {
      html += `📄 <strong>Contract:</strong> ${contract.id} (${contract.startDate} to ${contract.endDate})<br>`;
    }
    if (po) {
      html += `🛒 <strong>PO:</strong> ${po.id} — Rs.${po.total.toLocaleString('en-IN')}<br>`;
    }
    if (inv) {
      html += `🧾 <strong>Invoice:</strong> ${inv.id} — Rs.${inv.total.toLocaleString('en-IN')}<br>`;
      const engine = new MatchingEngine(TOLERANCE);
      const report = engine.validate(inv);
      html += `<strong>Match Status:</strong> ${report.overallStatus === 'matched' ? '✅ Matched' : '⚠️ ' + report.deviations.length + ' deviation(s)'}`;
    }

    return html;
  }

  showToleranceRules() {
    return `<strong>Matching Tolerance Rules:</strong><br><br>
      <table class="chat-table">
        <tr><th>Check</th><th>Tolerance</th><th>Action if exceeded</th></tr>
        <tr><td><strong>Price</strong></td><td>±${TOLERANCE.price}%</td><td>Flag as price deviation</td></tr>
        <tr><td><strong>Quantity</strong></td><td>±${TOLERANCE.quantity}%</td><td>Flag as quantity deviation</td></tr>
        <tr><td><strong>Tax Rate</strong></td><td>±${TOLERANCE.tax}%</td><td>Flag as tax mismatch</td></tr>
      </table>
      <br>Deviations within tolerance are auto-approved. Anything beyond triggers an <strong>email alert</strong> to the accounts-payable and procurement teams.`;
  }

  handleAmountQuery(q) {
    const poId = this.extractPOId(q);
    if (poId) {
      const po = PURCHASE_ORDERS[poId];
      return `The total amount for <strong>${poId}</strong> (${po.vendorName}) is <strong>Rs.${po.total.toLocaleString('en-IN')}</strong> (Subtotal: Rs.${po.subtotal.toLocaleString('en-IN')} + GST: Rs.${po.gstAmount.toLocaleString('en-IN')}).`;
    }
    const invId = this.extractInvoiceId(q);
    if (invId) {
      const inv = INVOICES[invId];
      return `Invoice <strong>${invId}</strong> total is <strong>Rs.${inv.total.toLocaleString('en-IN')}</strong> (Subtotal: Rs.${inv.subtotal.toLocaleString('en-IN')} + GST: Rs.${(inv.cgst + inv.sgst).toLocaleString('en-IN')}).`;
    }
    // Total across all POs
    const grandTotal = Object.values(PURCHASE_ORDERS).reduce((s, p) => s + p.total, 0);
    const invTotal = Object.values(INVOICES).reduce((s, i) => s + i.total, 0);
    return `<strong>Overall Summary:</strong><br>Total PO Value: <strong>Rs.${grandTotal.toLocaleString('en-IN')}</strong><br>Total Invoice Value: <strong>Rs.${invTotal.toLocaleString('en-IN')}</strong><br>Net Difference: <strong>Rs.${(invTotal - grandTotal).toLocaleString('en-IN')}</strong>`;
  }

  handleTaxQuery(q) {
    const invId = this.extractInvoiceId(q);
    if (invId) {
      const inv = INVOICES[invId];
      const po = PURCHASE_ORDERS[inv.poId];
      let html = `<strong>Tax Details for ${invId}:</strong><br><br>`;
      html += `Invoice GST Rate: <strong>${inv.gstRate}%</strong> (CGST: Rs.${inv.cgst.toLocaleString('en-IN')} + SGST: Rs.${inv.sgst.toLocaleString('en-IN')})<br>`;
      html += `PO GST Rate: <strong>${po.gstRate}%</strong> (GST: Rs.${po.gstAmount.toLocaleString('en-IN')})<br>`;
      if (inv.gstRate !== po.gstRate) {
        html += `<br><span style="color:#DC2626"><strong>⚠️ Tax rate mismatch!</strong> Invoice claims ${inv.gstRate}% but PO/Contract specifies ${po.gstRate}%.</span>`;
      } else {
        html += `<br><span style="color:#059669">✅ Tax rates match.</span>`;
      }
      return html;
    }
    return 'Please specify an invoice ID to check tax details. For example: <em>"GST for INV-GP-2025-0789"</em>';
  }

  showHelp() {
    return `<strong>I can help you with:</strong><br><br>
      <strong>📋 List documents:</strong><br>
      • "Show all POs" / "List contracts" / "Show all invoices"<br><br>
      <strong>🔍 Look up specific documents:</strong><br>
      • "Tell me about PO-2025-1001"<br>
      • "Details for CON-2025-003"<br>
      • "Show INV-RS-2025-0451"<br><br>
      <strong>⚖️ Compare &amp; analyze:</strong><br>
      • "Compare INV-KL-2025-0872 with its PO"<br>
      • "What deviations exist?"<br>
      • "GST for INV-GP-2025-0789"<br><br>
      <strong>🏢 Search by vendor:</strong><br>
      • "Show me all docs for Kumar Logistics"<br>
      • "What about Rajesh Steel?"<br><br>
      <strong>📊 Totals &amp; rules:</strong><br>
      • "What's the total PO value?"<br>
      • "Show tolerance rules"`;
  }

  smartFallback(q) {
    // Try vendor match
    const vendorResult = this.findByVendor(q);
    if (vendorResult) return vendorResult;

    // Try to find any document ID
    const poId = this.extractPOId(q);
    if (poId) return this.getPODetails(poId);

    const conId = this.extractContractId(q);
    if (conId) return this.getContractDetails(conId);

    return `I'm not sure how to answer that. Here are some things you can ask me:<br><br>
      • <em>"Show all POs and their amounts"</em><br>
      • <em>"Compare INV-KL-2025-0872 with its PO"</em><br>
      • <em>"What deviations exist in invoices?"</em><br>
      • <em>"Tell me about Rajesh Steel"</em><br>
      • <em>"What are the tolerance rules?"</em><br><br>
      Type <strong>help</strong> for a full list of commands.`;
  }
}
