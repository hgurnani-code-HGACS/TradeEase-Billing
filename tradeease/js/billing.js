TE.Billing = (function () {
  const { el, currency, toast, modal, debounce, today, uid } = TE.Utils;

  let selectedCustomer = null;
  let lineItems = [];
  let invoiceNumber = '';
  let invoiceDate = today();
  let discountType = 'percentage';
  let discountValue = 0;
  let paymentMode = 'Cash';
  let notes = '';
  let editingInvoice = null;
  let sessionActive = false;

  function reset() {
    selectedCustomer = null;
    lineItems = [];
    discountType = 'percentage';
    discountValue = 0;
    paymentMode = 'Cash';
    notes = '';
    editingInvoice = null;
    invoiceDate = today();
    sessionActive = false;
  }

  async function render(container, draftInvoice) {
    if (draftInvoice) {
      await loadDraft(draftInvoice);
      sessionActive = true;
    } else if (!sessionActive) {
      reset();
      invoiceNumber = await TE.Store.getNextInvoiceNumber();
      sessionActive = true;
    }

    const products = await TE.Store.getAll('products');
    const activeProducts = products.filter(p => p.status === 'active');
    const customers = await TE.Store.getAll('customers');
    const businessState = await TE.Store.getSetting('business_state_code') || '24';

    container.innerHTML = '';

    const wrapper = el('div');

    const invHeader = el('div', { className: 'billing-header' });

    const leftCol = el('div');
    leftCol.innerHTML = `
      <div class="form-group mb-8">
        <label class="form-label">Invoice Number</label>
        <input type="text" class="form-input" value="${invoiceNumber}" readonly style="background:#f1f5f9;font-weight:600">
      </div>
      <div class="form-group mb-8">
        <label class="form-label">Invoice Date</label>
        <input type="date" class="form-input" id="billDate" value="${invoiceDate}">
      </div>`;

    const rightCol = el('div');
    const custLabel = el('label', { className: 'form-label' }, 'Customer *');
    rightCol.appendChild(custLabel);

    if (selectedCustomer) {
      const bar = el('div', { className: 'selected-customer-bar mb-8' }, [
        el('div', { className: 'cust-info' }, [
          el('strong', {}, selectedCustomer.customer_name),
          el('span', {}, `${selectedCustomer.customer_id} | ${selectedCustomer.mobile || 'No mobile'} | ${selectedCustomer.gstin || 'No GSTIN'}`),
        ]),
        el('button', { className: 'btn btn-outline btn-sm', onClick: () => { selectedCustomer = null; render(container); } }, 'Change'),
      ]);
      rightCol.appendChild(bar);
    } else {
      const searchWrap = el('div', { className: 'customer-search-wrap mb-8' });
      const searchInput = el('input', { type: 'text', className: 'form-input', placeholder: 'Search by name, mobile or ID...' });
      const dropdown = el('div', { className: 'customer-dropdown', style: { display: 'none' } });

      searchInput.addEventListener('input', debounce(() => {
        const q = searchInput.value.toLowerCase();
        if (q.length < 1) { dropdown.style.display = 'none'; return; }
        const matches = customers.filter(c =>
          c.customer_name.toLowerCase().includes(q) ||
          (c.mobile || '').includes(q) ||
          c.customer_id.toLowerCase().includes(q)
        ).slice(0, 8);
        dropdown.innerHTML = '';
        if (matches.length === 0) {
          dropdown.innerHTML = '<div style="padding:10px;color:var(--text-muted);font-size:.85rem">No matches</div>';
        }
        matches.forEach(c => {
          const item = el('div', { className: 'customer-dropdown-item' });
          item.addEventListener('mousedown', (e) => {
            e.preventDefault();
            selectedCustomer = c;
            render(container);
          });
          item.innerHTML = `<div class="cust-name">${c.customer_name}</div><div class="cust-meta">${c.customer_id} | ${c.mobile || ''} | ${c.gstin || 'No GSTIN'}</div>`;
          dropdown.appendChild(item);
        });
        dropdown.style.display = 'block';
      }, 150));

      searchInput.addEventListener('blur', () => { setTimeout(() => dropdown.style.display = 'none', 150); });
      searchWrap.appendChild(searchInput);
      searchWrap.appendChild(dropdown);
      rightCol.appendChild(searchWrap);

      const addNewBtn = el('button', { className: 'btn btn-ghost btn-sm', onClick: () => {
        TE.Customers.showCustomerForm();
      }}, '+ Add New Customer');
      rightCol.appendChild(addNewBtn);
    }

    invHeader.appendChild(leftCol);
    invHeader.appendChild(rightCol);
    wrapper.appendChild(invHeader);

    const itemsCard = el('div', { className: 'card mb-16' });
    const itemsHeader = el('div', { className: 'card-header' }, [
      el('h3', {}, 'Invoice Items'),
      el('span', { className: 'text-sm text-secondary' }, `${lineItems.length} item(s)`),
    ]);
    itemsCard.appendChild(itemsHeader);

    const itemsBody = el('div', { className: 'card-body no-pad billing-items-table' });
    const tWrap = el('div', { className: 'table-wrap' });
    const t = el('table');
    t.innerHTML = `<thead><tr>
      <th style="width:40px">#</th>
      <th style="min-width:200px">Product</th>
      <th style="width:70px">HSN</th>
      <th style="width:60px">Qty</th>
      <th style="width:60px">Unit</th>
      <th style="width:100px" class="text-right">Rate</th>
      <th style="width:70px" class="text-right">Disc%</th>
      <th style="width:60px" class="text-right">GST%</th>
      <th style="width:110px" class="text-right">Amount</th>
      <th style="width:40px"></th>
    </tr></thead>`;
    const tbody = el('tbody');

    lineItems.forEach((item, idx) => {
      const tr = buildLineRow(item, idx, activeProducts, container, businessState);
      tbody.appendChild(tr);
    });

    const addRow = el('tr');
    const addCell = el('td', { colspan: '10', style: { padding: '8px 16px' } });
    const addLineWrap = el('div', { className: 'sku-search', style: { maxWidth: '400px' } });
    const skuInput = el('input', { type: 'text', placeholder: 'Type SKU or product name to add...', style: { padding: '8px 12px', width: '100%' } });
    const skuDrop = el('div', { className: 'sku-dropdown', style: { display: 'none' } });

    skuInput.addEventListener('input', debounce(() => {
      const q = skuInput.value.toLowerCase();
      if (q.length < 1) { skuDrop.style.display = 'none'; return; }
      const matches = activeProducts.filter(p =>
        p.sku_code.toLowerCase().includes(q) ||
        p.product_name.toLowerCase().includes(q)
      ).slice(0, 10);
      skuDrop.innerHTML = '';
      matches.forEach(p => {
        const item = el('div', { className: 'sku-dropdown-item' });
        item.addEventListener('mousedown', (e) => {
          e.preventDefault();
          addLineItem(p);
          skuInput.value = '';
          skuDrop.style.display = 'none';
          render(container);
        });
        item.innerHTML = `<div class="sku-name">${p.product_name}</div><div class="sku-meta">${p.sku_code} | ${currency(p.selling_price)} | GST ${p.gst_rate}%</div>`;
        skuDrop.appendChild(item);
      });
      skuDrop.style.display = matches.length ? 'block' : 'none';
    }, 150));

    skuInput.addEventListener('blur', () => { setTimeout(() => skuDrop.style.display = 'none', 150); });
    skuInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const q = skuInput.value.trim().toUpperCase();
        const exact = activeProducts.find(p => p.sku_code === q);
        if (exact) {
          addLineItem(exact);
          skuInput.value = '';
          skuDrop.style.display = 'none';
          render(container);
        }
      }
    });

    addLineWrap.appendChild(skuInput);
    addLineWrap.appendChild(skuDrop);
    addCell.appendChild(addLineWrap);
    addRow.appendChild(addCell);
    tbody.appendChild(addRow);

    t.appendChild(tbody);
    tWrap.appendChild(t);
    itemsBody.appendChild(tWrap);
    itemsCard.appendChild(itemsBody);
    wrapper.appendChild(itemsCard);

    const totals = calculateTotals(businessState);
    const totalsSection = el('div', { className: 'billing-totals' });
    const totalsTable = el('table');
    const isIntra = isIntraState(businessState);
    totalsTable.innerHTML = `
      <tr><td class="text-secondary">Subtotal</td><td class="text-right fw-600">${currency(totals.subtotal)}</td></tr>
      <tr><td class="text-secondary">Discount ${discountType === 'percentage' ? '(' + discountValue + '%)' : ''}</td><td class="text-right">${currency(totals.discountAmount)}</td></tr>
      <tr><td class="text-secondary">Taxable Amount</td><td class="text-right fw-600">${currency(totals.taxableAmount)}</td></tr>
      ${isIntra ? `
        <tr><td class="text-secondary">CGST</td><td class="text-right">${currency(totals.cgst)}</td></tr>
        <tr><td class="text-secondary">SGST</td><td class="text-right">${currency(totals.sgst)}</td></tr>
      ` : `
        <tr><td class="text-secondary">IGST</td><td class="text-right">${currency(totals.igst)}</td></tr>
      `}
      <tr class="total-row"><td>Grand Total</td><td class="text-right">${currency(totals.grandTotal)}</td></tr>`;
    totalsSection.appendChild(totalsTable);
    wrapper.appendChild(totalsSection);

    const footerSection = el('div', { className: 'card', style: { padding: '16px 20px' } });
    footerSection.innerHTML = `
      <div class="form-row" style="margin-bottom:12px">
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Payment Mode</label>
          <select class="form-select" id="billPayment">
            ${['Cash','UPI','Bank Transfer','Credit','Cheque'].map(m =>
              `<option ${paymentMode === m ? 'selected' : ''}>${m}</option>`
            ).join('')}
          </select>
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Invoice Discount</label>
          <div style="display:flex;gap:6px">
            <select class="form-select" id="billDiscType" style="width:100px">
              <option value="percentage" ${discountType === 'percentage' ? 'selected' : ''}>%</option>
              <option value="amount" ${discountType === 'amount' ? 'selected' : ''}>₹</option>
            </select>
            <input type="number" class="form-input" id="billDiscVal" value="${discountValue}" min="0" step="0.01">
          </div>
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Notes</label>
          <input type="text" class="form-input" id="billNotes" value="${notes}" placeholder="Optional notes">
        </div>
      </div>`;
    wrapper.appendChild(footerSection);

    const actions = el('div', { className: 'billing-actions' }, [
      el('button', { className: 'btn btn-outline', onClick: () => { reset(); TE.App.navigate('billing'); } }, 'Clear'),
      el('button', { className: 'btn btn-warning', onClick: () => saveBill('draft', container, businessState) }, 'Save Draft'),
      el('button', { className: 'btn btn-success btn-lg', onClick: () => saveBill('posted', container, businessState) }, [
        el('span', { innerHTML: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>' }),
        'Post & Generate Invoice',
      ]),
    ]);
    wrapper.appendChild(actions);

    container.appendChild(wrapper);

    document.getElementById('billDate')?.addEventListener('change', (e) => { invoiceDate = e.target.value; });
    document.getElementById('billPayment')?.addEventListener('change', (e) => { paymentMode = e.target.value; });
    document.getElementById('billDiscType')?.addEventListener('change', (e) => { discountType = e.target.value; render(container); });
    document.getElementById('billDiscVal')?.addEventListener('change', (e) => { discountValue = Number(e.target.value) || 0; render(container); });
    document.getElementById('billNotes')?.addEventListener('change', (e) => { notes = e.target.value; });
  }

  function buildLineRow(item, idx, products, container, businessState) {
    const { el, currency } = TE.Utils;
    const tr = el('tr');
    const lineTotal = calcLineTotal(item);

    tr.innerHTML = `
      <td class="text-center">${idx + 1}</td>
      <td>
        <div class="fw-600 text-sm">${item.product_name}</div>
        <div class="text-sm text-secondary">${item.sku_code}</div>
      </td>
      <td class="text-sm">${item.hsn_code || ''}</td>
      <td></td>
      <td class="text-sm">${item.unit || ''}</td>
      <td></td>
      <td></td>
      <td class="text-right text-sm">${item.gst_rate}%</td>
      <td class="text-right fw-600">${currency(lineTotal)}</td>
      <td></td>`;

    const qtyCell = tr.children[3];
    const qtyInput = el('input', { type: 'number', value: item.quantity, min: '1', step: '1', style: { width: '60px', textAlign: 'center' } });
    qtyInput.addEventListener('change', () => {
      item.quantity = Number(qtyInput.value) || 1;
      render(container);
    });
    qtyCell.innerHTML = '';
    qtyCell.appendChild(qtyInput);

    const rateCell = tr.children[5];
    const rateInput = el('input', { type: 'number', value: item.rate, min: '0', step: '0.01', style: { width: '90px', textAlign: 'right' } });
    rateInput.addEventListener('change', () => {
      item.rate = Number(rateInput.value) || 0;
      render(container);
    });
    rateCell.innerHTML = '';
    rateCell.appendChild(rateInput);

    const discCell = tr.children[6];
    const discInput = el('input', { type: 'number', value: item.discount || 0, min: '0', max: '100', step: '0.01', style: { width: '60px', textAlign: 'right' } });
    discInput.addEventListener('change', () => {
      item.discount = Number(discInput.value) || 0;
      render(container);
    });
    discCell.innerHTML = '';
    discCell.appendChild(discInput);

    const removeCell = tr.children[9];
    removeCell.innerHTML = '';
    removeCell.appendChild(el('button', { className: 'remove-line', onClick: () => {
      lineItems.splice(idx, 1);
      render(container);
    }, title: 'Remove line' }, '&times;'));

    return tr;
  }

  function addLineItem(product) {
    const existing = lineItems.find(l => l.sku_code === product.sku_code);
    if (existing) {
      existing.quantity += 1;
      return;
    }
    lineItems.push({
      id: uid(),
      sku_code: product.sku_code,
      product_name: product.product_name,
      hsn_code: product.hsn_code,
      quantity: 1,
      unit: product.unit,
      rate: product.selling_price,
      mrp: product.mrp,
      gst_rate: product.gst_rate,
      discount: 0,
    });
  }

  function calcLineTotal(item) {
    const gross = item.quantity * item.rate;
    const disc = gross * (item.discount || 0) / 100;
    return gross - disc;
  }

  function isIntraState(businessStateCode) {
    if (!selectedCustomer || !selectedCustomer.state_code) return true;
    return selectedCustomer.state_code === businessStateCode;
  }

  function calculateTotals(businessStateCode) {
    let subtotal = 0;
    let totalTax = 0;
    let cgst = 0, sgst = 0, igst = 0;
    const intra = isIntraState(businessStateCode);

    for (const item of lineItems) {
      const lineVal = calcLineTotal(item);
      subtotal += lineVal;
    }

    let discountAmount = 0;
    if (discountType === 'percentage') {
      discountAmount = subtotal * discountValue / 100;
    } else {
      discountAmount = discountValue;
    }

    const taxableAmount = subtotal - discountAmount;

    for (const item of lineItems) {
      const lineVal = calcLineTotal(item);
      const proportion = taxableAmount > 0 ? lineVal / subtotal : 0;
      const lineTaxable = taxableAmount * proportion;
      const tax = lineTaxable * item.gst_rate / 100;
      if (intra) {
        cgst += tax / 2;
        sgst += tax / 2;
      } else {
        igst += tax;
      }
      totalTax += tax;
    }

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      discountAmount: Math.round(discountAmount * 100) / 100,
      taxableAmount: Math.round(taxableAmount * 100) / 100,
      cgst: Math.round(cgst * 100) / 100,
      sgst: Math.round(sgst * 100) / 100,
      igst: Math.round(igst * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      grandTotal: Math.round((taxableAmount + totalTax) * 100) / 100,
    };
  }

  async function saveBill(status, container, businessStateCode) {
    paymentMode = document.getElementById('billPayment')?.value || paymentMode;
    notes = document.getElementById('billNotes')?.value || notes;

    if (!selectedCustomer) { toast('Please select a customer', 'error'); return; }
    if (lineItems.length === 0) { toast('Please add at least one item', 'error'); return; }

    const totals = calculateTotals(businessStateCode);
    const intra = isIntraState(businessStateCode);

    const header = {
      invoice_number: invoiceNumber,
      invoice_date: invoiceDate,
      customer_id: selectedCustomer.customer_id,
      customer_name: selectedCustomer.customer_name,
      customer_gstin: selectedCustomer.gstin || '',
      customer_address: selectedCustomer.billing_address || '',
      customer_state: selectedCustomer.state || '',
      customer_state_code: selectedCustomer.state_code || '',
      subtotal: totals.subtotal,
      discount_type: discountType,
      discount_value: discountValue,
      discount_amount: totals.discountAmount,
      taxable_amount: totals.taxableAmount,
      cgst_amount: totals.cgst,
      sgst_amount: totals.sgst,
      igst_amount: totals.igst,
      total_tax: totals.totalTax,
      total_amount: totals.grandTotal,
      payment_mode: paymentMode,
      notes: notes,
      status: status,
      is_intra_state: intra,
      created_at: new Date().toISOString(),
    };

    const details = lineItems.map((item, idx) => {
      const lineVal = calcLineTotal(item);
      const proportion = totals.subtotal > 0 ? lineVal / totals.subtotal : 0;
      const lineTaxable = totals.taxableAmount * proportion;
      const tax = lineTaxable * item.gst_rate / 100;
      return {
        id: item.id,
        invoice_number: invoiceNumber,
        sr_no: idx + 1,
        sku_code: item.sku_code,
        product_name: item.product_name,
        hsn_code: item.hsn_code,
        quantity: item.quantity,
        unit: item.unit,
        rate: item.rate,
        discount: item.discount,
        taxable_value: Math.round(lineTaxable * 100) / 100,
        gst_rate: item.gst_rate,
        cgst_amount: intra ? Math.round(tax / 2 * 100) / 100 : 0,
        sgst_amount: intra ? Math.round(tax / 2 * 100) / 100 : 0,
        igst_amount: intra ? 0 : Math.round(tax * 100) / 100,
        line_total: Math.round((lineTaxable + tax) * 100) / 100,
      };
    });

    await TE.Store.put('sales_header', header);
    for (const d of details) {
      await TE.Store.put('sales_details', d);
    }

    if (status === 'posted') {
      for (const item of lineItems) {
        await TE.Store.addStockEntry({
          date: invoiceDate,
          sku_code: item.sku_code,
          type: 'sale',
          reference_number: invoiceNumber,
          quantity_in: 0,
          quantity_out: item.quantity,
          notes: `Sale to ${selectedCustomer.customer_name}`,
        });
      }
      await TE.Store.incrementInvoiceNumber();
    }

    if (status === 'posted') {
      toast('Invoice posted successfully!', 'success');
      TE.PDF.generateInvoice(header, details);
    } else {
      toast('Draft saved', 'info');
    }

    reset();
    TE.App.navigate(status === 'posted' ? 'invoices' : 'billing');
  }

  async function loadDraft(inv) {
    editingInvoice = inv;
    invoiceNumber = inv.invoice_number;
    invoiceDate = inv.invoice_date;
    discountType = inv.discount_type || 'percentage';
    discountValue = inv.discount_value || 0;
    paymentMode = inv.payment_mode || 'Cash';
    notes = inv.notes || '';

    selectedCustomer = await TE.Store.get('customers', inv.customer_id);

    const details = await TE.Store.getByIndex('sales_details', 'invoice_number', inv.invoice_number);
    lineItems = details.map(d => ({
      id: d.id,
      sku_code: d.sku_code,
      product_name: d.product_name,
      hsn_code: d.hsn_code,
      quantity: d.quantity,
      unit: d.unit,
      rate: d.rate,
      mrp: 0,
      gst_rate: d.gst_rate,
      discount: d.discount || 0,
    }));
  }

  return { render, reset };
})();
