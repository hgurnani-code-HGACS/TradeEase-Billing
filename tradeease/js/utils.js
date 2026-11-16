TE.Utils = (function () {
  function currency(n) {
    return '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function num(n, d) {
    return Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
  }

  function dateStr(d) {
    if (!d) return '';
    const dt = typeof d === 'string' ? new Date(d + 'T00:00:00') : d;
    return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function today() {
    return new Date().toISOString().split('T')[0];
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function el(tag, attrs, children) {
    const e = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (k === 'className') e.className = v;
        else if (k === 'innerHTML') e.innerHTML = v;
        else if (k === 'textContent') e.textContent = v;
        else if (k.startsWith('on')) e.addEventListener(k.slice(2).toLowerCase(), v);
        else if (k === 'dataset') Object.assign(e.dataset, v);
        else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
        else e.setAttribute(k, v);
      }
    }
    if (children) {
      if (typeof children === 'string') e.innerHTML = children;
      else if (Array.isArray(children)) children.forEach(c => { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
      else e.appendChild(children);
    }
    return e;
  }

  function debounce(fn, ms) {
    let t;
    return function (...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), ms || 300); };
  }

  function toast(msg, type) {
    const t = el('div', { className: 'toast toast-' + (type || 'info') }, msg);
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('toast-show'));
    setTimeout(() => { t.classList.remove('toast-show'); setTimeout(() => t.remove(), 300); }, 3000);
  }

  function modal(title, contentEl, opts) {
    opts = opts || {};
    const overlay = el('div', { className: 'modal-overlay' });
    const dialog = el('div', { className: 'modal-dialog' + (opts.wide ? ' modal-wide' : '') });
    const header = el('div', { className: 'modal-header' }, [
      el('h3', {}, title),
      el('button', { className: 'modal-close', onClick: () => overlay.remove(), 'aria-label': 'Close' }, '&times;'),
    ]);
    const body = el('div', { className: 'modal-body' });
    body.appendChild(contentEl);
    dialog.appendChild(header);
    dialog.appendChild(body);
    if (opts.footer) {
      const f = el('div', { className: 'modal-footer' });
      f.appendChild(opts.footer);
      dialog.appendChild(f);
    }
    overlay.appendChild(dialog);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('modal-show'));
    return overlay;
  }

  function confirm(msg, onYes) {
    const content = el('div', {}, [el('p', {}, msg)]);
    const footer = el('div', { className: 'btn-row' }, [
      el('button', { className: 'btn btn-outline', onClick: () => m.remove() }, 'Cancel'),
      el('button', { className: 'btn btn-danger', onClick: () => { m.remove(); onYes(); } }, 'Confirm'),
    ]);
    const m = modal('Confirm', content, { footer });
  }

  function numberToWords(n) {
    if (n === 0) return 'Zero';
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    function convert(num) {
      if (num < 20) return ones[num];
      if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
      if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' and ' + convert(num % 100) : '');
      if (num < 100000) return convert(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + convert(num % 1000) : '');
      if (num < 10000000) return convert(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 ? ' ' + convert(num % 100000) : '');
      return convert(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 ? ' ' + convert(num % 10000000) : '');
    }
    const rupees = Math.floor(n);
    const paise = Math.round((n - rupees) * 100);
    let result = convert(rupees) + ' Rupees';
    if (paise > 0) result += ' and ' + convert(paise) + ' Paise';
    return result + ' Only';
  }

  const INDIAN_STATES = [
    { code: '01', name: 'Jammu & Kashmir' }, { code: '02', name: 'Himachal Pradesh' },
    { code: '03', name: 'Punjab' }, { code: '04', name: 'Chandigarh' },
    { code: '05', name: 'Uttarakhand' }, { code: '06', name: 'Haryana' },
    { code: '07', name: 'Delhi' }, { code: '08', name: 'Rajasthan' },
    { code: '09', name: 'Uttar Pradesh' }, { code: '10', name: 'Bihar' },
    { code: '11', name: 'Sikkim' }, { code: '12', name: 'Arunachal Pradesh' },
    { code: '13', name: 'Nagaland' }, { code: '14', name: 'Manipur' },
    { code: '15', name: 'Mizoram' }, { code: '16', name: 'Tripura' },
    { code: '17', name: 'Meghalaya' }, { code: '18', name: 'Assam' },
    { code: '19', name: 'West Bengal' }, { code: '20', name: 'Jharkhand' },
    { code: '21', name: 'Odisha' }, { code: '22', name: 'Chhattisgarh' },
    { code: '23', name: 'Madhya Pradesh' }, { code: '24', name: 'Gujarat' },
    { code: '26', name: 'Dadra & Nagar Haveli and Daman & Diu' },
    { code: '27', name: 'Maharashtra' }, { code: '29', name: 'Karnataka' },
    { code: '30', name: 'Goa' }, { code: '31', name: 'Lakshadweep' },
    { code: '32', name: 'Kerala' }, { code: '33', name: 'Tamil Nadu' },
    { code: '34', name: 'Puducherry' }, { code: '35', name: 'Andaman & Nicobar Islands' },
    { code: '36', name: 'Telangana' }, { code: '37', name: 'Andhra Pradesh' },
    { code: '38', name: 'Ladakh' },
  ];

  return { currency, num, dateStr, today, uid, el, debounce, toast, modal, confirm, numberToWords, INDIAN_STATES };
})();
