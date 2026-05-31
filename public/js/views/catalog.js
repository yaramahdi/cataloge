(function() {

router.add('/orders/:id', async (params) => {
  const data = await API.get(`/orders/${params.id}`);
  const { order, products } = data;
  const app = document.getElementById('app');
  app.innerHTML = '';

  app.appendChild(el('div', { style: 'display:flex;justify-content:space-between;align-items:center' }, [
    el('h1', `منتجات ${order.account_name}`)
  ]));

  const infoItems = [
    el('span', { className: 'account-badge' }, order.account_name),
    el('span', { style: 'color:#666;font-weight:600' }, 'السعر الإجمالي:'),
    el('span', { className: 'price-badge' }, `${order.total_price.toFixed(2)} ₪`),
  ];
  if (order.formatted_price) {
    infoItems.push(el('span', { style: 'color:#666;font-weight:600' }, 'سعر التنسيق:'));
    infoItems.push(el('span', { className: 'formatted-badge' }, order.formatted_price));
  }
  infoItems.push(el('button', { className: 'btn-primary', style: 'padding:0.3rem 0.8rem;font-size:0.82rem', onClick: () => showEditOrderModal(order) }, 'تعديل'));

  app.appendChild(el('div', { className: 'card', style: 'margin-bottom:1rem;padding:1rem 1.25rem' }, [
    el('div', { style: 'display:flex;flex-wrap:wrap;gap:1rem;align-items:center;font-size:1rem' }, infoItems)
  ]));

  const nav = el('div', { style: 'display:flex;gap:0.5rem;margin-bottom:1rem' }, [
    el('button', { className: 'btn-success', onClick: () => { location.hash = '#/orders'; } }, 'العودة للطلبات'),
    el('button', { className: 'btn-primary', onClick: () => { location.hash = `#/orders/${order.id}/stats`; } }, 'عرض الإحصائيات'),
    el('button', { className: 'btn-primary', onClick: () => showAddProductForm(order.id) }, 'إضافة منتج')
  ]);
  app.appendChild(nav);

  const grid = el('div', { className: 'catalog-list', id: 'catalog-grid' });
  app.appendChild(grid);

  renderProducts(products, grid, order.id);
});

async function showAddProductForm(orderId) {
  const overlay = el('div', { className: 'modal-overlay', id: 'product-modal' });
  overlay.onclick = (e) => {
    if (e.target === overlay) {
      overlay.remove();
    }
  };
  const box = el('div', { className: 'modal-box' });
  box.appendChild(el('h2', 'إضافة منتج'));

  box.appendChild(el('label', { htmlFor: 'productImage' }, 'صورة المنتج'));
  const fileInput = el('input', { id: 'productImage', type: 'file', accept: 'image/*' });
  fileInput.onchange = () => {
    const existing = box.querySelector('.preview-img');
    if (existing) existing.remove();
    if (fileInput.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = el('img', { className: 'preview-img', src: e.target.result, style: 'width:100%;max-height:200px;object-fit:contain;margin-bottom:0.75rem;border-radius:6px' });
        box.insertBefore(img, box.querySelectorAll('label')[1] || box.querySelector('.modal-actions'));
      };
      reader.readAsDataURL(fileInput.files[0]);
    }
  };
  box.appendChild(fileInput);

  const fields = [
    { label: 'الكمية', id: 'productQty', type: 'number', value: '1' },
    { label: 'المقاس', id: 'productSize', type: 'text', placeholder: 'مثال: L, XL, 42' },
    { label: 'السعر الأصلي', id: 'productRawPrice', type: 'number', step: '0.01', placeholder: '0.00' },
    { label: 'سعر البيع', id: 'productSellPrice', type: 'number', step: '0.01', placeholder: '0.00' }
  ];

  fields.forEach(f => {
    box.appendChild(el('label', { htmlFor: f.id }, f.label));
    box.appendChild(el('input', { id: f.id, type: f.type, step: f.step, placeholder: f.placeholder, value: f.value }));
  });

  const actions = el('div', { className: 'modal-actions' }, [
    el('button', { className: 'btn-primary', onClick: async () => {
      const file = document.getElementById('productImage').files[0];
      const qty = parseInt(document.getElementById('productQty').value);
      const size = document.getElementById('productSize').value.trim();
      const rawPrice = parseFloat(document.getElementById('productRawPrice').value);
      const sellPrice = parseFloat(document.getElementById('productSellPrice').value);
      
      if (!file) { alert('يرجى تحديد صورة المنتج'); return; }
      
      const qtyVal = validatePositiveInt(qty, 'الكمية');
      if (!qtyVal.valid) { alert(qtyVal.error); return; }
      
      const rawVal = validatePositiveNumber(rawPrice, 'السعر الأصلي');
      if (!rawVal.valid) { alert(rawVal.error); return; }
      
      const sellVal = validatePositiveNumber(sellPrice, 'سعر البيع');
      if (!sellVal.valid) { alert(sellVal.error); return; }

      const fd = new FormData();
      fd.append('image', file);
      fd.append('quantity', qtyVal.value);
      fd.append('size', size);
      fd.append('raw_price', rawVal.value);
      fd.append('selling_price', sellVal.value);

      await API.post(`/orders/${orderId}/products`, fd);
      document.getElementById('product-modal').remove();
      router.resolve();
    } }, 'حفظ'),
    el('button', { className: 'btn-danger', onClick: () => { overlay.remove(); } }, 'إلغاء')
  ]);
  box.appendChild(actions);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

function renderProducts(products, grid, orderId) {
  grid.innerHTML = '';
  if (!products || products.length === 0) {
    grid.appendChild(el('div', { className: 'empty-state' }, 'لا توجد منتجات بعد. أضف منتجاً جديداً.'));
    return;
  }

  products.forEach(p => {
    const row = el('div', { className: 'product-row' });

    const imgUrl = p.image_path || '';
    if (imgUrl) {
      row.appendChild(el('img', { className: 'product-row-img', src: imgUrl, alt: 'منتج' }));
    } else {
      row.appendChild(el('div', { className: 'product-row-placeholder' }, 'لا صورة'));
    }

    const info = el('div', { className: 'product-row-info' });
    info.appendChild(el('div', { className: 'data-item' }, [
      el('span', { className: 'data-label' }, 'الكمية:'),
      el('span', { className: 'data-value' }, String(p.quantity))
    ]));
    info.appendChild(el('div', { className: 'data-item' }, [
      el('span', { className: 'data-label' }, 'المقاس:'),
      el('span', { className: 'data-value' }, p.size || '-')
    ]));
    info.appendChild(el('div', { className: 'data-item' }, [
      el('span', { className: 'data-label' }, 'الأصلي:'),
      el('span', { className: 'data-value' }, `${p.raw_price.toFixed(2)} ₪`)
    ]));
    info.appendChild(el('div', { className: 'data-item' }, [
      el('span', { className: 'data-label' }, 'البيع:'),
      el('span', { className: 'data-value' }, `${p.selling_price.toFixed(2)} ₪`)
    ]));
    info.appendChild(el('div', { className: 'data-item profit' }, [
      el('span', { className: 'data-label' }, 'الربح:'),
      el('span', { className: 'data-value' }, `${(p.selling_price - p.raw_price).toFixed(2)} ₪`)
    ]));

    row.appendChild(info);

    const actions = el('div', { className: 'product-row-actions' });
    if (p.sold_out) {
      actions.appendChild(el('span', { className: 'sold-out-badge' }, 'تم البيع'));
    }
    if (!p.sold_out) {
      actions.appendChild(el('button', { className: 'btn-success', onClick: () => showSellModal(p) }, 'بيع'));
    }
    actions.appendChild(el('button', { className: 'btn-primary', onClick: () => showEditModal(p, orderId) }, 'تعديل'));
    actions.appendChild(el('button', { className: 'btn-danger', onClick: async () => { if (confirm('حذف هذا المنتج؟')) { await API.del(`/products/${p.id}`); router.resolve(); } } }, 'حذف'));
    row.appendChild(actions);

    grid.appendChild(row);
  });
}

function showSellModal(product) {
  const overlay = el('div', { className: 'modal-overlay', id: 'sell-modal' });
  overlay.onclick = (e) => {
    if (e.target === overlay) {
      overlay.remove();
    }
  };
  const box = el('div', { className: 'modal-box' });
  box.appendChild(el('h2', 'تسجيل بيع'));

  const defaultProfit = product.selling_price - product.raw_price;
  box.appendChild(el('div', { style: 'background:#f0f0f0;padding:1rem;border-radius:6px;margin-bottom:1rem' }, [
    el('div', { style: 'display:flex;justify-content:space-between;margin-bottom:0.5rem' }, [
      el('span', 'السعر الأصلي:'),
      el('strong', `${product.raw_price.toFixed(2)} ₪`)
    ]),
    el('div', { style: 'display:flex;justify-content:space-between;margin-bottom:0.5rem' }, [
      el('span', 'السعر المحدد:'),
      el('strong', `${product.selling_price.toFixed(2)} ₪`)
    ]),
    el('div', { style: 'display:flex;justify-content:space-between;border-top:1px solid #ddd;padding-top:0.5rem;color:#27ae60;font-weight:bold' }, [
      el('span', 'الربح:'),
      el('strong', `${defaultProfit.toFixed(2)} ₪`)
    ])
  ]));

  const actions = el('div', { className: 'modal-actions' }, [
    el('button', {
      className: 'btn-success',
      onClick: async () => {
        await recordSale(product.id, product.selling_price);
        overlay.remove();
      }
    }, `بيع بـ ${product.selling_price.toFixed(2)} ₪`),
    el('button', {
      className: 'btn-primary',
      onClick: () => {
        box.removeChild(actions);
        box.appendChild(el('label', { htmlFor: 'customPrice' }, 'أدخل السعر:'));
        const inp = el('input', { id: 'customPrice', type: 'number', step: '0.01', placeholder: '0.00' });
        const profitDisplay = el('div', { style: 'background:#f0f0f0;padding:0.75rem;border-radius:6px;margin:0.75rem 0;display:flex;justify-content:space-between;color:#27ae60;font-weight:bold' }, [
          el('span', 'الربح المتوقع:'),
          el('span', { id: 'profit-preview' }, '0.00')
        ]);
        
        inp.oninput = () => {
          const cp = parseFloat(inp.value) || 0;
          const profit = (cp - product.raw_price).toFixed(2);
          document.getElementById('profit-preview').textContent = profit;
        };
        
        box.appendChild(inp);
        box.appendChild(profitDisplay);
        const confirmBtn = el('button', { className: 'btn-success', style: 'margin-top:0.5rem' }, 'تأكيد');
        confirmBtn.onclick = async () => {
          const cp = parseFloat(inp.value);
          const priceVal = validatePositiveNumber(cp, 'السعر');
          if (!priceVal.valid) { alert(priceVal.error); return; }
          await recordSale(product.id, priceVal.value);
          overlay.remove();
        };
        box.appendChild(confirmBtn);
      }
    }, 'سعر آخر')
  ]);
  box.appendChild(actions);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

async function recordSale(productId, sellingPrice) {
  await API.post(`/products/${productId}/sell`, { selling_price: sellingPrice });
  router.resolve();
}

function showEditModal(product, orderId) {
  const overlay = el('div', { className: 'modal-overlay', id: 'edit-modal' });
  overlay.onclick = (e) => {
    if (e.target === overlay) overlay.remove();
  };
  const box = el('div', { className: 'modal-box' });
  box.appendChild(el('h2', 'تعديل المنتج'));

  box.appendChild(el('label', { htmlFor: 'editImage' }, 'صورة المنتج'));
  const fileInput = el('input', { id: 'editImage', type: 'file', accept: 'image/*' });
  fileInput.onchange = () => {
    const existing = box.querySelector('.preview-img');
    if (existing) existing.remove();
    if (fileInput.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = el('img', { className: 'preview-img', src: e.target.result, style: 'width:100%;max-height:200px;object-fit:contain;margin-bottom:0.75rem;border-radius:6px' });
        box.insertBefore(img, box.querySelectorAll('label')[1] || box.querySelector('.modal-actions'));
      };
      reader.readAsDataURL(fileInput.files[0]);
    }
  };
  box.appendChild(fileInput);

  const fields = [
    { label: 'الكمية', id: 'editQty', type: 'number', value: String(product.quantity) },
    { label: 'المقاس', id: 'editSize', type: 'text', placeholder: 'مثال: L, XL, 42', value: product.size || '' },
    { label: 'السعر الأصلي', id: 'editRawPrice', type: 'number', step: '0.01', value: String(product.raw_price) },
    { label: 'سعر البيع', id: 'editSellPrice', type: 'number', step: '0.01', value: String(product.selling_price) }
  ];

  fields.forEach(f => {
    box.appendChild(el('label', { htmlFor: f.id }, f.label));
    box.appendChild(el('input', { id: f.id, type: f.type, step: f.step, placeholder: f.placeholder, value: f.value }));
  });

  const actions = el('div', { className: 'modal-actions' }, [
    el('button', { className: 'btn-primary', onClick: async () => {
      const file = document.getElementById('editImage').files[0];
      const qty = parseInt(document.getElementById('editQty').value);
      const size = document.getElementById('editSize').value.trim();
      const rawPrice = parseFloat(document.getElementById('editRawPrice').value);
      const sellPrice = parseFloat(document.getElementById('editSellPrice').value);

      const qtyVal = validatePositiveInt(qty, 'الكمية');
      if (!qtyVal.valid) { alert(qtyVal.error); return; }
      const rawVal = validatePositiveNumber(rawPrice, 'السعر الأصلي');
      if (!rawVal.valid) { alert(rawVal.error); return; }
      const sellVal = validatePositiveNumber(sellPrice, 'سعر البيع');
      if (!sellVal.valid) { alert(sellVal.error); return; }

      if (file) {
        const fd = new FormData();
        fd.append('image', file);
        fd.append('quantity', qtyVal.value);
        fd.append('size', size);
        fd.append('raw_price', rawVal.value);
        fd.append('selling_price', sellVal.value);
        await API.put(`/products/${product.id}`, fd);
      } else {
        await API.put(`/products/${product.id}`, {
          quantity: qtyVal.value, size, raw_price: rawVal.value, selling_price: sellVal.value
        });
      }
      overlay.remove();
      router.resolve();
    } }, 'حفظ التعديلات'),
    el('button', { className: 'btn-danger', onClick: () => overlay.remove() }, 'إلغاء')
  ]);
  box.appendChild(actions);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

function showEditOrderModal(order) {
  const overlay = el('div', { className: 'modal-overlay', id: 'edit-order-modal' });
  overlay.onclick = (e) => {
    if (e.target === overlay) overlay.remove();
  };
  const box = el('div', { className: 'modal-box' });
  box.appendChild(el('h2', 'تعديل أسعار الطلبية'));

  box.appendChild(el('label', { htmlFor: 'editTotalPrice' }, 'السعر الإجمالي'));
  box.appendChild(el('input', { id: 'editTotalPrice', type: 'number', step: '0.01', value: String(order.total_price) }));

  box.appendChild(el('label', { htmlFor: 'editFormattedPrice' }, 'السعر مع التنسيق'));
  box.appendChild(el('input', { id: 'editFormattedPrice', type: 'text', placeholder: 'مثال: 299.99 ₪', value: order.formatted_price || '' }));

  const actions = el('div', { className: 'modal-actions' }, [
    el('button', { className: 'btn-primary', onClick: async () => {
      const totalPrice = parseFloat(document.getElementById('editTotalPrice').value);
      const formattedPrice = document.getElementById('editFormattedPrice').value.trim();

      const priceVal = validatePositiveNumber(totalPrice, 'السعر الإجمالي');
      if (!priceVal.valid) { alert(priceVal.error); return; }

      await API.put(`/orders/${order.id}`, { total_price: priceVal.value, formatted_price: formattedPrice });
      overlay.remove();
      router.resolve();
    } }, 'حفظ التعديلات'),
    el('button', { className: 'btn-danger', onClick: () => overlay.remove() }, 'إلغاء')
  ]);
  box.appendChild(actions);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

})();
