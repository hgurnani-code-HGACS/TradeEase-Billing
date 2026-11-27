TE.Invoices = (function () {
  const { el, currency, dateStr, toast, modal, confirm } = TE.Utils;

  let selectedCategory = null;
  let selectedProduct = null;
  let productSearchQuery = '';

  async function render(container) {
    const t = TE.Lang.t;
    const invoices = await TE.Store.getAll('sales_header');
    invoices.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

    const allDetails = await TE.Store.getAll('sales_details');
    const products = await TE.Store.getAll('products');
    const activeProducts = products.filter(p => p.status === 'active');
    const categories = await TE.Store.getAll('categories');

    const postedInvoices = invoices.filter(inv => inv.status === 'posted');
    const postedSet = new Set(postedInvoices.map(inv => inv.invoice_number));
    const invoiceMap = {};
    for (const inv of invoices) invoiceMap[inv.invoice_number] = inv;

    const productKPIs = {};
    for (const p of activeProducts) {
      const stock = await TE.Store.getStockBalance(p.sku_code);
      const details = allDetails.filter(d => d.sku_code === p.sku_code && postedSet.has(d.invoice_number));
      const totalSold = details.reduce((sum, d) => sum + (d.quantity || 0), 0);

      const withDate = details.map(d => ({ rate: d.rate || 0, inv: d.invoice_number, date: invoiceMap[d.invoice_number]?.created_at || '' }));
      withDate.sort((a, b) => b.date.localeCompare(a.date));
      const seen = new Set();
      const last5 = [];
      for (const d of withDate) {
        if (seen.size >= 5) break;
        if (!seen.has(d.inv)) { seen.add(d.inv); last5.push(d); }
      }
      const avgRate = last5.length > 0 ? last5.reduce((s, d) => s + d.rate, 0) / last5.length : 0;

      productKPIs[p.sku_code] = { stock, totalSold, avgRate };
    }

    container.innerHTML = '';

    const header = el('div', { className: 'flex-between mb-16' }, [
      el('h3', { className: 'section-title', style: { margin: 0 } }, `${t('invoice_history')} (${invoices.length})`),
      el('button', { className: 'btn btn-primary', onClick: () => TE.App.navigate('billing') }, '+ ' + t('new_invoice')),
    ]);
    container.appendChild(header);

    // Category strip
    const catStrip = el('div', { className: 'pos-categories' });
    const allBtn = el('button', {
      className: 'pos-cat-btn' + (selectedCategory === null ? ' active' : ''),
      onClick: () => { selectedCategory = null; selectedProduct = null; render(container); }
    }, t('all_products'));
    catStrip.appendChild(allBtn);
    categories.forEach(cat => {
      const catLabel = (TE.Lang.getLang() === 'hi' && cat.name_hi) ? cat.name_hi : cat.name;
      const btn = el('button', {
        className: 'pos-cat-btn' + (selectedCategory === cat.id ? ' active' : ''),
        onClick: () => { selectedCategory = cat.id; selectedProduct = null; render(container); }
      }, catLabel);
      catStrip.appendChild(btn);
    });
    container.appendChild(catStrip);

    // Product search
    const searchDiv = el('div', { className: 'pos-search', style: { marginBottom: '8px' } });
    const prodSearchInput = el('input', { type: 'text', placeholder: t('search_products'), value: productSearchQuery });
    prodSearchInput.addEventListener('input', () => {
      productSearchQuery = prodSearchInput.value;
      renderProductGrid();
    });
    searchDiv.appendChild(prodSearchInput);
    container.appendChild(searchDiv);

    // Product grid
    const gridDiv = el('div', { className: 'pos-product-grid', style: { maxHeight: '340px', flex: 'none' } });
    container.appendChild(gridDiv);

    function renderProductGrid() {
      gridDiv.innerHTML = '';
      let filtered = activeProducts;
      if (selectedCategory) filtered = filtered.filter(p => p.category === selectedCategory);
      if (productSearchQuery.trim()) {
        const words = productSearchQuery.trim().toLowerCase().split(/\s+/);
        filtered = filtered.filter(p => {
          const searchable = (p.sku_code + ' ' + p.product_name).toLowerCase();
          return words.every(w => searchable.includes(w));
        });
      }
      if (filtered.length === 0) {
        gridDiv.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><p>${t('no_products_in_category')}</p></div>`;
        return;
      }
      filtered.forEach(p => {
        const kpi = productKPIs[p.sku_code] || { stock: 0, totalSold: 0, avgRate: 0 };
        const isSelected = selectedProduct === p.sku_code;
        const card = el('div', { className: 'pos-product-card' + (isSelected ? ' selected' : '') });
        card.addEventListener('click', () => {
          selectedProduct = selectedProduct === p.sku_code ? null : p.sku_code;
          renderProductGrid();
          renderInvoiceTable();
        });

        const stockClass = kpi.stock <= 0 ? 'no-stock' : (kpi.stock <= (p.min_stock_level || 0) ? 'low-stock' : 'in-stock');
        const stockLabel = kpi.stock <= 0 ? t('out_of_stock') : `${t('stock')}: ${kpi.stock}`;

        const prodLabel = (TE.Lang.getLang() === 'hi' && p.product_name_hi) ? p.product_name_hi : p.product_name;
        card.innerHTML = `
          <div class="prod-name">${prodLabel}</div>
          <div class="prod-sku">${p.sku_code}</div>
          <span class="prod-stock ${stockClass}">${stockLabel}</span>
          <div class="prod-kpi">${t('sold')}: ${kpi.totalSold}</div>
          <div class="prod-kpi">${t('avg_rate')}: ${currency(kpi.avgRate)}</div>`;
        gridDiv.appendChild(card);
      });
    }

    renderProductGrid();

    // Filter indicator
    const filterBar = el('div', { id: 'invoiceFilterBar', style: { margin: '12px 0' } });
    container.appendChild(filterBar);

    // Invoice table
    const card = el('div', { className: 'card' });
    const tableWrap = el('div', { className: 'card-body no-pad table-wrap' });
    card.appendChild(tableWrap);
    container.appendChild(card);

    function renderInvoiceTable() {
      filterBar.innerHTML = '';
      let filteredInvoices = invoices;

      if (selectedProduct) {
        const matchingInvNos = new Set(allDetails.filter(d => d.sku_code === selectedProduct).map(d => d.invoice_number));
        filteredInvoices = invoices.filter(inv => matchingInvNos.has(inv.invoice_number));
        const prodName = activeProducts.find(p => p.sku_code === selectedProduct)?.product_name || selectedProduct;

        const badge = el('div', { style: 'display:inline-flex;align-items:center;gap:8px;padding:6px 12px;background:rgba(59,130,246,.08);border:1px solid var(--primary);border-radius:var(--radius);font-size:.85rem;color:var(--primary)' });
        badge.innerHTML = `<strong>${t('showing_invoices_for')}:</strong> ${prodName} (${filteredInvoices.length})`;
        const clearBtn = el('button', { className: 'btn btn-ghost btn-sm', style: 'padding:2px 8px;font-size:.78rem', onClick: () => { selectedProduct = null; renderProductGrid(); renderInvoiceTable(); } }, '✕ ' + t('clear_filter'));
        badge.appendChild(clearBtn);
        filterBar.appendChild(badge);
      }

      const headerH3 = container.querySelector('.section-title');
      headerH3.textContent = `${t('invoice_history')} (${filteredInvoices.length})`;

      tableWrap.innerHTML = '';

      if (filteredInvoices.length === 0) {
        tableWrap.innerHTML = `<div class="empty-state"><p>${t('no_invoices_yet')}</p></div>`;
        return;
      }

      const tbl = el('table');
      tbl.innerHTML = `<thead><tr>
        <th>${t('invoice_number')}</th><th>${t('invoice_date')}</th><th>${t('customer')}</th><th>${t('payment_mode')}</th>
        <th class="text-right">${t('amount')}</th><th>${t('status')}</th><th>${t('actions')}</th>
      </tr></thead>`;
      const tbody = el('tbody');

      for (const inv of filteredInvoices) {
        const tr = el('tr');
        const statusBadge = inv.status === 'posted'
          ? '<span class="badge badge-success">Posted</span>'
          : inv.status === 'cancelled'
          ? '<span class="badge badge-danger">Cancelled</span>'
          : '<span class="badge badge-warning">Draft</span>';

        tr.innerHTML = `
          <td class="fw-600">${inv.invoice_number}</td>
          <td>${dateStr(inv.invoice_date)}</td>
          <td>${inv.customer_name}</td>
          <td>${inv.payment_mode || 'Cash'}</td>
          <td class="text-right fw-600">${currency(inv.total_amount)}</td>
          <td>${statusBadge}</td>
          <td></td>`;

        const actCell = tr.lastElementChild;
        const btnRow = el('div', { className: 'btn-row' });

        if (inv.status === 'posted') {
          btnRow.appendChild(el('button', { className: 'btn btn-ghost btn-sm', onClick: () => viewInvoice(inv) }, 'View'));
          btnRow.appendChild(el('button', { className: 'btn btn-ghost btn-sm', onClick: () => reprintInvoice(inv) }, 'PDF'));
          btnRow.appendChild(el('button', { className: 'btn btn-ghost btn-sm text-danger', onClick: () => cancelInvoice(inv) }, t('cancel')));
        } else if (inv.status === 'draft') {
          btnRow.appendChild(el('button', { className: 'btn btn-ghost btn-sm', onClick: () => editDraft(inv) }, t('edit')));
          btnRow.appendChild(el('button', { className: 'btn btn-ghost btn-sm text-danger', onClick: () => deleteDraft(inv) }, t('delete')));
        }

        actCell.appendChild(btnRow);
        tbody.appendChild(tr);
      }
      tbl.appendChild(tbody);
      tableWrap.appendChild(tbl);
    }

    renderInvoiceTable();
  }

  async function viewInvoice(inv) {
    const t = TE.Lang.t;
    const details = await TE.Store.getByIndex('sales_details', 'invoice_number', inv.invoice_number);
    const content = el('div');

    let detailRows = '';
    details.forEach((d, i) => {
      detailRows += `<tr>
        <td>${i + 1}</td><td>${d.product_name}</td><td>${d.hsn_code || ''}</td>
        <td class="text-center">${d.quantity}</td><td>${d.unit || ''}</td>
        <td class="text-right">${currency(d.rate)}</td>
        <td class="text-right">${currency(d.taxable_value)}</td>
        <td class="text-right">${currency(d.line_total)}</td>
      </tr>`;
    });

    content.innerHTML = `
      <div class="form-row mb-16">
        <div><strong>${t('invoice_number')}:</strong> ${inv.invoice_number}</div>
        <div><strong>${t('invoice_date')}:</strong> ${dateStr(inv.invoice_date)}</div>
      </div>
      <div class="mb-16"><strong>${t('customer')}:</strong> ${inv.customer_name} ${inv.customer_gstin ? '(GSTIN: ' + inv.customer_gstin + ')' : ''}</div>
      <div class="table-wrap mb-16">
        <table>
          <thead><tr><th>#</th><th>${t('product')}</th><th>${t('hsn')}</th><th class="text-center">${t('qty')}</th><th>${t('unit')}</th><th class="text-right">${t('rate')}</th><th class="text-right">${t('taxable_amount')}</th><th class="text-right">${t('amount')}</th></tr></thead>
          <tbody>${detailRows}</tbody>
        </table>
      </div>
      <div style="text-align:right">
        <div class="mb-4"><strong>${t('subtotal')}:</strong> ${currency(inv.subtotal)}</div>
        ${inv.discount_amount > 0 ? `<div class="mb-4">${t('discount')}: -${currency(inv.discount_amount)}</div>` : ''}
        <div class="mb-4">${t('taxable_amount')}: ${currency(inv.taxable_amount)}</div>
        ${inv.cgst_amount > 0 ? `<div class="mb-4">${t('cgst')}: ${currency(inv.cgst_amount)}</div>` : ''}
        ${inv.sgst_amount > 0 ? `<div class="mb-4">${t('sgst')}: ${currency(inv.sgst_amount)}</div>` : ''}
        ${inv.igst_amount > 0 ? `<div class="mb-4">${t('igst')}: ${currency(inv.igst_amount)}</div>` : ''}
        <div class="fw-600" style="font-size:1.1rem;border-top:2px solid var(--primary);padding-top:8px;display:inline-block">${t('grand_total')}: ${currency(inv.total_amount)}</div>
      </div>`;

    const footer = el('div', { className: 'btn-row btn-row-right' }, [
      el('button', { className: 'btn btn-primary', onClick: () => { reprintInvoice(inv); m.remove(); } }, 'Download PDF'),
      el('button', { className: 'btn btn-outline', onClick: () => m.remove() }, t('cancel')),
    ]);
    const m = modal(t('invoice_number') + ' ' + inv.invoice_number, content, { footer, wide: true });
  }

  async function reprintInvoice(inv) {
    const details = await TE.Store.getByIndex('sales_details', 'invoice_number', inv.invoice_number);
    await TE.PDF.generateInvoice(inv, details);
    toast('PDF generated', 'success');
  }

  function cancelInvoice(inv) {
    confirm('Cancel invoice ' + inv.invoice_number + '? This will create a reversal entry.', async () => {
      inv.status = 'cancelled';
      await TE.Store.put('sales_header', inv);

      const details = await TE.Store.getByIndex('sales_details', 'invoice_number', inv.invoice_number);
      for (const d of details) {
        await TE.Store.addStockEntry({
          date: new Date().toISOString().split('T')[0],
          sku_code: d.sku_code,
          type: 'sale_cancel',
          reference_number: inv.invoice_number,
          quantity_in: d.quantity,
          quantity_out: 0,
          notes: 'Cancellation reversal of ' + inv.invoice_number,
        });
      }

      toast('Invoice cancelled and stock reversed', 'success');
      TE.App.navigate('invoices');
    });
  }

  function editDraft(inv) {
    TE.App.navigate('billing', inv);
  }

  function deleteDraft(inv) {
    confirm('Delete this draft invoice?', async () => {
      await TE.Store.del('sales_header', inv.invoice_number);
      const details = await TE.Store.getByIndex('sales_details', 'invoice_number', inv.invoice_number);
      for (const d of details) await TE.Store.del('sales_details', d.id);
      toast('Draft deleted', 'success');
      TE.App.navigate('invoices');
    });
  }

  return { render };
})();
