// ============================================================
// APP — UI Logic, Upload, Live Comparison, Result Popup, Chat
// ============================================================

const engine = new MatchingEngine(TOLERANCE);
const chatEngine = new ChatEngine({ apiBaseUrl: window.location.origin });
const processedInvoices = [];

// ---- INIT ----
document.addEventListener('DOMContentLoaded', () => {
  setupSampleSection();
  renderSampleCards();
  setupUploadZone();
  setupKnowledgeZipUpload();
  setupScrollAnimations();
});

function setupSampleSection() {
  const content = document.getElementById('sampleContent');
  const toggleBtn = document.getElementById('sampleToggleBtn');
  if (!content || !toggleBtn) return;

  content.classList.add('collapsed');
  toggleBtn.setAttribute('aria-expanded', 'false');
}

function toggleSampleInvoices() {
  const content = document.getElementById('sampleContent');
  const toggleBtn = document.getElementById('sampleToggleBtn');
  if (!content || !toggleBtn) return;

  const isCollapsed = content.classList.toggle('collapsed');
  toggleBtn.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
}

// ---- SAMPLE CARDS ----
function renderSampleCards() {
  const grid = document.getElementById('sampleGrid');
  const samples = [
    { id: 'INV-RS-2025-0451', label: 'Perfect Match', vendor: 'Rajesh Steel & Alloys', icon: 'match', tag: 'tag-match', tagText: 'Full Match', iconClass: 'check_circle' },
    { id: 'INV-KL-2025-0872', label: 'Price Deviation', vendor: 'Kumar Logistics Solutions', icon: 'price', tag: 'tag-price', tagText: 'Price Issue', iconClass: 'trending_up' },
    { id: 'INV-PI-2025-0334', label: 'Quantity Deviation', vendor: 'Patel Industrial Supplies', icon: 'qty', tag: 'tag-qty', tagText: 'Qty Issue', iconClass: 'inventory_2' },
    { id: 'INV-ST-2025-0567', label: 'Price + Quantity', vendor: 'Singh Transport & Freight', icon: 'both', tag: 'tag-both', tagText: 'Multiple Issues', iconClass: 'warning' },
    { id: 'INV-GP-2025-0789', label: 'Tax Rate Mismatch', vendor: 'Gupta Packaging Materials', icon: 'tax', tag: 'tag-tax', tagText: 'Tax Issue', iconClass: 'percent' },
    { id: 'INV-SE-2025-0923', label: 'Perfect Match #2', vendor: 'Sharma Electrical Components', icon: 'match', tag: 'tag-match', tagText: 'Full Match', iconClass: 'check_circle' }
  ];

  grid.innerHTML = samples.map(s => `
    <div class="sample-card" onclick="handleSampleClick('${s.id}')">
      <div class="sample-card-icon ${s.icon}">
        <span class="material-icons-round">${s.iconClass}</span>
      </div>
      <div class="sample-card-info">
        <div class="sample-card-title">${s.id}</div>
        <div class="sample-card-vendor">${s.vendor}</div>
        <span class="sample-card-tag ${s.tag}">${s.tagText}</span>
      </div>
    </div>
  `).join('');
}

// ---- UPLOAD ZONE ----
function setupUploadZone() {
  const zone = document.getElementById('uploadZone');
  const input = document.getElementById('fileInput');

  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('drag-over');
  });

  zone.addEventListener('dragleave', () => {
    zone.classList.remove('drag-over');
  });

  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  });

  zone.addEventListener('click', () => input.click());
  input.addEventListener('change', () => {
    if (input.files.length > 0) {
      handleFileUpload(input.files[0]);
    }
  });
}

// ---- FILE UPLOAD (smart mapping by filename or random) ----
function handleFileUpload(file) {
  const fileName = file.name.toUpperCase();
  const invoiceIds = Object.keys(INVOICES);

  // Try to match filename to an invoice ID (e.g., INV-RS-2025-0451.pdf)
  let matchedId = invoiceIds.find(id => fileName.includes(id));

  // Also try partial matches (vendor codes)
  if (!matchedId) {
    const vendorCodes = { 'RS': 'INV-RS-2025-0451', 'KL': 'INV-KL-2025-0872', 'PI': 'INV-PI-2025-0334', 'ST': 'INV-ST-2025-0567', 'GP': 'INV-GP-2025-0789', 'SE': 'INV-SE-2025-0923' };
    for (const [code, id] of Object.entries(vendorCodes)) {
      if (fileName.includes(code)) { matchedId = id; break; }
    }
  }

  // Fallback: pick a random unprocessed invoice, or any random one
  if (!matchedId) {
    const unprocessed = invoiceIds.filter(id => !processedInvoices.find(p => p.invoiceId === id));
    matchedId = unprocessed.length > 0
      ? unprocessed[Math.floor(Math.random() * unprocessed.length)]
      : invoiceIds[Math.floor(Math.random() * invoiceIds.length)];
  }

  processInvoice(matchedId, file.name);
}

// ---- SAMPLE CLICK ----
function handleSampleClick(invoiceId) {
  processInvoice(invoiceId);
}

// ---- MAIN PROCESSING FLOW ----
async function processInvoice(invoiceId, fileName) {
  const invoice = INVOICES[invoiceId];
  if (!invoice) return;

  const po = PURCHASE_ORDERS[invoice.poId];
  const contract = po ? CONTRACTS[po.contractId] : null;

  // Show processing panel + live comparison
  const procPanel = document.getElementById('processingPanel');
  const liveComp = document.getElementById('liveComparison');
  procPanel.style.display = 'block';
  liveComp.style.display = 'block';

  // Reset live comparison
  document.getElementById('docInvoiceBody').innerHTML = '<div class="doc-loading"><span class="material-icons-round spin">sync</span> Extracting data...</div>';
  document.getElementById('docPOBody').innerHTML = '<div class="doc-loading"><span class="material-icons-round">hourglass_empty</span> Waiting...</div>';
  document.getElementById('docContractBody').innerHTML = '<div class="doc-loading"><span class="material-icons-round">hourglass_empty</span> Waiting...</div>';

  procPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Animate processing with live data population
  await animateProcessing(invoice, po, contract);

  // Run engine
  const report = engine.validate(invoice);

  // Store result
  if (!processedInvoices.find(p => p.invoiceId === report.invoiceId)) {
    processedInvoices.push(report);
  }

  // Hide processing, keep live comparison
  procPanel.style.display = 'none';

  // Short pause then show result popup
  await sleep(400);
  showResultPopup(report, invoice);
  updateDashboard();
}

// ---- PROCESSING ANIMATION (with live data fill) ----
async function animateProcessing(invoice, po, contract) {
  const steps = ['procStep1', 'procStep2', 'procStep3', 'procStep4', 'procStep5', 'procStep6'];
  const bar = document.getElementById('processingBarFill');
  bar.style.width = '0%';

  // Reset all steps
  steps.forEach(id => {
    const el = document.getElementById(id);
    el.className = 'proc-step';
    el.querySelector('.proc-icon').textContent = 'hourglass_empty';
  });

  for (let i = 0; i < steps.length; i++) {
    const el = document.getElementById(steps[i]);
    const icon = el.querySelector('.proc-icon');

    el.classList.add('active');
    icon.textContent = 'sync';
    bar.style.width = `${((i + 1) / steps.length) * 100}%`;

    await sleep(500 + Math.random() * 400);

    // Populate live comparison at the right steps
    if (i === 1) { // After extraction
      populateInvoicePreview(invoice);
    } else if (i === 2) { // After PO fetch
      populatePOPreview(po);
    } else if (i === 3) { // After contract fetch
      populateContractPreview(contract);
    }

    el.classList.remove('active');
    el.classList.add('done');
    icon.textContent = 'check_circle';
  }

  await sleep(300);
}

// ---- LIVE COMPARISON POPULATION ----
function populateInvoicePreview(invoice) {
  const body = document.getElementById('docInvoiceBody');
  body.innerHTML = `
    <div class="doc-data-row"><span class="doc-label">Invoice #</span><span class="doc-value">${invoice.id}</span></div>
    <div class="doc-data-row"><span class="doc-label">Vendor</span><span class="doc-value">${invoice.vendorName}</span></div>
    <div class="doc-data-row"><span class="doc-label">GSTIN</span><span class="doc-value">${invoice.vendorGstin}</span></div>
    <div class="doc-data-row"><span class="doc-label">Date</span><span class="doc-value">${invoice.invoiceDate}</span></div>
    <div class="doc-data-row"><span class="doc-label">PO Ref</span><span class="doc-value highlight">${invoice.poId}</span></div>
    <div class="doc-divider"></div>
    <div class="doc-items-title">Line Items:</div>
    ${invoice.items.map(item => `
      <div class="doc-item-row">
        <span class="doc-item-code">${item.code}</span>
        <span class="doc-item-detail">${item.quantity} ${item.unit} × Rs.${item.unitPrice.toLocaleString('en-IN')}</span>
      </div>
    `).join('')}
    <div class="doc-divider"></div>
    <div class="doc-data-row total"><span class="doc-label">Subtotal</span><span class="doc-value">Rs.${invoice.subtotal.toLocaleString('en-IN')}</span></div>
    <div class="doc-data-row"><span class="doc-label">GST (${invoice.gstRate}%)</span><span class="doc-value">Rs.${(invoice.cgst + invoice.sgst).toLocaleString('en-IN')}</span></div>
    <div class="doc-data-row total grand"><span class="doc-label">TOTAL</span><span class="doc-value">Rs.${invoice.total.toLocaleString('en-IN')}</span></div>
  `;
  body.classList.add('doc-populated');
}

function populatePOPreview(po) {
  const body = document.getElementById('docPOBody');
  if (!po) {
    body.innerHTML = '<div class="doc-loading doc-error"><span class="material-icons-round">error</span> PO not found!</div>';
    return;
  }
  body.innerHTML = `
    <div class="doc-data-row"><span class="doc-label">PO #</span><span class="doc-value">${po.id}</span></div>
    <div class="doc-data-row"><span class="doc-label">Vendor</span><span class="doc-value">${po.vendorName}</span></div>
    <div class="doc-data-row"><span class="doc-label">PO Date</span><span class="doc-value">${po.date}</span></div>
    <div class="doc-data-row"><span class="doc-label">Delivery</span><span class="doc-value">${po.deliveryDate}</span></div>
    <div class="doc-data-row"><span class="doc-label">Contract</span><span class="doc-value highlight">${po.contractId}</span></div>
    <div class="doc-divider"></div>
    <div class="doc-items-title">Ordered Items:</div>
    ${po.items.map(item => `
      <div class="doc-item-row">
        <span class="doc-item-code">${item.code}</span>
        <span class="doc-item-detail">${item.quantity} ${item.unit} × Rs.${item.unitPrice.toLocaleString('en-IN')}</span>
      </div>
    `).join('')}
    <div class="doc-divider"></div>
    <div class="doc-data-row total"><span class="doc-label">Subtotal</span><span class="doc-value">Rs.${po.subtotal.toLocaleString('en-IN')}</span></div>
    <div class="doc-data-row"><span class="doc-label">GST (${po.gstRate}%)</span><span class="doc-value">Rs.${po.gstAmount.toLocaleString('en-IN')}</span></div>
    <div class="doc-data-row total grand"><span class="doc-label">TOTAL</span><span class="doc-value">Rs.${po.total.toLocaleString('en-IN')}</span></div>
  `;
  body.classList.add('doc-populated');
}

function populateContractPreview(contract) {
  const body = document.getElementById('docContractBody');
  if (!contract) {
    body.innerHTML = '<div class="doc-loading doc-error"><span class="material-icons-round">error</span> Contract not found!</div>';
    return;
  }
  body.innerHTML = `
    <div class="doc-data-row"><span class="doc-label">Contract #</span><span class="doc-value">${contract.id}</span></div>
    <div class="doc-data-row"><span class="doc-label">Vendor</span><span class="doc-value">${contract.vendorName}</span></div>
    <div class="doc-data-row"><span class="doc-label">Period</span><span class="doc-value">${contract.startDate} – ${contract.endDate}</span></div>
    <div class="doc-data-row"><span class="doc-label">Payment</span><span class="doc-value">${contract.paymentTerms}</span></div>
    <div class="doc-data-row"><span class="doc-label">GST Rate</span><span class="doc-value">${contract.gstRate}%</span></div>
    <div class="doc-divider"></div>
    <div class="doc-items-title">Contracted Rates:</div>
    ${contract.items.map(item => `
      <div class="doc-item-row">
        <span class="doc-item-code">${item.code}</span>
        <span class="doc-item-detail">Rs.${item.unitPrice.toLocaleString('en-IN')}/${item.unit} (${item.minQty}–${item.maxQty})</span>
      </div>
    `).join('')}
  `;
  body.classList.add('doc-populated');
}

// ---- RESULT POPUP MODAL ----
function showResultPopup(report, invoice) {
  const modal = document.getElementById('resultModal');
  const header = document.getElementById('resultModalHeader');
  const icon = document.getElementById('resultModalIcon');
  const title = document.getElementById('resultModalTitle');
  const body = document.getElementById('resultModalBody');

  const isMatch = report.overallStatus === 'matched';
  const po = report.po;
  const contract = report.contract;

  // Set header style
  header.className = `modal-header ${isMatch ? 'modal-header-success' : 'modal-header-danger'}`;
  icon.className = `modal-icon ${isMatch ? 'green' : 'red'}`;
  icon.innerHTML = `<span class="material-icons-round">${isMatch ? 'check_circle' : 'error'}</span>`;
  title.textContent = isMatch ? 'Invoice Validated — All Checks Passed' : 'Mismatch Detected — Review Required';

  let html = `
    <div class="result-subtitle">${isMatch
      ? 'Invoice matches PO and Contract within tolerance limits. Payment workflow can be initiated.'
      : `${report.deviations.length} deviation(s) found. An alert email has been triggered to the team.`}</div>

    <!-- 3-way comparison cards -->
    <div class="comparison-grid">
      <div class="comparison-card">
        <div class="comparison-card-header"><span class="material-icons-round">description</span><h4>Invoice</h4></div>
        <div class="comp-detail"><span class="label">Invoice #</span><span class="value">${invoice.id}</span></div>
        <div class="comp-detail"><span class="label">Vendor</span><span class="value">${invoice.vendorName}</span></div>
        <div class="comp-detail"><span class="label">GSTIN</span><span class="value">${invoice.vendorGstin}</span></div>
        <div class="comp-detail"><span class="label">Date</span><span class="value">${formatDate(invoice.invoiceDate)}</span></div>
        <div class="comp-detail"><span class="label">Subtotal</span><span class="value">Rs.${invoice.subtotal.toLocaleString('en-IN')}</span></div>
        <div class="comp-detail"><span class="label">GST (${invoice.gstRate}%)</span><span class="value">Rs.${(invoice.cgst + invoice.sgst).toLocaleString('en-IN')}</span></div>
        <div class="comp-detail total"><span class="label">Total</span><span class="value">Rs.${invoice.total.toLocaleString('en-IN')}</span></div>
      </div>
      ${po ? `
      <div class="comparison-card">
        <div class="comparison-card-header"><span class="material-icons-round">shopping_cart</span><h4>Purchase Order</h4></div>
        <div class="comp-detail"><span class="label">PO #</span><span class="value">${po.id}</span></div>
        <div class="comp-detail"><span class="label">Vendor</span><span class="value">${po.vendorName}</span></div>
        <div class="comp-detail"><span class="label">PO Date</span><span class="value">${formatDate(po.date)}</span></div>
        <div class="comp-detail"><span class="label">Delivery</span><span class="value">${formatDate(po.deliveryDate)}</span></div>
        <div class="comp-detail"><span class="label">Subtotal</span><span class="value">Rs.${po.subtotal.toLocaleString('en-IN')}</span></div>
        <div class="comp-detail"><span class="label">GST (${po.gstRate}%)</span><span class="value">Rs.${po.gstAmount.toLocaleString('en-IN')}</span></div>
        <div class="comp-detail total"><span class="label">Total</span><span class="value">Rs.${po.total.toLocaleString('en-IN')}</span></div>
      </div>` : ''}
      ${contract ? `
      <div class="comparison-card">
        <div class="comparison-card-header"><span class="material-icons-round">handshake</span><h4>Contract</h4></div>
        <div class="comp-detail"><span class="label">Contract #</span><span class="value">${contract.id}</span></div>
        <div class="comp-detail"><span class="label">Period</span><span class="value">${formatDate(contract.startDate)} – ${formatDate(contract.endDate)}</span></div>
        <div class="comp-detail"><span class="label">Payment</span><span class="value">${contract.paymentTerms}</span></div>
        <div class="comp-detail"><span class="label">GST Rate</span><span class="value">${contract.gstRate}%</span></div>
        <div class="comp-detail"><span class="label">Items</span><span class="value">${contract.items.length} line items</span></div>
      </div>` : ''}
    </div>

    <!-- Line items comparison -->
    <div class="items-comparison">
      <h4><span class="material-icons-round">compare</span> Line-by-Line Comparison</h4>
      <div class="table-scroll">
      <table class="items-table">
        <thead>
          <tr>
            <th>Item Code</th><th>Description</th>
            <th>Inv Qty</th><th>PO Qty</th><th>Qty Dev</th>
            <th>Inv Price</th><th>PO Price</th><th>Contract Price</th><th>Price Dev</th>
            <th>Inv Amount</th><th>PO Amount</th>
          </tr>
        </thead>
        <tbody>`;

  report.itemResults.forEach(item => {
    const contractItem = contract ? contract.items.find(c => c.code === item.code) : null;
    const priceClass = item.priceStatus === 'deviation' ? 'cell-deviation' : 'cell-match';
    const qtyClass = item.qtyStatus === 'deviation' ? 'cell-deviation' : 'cell-match';

    html += `<tr>
      <td><strong>${item.code}</strong></td>
      <td>${item.description}</td>
      <td><span class="${qtyClass}">${item.invoice.qty}</span></td>
      <td>${item.po ? item.po.qty : '—'}</td>
      <td><span class="${qtyClass}">${item.po ? (item.qtyDeviation === 0 ? '✓ OK' : (item.qtyDeviation > 0 ? '+' : '') + item.qtyDeviation.toFixed(1) + '%') : 'N/A'}</span></td>
      <td><span class="${priceClass}">Rs.${item.invoice.price.toLocaleString('en-IN')}</span></td>
      <td>${item.po ? 'Rs.' + item.po.price.toLocaleString('en-IN') : '—'}</td>
      <td>${contractItem ? 'Rs.' + contractItem.unitPrice.toLocaleString('en-IN') : '—'}</td>
      <td><span class="${priceClass}">${item.po ? (item.priceDeviation === 0 ? '✓ OK' : (item.priceDeviation > 0 ? '+' : '') + item.priceDeviation.toFixed(1) + '%') : 'N/A'}</span></td>
      <td>Rs.${item.invoice.amount.toLocaleString('en-IN')}</td>
      <td>${item.po ? 'Rs.' + item.po.amount.toLocaleString('en-IN') : '—'}</td>
    </tr>`;
  });

  html += `</tbody></table></div></div>`;

  // Financial summary bar
  const dev = report.summary.totalDeviation || 0;
  html += `
    <div class="financial-summary ${isMatch ? 'summary-green' : 'summary-red'}">
      <div class="fin-item"><span class="fin-label">Invoice Total</span><span class="fin-value">Rs.${report.summary.invoiceTotal?.toLocaleString('en-IN')}</span></div>
      <div class="fin-arrow"><span class="material-icons-round">compare_arrows</span></div>
      <div class="fin-item"><span class="fin-label">PO Total</span><span class="fin-value">Rs.${report.summary.poTotal?.toLocaleString('en-IN')}</span></div>
      <div class="fin-arrow"><span class="material-icons-round">drag_handle</span></div>
      <div class="fin-item"><span class="fin-label">Deviation</span><span class="fin-value fin-deviation">${dev === 0 ? 'None' : 'Rs.' + dev.toLocaleString('en-IN')} (${report.summary.totalDeviationPct}%)</span></div>
    </div>`;

  // Deviations
  if (!isMatch) {
    html += `
      <div class="deviation-summary">
        <h4><span class="material-icons-round">warning</span> Deviations Detected</h4>
        <ul class="deviation-list">
          ${report.deviations.map(d => `
            <li>
              <span class="material-icons-round">error_outline</span>
              <span>${d.message}</span>
            </li>
          `).join('')}
        </ul>
      </div>`;
  }

  // Actions
  html += `
    <div class="actions-bar">
      ${isMatch ? `
        <button class="btn btn-success" onclick="alert('Payment workflow initiated for ${invoice.id}!')">
          <span class="material-icons-round">payments</span> Initiate Payment
        </button>
      ` : `
        <button class="btn btn-danger" onclick="closeResultModal(); showEmailAlert('${invoice.id}')">
          <span class="material-icons-round">email</span> View Email Alert
        </button>
        <button class="btn btn-outline btn-sm" onclick="alert('Escalated to Finance Head.')">
          <span class="material-icons-round">escalator_warning</span> Escalate
        </button>
      `}
      <button class="btn btn-outline btn-sm" onclick="alert('Report downloaded!')">
        <span class="material-icons-round">download</span> Download Report
      </button>
      <button class="btn btn-outline btn-sm" onclick="closeResultModal()">
        <span class="material-icons-round">close</span> Close
      </button>
    </div>`;

  body.innerHTML = html;
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeResultModal() {
  document.getElementById('resultModal').style.display = 'none';
  document.body.style.overflow = '';
}

// ---- EMAIL ALERT ----
function showEmailAlert(invoiceId) {
  const invoice = INVOICES[invoiceId];
  const report = engine.validate(invoice);
  const email = engine.generateEmailAlert(report);
  if (!email) return;

  const modal = document.getElementById('emailModal');
  const body = document.getElementById('emailModalBody');

  body.innerHTML = `
    <div class="email-preview">
      <div class="email-field"><strong>To:</strong> ${email.to}</div>
      <div class="email-field"><strong>Cc:</strong> ${email.cc}</div>
      <div class="email-field"><strong>Subject:</strong> ${email.subject}</div>
      <hr style="border:none;border-top:1px solid #ddd;margin:12px 0">
      ${email.body}
    </div>
  `;

  modal.style.display = 'flex';
}

function closeEmailModal() {
  document.getElementById('emailModal').style.display = 'none';
}

// Close modals on overlay click
document.addEventListener('click', (e) => {
  if (e.target.id === 'emailModal') closeEmailModal();
  if (e.target.id === 'resultModal') closeResultModal();
});

// ---- DASHBOARD ----
function updateDashboard() {
  const matched = processedInvoices.filter(r => r.overallStatus === 'matched').length;
  const mismatched = processedInvoices.filter(r => r.overallStatus === 'mismatched').length;
  const total = processedInvoices.length;
  const totalDev = processedInvoices.reduce((sum, r) => sum + Math.abs(r.summary.totalDeviation || 0), 0);

  document.getElementById('statMatched').textContent = matched;
  document.getElementById('statMismatched').textContent = mismatched;
  document.getElementById('statTotal').textContent = total;
  document.getElementById('statDeviation').textContent = `Rs.${totalDev.toLocaleString('en-IN')}`;

  const tbody = document.getElementById('dashboardBody');

  if (processedInvoices.length === 0) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="8"><div class="empty-state"><span class="material-icons-round">inbox</span><p>No invoices processed yet.</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = processedInvoices.map(r => {
    const isMatch = r.overallStatus === 'matched';
    const devAmt = r.summary.totalDeviation || 0;
    return `
      <tr>
        <td><strong>${r.invoiceId}</strong></td>
        <td>${r.vendorName}</td>
        <td>${r.poId}</td>
        <td>Rs.${r.summary.invoiceTotal?.toLocaleString('en-IN') || '-'}</td>
        <td>Rs.${r.summary.poTotal?.toLocaleString('en-IN') || '-'}</td>
        <td style="color:${devAmt === 0 ? 'var(--success)' : 'var(--danger)'};font-weight:600">
          ${devAmt === 0 ? 'None' : 'Rs.' + devAmt.toLocaleString('en-IN')}
        </td>
        <td><span class="status-badge ${isMatch ? 'matched' : 'mismatched'}">
          <span class="material-icons-round" style="font-size:14px">${isMatch ? 'check_circle' : 'error'}</span>
          ${isMatch ? 'Matched' : 'Mismatch'}
        </span></td>
        <td>
          <button class="btn btn-sm ${isMatch ? 'btn-success' : 'btn-danger'}" onclick="${isMatch ? `alert('Payment initiated for ${r.invoiceId}!')` : `showEmailAlert('${r.invoiceId}')`}">
            <span class="material-icons-round" style="font-size:14px">${isMatch ? 'payments' : 'email'}</span>
            ${isMatch ? 'Pay' : 'Alert'}
          </button>
        </td>
      </tr>`;
  }).join('');
}

// ---- AI CHAT ----
function toggleChat() {
  const panel = document.getElementById('chatPanel');
  const fab = document.getElementById('chatFab');
  panel.classList.toggle('open');
  fab.classList.toggle('hidden');
  if (panel.classList.contains('open')) {
    document.getElementById('chatInput').focus();
  }
}

async function sendChat() {
  const input = document.getElementById('chatInput');
  const query = input.value.trim();
  if (!query) return;

  addChatMessage(query, 'user');
  input.value = '';

  const sendBtn = document.querySelector('.chat-send');
  if (sendBtn) sendBtn.disabled = true;

  // Hide suggestions after first message
  document.getElementById('chatSuggestions').style.display = 'none';

  // Simulate typing delay
  const typingEl = addChatMessage('<span class="typing-dots"><span>.</span><span>.</span><span>.</span></span>', 'bot');

  try {
    await sleep(350 + Math.random() * 500);
    const response = await chatEngine.respondWithAI(query, { processedInvoices });
    typingEl.querySelector('.chat-msg-bubble').innerHTML = response;
    scrollChatToBottom();
  } catch (error) {
    const reason = error && error.message ? ` (${error.message})` : '';
    typingEl.querySelector('.chat-msg-bubble').innerHTML = `Something went wrong while answering. Please try again${reason}.`;
  } finally {
    if (sendBtn) sendBtn.disabled = false;
  }
}

function sendSuggestion(text) {
  document.getElementById('chatInput').value = text;
  sendChat();
}

function addChatMessage(content, role) {
  const container = document.getElementById('chatMessages');
  const msg = document.createElement('div');
  msg.className = `chat-msg ${role}`;

  if (role === 'bot') {
    msg.innerHTML = `
      <div class="chat-msg-avatar"><span class="material-icons-round">smart_toy</span></div>
      <div class="chat-msg-bubble">${content}</div>`;
  } else {
    msg.innerHTML = `<div class="chat-msg-bubble">${content}</div>`;
  }

  container.appendChild(msg);
  scrollChatToBottom();
  return msg;
}

function scrollChatToBottom() {
  const container = document.getElementById('chatMessages');
  container.scrollTop = container.scrollHeight;
}

async function setupKnowledgeZipUpload() {
  const input = document.getElementById('zipKnowledgeInput');
  const status = document.getElementById('zipUploadStatus');
  if (!input || !status) return;

  input.addEventListener('change', async () => {
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];

    status.textContent = `Uploading ${file.name}...`;

    try {
      const formData = new FormData();
      formData.append('zipFile', file);

      const response = await fetch('/api/ingest-zip', {
        method: 'POST',
        body: formData
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'ZIP upload failed.');
      }

      chatEngine.setIngestedDocuments(payload.documents || []);
      status.textContent = `${payload.fileName} uploaded (${payload.count} files indexed).`;
      addChatMessage(`Knowledge ZIP uploaded: <strong>${payload.fileName}</strong><br>Indexed files: <strong>${payload.count}</strong>`, 'bot');
    } catch (error) {
      status.textContent = `Upload failed: ${error.message}`;
      addChatMessage(`I couldn't ingest that ZIP: ${error.message}`, 'bot');
    } finally {
      input.value = '';
    }
  });
}

// ---- UTILS ----
function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ---- SCROLL ANIMATIONS ----
function setupScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.step-card, .dash-stat-card').forEach(el => {
    el.classList.add('fade-in');
    observer.observe(el);
  });
}
