function parseProvider(content) {
  const text = String(content || '').trim();
  if (text.includes('data:')) {
    const events = text.split(/\r?\n/).filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trim()).filter((line) => line && line !== '[DONE]').map((line) => {
      try { return JSON.parse(line); } catch { return null; }
    }).filter(Boolean);
    const assembled = events.flatMap((event) => event.choices || []).map((choice) => choice.delta?.content || choice.message?.content || '').join('');
    if (assembled) return { choices: [{ message: { content: assembled } }] };
  }
  return JSON.parse(text);
}

export function normalizeTranslateResponse(content) {
  let text = String(content || '').trim();

  let payload;
  try {
    payload = parseProvider(text);
  } catch {
    payload = text;
  }

  let rawValue = typeof payload === 'object' ? payload?.choices?.[0]?.message?.content ?? payload?.translation ?? text : payload;
  if (typeof rawValue === 'object') {
    rawValue = JSON.stringify(rawValue);
  }
  let translation = String(rawValue || '').trim();

  // Strip markdown code fences if present
  translation = translation.replace(/^```(?:json|markdown)?\s*/i, '').replace(/\s*```$/, '').trim();

  // If translation still looks like JSON or contains JSON fields, parse recursively
  if (translation.startsWith('{')) {
    try {
      const parsed = JSON.parse(translation);
      if (parsed.translation) {
        translation = parsed.translation;
      } else if (parsed.choices?.[0]?.message?.content) {
        translation = parsed.choices[0].message.content;
      }
    } catch {
      // Keep raw if JSON parse fails
    }
  }

  translation = translation.replace(/^```(?:json|markdown)?\s*/i, '').replace(/\s*```$/, '').trim();

  if (!translation) throw new Error('Provider returned empty translation');
  return translation;
}

export async function translateText({ text, sourceLanguage, targetLanguage }) {
  const baseUrl = process.env.OPENAI_BASE_URL;
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;
  if (!baseUrl || !apiKey || !model) throw new Error('Translation provider is not configured');

  const systemPrompt = `You are a professional travel translator. 
Translate the text accurately from ${sourceLanguage} to ${targetLanguage}.
Formatting rules:
1. Do NOT enclose your output in markdown code blocks like \`\`\`json or \`\`\`. Output ONLY plain text translation.
2. If ${targetLanguage} uses a non-Latin script (such as Japanese, Chinese, Korean, Arabic, Hindi, or Javanese script), provide:
   - Line 1: The original script text with key characters/words formatted in **bold**
   - Line 2: The Romaji / Pinyin / Latin pronunciation inside brackets like (Pronunciation here)
3. For Latin-based target languages, output a clean, natural translation without code blocks.`;

  let response;
  try {
    response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ 
        model, 
        temperature: 0.2, 
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Translate from ${sourceLanguage} to ${targetLanguage}: ${text}` }
        ] 
      }),
    });
  } catch { throw new Error('Translation provider request failed'); }
  if (!response.ok) throw new Error(`Translation provider returned HTTP ${response.status}`);
  try { 
    return normalizeTranslateResponse(await response.text()); 
  } catch (error) { 
    throw new Error(error instanceof Error && error.message.includes('empty') ? 'Translation provider returned empty translation' : 'Translation provider returned invalid response'); 
  }
}
