export interface ImageGenerationRequest {
  prompt: string;
  width?: number;
  height?: number;
  count?: number;
}

export interface ImageGenerationResponse {
  images: Array<{
    data: Buffer;
    mimeType: string;
  }>;
  provider: string;
  model: string;
}

export interface ImageGenerationProvider {
  generateImages(request: ImageGenerationRequest): Promise<ImageGenerationResponse>;
}
