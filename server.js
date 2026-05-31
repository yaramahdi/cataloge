const express = require('express');
const path = require('path');
const { getPool } = require('./db/database');
const apiRouter = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', apiRouter);

async function start() {
  await getPool();
  app.listen(PORT, () => {
    console.log(`[SERVER] Running on http://localhost:${PORT}`);
  });
}

start().catch(err => {
  console.error('[SERVER] Failed to start:', err);
  process.exit(1);
});
