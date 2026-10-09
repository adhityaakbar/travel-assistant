# Login Page Design Specification — Travel Assistant

> **Page Override:** `design-system/travel-assistant/pages/login.md`  
> **Target Component:** `src/App.jsx` (Passcode & Auth overlay)  
> **Canvas Preview:** `public/login-preview.html`

---

## 1. Visual Hierarchy & Layout

- **Width:** Max width `384px` (`max-w-sm`), centered vertically and horizontally.
- **Card:** `tsel-card-box` with `backdrop-filter: blur(20px)`, rounded `24px` (`rounded-2xl`).
- **Logo:** 48x48px (`w-12 h-12`) badge with `#FF0025` to `#FDA22B` gradient and white `Luggage` SVG icon.
- **Header:**
  - Title: "Travel Assistant" (20px / Bold)
  - Subtitle: "Masukkan passcode untuk melanjutkan" (12px / Medium)
- **Form Fields:**
  - Passcode input with password show/hide eye toggle button.
  - "Ingat sesi saya" checkbox.
  - Primary button: "Masuk" with arrow icon.
- **Footer:**
  - Centered version tag: `v1.4.6` in monospace font (`font-mono`).

---

## 2. Interactive Theme Switcher

- Supports instant toggle between `☀️ Light` (Default) and `🌙 Dark`.
- Uses CSS variables (`--bg-color`, `--card-bg`, `--text-main`, `--text-sub`, `--input-bg`, `--input-border`).

---

## 3. Reference Canvas

The standalone interactive preview canvas is saved and verified at:
`public/login-preview.html`
