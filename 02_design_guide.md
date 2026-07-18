# TransitOps — Design Guide

Purpose: keep every screen Antigravity builds visually consistent with the Stitch-generated login/landing page. Update the token values below once you see the actual Stitch export (colors may shift slightly) — this is the starting baseline.

## 1. Color Tokens

| Token | Hex | Usage |
|---|---|---|
| `--color-primary` | `#0F172A` (deep navy) | Headers, nav, primary text on light bg |
| `--color-accent` | `#14B8A6` (teal) | Primary buttons, active states, links |
| `--color-warning` | `#F59E0B` (amber) | Expiring license, In Shop, Pending Trip badges |
| `--color-danger` | `#EF4444` | Suspended driver, Retired vehicle, validation errors |
| `--color-success` | `#22C55E` | Available/Completed/On-time states |
| `--color-surface` | `#FFFFFF` | Cards, panels |
| `--color-bg` | `#F8FAFC` | App background |
| `--color-muted` | `#64748B` | Secondary text, helper copy |
| `--color-border` | `#E2E8F0` | Dividers, input borders |

Status-to-color mapping (use consistently across Vehicles, Drivers, Trips, Maintenance):
- `Available` / `Completed` / `On Duty` → success
- `On Trip` / `Dispatched` / `Active` → accent (teal)
- `In Shop` / `Pending` / `Draft` → warning (amber)
- `Retired` / `Suspended` / `Cancelled` → danger

## 2. Typography

- Font family: Inter (or system sans fallback).
- Scale: `text-3xl` page titles, `text-xl` section headers, `text-base` body, `text-sm` helper/meta.
- Weight: `font-bold` for headlines and KPI numbers, `font-medium` for labels, `font-normal` for body copy.

## 3. Layout & Spacing

- 8px base spacing unit (Tailwind default scale).
- Cards: `rounded-xl`, `shadow-sm`, `p-6`, white surface on `--color-bg` page background.
- Page container: max-width constrained (`max-w-7xl`), centered, `px-6` gutters.
- Sidebar nav (post-login app shell): fixed left, `w-64`, dark navy background matching hero, icon + label per module, active item highlighted with teal left-border accent.

## 4. Components

- **Buttons:** Primary = filled teal, white text, `rounded-lg`, `px-4 py-2`. Secondary = outline slate. Destructive = filled danger red, used only for irreversible actions (e.g., Retire Vehicle).
- **KPI Cards (Dashboard):** large bold number top, muted label below, optional small trend/status chip.
- **Tables (Vehicle/Driver/Trip lists):** zebra-free, `border-b` row dividers, status shown as colored pill badge (not raw text), row-level actions right-aligned as icon buttons.
- **Forms:** label above input, `rounded-lg` border inputs, teal focus ring, inline validation message in danger color below the field.
- **Badges/Pills:** `rounded-full`, `px-3 py-1`, `text-xs font-medium`, colored per the status mapping in §1.

## 5. Motion Rules (carried over from the login page, used sparingly elsewhere)

- Use `whileInView`/fade-slide only for: Dashboard KPI cards on first load, Reports charts on first render.
- Never animate table rows or form inputs — motion should never slow down data-entry workflows.
- Respect `prefers-reduced-motion` everywhere, not just the login page.

## 6. Icon Style

- Line icons (Lucide or Heroicons outline), consistent stroke width, sized `w-5 h-5` in nav/lists, `w-8 h-8` for feature highlights.

## 7. Do / Don't

- **Do** reuse the exact login page color values project-wide — don't introduce a second palette for the "app" side.
- **Do** keep status colors identical everywhere a status appears (badge, chart, filter chip).
- **Don't** carry the landing page's decorative background gradients into internal app screens — internal screens use the flat `--color-bg` for readability and information density.
