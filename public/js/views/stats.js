(function() {

router.add('/orders/:id/stats', async (params) => {
  const data = await API.get(`/orders/${params.id}/stats`);
  const { order, sales, summary } = data;
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

  const summaryCard = el('div', { className: 'card', style: 'margin-bottom:1rem;padding:1rem;display:grid;grid-template-columns:1fr 1fr;gap:0.75rem' }, [
    el('div', { className: 'summary-item' }, [el('div', { className: 'data-label' }, 'إجمالي سعر البيع المخطط:'), el('div', { className: 'data-value' }, `${summary.planned_total_selling.toFixed(2)} ₪`)]),
    el('div', { className: 'summary-item' }, [el('div', { className: 'data-label' }, 'إجمالي تكلفة المنتجات:'), el('div', { className: 'data-value' }, `${summary.planned_total_cost.toFixed(2)} ₪`)]),
    el('div', { className: 'summary-item' }, [el('div', { className: 'data-label' }, 'إجمالي الربح المخطط:'), el('div', { className: 'data-value' }, `${summary.planned_total_profit.toFixed(2)} ₪`)]),
    el('div', { className: 'summary-item' }, [el('div', { className: 'data-label' }, 'تكلفة التنسيق:'), el('div', { className: 'data-value' }, `${summary.formatted_cost.toFixed(2)} ₪`)]),
    el('div', { className: 'summary-item', style: 'grid-column:1 / -1' }, [
      el('div', { className: 'data-label' }, 'صافي الربح بعد التنسيق:'),
      el('div', { className: 'data-value', style: `font-weight:bold;color:${summary.net_profit_after_formatting >= 0 ? '#27ae60' : '#e94560'}` }, `${summary.net_profit_after_formatting.toFixed(2)} ₪`)
    ]),
    el('div', { className: 'summary-item', style: 'grid-column:1 / -1' }, [
      el('div', { className: 'data-label' }, 'حالة التكلفة:'),
      el('div', { className: 'data-value' }, summary.covers_formatting ? 'يغطي الربح تكلفة التنسيق' : 'الربح لا يغطي تكلفة التنسيق')
    ])
  ]);
  app.appendChild(summaryCard);

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
  const { order, summary } = data;
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

  const container = el('div', { className: 'chart-container', style: 'max-width:600px;margin:0 auto' });
  const canvas = el('canvas', { id: 'chart-donut' });
  container.appendChild(canvas);
  app.appendChild(container);

  const labels = [
    'سعر الطلبية مع التنسيق',
    'تكلفة التنسيق',
    'إجمالي البيع مع الربح'
  ];
  const values = [
    summary.order_total_price,
    summary.formatted_cost,
    summary.planned_total_selling
  ];

  const backgroundColors = ['#0f3460', '#e94560', '#27ae60'];
  const borderColors = ['#0b2447', '#a40e3b', '#1f7a3f'];

  new Chart(document.getElementById('chart-donut'), {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: backgroundColors,
        borderColor: borderColors,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { font: { family: 'Tahoma', size: 14 } }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.label}: ${ctx.parsed.toFixed(2)} ₪`
          }
        }
      }
    }
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
