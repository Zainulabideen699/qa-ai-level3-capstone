# Test Scenario Catalogue: Automation Exercise

## 1. Document Overview
This document represents the formal **Test Design Specification** produced by the **Test Design Agent** for the AI Level-3 Quality Engineering Capstone. It serves as the baseline for **Gate 1: Test Design Approval**.

- **System Under Test (SUT)**: [https://automationexercise.com](https://automationexercise.com)
- **Framework Standards**: Playwright, TypeScript, Page Object Model (POM), Resilient Accessible Locators.
- **Requirement Reference**: Assessment Scenario Catalogue (AE-01 through AE-24).

---

## 2. Functional Areas Overview

The test catalogue spans seven distinct functional areas:
1. **User Authentication & Account Lifecycle (`AUTH`)**: Registration, valid/invalid login, duplicate handling, logout, account deletion.
2. **Product Catalog & Search (`PROD`)**: Catalog browsing, keyword search, category filtering, brand filtering, recommended items.
3. **Cart Management & Computations (`CART`)**: Multi-item additions, quantity calculations, item removal, empty cart state, session persistence.
4. **Checkout, Order Processing & Invoicing (`CHECK`)**: End-to-end checkout, address verification, payment processing, invoice downloads.
5. **Customer Engagement & Inquiries (`ENG`)**: Product reviews, contact form with attachments, newsletter subscriptions.
6. **Backend REST APIs (`API`)**: Catalog APIs, search APIs, login validation, account CRUD lifecycle, HTTP method validation.
7. **Hybrid UI/API Integration & Consistency (`INT`)**: End-to-end consistency checks comparing API responses directly with UI DOM state.

---

## 3. Test Scenarios Catalogue

---

### Area 1: User Authentication & Account Management (`AUTH`)

#### TC-AE-AUTH-001
- **Assessment Reference**: AE-01
- **Functional Area**: User Authentication & Account Management (`AUTH`)
- **Scenario Title**: Register new user with full profile details
- **Classification**: UI
- **Type**: Positive
- **Preconditions and Test Data**:
  - Browser opened at `/login`.
  - Dynamic test data: Name: `TestUser_<timestamp>`, Email: `user_<timestamp>@example.com`, Password: `Password123!`, Address: `123 Main St`, Country: `United States`, State: `California`, City: `Los Angeles`, Zip: `90001`, Mobile: `1234567890`.
- **Main Test Steps**:
  1. Navigate to `/login`.
  2. Verify 'New User Signup!' header is visible.
  3. Enter Name and dynamic Email into signup form and click 'Signup'.
  4. Fill out account information (Title, Password, Date of Birth).
  5. Select checkboxes: 'Sign up for our newsletter!' and 'Receive special offers!'.
  6. Fill address information (First name, Last name, Company, Address, Country, State, City, Zipcode, Mobile Number).
  7. Click 'Create Account'.
  8. Click 'Continue' on the account creation confirmation page.
  9. Click 'Delete Account' to clean up test data.
- **Expected Result**:
  - 'ACCOUNT CREATED!' is visible after step 7.
  - Header displays 'Logged in as <Name>' after step 8.
  - 'ACCOUNT DELETED!' is displayed after step 9.
- **Priority**: High
- **Automation Feasibility & Limitations**: Fully automatable via Playwright. Dynamic email generation is required to prevent conflict.

---

#### TC-AE-AUTH-002
- **Assessment Reference**: AE-02
- **Functional Area**: User Authentication & Account Management (`AUTH`)
- **Scenario Title**: User login with valid credentials and subsequent logout
- **Classification**: UI
- **Type**: Positive
- **Preconditions and Test Data**:
  - Pre-test setup: A reliable, dedicated test account is dynamically provisioned prior to test execution via `POST /api/createAccount` (or pre-test hook) with email: `login_test_<timestamp>@example.com` and password: `Password123!`.
  - Post-test teardown: Post-test hook invokes `DELETE /api/deleteAccount` using the dynamic credentials to guarantee clean state and prevent test pollution.
- **Main Test Steps**:
  1. Navigate to `/login`.
  2. Verify 'Login to your account' header is visible.
  3. Enter the dynamically provisioned email address and password into login form.
  4. Click 'Login' button.
  5. Verify user is authenticated ('Logged in as <Name>' visible in navigation bar).
  6. Click 'Logout' button in header navigation.
- **Expected Result**:
  - User successfully logs in; 'Logged in as <Name>' is visible in the top navbar.
  - Upon clicking logout, user is redirected back to `/login` and 'Login to your account' is visible.
  - Dynamic user account is cleanly deleted in teardown.
- **Priority**: High
- **Automation Feasibility & Limitations**: Fully automatable. Reliable lifecycle management via API setup/teardown prevents dependency on static shared credentials.

---

#### TC-AE-AUTH-003
- **Assessment Reference**: AE-03
- **Functional Area**: User Authentication & Account Management (`AUTH`)
- **Scenario Title**: Attempt login with incorrect email and password
- **Classification**: UI
- **Type**: Negative
- **Preconditions and Test Data**:
  - Unregistered credentials: `nonexistent_user_999@example.com` / `WrongPass999!`.
- **Main Test Steps**:
  1. Navigate to `/login`.
  2. Enter incorrect email and password into login inputs.
  3. Click 'Login' button.
- **Expected Result**:
  - Error message 'Your email or password is incorrect!' is displayed on the page.
  - User remains on the `/login` page; no authenticated session is initiated.
- **Priority**: High
- **Automation Feasibility & Limitations**: Fully automatable. Web-first assertion on error text.

---

#### TC-AE-AUTH-004
- **Assessment Reference**: AE-04
- **Functional Area**: User Authentication & Account Management (`AUTH`)
- **Scenario Title**: Attempt registration with an already-registered email address
- **Classification**: UI
- **Type**: Negative
- **Preconditions and Test Data**:
  - Pre-test setup: Test dynamically registers a known user first via `POST /api/createAccount` with email: `dup_user_<timestamp>@example.com` and name: `Original User`.
  - Post-test teardown: Post-test hook invokes `DELETE /api/deleteAccount` to clean up the registered email.
- **Main Test Steps**:
  1. Navigate to `/login`.
  2. Enter Name: `Duplicate Tester` and the exact same Email: `dup_user_<timestamp>@example.com` into the 'New User Signup!' form.
  3. Click 'Signup' button.
- **Expected Result**:
  - User is not advanced to the registration form (`/signup`).
  - Error message 'Email Address already exist!' is visibly displayed below the signup form.
- **Priority**: High
- **Automation Feasibility & Limitations**: Fully automatable. Explicit pre-creation guarantees determinism without relying on pre-seeded external database states.

---

### Area 2: Product Catalog & Search (`PROD`)

#### TC-AE-PROD-001
- **Assessment Reference**: AE-06
- **Functional Area**: Product Catalog & Search (`PROD`)
- **Scenario Title**: Verify all products list and product detail page navigation
- **Classification**: UI
- **Type**: Positive
- **Preconditions and Test Data**:
  - SUT reachable at base URL.
- **Main Test Steps**:
  1. Navigate to `/products`.
  2. Verify 'ALL PRODUCTS' heading is visible.
  3. Verify product list contains at least 1 product card.
  4. Click 'View Product' on the first visible product.
- **Expected Result**:
  - User lands on `/product_details/<id>`.
  - Product name, category, price, availability, condition, and brand are visibly rendered.
- **Priority**: High
- **Automation Feasibility & Limitations**: Fully automatable.

---

#### TC-AE-PROD-002
- **Assessment Reference**: AE-07
- **Functional Area**: Product Catalog & Search (`PROD`)
- **Scenario Title**: Search product with relevant keyword and verify search results
- **Classification**: UI
- **Type**: Positive
- **Preconditions and Test Data**:
  - Keyword: `tshirt` (or common apparel search term).
- **Main Test Steps**:
  1. Navigate to `/products`.
  2. Enter search term `tshirt` in the search input field.
  3. Click the search button.
  4. Verify 'SEARCHED PRODUCTS' heading is displayed.
  5. Inspect the rendered product cards.
- **Expected Result**:
  - 'SEARCHED PRODUCTS' section heading is visible.
  - At least one product is returned in the search results (`productCount > 0`).
  - Search relevance is validated: returned items correspond to the query domain (matching product title, category, or description, without strictly requiring every title string to contain the literal lowercase keyword).
- **Priority**: High
- **Automation Feasibility & Limitations**: Fully automatable. Softening literal string matching prevents flakiness from catalog metadata variations.

---

#### TC-AE-PROD-003
- **Assessment Reference**: AE-08
- **Functional Area**: Product Catalog & Search (`PROD`)
- **Scenario Title**: Search product with non-existent keyword
- **Classification**: UI
- **Type**: Negative
- **Preconditions and Test Data**:
  - Non-existent keyword: `xyznonexistentproduct999`.
- **Main Test Steps**:
  1. Navigate to `/products`.
  2. Enter `xyznonexistentproduct999` in search input.
  3. Click search button.
- **Expected Result**:
  - 'SEARCHED PRODUCTS' header is displayed.
  - Zero matching product cards are rendered in the product results grid (`.features_items .col-sm-4` count is 0).
  - *Runtime Verification Required*: Confirm during initial test run whether the SUT renders a specific 'No products found' feedback banner or simply leaves the product container empty, and refine the locator assertion accordingly.
- **Priority**: Medium
- **Automation Feasibility & Limitations**: Fully automatable. Requires runtime confirmation of empty-state DOM element.

---

#### TC-AE-PROD-004
- **Assessment Reference**: AE-08
- **Functional Area**: Product Catalog & Search (`PROD`)
- **Scenario Title**: Submit search with empty query string or whitespace
- **Classification**: UI
- **Type**: Edge
- **Preconditions and Test Data**:
  - Query: empty string `""` or whitespace `"   "`.
- **Main Test Steps**:
  1. Navigate to `/products`.
  2. Leave search input empty (or input whitespace) and click search button.
- **Expected Result**:
  - Page gracefully handles empty input without JavaScript uncaught exceptions or application crash.
  - Either displays all products or retains standard catalog view safely.
- **Priority**: Medium
- **Automation Feasibility & Limitations**: Fully automatable.

---

#### TC-AE-PROD-005
- **Assessment Reference**: AE-09
- **Functional Area**: Product Catalog & Search (`PROD`)
- **Scenario Title**: Verify category and subcategory filtering
- **Classification**: UI
- **Type**: Positive
- **Preconditions and Test Data**:
  - Category: `Women` -> Subcategory: `Dress`.
- **Main Test Steps**:
  1. Navigate to `/products`.
  2. In the left sidebar 'CATEGORY', click on 'Women'.
  3. Under Women, click 'Dress'.
  4. Verify page heading updates to 'WOMEN - DRESS PRODUCTS'.
  5. Click 'Men' category -> Subcategory 'Tshirts'.
- **Expected Result**:
  - Category title dynamically updates to 'MEN - TSHIRTS PRODUCTS'.
  - Filtered items correspond to the selected category.
- **Priority**: Medium
- **Automation Feasibility & Limitations**: Fully automatable.

---

#### TC-AE-PROD-006
- **Assessment Reference**: AE-10
- **Functional Area**: Product Catalog & Search (`PROD`)
- **Scenario Title**: Verify brand filtering functionality
- **Classification**: UI
- **Type**: Positive
- **Preconditions and Test Data**:
  - Brands: `Polo`, `H&M`.
- **Main Test Steps**:
  1. Navigate to `/products`.
  2. In the left sidebar 'BRANDS', click on 'Polo'.
  3. Verify heading shows 'BRAND - POLO PRODUCTS' and products are displayed.
  4. In the sidebar, click on 'H&M'.
- **Expected Result**:
  - Heading updates to 'BRAND - H&M PRODUCTS'.
  - Products displayed belong strictly to H&M brand.
- **Priority**: Medium
- **Automation Feasibility & Limitations**: Fully automatable.

---

#### TC-AE-PROD-007
- **Assessment Reference**: AE-21
- **Functional Area**: Product Catalog & Search (`PROD`)
- **Scenario Title**: Add to cart from Recommended Items carousel
- **Classification**: UI
- **Type**: Positive
- **Preconditions and Test Data**:
  - Homepage `/`.
- **Main Test Steps**:
  1. Navigate to `/`.
  2. Scroll to the bottom of the page to 'RECOMMENDED ITEMS' section.
  3. Verify 'RECOMMENDED ITEMS' heading is visible.
  4. Click 'Add to cart' on a recommended product.
  5. Click 'View Cart' in the modal.
- **Expected Result**:
  - Success modal confirms item addition.
  - Cart page displays the recommended product with correct title and price.
- **Priority**: Medium
- **Automation Feasibility & Limitations**: Fully automatable. Requires smooth scrolling to trigger carousel loading.

---

### Area 3: Cart Management & Computations (`CART`)

#### TC-AE-CART-001
- **Assessment Reference**: AE-11
- **Functional Area**: Cart Management & Computations (`CART`)
- **Scenario Title**: Add multiple distinct products to cart and verify cart contents
- **Classification**: UI
- **Type**: Positive
- **Preconditions and Test Data**:
  - Products catalog with multiple available items.
- **Main Test Steps**:
  1. Navigate to `/products`.
  2. Hover over the first product and click 'Add to cart'.
  3. Click 'Continue Shopping' button in the confirmation modal.
  4. Hover over the second product and click 'Add to cart'.
  5. Click 'View Cart' in the modal.
- **Expected Result**:
  - Both items appear as separate rows in `/view_cart`.
  - Prices, quantities (1 each), and subtotal prices are accurately displayed.
- **Priority**: High
- **Automation Feasibility & Limitations**: Fully automatable.

---

#### TC-AE-CART-002
- **Assessment Reference**: AE-12
- **Functional Area**: Cart Management & Computations (`CART`)
- **Scenario Title**: Increase product quantity from product detail page and verify cart calculation
- **Classification**: UI
- **Type**: Positive
- **Preconditions and Test Data**:
  - Product ID: `1`, Desired Quantity: `4`.
- **Main Test Steps**:
  1. Navigate to `/product_details/1`.
  2. Locate quantity input, clear it, and type `4`.
  3. Click 'Add to cart' button.
  4. Click 'View Cart' modal link.
- **Expected Result**:
  - Cart page shows item quantity exactly as `4`.
  - Total price equals unit price $\times 4$.
- **Priority**: High
- **Automation Feasibility & Limitations**: Fully automatable.

---

#### TC-AE-CART-003
- **Assessment Reference**: AE-12
- **Functional Area**: Cart Management & Computations (`CART`)
- **Scenario Title**: Boundary test for product quantity input with zero and negative numbers
- **Classification**: UI
- **Type**: Edge
- **Preconditions and Test Data**:
  - Product detail page `/product_details/1`. Test input values: `0`, `-1`.
- **Main Test Steps**:
  1. Navigate to `/product_details/1`.
  2. Input quantity `0` and click 'Add to cart'.
  3. Inspect cart contents or client validation behavior.
  4. Return to product detail page, input quantity `-1`, and click 'Add to cart'.
- **Expected Result**:
  - Test observes and validates edge-case handling for non-positive quantities.
  - SUT must not generate corrupt cart states or negative balances (total $\ge 0$).
  - *Runtime Verification Required*: Determine observed SUT behavior—specifically whether the HTML5 input `min="1"` attribute blocks submission, the client-side script auto-corrects the value to `1`, the server drops 0-quantity items, or an error banner is produced. Assert the verified behavior deterministically.
- **Priority**: Medium
- **Automation Feasibility & Limitations**: Fully automatable. Edge-case behavior flagged for baseline observation on live application.

---

#### TC-AE-CART-004
- **Assessment Reference**: AE-13
- **Functional Area**: Cart Management & Computations (`CART`)
- **Scenario Title**: Remove a specific product from cart
- **Classification**: UI
- **Type**: Positive
- **Preconditions and Test Data**:
  - Two products added to cart.
- **Main Test Steps**:
  1. Navigate to `/view_cart` containing 2 products.
  2. Locate the 'X' (Delete) button for the first item and click it.
  3. Wait for item row to be removed from the DOM.
- **Expected Result**:
  - The clicked product is removed from the cart table.
  - The second product remains in the cart table with uncorrupted calculations.
- **Priority**: High
- **Automation Feasibility & Limitations**: Fully automatable. Auto-waiting on element detachment.

---

#### TC-AE-CART-005
- **Assessment Reference**: AE-13
- **Functional Area**: Cart Management & Computations (`CART`)
- **Scenario Title**: Remove all products from cart to reach empty cart state
- **Classification**: UI
- **Type**: Edge
- **Preconditions and Test Data**:
  - One product in cart.
- **Main Test Steps**:
  1. Navigate to `/view_cart` with 1 product.
  2. Click 'X' (Delete) button on the item.
- **Expected Result**:
  - Cart table is cleared.
  - Empty cart message 'Cart is empty! Click here to buy products.' is visibly displayed.
- **Priority**: Medium
- **Automation Feasibility & Limitations**: Fully automatable.

---

#### TC-AE-CART-006
- **Assessment Reference**: AE-14
- **Functional Area**: Cart Management & Computations (`CART`)
- **Scenario Title**: Cart persistence across guest session and post-login authentication
- **Classification**: UI
- **Type**: Positive
- **Preconditions and Test Data**:
  - Pre-registered user account created via `POST /api/createAccount`.
- **Main Test Steps**:
  1. As an unauthenticated guest, add a product to cart from `/products`.
  2. Navigate to `/view_cart` and verify product is present in guest cart.
  3. Click 'Signup / Login' in top navigation bar.
  4. Submit valid credentials for the pre-registered user.
  5. Navigate back to `/view_cart`.
- **Expected Result**:
  - Post-login cart state is evaluated.
  - *Runtime Verification Required*: Verify whether Automation Exercise merges the guest cart into the authenticated account cart, retains the guest items, or replaces the cart with pre-existing account cart data. Assert the confirmed persistence/merge pattern without assuming automatic server-side union.
  - Account cleaned up in teardown via `DELETE /api/deleteAccount`.
- **Priority**: High
- **Automation Feasibility & Limitations**: Fully automatable. Requires live verification of cart-merging logic.

---

#### TC-GEN-CART-001
- **Requirement Reference**: `REQ-AE-CART-002` (Gate 1 HITL Approved)
- **Functional Area**: Cart Management & Computations (`CART`)
- **Scenario Title**: Add Blue Top product to cart and verify cart item details
- **Classification**: UI
- **Type**: Positive / Smoke
- **Preconditions and Test Data**:
  - Browser opened at `/products`.
  - Fresh isolated browser context (empty cart guarantee).
  - Target Product: Blue Top (Product ID `1`, Unit Price `Rs. 500`).
- **Main Test Steps**:
  1. Navigate to `/products`.
  2. Locate Blue Top product card in catalog and hover over it.
  3. Click overlay 'Add to cart' button (`.productinfo a[data-product-id="1"]`).
  4. Verify modal dialog appears with title 'Added!' and message 'Your product has been added to cart.'.
  5. Click 'View Cart' link in modal (`/view_cart`).
  6. Assert cart table contains exactly 1 item row.
  7. Assert product description is 'Blue Top', unit price is 'Rs. 500', quantity is '1', and total is 'Rs. 500'.
- **Expected Result**:
  - Item is added successfully with modal confirmation.
  - Cart table renders accurate metadata matching catalog values.
- **Priority**: High
- **Automation Feasibility & Limitations**: Fully automated in `tests/generated/generated_req_ae_cart_blue_top.spec.ts`. Verified live in 8.1s.

---

#### TC-GEN-CART-002
- **Requirement Reference**: `REQ-AE-CART-002` (Gate 1 HITL Approved)
- **Functional Area**: Cart Management & Computations (`CART`)
- **Scenario Title**: Add Blue Top and continue shopping, verifying item is retained in cart
- **Classification**: UI
- **Type**: Positive / Navigation
- **Preconditions and Test Data**:
  - Browser opened at `/products`.
  - Fresh isolated browser context (empty cart guarantee).
  - Target Product: Blue Top (Product ID `1`, Unit Price `Rs. 500`).
- **Main Test Steps**:
  1. Navigate to `/products`.
  2. Hover over Blue Top and click 'Add to cart'.
  3. Verify modal appears with 'Added!' confirmation.
  4. Click 'Continue Shopping' button to dismiss modal.
  5. Verify modal is completely hidden and user remains on catalog.
  6. Navigate to cart via header navigation 'Cart' link.
  7. Assert cart table contains Blue Top with quantity '1' and total 'Rs. 500'.
- **Expected Result**:
  - Modal dismisses cleanly without navigation error.
  - Session cart retains item across internal page navigation.
- **Priority**: Medium
- **Automation Feasibility & Limitations**: Fully automated in `tests/generated/generated_req_ae_cart_blue_top.spec.ts`. Verified live in 5.3s.

---

#### TC-GEN-CART-003
- **Requirement Reference**: `REQ-AE-CART-002` (Gate 1 HITL Approved)
- **Functional Area**: Cart Management & Computations (`CART`)
- **Scenario Title**: Adding Blue Top multiple times increments quantity in cart
- **Classification**: UI
- **Type**: Edge / State Transition
- **Preconditions and Test Data**:
  - Browser opened at `/products`.
  - Fresh isolated browser context (empty cart guarantee).
  - Target Product: Blue Top (Product ID `1`, Unit Price `Rs. 500`).
- **Main Test Steps**:
  1. Navigate to `/products`.
  2. Hover over Blue Top and click 'Add to cart'.
  3. Click 'Continue Shopping' on modal.
  4. Click 'Add to cart' on Blue Top a second time.
  5. Click 'View Cart' link in modal.
  6. Assert cart table contains exactly 1 unique item row (no duplicate rows created).
  7. Assert item quantity button displays '2'.
  8. Assert total price is calculated as 'Rs. 1000' (Unit Price Rs. 500 x 2).
- **Expected Result**:
  - Re-adding identical item increments quantity counter rather than appending redundant rows.
  - Total price automatically recalculates correctly.
- **Priority**: Medium
- **Automation Feasibility & Limitations**: Fully automated in `tests/generated/generated_req_ae_cart_blue_top.spec.ts`. Verified live in 7.0s.

---

### Area 4: Checkout, Order Processing & Invoicing (`CHECK`)

#### TC-AE-CHECK-001
- **Assessment Reference**: AE-15
- **Functional Area**: Checkout, Order Processing & Invoicing (`CHECK`)
- **Scenario Title**: Complete end-to-end checkout and payment flow
- **Classification**: UI
- **Type**: Positive
- **Preconditions and Test Data**:
  - Authenticated user account with configured address details (provisioned dynamically via `POST /api/createAccount`).
  - Simulated payment data for the 5 practice payment form inputs:
    1. Name on Card (`input[name="name_on_card"]`): `Test Cardholder`
    2. Card Number (`input[name="card_number"]`): `411111111111` (Practice sandbox accepts arbitrary numerical strings; real Luhn algorithm/CVV banking checks are not enforced)
    3. CVC (`input[name="cvc"]`): `311`
    4. Expiration Month (`input[name="expiry_month"]`): `12`
    5. Expiration Year (`input[name="expiry_year"]`): `2028`
- **Main Test Steps**:
  1. Log in with registered user credentials.
  2. Add product to cart and navigate to `/view_cart`.
  3. Click 'Proceed To Checkout'.
  4. In `/checkout`, verify Delivery and Billing address sections are present.
  5. Enter order comment: `Please deliver during business hours`.
  6. Click 'Place Order'.
  7. In `/payment`, fill out all 5 required payment fields: Name on Card, Card Number, CVC, Expiration Month, and Expiration Year.
  8. Click 'Pay and Confirm Order'.
  9. Clean up user account via `DELETE /api/deleteAccount` in teardown.
- **Expected Result**:
  - Payment is processed without network exceptions.
  - Success messages 'ORDER PLACED!' and 'Congratulations! Your order has been confirmed!' are displayed.
  - Page URL transitions to `/payment_done/<id>`.
- **Priority**: High
- **Automation Feasibility & Limitations**: Fully automatable. The practice payment gateway accepts simulated test data without external PCI/banking dependencies.

---

#### TC-AE-CHECK-002
- **Assessment Reference**: AE-16
- **Functional Area**: Checkout, Order Processing & Invoicing (`CHECK`)
- **Scenario Title**: Verify address details consistency between profile and checkout page
- **Classification**: UI
- **Type**: Positive
- **Preconditions and Test Data**:
  - User registered with specific address attributes: Street: `742 Evergreen Terrace`, City: `Springfield`, State: `Oregon`, Postcode: `97477`.
- **Main Test Steps**:
  1. Log in with the registered user.
  2. Add item to cart and proceed to `/checkout`.
  3. Extract delivery address text and billing address text rendered on page.
- **Expected Result**:
  - Delivery address text exactly matches the registered user's address.
  - Billing address text exactly matches the registered user's address.
- **Priority**: High
- **Automation Feasibility & Limitations**: Fully automatable.

---

#### TC-AE-CHECK-003
- **Assessment Reference**: AE-17
- **Functional Area**: Checkout, Order Processing & Invoicing (`CHECK`)
- **Scenario Title**: Download invoice after successful order placement
- **Classification**: UI
- **Type**: Positive
- **Preconditions and Test Data**:
  - Completed order flow reaching order confirmation page.
- **Main Test Steps**:
  1. Complete checkout and payment flow (reaching order confirmation page).
  2. Click 'Download Invoice' button.
  3. Await Playwright browser download event.
- **Expected Result**:
  - Download event triggers successfully; downloaded file name contains `invoice` or has `.txt` / `.pdf` extension with non-zero byte size.
- **Priority**: Medium
- **Automation Feasibility & Limitations**: Fully automatable using Playwright's `page.waitForEvent('download')`.

---

### Area 5: Customer Engagement & Inquiries (`ENG`)

#### TC-AE-ENG-001
- **Assessment Reference**: AE-18
- **Functional Area**: Customer Engagement & Inquiries (`ENG`)
- **Scenario Title**: Submit a product review with valid details
- **Classification**: UI
- **Type**: Positive
- **Preconditions and Test Data**:
  - Product details page `/product_details/1`.
  - Review data: Name: `Reviewer One`, Email: `reviewer@example.com`, Review: `Great quality product, fits as expected!`.
- **Main Test Steps**:
  1. Navigate to `/product_details/1`.
  2. Scroll to 'Write Your Review' section.
  3. Enter Name, Email, and Review text.
  4. Click 'Submit' button.
- **Expected Result**:
  - Success alert 'Thank you for your review.' is visible.
- **Priority**: Medium
- **Automation Feasibility & Limitations**: Fully automatable.

---

#### TC-AE-ENG-002
- **Assessment Reference**: AE-19
- **Functional Area**: Customer Engagement & Inquiries (`ENG`)
- **Scenario Title**: Submit Contact Us form with file upload
- **Classification**: UI
- **Type**: Positive
- **Preconditions and Test Data**:
  - Contact page `/contact_us`.
  - Sample test file: `sample_attachment.txt`.
- **Main Test Steps**:
  1. Navigate to `/contact_us`.
  2. Verify 'GET IN TOUCH' heading is visible.
  3. Enter Name, Email, Subject, and Message.
  4. Upload `sample_attachment.txt` using the file input (`input[name="upload_file"]`).
  5. Click 'Submit' button and handle browser confirm alert (`page.on('dialog', dialog => dialog.accept())`).
- **Expected Result**:
  - Success message 'Success! Your details have been submitted successfully.' is displayed.
- **Priority**: High
- **Automation Feasibility & Limitations**: Fully automatable. Playwright handles dialog listeners and file input `setInputFiles`.

---

#### TC-AE-ENG-003
- **Assessment Reference**: AE-19
- **Functional Area**: Customer Engagement & Inquiries (`ENG`)
- **Scenario Title**: Attempt Contact Us form submission with missing required fields
- **Classification**: UI
- **Type**: Negative
- **Preconditions and Test Data**:
  - Contact page `/contact_us`.
- **Main Test Steps**:
  1. Navigate to `/contact_us`.
  2. Leave Name and Email empty.
  3. Enter Message: `Testing validation`.
  4. Click 'Submit' button.
- **Expected Result**:
  - HTML5 client-side validation triggers (`:invalid` state) or form submission is blocked.
  - User is not presented with the submission success message.
- **Priority**: Medium
- **Automation Feasibility & Limitations**: Fully automatable.

---

#### TC-AE-ENG-004
- **Assessment Reference**: AE-20
- **Functional Area**: Customer Engagement & Inquiries (`ENG`)
- **Scenario Title**: Verify newsletter subscription in footer with valid email
- **Classification**: UI
- **Type**: Positive
- **Preconditions and Test Data**:
  - Email: `subscriber_<timestamp>@example.com`.
- **Main Test Steps**:
  1. Navigate to homepage `/`.
  2. Scroll down to footer section 'SUBSCRIPTION'.
  3. Enter valid email in subscription input.
  4. Click the arrow/subscribe button.
- **Expected Result**:
  - Success message 'You have been successfully subscribed!' is visibly displayed.
- **Priority**: Medium
- **Automation Feasibility & Limitations**: Fully automatable.

---

#### TC-AE-ENG-005
- **Assessment Reference**: AE-20
- **Functional Area**: Customer Engagement & Inquiries (`ENG`)
- **Scenario Title**: Attempt newsletter subscription with malformed email
- **Classification**: UI
- **Type**: Negative
- **Preconditions and Test Data**:
  - Malformed email: `not-an-email-address`.
- **Main Test Steps**:
  1. Navigate to homepage `/`.
  2. Scroll to footer 'SUBSCRIPTION'.
  3. Enter `not-an-email-address` into input and click subscribe.
- **Expected Result**:
  - Input field triggers HTML5 browser email validation error; submission does not succeed.
- **Priority**: Low
- **Automation Feasibility & Limitations**: Fully automatable.

---

### Area 6: Backend REST APIs (`API`)

#### TC-AE-API-001
- **Assessment Reference**: AE-05
- **Functional Area**: Backend REST APIs (`API`)
- **Scenario Title**: Verify Login API with valid user credentials
- **Classification**: API
- **Type**: Positive
- **Preconditions and Test Data**:
  - Endpoint: `POST /api/verifyLogin`.
  - Pre-test setup: Dynamically create user via `POST /api/createAccount` with `email`: `valid_api_<timestamp>@example.com`, `password`: `Password123!`.
  - Post-test teardown: Invoke `DELETE /api/deleteAccount` to clean up credentials.
- **Main Test Steps**:
  1. Send `POST` request to `https://automationexercise.com/api/verifyLogin` with valid form-data (`email`, `password`).
  2. Parse JSON response body.
- **Expected Result & Assertions**:
  - **Check 1 (HTTP Status)**: HTTP transport status code is `200 OK`.
  - **Check 2 (JSON Response Code)**: JSON body contains property `"responseCode": 200`.
  - **Check 3 (Message Assertion)**: JSON body contains `"message": "User exists!"` (Runtime verification required to confirm exact string casing).
- **Priority**: High
- **Automation Feasibility & Limitations**: Fully automatable via Playwright `request.post`. Dynamic user provisioning guarantees repeatability.

---

#### TC-AE-API-002
- **Assessment Reference**: AE-05
- **Functional Area**: Backend REST APIs (`API`)
- **Scenario Title**: Verify Login API negative responses for invalid credentials and missing parameters
- **Classification**: API
- **Type**: Negative
- **Preconditions and Test Data**:
  - Endpoint: `POST /api/verifyLogin`.
  - Case A: Unregistered credentials `nonexistent_<timestamp>@example.com` / `WrongPassword!`.
  - Case B: Missing `email` form-data parameter (sending `password` only).
- **Main Test Steps**:
  1. Send `POST` request with invalid credentials.
  2. Parse and assert response A.
  3. Send `POST` request with missing `email` parameter.
  4. Parse and assert response B.
- **Expected Result & Assertions**:
  - **Check 4 (Invalid Credentials)**: HTTP status is `200` (transport); JSON body contains `"responseCode": 404` and `"message": "User not found!"` (Runtime verification required: confirm whether transport status is 200 or 404).
  - **Check 5 (Missing Parameter)**: HTTP status is `200` (transport); JSON body contains `"responseCode": 400` and `"message": "Bad request, email or password parameter is missing in POST request."`.
- **Priority**: High
- **Automation Feasibility & Limitations**: Fully automatable. Distinguishing HTTP status from JSON `responseCode` is essential for Automation Exercise APIs.

---

#### TC-AE-API-003
- **Assessment Reference**: AE-06
- **Functional Area**: Backend REST APIs (`API`)
- **Scenario Title**: Get all products list and validate schema and attributes
- **Classification**: API
- **Type**: Positive
- **Preconditions and Test Data**:
  - Endpoint: `GET /api/productsList`.
- **Main Test Steps**:
  1. Send `GET` request to `https://automationexercise.com/api/productsList`.
  2. Parse JSON response body.
- **Expected Result & Assertions**:
  - **Check 6 (HTTP Status)**: HTTP transport status code is `200 OK`.
  - **Check 7 (JSON Response Code)**: JSON body contains `"responseCode": 200`.
  - **Check 8 (Array Non-Empty)**: Parsed `products` property is an array with `length > 0`.
  - **Check 9 (Schema Validation)**: Product objects possess required properties: `id` (number), `name` (string), `price` (string), `brand` (string), and `category` (object with `usertype` and `category` fields).
- **Priority**: High
- **Automation Feasibility & Limitations**: Fully automatable.

---

#### TC-AE-API-004
- **Assessment Reference**: AE-07
- **Functional Area**: Backend REST APIs (`API`)
- **Scenario Title**: Search product via API with query parameter
- **Classification**: API
- **Type**: Positive
- **Preconditions and Test Data**:
  - Endpoint: `POST /api/searchProduct`. Form-data: `search_product`: `tshirt`.
- **Main Test Steps**:
  1. Send `POST` request to `https://automationexercise.com/api/searchProduct` with form-data parameter `search_product="tshirt"`.
  2. Parse JSON response body.
- **Expected Result & Assertions**:
  - **Check 10 (HTTP Status)**: HTTP transport status code is `200 OK`.
  - **Check 11 (JSON Response Code)**: JSON body contains `"responseCode": 200`.
  - **Check 12 (Relevance Assertion)**: `products` array contains at least 1 item matching the search domain.
- **Priority**: High
- **Automation Feasibility & Limitations**: Fully automatable.

---

#### TC-AE-API-005
- **Assessment Reference**: AE-22
- **Functional Area**: Backend REST APIs (`API`)
- **Scenario Title**: User Account API full CRUD lifecycle (Create, Read, Update, Delete)
- **Classification**: API
- **Type**: Positive
- **Preconditions and Test Data**:
  - Dynamic user credentials generated at runtime:
    - Email: `crud_user_<timestamp>@example.com`, Password: `Password123!`, Name: `CRUD Tester`.
    - Profile attributes: `title`: `Mr`, `birth_date`: `10`, `birth_month`: `05`, `birth_year`: `1990`, `firstname`: `CRUD`, `lastname`: `Tester`, `company`: `QA Inc`, `address1`: `100 Test Blvd`, `country`: `United States`, `zipcode`: `10001`, `state`: `NY`, `city`: `New York`, `mobile_number`: `1234567890`.
- **Main Test Steps**:
  1. **Create (C)**: Send `POST /api/createAccount` with full registration form-data.
  2. **Read (R)**: Send `GET /api/getUserDetailByEmail?email=<email>` and verify profile attributes.
  3. **Update (U)**: Send `PUT /api/updateAccount` with modified `company="Updated QA Corp"` and `city="Buffalo"`.
  4. **Delete (D)**: Send `DELETE /api/deleteAccount` with `email` and `password` to complete cleanup.
- **Expected Result & Assertions**:
  - **Check 13 (Create)**: HTTP status is 200; JSON contains `"responseCode": 201` and `"message": "User created!"`.
  - **Check 14 (Read)**: HTTP status is 200; JSON contains `"responseCode": 200` and `user.email` equals the generated email.
  - **Check 15 (Update)**: HTTP status is 200; JSON contains `"responseCode": 200` and `"message": "User updated!"`.
  - **Check 16 (Delete)**: HTTP status is 200; JSON contains `"responseCode": 200` and `"message": "Account deleted!"`.
- **Priority**: High
- **Automation Feasibility & Limitations**: Fully automatable. Enforces atomic CRUD lifecycle and guarantees zero lingering test artifacts.

---

#### TC-AE-API-006
- **Assessment Reference**: AE-23
- **Functional Area**: Backend REST APIs (`API`)
- **Scenario Title**: Validate API HTTP method constraints and bad request handling
- **Classification**: API
- **Type**: Negative
- **Preconditions and Test Data**:
  - Target endpoints: `/api/productsList`, `/api/brandsList`, `/api/verifyLogin`, `/api/searchProduct`.
- **Main Test Steps**:
  1. Send `POST` to `/api/productsList` (disallowed method; GET-only endpoint).
  2. Send `PUT` to `/api/brandsList` (disallowed method; GET-only endpoint).
  3. Send `DELETE` to `/api/verifyLogin` (disallowed method; POST-only endpoint).
  4. Send `POST` to `/api/searchProduct` without mandatory `search_product` parameter.
- **Expected Result & Assertions**:
  - **Check 17 (Disallowed Method 1)**: `POST /api/productsList` returns HTTP 200 (transport) and JSON `"responseCode": 405` with `"message": "This request method is not supported."` (Runtime verification required to confirm transport status vs JSON code).
  - **Check 18 (Disallowed Method 2)**: `PUT /api/brandsList` returns HTTP 200 (transport) and JSON `"responseCode": 405` with `"message": "This request method is not supported."`.
  - **Check 19 (Disallowed Method 3)**: `DELETE /api/verifyLogin` returns HTTP 200 (transport) and JSON `"responseCode": 405` with `"message": "This request method is not supported."`.
  - **Check 20 (Missing Search Param)**: `POST /api/searchProduct` without parameter returns HTTP 200 (transport) and JSON `"responseCode": 400` with `"message": "Bad request, search_product parameter is missing in POST request."`.
- **Priority**: High
- **Automation Feasibility & Limitations**: Fully automatable. Accurately tests negative HTTP method routing.

---

### Area 7: Hybrid UI/API Integration & Consistency (`INT`)

#### TC-AE-INT-001
- **Assessment Reference**: AE-24
- **Functional Area**: Hybrid UI/API Integration & Consistency (`INT`)
- **Scenario Title**: Cross-validate product catalog details between API and UI
- **Classification**: Integration
- **Type**: Positive
- **Preconditions and Test Data**:
  - Endpoint: `GET /api/productsList`. Web page: `/products`.
- **Main Test Steps**:
  1. Call `GET /api/productsList` via Playwright `request` context and extract product items array.
  2. Navigate to `https://automationexercise.com/products` via Playwright `page`.
  3. Extract visible product cards on the rendered catalog page.
  4. Sample the first 5 visible UI products (ID, name, and price) and match them against the API response payload.
- **Expected Result**:
  - Cross-layer consistency is verified: sampled UI products strictly correspond to entities returned by the backend API.
  - Test does not assume flat count equivalence (accounting for UI pagination limits, lazy loading, promotional banners, or category layout differences).
  - Product names and prices match without data distortion.
- **Priority**: High
- **Automation Feasibility & Limitations**: Fully automatable. Sampling and subset matching avoids false negatives caused by UI pagination or layout structures.

---

#### TC-AE-INT-002
- **Assessment Reference**: AE-24 & AE-22
- **Functional Area**: Hybrid UI/API Integration & Consistency (`INT`)
- **Scenario Title**: Seed user account via API, verify UI authentication, and teardown via API
- **Classification**: Integration
- **Type**: Positive
- **Preconditions and Test Data**:
  - Unique test credentials generated at runtime.
- **Main Test Steps**:
  1. Pre-test setup: Provision user account via `POST /api/createAccount`.
  2. Navigate to UI login page `/login`.
  3. Log in using the API-provisioned credentials.
  4. Assert user is authenticated on the UI ('Logged in as <Name>' visible).
  5. Post-test teardown: Delete user account via `DELETE /api/deleteAccount`.
  6. Refresh page and verify session is terminated or account is gone.
- **Expected Result**:
  - Backend-created user seamlessly authenticates in UI.
  - Teardown via API immediately removes user without lingering dirty data.
- **Priority**: High
- **Automation Feasibility & Limitations**: Fully automatable. Exemplifies fast test state setup/teardown.

---

#### TC-AE-INT-003
- **Assessment Reference**: AE-14 & AE-22
- **Functional Area**: Hybrid UI/API Integration & Consistency (`INT`)
- **Scenario Title**: API-provisioned user cart persistence across browser contexts
- **Classification**: Integration
- **Type**: Positive
- **Preconditions and Test Data**:
  - User created via API `POST /api/createAccount`.
- **Main Test Steps**:
  1. Log in on UI, add 2 products to cart.
  2. Capture browser storage state (cookies and local storage) using `context.storageState()`.
  3. Close page and browser context.
  4. Open a brand-new isolated browser context initialized with the saved `storageState`.
  5. Navigate to `/view_cart`.
  6. Teardown user via `DELETE /api/deleteAccount`.
- **Expected Result**:
  - Authenticated session is preserved across isolated contexts via storage state.
  - *Runtime Verification Required*: Verify whether Automation Exercise persists cart items server-side against the user account or in client-side cookies/session storage across new browser context instances.
  - Dynamic user account is cleanly deleted in teardown.
- **Priority**: High
- **Automation Feasibility & Limitations**: Fully automatable via Playwright `storageState`. Evaluates real multi-session persistence mechanics.

---

## 4. Coverage Summary & Traceability

### Metrics Overview

| Metric | Target Requirement | Catalogue Value | Status |
| :--- | :--- | :--- | :--- |
| **Total UI Scenarios** | At least 18 | **25** | Exceeds Requirement |
| **Negative / Edge UI Scenarios** | At least 6 | **8** | Exceeds Requirement |
| **API Checks / Assertions** | At least 8 | **20** | Exceeds Requirement |
| **Integration Scenarios** | Relevant checks included | **3** | Satisfied |
| **Functional Areas Covered** | At least 6 | **7** | Exceeds Requirement |

---

### Detailed Negative & Edge UI Scenarios Breakdown (8 Scenarios)
1. **TC-AE-AUTH-003**: Invalid email/password login error handling.
2. **TC-AE-AUTH-004**: Duplicate email registration rejection.
3. **TC-AE-PROD-003**: Non-existent keyword search yielding zero products.
4. **TC-AE-PROD-004**: Empty or whitespace search query submission handling.
5. **TC-AE-CART-003**: Zero and negative quantity boundary validation.
6. **TC-AE-CART-005**: Complete cart item removal reaching empty cart state.
7. **TC-AE-ENG-003**: Contact Us submission with missing mandatory fields.
8. **TC-AE-ENG-005**: Newsletter subscription with malformed email address.

---

### Mapping to Assessment Scenarios AE-01 through AE-24

| Ref ID | Assessment Scenario Title | Assigned Test Scenario ID(s) | Classification |
| :--- | :--- | :--- | :--- |
| **AE-01** | Account registration | `TC-AE-AUTH-001` | UI (Positive) |
| **AE-02** | Valid login/logout | `TC-AE-AUTH-002` | UI (Positive) |
| **AE-03** | Invalid login | `TC-AE-AUTH-003` | UI (Negative) |
| **AE-04** | Duplicate registration | `TC-AE-AUTH-004` | UI (Negative) |
| **AE-05** | Login API | `TC-AE-API-001`, `TC-AE-API-002` | API (Positive & Negative) |
| **AE-06** | Product catalogue | `TC-AE-PROD-001`, `TC-AE-API-003` | UI & API (Positive) |
| **AE-07** | Search relevance | `TC-AE-PROD-002`, `TC-AE-API-004` | UI & API (Positive) |
| **AE-08** | Empty/invalid search | `TC-AE-PROD-003`, `TC-AE-PROD-004` | UI (Negative & Edge) |
| **AE-09** | Category filtering | `TC-AE-PROD-005` | UI (Positive) |
| **AE-10** | Brand filtering | `TC-AE-PROD-006` | UI (Positive) |
| **AE-11** | Add multiple products | `TC-AE-CART-001` | UI (Positive) |
| **AE-12** | Quantity calculation | `TC-AE-CART-002`, `TC-AE-CART-003` | UI (Positive & Edge) |
| **AE-13** | Remove product | `TC-AE-CART-004`, `TC-AE-CART-005` | UI (Positive & Edge) |
| **AE-14** | Cart persistence after login | `TC-AE-CART-006`, `TC-AE-INT-003` | UI & Integration (Positive) |
| **AE-15** | End-to-end order | `TC-AE-CHECK-001` | UI (Positive) |
| **AE-16** | Address consistency | `TC-AE-CHECK-002` | UI (Positive) |
| **AE-17** | Invoice download | `TC-AE-CHECK-003` | UI (Positive) |
| **AE-18** | Product review | `TC-AE-ENG-001` | UI (Positive) |
| **AE-19** | Contact form/upload | `TC-AE-ENG-002`, `TC-AE-ENG-003` | UI (Positive & Negative) |
| **AE-20** | Subscriptions | `TC-AE-ENG-004`, `TC-AE-ENG-005` | UI (Positive & Negative) |
| **AE-21** | Recommended items | `TC-AE-PROD-007` | UI (Positive) |
| **AE-22** | Account API CRUD | `TC-AE-API-005`, `TC-AE-INT-002` | API & Integration (Positive) |
| **AE-23** | API method validation | `TC-AE-API-006` | API (Negative) |
| **AE-24** | UI/API consistency | `TC-AE-INT-001`, `TC-AE-INT-002` | Integration (Positive) |

*All 24 assessment scenarios (AE-01 through AE-24) are fully mapped and accounted for.*

---

## 5. Assumptions, Constraints & Unresolved Verification Items

### Targeted Ad-Blocking Strategy (Avoiding Broad Wildcards)
- `automationexercise.com` serves third-party advertisements via Google AdSense and DoubleClick.
- **Rule**: Avoid broad wildcards like `*google*` that could unintentionally block Google Fonts, shared stylesheets, or essential frontend scripts.
- **Recommended Practice**: Use narrow, regex-targeted routing to abort solely ad and analytics network calls:
  ```typescript
  await page.route(/(googlesyndication|doubleclick|google-analytics|adservice)/, route => route.abort());
  ```
  Complement this with CSS injection to hide floating ad overlays (`iframe[id^="aswift_"]`, `.adsbygoogle`) to prevent actionability click intercepts.

### Test Data Cleanliness & Idempotency
- All user registration and login tests generate dynamic runtime identifiers (`user_${Date.now()}@example.com`).
- Tests that provision accounts via API or UI must explicitly register post-test teardown via `DELETE /api/deleteAccount` to guarantee zero state contamination across runs.

### Payment Gateway Practice Sandbox
- The `/payment` route simulates order transactions without connecting to actual financial networks. The 5 required fields (Name on Card, Card Number, CVC, Expiration Month, Expiration Year) will be filled with standard dummy test strings.

### Unresolved Runtime Verification Items
The following items are explicitly marked for empirical observation during the initial authoring and execution phase:
1. **Zero-Result Search DOM Representation (`TC-AE-PROD-003`)**: Confirm whether the SUT renders a specific empty banner or leaves the `.features_items` container with 0 child elements.
2. **Quantity Input Constraints (`TC-AE-CART-003`)**: Confirm whether the SUT enforces `min="1"` via HTML5 attributes, auto-corrects non-positive quantities on blur/submit, or drops 0-quantity items upon cart recalculation.
3. **Guest-to-Authenticated Cart Merging (`TC-AE-CART-006`)**: Observe whether items added as a guest are merged into or overwritten by the user account cart upon logging in.
4. **Transport HTTP Status vs. JSON `responseCode` (`TC-AE-API-001` through `006`)**: Confirm whether error scenarios (404 User Not Found, 405 Method Not Supported, 400 Bad Request) return HTTP 200 at the transport layer with custom JSON error envelopes or native HTTP 4xx status codes.
5. **Cross-Context Cart Storage Persistence (`TC-AE-INT-003`)**: Confirm whether user cart items persist server-side across new browser contexts initialized with authenticated `storageState`.
