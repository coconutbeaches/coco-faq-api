import handler from './api/createFaq.js';
import express from 'express';

const app = express();
app.use(express.json());

app.post('/api/createFaq', handler);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`FAQ API server running at http://localhost:${PORT}`);
  console.log(`Test endpoint: http://localhost:${PORT}/api/createFaq`);
});
