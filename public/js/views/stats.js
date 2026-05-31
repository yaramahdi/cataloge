(function() {

router.add('/orders/:id/stats', async (params) => {
  const data = await API.get(`/orders/${params.id}/stats`);
  const { order, sales } = data;
  const app = document.getElementById('app');
  app.innerHTML = '';

  app.appendChild(el('div', { style: 'display:flex;justify-content:space-between;align-items:center' }, [
    el('h1', `إحصائيات ${order.account_name}`)
  ]));

  const nav = el('div', { style: 'display:flex;gap:0.5rem;margin-bottom:1rem' }, [
    el('button', { className: 'btn-primary', onClick: () => { location.hash = `#/orders/${order.id}`; } }, 'المنتجات'),
    el('button', { className: 'btn-success', onClick: () => { location.hash = `#/orders/${order.id}/charts`; } }, 'الرسوم البيانية'),
    el('button', { className: 'btn-danger', onClick: () => { location.hash = '#/orders'; } }, 'العودة')
  ]);
  app.appendChild(nav);

  if (!sales || sales.length === 0) {
    app.appendChild(el('div', { className: 'empty-state' }, 'لا توجد مبيعات مسجلة بعد'));
    return;
  }

  const table = el('table', { className: 'stats-table' });
  const thead = el('thead');
  thead.appendChild(el('tr', {}, [
    el('th', {}, 'الصورة'),
    el('th', {}, 'السعر الأصلي'),
    el('th', {}, 'سعر البيع'),
    el('th', {}, 'الربح')
  ]));
  table.appendChild(thead);

  const tbody = el('tbody');
  let totalProfit = 0;

  sales.forEach(s => {
    const profit = s.selling_price - s.raw_price;
    totalProfit += profit;
    const imgUrl = s.image_path || '';
    const row = el('tr', {}, [
      el('td', {}, imgUrl ? [el('img', { src: imgUrl, alt: '' })] : ['-']),
      el('td', {}, s.raw_price.toFixed(2)),
      el('td', {}, s.selling_price.toFixed(2)),
      el('td', {}, profit.toFixed(2))
    ]);
    tbody.appendChild(row);
  });

  const totalRow = el('tr', { className: 'total-row' }, [
    el('td', { colSpan: 3, style: 'text-align:left' }, 'إجمالي الربح:'),
    el('td', {}, totalProfit.toFixed(2))
  ]);
  tbody.appendChild(totalRow);
  table.appendChild(tbody);
  app.appendChild(table);
});

router.add('/orders/:id/charts', async (params) => {
  const data = await API.get(`/orders/${params.id}/charts`);
  const { order, sales } = data;
  const app = document.getElementById('app');
  app.innerHTML = '';

  app.appendChild(el('div', { style: 'display:flex;justify-content:space-between;align-items:center' }, [
    el('h1', `الرسوم البيانية - ${order.account_name}`)
  ]));

  const nav = el('div', { style: 'display:flex;gap:0.5rem;margin-bottom:1rem' }, [
    el('button', { className: 'btn-primary', onClick: () => { location.hash = `#/orders/${order.id}/stats`; } }, 'الإحصائيات'),
    el('button', { className: 'btn-danger', onClick: () => { location.hash = '#/orders'; } }, 'العودة')
  ]);
  app.appendChild(nav);

  if (!sales || sales.length === 0) {
    app.appendChild(el('div', { className: 'empty-state' }, 'لا توجد مبيعات بعد'));
    return;
  }

  const container1 = el('div', { className: 'chart-container' });
  container1.appendChild(el('canvas', { id: 'chart-bar' }));
  app.appendChild(container1);

  const container2 = el('div', { className: 'chart-container' });
  container2.appendChild(el('canvas', { id: 'chart-line' }));
  app.appendChild(container2);

  const container3 = el('div', { className: 'chart-container' });
  container3.appendChild(el('canvas', { id: 'chart-doughnut' }));
  app.appendChild(container3);

  const labels = sales.map((_, i) => `بيع ${i + 1}`);
  const rawPrices = sales.map(s => s.raw_price);
  const sellPrices = sales.map(s => s.selling_price);
  const profits = sales.map(s => s.selling_price - s.raw_price);

  new Chart(document.getElementById('chart-bar'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'سعر البيع', data: sellPrices, backgroundColor: '#27ae60' },
        { label: 'الربح', data: profits, backgroundColor: '#0f3460' }
      ]
    },
    options: { responsive: true, plugins: { legend: { labels: { font: { family: 'Tahoma' } } } } }
  });

  let cumulative = 0;
  const cumData = profits.map(p => { cumulative += p; return cumulative; });

  new Chart(document.getElementById('chart-line'), {
    type: 'line',
    data: {
      labels,
      datasets: [{ label: 'الربح التراكمي', data: cumData, borderColor: '#0f3460', fill: false }]
    },
    options: { responsive: true, plugins: { legend: { labels: { font: { family: 'Tahoma' } } } } }
  });

  const productProfits = {};
  for (const s of sales) {
    const key = s.product_id || 'منتج';
    productProfits[key] = (productProfits[key] || 0) + (s.selling_price - s.raw_price);
  }

  new Chart(document.getElementById('chart-doughnut'), {
    type: 'doughnut',
    data: {
      labels: Object.keys(productProfits).map(() => order.account_name),
      datasets: [{ data: Object.values(productProfits), backgroundColor: ['#0f3460', '#e94560', '#27ae60', '#f39c12', '#8e44ad'] }]
    },
    options: { responsive: true, plugins: { legend: { labels: { font: { family: 'Tahoma' } } } } }
  });
});

router.add('/stats', async () => {
  const orders = await API.get('/orders');
  const app = document.getElementById('app');
  app.innerHTML = '';

  app.appendChild(el('h1', 'الإحصائيات العامة'));

  if (orders.length === 0) {
    app.appendChild(el('div', { className: 'empty-state' }, 'لا توجد طلبات بعد'));
    return;
  }

  orders.forEach(o => {
    const card = el('div', { className: 'card', style: 'display:flex;justify-content:space-between;align-items:center' }, [
      el('div', {}, [
        el('strong', o.account_name),
        el('div', { style: 'color:#666;font-size:0.85rem' }, o.formatted_price || o.total_price)
      ]),
      el('button', { className: 'btn-primary', onClick: () => { location.hash = `#/orders/${o.id}/stats`; } }, 'عرض الإحصائيات')
    ]);
    app.appendChild(card);
  });
});

})();
