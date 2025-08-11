import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Try to get categories from faq_categories table first
    const { data: categories, error: categoriesError } = await supabase
      .from('faq_categories')
      .select('name')
      .order('name');

    if (categories && categories.length > 0) {
      return res.status(200).json(categories.map(cat => cat.name));
    }

    // Fallback: Get unique categories from existing FAQs
    const { data: faqs, error: faqsError } = await supabase
      .from('chatbot_faqs')
      .select('category')
      .not('category', 'is', null);

    if (faqsError) throw faqsError;

    // Extract unique categories
    const uniqueCategories = [...new Set(faqs?.map(faq => faq.category) || [])].sort();

    return res.status(200).json(uniqueCategories);
  } catch (err) {
    console.error('Error fetching categories:', err);
    return res.status(500).json({
      error: err.message,
      message: 'Sorry, there was an error while fetching categories.'
    });
  }
}
