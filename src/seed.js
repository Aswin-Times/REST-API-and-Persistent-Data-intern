const path = require('path');
const { openDatabase } = require('./db');

const SEED = require(path.join(__dirname, '..', 'db', 'seed.json'));

/** Replace all internship rows with the seed records. Returns rows inserted. */
function seed(db) {
  const insert = db.prepare(`
    INSERT INTO internships (title, company, location, mode, stipend, duration_weeks, skills, deadline, status)
    VALUES (@title, @company, @location, @mode, @stipend, @duration_weeks, @skills, @deadline, @status)
  `);
  const run = db.transaction((rows) => {
    db.prepare('DELETE FROM internships').run();
    db.prepare("DELETE FROM sqlite_sequence WHERE name = 'internships'").run();
    for (const row of rows) insert.run({ ...row, skills: JSON.stringify(row.skills) });
  });
  run(SEED);
  return SEED.length;
}

if (require.main === module) {
  const db = openDatabase();
  console.log(`Seeded ${seed(db)} internships into ${db.name}`);
  db.close();
}

module.exports = { seed };
