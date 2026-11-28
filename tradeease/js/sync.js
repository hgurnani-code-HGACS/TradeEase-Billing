TE.Sync = (function () {
  const TABLES = ['products', 'categories', 'customers', 'sales_header', 'sales_details', 'stock_ledger', 'settings'];

  let syncing = false;

  async function getScriptUrl() {
    return await TE.Store.getSetting('sync_script_url');
  }

  function isConfigured() {
    return getScriptUrl().then(url => !!url);
  }

  function jsonp(url) {
    return new Promise((resolve, reject) => {
      const cb = '_te_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('Request timed out (30s). Check your internet connection.'));
      }, 30000);

      function cleanup() {
        clearTimeout(timer);
        delete window[cb];
        if (script.parentNode) script.remove();
      }

      window[cb] = function (data) {
        cleanup();
        resolve(data);
      };

      const script = document.createElement('script');
      script.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + cb;
      script.onerror = function () {
        cleanup();
        reject(new Error('Network error. Check that your URL ends with /exec (not /dev) and the script is deployed.'));
      };
      document.head.appendChild(script);
    });
  }

  function formPost(url, body) {
    return new Promise((resolve) => {
      const frameName = '_te_push_' + Date.now();
      const iframe = document.createElement('iframe');
      iframe.name = frameName;
      iframe.style.display = 'none';
      document.body.appendChild(iframe);

      const form = document.createElement('form');
      form.method = 'POST';
      form.action = url;
      form.target = frameName;

      const input = document.createElement('textarea');
      input.name = 'payload';
      input.value = JSON.stringify(body);
      input.style.display = 'none';
      form.appendChild(input);

      document.body.appendChild(form);
      form.submit();

      setTimeout(() => {
        try { iframe.remove(); } catch (e) {}
        try { form.remove(); } catch (e) {}
        resolve();
      }, 3000);
    });
  }

  async function pushAndVerify(url, body, sentCounts) {
    await formPost(url, body);

    const verify = await jsonp(url + '?action=verify');
    if (!verify.ok) throw new Error('Verification failed after push');

    for (const [table, expected] of Object.entries(sentCounts)) {
      const actual = verify.counts[table] || 0;
      if (actual < expected) {
        throw new Error('Push incomplete: ' + table + ' has ' + actual + ' rows, expected ' + expected);
      }
    }

    return { ok: true, tables: verify.counts };
  }

  async function ping() {
    const url = await getScriptUrl();
    if (!url) throw new Error('Sync URL not configured');
    return await jsonp(url + '?action=ping');
  }

  async function pushAll(onProgress) {
    if (syncing) throw new Error('Sync already in progress');
    syncing = true;

    try {
      const url = await getScriptUrl();
      if (!url) throw new Error('Sync URL not configured');

      const data = {};
      const sentCounts = {};
      for (let i = 0; i < TABLES.length; i++) {
        const t = TABLES[i];
        if (onProgress) onProgress(t, i + 1, TABLES.length);
        data[t] = await TE.Store.getAll(t);
        sentCounts[t] = data[t].length;
      }

      if (onProgress) onProgress('uploading', TABLES.length, TABLES.length);

      const result = await pushAndVerify(url, { action: 'push_all', data }, sentCounts);

      await TE.Store.setSetting('last_sync_push', new Date().toISOString());
      await TE.Store.setSetting('last_sync_type', 'push');

      return result;
    } finally {
      syncing = false;
    }
  }

  async function pullAll(onProgress) {
    if (syncing) throw new Error('Sync already in progress');
    syncing = true;

    try {
      const url = await getScriptUrl();
      if (!url) throw new Error('Sync URL not configured');

      if (onProgress) onProgress('downloading', 0, TABLES.length);

      const result = await jsonp(url + '?action=pull_all');

      if (result.error) throw new Error(result.error);

      for (let i = 0; i < TABLES.length; i++) {
        const t = TABLES[i];
        if (onProgress) onProgress(t, i + 1, TABLES.length);

        if (result[t] && Array.isArray(result[t]) && result[t].length > 0) {
          await TE.Store.clear(t);
          for (const row of result[t]) {
            const cleaned = coerceTypes(t, row);
            await TE.Store.put(t, cleaned);
          }
        }
      }

      if (onProgress) onProgress('translating', TABLES.length, TABLES.length);
      await translateMissingHindi();

      await TE.Store.setSetting('last_sync_pull', new Date().toISOString());
      await TE.Store.setSetting('last_sync_type', 'pull');

      return result;
    } finally {
      syncing = false;
    }
  }

  async function pushTable(tableName) {
    const url = await getScriptUrl();
    if (!url) throw new Error('Sync URL not configured');

    const data = await TE.Store.getAll(tableName);
    const sentCounts = {};
    sentCounts[tableName] = data.length;

    return await pushAndVerify(url, { action: 'push', table: tableName, data }, sentCounts);
  }

  async function pullTable(tableName) {
    const url = await getScriptUrl();
    if (!url) throw new Error('Sync URL not configured');

    const result = await jsonp(url + '?action=pull&table=' + tableName);

    if (result.error) throw new Error(result.error);
    if (Array.isArray(result) && result.length > 0) {
      await TE.Store.clear(tableName);
      for (const row of result) {
        await TE.Store.put(tableName, coerceTypes(tableName, row));
      }
    }
    if (['products', 'customers', 'categories'].includes(tableName)) {
      await translateMissingHindi();
    }
    return result;
  }

  function coerceTypes(table, row) {
    const numericFields = {
      products: ['gst_rate', 'purchase_price', 'selling_price', 'mrp', 'min_stock_level'],
      customers: ['opening_balance'],
      sales_header: ['subtotal', 'discount_value', 'discount_amount', 'taxable_amount', 'cgst_amount', 'sgst_amount', 'igst_amount', 'total_tax', 'total_amount'],
      sales_details: ['sr_no', 'quantity', 'rate', 'discount', 'taxable_value', 'gst_rate', 'cgst_amount', 'sgst_amount', 'igst_amount', 'line_total'],
      stock_ledger: ['quantity_in', 'quantity_out'],
    };

    const booleanFields = {
      sales_header: ['is_intra_state'],
    };

    const fields = numericFields[table] || [];
    const bools = booleanFields[table] || [];

    const cleaned = {};
    for (const [k, v] of Object.entries(row)) {
      if (v === '' || v === null || v === undefined) {
        cleaned[k] = fields.includes(k) ? 0 : bools.includes(k) ? false : '';
      } else if (fields.includes(k)) {
        cleaned[k] = Number(v) || 0;
      } else if (bools.includes(k)) {
        cleaned[k] = v === true || v === 'true' || v === 'TRUE' || v === 1;
      } else {
        cleaned[k] = v;
      }
    }

    if (table === 'settings' && cleaned.key && cleaned.value !== undefined) {
      const numVal = Number(cleaned.value);
      if (!isNaN(numVal) && cleaned.value !== '' && String(numVal) === String(cleaned.value)) {
        cleaned.value = numVal;
      }
    }

    return cleaned;
  }

  function isSyncing() {
    return syncing;
  }

  async function getLastSyncInfo() {
    const pushTime = await TE.Store.getSetting('last_sync_push');
    const pullTime = await TE.Store.getSetting('last_sync_pull');
    const lastType = await TE.Store.getSetting('last_sync_type');
    return { pushTime, pullTime, lastType };
  }

  async function translateMissingHindi() {
    const maps = [
      { store: 'products', name: 'product_name', hi: 'product_name_hi' },
      { store: 'customers', name: 'customer_name', hi: 'customer_name_hi' },
      { store: 'categories', name: 'name', hi: 'name_hi' },
    ];
    for (const m of maps) {
      const rows = await TE.Store.getAll(m.store);
      for (const row of rows) {
        if (row[m.name] && !row[m.hi]) {
          const hindi = await TE.Translate.toHindi(row[m.name]);
          if (hindi) {
            row[m.hi] = hindi;
            await TE.Store.put(m.store, row);
          }
        }
      }
    }
  }

  return { isConfigured, ping, pushAll, pullAll, pushTable, pullTable, isSyncing, getLastSyncInfo };
})();
