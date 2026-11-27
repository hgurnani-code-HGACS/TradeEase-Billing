TE.Reports = (function () {
  const { el, currency, dateStr, today } = TE.Utils;

  async function render(container) {
    container.innerHTML = '';

    const tabs = el('div', { className: 'tabs' });
    const reports = [
      { id: 'daily', label: 'Daily Sales' },
      { id: 'monthly', label: 'Monthly Summary' },
      { id: 'productwise', label: 'Product-wise Sales' },
      { id: 'stock', label: 'Stock Report' },
    ];

    const content = el('div');
    let active = 'daily';

    function renderTabs() {
      tabs.innerHTML = '';
      reports.forEach(r => {
        const btn = el('button', {
          className: r.id === active ? 'active' : '',
          onClick: () => { active = r.id; renderTabs(); renderReport(); },
        }, r.label);
        tabs.appendChild(btn);
      });
    }

    async function renderReport() {
      content.innerHTML = '';
      const invoices = (await TE.Store.getAll('sales_header')).filter(i => i.status === 'posted');
      const allDetails = await TE.Store.getAll('sales_details');

      if (active === 'daily') {
        const dateInput = el('input', { type: 'date', className: 'form-input', value: today(), style: { maxWidth: '200px', marginBottom: '16px' } });
        content.appendChild(dateInput);

        async function showDaily() {
          const date = dateInput.value;
          const dayInv = invoices.filter(i => i.invoice_date === date);
          const totalAmt = dayInv.reduce((s, i) => s + i.total_amount, 0);
          const totalTax = dayInv.reduce((s, i) => s + i.total_tax, 0);

          let existing = content.querySelector('.report-result');
          if (existing) existing.remove();

          const result = el('div', { className: 'report-result' });
          const statRow = el('div', { className: 'stats-grid mb-16' });
          statRow.innerHTML = `
            <div class="stat-card stat-success"><div class="stat-label">Total Sales</div><div class="stat-value">${currency(totalAmt)}</div></div>
            <div class="stat-card stat-accent"><div class="stat-label">Invoice Count</div><div class="stat-value">${dayInv.length}</div></div>
            <div class="stat-card stat-warning"><div class="stat-label">Total Tax</div><div class="stat-value">${currency(totalTax)}</div></div>`;
          result.appendChild(statRow);

          if (dayInv.length > 0) {
            const card = el('div', { className: 'card' });
            const wrap = el('div', { className: 'card-body no-pad table-wrap' });
            const t = el('table');
            t.innerHTML = `<thead><tr><th>Invoice</th><th>Customer</th><th>Payment</th><th class="text-right">Taxable</th><th class="text-right">Tax</th><th class="text-right">Total</th></tr></thead>`;
            const tbody = el('tbody');
            dayInv.forEach(i => {
              const tr = el('tr');
              tr.innerHTML = `<td class="fw-600">${i.invoice_number}</td><td>${(TE.Lang.getLang() === 'hi' && i.customer_name_hi) ? i.customer_name_hi : i.customer_name}</td><td>${i.payment_mode}</td><td class="text-right">${currency(i.taxable_amount)}</td><td class="text-right">${currency(i.total_tax)}</td><td class="text-right fw-600">${currency(i.total_amount)}</td>`;
              tbody.appendChild(tr);
            });
            t.appendChild(tbody);
            wrap.appendChild(t);
            card.appendChild(wrap);
            result.appendChild(card);
          }
          content.appendChild(result);
        }

        dateInput.addEventListener('change', showDaily);
        showDaily();
      }

      else if (active === 'monthly') {
        const months = {};
        invoices.forEach(i => {
          const m = i.invoice_date ? i.invoice_date.substring(0, 7) : 'Unknown';
          if (!months[m]) months[m] = { count: 0, total: 0, tax: 0 };
          months[m].count++;
          months[m].total += i.total_amount;
          months[m].tax += i.total_tax;
        });
        const sorted = Object.entries(months).sort((a, b) => b[0].localeCompare(a[0]));
        const card = el('div', { className: 'card' });
        const wrap = el('div', { className: 'card-body no-pad table-wrap' });
        const t = el('table');
        t.innerHTML = `<thead><tr><th>Month</th><th class="text-right">Invoices</th><th class="text-right">Tax</th><th class="text-right">Total Sales</th></tr></thead>`;
        const tbody = el('tbody');
        sorted.forEach(([m, d]) => {
          const tr = el('tr');
          tr.innerHTML = `<td class="fw-600">${m}</td><td class="text-right">${d.count}</td><td class="text-right">${currency(d.tax)}</td><td class="text-right fw-600">${currency(d.total)}</td>`;
          tbody.appendChild(tr);
        });
        t.appendChild(tbody);
        wrap.appendChild(t);
        card.appendChild(wrap);
        content.appendChild(card);
      }

      else if (active === 'productwise') {
        const invoiceNumbers = new Set(invoices.map(i => i.invoice_number));
        const relevantDetails = allDetails.filter(d => invoiceNumbers.has(d.invoice_number));
        const productSales = {};
        relevantDetails.forEach(d => {
          if (!productSales[d.sku_code]) {
            productSales[d.sku_code] = { sku: d.sku_code, name: (TE.Lang.getLang() === 'hi' && d.product_name_hi) ? d.product_name_hi : d.product_name, qty: 0, value: 0 };
          }
          productSales[d.sku_code].qty += d.quantity;
          productSales[d.sku_code].value += d.line_total;
        });
        const sorted = Object.values(productSales).sort((a, b) => b.value - a.value);
        const card = el('div', { className: 'card' });
        const wrap = el('div', { className: 'card-body no-pad table-wrap' });
        const t = el('table');
        t.innerHTML = `<thead><tr><th>SKU</th><th>Product</th><th class="text-right">Qty Sold</th><th class="text-right">Total Value</th></tr></thead>`;
        const tbody = el('tbody');
        sorted.forEach(p => {
          const tr = el('tr');
          tr.innerHTML = `<td class="fw-600">${p.sku}</td><td>${p.name}</td><td class="text-right">${p.qty}</td><td class="text-right fw-600">${currency(p.value)}</td>`;
          tbody.appendChild(tr);
        });
        t.appendChild(tbody);
        wrap.appendChild(t);
        card.appendChild(wrap);
        content.appendChild(card);
      }

      else if (active === 'stock') {
        const products = await TE.Store.getAll('products');
        const stockEntries = await TE.Store.getAll('stock_ledger');
        const balances = {};
        stockEntries.forEach(e => {
          if (!balances[e.sku_code]) balances[e.sku_code] = 0;
          balances[e.sku_code] += (e.quantity_in || 0) - (e.quantity_out || 0);
        });
        const card = el('div', { className: 'card' });
        const wrap = el('div', { className: 'card-body no-pad table-wrap' });
        const t = el('table');
        t.innerHTML = `<thead><tr><th>SKU</th><th>Product</th><th class="text-right">Current Stock</th><th class="text-right">Min Level</th><th>Status</th><th class="text-right">Stock Value</th></tr></thead>`;
        const tbody = el('tbody');
        products.filter(p => p.status === 'active').forEach(p => {
          const bal = balances[p.sku_code] || 0;
          const isLow = bal <= (p.min_stock_level || 0);
          const tr = el('tr');
          tr.innerHTML = `<td class="fw-600">${p.sku_code}</td><td>${(TE.Lang.getLang() === 'hi' && p.product_name_hi) ? p.product_name_hi : p.product_name}</td><td class="text-right fw-600 ${isLow ? 'text-danger' : ''}">${bal}</td><td class="text-right">${p.min_stock_level || 0}</td><td>${isLow ? '<span class="badge badge-danger">Low</span>' : '<span class="badge badge-success">OK</span>'}</td><td class="text-right">${currency(bal * p.purchase_price)}</td>`;
          tbody.appendChild(tr);
        });
        t.appendChild(tbody);
        wrap.appendChild(t);
        card.appendChild(wrap);
        content.appendChild(card);
      }
    }

    renderTabs();
    container.appendChild(tabs);
    container.appendChild(content);
    renderReport();
  }

  return { render };
})();
