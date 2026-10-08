function parseProvider(content) {
  const text = String(content || '').trim();
  if (!text.startsWith('data:')) return JSON.parse(text);
  const events = text.split(/\r?\n/).filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trim()).filter((line) => line && line !== '[DONE]').map((line) => JSON.parse(line));
  const assembled = events.flatMap((event) => event.choices || []).map((choice) => choice.delta?.content || choice.message?.content || '').join('');
  return assembled ? { choices: [{ message: { content: assembled } }] } : events[0];
}

export function normalizeTranslateResponse(content) {
  let payload;
  try {
    payload = typeof content === 'string' ? parseProvider(content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()) : content;
  } catch { throw new Error('Provider response was not valid JSON'); }
  const value = payload?.choices?.[0]?.message?.content ?? payload?.translation;
  let translation = value;
  if (typeof value === 'string' && value.trim().startsWith('{')) {
    try { translation = JSON.parse(value).translation; } catch { try { translation = JSON.parse(value.replace(/\\\\"/g, '"')).translation; } catch { throw new Error('Provider response was not valid JSON'); } }
  }
  if (typeof translation !== 'string' || !translation.trim()) throw new Error('Provider returned empty translation');
  return translation.trim();
}

export async function translateText({ text, sourceLanguage, targetLanguage }) {
  const baseUrl = process.env.OPENAI_BASE_URL;
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;
  if (!baseUrl || !apiKey || !model) throw new Error('Translation provider is not configured');
  let response;
  try {
    response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, temperature: 0, messages: [{ role: 'user', content: `Translate from ${sourceLanguage} to ${targetLanguage}. Return JSON: {"translation":"..."}. Text: ${text}` }] }),
    });
  } catch { throw new Error('Translation provider request failed'); }
  if (!response.ok) throw new Error(`Translation provider returned HTTP ${response.status}`);
  try { return normalizeTranslateResponse(await response.text()); } catch (error) { throw new Error(error instanceof Error && error.message.includes('empty') ? 'Translation provider returned empty translation' : 'Translation provider returned invalid response'); }
}
