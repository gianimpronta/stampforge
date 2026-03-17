import { describe, expect, it } from "vitest";
import { createPollinationsImageProvider } from "../../src/infrastructure/providers/PollinationsImageProvider";

describe("PollinationsImageProvider", () => {
  it("cria o provider sem necessidade de API key", () => {
    const provider = createPollinationsImageProvider();
    expect(provider).toBeDefined();
    expect(provider.generateImages).toBeInstanceOf(Function);
  });

  it("aceita modelo customizado", () => {
    const provider = createPollinationsImageProvider({ model: "turbo" });
    expect(provider).toBeDefined();
  });
});
