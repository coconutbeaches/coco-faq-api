import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  try {
    console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Missing');
    console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing');
    
    // Test 1: Try to list tables
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_schema_tables');
    
    // Test 2: Try to query the chatbot_faqs table
    const { data: faqs, error: faqError } = await supabase
      .from('chatbot_faqs')
      .select('count')
      .limit(1);
    
    // Test 3: Try to insert a test record
    const { data: insertData, error: insertError } = await supabase
      .from('chatbot_faqs')
      .insert([{
        category: 'test',
        question: 'Test question from API',
        keywords: ['test'],
        answer: 'Test answer',
        is_active: true
      }])
      .select()
      .single();

    return res.status(200).json({
      environment: {
        supabase_url: process.env.SUPABASE_URL ? 'Set' : 'Missing',
        supabase_key: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing'
      },
      tests: {
        tables: { error: tablesError?.message || null, data: tables ? 'Success' : 'Failed' },
        faq_query: { error: faqError?.message || null, data: faqs ? 'Success' : 'Failed' },
        faq_insert: { error: insertError?.message || null, data: insertData?.id || null }
      }
    });
  } catch (err) {
    console.error('Test error:', err);
    return res.status(500).json({
      error: err.message,
      stack: err.stack
    });
  }
}
