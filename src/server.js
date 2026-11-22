const { openDatabase } = require('./db');
const { createApp } = require('./app');
const { seed } = require('./seed');

const PORT = Number(process.env.PORT) || 3000;

const db = openDatabase();
// First run: start with sample data so the API is usable immediately.
if (db.prepare('SELECT COUNT(*) AS n FROM internships').get().n === 0) {
  console.log(`Empty database, seeded ${seed(db)} internships`);
}

const server = createApp(db).listen(PORT, () => {
  console.log(`Internship API listening on http://localhost:${PORT}`);
});

function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
