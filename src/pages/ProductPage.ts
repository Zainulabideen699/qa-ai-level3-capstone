
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
  readonly quantityInput: Locator;
  readonly addToCartButton: Locator;

  // Cart modal elements
  readonly cartModal: Locator;
  readonly modalAddedHeading: Locator;
  readonly modalContinueShoppingButton: Locator;
  readonly modalViewCartLink: Locator;

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

    this.quantityInput = page.locator('#quantity');
    this.addToCartButton = page.locator('button.cart');

    // Cart modal locators
    this.cartModal = page.locator('#cartModal');
    this.modalAddedHeading = page.locator('#cartModal .modal-title');
    this.modalContinueShoppingButton = page.locator('#cartModal button.close-modal');
    this.modalViewCartLink = page.locator('#cartModal a[href="/view_cart"]');
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

  /**
   * Navigate directly to a specific product's details page.
   */
  async gotoProductDetails(productId: number | string): Promise<void> {
    await this.navigate(`/product_details/${productId}`);
  }

  /**
   * Hover over a product card in the catalog and click Add to Cart,
   * then wait for the confirmation modal to appear.
   */
  async addProductToCartByIndex(index: number): Promise<void> {
    const card = this.page.locator('.features_items .product-image-wrapper').nth(index);
    await card.scrollIntoViewIfNeeded();
    await card.hover();
    const overlayBtn = card.locator('.overlay-content a.add-to-cart');
    if (await overlayBtn.isVisible()) {
      await overlayBtn.click();
    } else {
      await card.locator('.productinfo a.add-to-cart').click();
    }
    await this.cartModal.waitFor({ state: 'visible' });
  }

  /**
   * Click 'Continue Shopping' on the cart confirmation modal.
   */
  async clickContinueShopping(): Promise<void> {
    await this.modalContinueShoppingButton.click();
    await this.cartModal.waitFor({ state: 'hidden' });
  }

  /**
   * Click 'View Cart' on the cart confirmation modal and wait for navigation.
   */
  async clickViewCartFromModal(): Promise<void> {
    await this.modalViewCartLink.click();
    await this.page.waitForURL('**/view_cart');
  }

  /**
   * Set product quantity in the product details quantity input.
   */
  async setQuantity(quantity: number | string): Promise<void> {
    await this.quantityInput.fill(quantity.toString());
  }

  /**
   * Click the 'Add to cart' button on the product details page.
   */
  async addToCartFromDetails(): Promise<void> {
    await this.addToCartButton.click();
  }
}
