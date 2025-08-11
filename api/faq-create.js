import express from 'express';
import { createClient } from '@supabase/supabase-js';
import natural from 'natural';

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Expanded trigger phrases (lowercase)
const TRIGGER_PHRASES = [
  '/faq',
  'slash faq',
  'add faq',
  'new faq',
  'hey coco add faq',
  'hey coco new faq'
];

// Fuzzy match threshold
const FUZZY_THRESHOLD = 0.8;

// Helper: fuzzy trigger detection
function isTriggerMatch(input) {
  if (!input) return false;
  const normalized = input.trim().toLowerCase();
  return TRIGGER_PHRASES.some(phrase => {
    const distance = natural.JaroWinklerDistance(normalized, phrase);
    return distance >= FUZZY_THRESHOLD || normalized.startsWith(phrase);
  });
}

// Helper: extract keywords automatically from question+answer
function extractKeywords(question, answer) {
  if (!question && !answer) return [];
  const tokenizer = new natural.WordTokenizer();
  const words = tokenizer.tokenize(`${question || ''} ${answer || ''}`.toLowerCase());
  const stopWords = new Set(natural.stopwords);
  const filtered = words.filter(w => /^[a-z]+$/.test(w) && !stopWords.has(w));
  return [...new Set(filtered)].slice(0, 10); // Limit to 10 keywords
}

// Helper: detect category dynamically from DB with fallback
async function detectCategory(question, providedCategory) {
  if (providedCategory) return providedCategory;

  // Try DB lookup
  const { data: categories } = await supabase
    .from('faq_categories')
    .select('name')
    .order('name');

  if (categories && question) {
    for (const cat of categories) {
      const catName = cat.name.toLowerCase();
      if (question.toLowerCase().includes(catName)) {
        return cat.name;
      }
    }
  }

  // Fallback rules
  const q = question?.toLowerCase() || '';
  if (/(room|hotel|stay|check-in|check-out)/.test(q)) return 'amenities & facilities';
  if (/(food|drink|restaurant|menu|breakfast)/.test(q)) return 'dining';
  if (/(bike|kayak|snorkel|tour|trip)/.test(q)) return 'activities';
  if (/(policy|rules|pets|smoke)/.test(q)) return 'policies';
  return 'general';
}

router.post('/faq-create', async (req, res) => {
  try {
    let { category, question, keywords, answer, is_active = true, image_url, raw } = req.body;

    // If raw input provided, parse it
    if (raw) {
      if (!isTriggerMatch(raw)) {
        return res.status(400).json({
          error: 'Trigger phrase not detected',
          confirmation_message: 'I did not detect a valid FAQ command.'
        });
      }

      // Extract Q, A, K from raw
      const qMatch = raw.match(/Q\s+(.+?)\s+A/i);
      const aMatch = raw.match(/A\s+(.+?)\s+K/i);
      const kMatch = raw.match(/K\s+(.+)/i);

      question = question || (qMatch ? qMatch[1].trim() : null);
      answer = answer || (aMatch ? aMatch[1].trim() : null);
      keywords = keywords || (kMatch ? kMatch[1].split(',').map(k => k.trim()) : null);
    }

    if (!question || !answer) {
      return res.status(400).json({
        error: 'Missing required fields: question and answer',
        confirmation_message: 'Please provide both a question and an answer.'
      });
    }

    // Auto keyword extraction if missing
    if (!keywords || keywords.length === 0) {
      keywords = extractKeywords(question, answer);
    }

    // Detect category dynamically
    category = await detectCategory(question, category);

    // Insert into DB
    const { data, error } = await supabase
      .from('chatbot_faqs')
      .insert([{
        category,
        question,
        keywords,
        answer,
        is_active,
        image_url
      }])
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({
      ...data,
      confirmation_message: `Got it. I've added your FAQ: "${question}".`
    });
  } catch (err) {
    console.error('Error creating FAQ:', err);
    return res.status(500).json({
      error: err.message,
      confirmation_message: 'Sorry, there was an error while adding your FAQ.'
    });
  }
});

export default router;
