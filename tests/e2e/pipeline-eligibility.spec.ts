import { test, expect, Page } from "@playwright/test";
import {
  createTestCollection,
  createTestDesignItem,
  triggerStage,
  approveExecution,
  Collection,
  DesignItem,
} from "./helpers";

function stageCard(page: Page, stageName: string) {
  return page.locator('[data-slot="card"]').filter({ hasText: stageName });
}

test.describe("Elegibilidade do Pipeline", () => {
  let collection: Collection;
  let item: DesignItem;

  test.beforeEach(async ({ request }) => {
    collection = await createTestCollection(request);
    item = await createTestDesignItem(request, collection.id);
  });

  test("estágio downstream fica inelegível sem aprovação do upstream", async ({
    page,
  }) => {
    await page.goto(
      `/collections/${collection.id}/items/${item.id}/pipeline`,
    );

    await expect(page.getByText("Estágios do Pipeline")).toBeVisible({
      timeout: 10_000,
    });

    // "Seleção de Games" depende de "collection-briefing" aprovado
    const gameSelectionCard = stageCard(page, "Seleção de Games");

    await expect(gameSelectionCard.getByText("Pendente")).toBeVisible();
    await expect(
      gameSelectionCard.getByRole("button", { name: "Executar" }),
    ).not.toBeVisible();
    await expect(
      gameSelectionCard.getByText("Aguardando aprovação de dependências"),
    ).toBeVisible();
  });

  test("estágio downstream fica elegível após aprovação do upstream", async ({
    page,
    request,
  }) => {
    const execution = await triggerStage(
      request,
      "collection-briefing",
      collection.id,
    );
    await approveExecution(request, execution.id);

    await page.goto(
      `/collections/${collection.id}/items/${item.id}/pipeline`,
    );

    await expect(page.getByText("Estágios do Pipeline")).toBeVisible({
      timeout: 10_000,
    });

    const gameSelectionCard = stageCard(page, "Seleção de Games");

    await expect(
      gameSelectionCard.getByRole("button", { name: "Executar" }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      gameSelectionCard.getByText("Aguardando aprovação de dependências"),
    ).not.toBeVisible();
  });

  test("primeiro estágio sempre é elegível (sem dependências)", async ({
    page,
  }) => {
    await page.goto(
      `/collections/${collection.id}/items/${item.id}/pipeline`,
    );

    await expect(page.getByText("Estágios do Pipeline")).toBeVisible({
      timeout: 10_000,
    });

    const briefingCard = stageCard(page, "Briefing da Coleção");

    await expect(
      briefingCard.getByRole("button", { name: "Executar" }),
    ).toBeVisible();
    await expect(
      briefingCard.getByText("Aguardando aprovação de dependências"),
    ).not.toBeVisible();
  });

  test("completar sem aprovar não desbloqueia o downstream", async ({
    page,
    request,
  }) => {
    // Dispara mas NÃO aprova
    await triggerStage(request, "collection-briefing", collection.id);

    await page.goto(
      `/collections/${collection.id}/items/${item.id}/pipeline`,
    );

    await expect(page.getByText("Estágios do Pipeline")).toBeVisible({
      timeout: 10_000,
    });

    // collection-briefing deve estar Concluído
    const briefingCard = stageCard(page, "Briefing da Coleção");
    await expect(briefingCard.getByText("Concluído")).toBeVisible({
      timeout: 10_000,
    });

    // game-selection ainda bloqueado (completed ≠ approved)
    const gameSelectionCard = stageCard(page, "Seleção de Games");
    await expect(
      gameSelectionCard.getByRole("button", { name: "Executar" }),
    ).not.toBeVisible();
    await expect(
      gameSelectionCard.getByText("Aguardando aprovação de dependências"),
    ).toBeVisible();
  });
});
