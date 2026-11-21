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

---

## 6. Pipeline Traceability Matrix: REQ-AE-CART-002

| Requirement ID | Scenario ID | Scenario Title & Verification Objective | Spec Implementation | Reused Page Objects | Gate 1 & 2 Status | Execution Status (`PIPE-BLUE-TOP-20261121`) | Visual Evidence Artifact |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| `REQ-AE-CART-002` | `TC-GEN-CART-001` | Add Blue Top product to cart and verify cart item details (Price Rs. 500, Qty 1, Total Rs. 500) | `tests/generated/generated_req_ae_cart_blue_top.spec.ts` | `BasePage`, `ProductPage`, `CartPage` | Approved | 🟢 PASSED (8.1s) | `reports/screenshots/1_catalog_blue_top.png`<br>`reports/screenshots/2_added_modal.png`<br>`reports/screenshots/3_cart_verified.png` |
| `REQ-AE-CART-002` | `TC-GEN-CART-002` | Add Blue Top and continue shopping, verifying item is retained in cart upon subsequent navigation | `tests/generated/generated_req_ae_cart_blue_top.spec.ts` | `BasePage`, `ProductPage`, `CartPage` | Approved | 🟢 PASSED (5.3s) | `reports/screenshots/4_continue_shopping_cart.png` |
| `REQ-AE-CART-002` | `TC-GEN-CART-003` | Adding Blue Top multiple times increments quantity in cart without duplicate rows (Qty 2, Total Rs. 1000) | `tests/generated/generated_req_ae_cart_blue_top.spec.ts` | `BasePage`, `ProductPage`, `CartPage` | Approved | 🟢 PASSED (7.0s) | `reports/screenshots/5_quantity_incremented_cart.png` |

### Audit & Governance Records
- **Pipeline Identifier**: `PIPE-BLUE-TOP-20261121`
- **Execution Run ID**: `EXEC-BLUE-TOP-20261121-100810`
- **Design Artifact**: `reports/scenarios/REQ-AE-CART-002-scenarios.json`
- **Pipeline Report**: `reports/pipeline/PIPE-BLUE-TOP-20261121-REQ-AE-CART-002-report.md` / `.json`
- **Quality Summary**: `reports/quality-summary.md` and `reports/quality/quality-summary-PIPE-BLUE-TOP-20261121.md` / `.json`
- **Release Recommendation**: `CONDITIONAL_GO` (100% current run pass rate, gate sign-off `PENDING` human Lead QE authorization due to longitudinal API failure hotspots)

