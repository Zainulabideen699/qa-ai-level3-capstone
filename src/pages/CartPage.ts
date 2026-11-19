import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export interface CartRowDetails {
  title: string;
  price: string;
  priceNumber: number;
  quantity: number;
  total: string;
  totalNumber: number;
}

/**
 * CartPage encapsulates locators and interactions for the Shopping Cart
 * page at https://automationexercise.com/view_cart.
 */
export class CartPage extends BasePage {
  // Main cart containers
  readonly cartSection: Locator;
  readonly cartTable: Locator;
  readonly cartRows: Locator;
  readonly proceedToCheckoutButton: Locator;

  // Empty cart indicators
  readonly emptyCartContainer: Locator;
  readonly emptyCartText: Locator;
  readonly emptyCartLink: Locator;

  constructor(page: Page) {
    super(page);

    this.cartSection = page.locator('#cart_items');
    this.cartTable = page.locator('#cart_info_table');
    this.cartRows = page.locator('#cart_info_table tbody tr[id^="product-"]');
    this.proceedToCheckoutButton = page.locator('.check_out');

    this.emptyCartContainer = page.locator('#empty_cart');
    this.emptyCartText = page.locator('#empty_cart').getByText(/Cart is empty!/i);
    this.emptyCartLink = page.locator('#empty_cart a[href*="/products"]');
  }

  /**
   * Navigate directly to the shopping cart page.
   */
  async goto(): Promise<void> {
    await this.navigate('/view_cart');
  }

  /**
   * Return the number of visible product rows in the cart table.
   */
  async getCartRowCount(): Promise<number> {
    return await this.cartRows.count();
  }

  /**
   * Return the Locator for a product row identified by its product ID.
   */
  getProductRowById(productId: number | string): Locator {
    return this.page.locator(`#product-${productId}`);
  }

  /**
   * Return the Locator for a product row identified by zero-based index.
   */
  getProductRowByIndex(index: number): Locator {
    return this.cartRows.nth(index);
  }

  /**
   * Extract parsed details (title, unit price, quantity, total price) from a cart table row.
   */
  async getRowDetails(row: Locator): Promise<CartRowDetails> {
    const title = (
      await row.locator('.cart_description h4 a').innerText()
    ).trim();

    const price = (
      (await row.locator('.cart_price p').innerText()) ?? ''
    ).trim();

    const quantityText = (
      (await row.locator('.cart_quantity button').innerText()) ?? ''
    ).trim();

    const total = (
      (await row.locator('.cart_total .cart_total_price').innerText()) ?? ''
    ).trim();

    const parsePriceNumber = (text: string): number => {
      const cleaned = text.replace(/,/g, '');
      const match = cleaned.match(/[-+]?[0-9]*\.?[0-9]+/);
      return match ? parseFloat(match[0]) : 0;
    };

    return {
      title,
      price,
      priceNumber: parsePriceNumber(price),
      quantity: parseInt(quantityText, 10) || 0,
      total,
      totalNumber: parsePriceNumber(total),
    };
  }

  /**
   * Delete a specific product row and wait for it to detach from the DOM.
   */
  async deleteProduct(row: Locator): Promise<void> {
    const deleteButton = row.locator('.cart_delete a.cart_quantity_delete');
    await deleteButton.click();
    await row.waitFor({ state: 'detached' });
  }

  /**
   * Delete a product by its product ID.
   */
  async deleteProductById(productId: number | string): Promise<void> {
    const row = this.getProductRowById(productId);
    await this.deleteProduct(row);
  }

  /**
   * Check whether the empty-cart notification is visible.
   */
  async isEmptyCartVisible(): Promise<boolean> {
    return await this.emptyCartContainer.isVisible();
  }

  /**
   * Click 'Proceed To Checkout' button.
   */
  async proceedToCheckout(): Promise<void> {
    await this.proceedToCheckoutButton.click();
  }
}
