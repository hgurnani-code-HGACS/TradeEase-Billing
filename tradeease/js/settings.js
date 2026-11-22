TE.Settings = (function () {
  const { el, toast } = TE.Utils;

  async function render(container) {
    container.innerHTML = '';

    const fields = [
      { key: 'business_name', label: 'Business Name', type: 'text' },
      { key: 'business_address', label: 'Business Address', type: 'textarea' },
      { key: 'business_gstin', label: 'GSTIN', type: 'text' },
      { key: 'business_state', label: 'State', type: 'text' },
      { key: 'business_state_code', label: 'State Code', type: 'text' },
      { key: 'business_phone', label: 'Phone', type: 'text' },
      { key: 'business_email', label: 'Email', type: 'text' },
      { key: 'business_bank_name', label: 'Bank Name', type: 'text' },
      { key: 'business_account_number', label: 'Account Number', type: 'text' },
      { key: 'business_ifsc', label: 'IFSC Code', type: 'text' },
      { key: 'business_upi', label: 'UPI ID', type: 'text' },
      { key: 'invoice_prefix', label: 'Invoice Prefix', type: 'text' },
      { key: 'next_invoice_number', label: 'Next Invoice Number', type: 'number' },
    ];

    const card = el('div', { className: 'card', style: { maxWidth: '700px' } });
    card.innerHTML = '<div class="card-header"><h3>Business Settings</h3></div>';
    const body = el('div', { className: 'card-body' });

    body.innerHTML = '<p class="text-sm text-secondary mb-16">Configure your business details. These appear on invoices and reports.</p>';

    for (const f of fields) {
      const val = await TE.Store.getSetting(f.key);
      const group = el('div', { className: 'form-group' });
      group.innerHTML = `<label class="form-label">${f.label}</label>`;
      if (f.type === 'textarea') {
        group.innerHTML += `<textarea class="form-input form-textarea" data-key="${f.key}" rows="2">${val || ''}</textarea>`;
      } else {
        group.innerHTML += `<input type="${f.type}" class="form-input" data-key="${f.key}" value="${val || ''}">`;
      }
      body.appendChild(group);
    }

    const saveBtn = el('button', { className: 'btn btn-primary', onClick: async () => {
      const inputs = body.querySelectorAll('[data-key]');
      for (const inp of inputs) {
        let val = inp.value.trim();
        if (inp.type === 'number') val = Number(val) || 0;
        await TE.Store.setSetting(inp.dataset.key, val);
      }
      toast('Settings saved', 'success');
    }}, 'Save Settings');
    body.appendChild(el('div', { className: 'mt-16' }, [saveBtn]));

    card.appendChild(body);
    container.appendChild(card);

    await renderDiscountCard(container);

    await renderSyncCard(container);

    const dangerCard = el('div', { className: 'card', style: { maxWidth: '700px', marginTop: '20px' } });
    dangerCard.innerHTML = '<div class="card-header"><h3>Data Management</h3></div>';
    const dangerBody = el('div', { className: 'card-body' });
    dangerBody.innerHTML = `
      <p class="text-sm text-secondary mb-16">Export or clear application data.</p>
      <div class="btn-row">
        <button class="btn btn-outline" id="exportDataBtn">Export All Data (JSON)</button>
        <button class="btn btn-outline" id="importDataBtn">Import Data (JSON)</button>
      </div>`;
    dangerCard.appendChild(dangerBody);
    container.appendChild(dangerCard);

    document.getElementById('exportDataBtn')?.addEventListener('click', exportData);
    document.getElementById('importDataBtn')?.addEventListener('click', importData);
  }

  async function renderDiscountCard(container) {
    const t = TE.Lang.t;
    const payModes = ['Cash', 'UPI', 'Bank Transfer', 'Credit', 'Cheque'];
    const payKeys = ['cash', 'upi', 'bank_transfer', 'credit', 'cheque'];
    const master = (await TE.Store.getSetting('payment_discount_master')) || {};

    const dCard = el('div', { className: 'card', style: { maxWidth: '700px', marginTop: '20px' } });
    dCard.innerHTML = `<div class="card-header"><h3>${t('payment_discount_config')}</h3></div>`;
    const dBody = el('div', { className: 'card-body' });
    dBody.innerHTML = `<p class="text-sm text-secondary mb-16">${t('payment_discount_hint')}</p>`;

    const tbl = el('table');
    tbl.innerHTML = `<thead><tr><th>${t('payment_mode')}</th><th class="text-right">${t('default_discount_pct')}</th></tr></thead>`;
    const tbody = el('tbody');
    payModes.forEach((mode, i) => {
      const tr = el('tr');
      const val = master[mode] !== undefined ? master[mode] : 0;
      tr.innerHTML = `<td>${t(payKeys[i])}</td><td class="text-right"><input type="number" class="form-input" data-pay-mode="${mode}" value="${val}" min="0" max="100" step="0.5" style="width:80px;display:inline-block;text-align:right"></td>`;
      tbody.appendChild(tr);
    });
    tbl.appendChild(tbody);
    dBody.appendChild(el('div', { className: 'table-wrap mb-16' }, [tbl]));

    const saveBtn = el('button', { className: 'btn btn-primary', onClick: async () => {
      const inputs = dBody.querySelectorAll('[data-pay-mode]');
      const newMaster = {};
      inputs.forEach(inp => { newMaster[inp.dataset.payMode] = Number(inp.value) || 0; });
      await TE.Store.setSetting('payment_discount_master', newMaster);
      toast(t('discount_config_saved'), 'success');
    }}, t('save_discount_config'));
    dBody.appendChild(el('div', { className: 'mt-16' }, [saveBtn]));

    dCard.appendChild(dBody);
    container.appendChild(dCard);
  }

  async function renderSyncCard(container) {
    const syncUrl = await TE.Store.getSetting('sync_script_url') || '';
    const syncInfo = await TE.Sync.getLastSyncInfo();

    const syncCard = el('div', { className: 'card', style: { maxWidth: '700px', marginTop: '20px' } });
    syncCard.innerHTML = '<div class="card-header"><h3>Google Sheets Sync</h3></div>';
    const syncBody = el('div', { className: 'card-body' });

    const setupSteps = `
      <div class="sync-setup mb-16" style="background:var(--bg);border-radius:var(--radius-sm);padding:14px;border:1px solid var(--border)">
        <p class="fw-600 mb-8" style="font-size:.88rem">Setup Steps:</p>
        <ol style="margin-left:18px;font-size:.82rem;color:var(--text-secondary);line-height:1.8">
          <li>Create a new Google Spreadsheet</li>
          <li>Go to <strong>Extensions &gt; Apps Script</strong></li>
          <li>Paste the code from <code>apps-script/Code.gs</code></li>
          <li>Click <strong>Deploy &gt; New deployment</strong> &gt; Web app</li>
          <li>Set Execute as: <strong>Me</strong>, Access: <strong>Anyone</strong></li>
          <li>Copy the Web app URL and paste it below</li>
        </ol>
      </div>`;

    let lastSyncHtml = '';
    if (syncInfo.pushTime || syncInfo.pullTime) {
      const pushStr = syncInfo.pushTime ? TE.Utils.dateStr(syncInfo.pushTime.split('T')[0]) + ' ' + syncInfo.pushTime.split('T')[1]?.substring(0, 8) : 'Never';
      const pullStr = syncInfo.pullTime ? TE.Utils.dateStr(syncInfo.pullTime.split('T')[0]) + ' ' + syncInfo.pullTime.split('T')[1]?.substring(0, 8) : 'Never';
      lastSyncHtml = `
        <div class="mb-16" style="display:flex;gap:20px;font-size:.82rem;color:var(--text-secondary)">
          <span>Last push: <strong>${pushStr}</strong></span>
          <span>Last pull: <strong>${pullStr}</strong></span>
        </div>`;
    }

    syncBody.innerHTML = `
      <p class="text-sm text-secondary mb-16">Connect to Google Sheets to keep your data backed up and editable in a spreadsheet.</p>
      ${syncUrl ? '' : setupSteps}
      <div class="form-group">
        <label class="form-label">Apps Script Web App URL</label>
        <input type="url" class="form-input" id="syncUrlInput" value="${syncUrl}" placeholder="https://script.google.com/macros/s/.../exec">
      </div>
      <div class="btn-row mb-16">
        <button class="btn btn-primary btn-sm" id="syncSaveUrlBtn">Save URL</button>
        <button class="btn btn-outline btn-sm" id="syncTestBtn" ${!syncUrl ? 'disabled' : ''}>Test Connection</button>
      </div>
      ${lastSyncHtml}
      <div id="syncStatus" class="mb-16" style="display:none"></div>
      <div id="syncProgress" class="mb-16" style="display:none"></div>
      <div class="btn-row">
        <button class="btn btn-success" id="syncPushBtn" ${!syncUrl ? 'disabled' : ''}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/></svg>
          Push to Sheets
        </button>
        <button class="btn btn-accent btn-outline" id="syncPullBtn" ${!syncUrl ? 'disabled' : ''}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="8 17 12 21 16 17"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.88 18.09A5 5 0 0018 9h-1.26A8 8 0 103 16.29"/></svg>
          Pull from Sheets
        </button>
      </div>
      <p class="form-hint mt-16"><strong>Push</strong> uploads all local data to Google Sheets (overwrites sheet contents).<br><strong>Pull</strong> downloads all data from Google Sheets into the app (overwrites local data).</p>`;

    syncCard.appendChild(syncBody);
    container.appendChild(syncCard);

    document.getElementById('syncSaveUrlBtn')?.addEventListener('click', async () => {
      const url = document.getElementById('syncUrlInput').value.trim();
      await TE.Store.setSetting('sync_script_url', url);
      const hasUrl = !!url;
      document.getElementById('syncTestBtn').disabled = !hasUrl;
      document.getElementById('syncPushBtn').disabled = !hasUrl;
      document.getElementById('syncPullBtn').disabled = !hasUrl;
      toast(hasUrl ? 'Sync URL saved' : 'Sync URL cleared', 'success');
      updateSyncIndicator();
    });

    document.getElementById('syncTestBtn')?.addEventListener('click', async () => {
      const statusEl = document.getElementById('syncStatus');
      statusEl.style.display = 'block';
      statusEl.innerHTML = '<span class="badge badge-info">Testing connection...</span>';
      try {
        const result = await TE.Sync.ping();
        if (result.ok) {
          statusEl.innerHTML = '<span class="badge badge-success">Connected successfully! Sheets ready.</span>';
        } else {
          statusEl.innerHTML = '<span class="badge badge-danger">Connection failed: ' + (result.error || 'Unknown error') + '</span>';
        }
      } catch (err) {
        statusEl.innerHTML = '<span class="badge badge-danger">Connection failed: ' + err.message + '</span>';
      }
    });

    document.getElementById('syncPushBtn')?.addEventListener('click', async () => {
      if (TE.Sync.isSyncing()) return;
      const progressEl = document.getElementById('syncProgress');
      const pushBtn = document.getElementById('syncPushBtn');
      pushBtn.disabled = true;
      pushBtn.textContent = 'Pushing...';
      progressEl.style.display = 'block';

      try {
        const result = await TE.Sync.pushAll((table, current, total) => {
          progressEl.innerHTML = `<div class="sync-progress-bar"><div class="sync-progress-fill" style="width:${(current / total) * 100}%"></div></div><span class="text-sm text-secondary">Syncing ${table}... (${current}/${total})</span>`;
        });
        progressEl.style.display = 'none';
        toast('All data pushed to Google Sheets!', 'success');
        updateSyncIndicator();
        TE.App.navigate('settings');
      } catch (err) {
        progressEl.innerHTML = '<span class="badge badge-danger">Push failed: ' + err.message + '</span>';
        toast('Push failed: ' + err.message, 'error');
      } finally {
        pushBtn.disabled = false;
        pushBtn.textContent = 'Push to Sheets';
      }
    });

    document.getElementById('syncPullBtn')?.addEventListener('click', async () => {
      if (TE.Sync.isSyncing()) return;

      TE.Utils.confirm('Pull from Sheets will overwrite all local data. Are you sure?', async () => {
        const progressEl = document.getElementById('syncProgress');
        const pullBtn = document.getElementById('syncPullBtn');
        pullBtn.disabled = true;
        pullBtn.textContent = 'Pulling...';
        progressEl.style.display = 'block';

        try {
          await TE.Sync.pullAll((table, current, total) => {
            progressEl.innerHTML = `<div class="sync-progress-bar"><div class="sync-progress-fill" style="width:${(current / total) * 100}%"></div></div><span class="text-sm text-secondary">Importing ${table}... (${current}/${total})</span>`;
          });
          progressEl.style.display = 'none';
          toast('All data pulled from Google Sheets!', 'success');
          updateSyncIndicator();
          TE.App.navigate('settings');
        } catch (err) {
          progressEl.innerHTML = '<span class="badge badge-danger">Pull failed: ' + err.message + '</span>';
          toast('Pull failed: ' + err.message, 'error');
        } finally {
          pullBtn.disabled = false;
          pullBtn.textContent = 'Pull from Sheets';
        }
      });
    });
  }

  async function updateSyncIndicator() {
    const indicator = document.getElementById('syncIndicator');
    if (!indicator) return;
    const url = await TE.Store.getSetting('sync_script_url');
    if (!url) {
      indicator.style.display = 'none';
      return;
    }
    indicator.style.display = 'flex';
    const info = await TE.Sync.getLastSyncInfo();
    const lastTime = info.pushTime || info.pullTime;
    if (lastTime) {
      const d = new Date(lastTime);
      const mins = Math.round((Date.now() - d.getTime()) / 60000);
      indicator.title = mins < 60 ? `Synced ${mins}m ago` : `Synced ${Math.round(mins / 60)}h ago`;
      indicator.classList.add('synced');
    } else {
      indicator.title = 'Google Sheets connected – not yet synced';
      indicator.classList.remove('synced');
    }
  }

  async function exportData() {
    const stores = ['products', 'categories', 'customers', 'sales_header', 'sales_details', 'stock_ledger', 'settings'];
    const data = {};
    for (const s of stores) {
      data[s] = await TE.Store.getAll(s);
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tradeease-backup-' + new Date().toISOString().split('T')[0] + '.json';
    a.click();
    URL.revokeObjectURL(url);
    toast('Data exported', 'success');
  }

  function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        const stores = ['products', 'categories', 'customers', 'sales_header', 'sales_details', 'stock_ledger', 'settings'];
        for (const s of stores) {
          if (data[s] && Array.isArray(data[s])) {
            for (const item of data[s]) {
              await TE.Store.put(s, item);
            }
          }
        }
        toast('Data imported successfully', 'success');
        TE.App.navigate('settings');
      } catch (err) {
        toast('Invalid JSON file', 'error');
      }
    });
    input.click();
  }

  return { render, updateSyncIndicator };
})();
