const API = {
  async get(path) {
    try {
      const res = await fetch(`/api${path}`);
      if (!res.ok) throw new Error(`خطأ ${res.status}: ${res.statusText}`);
      return res.json();
    } catch (err) {
      console.error('API GET error:', err);
      throw new Error(`فشل جلب البيانات من ${path}: ${err.message}`);
    }
  },
  async post(path, body) {
    try {
      const opts = body instanceof FormData
        ? { method: 'POST', body }
        : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
      const res = await fetch(`/api${path}`, opts);
      if (!res.ok) throw new Error(`خطأ ${res.status}: ${res.statusText}`);
      return res.json();
    } catch (err) {
      console.error('API POST error:', err);
      throw new Error(`فشل حفظ البيانات: ${err.message}`);
    }
  },
  async del(path) {
    try {
      const res = await fetch(`/api${path}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`خطأ ${res.status}: ${res.statusText}`);
    } catch (err) {
      console.error('API DELETE error:', err);
      throw new Error(`فشل حذف البيانات: ${err.message}`);
    }
  },
  async put(path, body) {
    try {
      const opts = body instanceof FormData
        ? { method: 'PUT', body }
        : { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
      const res = await fetch(`/api${path}`, opts);
      if (!res.ok) throw new Error(`خطأ ${res.status}: ${res.statusText}`);
      return res.json();
    } catch (err) {
      console.error('API PUT error:', err);
      throw new Error(`فشل تعديل البيانات: ${err.message}`);
    }
  }
};

const router = {
  routes: {},
  add(pattern, handler) {
    this.routes[pattern] = handler;
  },
  async resolve() {
    const hash = location.hash.slice(1) || '/orders';
    for (const [pattern, handler] of Object.entries(this.routes)) {
      const regex = new RegExp('^' + pattern.replace(/:(\w+)/g, '([^/]+)') + '$');
      const match = hash.match(regex);
      if (match) {
        const params = {};
        const keys = [...pattern.matchAll(/:(\w+)/g)].map(m => m[1]);
        keys.forEach((k, i) => { params[k] = match[i + 1]; });
        await handler(params);
        return;
      }
    }
    document.getElementById('app').innerHTML = '<div class="empty-state">الصفحة غير موجودة</div>';
  }
};

function el(tag, attrs = {}, children = []) {
  const e = document.createElement(tag);
  if (typeof attrs === 'string') { e.className = attrs; return e; }
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'className') e.className = v;
    else if (k === 'onClick') e.onclick = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') e.innerHTML = v;
    else if (k === 'dataset') Object.assign(e.dataset, v);
    else e.setAttribute(k, v);
  }
  if (typeof children === 'string') e.innerHTML = children;
  else if (typeof children === 'number' || typeof children === 'boolean') e.appendChild(document.createTextNode(String(children)));
  else if (Array.isArray(children)) children.forEach(c => { if (c != null) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
  else if (children instanceof Node) e.appendChild(children);
  return e;
}

window.addEventListener('hashchange', () => {
  document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
  router.resolve();
});
window.addEventListener('DOMContentLoaded', () => router.resolve());

// Global error handler
window.addEventListener('unhandledrejection', event => {
  console.error('Unhandled rejection:', event.reason);
  alert('حدث خطأ: ' + (event.reason?.message || 'خطأ غير معروف'));
  event.preventDefault();
});

// Validation helpers
window.validatePositiveNumber = (val, fieldName) => {
  const num = parseFloat(val);
  if (isNaN(num)) return { valid: false, error: `${fieldName} يجب أن يكون رقماً` };
  if (num <= 0) return { valid: false, error: `${fieldName} يجب أن يكون أكبر من صفر` };
  return { valid: true, value: num };
};

window.validatePositiveInt = (val, fieldName) => {
  const num = parseInt(val);
  if (isNaN(num)) return { valid: false, error: `${fieldName} يجب أن يكون رقماً صحيحاً` };
  if (num <= 0) return { valid: false, error: `${fieldName} يجب أن يكون أكبر من صفر` };
  return { valid: true, value: num };
};

window.validateRequired = (val, fieldName) => {
  const trimmed = String(val).trim();
  if (!trimmed) return { valid: false, error: `${fieldName} مطلوب` };
  return { valid: true, value: trimmed };
};
