import { test, expect } from '@playwright/test';
import { LoginPage } from '@pages/LoginPage';
import { AccountApi } from '@api/accountApi';
import { generateUniqueUser, UserAccountData } from '@utils/testData';

test.describe('Authentication Tests - System Under Test: Automation Exercise', () => {
  let loginPage: LoginPage;
  let accountApi: AccountApi;

  test.beforeEach(async ({ page, request }) => {
    loginPage = new LoginPage(page);
    accountApi = new AccountApi(request);

    // Apply targeted ad-blocking to prevent third-party overlay intercepts
    await loginPage.applyAdBlocker();
  });

  test('TC-AE-AUTH-002: User login with valid credentials and subsequent logout', {
    tag: ['@auth', '@smoke', '@REQ-AE-AUTH'],
  }, async () => {
    // 1. Dynamic pre-test account provisioning via API
    const user: UserAccountData = generateUniqueUser('valid_login');
    await accountApi.createAccount(user);

    try {
      // 2. Navigate to login page and verify form visibility
      await loginPage.goto();
      await expect(loginPage.loginFormHeading).toBeVisible();

      // 3. Submit valid credentials
      await loginPage.login(user.email, user.password);

      // 4. Assert user is authenticated and header reflects user identity
      await expect(loginPage.loggedInUserText).toBeVisible();
      await expect(loginPage.loggedInUserText).toContainText(user.name);

      // 5. Logout and verify redirection to login screen
      await loginPage.logout();
      await expect(loginPage.loginFormHeading).toBeVisible();
      await expect(loginPage.loggedInUserText).not.toBeVisible();
    } finally {
      // 6. Deterministic teardown with failure visibility without masking test results
      const cleanup = await accountApi.deleteAccount(user.email, user.password);
      if (!cleanup.success) {
        test.info().annotations.push({
          type: 'cleanup_warning',
          description: cleanup.message || `Account cleanup incomplete for ${user.email}`,
        });
      }
    }
  });

  test('TC-AE-AUTH-003: Attempt login with incorrect email and password', {
    tag: ['@auth', '@negative', '@REQ-AE-AUTH'],
  }, async () => {
    const invalidEmail = `invalid_user_${Date.now()}@example.com`;
    const invalidPassword = 'WrongPassword999!';

    // 1. Navigate to login page
    await loginPage.goto();
    await expect(loginPage.loginFormHeading).toBeVisible();

    // 2. Attempt login with non-existent credentials
    await loginPage.login(invalidEmail, invalidPassword);

    // 3. Assert error message is displayed and session is not initiated
    await expect(loginPage.loginErrorMessage).toBeVisible();
    await expect(loginPage.loginErrorMessage).toHaveText('Your email or password is incorrect!');
    await expect(loginPage.loggedInUserText).not.toBeVisible();
  });

  test('TC-AE-AUTH-004: Attempt registration with an already-registered email address', {
    tag: ['@auth', '@negative', '@REQ-AE-AUTH'],
  }, async () => {
    // 1. Pre-provision an existing user via API
    const existingUser: UserAccountData = generateUniqueUser('existing_user');
    await accountApi.createAccount(existingUser);

    try {
      // 2. Navigate to login page
      await loginPage.goto();
      await expect(loginPage.signupFormHeading).toBeVisible();

      // 3. Attempt signup using the already-registered email address
      await loginPage.signup('Duplicate Tester', existingUser.email);

      // 4. Assert duplicate registration error is displayed
      await expect(loginPage.signupErrorMessage).toBeVisible();
      await expect(loginPage.signupErrorMessage).toHaveText('Email Address already exist!');
    } finally {
      // 5. Deterministic teardown with failure visibility without masking test results
      const cleanup = await accountApi.deleteAccount(existingUser.email, existingUser.password);
      if (!cleanup.success) {
        test.info().annotations.push({
          type: 'cleanup_warning',
          description: cleanup.message || `Account cleanup incomplete for ${existingUser.email}`,
        });
      }
    }
  });
});
