import express from 'express';
import { scrapeEbayProducts } from '../services/ebayScraper.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const query = req.query.q;
  if (!query || typeof query !== 'string') return res.status(400).json({ error: 'Missing or invalid query parameter ?q=' });

  try {
    const data = await scrapeEbayProducts(query);
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Failed to scrape data.' });
  }
});

export default router;
