import { describe, expect, it, vi } from 'vitest';
import { createOpenRouterImageProvider, extractImages } from './openrouter-image';
import { ProviderError } from './types';

vi.mock('server-only', () => ({}));

const TINY_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

function okResponse() {
  return new Response(
    JSON.stringify({
      id: 'gen-1',
      choices: [{ message: { images: [{ image_url: { url: `data:image/png;base64,${TINY_PNG}` } }] } }],
    }),
    { status: 200 },
  );
}

describe('OpenRouter image adapter', () => {
  it('decodes base64 data URL images from the response', () => {
    const images = extractImages({
      choices: [{ message: { images: [{ image_url: { url: `data:image/png;base64,${TINY_PNG}` } }] } }],
    });
    expect(images).toHaveLength(1);
    expect(images[0].mimeType).toBe('image/png');
    expect(images[0].bytes.byteLength).toBeGreaterThan(0);
  });

  it('rejects non-data-URL image entries', () => {
    expect(() =>
      extractImages({ choices: [{ message: { images: [{ image_url: { url: 'https://x/y.png' } }] } }] }),
    ).toThrow(ProviderError);
  });

  it('reports no_image when the response has none', () => {
    try {
      extractImages({ choices: [{ message: {} }] });
      throw new Error('expected extractImages to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(ProviderError);
      expect((err as ProviderError).code).toBe('no_image');
    }
  });

  it('sends the key server-side and requests image modalities', async () => {
    const fetchImpl = vi.fn(async () => okResponse());
    const provider = createOpenRouterImageProvider({ apiKey: 'test-key', fetchImpl });

    const result = await provider.generateImage({ prompt: 'a city at night', model: 'some/model' });

    expect(result.providerJobId).toBe('gen-1');
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-key');
    expect(JSON.parse(String(init.body)).modalities).toEqual(['image', 'text']);
  });

  it('maps non-2xx responses to an upstream ProviderError', async () => {
    const fetchImpl = vi.fn(async () => new Response('rate limited', { status: 429 }));
    const provider = createOpenRouterImageProvider({ apiKey: 'test-key', fetchImpl });

    await expect(provider.generateImage({ prompt: 'x', model: 'm' })).rejects.toMatchObject({
      code: 'upstream',
      status: 429,
    });
  });

  it('fails with a config error when the key is missing', async () => {
    vi.stubEnv('OPENROUTER_API_KEY', '');
    const provider = createOpenRouterImageProvider({ fetchImpl: vi.fn() });

    await expect(provider.generateImage({ prompt: 'x', model: 'm' })).rejects.toMatchObject({
      code: 'config',
    });
    vi.unstubAllEnvs();
  });
});
