/**
 * Test user account structure for Automation Exercise registration & API payloads.
 */
export interface UserAccountData {
  name: string;
  email: string;
  password: string;
  title: string;
  birth_date: string;
  birth_month: string;
  birth_year: string;
  firstname: string;
  lastname: string;
  company: string;
  address1: string;
  address2: string;
  country: string;
  zipcode: string;
  state: string;
  city: string;
  mobile_number: string;
}

/**
 * Generates unique user account data using high-resolution timestamps
 * to ensure test isolation and prevent duplicate account collisions.
 */
export function generateUniqueUser(prefix: string = 'testuser'): UserAccountData {
  const timestamp = Date.now();
  const randomSuffix = Math.floor(Math.random() * 10000);
  const uniqueId = `${timestamp}_${randomSuffix}`;

  return {
    name: `${prefix}_${uniqueId}`,
    email: `${prefix}_${uniqueId}@example.com`,
    password: 'Password123!',
    title: 'Mr',
    birth_date: '15',
    birth_month: '06',
    birth_year: '1995',
    firstname: 'Automation',
    lastname: 'Tester',
    company: 'QA Labs Inc',
    address1: '742 Evergreen Terrace',
    address2: 'Apt 4B',
    country: 'United States',
    zipcode: '97477',
    state: 'Oregon',
    city: 'Springfield',
    mobile_number: '5551234567',
  };
}
