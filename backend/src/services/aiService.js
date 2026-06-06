const SYSTEM_PROMPT = `You are an expert software engineer.
You will be given a repository context and a task to perform.
You must respond ONLY with a valid JSON object — no extra text,
no markdown, no explanation outside the JSON.

Response format:
{
  "files": [
    {
      "path": "relative/path/to/file.js",
      "content": "full file content here",
      "action": "create or modify"
    }
  ],
  "commitMessage": "short descriptive commit message",
  "prTitle": "pull request title",
  "prDescription": "detailed description of what was done and why"
}`;

const buildPrompt = (userPrompt, repoContext) => {
    return `${SYSTEM_PROMPT}

Repository Context:
${repoContext}

Task:
${userPrompt}`;
};

const parseResponse = (responseText) => {
    const cleaned = responseText
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('AI did not return valid JSON. Response: ' + responseText.slice(0, 200));
    }

    return JSON.parse(jsonMatch[0]);
};

const generateCode = async (prompt, repoContext) => {
    const provider = (process.env.AI_PROVIDER || 'claude').toLowerCase().trim();
    const fullPrompt = buildPrompt(prompt, repoContext);

    let url, headers, body, extractText;

    if (provider === 'claude') {
        url = 'https://api.anthropic.com/v1/messages';
        headers = {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01'
        };
        body = {
            model: 'claude-opus-4-5',
            max_tokens: 4096,
            messages: [{ role: 'user', content: fullPrompt }]
        };
        extractText = (data) => data.content[0].text;

    } else if (provider === 'gemini') {
        url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${process.env.GEMINI_API_KEY}`;
        headers = { 'Content-Type': 'application/json' };
        body = {
            contents: [{ parts: [{ text: fullPrompt }] }],
            generationConfig: { maxOutputTokens: 4096 }
        };
        extractText = (data) => data.candidates[0].content.parts[0].text;

    } else if (provider === 'openai') {
        url = 'https://api.openai.com/v1/chat/completions';
        headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        };
        body = {
            model: 'gpt-4o',
            max_tokens: 4096,
            messages: [{ role: 'user', content: fullPrompt }]
        };
        extractText = (data) => data.choices[0].message.content;

    } else {
        throw new Error(`Unknown AI_PROVIDER: "${provider}". Valid options: claude, gemini, openai`);
    }

    console.log(`Using AI provider: ${provider}`);

    const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`${provider} API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return parseResponse(extractText(data));
};

module.exports = { generateCode };
