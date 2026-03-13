import { test, expect } from "@playwright/test";

test.describe("Coleções", () => {
  test("cria uma coleção e visualiza seus detalhes", async ({ page }) => {
    const uid = Date.now();
    const collectionName = `Coleção E2E ${uid}`;
    const briefing = `Briefing de teste e2e para validação ${uid}`;

    // 1. Acessa a página de coleções
    await page.goto("/collections");
    await expect(page.getByRole("heading", { name: "Coleções" })).toBeVisible();

    // 2. Abre o dialog de nova coleção
    await page.getByRole("button", { name: "Nova Coleção" }).click();
    await expect(
      page.getByRole("heading", { name: "Nova Coleção" })
    ).toBeVisible();

    // 3. Preenche o formulário
    await page.getByLabel("Nome").fill(collectionName);
    await page.getByLabel("Briefing").fill(briefing);

    // 4. Submete o formulário
    await page.getByRole("button", { name: "Criar" }).click();

    // 5. Verifica que a coleção aparece na listagem
    await expect(page.getByText(collectionName)).toBeVisible();

    // 6. Clica na coleção para ver os detalhes
    await page.getByText(collectionName).click();
    await page.waitForURL(/\/collections\/.+/);

    // 7. Verifica a página de detalhe
    await expect(
      page.getByRole("heading", { name: collectionName })
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(briefing)).toBeVisible();
    await expect(page.getByText("Briefing", { exact: true })).toBeVisible();

    // 8. Verifica que não tem design items ainda
    await expect(
      page.getByText("Nenhum item de design criado ainda.")
    ).toBeVisible();

    // 9. Verifica que o botão de voltar funciona
    await page.getByRole("button", { name: "← Coleções" }).click();
    await expect(
      page.getByRole("heading", { name: "Coleções" })
    ).toBeVisible();
    await expect(page.getByText(collectionName)).toBeVisible();
  });
});
