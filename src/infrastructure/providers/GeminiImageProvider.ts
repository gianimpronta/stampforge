import type {
  ImageGenerationProvider,
  ImageGenerationRequest,
  ImageGenerationResponse,
} from "../../domain/providers/ImageGenerationProvider";

interface GeminiImageProviderConfig {
  apiKey: string;
  model: string;
}

interface ImagenApiResponse {
  predictions?: Array<{
    bytesBase64Encoded?: string;
    mimeType?: string;
  }>;
  error?: { code: number; message: string; status: string };
}

export function createGeminiImageProvider(
  config: GeminiImageProviderConfig
): ImageGenerationProvider {
  if (!config.apiKey) {
    throw new Error("Gemini API key is required for GeminiImageProvider");
  }

  return {
    async generateImages(
      request: ImageGenerationRequest
    ): Promise<ImageGenerationResponse> {
      const sampleCount = request.count ?? 1;

      const body = {
        instances: [{ prompt: request.prompt }],
        parameters: {
          sampleCount,
          ...(request.width && request.height
            ? { aspectRatio: aspectRatioFromDimensions(request.width, request.height) }
            : {}),
        },
      };

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:predict?key=${config.apiKey}`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(
          `Gemini image generation failed (${res.status}): ${text}`
        );
      }

      const json = (await res.json()) as ImagenApiResponse;

      if (json.error) {
        throw new Error(
          `Gemini image generation error: ${json.error.message}`
        );
      }

      const predictions = json.predictions ?? [];

      const images = predictions.map((p) => {
        const base64 = p.bytesBase64Encoded ?? "";
        const mimeType = p.mimeType ?? "image/png";
        return { data: Buffer.from(base64, "base64"), mimeType };
      });

      return {
        images,
        provider: "google",
        model: config.model,
      };
    },
  };
}

function aspectRatioFromDimensions(width: number, height: number): string {
  const ratio = width / height;
  if (Math.abs(ratio - 1) < 0.05) return "1:1";
  if (Math.abs(ratio - 16 / 9) < 0.1) return "16:9";
  if (Math.abs(ratio - 9 / 16) < 0.1) return "9:16";
  if (Math.abs(ratio - 4 / 3) < 0.1) return "4:3";
  if (Math.abs(ratio - 3 / 4) < 0.1) return "3:4";
  return "1:1";
}
