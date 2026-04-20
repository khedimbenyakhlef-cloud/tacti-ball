const axios = require('axios');

exports.handler = async function(event, context) {
  const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
  
  if (!DEEPSEEK_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Clé API non configurée" })
    };
  }
  
  try {
    const body = JSON.parse(event.body || '{}');
    
    const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'Expert analyse football. Français technique.'
        },
        {
          role: 'user',
          content: `Match: ${body.match_description || 'Test'}. Question: ${body.tactical_question || 'Analyse'}. Contexte: ${body.context || 'Football'}`
        }
      ],
      max_tokens: 1000
    }, {
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        analysis: response.data.choices[0].message.content
      })
    };
    
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};