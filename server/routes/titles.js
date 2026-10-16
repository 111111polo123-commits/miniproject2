// REST API สำหรับ resource "titles" (หนัง / ซีรีส์ / เกม)
const express = require('express');
const db = require('../db');

const router = express.Router();
const TYPES = ['movie', 'series', 'game'];
const STATUSES = ['planned', 'in_progress', 'completed'];
const FIELDS = ['name', 'type', 'genre', 'status', 'rating', 'note'];

// ตรวจสอบข้อมูลที่ส่งมา คืนข้อความ error หรือ null ถ้าถูกต้อง
// partial = true ใช้ตอนแก้ไข (ส่งมาเฉพาะบางฟิลด์ได้)
function validate(body, partial = false) {
  const { name, type, status, rating } = body;
  if (!partial || name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) return 'name is required';
  }
  if (!partial || type !== undefined) {
    if (!TYPES.includes(type)) return `type must be one of: ${TYPES.join(', ')}`;
  }
  if (status !== undefined && !STATUSES.includes(status)) {
    return `status must be one of: ${STATUSES.join(', ')}`;
  }
  if (rating !== undefined && rating !== null && rating !== '') {
    const r = Number(rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) return 'rating must be an integer 1-5';
  }
  return null;
}

const clean = (v) => (v === undefined || v === '' ? null : typeof v === 'string' ? v.trim() : v);
const findById = (id) => db.prepare('SELECT * FROM titles WHERE id = ?').get(id);

// GET /api/titles  — ดึงทั้งหมด (กรองได้ด้วย ?type= ?status= ?q=)
router.get('/', (req, res) => {
  const { type, status, q } = req.query;
  let sql = 'SELECT * FROM titles WHERE 1=1';
  const params = [];
  if (type) { sql += ' AND type = ?'; params.push(type); }
  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (q) { sql += ' AND (name LIKE ? OR genre LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }
  sql += ' ORDER BY id DESC';
  res.json(db.prepare(sql).all(...params));
});

// GET /api/titles/stats  — สรุปจำนวนตามสถานะและประเภท
router.get('/stats', (req, res) => {
  const stats = { total: 0, planned: 0, in_progress: 0, completed: 0, movie: 0, series: 0, game: 0 };
  db.prepare('SELECT status, type, COUNT(*) AS n FROM titles GROUP BY status, type')
    .all()
    .forEach((r) => {
      stats.total += r.n;
      stats[r.status] += r.n;
      stats[r.type] += r.n;
    });
  res.json(stats);
});

// GET /api/titles/:id  — ดึงรายการเดียว
router.get('/:id', (req, res) => {
  const item = findById(req.params.id);
  if (!item) return res.status(404).json({ error: 'Title not found' });
  res.json(item);
});

// POST /api/titles  — เพิ่มรายการใหม่
router.post('/', (req, res) => {
  const error = validate(req.body);
  if (error) return res.status(400).json({ error });
  const { name, type, genre, status = 'planned', rating, note } = req.body;
  const info = db
    .prepare('INSERT INTO titles (name, type, genre, status, rating, note) VALUES (?, ?, ?, ?, ?, ?)')
    .run(clean(name), type, clean(genre), status, clean(rating), clean(note));
  res.status(201).json(findById(info.lastInsertRowid));
});

// PUT /api/titles/:id  — แก้ไขรายการ (ส่งเฉพาะฟิลด์ที่ต้องการเปลี่ยนได้)
router.put('/:id', (req, res) => {
  const existing = findById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Title not found' });
  const error = validate(req.body, true);
  if (error) return res.status(400).json({ error });

  const merged = { ...existing };
  FIELDS.forEach((key) => {
    if (req.body[key] !== undefined) merged[key] = req.body[key];
  });
  db.prepare(
    'UPDATE titles SET name = ?, type = ?, genre = ?, status = ?, rating = ?, note = ? WHERE id = ?'
  ).run(
    clean(merged.name), merged.type, clean(merged.genre), merged.status,
    clean(merged.rating), clean(merged.note), req.params.id
  );
  res.json(findById(req.params.id));
});

// DELETE /api/titles/:id  — ลบรายการ
router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM titles WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Title not found' });
  res.json({ message: 'Title deleted', id: Number(req.params.id) });
});

module.exports = router;
