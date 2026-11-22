TE.Billing = (function () {
  const { el, currency, toast, modal, today, uid } = TE.Utils;
  const t = () => TE.Lang.t;

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
  let selectedCategory = null;
  let productSearchQuery = '';

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
    selectedCategory = null;
    productSearchQuery = '';
  }

  async function render(container, draftInvoice) {
    const tr = t();
    if (draftInvoice) {
      await loadDraft(draftInvoice);
      sessionActive = true;
    } else if (!sessionActive) {
      reset();
      invoiceNumber = await TE.Store.getNextInvoiceNumber();
      const initMaster = (await TE.Store.getSetting('payment_discount_master')) || {};
      const initDisc = initMaster[paymentMode];
      if (initDisc !== undefined && initDisc > 0) {
        discountType = 'percentage';
        discountValue = initDisc;
      }
      sessionActive = true;
    }

    const products = await TE.Store.getAll('products');
    const activeProducts = products.filter(p => p.status === 'active');
    const customers = await TE.Store.getAll('customers');
    const categories = await TE.Store.getAll('categories');
    const businessState = await TE.Store.getSetting('business_state_code') || '24';
    const paymentDiscountMaster = (await TE.Store.getSetting('payment_discount_master')) || {};
    const stockBalances = {};
    for (const p of activeProducts) {
      stockBalances[p.sku_code] = await TE.Store.getStockBalance(p.sku_code);
    }

    container.innerHTML = '';
    const wrapper = el('div');

    // --- Customer bar ---
    if (selectedCustomer) {
      const bar = el('div', { className: 'pos-customer-bar' }, [
        el('div', { className: 'cust-info' }, [
          el('strong', {}, selectedCustomer.customer_name),
          el('span', {}, `${selectedCustomer.customer_id} | ${selectedCustomer.mobile || tr('no_customer')} | ${selectedCustomer.gstin || tr('no_gstin')}`),
        ]),
        el('button', { className: 'btn btn-outline btn-sm', onClick: () => { selectedCustomer = null; render(container); } }, tr('change')),
      ]);
      wrapper.appendChild(bar);
    } else {
      const searchWrap = el('div', { className: 'pos-customer-search' });
      const searchInput = el('input', { type: 'text', className: 'form-input', placeholder: tr('type_customer') });
      const dropdown = el('div', { className: 'customer-dropdown', style: { display: 'none' } });
      let custHighlight = -1;
      let custMatches = [];

      function matchCustomer(c, q) {
        const searchable = [c.customer_name || '', c.mobile || '', c.customer_id || '', c.gstin || '', c.state || ''].join(' ').toLowerCase();
        const words = q.split(/\s+/);
        return words.every(w => searchable.includes(w));
      }

      function renderCustDropdown() {
        dropdown.innerHTML = '';
        custHighlight = -1;
        if (custMatches.length === 0) {
          dropdown.innerHTML = `<div style="padding:12px 14px;color:var(--text-muted);font-size:.85rem">${tr('no_matches')}</div>`;
          dropdown.style.display = 'block';
          return;
        }
        custMatches.forEach((c) => {
          const item = el('div', { className: 'customer-dropdown-item' });
          item.addEventListener('mousedown', (e) => { e.preventDefault(); selectedCustomer = c; render(container); });
          item.innerHTML = `<div class="cust-name">${c.customer_name}</div><div class="cust-meta">${c.customer_id} | ${c.mobile || tr('no_customer')} | ${c.gstin || tr('no_gstin')}</div>`;
          dropdown.appendChild(item);
        });
        dropdown.style.display = 'block';
        setCustHighlight(0);
      }

      function setCustHighlight(idx) {
        const items = dropdown.querySelectorAll('.customer-dropdown-item');
        items.forEach(it => it.classList.remove('highlighted'));
        custHighlight = idx;
        if (idx >= 0 && idx < items.length) {
          items[idx].classList.add('highlighted');
          items[idx].scrollIntoView({ block: 'nearest' });
        }
      }

      function filterCustomers() {
        const q = searchInput.value.trim().toLowerCase();
        custMatches = q.length === 0 ? customers.slice(0, 10) : customers.filter(c => matchCustomer(c, q)).slice(0, 10);
        renderCustDropdown();
      }

      searchInput.addEventListener('input', filterCustomers);
      searchInput.addEventListener('focus', () => { if (dropdown.style.display === 'none') filterCustomers(); });
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); if (dropdown.style.display === 'none') filterCustomers(); else setCustHighlight(Math.min(custHighlight + 1, custMatches.length - 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setCustHighlight(Math.max(custHighlight - 1, 0)); }
        else if (e.key === 'Enter') { e.preventDefault(); if (custHighlight >= 0 && custHighlight < custMatches.length) { selectedCustomer = custMatches[custHighlight]; render(container); } }
        else if (e.key === 'Escape') { dropdown.style.display = 'none'; }
      });
      searchInput.addEventListener('blur', () => { setTimeout(() => dropdown.style.display = 'none', 250); });

      const addNewBtn = el('button', { className: 'btn btn-ghost btn-sm', onClick: () => TE.Customers.showCustomerForm() }, tr('add_new_customer'));
      searchWrap.appendChild(searchInput);
      searchWrap.appendChild(dropdown);
      wrapper.appendChild(searchWrap);
      wrapper.appendChild(addNewBtn);
    }

    // --- POS Layout: Products left, Cart right ---
    const posLayout = el('div', { className: 'pos-layout' });

    // === LEFT SIDE: Categories + Product Grid ===
    const posLeft = el('div', { className: 'pos-left' });

    // Invoice meta row
    const metaRow = el('div', { className: 'pos-meta-row' });
    metaRow.innerHTML = `
      <div class="form-group">
        <label class="form-label">${tr('invoice_number')}</label>
        <input type="text" class="form-input" value="${invoiceNumber}" readonly style="background:#f1f5f9;font-weight:600">
      </div>
      <div class="form-group">
        <label class="form-label">${tr('invoice_date')}</label>
        <input type="date" class="form-input" id="billDate" value="${invoiceDate}">
      </div>`;
    posLeft.appendChild(metaRow);

    // Category strip
    const catStrip = el('div', { className: 'pos-categories' });
    const allBtn = el('button', { className: 'pos-cat-btn' + (selectedCategory === null ? ' active' : ''), onClick: () => { selectedCategory = null; render(container); } }, tr('all_products'));
    catStrip.appendChild(allBtn);
    categories.forEach(cat => {
      const btn = el('button', {
        className: 'pos-cat-btn' + (selectedCategory === cat.id ? ' active' : ''),
        onClick: () => { selectedCategory = cat.id; render(container); }
      }, cat.name);
      catStrip.appendChild(btn);
    });
    posLeft.appendChild(catStrip);

    // Product search
    const searchDiv = el('div', { className: 'pos-search' });
    const prodSearchInput = el('input', { type: 'text', placeholder: tr('search_products'), value: productSearchQuery });
    prodSearchInput.addEventListener('input', () => {
      productSearchQuery = prodSearchInput.value;
      renderProductGrid();
    });
    searchDiv.appendChild(prodSearchInput);
    posLeft.appendChild(searchDiv);

    // Product grid
    const gridDiv = el('div', { className: 'pos-product-grid' });
    posLeft.appendChild(gridDiv);

    function renderProductGrid() {
      gridDiv.innerHTML = '';
      let filtered = activeProducts;
      if (selectedCategory) filtered = filtered.filter(p => p.category === selectedCategory);
      if (productSearchQuery.trim()) {
        const words = productSearchQuery.trim().toLowerCase().split(/\s+/);
        filtered = filtered.filter(p => {
          const searchable = (p.sku_code + ' ' + p.product_name + ' ' + (p.hsn_code || '')).toLowerCase();
          return words.every(w => searchable.includes(w));
        });
      }
      if (filtered.length === 0) {
        gridDiv.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><p>${tr('no_products_in_category')}</p></div>`;
        return;
      }
      filtered.forEach(p => {
        const stock = stockBalances[p.sku_code] || 0;
        const isOut = stock <= 0;
        const isLow = stock > 0 && stock <= (p.min_stock_level || 0);
        const card = el('div', { className: 'pos-product-card' + (isOut ? ' disabled' : '') });
        if (!isOut) {
          card.addEventListener('click', () => {
            addLineItem(p);
            renderCart();
          });
        }
        const stockClass = isOut ? 'no-stock' : (isLow ? 'low-stock' : 'in-stock');
        const stockLabel = isOut ? tr('out_of_stock') : `${tr('stock')}: ${stock}`;
        card.innerHTML = `
          <div class="prod-name">${p.product_name}</div>
          <div class="prod-sku">${p.sku_code}</div>
          <span class="prod-stock ${stockClass}">${stockLabel}</span>
          <div class="prod-price">${currency(p.selling_price)}</div>`;
        gridDiv.appendChild(card);
      });
    }

    renderProductGrid();

    // === RIGHT SIDE: Cart ===
    const posRight = el('div', { className: 'pos-right' });
    const cartDiv = el('div', { className: 'pos-cart' });

    // Cart header
    const cartHeader = el('div', { className: 'pos-cart-header' }, [
      el('h3', {}, `${tr('cart')} (${lineItems.reduce((s, i) => s + i.quantity, 0)} ${lineItems.length === 1 ? tr('item') : tr('items')})`),
      lineItems.length > 0 ? el('button', { className: 'btn btn-ghost btn-sm', onClick: () => { lineItems = []; renderCart(); } }, tr('clear_cart')) : null,
    ]);
    cartDiv.appendChild(cartHeader);

    // Cart items
    const cartItemsDiv = el('div', { className: 'pos-cart-items' });
    cartDiv.appendChild(cartItemsDiv);

    // Cart footer
    const cartFooter = el('div', { className: 'pos-cart-footer' });
    cartDiv.appendChild(cartFooter);

    function renderCart() {
      // Update header count
      const headerH3 = cartDiv.querySelector('.pos-cart-header h3');
      const totalQty = lineItems.reduce((s, i) => s + i.quantity, 0);
      headerH3.textContent = `${tr('cart')} (${totalQty} ${lineItems.length === 1 ? tr('item') : tr('items')})`;

      // Clear button visibility
      const existingClear = cartDiv.querySelector('.pos-cart-header .btn');
      if (lineItems.length > 0 && !existingClear) {
        cartHeader.appendChild(el('button', { className: 'btn btn-ghost btn-sm', onClick: () => { lineItems = []; renderCart(); } }, tr('clear_cart')));
      } else if (lineItems.length === 0 && existingClear) {
        existingClear.remove();
      }

      // Render items
      cartItemsDiv.innerHTML = '';
      if (lineItems.length === 0) {
        cartItemsDiv.innerHTML = `<div class="pos-cart-empty"><p>${tr('cart_empty')}</p><span>${tr('cart_empty_hint')}</span></div>`;
      } else {
        lineItems.forEach((item, idx) => {
          const lineTotal = calcLineTotal(item);
          const row = el('div', { className: 'pos-cart-item' });

          const info = el('div', { className: 'item-info' });
          info.innerHTML = `<div class="item-name">${item.product_name}</div><div class="item-rate">${currency(item.rate)} x ${item.quantity}</div>`;

          const stepper = el('div', { className: 'qty-stepper' });
          const minusBtn = el('button', { onClick: () => {
            if (item.quantity > 1) { item.quantity--; renderCart(); }
            else { lineItems.splice(idx, 1); renderCart(); }
          } }, '-');
          const qtyVal = el('span', { className: 'qty-val' }, String(item.quantity));
          const plusBtn = el('button', { onClick: () => { item.quantity++; renderCart(); } }, '+');
          stepper.appendChild(minusBtn);
          stepper.appendChild(qtyVal);
          stepper.appendChild(plusBtn);

          const totalSpan = el('div', { className: 'item-total' }, currency(lineTotal));

          const removeBtn = el('button', { className: 'remove-item', onClick: () => { lineItems.splice(idx, 1); renderCart(); }, title: 'Remove' }, '×');

          row.appendChild(info);
          row.appendChild(stepper);
          row.appendChild(totalSpan);
          row.appendChild(removeBtn);
          cartItemsDiv.appendChild(row);
        });
      }

      // Render totals and actions
      cartFooter.innerHTML = '';
      const totals = calculateTotals(businessState);
      const isIntra = isIntraState(businessState);

      const totalsDiv = el('div', { className: 'pos-cart-totals' });
      totalsDiv.innerHTML = `
        <div class="total-line"><span>${tr('subtotal')}</span><span>${currency(totals.subtotal)}</span></div>
        <div class="total-line"><span>${tr('discount')} ${discountType === 'percentage' ? '(' + discountValue + '%)' : ''}</span><span>${currency(totals.discountAmount)}</span></div>
        <div class="total-line"><span>${tr('taxable_amount')}</span><span>${currency(totals.taxableAmount)}</span></div>
        ${isIntra ? `
          <div class="total-line"><span>${tr('cgst')}</span><span>${currency(totals.cgst)}</span></div>
          <div class="total-line"><span>${tr('sgst')}</span><span>${currency(totals.sgst)}</span></div>
        ` : `
          <div class="total-line"><span>${tr('igst')}</span><span>${currency(totals.igst)}</span></div>
        `}
        <div class="total-line grand"><span>${tr('grand_total')}</span><span>${currency(totals.grandTotal)}</span></div>`;
      cartFooter.appendChild(totalsDiv);

      // Payment + discount row
      const extraRow = el('div', { className: 'pos-meta-row', style: { marginTop: '8px' } });
      const payModes = ['Cash', 'UPI', 'Bank Transfer', 'Credit', 'Cheque'];
      const payKeys = ['cash', 'upi', 'bank_transfer', 'credit', 'cheque'];
      extraRow.innerHTML = `
        <div class="form-group">
          <label class="form-label">${tr('payment_mode')}</label>
          <select class="form-select" id="billPayment">
            ${payModes.map((m, i) => `<option value="${m}" ${paymentMode === m ? 'selected' : ''}>${tr(payKeys[i])}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">${tr('invoice_discount')}</label>
          <div style="display:flex;gap:4px">
            <select class="form-select" id="billDiscType" style="width:50px">
              <option value="percentage" ${discountType === 'percentage' ? 'selected' : ''}>%</option>
              <option value="amount" ${discountType === 'amount' ? 'selected' : ''}>₹</option>
            </select>
            <input type="number" class="form-input" id="billDiscVal" value="${discountValue}" min="0" step="0.01">
          </div>
        </div>`;
      cartFooter.appendChild(extraRow);

      document.getElementById('billPayment')?.addEventListener('change', (e) => {
        paymentMode = e.target.value;
        const masterDisc = paymentDiscountMaster[paymentMode];
        if (masterDisc !== undefined && masterDisc > 0) {
          discountType = 'percentage';
          discountValue = masterDisc;
        } else {
          discountType = 'percentage';
          discountValue = 0;
        }
        renderCart();
      });
      document.getElementById('billDiscType')?.addEventListener('change', (e) => { discountType = e.target.value; renderCart(); });
      document.getElementById('billDiscVal')?.addEventListener('change', (e) => { discountValue = Number(e.target.value) || 0; renderCart(); });

      // Action buttons
      const actions = el('div', { className: 'pos-cart-actions' });
      actions.appendChild(el('button', { className: 'btn btn-outline btn-sm', onClick: () => { reset(); TE.App.navigate('billing'); } }, tr('clear_bill')));
      actions.appendChild(el('button', { className: 'btn btn-warning btn-sm', onClick: () => saveBill('draft', container, businessState) }, tr('save_draft')));
      actions.appendChild(el('button', { className: 'btn btn-success', onClick: () => saveBill('posted', container, businessState) }, tr('post_invoice')));
      cartFooter.appendChild(actions);
    }

    renderCart();

    posRight.appendChild(cartDiv);
    posLayout.appendChild(posLeft);
    posLayout.appendChild(posRight);
    wrapper.appendChild(posLayout);

    container.appendChild(wrapper);

    document.getElementById('billDate')?.addEventListener('change', (e) => { invoiceDate = e.target.value; });
  }

  function addLineItem(product) {
    const existing = lineItems.find(l => l.sku_code === product.sku_code);
    if (existing) { existing.quantity += 1; return; }
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
    return gross - gross * (item.discount || 0) / 100;
  }

  function isIntraState(businessStateCode) {
    if (!selectedCustomer || !selectedCustomer.state_code) return true;
    return selectedCustomer.state_code === businessStateCode;
  }

  function calculateTotals(businessStateCode) {
    let subtotal = 0;
    let cgst = 0, sgst = 0, igst = 0;
    const intra = isIntraState(businessStateCode);

    for (const item of lineItems) subtotal += calcLineTotal(item);

    let discountAmount = discountType === 'percentage' ? subtotal * discountValue / 100 : discountValue;
    const taxableAmount = subtotal - discountAmount;

    for (const item of lineItems) {
      const lineVal = calcLineTotal(item);
      const proportion = taxableAmount > 0 ? lineVal / subtotal : 0;
      const lineTaxable = taxableAmount * proportion;
      const tax = lineTaxable * item.gst_rate / 100;
      if (intra) { cgst += tax / 2; sgst += tax / 2; }
      else { igst += tax; }
    }

    const totalTax = cgst + sgst + igst;
    const r = (n) => Math.round(n * 100) / 100;
    return {
      subtotal: r(subtotal), discountAmount: r(discountAmount), taxableAmount: r(taxableAmount),
      cgst: r(cgst), sgst: r(sgst), igst: r(igst), totalTax: r(totalTax), grandTotal: r(taxableAmount + totalTax),
    };
  }

  async function saveBill(status, container, businessStateCode) {
    const tr = TE.Lang.t;
    paymentMode = document.getElementById('billPayment')?.value || paymentMode;
    notes = document.getElementById('billNotes')?.value || notes;

    if (!selectedCustomer) { toast(tr('select_customer_first'), 'error'); return; }
    if (lineItems.length === 0) { toast(tr('add_items_first'), 'error'); return; }

    const totals = calculateTotals(businessStateCode);
    const intra = isIntraState(businessStateCode);

    const header = {
      invoice_number: invoiceNumber, invoice_date: invoiceDate,
      customer_id: selectedCustomer.customer_id, customer_name: selectedCustomer.customer_name,
      customer_gstin: selectedCustomer.gstin || '', customer_address: selectedCustomer.billing_address || '',
      customer_state: selectedCustomer.state || '', customer_state_code: selectedCustomer.state_code || '',
      subtotal: totals.subtotal, discount_type: discountType, discount_value: discountValue,
      discount_amount: totals.discountAmount, taxable_amount: totals.taxableAmount,
      cgst_amount: totals.cgst, sgst_amount: totals.sgst, igst_amount: totals.igst,
      total_tax: totals.totalTax, total_amount: totals.grandTotal,
      payment_mode: paymentMode, notes: notes, status: status,
      is_intra_state: intra, created_at: new Date().toISOString(),
    };

    const details = lineItems.map((item, idx) => {
      const lineVal = calcLineTotal(item);
      const proportion = totals.subtotal > 0 ? lineVal / totals.subtotal : 0;
      const lineTaxable = totals.taxableAmount * proportion;
      const tax = lineTaxable * item.gst_rate / 100;
      return {
        id: item.id, invoice_number: invoiceNumber, sr_no: idx + 1,
        sku_code: item.sku_code, product_name: item.product_name, hsn_code: item.hsn_code,
        quantity: item.quantity, unit: item.unit, rate: item.rate, discount: item.discount,
        taxable_value: Math.round(lineTaxable * 100) / 100, gst_rate: item.gst_rate,
        cgst_amount: intra ? Math.round(tax / 2 * 100) / 100 : 0,
        sgst_amount: intra ? Math.round(tax / 2 * 100) / 100 : 0,
        igst_amount: intra ? 0 : Math.round(tax * 100) / 100,
        line_total: Math.round((lineTaxable + tax) * 100) / 100,
      };
    });

    await TE.Store.put('sales_header', header);
    for (const d of details) await TE.Store.put('sales_details', d);

    if (status === 'posted') {
      for (const item of lineItems) {
        await TE.Store.addStockEntry({
          date: invoiceDate, sku_code: item.sku_code, type: 'sale',
          reference_number: invoiceNumber, quantity_in: 0, quantity_out: item.quantity,
          notes: `Sale to ${selectedCustomer.customer_name}`,
        });
      }
      await TE.Store.incrementInvoiceNumber();
    }

    if (status === 'posted') {
      toast(tr('invoice_posted'), 'success');
      TE.PDF.generateInvoice(header, details);
    } else {
      toast(tr('draft_saved'), 'info');
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
      id: d.id, sku_code: d.sku_code, product_name: d.product_name, hsn_code: d.hsn_code,
      quantity: d.quantity, unit: d.unit, rate: d.rate, mrp: 0, gst_rate: d.gst_rate, discount: d.discount || 0,
    }));
  }

  return { render, reset };
})();
