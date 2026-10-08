const MARKETPLACE_HOSTS = new Set([
  'tokopedia.com',
  'www.tokopedia.com',
  'shopee.co.id',
  'www.shopee.co.id',
]);

const SEARCH_URLS = {
  tokopedia: (name) => `https://www.tokopedia.com/search?st=product&q=${encodeURIComponent(name)}`,
  shopee: (name) => `https://shopee.co.id/search?keyword=${encodeURIComponent(name)}`,
};

function nullableText(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function nonNegativeNumber(value) {
  const number = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function safeMarketplaceUrl(value) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && MARKETPLACE_HOSTS.has(url.hostname.toLowerCase()) ? url.href : null;
  } catch {
    return null;
  }
}

export function parseProviderResponse(content) {
  const text = typeof content === 'string' ? content.trim() : '';
  if (!text.startsWith('data:')) return JSON.parse(text);
  const chunks = text.split(/\r?\n/)
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())
    .filter((line) => line && line !== '[DONE]');
  const events = chunks.map((chunk) => JSON.parse(chunk));
  const assembled = events.flatMap((event) => event.choices || [])
    .map((choice) => choice.delta?.content || choice.message?.content || '')
    .join('');
  if (assembled) return { choices: [{ message: { content: assembled } }] };
  return events[0];
}

function responseJson(content) {
  const text = typeof content === 'string' ? content.trim() : '';
  const unfenced = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  try {
    return parseProviderResponse(unfenced);
  } catch {
    throw new Error('AI response was not valid JSON');
  }
}

export function normalizeScannerAnalysis(content) {
  const input = typeof content === 'string' ? responseJson(content) : content;
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('AI response must be a JSON object');
  }

  const productName = nullableText(input.product_name);
  if (!productName) throw new Error('AI response requires a valid product_name');

  const tokopediaUrl = safeMarketplaceUrl(input.tokopedia_url) || SEARCH_URLS.tokopedia(productName);
  const shopeeUrl = safeMarketplaceUrl(input.shopee_url) || SEARCH_URLS.shopee(productName);
  const marketplaceUrl = safeMarketplaceUrl(input.marketplace_url);
  const marketplace = ['tokopedia', 'shopee', 'both'].includes(input.marketplace) ? input.marketplace : null;

  return {
    product_name: productName,
    brand: nullableText(input.brand),
    model: nullableText(input.model),
    price_jpy: nonNegativeNumber(input.price_jpy),
    lowest_price_idr: nonNegativeNumber(input.lowest_price_idr),
    average_price_idr: nonNegativeNumber(input.average_price_idr),
    currency: nullableText(input.currency) || 'JPY',
    marketplace,
    marketplace_url: marketplaceUrl,
    tokopedia_url: tokopediaUrl,
    shopee_url: shopeeUrl,
    confidence: nonNegativeNumber(input.confidence),
    estimate_note: nullableText(input.estimate_note) || 'Estimasi AI; harga dapat berubah.',
  };
}

export async function analyzeProductImage({ imageDataUrl }) {
  const baseUrl = process.env.OPENAI_BASE_URL;
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;
  if (!baseUrl || !apiKey || !model) {
    throw new Error('Scanner provider is not configured: set OPENAI_BASE_URL, OPENAI_API_KEY, and OPENAI_MODEL');
  }
  if (typeof imageDataUrl !== 'string' || !imageDataUrl.startsWith('data:image/')) {
    throw new Error('imageDataUrl must be an image data URL');
  }

  let response;
  try {
    response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: 'Analyze this product image. Return only valid JSON with keys: product_name, brand, model, price_jpy, lowest_price_idr, average_price_idr, currency, marketplace, marketplace_url, tokopedia_url, shopee_url, confidence, estimate_note. Use null for unknown values. Prices are non-negative estimates. product_name must always be a non-empty descriptive string; if image is unclear, use "Unknown Product".' },
            { type: 'image_url', image_url: { url: imageDataUrl } },
          ],
        }],
      }),
    });
  } catch (error) {
    throw new Error(`Scanner provider request failed: ${error instanceof Error ? error.message : 'unknown network error'}`);
  }

  if (!response.ok) {
    throw new Error(`Scanner provider returned HTTP ${response.status}`);
  }
  let payload;
  try {
    const responseText = await response.text();
    payload = parseProviderResponse(responseText);
  } catch {
    throw new Error('Scanner provider returned invalid JSON');
  }
  const content = payload?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Scanner provider response did not include analysis content');
  return normalizeScannerAnalysis(content);
}
