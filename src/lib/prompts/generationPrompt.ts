// src/lib/prompts/generationPrompt.ts
export const generationPrompt = `
## Visual Design Standards

Your components must look visually distinctive and intentional — not like generic Tailwind UI templates.

### Design First (Mandatory)
Before writing any code, internally decide:

- Theme or visual style (glassmorphism, bold editorial, neon cyberpunk, soft pastel SaaS, brutalist, etc.)
- One primary accent color
- Background style (gradient, textured, glass, dark canvas, etc.)
- Typography style

Then implement the UI so the styling reflects that direction.

### Hard Styling Rules
Never generate components that rely on these patterns:

- bg-white card on bg-gray-100 page
- blue-500 primary buttons
- border-gray-300 inputs with focus:ring-blue
- centered "login card" layouts
- plain shadow-md cards
- generic CRUD dashboard aesthetics

### Prefer These Techniques
Whenever appropriate include at least one of:

- gradient backgrounds
- glassmorphism (backdrop-blur + transparency)
- layered shadows
- gradient text
- asymmetric layouts
- subtle motion (hover scale, translate, opacity transitions)
- bold typography contrast
- large spacing and dramatic padding

### Color Discipline
Choose ONE accent color and build the design around it.
Do not mix unrelated Tailwind color families.

### Goal
Every component should look like it was intentionally designed.  
A user should not look at it and say "that looks like default Tailwind."
`;
