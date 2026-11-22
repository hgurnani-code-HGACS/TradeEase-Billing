TE.App = (function () {
  const pageContent = () => document.getElementById('pageContent');
  const pageTitle = () => document.getElementById('pageTitle');
  const sidebarNav = () => document.getElementById('sidebarNav');

  const pageTitleKeys = {
    dashboard: 'dashboard',
    billing: 'new_sales_invoice',
    invoices: 'invoice_history',
    products: 'product_master',
    customers: 'customer_master',
    reports: 'reports_mis',
    settings: 'business_settings',
  };

  const sidebarKeys = {
    dashboard: 'dashboard',
    billing: 'sales_billing',
    invoices: 'invoice_history',
    products: 'products',
    customers: 'customers',
    reports: 'reports',
    settings: 'settings',
  };

  let billingDraft = null;

  function navigate(page, data) {
    if (page === 'billing' && data) billingDraft = data;
    else if (page !== 'billing') billingDraft = null;

    const current = window.location.hash.replace('#', '') || 'dashboard';
    if (current === page) {
      renderPage(page);
    } else {
      window.location.hash = page;
    }
  }

  async function renderPage(page) {
    const container = pageContent();
    if (!container) return;

    const t = TE.Lang.t;
    pageTitle().textContent = t(pageTitleKeys[page] || 'app_name');

    sidebarNav().querySelectorAll('a').forEach(a => {
      a.classList.toggle('active', a.dataset.page === page);
    });

    container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-muted)">${t('loading')}</div>`;

    try {
      switch (page) {
        case 'dashboard':
          await TE.Dashboard.render(container);
          break;
        case 'billing':
          await TE.Billing.render(container, billingDraft);
          billingDraft = null;
          break;
        case 'invoices':
          await TE.Invoices.render(container);
          break;
        case 'products':
          await TE.Products.render(container);
          break;
        case 'customers':
          await TE.Customers.render(container);
          break;
        case 'reports':
          await TE.Reports.render(container);
          break;
        case 'settings':
          await TE.Settings.render(container);
          break;
        default:
          await TE.Dashboard.render(container);
      }
    } catch (err) {
      container.innerHTML = `<div class="empty-state"><p>${t('error_loading')}: ${err.message}</p></div>`;
      console.error(err);
    }
  }

  function handleRoute() {
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    renderPage(hash);
  }

  function updateUILanguage() {
    const t = TE.Lang.t;
    const toggle = document.getElementById('langToggle');
    if (toggle) toggle.textContent = TE.Lang.getLang() === 'hi' ? 'HI' : 'EN';

    const btn = document.getElementById('newInvoiceBtnText');
    if (btn) btn.textContent = t('new_invoice');

    const brand = document.querySelector('.sidebar-brand');
    if (brand) {
      const svg = brand.querySelector('svg');
      brand.textContent = '';
      if (svg) brand.appendChild(svg);
      brand.appendChild(document.createTextNode(' ' + t('app_name')));
    }

    sidebarNav().querySelectorAll('a').forEach(a => {
      const page = a.dataset.page;
      if (page && sidebarKeys[page]) {
        const svg = a.querySelector('svg');
        a.textContent = '';
        if (svg) a.appendChild(svg);
        a.appendChild(document.createTextNode('\n          ' + t(sidebarKeys[page]) + '\n        '));
      }
    });

    const footer = document.querySelector('.sidebar-footer');
    if (footer) footer.textContent = t('app_name') + ' v1.0';
  }

  async function init() {
    await TE.Store.open();
    await TE.Store.seed();
    await TE.Lang.init();

    updateUILanguage();

    window.addEventListener('hashchange', handleRoute);
    handleRoute();

    document.getElementById('newInvoiceBtn')?.addEventListener('click', () => {
      TE.Billing.reset();
      navigate('billing');
    });

    document.getElementById('langToggle')?.addEventListener('click', async () => {
      const next = TE.Lang.getLang() === 'en' ? 'hi' : 'en';
      await TE.Lang.setLang(next);
      updateUILanguage();
      handleRoute();
    });

    document.getElementById('syncIndicator')?.addEventListener('click', () => navigate('settings'));
    if (TE.Settings.updateSyncIndicator) TE.Settings.updateSyncIndicator();

    const hamburger = document.getElementById('hamburger');
    const sidebar = document.getElementById('sidebar');
    if (hamburger && sidebar) {
      hamburger.addEventListener('click', () => sidebar.classList.toggle('open'));
      document.addEventListener('click', (e) => {
        if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && e.target !== hamburger) {
          sidebar.classList.remove('open');
        }
      });
    }
  }

  document.addEventListener('DOMContentLoaded', init);

  return { navigate, renderPage };
})();
