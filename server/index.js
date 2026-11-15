import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const PORT = Number(process.env.PORT || 3001);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, 'nutrition-log.json');
app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true }));
app.use(express.json({ limit: '32kb' }));

function readLog() { try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch { return []; } }
function writeLog(data) { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); }

app.get('/api/health', (_req, res) => res.json({ ok: true, configured: Boolean(process.env.GROQ_API_KEY) }));
app.post('/api/estimate', async (req, res) => {
  const { text, meal = 'Meal' } = req.body || {};
  if (typeof text !== 'string' || !text.trim()) return res.status(400).json({ error: 'Enter the food and portion details first.' });
  if (text.length > 1000) return res.status(400).json({ error: 'Food description must be 1,000 characters or fewer.' });
  if (!process.env.GROQ_API_KEY) return res.status(503).json({ error: 'Groq API key is not configured. Add GROQ_API_KEY to server/.env and restart the backend.' });

  const systemPrompt = `You are a careful nutrition estimation assistant. Estimate calories and protein from Indian and international foods using the described portions. Return ONLY valid JSON, no markdown, in exactly this shape: {"items":[{"food":"string","quantity":"string","calories":number,"protein":number}],"total_calories":number,"total_protein":number,"notes":"string"}. Include one item per identifiable food. Use realistic cooked-food estimates; account for oil/ghee when mentioned. If portion size is vague, make a conservative typical-serving assumption and state it briefly in notes. Do not invent exactness: values are estimates. All calories are kcal and protein is grams. Totals must equal the sum of items. If an item is unclear, estimate cautiously and mention the assumption.`;
  try {
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
        temperature: 0.15,
        max_tokens: 1200,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Meal category: ${String(meal).slice(0, 30)}\nFood eaten: ${text.trim()}` }
        ]
      })
    });
    const raw = await groqResponse.json();
    if (!groqResponse.ok) return res.status(502).json({ error: raw?.error?.message || 'Groq request failed. Check your API key, model and usage limits.' });
    const content = raw?.choices?.[0]?.message?.content;
    if (!content) throw new Error('The AI returned an empty response. Try again.');
    const result = JSON.parse(content);
    if (!Array.isArray(result.items) || !Number.isFinite(Number(result.total_calories)) || !Number.isFinite(Number(result.total_protein))) throw new Error('The AI response did not contain valid nutrition totals. Try again.');
    const clean = {
      items: result.items.map(i => ({ food: String(i.food || 'Food'), quantity: String(i.quantity || ''), calories: Math.max(0, Number(i.calories) || 0), protein: Math.max(0, Number(i.protein) || 0) })),
      total_calories: Math.max(0, Number(result.total_calories)),
      total_protein: Math.max(0, Number(result.total_protein)),
      notes: String(result.notes || '')
    };
    const log = readLog();
    log.push({ id: crypto.randomUUID(), meal: String(meal), description: text.trim(), ...clean, createdAt: new Date().toISOString() });
    writeLog(log.slice(-5000));
    res.json(clean);
  } catch (error) {
    console.error('Nutrition estimation error:', error);
    res.status(502).json({ error: error.message || 'Unable to estimate nutrition right now.' });
  }
});

app.get('/api/history', (_req, res) => res.json(readLog()));

const distPath = path.resolve(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
}
app.listen(PORT, '0.0.0.0', () => console.log(`NutriTrack AI backend listening on http://localhost:${PORT}`));
