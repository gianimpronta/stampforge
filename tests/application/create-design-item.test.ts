import { describe, expect, it } from "vitest";
import { createDesignItem } from "../../src/application/createDesignItem";
import { InMemoryDesignItemRepository } from "../../src/infrastructure/db/repositories/InMemoryDesignItemRepository";

describe("createDesignItem", () => {
  it("creates a design item linked to a collection", async () => {
    const repo = new InMemoryDesignItemRepository();
    const item = await createDesignItem({
      collectionId: "col-1",
      name: "Ark Nova badge",
    }, { designItemRepo: repo });

    expect(item.name).toBe("Ark Nova badge");
    expect(item.collectionId).toBe("col-1");
  });
});
