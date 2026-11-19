import { APIRequestContext } from '@playwright/test';
import { UserAccountData } from '../utils/testData';

export interface CleanupResult {
  success: boolean;
  message?: string;
}

/**
 * Account API helper for deterministic test setup and teardown.
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
