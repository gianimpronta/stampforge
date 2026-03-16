import type {
  ImageGenerationProvider,
  ImageGenerationRequest,
  ImageGenerationResponse,
} from "../../domain/providers/ImageGenerationProvider";

interface PollinationsImageProviderConfig {
  model?: string;
}

/**
 * Provider de geração de imagens usando a API gratuita do Pollinations.ai.
 * Não requer API key, cadastro ou plano pago.
 *
 * Endpoint: GET https://image.pollinations.ai/prompt/{prompt}
 * Retorna: imagem binária (PNG/JPG)
 */
export function createPollinationsImageProvider(
  config?: PollinationsImageProviderConfig,
): ImageGenerationProvider {
  const model = config?.model ?? "flux";

  return {
    async generateImages(
      request: ImageGenerationRequest,
    ): Promise<ImageGenerationResponse> {
      const count = request.count ?? 1;
      const images: Array<{ data: Buffer; mimeType: string }> = [];

      for (let i = 0; i < count; i++) {
        const seed = Math.floor(Math.random() * 1_000_000) + i;
        // Pollinations aceita prompts via URL — truncar se necessário para evitar URLs muito longas
        const truncatedPrompt = request.prompt.length > 500
          ? request.prompt.slice(0, 500)
          : request.prompt;
        const encodedPrompt = encodeURIComponent(truncatedPrompt);
        const url =
          `https://image.pollinations.ai/prompt/${encodedPrompt}` +
          `?seed=${seed}&nologo=true`;

        const res = await fetch(url);

        if (!res.ok) {
          const text = await res.text();
          throw new Error(
            `Pollinations image generation failed (${res.status}): ${text}`,
          );
        }

        const contentType = res.headers.get("content-type") ?? "image/png";
        const mimeType = contentType.split(";")[0].trim();
        const arrayBuffer = await res.arrayBuffer();
        const data = Buffer.from(arrayBuffer);

        images.push({ data, mimeType });
      }

      return {
        images,
        provider: "pollinations",
        model,
      };
    },
  };
}
