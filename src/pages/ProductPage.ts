
import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * ProductPage encapsulates locators and interactions for the
 * AutomationExercise product catalogue and product details pages.
 */
export class ProductPage extends BasePage {
  // Catalogue and search elements
  readonly allProductsHeading: Locator;
  readonly searchedProductsHeading: Locator;
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly productCards: Locator;
  readonly firstViewProductLink: Locator;

  // Product details elements
  readonly productInfoContainer: Locator;
  readonly productName: Locator;
  readonly productCategory: Locator;
  readonly productPrice: Locator;
  readonly productAvailability: Locator;
  readonly productCondition: Locator;
  readonly productBrand: Locator;

  constructor(page: Page) {
    super(page);

    // Catalogue and search locators
    this.allProductsHeading = page.getByRole('heading', {
      name: 'All Products',
    });

    this.searchedProductsHeading = page.getByRole('heading', {
      name: 'Searched Products',
    });

    this.searchInput = page.locator('#search_product');
    this.searchButton = page.locator('#submit_search');

    this.productCards = page.locator(
      '.features_items .col-sm-4'
    );

    this.firstViewProductLink = page
      .locator('a[href*="/product_details/"]')
      .first();

    // Product details locators
    this.productInfoContainer = page.locator(
      '.product-information'
    );

    this.productName = this.productInfoContainer.locator('h2');

    this.productCategory = this.productInfoContainer
      .locator('p')
      .filter({ hasText: /Category:/i });

    this.productPrice = this.productInfoContainer.locator('span span');

    this.productAvailability = this.productInfoContainer
      .locator('p')
      .filter({ hasText: /Availability:/i });

    this.productCondition = this.productInfoContainer
      .locator('p')
      .filter({ hasText: /Condition:/i });

    this.productBrand = this.productInfoContainer
      .locator('p')
      .filter({ hasText: /Brand:/i });
  }

  /**
   * Navigate to the product catalogue.
   */
  async goto(): Promise<void> {
    await this.navigate('/products');
  }

  /**
   * Search for a product.
   */
  async searchProduct(query: string): Promise<void> {
    await this.searchInput.fill(query);
    await this.searchButton.click();
  }

  /**
   * Open the first product's details page.
   */
  async viewFirstProduct(): Promise<void> {
    await this.firstViewProductLink.click();
  }

  /**
   * Count visible product cards.
   */
  async getProductCardsCount(): Promise<number> {
    return await this.productCards.locator(':visible').count();
  }

  /**
   * Retrieve product names from visible product cards.
   */
  async getProductNames(): Promise<string[]> {
    return await this.productCards
      .locator('.productinfo p')
      .allTextContents();
  }

  /**
   * Check whether the catalogue heading is visible.
   */
  async isAllProductsHeadingVisible(): Promise<boolean> {
    return await this.allProductsHeading.isVisible();
  }

  /**
   * Check whether the searched products heading is visible.
   */
  async isSearchHeadingVisible(): Promise<boolean> {
    return await this.searchedProductsHeading.isVisible();
  }

  /**
   * Check whether product details are displayed.
   */
  async isProductDetailsVisible(): Promise<boolean> {
    return await this.productInfoContainer.isVisible();
  }

  /**
   * Retrieve the displayed product name.
   */
  async getProductName(): Promise<string> {
    return (await this.productName.textContent())?.trim() ?? '';
  }

  /**
   * Check visibility of product information fields.
   */
  async areProductInformationFieldsVisible(): Promise<boolean> {
    const fields = [
      this.productCategory,
      this.productPrice,
      this.productAvailability,
      this.productCondition,
      this.productBrand,
    ];

    for (const field of fields) {
      if (!(await field.isVisible())) {
        return false;
      }
    }

    return true;
  }
}
