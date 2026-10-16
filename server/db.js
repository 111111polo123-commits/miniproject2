// เชื่อมต่อฐานข้อมูล SQLite และสร้างตารางถ้ายังไม่มี
const path = require('path');
const Database = require('better-sqlite3');

const db = new Database(path.join(__dirname, 'backlog.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS titles (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    type       TEXT    NOT NULL CHECK (type IN ('movie', 'series', 'game')),
    genre      TEXT,
    status     TEXT    NOT NULL DEFAULT 'planned'
               CHECK (status IN ('planned', 'in_progress', 'completed')),
    rating     INTEGER CHECK (rating BETWEEN 1 AND 5),
    note       TEXT,
    created_at TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
  )
`);

// ใส่ข้อมูลตัวอย่างครั้งแรกที่ตารางยังว่าง
const count = db.prepare('SELECT COUNT(*) AS n FROM titles').get().n;
if (count === 0) {
  const insert = db.prepare(
    'INSERT INTO titles (name, type, genre, status, rating, note) VALUES (?, ?, ?, ?, ?, ?)'
  );
  insert.run('Interstellar', 'movie', 'Sci-Fi', 'completed', 5, 'ดูซ้ำได้เรื่อย ๆ');
  insert.run('Arcane', 'series', 'Animation', 'in_progress', null, 'ถึง Season 2');
  insert.run('Elden Ring', 'game', 'Action RPG', 'planned', null, 'รอลดราคา');
}

module.exports = db;
