import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const { query, category } = req.query;
  if (!query) return res.status(400).json({ error: 'Missing query parameter' });
  let supaQuery = supabase.from('chatbot_faqs').select('*').eq('is_active', true);
  if (category) supaQuery = supaQuery.eq('category', category);
  supaQuery = supaQuery.or(`question.ilike.%${query}%,keywords.cs.{${query}}`);
  const { data, error } = await supaQuery;
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json(data);
}
