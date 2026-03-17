import { GoogleGenerativeAI } from "@google/generative-ai";
import type { LLMProvider, LLMRequest, LLMResponse } from "../../domain/providers/LLMProvider";

interface GeminiTextProviderConfig {
  apiKey: string;
  model: string;
}

export function createGeminiTextProvider(config: GeminiTextProviderConfig): LLMProvider {
  if (!config.apiKey) {
    throw new Error("Gemini API key is required for GeminiTextProvider");
  }

  const client = new GoogleGenerativeAI(config.apiKey);

  return {
    async generateText(request: LLMRequest): Promise<LLMResponse> {
      const model = client.getGenerativeModel({
        model: config.model,
        ...(request.systemPrompt
          ? { systemInstruction: request.systemPrompt }
          : {}),
        generationConfig: {
          ...(request.temperature === undefined ? {} : { temperature: request.temperature }),
          ...(request.maxTokens === undefined ? {} : { maxOutputTokens: request.maxTokens }),
        },
      });

      const result = await model.generateContent(request.prompt);
      const response = result.response;
      const text = response.text();
      const usageMeta = response.usageMetadata;

      return {
        content: text,
        provider: "google",
        model: config.model,
        ...(usageMeta
          ? {
              usage: {
                inputTokens: usageMeta.promptTokenCount ?? 0,
                outputTokens: usageMeta.candidatesTokenCount ?? 0,
              },
            }
          : {}),
      };
    },
  };
}
