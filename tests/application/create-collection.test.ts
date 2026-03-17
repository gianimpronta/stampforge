import { describe, expect, it } from "vitest";
import { createCollection } from "../../src/application/createCollection";
import { InMemoryCollectionRepository } from "../../src/infrastructure/db/repositories/InMemoryCollectionRepository";

describe("createCollection", () => {
  it("creates a collection with a briefing", async () => {
    const repo = new InMemoryCollectionRepository();
    const collection = await createCollection({
      name: "Boardgame Premium",
      briefing: "Vintage premium collection",
    }, { collectionRepo: repo });

    expect(collection.name).toBe("Boardgame Premium");
    expect(collection.briefing).toBe("Vintage premium collection");

    const found = await repo.findById(collection.id);
    expect(found).not.toBeNull();
  });
});
