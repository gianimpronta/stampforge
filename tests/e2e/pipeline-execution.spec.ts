import { test, expect } from "@playwright/test";
import {
  createTestCollection,
  createTestDesignItem,
  triggerStage,
  approveExecution,
  Collection,
  DesignItem,
} from "./helpers";

test.describe("Execução do Pipeline", () => {
  let collection: Collection;
  let item: DesignItem;

  test.beforeEach(async ({ request }) => {
    collection = await createTestCollection(request);
    item = await createTestDesignItem(request, collection.id);
  });

  test("dispara o estágio collection-briefing e vê status Concluído", async ({
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

    // Verifica estado inicial
    await expect(briefingCard.getByText("Pendente")).toBeVisible();
    await expect(
      briefingCard.getByRole("button", { name: "Executar" }),
    ).toBeVisible();

    // Dispara o estágio
    await briefingCard.getByRole("button", { name: "Executar" }).click();

    // Aguarda status mudar para Concluído (stub é síncrono)
    await expect(briefingCard.getByText("Concluído")).toBeVisible({
      timeout: 15_000,
    });

    // Botão "Detalhes" deve aparecer
    await expect(
      briefingCard.getByRole("button", { name: "Detalhes" }),
    ).toBeVisible();
  });

  test("aprova uma execução via painel de detalhes", async ({
    page,
    request,
  }) => {
    // Pré-condição: dispara o estágio via API
    await triggerStage(request, "collection-briefing", collection.id);

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

    // Aguarda status Concluído antes de abrir detalhes
    await expect(briefingCard.getByText("Concluído")).toBeVisible({
      timeout: 10_000,
    });

    // Abre o painel de detalhes
    await briefingCard.getByRole("button", { name: "Detalhes" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Briefing da Coleção")).toBeVisible();

    // Aprova a execução
    await dialog.getByRole("button", { name: "Aprovar" }).click();

    // Dialog fecha e badge muda para Aprovado
    await expect(dialog).not.toBeVisible({ timeout: 5_000 });
    await expect(briefingCard.getByText("Aprovado")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("reprova uma execução informando um motivo", async ({
    page,
    request,
  }) => {
    // Pré-condição: dispara o estágio via API
    await triggerStage(request, "collection-briefing", collection.id);

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

    await expect(briefingCard.getByText("Concluído")).toBeVisible({
      timeout: 10_000,
    });

    // Abre o painel de detalhes
    await briefingCard.getByRole("button", { name: "Detalhes" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Clica em Reprovar para mostrar o formulário
    await dialog.getByRole("button", { name: "Reprovar" }).click();

    // Preenche o motivo
    await dialog
      .getByLabel("Motivo da reprovação")
      .fill("Output não atende ao briefing original");

    // Confirma a reprovação
    await dialog
      .getByRole("button", { name: "Confirmar Reprovação" })
      .click();

    // Dialog fecha e badge muda para Rejeitado
    await expect(dialog).not.toBeVisible({ timeout: 5_000 });
    await expect(briefingCard.getByText("Rejeitado")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("permite re-executar após aprovação", async ({ page, request }) => {
    // Pré-condição: dispara e aprova via API
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

    const briefingCard = page
      .locator("div")
      .filter({ hasText: /^01\s+Briefing da Coleção/ })
      .first();

    // Deve mostrar "Aprovado" e botão "Re-executar"
    await expect(briefingCard.getByText("Aprovado")).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      briefingCard.getByRole("button", { name: "Re-executar" }),
    ).toBeVisible();

    // Re-executa o estágio
    await briefingCard.getByRole("button", { name: "Re-executar" }).click();

    // Aguarda nova execução completar
    await expect(briefingCard.getByText("Concluído")).toBeVisible({
      timeout: 15_000,
    });
  });

  test("exibe detalhe da execução na página de execução", async ({
    page,
    request,
  }) => {
    const execution = await triggerStage(
      request,
      "collection-briefing",
      collection.id,
    );

    await page.goto(`/executions/${execution.id}`);

    // Verifica que a página de detalhe carregou com info da execução
    await expect(page.getByText("collection-briefing")).toBeVisible({
      timeout: 10_000,
    });
  });
});
