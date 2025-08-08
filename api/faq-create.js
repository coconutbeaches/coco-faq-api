import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { category, question, keywords, answer, is_active = true, image_url } = req.body;
  if (!category || !question || !Array.isArray(keywords) || !answer)
    return res.status(400).json({ error: 'Missing required fields.' });
  const { data, error } = await supabase
    .from('chatbot_faqs')
    .insert([{ category, question, keywords, answer, is_active, image_url }])
    .select('*')
    .single();
  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json(data);
}
