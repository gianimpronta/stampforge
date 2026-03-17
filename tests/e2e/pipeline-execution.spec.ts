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

    const briefingCard = stageCard(page, "Briefing da Coleção");

    await expect(briefingCard.getByText("Pendente")).toBeVisible();
    await expect(
      briefingCard.getByRole("button", { name: "Executar" }),
    ).toBeVisible();

    await briefingCard.getByRole("button", { name: "Executar" }).click();

    // Aguarda status Concluído — stub é síncrono
    await expect(briefingCard.getByText("Concluído")).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      briefingCard.getByRole("button", { name: "Detalhes" }),
    ).toBeVisible();
  });

  test("aprova uma execução via painel de detalhes", async ({
    page,
    request,
  }) => {
    await triggerStage(request, "collection-briefing", collection.id);

    await page.goto(
      `/collections/${collection.id}/items/${item.id}/pipeline`,
    );

    await expect(page.getByText("Estágios do Pipeline")).toBeVisible({
      timeout: 10_000,
    });

    const briefingCard = stageCard(page, "Briefing da Coleção");
    await expect(briefingCard.getByText("Concluído")).toBeVisible({
      timeout: 10_000,
    });

    await briefingCard.getByRole("button", { name: "Detalhes" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Briefing da Coleção")).toBeVisible();

    await dialog.getByRole("button", { name: "Aprovar" }).click();

    await expect(dialog).not.toBeVisible({ timeout: 5_000 });
    await expect(briefingCard.getByText("Aprovado")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("reprova uma execução informando um motivo", async ({
    page,
    request,
  }) => {
    await triggerStage(request, "collection-briefing", collection.id);

    await page.goto(
      `/collections/${collection.id}/items/${item.id}/pipeline`,
    );

    await expect(page.getByText("Estágios do Pipeline")).toBeVisible({
      timeout: 10_000,
    });

    const briefingCard = stageCard(page, "Briefing da Coleção");
    await expect(briefingCard.getByText("Concluído")).toBeVisible({
      timeout: 10_000,
    });

    await briefingCard.getByRole("button", { name: "Detalhes" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await dialog.getByRole("button", { name: "Reprovar" }).click();
    await dialog
      .getByLabel("Motivo da reprovação")
      .fill("Output não atende ao briefing original");
    await dialog
      .getByRole("button", { name: "Confirmar Reprovação" })
      .click();

    await expect(dialog).not.toBeVisible({ timeout: 5_000 });
    await expect(briefingCard.getByText("Rejeitado")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("permite re-executar após aprovação", async ({ page, request }) => {
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

    const briefingCard = stageCard(page, "Briefing da Coleção");
    await expect(briefingCard.getByText("Aprovado")).toBeVisible({
      timeout: 10_000,
    });
    await expect(
      briefingCard.getByRole("button", { name: "Re-executar" }),
    ).toBeVisible();

    await briefingCard.getByRole("button", { name: "Re-executar" }).click();

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

    // stageKey aparece em múltiplos lugares (header + snapshots); verifica pelo label
    await expect(page.getByText("Estágio", { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("collection-briefing").first()).toBeVisible();
  });
});
