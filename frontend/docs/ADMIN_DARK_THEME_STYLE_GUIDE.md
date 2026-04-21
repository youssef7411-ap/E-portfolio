# Admin Dark Theme Style Guide

## Overview
- Design direction: atmospheric dark interface with cyan/green glow accents.
- Accessibility baseline: WCAG 2.1 AA-focused contrast, visible focus states, reduced-motion fallback.
- UX objective: stronger hierarchy, faster scanability, cleaner content management flow.

## Design Tokens
- Background: `#020617`, `#05070f`, `#0f172a`
- Surfaces: translucent slate (`rgba(15,23,42,0.72-0.95)`)
- Borders: `rgba(148,163,184,0.2-0.45)`
- Primary accent: `#38bdf8`
- Secondary accent: `#22c55e`
- Warning accent: `#f59e0b`
- Danger accent: `#ef4444`
- Primary text: `#f8fafc`
- Secondary text: `#cbd5e1`
- Muted text: `#94a3b8`

## Typography
- Main UI font: `Inter` / system sans.
- Hierarchy:
  - Page title: 1.2rem-1.9rem, 800 weight.
  - Section title: 0.69rem-0.72rem uppercase, high letter spacing.
  - Body: 0.8rem-0.9rem for dense admin data.
  - Helper/meta text: 0.72rem-0.78rem.

## Components
- Navigation shell:
  - Fixed dark sidebar with active glow state.
  - Mobile sticky topbar with accessible menu button.
- Cards:
  - Rounded 12-18px with subtle border and atmospheric shadow.
  - Hover elevation + glow with reduced-motion fallback.
- Tables:
  - Dark striping/hover overlays for readability.
  - Compact row sizing and high-contrast header labels.
- Buttons:
  - Primary gradient: cyan -> green.
  - Secondary neutral dark.
  - Danger red-tinted with clear destructive affordance.
- Form controls:
  - 10px rounded inputs.
  - Cyan focus ring (`box-shadow`) for keyboard clarity.
- Charts:
  - Cyan line chart hero with filled area.
  - Bar + doughnut follow same contrast profile.

## Motion & Interaction
- Standard transitions: 140-220ms.
- Avoid heavy transform distances.
- Respect user preference: reduced motion disables hover lift/animations where applied.

## Accessibility Notes
- Focus-visible rings on interactive elements remain visible on dark backgrounds.
- Button/link labels avoid icon-only critical actions.
- Analytics graph and quick actions include readable labels and ARIA attributes.
- Color pairs in redesigned admin use high-contrast text (`#f8fafc`, `#e2e8f0`) against dark surfaces.

## Implementation Assets
- Core shell + navigation styling: `src/styles/Admin.css`
- Dashboard visual system + chart layouts: `src/styles/Dashboard.css`
- Subject management dark modal/upload styles: `src/styles/SubjectManagement.css`
- Post management dark UI and modal/form system: `src/styles/PostManagement.css`
- Shared admin token layer: `src/styles/AdminDesignSystem.css`
