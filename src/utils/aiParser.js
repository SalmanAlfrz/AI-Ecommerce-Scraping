import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

export async function extractFullProductData(html) {
  try {
    const prompt = `
Extract the product's title, price, product detail URL, and description (if any) from the following HTML snippet of an eBay listing or product detail page.

Return result in JSON format like this:
{
  "title": "...",
  "price": "...",
  "url": "...",
  "description": "..."
}

Only return the JSON object. No explanation.

HTML:
${html}
    `.trim();

    const res = await axios.post(
      'https://api.deepseek.com/chat/completions',
      {
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 500
      },
      {
        headers: {
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const aiText = res.data.choices[0].message.content.trim();
    try {
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error();
      return JSON.parse(jsonMatch[0]);
    } catch {
      const get = (re, def = '-') => aiText.match(re)?.[1]?.trim() || def;
      return {
        title: get(/Title:\s*(.+)/i),
        price: get(/Price:\s*(.+)/i),
        url: get(/URL:\s*(https?:\/\/[^\s]+)/i),
        description: get(/Description:\s*(.+)/i)
      };
    }
  } catch {
    return null;
  }
}

export async function extractDescriptionFromHtml(html) {
  try {
    const MAX = 8000;
    const htmlToSend = html.length > MAX ? html.slice(0, MAX) : html;
    const prompt = `
Given the following HTML from a product detail section of an eBay listing,
extract the item description provided by the seller. If there is no seller-written description, summarize the product specifications or item specifics as a readable description.

Ignore any seller policy, timestamps, or shipping info.

Return ONLY the meaningful description in plain text, do not include any label or JSON formatting.

HTML:
${htmlToSend}
`.trim();

    const res = await axios.post(
      'https://api.deepseek.com/chat/completions',
      {
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 500
      },
      {
        headers: {
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    return res.data.choices[0].message.content.trim();
  } catch {
    return null;
  }
}




