# EduBridge: UI / UX Style Guide

To maintain a cohesive and premium look across the EduBridge platform, all developers must adhere to this UI Style Guide when building frontend components. 

The benchmark for our design is the **EduBridge Landing Page**. The clean, modern, and accessible aesthetic shown there is the standard for the entire application.

---

## 1. Core Principles

1. **Keep it Clean & Breathable:** Use generous padding and margins. Do not cram elements together.
2. **Accessible by Default:** Ensure high contrast ratios (especially text on colored backgrounds) and use semantic HTML.
3. **Responsive Design:** Every component must look excellent on mobile, tablet, and desktop views. Use Tailwind's responsive prefixes (`sm:`, `md:`, `lg:`).

## 2. Color Palette

We use TailwindCSS for styling. Do not use generic, uncalibrated colors (like `bg-red-500` for primary elements). 

Our primary color scheme revolves around professional, trustworthy blues:
- **Primary Brand Color:** `bg-[#4085b3]` (EduBridge Blue)
- **Primary Hover State:** `hover:bg-[#2b6a94]`
- **Backgrounds:** We prefer clean `bg-white` or very light grays like `bg-gray-50` for application backgrounds.
- **Text (Dark):** `text-gray-900` for primary headings, `text-gray-600` for secondary text.

*Note: For the role-based dashboards, we use slight color variations in the banners to distinguish the roles (e.g., Violet for Parents, Teal for Committees), but the structural UI components (buttons, inputs, cards) remain consistent.*

## 3. Typography

We rely on modern, highly legible sans-serif fonts (configured via Next.js and Tailwind default sans).
- **Headings (H1, H2, H3):** Must be bold (`font-bold` or `font-semibold`) and use tight tracking (`tracking-tight`).
- **Body Text:** Use standard text sizes (`text-sm` or `text-base`) with comfortable line height (`leading-relaxed`).

## 4. Components

### Cards & Containers
All content blocks (like charts, forms, or data lists) should be placed in cards.
- **Classes to use:** `bg-white rounded-xl shadow-sm border border-gray-100 p-6`

### Buttons
Buttons should be easily clickable with clear hover states.
- **Primary Button:** `bg-[#4085b3] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#2b6a94] transition-colors`
- **Secondary Button:** `bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors`

### Inputs
Forms should be clean, with subtle borders that highlight on focus.
- **Classes to use:** `w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#4085b3] focus:border-[#4085b3] outline-none transition-all`

## 5. Using Icons
We use **Lucide React** (`lucide-react`) for all iconography. 
- Keep icons consistently sized (usually `w-5 h-5` or `w-6 h-6`).
- Ensure stroke widths match the text weight they sit next to.

## Conclusion
Before opening a Pull Request, compare your new component to the Landing Page and existing Dashboard Layouts. If it looks distinctly different or out of place, please revise it using the utility classes listed above.
