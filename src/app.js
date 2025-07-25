import express from 'express';
import dotenv from 'dotenv';
import scraperRoutes from './routes/scraper.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use('/api/scraper', scraperRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});