// ฝั่งไคลเอนต์: เรียก API ด้วย fetch แล้วแสดงผลบนหน้าเว็บ
const API = '/api/titles';

const TYPE_LABEL = { movie: 'หนัง', series: 'ซีรีส์', game: 'เกม' };
const STATUS_LABEL = {
  planned: 'อยากดู/อยากเล่น',
  in_progress: 'กำลังดู/กำลังเล่น',
  completed: 'จบแล้ว',
};

const $ = (id) => document.getElementById(id);
const form = $('title-form');
const fields = ['id', 'name', 'type', 'genre', 'status', 'rating', 'note'];

// ป้องกัน XSS เวลาแสดงข้อความจากผู้ใช้
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function toast(msg, isError = false) {
  const t = $('toast');
  t.textContent = msg;
  t.className = 'show' + (isError ? ' error' : '');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (t.className = ''), 2200);
}

async function request(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ---------- แสดงผล ----------
async function loadStats() {
  const s = await request(`${API}/stats`);
  $('stats').innerHTML = [
    ['ทั้งหมด', s.total],
    ['อยากดู/เล่น', s.planned],
    ['กำลังดู/เล่น', s.in_progress],
    ['จบแล้ว', s.completed],
  ].map(([label, n]) => `<div class="stat"><b>${n}</b><span>${label}</span></div>`).join('');
}

async function loadList() {
  const params = new URLSearchParams();
  if ($('search').value.trim()) params.set('q', $('search').value.trim());
  if ($('filter-type').value) params.set('type', $('filter-type').value);
  if ($('filter-status').value) params.set('status', $('filter-status').value);

  const items = await request(`${API}?${params}`);
  const list = $('list');
  if (items.length === 0) {
    list.innerHTML = '<li class="empty">ยังไม่มีรายการ</li>';
    return;
  }
  list.innerHTML = items.map((t) => `
    <li>
      <div>
        <div class="item-name">
          <span class="badge ${t.type}">${TYPE_LABEL[t.type]}</span>${esc(t.name)}
        </div>
        <div class="meta">
          ${t.genre ? esc(t.genre) + ' · ' : ''}${STATUS_LABEL[t.status]}
          ${t.rating ? ` · <span class="stars">${'★'.repeat(t.rating)}</span>` : ''}
        </div>
        ${t.note ? `<div class="note">${esc(t.note)}</div>` : ''}
      </div>
      <div class="item-actions">
        <select class="status-select" data-id="${t.id}" title="เปลี่ยนสถานะ">
          ${Object.entries(STATUS_LABEL).map(([v, l]) =>
            `<option value="${v}" ${v === t.status ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
        <button class="small secondary" data-edit="${t.id}">แก้ไข</button>
        <button class="small danger" data-delete="${t.id}">ลบ</button>
      </div>
    </li>`).join('');
}

const refresh = () => Promise.all([loadList(), loadStats()]).catch((e) => toast(e.message, true));

// ---------- ฟอร์ม เพิ่ม/แก้ไข ----------
function resetForm() {
  form.reset();
  $('id').value = '';
  $('form-title').textContent = 'เพิ่มรายการใหม่';
  $('submit-btn').textContent = 'เพิ่ม';
  $('cancel-btn').hidden = true;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = {};
  fields.slice(1).forEach((f) => (body[f] = $(f).value));
  body.rating = body.rating ? Number(body.rating) : null;

  const id = $('id').value;
  try {
    if (id) {
      await request(`${API}/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      toast('บันทึกการแก้ไขแล้ว');
    } else {
      await request(API, { method: 'POST', body: JSON.stringify(body) });
      toast('เพิ่มรายการแล้ว');
    }
    resetForm();
    refresh();
  } catch (err) {
    toast(err.message, true);
  }
});

$('cancel-btn').addEventListener('click', resetForm);

// ---------- ปุ่มในรายการ ----------
$('list').addEventListener('click', async (e) => {
  const editId = e.target.dataset.edit;
  const deleteId = e.target.dataset.delete;
  try {
    if (editId) {
      const t = await request(`${API}/${editId}`);
      fields.forEach((f) => ($(f).value = t[f] ?? ''));
      $('form-title').textContent = `แก้ไข: ${t.name}`;
      $('submit-btn').textContent = 'บันทึก';
      $('cancel-btn').hidden = false;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    if (deleteId && confirm('ต้องการลบรายการนี้ใช่ไหม?')) {
      await request(`${API}/${deleteId}`, { method: 'DELETE' });
      toast('ลบแล้ว');
      refresh();
    }
  } catch (err) {
    toast(err.message, true);
  }
});

$('list').addEventListener('change', async (e) => {
  if (!e.target.classList.contains('status-select')) return;
  try {
    await request(`${API}/${e.target.dataset.id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: e.target.value }),
    });
    toast('อัปเดตสถานะแล้ว');
    refresh();
  } catch (err) {
    toast(err.message, true);
  }
});

// ---------- ค้นหา / กรอง ----------
let searchTimer;
$('search').addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadList, 250);
});
$('filter-type').addEventListener('change', loadList);
$('filter-status').addEventListener('change', loadList);

refresh();
