# AI Therapist Summarizer Documentation

## Overview

The AI Therapist feature uses Groq's API to analyze your journal entries for a specific month and provide therapeutic insights and actionable suggestions. It uses a large language model (LLM) to identify patterns, emotional trends, and potential growth areas.

## Setup Instructions

1. **Get a Groq API Key**:
   - Go to [Groq's website](https://console.groq.com) and create an account
   - Navigate to the API section to generate an API key
   - Copy your API key

2. **Configure API Key**:
   - Open your project's `.env.local` file
   - Replace `your-groq-api-key` with your actual Groq API key:
     ```
     GROQ_API_KEY=your-actual-key-here
     ```

3. **Restart Development Server**:
   - Restart your Next.js development server to apply the environment variable

## How It Works

1. The AI Therapist feature appears at the top of your home page. Click "Show AI Therapist" to reveal it.
2. Select a month from the dropdown to focus on entries from that period.
3. Click "Generate Insights" to analyze those entries.
4. The analysis will identify:
   - Emotional patterns and trends
   - Potential stressors or challenges
   - Positive developments and growth
   - Actionable suggestions for emotional well-being
   - Areas where you might benefit from focusing energy

## Privacy and Security

- All communication with Groq's API occurs via your server, not directly from the browser
- Your journal entries are sent to Groq for analysis only when you explicitly request it
- No data is stored by Groq after the analysis is complete
- The API connection is secured with your private API key
- Only the content needed for analysis is sent (no user IDs or other personal identifiers)

## Customization

You can customize the prompt used for analysis by editing the `api/ai-therapist.ts` file. Look for the `messages` array where the system prompt is defined.

## Troubleshooting

- **"API key not configured"**: Ensure you've added your Groq API key to `.env.local` and restarted the server
- **Slow responses**: Groq API response times are generally fast, but may vary based on server load
- **Error messages**: Check the console logs for detailed error information if the summary fails

## Models

The default model is Llama3-8B (8 billion parameters). For more advanced responses, you can change to Llama3-70B by updating the model parameter in `api/ai-therapist.ts`. The larger model may provide more nuanced analysis but could be slightly slower.