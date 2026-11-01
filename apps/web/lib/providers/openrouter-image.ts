import 'server-only';
import {
  type GeneratedImage,
  type ImageProvider,
  ProviderError,
} from './types';

// Server-side OpenRouter image adapter. Never import this from a Client
// Component: it reads OPENROUTER_API_KEY, which must not reach the browser.
//
// Uses the documented chat-completions image path: POST /chat/completions with
// modalities ["image", "text"]. Generated images come back as base64 data URLs
// on choices[0].message.images[].image_url.url.

const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_TIMEOUT_MS = 120_000;
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

type OpenRouterResponse = {
  id?: unknown;
  choices?: Array<{
    message?: { images?: Array<{ image_url?: { url?: unknown } }> };
  }>;
};

export function decodeImageDataUrl(url: string): GeneratedImage {
  const match = /^data:(image\/[A-Za-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/.exec(url);
  if (!match) {
    throw new ProviderError('invalid_response', 'Provider image is not a base64 image data URL');
  }

  const bytes = new Uint8Array(Buffer.from(match[2], 'base64'));
  if (bytes.byteLength === 0) {
    throw new ProviderError('invalid_response', 'Provider image was empty');
  }
  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    throw new ProviderError('invalid_response', 'Provider image exceeds the size limit');
  }

  return { bytes, mimeType: match[1] };
}

export function extractImages(payload: unknown): GeneratedImage[] {
  const images = (payload as OpenRouterResponse | null)?.choices?.[0]?.message?.images;
  if (!Array.isArray(images) || images.length === 0) {
    throw new ProviderError('no_image', 'Provider response contained no image');
  }

  return images.map((image) => {
    const url = image?.image_url?.url;
    if (typeof url !== 'string') {
      throw new ProviderError('invalid_response', 'Provider image entry had no url');
    }
    return decodeImageDataUrl(url);
  });
}

export type OpenRouterImageOptions = {
  apiKey?: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

export function createOpenRouterImageProvider(options: OpenRouterImageOptions = {}): ImageProvider {
  return {
    name: 'openrouter',
    async generateImage(input) {
      const apiKey = options.apiKey ?? process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        throw new ProviderError('config', 'Missing OPENROUTER_API_KEY');
      }

      const fetchImpl = options.fetchImpl ?? fetch;
      const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
      const signal = input.signal ?? AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

      let response: Response;
      try {
        response = await fetchImpl(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'X-Title': 'Framic AI',
          },
          body: JSON.stringify({
            model: input.model,
            messages: [{ role: 'user', content: input.prompt }],
            modalities: ['image', 'text'],
          }),
          signal,
        });
      } catch (err) {
        throw new ProviderError(
          'upstream',
          err instanceof Error ? err.message : 'OpenRouter request failed',
        );
      }

      if (!response.ok) {
        const detail = (await response.text().catch(() => '')).slice(0, 200);
        throw new ProviderError(
          'upstream',
          `OpenRouter responded ${response.status}: ${detail}`,
          response.status,
        );
      }

      let json: unknown;
      try {
        json = await response.json();
      } catch {
        throw new ProviderError('invalid_response', 'OpenRouter returned a non-JSON body');
      }

      const id = (json as { id?: unknown } | null)?.id;
      return {
        images: extractImages(json),
        providerJobId: typeof id === 'string' ? id : null,
      };
    },
  };
}
