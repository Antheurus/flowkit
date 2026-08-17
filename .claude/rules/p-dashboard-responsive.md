---
paths:
  - "dashboard/src/**"
---

# Dashboard Grid Responsiveness

The house pattern for any multi-column layout in `dashboard/src` is a **responsive** grid — never a
bare fixed column count or a fixed `gridTemplateColumns` ratio with no breakpoint. Precedent already
exists in `VideoGallery.tsx` (`grid-cols-2 md:grid-cols-3 lg:grid-cols-4`) and in
`ProjectsPage.tsx`/`StoryboardPage.tsx`/`ProjectDetailPage.tsx`'s character grid
(`gridTemplateColumns: 'repeat(auto-fill, minmax(Npx, 1fr))'`).

`DashboardPage.tsx`'s KPI row and `ProjectDetailPage.tsx`'s Overview tab both shipped with a fixed
`grid-cols-4` / fixed `gridTemplateColumns: '1.4fr–1.55fr 1fr'` and no breakpoint, so at any window
narrower than ~1000px the row didn't reflow — it just squeezed, wrapping KPI labels onto 3 lines and,
worse, letting `flex-shrink` on fixed-`width` children (e.g. the Pipeline Throughput row's
`width: 160`/`width: 76` inline styles) truncate video titles down to two letters ("Ji…") while still
technically fitting on one line. That reads as a broken component, not an adapted layout — caught
2026-08-17 from a user screenshot of the dashboard looking cut off at a narrowed window.

**When adding or editing a multi-column section here:**
- Two-column body rows (`Nfr 1fr` style): `grid-cols-1 lg:grid-cols-[Nfr_1fr]`, never a bare inline
  `gridTemplateColumns` with no `grid-cols-1` fallback.
- Card grids with a natural minimum tile size: prefer `repeat(auto-fill, minmax(Npx, 1fr))` — it
  reflows for free, no breakpoint needed.
- A flex row with fixed-`width` children that must hold their size (a data-row layout, not a card
  grid): add `flex-shrink-0` on each fixed-width child and wrap the row list in `overflow-x-auto`, so
  a too-narrow window scrolls that one row horizontally instead of silently truncating its content.

Verify by resizing the live dev server (already running per-project, check `lsof` before assuming it's
down) down through ~1280 → 900 → 768 → 640px and screenshotting each — a passing `tsc`/`vite build`
proves nothing about layout.
