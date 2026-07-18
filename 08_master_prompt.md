# TransitOps — Master Prompt for Antigravity

Paste this into Antigravity to kick off the build, after adding these files to the project root:
`system_guide.md`, `spec.md`, `design_guide.md`, `ai_rules.md`, `tasks.md`, `loops.md`, and the Stitch-exported login component.

---

## Prompt

```
You are building TransitOps, a Smart Transport Operations Platform, for an
8-hour hackathon. Before writing any code, read these project files in this
order and treat them as authoritative for the entire build:

1. system_guide.md — architecture, folder structure, tech stack, data flow
2. spec.md — functional requirements, entities, and the 10 mandatory business
   rules (non-negotiable, must be server-enforced)
3. design_guide.md — color tokens, typography, component and motion rules for
   every screen except the login page
4. ai_rules.md — standing rules governing how you write code, enforce
   business rules, and handle ambiguity on this project
5. tasks.md — the phased task list to execute, in order
6. loops.md — the explore → plan → implement → verify → reflect loop to run
   for each task in tasks.md

UI STARTING POINT:
The login/landing page has already been designed in Google Stitch with a
scroll-animated hero, feature sections, and an embedded login form. The
exported component is at [paste path, e.g. /frontend/src/pages/LoginPage.jsx
or paste the raw code here]. Treat this component's visual design as final —
do not restyle it. Your job is only to:
  - wire its login form to the real authentication endpoint
  - redirect to /dashboard on successful login
  - handle and display auth errors inline in the existing form UI
  - keep its color palette and typography as the source for design_guide.md
    tokens if any values need reconciling

BUILD INSTRUCTIONS:
Work through tasks.md in order, applying the loop defined in loops.md to each
item. Enforce every rule in spec.md section 4 on the backend — never rely on
frontend-only validation for a business rule. Every multi-entity status
change (dispatch, complete, cancel, maintenance open/close) must be a single
atomic transaction.

Stop and flag rather than guess whenever:
  - a requirement is ambiguous and not covered by an existing default
    assumption in spec.md or loops.md's Open Decisions Log
  - a task would require deviating from the chosen tech stack in system_guide.md
  - time is short and a mandatory deliverable is incomplete — do not start
    bonus features (design_guide.md / tasks.md bonus section) until every
    mandatory item is done and the acceptance script in spec.md section 6
    passes end-to-end.

Begin with Phase 0 in tasks.md.
```

---

## Handoff checklist before running this prompt

- [ ] Stitch login page exported and saved into `/frontend/src/pages/`
- [ ] All 7 doc files (`system_guide.md`, `spec.md`, `design_guide.md`, `ai_rules.md`, `tasks.md`, `loops.md`, this file) placed in project root or `/docs`
- [ ] Vehicle ROI revenue-field decision confirmed or left as the documented default
- [ ] Tech stack choice (Node/Express vs FastAPI) locked in `system_guide.md` §1 before the agent starts
