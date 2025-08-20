import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Lightweight keyword extraction
function extractKeywords(text) {
  if (!text) return [];
  const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
  const stopwords = new Set(['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'she', 'use', 'her', 'own', 'say', 'she', 'too', 'any', 'may', 'say', 'she', 'use']);
  return [...new Set(words.filter(w => !stopwords.has(w)))].slice(0, 6);
}

// Simple category detection
function detectCategory(question) {
  if (!question) return 'general';
  const q = question.toLowerCase();
  if (/(beach|sand|ocean|water|surf|wave|swimming|shore)/.test(q)) return 'beach & safety';
  if (/(room|hotel|stay|check|accommodation)/.test(q)) return 'amenities & facilities';
  if (/(food|drink|restaurant|menu|dining|eat)/.test(q)) return 'dining';
  if (/(activity|tour|trip|bike|kayak|snorkel)/.test(q)) return 'activities';
  if (/(policy|rule|pet|smoke|cancel)/.test(q)) return 'policies';
  if (/(weather|rain|sun|climate|temperature)/.test(q)) return 'weather';
  return 'general';
}

export default async function handler(req, res) {
  // Fast response headers
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { question, answer, category, keywords, is_active = true } = req.body || {};

    // Quick validation
    if (!question?.trim() || !answer?.trim()) {
      return res.status(400).json({
        error: 'Missing required fields',
        confirmation_message: 'Both question and answer are required.'
      });
    }

    const cleanQuestion = question.trim();
    const cleanAnswer = answer.trim();
    
    // Auto-detect category and keywords
    const finalCategory = category || detectCategory(cleanQuestion);
    const finalKeywords = keywords && keywords.length > 0 
      ? keywords 
      : extractKeywords(`${cleanQuestion} ${cleanAnswer}`);

    // Direct insert - no retries for speed
    const { data, error } = await supabase
      .from('chatbot_faqs')
      .insert([{
        category: finalCategory,
        question: cleanQuestion,
        keywords: finalKeywords,
        answer: cleanAnswer,
        is_active,
        image_url: null
      }])
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({
        error: 'Database error',
        confirmation_message: 'Sorry, there was an error saving your FAQ.'
      });
    }

    return res.status(201).json({
      ...data,
      confirmation_message: `Got it. I've added your FAQ: "${cleanQuestion}".`
    });

  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({
      error: 'Server error',
      confirmation_message: 'Sorry, there was an unexpected error.'
    });
  }
}
