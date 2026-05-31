(function() {

router.add('/orders', async () => {
  const orders = await API.get('/orders');
  const app = document.getElementById('app');
  app.innerHTML = '';

  app.appendChild(el('div', { style: 'display:flex;justify-content:space-between;align-items:center' }, [
    el('h1', 'الطلبات')
  ]));

  const addBtn = el('button', { className: 'btn-primary', onClick: () => { location.hash = '#/orders/new'; } }, 'إضافة طلب جديد');
  app.querySelector('div').appendChild(addBtn);

  if (orders.length === 0) {
    app.appendChild(el('div', { className: 'empty-state' }, 'لا توجد طلبات حالياً'));
    return;
  }

  orders.forEach(order => {
    const card = el('div', { className: 'card order-card' }, [
      el('div', {}, [
        el('span', { className: 'account-badge' }, order.account_name)
      ]),
      el('div', { style: 'display:flex;gap:0.5rem' }, [
        el('button', { className: 'btn-success', onClick: () => { location.hash = `#/orders/${order.id}`; } }, 'عرض المنتجات'),
        el('button', { className: 'btn-primary', onClick: () => { location.hash = `#/orders/${order.id}/stats`; } }, 'الإحصائيات'),
        el('button', { className: 'btn-danger', onClick: async () => { if (confirm('حذف الطلب؟')) { await API.del(`/orders/${order.id}`); router.resolve(); } } }, 'حذف')
      ])
    ]);
    app.appendChild(card);
  });
});

router.add('/orders/new', async () => {
  const app = document.getElementById('app');
  app.innerHTML = '';

  app.appendChild(el('h1', 'إضافة طلب جديد'));

  const form = el('div', { className: 'card' });

  const fields = [
    { label: 'اسم الحساب', id: 'accountName', type: 'text', placeholder: 'مثال: yaramahdi80' },
    { label: 'السعر الإجمالي', id: 'totalPrice', type: 'number', step: '0.01', placeholder: '0.00 ₪' },
    { label: 'السعر مع التنسيق', id: 'formattedPrice', type: 'text', placeholder: 'مثال: 299.99 ₪' }
  ];

  fields.forEach(f => {
    form.appendChild(el('label', { htmlFor: f.id }, f.label));
    form.appendChild(el('input', { id: f.id, type: f.type, step: f.step, placeholder: f.placeholder }));
  });

  const btnRow = el('div', { style: 'display:flex;gap:0.75rem;margin-top:0.5rem' }, [
    el('button', { className: 'btn-primary', onClick: async () => {
      const accountName = document.getElementById('accountName').value.trim();
      const totalPrice = parseFloat(document.getElementById('totalPrice').value);
      const formattedPrice = document.getElementById('formattedPrice').value.trim();
      
      const nameVal = validateRequired(accountName, 'اسم الحساب');
      if (!nameVal.valid) { alert(nameVal.error); return; }
      
      const priceVal = validatePositiveNumber(totalPrice, 'السعر الإجمالي');
      if (!priceVal.valid) { alert(priceVal.error); return; }
      
      const order = await API.post('/orders', { account_name: nameVal.value, total_price: priceVal.value, formatted_price: formattedPrice });
      location.hash = `#/orders/${order.id}`;
    } }, 'حفظ'),
    el('button', { className: 'btn-danger', onClick: () => { location.hash = '#/orders'; } }, 'إلغاء')
  ]);
  form.appendChild(btnRow);
  app.appendChild(form);
});

})();
