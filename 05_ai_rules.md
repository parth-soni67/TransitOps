# TransitOps — AI Rules (for Antigravity)

These are standing rules for the coding agent while building this project. Read alongside `03_system_guide.md`, `04_spec.md`, and `02_design_guide.md`.

## 1. Source of Truth

- `04_spec.md` is authoritative for behavior and business rules. If generated code and the spec disagree, the spec wins — fix the code.
- `02_design_guide.md` is authoritative for visual styling on every screen except the Stitch-generated login page, which is authoritative for itself.
- Never invent new business rules or silently relax one of the 10 rules in spec §4 to make a feature "work" — if a rule blocks an implementation approach, flag it instead of routing around it.

## 2. Business-Rule Enforcement

- Every rule in spec §4 must be implemented **server-side**, inside the relevant service function, not only as frontend form validation or disabled buttons.
- Any status change that affects more than one entity (dispatch, complete, cancel, maintenance open/close) must be a single atomic transaction. Never issue the vehicle-status update and driver-status update as two independent, separately-failable calls.
- When adding a new endpoint that changes Vehicle or Driver status, check it against spec §4 before writing it — if it's not covered by an existing rule, ask rather than assume.

## 3. Code Conventions

- Stay on the stack chosen in `03_system_guide.md` — don't introduce a second framework, ORM, or state-management library mid-build without flagging it first.
- Keep API responses consistent in shape (`{ data, error }` or similar) across all routes.
- Name status enum values exactly as spec §2 defines them (`Available`, `On Trip`, `In Shop`, `Retired`, etc.) — don't abbreviate or re-case them, since the frontend badge/color mapping in the design guide keys off these exact strings.

## 4. UI Implementation

- The login/landing page is the Stitch export — adapt only what's needed for routing/auth wiring (form submit handler, redirect on success). Do not restyle it to match internal-app conventions; it's intentionally the marketing-style entry point.
- Every other screen must follow `02_design_guide.md` tokens (colors, spacing, status-badge mapping) rather than ad hoc styling choices per screen.
- Don't add animation/motion beyond what `02_design_guide.md` §5 specifies — internal data screens should prioritize speed and clarity over flourish.

## 5. Scope Discipline (8-hour build)

- Build mandatory deliverables (spec, PRD §7 equivalent) completely before touching any bonus feature.
- If a mandatory feature and a bonus feature compete for remaining time, mandatory wins, no exceptions.
- Prefer a working, spec-compliant version of a screen over a polished but rule-incomplete one.

## 6. When Uncertain

- If a requirement is ambiguous (e.g., Vehicle ROI's Revenue source, flagged in spec §5), use the stated default assumption, implement it, and leave a clear `// TODO: confirm with team` comment rather than blocking progress.
- Don't fabricate data model fields not listed in spec §2 without noting the addition in a comment.

## 7. Testing / Verification

- Before marking any module "done," walk the acceptance script in spec §6 against it (or the relevant slice of it).
- Prioritize verifying the 10 business rules with deliberate "should fail" tests (e.g., try to dispatch a `Retired` vehicle and confirm it's rejected) over general UI polish.
