import { NextApiRequest, NextApiResponse } from 'next';

// Groq API endpoint and key
const GROQ_API_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = process.env.GROQ_API_KEY;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { entries, month, year, rangeDescription } = req.body;

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
        content: `You are an experienced, warm, and insightful therapist reviewing a client's journal entries. Your role is to provide genuine therapeutic insights that feel personal, not generic.

Write as if you're speaking directly to the person - use "you" and "your" naturally. Be conversational yet professional, like you would be in a real therapy session.

Respond ONLY with valid JSON matching this schema:
{
  "summary": "string",
  "key_patterns": ["string"],
  "major_stressors": ["string"],
  "positive_shifts": ["string"],
  "recommendations": ["string"],
  "focus_prompt": "string"
}

Guidelines for each field:

**summary**: Write 2-3 sentences that capture the emotional journey of the month. Be specific to what you observe in their entries - reference themes, emotions, or situations they mentioned. Make it feel like you actually read their journal, not a template response.

**key_patterns**: 3-4 observations about recurring themes, emotional patterns, or behaviors you notice. Be specific and connect dots they might not see. Start with phrases like "You seem to...", "There's a pattern of...", "I notice you often..."

**major_stressors**: List 2-4 specific stressors they're dealing with. Name them clearly and validate their difficulty. If none are apparent, use [].

**positive_shifts**: 2-3 genuine moments of growth, resilience, or positive change you observed. Highlight their strengths and progress, even small wins. Be specific about what they did well. If none, use [].

**recommendations**: 3-5 actionable, personalized suggestions. Make them feel doable and relevant to their specific situation. Write as direct advice: "Try setting aside...", "Consider exploring...", "It might help to..." Avoid generic therapy speak.

**focus_prompt**: One thoughtful question or journaling prompt that encourages deeper reflection on something important from their month. Make it personal to their journey.

Use [] for empty arrays. Never mention you're an AI or reference "the journal entries." Write as if you're their therapist who has been following their story.`
      },
      {
        role: "user",
        content: `Please provide your therapeutic insights for ${rangeDescription || `${month} ${year}`} based on these journal entries:\n\n${formattedEntries}`
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
        temperature: 0.7, // Increased for more natural, varied responses
        max_tokens: 800 // Increased to allow more detailed, helpful insights
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