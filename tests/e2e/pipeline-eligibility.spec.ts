import { test, expect } from "@playwright/test";
import {
  createTestCollection,
  createTestDesignItem,
  triggerStage,
  approveExecution,
  Collection,
  DesignItem,
} from "./helpers";

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

    // "Seleção de Games" é o 2º estágio e depende de "collection-briefing" aprovado
    const gameSelectionCard = page
      .locator("div")
      .filter({ hasText: /^02\s+Seleção de Games/ })
      .first();

    // Deve estar com badge "Pendente"
    await expect(gameSelectionCard.getByText("Pendente")).toBeVisible();

    // Botão "Executar" NÃO deve aparecer
    await expect(
      gameSelectionCard.getByRole("button", { name: "Executar" }),
    ).not.toBeVisible();

    // Deve exibir a mensagem de dependência bloqueada
    await expect(
      gameSelectionCard.getByText("Aguardando aprovação de dependências"),
    ).toBeVisible();
  });

  test("estágio downstream fica elegível após aprovação do upstream", async ({
    page,
    request,
  }) => {
    // Pré-condição: dispara e aprova collection-briefing via API
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

    const gameSelectionCard = page
      .locator("div")
      .filter({ hasText: /^02\s+Seleção de Games/ })
      .first();

    // Agora deve ter botão "Executar" habilitado
    await expect(
      gameSelectionCard.getByRole("button", { name: "Executar" }),
    ).toBeVisible({ timeout: 10_000 });

    // NÃO deve mais exibir mensagem de dependência bloqueada
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

    const briefingCard = page
      .locator("div")
      .filter({ hasText: /^01\s+Briefing da Coleção/ })
      .first();

    // Deve ter botão "Executar" disponível imediatamente
    await expect(
      briefingCard.getByRole("button", { name: "Executar" }),
    ).toBeVisible();

    // NÃO deve ter mensagem de dependência
    await expect(
      briefingCard.getByText("Aguardando aprovação de dependências"),
    ).not.toBeVisible();
  });

  test("completar um estágio sem aprovar não desbloqueia o downstream", async ({
    page,
    request,
  }) => {
    // Pré-condição: dispara mas NÃO aprova collection-briefing
    await triggerStage(request, "collection-briefing", collection.id);

    await page.goto(
      `/collections/${collection.id}/items/${item.id}/pipeline`,
    );

    await expect(page.getByText("Estágios do Pipeline")).toBeVisible({
      timeout: 10_000,
    });

    // collection-briefing deve estar Concluído
    const briefingCard = page
      .locator("div")
      .filter({ hasText: /^01\s+Briefing da Coleção/ })
      .first();
    await expect(briefingCard.getByText("Concluído")).toBeVisible({
      timeout: 10_000,
    });

    // game-selection ainda deve estar bloqueado (completed ≠ approved)
    const gameSelectionCard = page
      .locator("div")
      .filter({ hasText: /^02\s+Seleção de Games/ })
      .first();

    await expect(
      gameSelectionCard.getByRole("button", { name: "Executar" }),
    ).not.toBeVisible();
    await expect(
      gameSelectionCard.getByText("Aguardando aprovação de dependências"),
    ).toBeVisible();
  });
});
