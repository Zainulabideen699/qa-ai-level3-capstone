import { Page, Locator } from '@playwright/test';

/**
 * BasePage encapsulates common functionality, navigation, and shared header
 * elements across all pages of https://automationexercise.com.
 */
export class BasePage {
  readonly page: Page;

  // Global header navigation locators
  readonly homeLink: Locator;
  readonly productsLink: Locator;
  readonly cartLink: Locator;
  readonly signupLoginLink: Locator;
  readonly logoutLink: Locator;
  readonly deleteAccountLink: Locator;
  readonly loggedInUserText: Locator;

  constructor(page: Page) {
    this.page = page;

    this.homeLink = page.getByRole('link', { name: 'Home' });
    this.productsLink = page.getByRole('link', { name: 'Products' });
    this.cartLink = page.getByRole('link', { name: 'Cart' });
    this.signupLoginLink = page.getByRole('link', { name: /Signup \/ Login/i });
    this.logoutLink = page.getByRole('link', { name: 'Logout' });
    this.deleteAccountLink = page.getByRole('link', { name: 'Delete Account' });
    this.loggedInUserText = page.getByText(/Logged in as/i);
  }

  /**
   * Navigate to a path relative to the baseURL configured in playwright.config.ts
   */
  async navigate(path: string = '/'): Promise<void> {
    await this.page.goto(path);
  }

  /**
   * Install targeted ad-blocking routes on the current page to prevent third-party
   * ad scripts and overlays from interfering with test interactions.
   */
  async applyAdBlocker(): Promise<void> {
    await this.page.route(
      /(googlesyndication|doubleclick|google-analytics|adservice)/,
      route => route.abort()
    );
  }
}
