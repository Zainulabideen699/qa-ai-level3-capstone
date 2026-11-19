import { test, expect } from '@playwright/test';
import { AccountApi } from '@api/accountApi';
import { ProductsApi } from '@api/productsApi';
import { parseJsonResponse } from '@api/apiHelper';
import { generateUniqueUser, UserAccountData } from '@utils/testData';

test.describe('Backend REST API Tests - System Under Test: Automation Exercise', () => {
  let accountApi: AccountApi;
  let productsApi: ProductsApi;

  test.beforeEach(async ({ request }) => {
    accountApi = new AccountApi(request);
    productsApi = new ProductsApi(request);
  });

  test('TC-AE-API-001: Verify Login API with valid user credentials', {
    tag: ['@api', '@smoke', '@REQ-AE-API'],
  }, async () => {
    // 1. Dynamically provision user account prior to API verification
    const user: UserAccountData = generateUniqueUser('valid_api_login');
    await accountApi.createAccount(user);

    try {
      // 2. Invoke POST /api/verifyLogin with valid form data
      const loginRes = await accountApi.verifyLogin({
        email: user.email,
        password: user.password,
      });

      // 3. Assert HTTP transport status, custom responseCode, and message
      expect(loginRes.status).toBe(200);
      expect(loginRes.responseCode).toBe(200);
      expect(loginRes.message).toBe('User exists!');
    } finally {
      // 4. Deterministic teardown with failure visibility without masking test results
      const cleanup = await accountApi.deleteAccount(user.email, user.password);
      if (!cleanup.success) {
        test.info().annotations.push({
          type: 'cleanup_warning',
          description: cleanup.message || `Account cleanup incomplete for ${user.email}`,
        });
      }
    }
  });

  test('TC-AE-API-002: Verify Login API negative responses for invalid credentials and missing parameters', {
    tag: ['@api', '@negative', '@REQ-AE-API'],
  }, async () => {
    // 1. Test non-existent / invalid credentials
    const invalidEmail = `nonexistent_user_${Date.now()}@example.com`;
    const invalidLoginRes = await accountApi.verifyLogin({
      email: invalidEmail,
      password: 'WrongPassword999!',
    });
    expect(invalidLoginRes.status).toBe(200);
    expect(invalidLoginRes.responseCode).toBe(404);
    expect(invalidLoginRes.message).toBe('User not found!');

    // 2. Test missing email parameter (password only)
    const missingEmailRes = await accountApi.verifyLogin({
      password: 'SomePassword123!',
    });
    expect(missingEmailRes.status).toBe(200);
    expect(missingEmailRes.responseCode).toBe(400);
    expect(missingEmailRes.message).toBe('Bad request, email or password parameter is missing in POST request.');

    // 3. Test missing password parameter (email only)
    const missingPasswordRes = await accountApi.verifyLogin({
      email: invalidEmail,
    });
    expect(missingPasswordRes.status).toBe(200);
    expect(missingPasswordRes.responseCode).toBe(400);
    expect(missingPasswordRes.message).toBe('Bad request, email or password parameter is missing in POST request.');

    // 4. Test missing both email and password parameters
    const missingBothRes = await accountApi.verifyLogin({});
    expect(missingBothRes.status).toBe(200);
    expect(missingBothRes.responseCode).toBe(400);
    expect(missingBothRes.message).toBe('Bad request, email or password parameter is missing in POST request.');
  });

  test('TC-AE-API-003: Get all products list and validate schema and attributes', {
    tag: ['@api', '@smoke', '@REQ-AE-API'],
  }, async () => {
    // 1. Send GET /api/productsList
    const response = await productsApi.getProductsList();

    // 2. Assert HTTP transport status and custom JSON responseCode
    expect(response.status).toBe(200);
    expect(response.responseCode).toBe(200);

    // 3. Assert products array is present and non-empty
    expect(Array.isArray(response.products)).toBe(true);
    expect(response.products.length).toBeGreaterThan(0);

    // 4. Validate schema and required attributes on sampled items
    const sampleProducts = response.products.slice(0, 5);
    for (const product of sampleProducts) {
      expect(typeof product.id).toBe('number');
      expect(product.id).toBeGreaterThan(0);

      expect(typeof product.name).toBe('string');
      expect(product.name.trim().length).toBeGreaterThan(0);

      expect(typeof product.price).toBe('string');
      expect(product.price.trim().length).toBeGreaterThan(0);

      expect(typeof product.brand).toBe('string');
      expect(product.brand.trim().length).toBeGreaterThan(0);

      expect(product.category).toBeDefined();
      expect(typeof product.category.category).toBe('string');
      expect(product.category.usertype).toBeDefined();
      expect(typeof product.category.usertype.usertype).toBe('string');
    }
  });

  test('TC-AE-API-004: Search product via API with query parameter', {
    tag: ['@api', '@smoke', '@REQ-AE-API'],
  }, async () => {
    const searchTerm = 'tshirt';

    // 1. Send POST /api/searchProduct with form data
    const response = await productsApi.searchProduct(searchTerm);

    // 2. Assert HTTP transport status and JSON responseCode
    expect(response.status).toBe(200);
    expect(response.responseCode).toBe(200);

    // 3. Assert products array is present and non-empty
    expect(Array.isArray(response.products)).toBe(true);
    expect(response.products.length).toBeGreaterThan(0);

    // 4. Assert returned items match the search domain
    for (const product of response.products) {
      const name = product.name.toLowerCase();
      const category = (product.category?.category || '').toLowerCase();
      const isRelevant =
        name.includes('tshirt') ||
        name.includes('t-shirt') ||
        name.includes('shirt') ||
        category.includes('tshirt') ||
        category.includes('top');
      expect(isRelevant).toBe(true);
    }
  });

  test('TC-AE-API-005: User Account API full CRUD lifecycle (Create, Read, Update, Delete)', {
    tag: ['@api', '@smoke', '@REQ-AE-API'],
  }, async () => {
    const user: UserAccountData = generateUniqueUser('crud_api_lifecycle');
    let isDeleted = false;

    try {
      // Step 1: CREATE (C) - Provision new user via POST /api/createAccount
      const createRes = await accountApi.createAccountWithDetails(user);
      expect(createRes.status).toBe(200);
      expect(createRes.responseCode).toBe(201);
      expect(createRes.message).toBe('User created!');

      // Step 2: READ (R) - Retrieve created user details via GET /api/getUserDetailByEmail
      const readRes = await accountApi.getUserDetailByEmail(user.email);
      expect(readRes.status).toBe(200);
      expect(readRes.responseCode).toBe(200);
      expect(readRes.user).toBeDefined();
      expect(readRes.user.email).toBe(user.email);
      expect(readRes.user.name).toBe(user.name);
      expect(readRes.user.company).toBe(user.company);

      // Step 3: UPDATE (U) - Modify account attributes via PUT /api/updateAccount
      const updatedPayload: UserAccountData = {
        ...user,
        name: `${user.name}_Updated`,
        company: 'QA Labs Global Inc',
        city: 'Los Angeles',
      };
      const updateRes = await accountApi.updateAccount(updatedPayload);
      expect(updateRes.status).toBe(200);
      expect(updateRes.responseCode).toBe(200);
      expect(updateRes.message).toBe('User updated!');

      // Verify updated details reflected in account profile
      const reReadRes = await accountApi.getUserDetailByEmail(user.email);
      expect(reReadRes.status).toBe(200);
      expect(reReadRes.responseCode).toBe(200);
      expect(reReadRes.user.company).toBe('QA Labs Global Inc');
      expect(reReadRes.user.city).toBe('Los Angeles');

      // Step 4: DELETE (D) - Cleanly delete user account via DELETE /api/deleteAccount
      const deleteRes = await accountApi.deleteAccountWithDetails(user.email, user.password);
      expect(deleteRes.status).toBe(200);
      expect(deleteRes.responseCode).toBe(200);
      expect(deleteRes.message).toBe('Account deleted!');
      isDeleted = true;

      // Verify user account can no longer be retrieved
      const verifyDeletedRes = await accountApi.getUserDetailByEmail(user.email);
      expect(verifyDeletedRes.responseCode).toBe(404);
    } finally {
      // Safety teardown: ensure account deletion even if intermediate assertions fail
      if (!isDeleted) {
        const cleanup = await accountApi.deleteAccount(user.email, user.password);
        if (!cleanup.success) {
          test.info().annotations.push({
            type: 'cleanup_warning',
            description: cleanup.message || `Account cleanup incomplete for ${user.email}`,
          });
        }
      }
    }
  });

  test('TC-AE-API-006: Validate API HTTP method constraints and bad request handling', {
    tag: ['@api', '@negative', '@REQ-AE-API'],
  }, async ({ request }) => {
    // 1. POST /api/productsList (Method Not Allowed: endpoint is GET only)
    const postProductsRes = await request.post('/api/productsList');
    expect(postProductsRes.status()).toBe(200);
    const postProductsBody = await parseJsonResponse<{ responseCode: number; message: string }>(
      postProductsRes,
      'POST /api/productsList'
    );
    expect(postProductsBody.responseCode).toBe(405);
    expect(postProductsBody.message).toBe('This request method is not supported.');

    // 2. PUT /api/brandsList (Method Not Allowed: endpoint is GET only)
    const putBrandsRes = await request.put('/api/brandsList');
    expect(putBrandsRes.status()).toBe(200);
    const putBrandsBody = await parseJsonResponse<{ responseCode: number; message: string }>(
      putBrandsRes,
      'PUT /api/brandsList'
    );
    expect(putBrandsBody.responseCode).toBe(405);
    expect(putBrandsBody.message).toBe('This request method is not supported.');

    // 3. DELETE /api/verifyLogin (Method Not Allowed: endpoint is POST only)
    const deleteLoginRes = await request.delete('/api/verifyLogin');
    expect(deleteLoginRes.status()).toBe(200);
    const deleteLoginBody = await parseJsonResponse<{ responseCode: number; message: string }>(
      deleteLoginRes,
      'DELETE /api/verifyLogin'
    );
    expect(deleteLoginBody.responseCode).toBe(405);
    expect(deleteLoginBody.message).toBe('This request method is not supported.');

    // 4. POST /api/searchProduct without mandatory search_product parameter (Bad Request)
    // SUT expects form-encoded POST requests; omitting search_product verifies bad request handling
    const searchNoParamRes = await request.post('/api/searchProduct', {
      form: {},
    });
    expect(searchNoParamRes.status()).toBe(200);
    const searchNoParamBody = await parseJsonResponse<{ responseCode: number; message: string }>(
      searchNoParamRes,
      'POST /api/searchProduct (missing parameter)'
    );
    expect(searchNoParamBody.responseCode).toBe(400);
    expect(searchNoParamBody.message).toBe('Bad request, search_product parameter is missing in POST request.');
  });
});
