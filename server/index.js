// จุดเริ่มต้นของเซิร์ฟเวอร์ Express
const path = require('path');
const express = require('express');
const titlesRouter = require('./routes/titles');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// เสิร์ฟไฟล์ฝั่งไคลเอนต์จากโฟลเดอร์ /public
app.use(express.static(path.join(__dirname, '..', 'public')));

// API
app.use('/api/titles', titlesRouter);

// endpoint ที่ไม่มีอยู่จริง
app.use('/api', (req, res) => res.status(404).json({ error: 'Endpoint not found' }));

// จัดการ error (เช่น JSON ผิดรูปแบบ)
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🎬 Backlog running at http://localhost:${PORT}`);
});
