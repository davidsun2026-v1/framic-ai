// Provider-agnostic contract for server-side image generation adapters.
// Adapters that implement this hold provider credentials, so they must only be
// imported from server code (Route Handlers, server actions).

export type ImageGenerationInput = {
  prompt: string;
  model: string;
  signal?: AbortSignal;
};

export type GeneratedImage = {
  bytes: Uint8Array;
  mimeType: string;
};

export type ImageGenerationResult = {
  images: GeneratedImage[];
  providerJobId: string | null;
};

export type ProviderErrorCode = 'config' | 'upstream' | 'invalid_response' | 'no_image';

export class ProviderError extends Error {
  readonly code: ProviderErrorCode;
  readonly status: number | null;

  constructor(code: ProviderErrorCode, message: string, status: number | null = null) {
    super(message);
    this.name = 'ProviderError';
    this.code = code;
    this.status = status;
  }
}

export interface ImageProvider {
  readonly name: string;
  generateImage(input: ImageGenerationInput): Promise<ImageGenerationResult>;
}
