# Requirements & Defect Traceability Matrix

## 1. Overview
Bidirectional traceability guarantees that every automated test in this repository traces back to a verified business requirement of [Automation Exercise](https://automationexercise.com), and every defect or repair traces back to a specific failed test execution.

---

## 2. Bidirectional Traceability Flow

```
[Requirement (REQ-AE-xxx)]
            │
            ▼
[Test Scenario (TC-AE-xxx)]  <── Designed by Test Design Agent (Gate 1)
            │
            ▼
[Automated Spec & Page Object] <── Authored by Automation Authoring Agent (Gate 2)
            │
            ▼
[Execution Run & Trace]       <── Dispatched by Execution Orchestrator
            │
            ▼
[RCA Diagnosis (8 Categories)] <── Diagnosed by RCA Agent / Fallback Engine
            │
            ▼
[Defect Ticket or Repair Diff] <── Drafted by Repair Proposal Agent (Gate 3)
            │
            ▼
[Executive Quality Report]    <── Compiled by Quality Reporting Agent
```

---

## 3. Automation Exercise Feature Domain Mapping

| Requirement ID | Module / Feature Area | Target Spec File | Target Page Object |
| :--- | :--- | :--- | :--- |
| `REQ-AE-AUTH` | User Registration, Login, Logout & Account Deletion | `tests/ui/auth.spec.ts` | `src/pages/AuthPage.ts` |
| `REQ-AE-PROD` | Product Catalog, Category Navigation & Search | `tests/ui/products.spec.ts` | `src/pages/ProductsPage.ts` |
| `REQ-AE-CART` | Add to Cart, Quantity Management, Cart View | `tests/ui/cart.spec.ts` | `src/pages/CartPage.ts` |
| `REQ-AE-CHECK`| Checkout Flow, Address Verification & Payment | `tests/ui/checkout.spec.ts` | `src/pages/CheckoutPage.ts` |
| `REQ-AE-CONT` | Contact Us Form with File Upload | `tests/ui/contact.spec.ts` | `src/pages/ContactPage.ts` |
| `REQ-AE-API`  | REST API Endpoints (`/api/productsList`, `/api/verifyLogin`, etc.) | `tests/api/api.spec.ts` | `src/api/accountApi.ts`, `src/api/productsApi.ts` |

---

## 4. Test Case Tagging Standards
Every Playwright test specification must embed metadata annotations for traceability:

```typescript
test('TC-AE-AUTH-001: Register user with valid credentials', {
  tag: ['@auth', '@smoke', '@REQ-AE-AUTH'],
}, async ({ authPage }) => {
  // Test implementation
});
```

---

## 5. Traceability Auditing Protocol
The **Quality Reporting Agent** parses these tags from test results to produce coverage matrices, ensuring zero orphaned tests (tests without requirements) and zero untested requirements.
