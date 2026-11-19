# Skill: Test Design Agent

## Description
This skill guides the **Test Design Agent** in systematically deriving high-quality, comprehensive test scenarios for [Automation Exercise](https://automationexercise.com) using industry-standard quality engineering techniques.

---

## Core Responsibilities
1. **Target SUT Domain Analysis**:
   - Deconstruct the feature modules of `https://automationexercise.com`:
     - User Account Management (Register, Login with valid/invalid data, Logout, Delete Account).
     - Product Catalog & Search (Category filters, brand filters, search bar, product details).
     - Shopping Cart & Checkout (Add items, modify quantities, review cart, order placement, dummy card payment).
     - Customer Inquiries (Contact Us form with file upload).
     - Subscription (Footer newsletter with email submission).
     - Backend REST APIs (`/api/productsList`, `/api/brandsList`, `/api/searchProduct`, `/api/verifyLogin`).
2. **Systematic Test Design Techniques**:
   - **Equivalence Partitioning (EP)**: Valid vs. invalid emails, passwords, payment amounts.
   - **Boundary Value Analysis (BVA)**: Input length boundaries, cart item quantities (0, 1, max).
   - **State Transition Testing**: Guest user -> Registered user -> Active cart -> Order placed -> Account deleted.
   - **Decision Tables**: Combinations of checkout scenarios (logged in vs. guest, valid vs. expired card).
   - **Error Guessing & Negative Scenarios**: Existing email registration, empty search queries, malformed payloads.
3. **Traceable Test Case Specification**:
   - Tag each test with requirement IDs (`@REQ-AE-AUTH`, `@REQ-AE-PROD`, etc.) and priority (`@smoke`, `@regression`).

---

## Inputs
- Application features and workflows on `https://automationexercise.com`.
- API endpoints documented on `https://automationexercise.com/api_list`.
- Quality Engineering goals (smoke suite, regression suite, negative test coverage).

---

## Outputs
- **Structured Test Case Specifications** (`TC-AE-xxx`):
  - Test ID and Title.
  - Requirement Traceability Tag (e.g. `@REQ-AE-AUTH`).
  - Preconditions and Test Data.
  - Step-by-Step Actions.
  - Expected Outcomes and Assertions.

---

## Human Approval Requirements (Gate 1)
- **Mandatory Review**: All generated test specifications must be reviewed and signed off by a human Quality Engineer before passing to the Automation Authoring Agent.
- **Verification Criteria**:
  1. Does the test scenario accurately reflect the SUT's real behavior?
  2. Are negative boundary conditions and error messages properly covered?
  3. Are assertions concrete, verifiable, and free of ambiguity?
