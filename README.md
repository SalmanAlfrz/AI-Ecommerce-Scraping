# AI-Ecommerce-Scraping

An API for scraping e-commerce products (eBay) using AI (DeepSeek) for smart and automated product data extraction.

## Features

- Scrape eBay products based on search keywords.
- Scrape all search result pages (automatic pagination, no page limit).
- Uses AI (DeepSeek) to extract product name, price, URL, and description.
- Visits each product detail page to retrieve the seller's description.
- Returns results in JSON format.
- Fallback to "-" if any data is missing.

## Technical Notes

- **Batch Product Scraping:**  
  Scraping is performed in batches (10 products per batch) to avoid errors or limitations from the AI API (DeepSeek). This also helps maintain performance and stability.

- **Batch Description Extraction:**  
  Product description extraction from detail pages is also performed in batches (5 products per batch) to avoid sending too many requests to the AI at once, making it safer from rate limits or errors.

- **Pagination (Multi-Page):**  
  The scraper automatically traverses all eBay search result pages (pagination) until there is no "Next" button. There is no page limit, so all found products will be scraped.  
  You can also set how many pages you want to scrape if needed.

- **Automatic Delay:**  
  There is a delay between batches to avoid bot detection and reduce the risk of errors from eBay or DeepSeek.

## Getting Started

1. **Clone this repo**

   ```sh
   git clone https://github.com/salmanalfrz/ai-ecommerce-scraping.git
   cd ai-ecommerce-scraping
   ```

2. **Install dependencies**

   ```sh
   npm install
   ```

3. **Prepare the `.env` file**

   ```
   DEEPSEEK_API_KEY=your_deepseek_api_key
   PORT=3000
   ```

4. **Start the server**
   ```sh
   npm start
   ```

## API Endpoint

### GET `/api/scraper?q=keyword`

**Query Parameter:**

- `q` (string): Product search keyword (e.g., `nike`)

**Example Request:**

```
GET http://localhost:3000/api/scraper?q=nike
```

**Example Response:**

```json
[
  {
    "title": "Nike Air Max 270",
    "price": "$120.00",
    "url": "https://www.ebay.com/itm/1234567890",
    "description": "Nike Air Max 270 running shoes with air cushioning..."
  },
  ...
]
```

- If data is not found, the field will contain `"-"`.

## Project Structure

- `src/app.js` — Express server entry point
- `src/routes/scraper.js` — API endpoint routing
- `src/services/ebayScraper.js` — Scraping logic and pagination
- `src/utils/aiParser.js` — DeepSeek integration for product & description parsing
- `src/utils/htmlDetailExtractor.js` — Extracts HTML description from product detail pages

## Notes

- Make sure your DeepSeek API key is valid and **never share it publicly**.
- Do not push your `.env` file to a public repo.
- DeepSeek rate limits may restrict large-scale scraping.

## License

MIT
