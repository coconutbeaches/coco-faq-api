import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const startTime = Date.now();
    
    // Test Supabase connection
    const { data, error } = await supabase
      .from('chatbot_faqs')
      .select('count')
      .limit(1);
    
    const responseTime = Date.now() - startTime;
    
    if (error) throw error;
    
    return res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.4.0',
      environment: {
        supabase_url: process.env.SUPABASE_URL ? 'configured' : 'missing',
        supabase_key: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'configured' : 'missing'
      },
      database: {
        connected: true,
        response_time_ms: responseTime
      }
    });
  } catch (err) {
    console.error('Health check failed:', err);
    return res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: err.message,
      environment: {
        supabase_url: process.env.SUPABASE_URL ? 'configured' : 'missing',
        supabase_key: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'configured' : 'missing'
      }
    });
  }
}
