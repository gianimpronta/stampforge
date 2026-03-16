import { test, expect } from "@playwright/test";
import { createTestCollection } from "./helpers";

test.describe("Itens de Design", () => {
  test("cria um item de design via UI e navega para o pipeline", async ({
    page,
    request,
  }) => {
    const collection = await createTestCollection(request);

    // 1. Acessa a página de detalhe da coleção
    await page.goto(`/collections/${collection.id}`);
    await expect(
      page.getByRole("heading", { name: collection.name }),
    ).toBeVisible();

    // 2. Abre o dialog de novo item
    await page.getByRole("button", { name: "Novo Item" }).click();
    await expect(
      page.getByRole("heading", { name: "Novo Item de Design" }),
    ).toBeVisible();

    // 3. Preenche o nome do item
    const itemName = `Camiseta E2E ${Date.now()}`;
    await page.getByLabel("Nome").fill(itemName);

    // 4. Submete o formulário
    await page.getByRole("button", { name: "Criar" }).click();

    // 5. Verifica que o item aparece na tabela
    await expect(page.getByText(itemName)).toBeVisible();

    // 6. Clica em "Ver Pipeline" para o item criado
    const row = page.getByRole("row").filter({ hasText: itemName });
    await row.getByRole("button", { name: "Ver Pipeline" }).click();

    // 7. Verifica que a página de pipeline carregou
    await page.waitForURL(/\/collections\/.+\/items\/.+\/pipeline/);
    await expect(page.getByText("Estágios do Pipeline")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("pipeline exibe os 11 estágios com o primeiro pronto para executar", async ({
    page,
    request,
  }) => {
    const collection = await createTestCollection(request);

    // Cria design item via API para ir direto ao pipeline
    const itemRes = await request.post(
      `/api/collections/${collection.id}/design-items`,
      { data: { name: `Item Pipeline ${Date.now()}` } },
    );
    const item = await itemRes.json();

    await page.goto(
      `/collections/${collection.id}/items/${item.id}/pipeline`,
    );

    await expect(page.getByText("Estágios do Pipeline")).toBeVisible({
      timeout: 10_000,
    });

    // Verifica que o primeiro estágio tem badge "Pendente" e botão "Executar"
    const briefingCard = page
      .locator("div")
      .filter({ hasText: /^01\s+Briefing da Coleção/ })
      .first();
    await expect(briefingCard.getByText("Pendente")).toBeVisible();
    await expect(
      briefingCard.getByRole("button", { name: "Executar" }),
    ).toBeVisible();
  });
});
