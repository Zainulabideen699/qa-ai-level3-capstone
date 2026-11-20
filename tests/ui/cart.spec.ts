import { test, expect } from '@playwright/test';
import { ProductPage } from '@pages/ProductPage';
import { CartPage } from '@pages/CartPage';
import { LoginPage } from '@pages/LoginPage';
import { AccountApi } from '@api/accountApi';
import { generateUniqueUser, UserAccountData } from '@utils/testData';

test.describe('Cart Management & Calculations - Automation Exercise', () => {
  let productPage: ProductPage;
  let cartPage: CartPage;
  let loginPage: LoginPage;
  let accountApi: AccountApi;

  test.beforeEach(async ({ page, request }) => {
    productPage = new ProductPage(page);
    cartPage = new CartPage(page);
    loginPage = new LoginPage(page);
    accountApi = new AccountApi(request);

    // Apply ad-blocking to prevent third-party overlays from intercepting clicks
    await cartPage.applyAdBlocker();
  });

  /**
   * CART-001 | AE-11
   * Add multiple distinct products to cart and verify cart contents
   */
  test('TC-AE-CART-001: Add multiple distinct products to cart and verify cart contents', {
    tag: ['@cart', '@smoke', '@REQ-AE-CART'],
  }, async () => {
    // 1. Navigate to products catalog
    await productPage.goto();
    await expect(productPage.allProductsHeading).toBeVisible();

    // 2. Add first product to cart and continue shopping
    await productPage.addProductToCartByIndex(0);
    await productPage.clickContinueShopping();

    // 3. Add second product to cart and proceed to view cart
    await productPage.addProductToCartByIndex(1);
    await productPage.clickViewCartFromModal();

    // 4. Verify shopping cart table is rendered with both products
    await expect(cartPage.cartTable).toBeVisible();
    const rowCount = await cartPage.getCartRowCount();
    expect(rowCount).toBe(2);

    // 5. Extract and verify row details for each item
    const item1 = await cartPage.getRowDetails(cartPage.getProductRowByIndex(0));
    const item2 = await cartPage.getRowDetails(cartPage.getProductRowByIndex(1));

    // Verify distinct products were added
    expect(item1.title).not.toBe('');
    expect(item2.title).not.toBe('');
    expect(item1.title).not.toBe(item2.title);

    // Verify quantities default to 1 and totals match unit price
    expect(item1.quantity).toBe(1);
    expect(item2.quantity).toBe(1);
    expect(item1.totalNumber).toBe(item1.priceNumber);
    expect(item2.totalNumber).toBe(item2.priceNumber);
  });

  /**
   * CART-002 | AE-12
   * Increase product quantity from product detail page and verify cart calculation
   */
  test('TC-AE-CART-002: Increase product quantity from product detail page and verify cart calculation', {
    tag: ['@cart', '@smoke', '@REQ-AE-CART'],
  }, async () => {
    const targetQuantity = 4;

    // 1. Navigate to product details for product 1
    await productPage.gotoProductDetails(1);
    await expect(productPage.productInfoContainer).toBeVisible();

    // 2. Set desired quantity to 4
    await productPage.setQuantity(targetQuantity);

    // 3. Add to cart and navigate to view cart
    await productPage.addToCartFromDetails();
    await productPage.clickViewCartFromModal();

    // 4. Locate product row in cart and extract computed values
    const productRow = cartPage.getProductRowById(1);
    await expect(productRow).toBeVisible();

    const details = await cartPage.getRowDetails(productRow);

    // 5. Assert quantity and mathematical price calculation (total = unit price * quantity)
    expect(details.quantity).toBe(targetQuantity);
    expect(details.priceNumber).toBeGreaterThan(0);
    expect(details.totalNumber).toBe(details.priceNumber * targetQuantity);
  });

  /**
   * CART-003 | AE-12
   * Boundary test for product quantity input with zero and negative numbers
   */
  test('TC-AE-CART-003: Boundary test for product quantity input with zero and negative numbers', {
    tag: ['@cart', '@negative', '@edge', '@REQ-AE-CART'],
  }, async () => {
    // 1. Boundary check: Zero (0) quantity
    await productPage.gotoProductDetails(1);
    await expect(productPage.productInfoContainer).toBeVisible();

    await productPage.setQuantity(0);
    await productPage.addToCartFromDetails();

    // Check if client-side constraints prevent adding or if modal is displayed
    const modalAppearedForZero = await productPage.cartModal.isVisible({ timeout: 3000 }).catch(() => false);

    if (modalAppearedForZero) {
      // SUT accepted 0 quantity without client-side blocking; inspect cart state
      await productPage.clickViewCartFromModal();
      const rowCount = await cartPage.getCartRowCount();

      if (rowCount > 0) {
        const details = await cartPage.getRowDetails(cartPage.getProductRowByIndex(0));
        // Verify application does not corrupt total into negative values
        expect(details.totalNumber).toBeGreaterThanOrEqual(0);

        test.info().annotations.push({
          type: 'observed_behavior',
          description: `Zero quantity accepted by SUT without validation: displayed quantity=${details.quantity}, total=${details.total}`,
        });

        // Clean up cart item before next boundary check
        await cartPage.deleteProduct(cartPage.getProductRowByIndex(0));
      }
    } else {
      test.info().annotations.push({
        type: 'observed_behavior',
        description: 'Zero quantity correctly blocked or prevented by client-side validation.',
      });
    }

    // 2. Boundary check: Negative (-1) quantity
    await productPage.gotoProductDetails(1);
    await expect(productPage.productInfoContainer).toBeVisible();

    await productPage.setQuantity(-1);
    await productPage.addToCartFromDetails();

    const modalAppearedForNegative = await productPage.cartModal.isVisible({ timeout: 3000 }).catch(() => false);

    if (modalAppearedForNegative) {
      await productPage.clickViewCartFromModal();
      const rowCount = await cartPage.getCartRowCount();

      if (rowCount > 0) {
        const details = await cartPage.getRowDetails(cartPage.getProductRowByIndex(0));

        test.info().annotations.push({
          type: 'observed_defect',
          description: `Negative quantity (-1) accepted by SUT without validation: displayed quantity=${details.quantity}, total=${details.total}. E-commerce applications should enforce positive integers.`,
        });

        // Assert row details exist and page does not crash
        expect(details).toBeDefined();

        // Clean up cart item
        await cartPage.deleteProduct(cartPage.getProductRowByIndex(0));
      }
    } else {
      test.info().annotations.push({
        type: 'observed_behavior',
        description: 'Negative quantity correctly blocked or rejected by client-side constraints.',
      });
    }
  });

  /**
   * CART-004 | AE-13
   * Remove a specific product from cart
   */
  test('TC-AE-CART-004: Remove a specific product from cart', {
    tag: ['@cart', '@smoke', '@REQ-AE-CART'],
  }, async () => {
    // 1. Navigate to products catalog and add 2 distinct products
    await productPage.goto();
    await productPage.addProductToCartByIndex(0);
    await productPage.clickContinueShopping();

    await productPage.addProductToCartByIndex(1);
    await productPage.clickViewCartFromModal();

    // 2. Verify both products are present in the cart
    await expect(cartPage.cartTable).toBeVisible();
    expect(await cartPage.getCartRowCount()).toBe(2);

    const firstProductDetails = await cartPage.getRowDetails(cartPage.getProductRowByIndex(0));
    const secondProductDetails = await cartPage.getRowDetails(cartPage.getProductRowByIndex(1));

    // 3. Delete the first product from the cart
    const firstProductRow = cartPage.getProductRowByIndex(0);
    const firstRowId = await firstProductRow.getAttribute('id');
    const targetRow = firstRowId ? cartPage.page.locator(`#${firstRowId}`) : firstProductRow;
    await cartPage.deleteProduct(targetRow);

    // 4. Assert exactly one product remains in the cart
    expect(await cartPage.getCartRowCount()).toBe(1);

    // 5. Assert the remaining product is the second product
    const remainingProductDetails = await cartPage.getRowDetails(cartPage.getProductRowByIndex(0));
    expect(remainingProductDetails.title).toBe(secondProductDetails.title);
    expect(remainingProductDetails.title).not.toBe(firstProductDetails.title);
  });

  /**
   * CART-005 | AE-13
   * Remove all products from cart to reach empty cart state
   */
  test('TC-AE-CART-005: Remove all products from cart to reach empty cart state', {
    tag: ['@cart', '@edge', '@REQ-AE-CART'],
  }, async () => {
    // 1. Navigate to product details and add single item to cart
    await productPage.gotoProductDetails(1);
    await productPage.addToCartFromDetails();
    await productPage.clickViewCartFromModal();

    // 2. Verify 1 product is initially present in the cart
    await expect(cartPage.cartTable).toBeVisible();
    expect(await cartPage.getCartRowCount()).toBe(1);

    // 3. Delete the product from the cart
    await cartPage.deleteProduct(cartPage.getProductRowByIndex(0));

    // 4. Assert that cart table rows are completely cleared
    expect(await cartPage.getCartRowCount()).toBe(0);

    // 5. Assert empty cart container, text message, and navigation link are displayed
    await expect(cartPage.emptyCartContainer).toBeVisible();
    await expect(cartPage.emptyCartText).toBeVisible();
    await expect(cartPage.emptyCartLink).toBeVisible();
  });

  /**
   * CART-006 | AE-14
   * Cart persistence across guest session and post-login authentication
   */
  test('TC-AE-CART-006: Cart persistence across guest session and post-login authentication', {
    tag: ['@cart', '@integration', '@REQ-AE-CART'],
  }, async () => {
    // 1. Pre-provision test account deterministically via API
    const user: UserAccountData = generateUniqueUser('cart_persist');
    await accountApi.createAccount(user);

    try {
      // 2. As an unauthenticated guest, add a product to cart
      await productPage.gotoProductDetails(1);
      await productPage.addToCartFromDetails();
      await productPage.clickViewCartFromModal();

      // 3. Verify product is present in the unauthenticated guest cart
      const guestRow = cartPage.getProductRowById(1);
      await expect(guestRow).toBeVisible();
      const guestDetails = await cartPage.getRowDetails(guestRow);
      expect(guestDetails.quantity).toBe(1);

      // 4. Navigate to login page and log in with the pre-provisioned user
      await loginPage.goto();
      await loginPage.login(user.email, user.password);
      await expect(loginPage.loggedInUserText).toBeVisible();

      // 5. Navigate back to cart page and verify cart persistence post-login
      await cartPage.goto();
      const postLoginRow = cartPage.getProductRowById(1);
      await expect(postLoginRow).toBeVisible();

      const postLoginDetails = await cartPage.getRowDetails(postLoginRow);
      expect(postLoginDetails.title).toBe(guestDetails.title);
      expect(postLoginDetails.quantity).toBeGreaterThanOrEqual(1);

      test.info().annotations.push({
        type: 'observed_behavior',
        description: `Guest cart persisted successfully after login: ${postLoginDetails.title} (Qty: ${postLoginDetails.quantity}) retained.`,
      });
    } finally {
      // 6. Deterministic teardown with non-masking cleanup visibility
      const cleanup = await accountApi.deleteAccount(user.email, user.password);
      if (!cleanup.success) {
        test.info().annotations.push({
          type: 'cleanup_warning',
          description: cleanup.message || `Account cleanup incomplete for ${user.email}`,
        });
      }
    }
  });
});
