import { describe, expect, it } from "vitest";
import { Collection } from "../../src/domain/collections/Collection";
import { DesignItem } from "../../src/domain/design-items/DesignItem";

describe("Collection and DesignItem", () => {
  it("creates a design item linked to a collection", () => {
    const collection = Collection.create({
      id: "col-1",
      name: "Board Games",
      briefing: "Premium boardgame collection",
    });

    const item = DesignItem.create({
      id: "item-1",
      collectionId: collection.id,
      name: "Ark Nova badge",
    });

    expect(item.collectionId).toBe(collection.id);
  });
});
