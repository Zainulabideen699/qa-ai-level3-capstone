
import { test, expect } from '@playwright/test';
import { ProductPage } from '@pages/ProductPage';

test.describe('Product Catalog Tests - Automation Exercise', () => {
  let productPage: ProductPage;

  test.beforeEach(async ({ page }) => {
    productPage = new ProductPage(page);
    await productPage.goto();
  });

  /**
   * PROD-001 | AE-06
   * Verify product catalogue and product details.
   */
  test(
    'TC-AE-PROD-001: View product catalogue and product details @products @smoke @REQ-AE-PROD',
    async () => {
      // Verify catalogue heading
      await expect(
        productPage.allProductsHeading
      ).toBeVisible();

      // Verify products are displayed
      const productCount = await productPage.getProductCardsCount();

      expect(productCount).toBeGreaterThan(0);

      // Open first product details
      await productPage.viewFirstProduct();

      // Verify product information
      await expect(
        productPage.productInfoContainer
      ).toBeVisible();

      await expect(
        productPage.productName
      ).toBeVisible();

      expect(
        await productPage.getProductName()
      ).not.toBe('');

      // Verify product information fields
      expect(
        await productPage.areProductInformationFieldsVisible()
      ).toBe(true);
    }
  );

  /**
   * PROD-002 | AE-07
   * Verify product search using tshirt keyword.
   */
  test(
    'TC-AE-PROD-002: Search products using tshirt keyword @products @smoke @REQ-AE-PROD',
    async () => {
      await productPage.searchProduct('tshirt');

      // Verify search results heading
      await expect(
        productPage.searchedProductsHeading
      ).toBeVisible();

      // Verify matching products are displayed
      const productCount = await productPage.getProductCardsCount();

      expect(productCount).toBeGreaterThan(0);

      // Verify at least one result contains the search keyword
      const productNames = await productPage.getProductNames();

      const matchingProducts = productNames.filter((name) =>
        name.toLowerCase().includes('tshirt')
      );

      expect(matchingProducts.length).toBeGreaterThan(0);
    }
  );

  /**
   * PROD-003 | AE-08
   * Verify search behavior for a non-existent product.
   */
  test(
    'TC-AE-PROD-003: Search for a non-existent product @products @negative @REQ-AE-PROD',
    async () => {
      const searchKeyword = 'zznonexistentproduct987654';

      await productPage.searchProduct(searchKeyword);

      // Verify that the search operation completed
      await expect(
        productPage.searchedProductsHeading
      ).toBeVisible();

      // No matching product cards should be displayed
      const productCount = await productPage.getProductCardsCount();

      expect(productCount).toBe(0);
    }
  );

  /**
   * PROD-004 | AE-08
   * Verify search behavior with empty or whitespace input.
   */
  test(
    'TC-AE-PROD-004: Search using empty or whitespace input @products @edge @REQ-AE-PROD',
    async () => {
      await productPage.searchProduct('   ');

      // Record the resulting application behavior.
      // The application may retain the catalogue or show search results.
      const catalogueVisible =
        await productPage.allProductsHeading.isVisible();

      const searchResultsVisible =
        await productPage.searchedProductsHeading.isVisible();

      // The application should respond with one of these page states.
      expect(
        catalogueVisible || searchResultsVisible
      ).toBe(true);
    }
  );
});
