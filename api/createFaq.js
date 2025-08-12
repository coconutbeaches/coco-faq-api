import { createClient } from '@supabase/supabase-js';
import natural from 'natural';

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

// Helper: check if raw input looks like a Q/A format
function isQAFormat(input) {
  if (!input) return false;
  const normalized = input.trim();
  // Check for Q: ... A: ... pattern
  return /Q:\s*.+A:\s*.+/i.test(normalized);
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
  if (/(weather|rain|sun|temperature|climate)/.test(q)) return 'weather';
  return 'general';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Add CORS headers for better compatibility
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Add environment variable validation
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase environment variables');
      return res.status(500).json({
        error: 'Server configuration error',
        confirmation_message: 'Sorry, there was a server configuration issue.'
      });
    }

    let { category, question, keywords, answer, is_active = true, image_url, raw } = req.body;

    // If raw input provided, parse it
    if (raw) {
      // Check if it's a Q/A format OR has trigger phrase
      const hasValidFormat = isTriggerMatch(raw) || isQAFormat(raw);
      
      if (!hasValidFormat) {
        return res.status(400).json({
          error: 'Invalid FAQ format',
          confirmation_message: 'Please provide FAQ in Q: ... A: ... format or include a trigger phrase.'
        });
      }

      // Extract Q, A, K from raw - improved approach
      const qMatch = raw.match(/Q:\s*(.+?)(?=\s*A:|$)/i);
      const aMatch = raw.match(/A:\s*(.+?)(?=\s*K:|$)/i);
      const kMatch = raw.match(/K:\s*(.+)$/i);

      let parsedQuestion = null;
      let parsedAnswer = null;
      let parsedKeywords = null;

      if (qMatch) {
        parsedQuestion = qMatch[1].trim();
      }

      if (aMatch) {
        parsedAnswer = aMatch[1].trim();
      }

      if (kMatch) {
        parsedKeywords = kMatch[1].split(',').map(k => k.trim()).filter(k => k.length > 0);
      }

      question = question || parsedQuestion;
      answer = answer || parsedAnswer;
      keywords = keywords || parsedKeywords;
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

    console.log('Creating FAQ:', { category, question, keywords, answer });

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

    if (error) {
      console.error('Supabase insert error:', error);
      throw error;
    }

    console.log('FAQ created successfully:', data);

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
}
