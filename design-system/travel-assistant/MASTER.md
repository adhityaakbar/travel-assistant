# Design System Master File — Travel Assistant (Telkomsel THE v2.0)

> **LOGIC:** When building or updating any page/component in Travel Assistant, first check `design-system/travel-assistant/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file. Otherwise, follow this Master file strictly.

---

**Project:** Travel Assistant  
**Design System:** Telkomsel THE v2.0  
**Updated:** 2026-10-09  
**Theme Support:** Dual Theme (Light Mode Default + Dark Mode)  

---

## 1. Global Tokens

### Color Palette

| Role | Light Mode Hex | Dark Mode Hex | CSS Variable | Token Name |
|------|----------------|---------------|--------------|------------|
| Brand Primary | `#FF0025` | `#FF0025` | `--color-tsel-red` | Telkomsel Red |
| Brand Secondary | `#FDA22B` | `#FDA22B` | `--color-tsel-orange` | Portal Orange |
| Brand Deep Navy | `#001A41` | `#001A41` | `--color-tsel-navy` | Deep Navy |
| Background | `#F4F6FB` | `#001A41` | `--bg-color` | App Background |
| Surface / Card | `rgba(255, 255, 255, 0.92)` | `rgba(10, 25, 55, 0.85)` | `--card-bg` | Card Surface |
| Card Border | `rgba(0, 26, 65, 0.08)` | `rgba(255, 255, 255, 0.10)` | `--card-border` | Subtle Divider |
| Text Primary | `#0A1937` | `#FFFFFF` | `--text-main` | Heading & Primary Body |
| Text Secondary | `#5A6E85` | `#94A3B8` | `--text-sub` | Subtext & Hints |
| Input Field Bg | `#F0F4F9` | `rgba(255, 255, 255, 0.05)` | `--input-bg` | Field Background |
| Input Field Border | `rgba(0, 26, 65, 0.12)` | `rgba(255, 255, 255, 0.12)` | `--input-border` | Field Border |

### Typography

- **Primary Font Family:** Inter (`'Inter', system-ui, -apple-system, sans-serif`)
- **Weights:** 400 (Regular), 500 (Medium), 600 (SemiBold), 700 (Bold), 800 (ExtraBold)
- **Scale:**
  - H1: 20px - 24px (Bold / ExtraBold, tracking-tight)
  - Body: 14px (Medium)
  - Subtext / Hints: 12px (Regular / Medium)
  - Micro / Captions: 11px (Mono / Medium)

### Iconography Guidelines

- **Style:** Clean vector SVG outlines (`stroke-width: 2` to `2.2`, `stroke-linecap: round`).
- **Brand App Icon:** Luggage (`<rect width="16" height="13" x="4" y="7" rx="2"/><path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/><path d="M9 11v5"/><path d="M15 11v5"/>`) inside a rounded gradient badge (`linear-gradient(135deg, #FF0025 0%, #FDA22B 100%)`).
- ❌ **Forbidden:** Emojis as UI icons, low-contrast icons, raster PNG icons.

---

## 2. Component Specs & Classes

### Primary Button
```css
.tsel-btn-primary {
  background: linear-gradient(135deg, #FF0025 0%, #FDA22B 100%);
  color: #FFFFFF;
  padding: 12px 20px;
  border-radius: 12px;
  font-weight: 600;
  transition: all 0.25s ease;
  cursor: pointer;
}
.tsel-btn-primary:hover {
  opacity: 0.95;
  box-shadow: 0 8px 20px -4px rgba(255, 0, 37, 0.4);
}
.tsel-btn-primary:active {
  transform: scale(0.99);
}
```

### Input Field
```css
.tsel-input-field {
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  color: var(--input-text);
  border-radius: 12px;
  padding: 12px 16px 12px 36px;
  transition: all 0.2s ease;
}
.tsel-input-field:focus {
  border-color: #FF0025;
  box-shadow: 0 0 0 3px rgba(255, 0, 37, 0.15);
  outline: none;
}
```

---

## 3. Mandatory Checklist for AI Coders

Before committing code modifications to `src/App.jsx` or any UI component:

- [ ] Support both Light Mode and Dark Mode via clean CSS variables or Tailwind `dark:` classes.
- [ ] Use `Luggage` SVG icon for Travel Assistant app branding.
- [ ] Align primary CTA buttons with Telkomsel Red & Portal Orange gradient.
- [ ] Center app version string (`v1.4.6`) in the footer.
- [ ] Keep layout clean, minimal, uncluttered, and WCAG AAA compliant (text contrast >= 4.5:1).
- [ ] Ensure all inputs have clear `:focus` state with `#FF0025` ring.
