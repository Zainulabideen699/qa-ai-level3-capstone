import { APIRequestContext } from '@playwright/test';
import { UserAccountData } from '../utils/testData';

export interface CleanupResult {
  success: boolean;
  message?: string;
}

export interface AccountApiResponse {
  status: number;
  responseCode: number;
  message: string;
  rawBody: any;
}

export interface UserDetailResponse {
  status: number;
  responseCode: number;
  user?: any;
  message?: string;
  rawBody: any;
}

/**
 * Account API helper for deterministic test setup, teardown, and API test validation.
 * Communicates directly with Automation Exercise REST API endpoints.
 */
export class AccountApi {
  readonly request: APIRequestContext;

  constructor(request: APIRequestContext) {
    this.request = request;
  }

  /**
   * Provision a new user account directly via the backend API.
   * Useful for pre-test setup without slow UI registration steps.
   */
  async createAccount(user: UserAccountData): Promise<void> {
    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      attempts++;
      const response = await this.request.post('/api/createAccount', {
        form: {
          name: user.name,
          email: user.email,
          password: user.password,
          title: user.title,
          birth_date: user.birth_date,
          birth_month: user.birth_month,
          birth_year: user.birth_year,
          firstname: user.firstname,
          lastname: user.lastname,
          company: user.company,
          address1: user.address1,
          address2: user.address2,
          country: user.country,
          zipcode: user.zipcode,
          state: user.state,
          city: user.city,
          mobile_number: user.mobile_number,
        },
      });

      const rawText = await response.text();
      let body: any;
      try {
        body = JSON.parse(rawText);
      } catch (err) {
        if (attempts < maxAttempts) {
          // Brief pause before retry in case of transient server glitch or rate-limit
          await new Promise(resolve => setTimeout(resolve, 1500));
          continue;
        }
        throw new Error(
          `Unexpected non-JSON response from /api/createAccount (HTTP ${response.status()}): ${rawText.slice(0, 300)}`
        );
      }

      if (body.responseCode !== 201) {
        throw new Error(`Failed to create account via API: ${JSON.stringify(body)}`);
      }
      return;
    }
  }

  /**
   * Provision a new user account and return full status and response payload.
   * Designed for API tests asserting on responseCode and message.
   */
  async createAccountWithDetails(user: UserAccountData): Promise<AccountApiResponse> {
    const response = await this.request.post('/api/createAccount', {
      form: {
        name: user.name,
        email: user.email,
        password: user.password,
        title: user.title,
        birth_date: user.birth_date,
        birth_month: user.birth_month,
        birth_year: user.birth_year,
        firstname: user.firstname,
        lastname: user.lastname,
        company: user.company,
        address1: user.address1,
        address2: user.address2,
        country: user.country,
        zipcode: user.zipcode,
        state: user.state,
        city: user.city,
        mobile_number: user.mobile_number,
      },
    });

    const rawText = await response.text();
    let body: any;
    try {
      body = JSON.parse(rawText);
    } catch {
      body = { rawText };
    }

    return {
      status: response.status(),
      responseCode: body.responseCode,
      message: body.message || '',
      rawBody: body,
    };
  }

  /**
   * Verify login credentials via POST /api/verifyLogin.
   * Supports valid credentials, invalid credentials, or missing parameters.
   */
  async verifyLogin(params?: { email?: string; password?: string }): Promise<AccountApiResponse> {
    const formData: Record<string, string> = {};
    if (params?.email !== undefined) formData.email = params.email;
    if (params?.password !== undefined) formData.password = params.password;

    const response = await this.request.post('/api/verifyLogin', {
      form: formData,
    });

    const rawText = await response.text();
    let body: any;
    try {
      body = JSON.parse(rawText);
    } catch {
      body = { rawText };
    }

    return {
      status: response.status(),
      responseCode: body.responseCode,
      message: body.message || '',
      rawBody: body,
    };
  }

  /**
   * Retrieve user account details by email via GET /api/getUserDetailByEmail.
   */
  async getUserDetailByEmail(email: string): Promise<UserDetailResponse> {
    const response = await this.request.get('/api/getUserDetailByEmail', {
      params: { email },
    });

    const rawText = await response.text();
    let body: any;
    try {
      body = JSON.parse(rawText);
    } catch {
      body = { rawText };
    }

    return {
      status: response.status(),
      responseCode: body.responseCode,
      user: body.user,
      message: body.message,
      rawBody: body,
    };
  }

  /**
   * Update user account details via PUT /api/updateAccount.
   */
  async updateAccount(user: Partial<UserAccountData> & { email: string; password: string }): Promise<AccountApiResponse> {
    const formData: Record<string, string> = {};
    for (const [key, value] of Object.entries(user)) {
      if (value !== undefined) {
        formData[key] = String(value);
      }
    }

    const response = await this.request.put('/api/updateAccount', {
      form: formData,
    });

    const rawText = await response.text();
    let body: any;
    try {
      body = JSON.parse(rawText);
    } catch {
      body = { rawText };
    }

    return {
      status: response.status(),
      responseCode: body.responseCode,
      message: body.message || '',
      rawBody: body,
    };
  }

  /**
   * Delete user account and return detailed API response payload.
   */
  async deleteAccountWithDetails(email: string, password: string): Promise<AccountApiResponse> {
    const response = await this.request.delete('/api/deleteAccount', {
      form: {
        email,
        password,
      },
    });

    const rawText = await response.text();
    let body: any;
    try {
      body = JSON.parse(rawText);
    } catch {
      body = { rawText };
    }

    return {
      status: response.status(),
      responseCode: body.responseCode,
      message: body.message || '',
      rawBody: body,
    };
  }

  /**
   * Delete an existing user account directly via the backend API.
   * Returns a structured result to allow tests to record cleanup warnings
   * without throwing exceptions in teardown and masking original test failures.
   */
  async deleteAccount(email: string, password: string): Promise<CleanupResult> {
    try {
      const response = await this.request.delete('/api/deleteAccount', {
        form: {
          email,
          password,
        },
      });

      const rawText = await response.text();
      let body: any;
      try {
        body = JSON.parse(rawText);
      } catch {
        const warning = `Cleanup non-JSON response for ${email} (HTTP ${response.status()}): ${rawText.slice(0, 150)}`;
        console.warn(warning);
        return { success: false, message: warning };
      }

      if (body.responseCode !== 200) {
        const warning = `Account cleanup returned responseCode ${body.responseCode} for ${email}: ${JSON.stringify(body)}`;
        console.warn(warning);
        return { success: false, message: warning };
      }

      return { success: true, message: body.message || 'Account deleted!' };
    } catch (error) {
      const errorMessage = `Exception during account cleanup for ${email}: ${error instanceof Error ? error.message : String(error)}`;
      console.warn(errorMessage);
      return { success: false, message: errorMessage };
    }
  }
}
