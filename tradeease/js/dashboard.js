TE.Dashboard = (function () {
  const { el, currency, dateStr, today } = TE.Utils;

  async function render(container) {
    const products = await TE.Store.getAll('products');
    const customers = await TE.Store.getAll('customers');
    const invoices = await TE.Store.getAll('sales_header');
    const stockEntries = await TE.Store.getAll('stock_ledger');

    const postedInvoices = invoices.filter(i => i.status === 'posted');
    const todayStr = today();
    const todaySales = postedInvoices.filter(i => i.invoice_date === todayStr);
    const todayTotal = todaySales.reduce((s, i) => s + i.total_amount, 0);

    const thisMonth = todayStr.substring(0, 7);
    const monthSales = postedInvoices.filter(i => i.invoice_date && i.invoice_date.startsWith(thisMonth));
    const monthTotal = monthSales.reduce((s, i) => s + i.total_amount, 0);

    const totalRevenue = postedInvoices.reduce((s, i) => s + i.total_amount, 0);

    const stockBalances = {};
    for (const e of stockEntries) {
      if (!stockBalances[e.sku_code]) stockBalances[e.sku_code] = 0;
      stockBalances[e.sku_code] += (e.quantity_in || 0) - (e.quantity_out || 0);
    }
    const lowStockProducts = products.filter(p =>
      p.status === 'active' && (stockBalances[p.sku_code] || 0) <= (p.min_stock_level || 0)
    );

    container.innerHTML = '';

    const stats = el('div', { className: 'stats-grid' });
    stats.innerHTML = `
      <div class="stat-card stat-success">
        <div class="stat-label">Today's Sales</div>
        <div class="stat-value">${currency(todayTotal)}</div>
        <div class="stat-sub">${todaySales.length} invoice(s)</div>
      </div>
      <div class="stat-card stat-accent">
        <div class="stat-label">This Month</div>
        <div class="stat-value">${currency(monthTotal)}</div>
        <div class="stat-sub">${monthSales.length} invoice(s)</div>
      </div>
      <div class="stat-card stat-warning">
        <div class="stat-label">Total Revenue</div>
        <div class="stat-value">${currency(totalRevenue)}</div>
        <div class="stat-sub">${postedInvoices.length} total invoices</div>
      </div>
      <div class="stat-card ${lowStockProducts.length > 0 ? 'stat-danger' : 'stat-success'}">
        <div class="stat-label">Low Stock Alerts</div>
        <div class="stat-value">${lowStockProducts.length}</div>
        <div class="stat-sub">of ${products.filter(p => p.status === 'active').length} active products</div>
      </div>`;
    container.appendChild(stats);

    const grid = el('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' } });

    const recentCard = el('div', { className: 'card' });
    recentCard.innerHTML = `<div class="card-header"><h3>Recent Invoices</h3></div>`;
    const recentBody = el('div', { className: 'card-body no-pad table-wrap' });
    const recent = postedInvoices.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')).slice(0, 8);

    if (recent.length === 0) {
      recentBody.innerHTML = '<div class="empty-state"><p>No invoices yet</p></div>';
    } else {
      const t = el('table');
      t.innerHTML = '<thead><tr><th>Invoice</th><th>Customer</th><th>Date</th><th class="text-right">Amount</th></tr></thead>';
      const tbody = el('tbody');
      for (const inv of recent) {
        const tr = el('tr');
        tr.innerHTML = `<td class="fw-600">${inv.invoice_number}</td><td>${inv.customer_name}</td><td>${dateStr(inv.invoice_date)}</td><td class="text-right fw-600">${currency(inv.total_amount)}</td>`;
        tbody.appendChild(tr);
      }
      t.appendChild(tbody);
      recentBody.appendChild(t);
    }
    recentCard.appendChild(recentBody);

    const lowStockCard = el('div', { className: 'card' });
    lowStockCard.innerHTML = `<div class="card-header"><h3>Low Stock Products</h3></div>`;
    const lowBody = el('div', { className: 'card-body no-pad table-wrap' });

    if (lowStockProducts.length === 0) {
      lowBody.innerHTML = '<div class="empty-state" style="padding:24px"><p>All stock levels are healthy</p></div>';
    } else {
      const t = el('table');
      t.innerHTML = '<thead><tr><th>SKU</th><th>Product</th><th class="text-right">Stock</th><th class="text-right">Min</th></tr></thead>';
      const tbody = el('tbody');
      for (const p of lowStockProducts.slice(0, 10)) {
        const bal = stockBalances[p.sku_code] || 0;
        const tr = el('tr');
        tr.innerHTML = `<td class="fw-600">${p.sku_code}</td><td>${p.product_name}</td><td class="text-right text-danger fw-600">${bal}</td><td class="text-right">${p.min_stock_level}</td>`;
        tbody.appendChild(tr);
      }
      t.appendChild(tbody);
      lowBody.appendChild(t);
    }
    lowStockCard.appendChild(lowBody);

    grid.appendChild(recentCard);
    grid.appendChild(lowStockCard);
    container.appendChild(grid);

    const quickStats = el('div', { className: 'stats-grid', style: { marginTop: '20px' } });
    quickStats.innerHTML = `
      <div class="stat-card">
        <div class="stat-label">Active Products</div>
        <div class="stat-value">${products.filter(p => p.status === 'active').length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Customers</div>
        <div class="stat-value">${customers.length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Draft Invoices</div>
        <div class="stat-value">${invoices.filter(i => i.status === 'draft').length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Credit Outstanding</div>
        <div class="stat-value">${currency(customers.reduce((s, c) => s + (c.opening_balance || 0), 0))}</div>
      </div>`;
    container.appendChild(quickStats);
  }

  return { render };
})();
