import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * LoginPage encapsulates locators and interactions for the Signup / Login page
 * at https://automationexercise.com/login.
 */
export class LoginPage extends BasePage {
  // Login section locators
  readonly loginFormHeading: Locator;
  readonly loginEmailInput: Locator;
  readonly loginPasswordInput: Locator;
  readonly loginButton: Locator;
  readonly loginErrorMessage: Locator;

  // New User Signup section locators
  readonly signupFormHeading: Locator;
  readonly signupNameInput: Locator;
  readonly signupEmailInput: Locator;
  readonly signupButton: Locator;
  readonly signupErrorMessage: Locator;

  constructor(page: Page) {
    super(page);

    // Login elements using data-qa attributes and scoped text locators
    this.loginFormHeading = page.getByRole('heading', { name: 'Login to your account' });
    this.loginEmailInput = page.locator('[data-qa="login-email"]');
    this.loginPasswordInput = page.locator('[data-qa="login-password"]');
    this.loginButton = page.locator('[data-qa="login-button"]');
    this.loginErrorMessage = page.locator('form[action*="/login"]').locator('p').filter({ hasText: /incorrect/i });

    // Signup elements using data-qa attributes and scoped text locators
    this.signupFormHeading = page.getByRole('heading', { name: 'New User Signup!' });
    this.signupNameInput = page.locator('[data-qa="signup-name"]');
    this.signupEmailInput = page.locator('[data-qa="signup-email"]');
    this.signupButton = page.locator('[data-qa="signup-button"]');
    this.signupErrorMessage = page.locator('form[action*="/signup"]').locator('p').filter({ hasText: /already exist/i });
  }

  /**
   * Navigate directly to the login page.
   */
  async goto(): Promise<void> {
    await this.navigate('/login');
  }

  /**
   * Submit credentials into the login form.
   */
  async login(email: string, password: string): Promise<void> {
    await this.loginEmailInput.fill(email);
    await this.loginPasswordInput.fill(password);
    await this.loginButton.click();
  }

  /**
   * Submit name and email into the signup form.
   */
  async signup(name: string, email: string): Promise<void> {
    await this.signupNameInput.fill(name);
    await this.signupEmailInput.fill(email);
    await this.signupButton.click();
  }

  /**
   * Click logout from the navbar.
   */
  async logout(): Promise<void> {
    await this.logoutLink.click();
  }
}
