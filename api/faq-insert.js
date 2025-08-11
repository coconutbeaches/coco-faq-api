import { createClient } from '@supabase/supabase-js';
import natural from 'natural';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let { category, question, keywords, answer, is_active = true, image_url } = req.body;

    if (!question || !answer) {
      return res.status(400).json({
        error: 'Missing required fields: question and answer',
        message: 'Please provide both a question and an answer.'
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

    return res.status(200).json(data);
  } catch (err) {
    console.error('Error inserting FAQ:', err);
    return res.status(500).json({
      error: err.message,
      message: 'Sorry, there was an error while inserting your FAQ.'
    });
  }
}
