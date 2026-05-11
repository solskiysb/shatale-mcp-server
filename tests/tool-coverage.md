# MCP Tool Test Coverage Matrix

Last updated: 2026-05-11

| # | Tool | Happy Path | Validation | Contract | Security | File |
|---|------|:---:|:---:|:---:|:---:|------|
| 1 | `explain_shatale` | ✅ | - | ✅ | - | guest-mode, happy-path, contract |
| 2 | `simulate_purchase_flow` | ✅ | - | - | ✅ | guest-mode, security |
| 3 | `generate_policy_template` | ✅ | - | - | - | guest-mode |
| 4 | `list_capabilities` | ✅ | - | ✅ | - | guest-mode, sandbox-tools, contract |
| 5 | `list_mcc_codes` | ✅ | - | ✅ | - | happy-path, contract |
| 6 | `search_merchants` | ✅ | - | ✅ | - | sandbox-tools, contract |
| 7 | `get_merchant_details` | ✅ | - | - | - | happy-path |
| 8 | `request_purchase` | ✅ | ✅ | - | - | happy-path, validation |
| 9 | `preview_purchase` | ✅ | - | - | - | happy-path |
| 10 | `get_purchase_status` | ✅ | - | - | - | happy-path |
| 11 | `cancel_purchase` | ✅ | - | - | - | happy-path |
| 12 | `request_temporary_credentials` | ✅ | - | - | - | happy-path |
| 13 | `get_credential_status` | ✅ | - | - | - | happy-path |
| 14 | `register_user_profile` | ✅ | ✅ | - | - | happy-path, validation |
| 15 | `get_onboarding_status` | ✅ | - | - | - | happy-path |
| 16 | `sandbox_create_test_user` | ✅ | ✅ | - | - | sandbox-tools, validation |
| 17 | `sandbox_complete_onboarding` | ✅ | - | - | - | happy-path |
| 18 | `sandbox_approve_request` | ✅ | - | - | - | happy-path |
| 19 | `sandbox_decline_request` | ✅ | - | - | - | happy-path |
| 20 | `sandbox_reset` | ✅ | - | - | - | happy-path |

## Coverage Summary

- **Happy path**: 20/20 (100%)
- **Input validation**: 3/20 (tools with user input)
- **Contract (Zod)**: 6/20 (all guest tools + schema checks)
- **Security edge cases**: 1/20 + global injection/leak tests

## Test Files

| File | Tests | Requires Key |
|------|:-----:|:---:|
| `guest-mode.test.ts` | 9 | No |
| `security.test.ts` | 16 | No |
| `contract.test.ts` | 7 | Partial |
| `sandbox-tools.test.ts` | 5 | Yes |
| `validation.test.ts` | 8 | Yes |
| `happy-path-all-tools.test.ts` | 13 | Partial |
| **Total** | **58** | |
