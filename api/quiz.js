export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt, image } = req.body;
  if (!prompt) return res.status(400).json({ error: 'No prompt provided' });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GROQ_API_KEY not set in Vercel environment variables' });

  try {
    let messageContent;
    if (image && image.base64) {
      messageContent = [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: `data:${image.mimeType};base64,${image.base64}` } }
      ];
    } else {
      messageContent = prompt;
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model: image ? 'llava-v1.5-7b-4096-preview' : 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: messageContent }],
        max_tokens: 3000,
        temperature: 0.7
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || 'Groq API error' });

    const result = data.choices?.[0]?.message?.content;
    if (!result) return res.status(500).json({ error: 'Empty response from Groq' });

    res.status(200).json({ result });
  } catch (e) {
    res.status(500).json({ error: 'Server error: ' + e.message });
  }
}
