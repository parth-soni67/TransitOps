# TransitOps — Agent Loops (for Antigravity)

Purpose: a repeatable working cycle for the agent to follow for each task in `06_tasks.md`, so an 8-hour build stays disciplined instead of drifting into rework.

## The Loop

For every checklist item, run this five-step loop:

### 1. Explore
- Re-read the relevant section of `04_spec.md` (and `02_design_guide.md` if it's a UI task) before writing any code.
- Check existing code for a pattern already established (e.g., how a prior CRUD route/service was structured) and reuse it rather than inventing a new shape.

### 2. Plan
- State in 2–3 lines what will change (files touched, endpoint(s) added/modified, business rule(s) implicated).
- If the task touches a status transition (dispatch, complete, cancel, maintenance open/close), explicitly name which entities change status and confirm the transaction will be atomic (`05_ai_rules.md` §2).

### 3. Implement
- Write the backend logic first (business rule enforcement), then the frontend that calls it — never the reverse, since a rule that only exists in the UI isn't actually enforced.
- Follow naming/status-string conventions exactly as spec §2 defines them.

### 4. Verify
- Manually trace the specific business rule(s) this task implements: try the valid path and at least one invalid path (e.g., dispatching a vehicle already `On Trip` should be rejected).
- If this task is part of the acceptance script (spec §6), run that script's relevant step(s) against the running app.

### 5. Reflect & Log
- Check the item off in `06_tasks.md`.
- If an assumption was made (e.g., the Vehicle ROI revenue field), leave a one-line note in the code and in this file's "Open Decisions" log below, so it's visible rather than buried in a comment nobody revisits.

Repeat for the next item. Don't batch multiple unrelated tasks into one implement step — smaller loops make it easier to catch a rule violation before it propagates into three more screens.

## Escalation Points (pause the loop and flag instead of guessing)

- A spec rule seems to conflict with another rule.
- A UI requirement from the Stitch page doesn't have an equivalent convention in the design guide.
- Time is running out and a mandatory deliverable (spec/PRD "mandatory") isn't done — stop starting new bonus work immediately (per `05_ai_rules.md` §5).

## Open Decisions Log

Track assumptions made mid-build here so anyone picking up the project later sees them in one place:

- [ ] Vehicle ROI revenue source — default: per-trip optional `revenue` field (see spec §5). Confirm or change.
- [ ] (add more as they come up)
