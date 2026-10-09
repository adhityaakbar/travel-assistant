---
version: alpha
name: Travel Assistant (Telkomsel THE v2.0)
description: Official Telkomsel THE v2.0 Design System for Travel Assistant (Japan edition). Supports full dual theme with Light Mode as default and Dark Mode toggle.
colors:
  primary: "#FF0025"
  secondary: "#FDA22B"
  deep-navy: "#001A41"
  surface-light: "#FFFFFF"
  surface-dark: "#0A1937"
  bg-light: "#F4F6FB"
  bg-dark: "#001A41"
  text-primary-light: "#0A1937"
  text-primary-dark: "#FFFFFF"
  text-secondary-light: "#5A6E85"
  text-secondary-dark: "#94A3B8"
  input-bg-light: "#F0F4F9"
  input-bg-dark: "#0A1937"
typography:
  h1:
    fontFamily: Plus Jakarta Sans
    fontSize: "1.5rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  h2:
    fontFamily: Plus Jakarta Sans
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.3
  body-md:
    fontFamily: Inter
    fontSize: "0.875rem"
    lineHeight: 1.5
  caption:
    fontFamily: Inter
    fontSize: "0.75rem"
    lineHeight: 1.4
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "12px 20px"
  button-primary-hover:
    backgroundColor: "{colors.primary}"
  card-surface:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.text-primary-light}"
    rounded: "{rounded.lg}"
    padding: "16px"
  card-surface-dark:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.text-primary-dark}"
    rounded: "{rounded.lg}"
    padding: "16px"
  app-container:
    backgroundColor: "{colors.bg-light}"
    textColor: "{colors.text-primary-light}"
    padding: "24px"
  app-container-dark:
    backgroundColor: "{colors.bg-dark}"
    textColor: "{colors.text-primary-dark}"
    padding: "24px"
  input-field:
    backgroundColor: "{colors.input-bg-light}"
    textColor: "{colors.text-primary-light}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  input-field-dark:
    backgroundColor: "{colors.input-bg-dark}"
    textColor: "{colors.text-primary-dark}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
---

## Overview

Official Telkomsel THE v2.0 Design System specification for Travel Assistant Japan. Built for seamless Dual Theme (Light Mode Default & Dark Mode Toggle).

## Colors

- **Primary Accent (`#FF0025`):** Telkomsel Red for primary CTAs, active tab indicators, and critical highlights.
- **Secondary Accent (`#FDA22B`):** Portal Orange for gradient accents (`from-[#FF0025] to-[#FDA22B]`), logo badge, and active chips.
- **Deep Navy Dark BG (`#001A41`):** Base canvas color for Dark Mode.
- **Light BG (`#F4F6FB`):** Base canvas color for Light Mode (Default).
- **Surface Card Light (`#FFFFFF`):** Card background for Light Mode (`bg-white border border-slate-200/80`).
- **Surface Card Dark (`#0A1937`):** Card background for Dark Mode (`dark:bg-[#0A1937]/80 dark:border-white/10`).

## Typography

Plus Jakarta Sans for headings and prominent brand headers (`font-heading`). Inter for body text, inputs, subtext, and UI components (`font-sans`).

## Layout

Mobile-first shell with a maximum width of 430px, centered layout with backdrop-blur floating header, bottom navigation bar, and tabbed sub-views.

## Elevation & Depth

Subtle border strokes (`border-slate-200/80` for Light Mode, `dark:border-white/10` for Dark Mode) combined with soft shadows (`shadow-2xs`, `shadow-md`, `shadow-2xl`).

## Shapes

Card corner radii set to `12px` (`rounded-xl`), `16px` (`rounded-2xl`), and `24px` for modal dialogs and authentication cards.

## Components

`button-primary` uses the signature Telkomsel Red to Portal Orange gradient with white text. Input fields use soft background fills with a `#FF0025` focus ring.

## Do's and Don'ts

- **Do:** Use Light Mode as default on fresh user sessions, with instant client-side Dark Mode toggling.
- **Do:** Ensure text contrast WCAG AA compliance (text contrast >= 4.5:1) in both Light and Dark modes.
- **Don't:** Hardcode dark background styles without corresponding `dark:` Tailwind directives or CSS variables.
- **Don't:** Override permanent React DOM hierarchy or state handlers in `src/App.jsx`.
