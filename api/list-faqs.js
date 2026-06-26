import { supabase } from './supabaseAdmin.js';

export default async function handler(req, res) {
  try {
    const { data: faqs, error } = await supabase
      .from('chatbot_faqs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    return res.status(200).json({
      count: faqs?.length || 0,
      faqs: faqs || []
    });
  } catch (err) {
    console.error('Error listing FAQs:', err);
    return res.status(500).json({
      error: err.message
    });
  }
}
