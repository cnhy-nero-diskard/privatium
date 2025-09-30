import { NextApiRequest, NextApiResponse } from 'next';

// Groq API endpoint and key
const GROQ_API_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = process.env.GROQ_API_KEY;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { entries, month, year } = req.body;

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ message: 'Invalid entries data' });
    }

    if (!GROQ_API_KEY) {
      return res.status(500).json({ message: 'API key not configured' });
    }

    // Format entries for better context
    const formattedEntries = entries.map(entry => {
      return `Date: ${entry.date}
Title: ${entry.title}
Mood: ${entry.mood}
Tags: ${entry.tags ? entry.tags.join(', ') : 'None'}
Content: ${entry.content}
---`;
    }).join('\n\n');

    // Create prompt for the AI
    const messages = [
      {
        role: "system",
        content: `You are a compassionate, professional therapist analyzing journal entries.
                 Respond ONLY with valid JSON that matches this exact schema:
                 {
                   "summary": "string",
                   "key_patterns": ["string"],
                   "major_stressors": ["string"],
                   "positive_shifts": ["string"],
                   "recommendations": ["string"],
                   "focus_prompt": "string"
                 }
                 Formatting rules:
                 - summary: 1-2 sentences that capture the emotional landscape.
                 - key_patterns: up to 4 short observations (<= 18 words each).
                 - major_stressors: 1-4 concise stressors; use [] if none.
                 - positive_shifts: up to 3 uplifting shifts; use [] if none.
                 - recommendations: 3-5 therapist-style action steps phrased as gentle imperatives.
                 - focus_prompt: exactly one motivating reflection or journaling prompt.
                 No markdown, bullet markers, commentary, or extra keys. Use [] for empty arrays. Maintain a warm, supportive tone within the strings. Never mention that you're an AI.`
      },
      {
        role: "user",
        content: `Please analyze these journal entries for ${month} ${year} and provide therapeutic insights:\n\n${formattedEntries}`
      }
    ];

    // Call Groq API
    const response = await fetch(GROQ_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile", // You can use "llama3-70b-8192" for more advanced responses
        messages,
        temperature: 0.5,
        max_tokens: 450
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Groq API error:', errorData);
      throw new Error(`Groq API returned ${response.status}`);
    }

    const data = await response.json();
    const messageContent = data.choices?.[0]?.message?.content;

    if (!messageContent) {
      throw new Error('Groq API response missing content');
    }

    const cleanedContent = messageContent
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    let parsedOutput: any;
    try {
      parsedOutput = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse AI output:', cleanedContent);
      throw new Error('AI output did not match the expected JSON format');
    }

    const ensureString = (value: unknown): string =>
      typeof value === 'string' ? value.trim() : '';

    const ensureStringArray = (value: unknown): string[] =>
      Array.isArray(value)
        ? value
            .map(item => (typeof item === 'string' ? item.trim() : ''))
            .filter(item => item.length > 0)
        : [];

    const insights = {
      summary: ensureString(parsedOutput.summary),
      keyPatterns: ensureStringArray(parsedOutput.key_patterns),
      majorStressors: ensureStringArray(parsedOutput.major_stressors),
      positiveShifts: ensureStringArray(parsedOutput.positive_shifts),
      recommendations: ensureStringArray(parsedOutput.recommendations),
      focusPrompt: ensureString(parsedOutput.focus_prompt)
    };

    if (!insights.summary || insights.recommendations.length === 0 || !insights.focusPrompt) {
      throw new Error('AI output missing required insight fields');
    }

    return res.status(200).json({ insights });

  } catch (error: any) {
    console.error('Error in AI Therapist API:', error);
    return res.status(500).json({ 
      message: 'Failed to generate summary', 
      error: error.message || 'Unknown error' 
    });
  }
}