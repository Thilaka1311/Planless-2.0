## UI DESIGN RULES

Every screen, layout, component, navigation, interaction, animation, card, and feed built for the Planless application must be guided by the following principles:

### A. General UI Feeling & Experience
1. **Simple, Social, Lightweight**: The UI should feel exceptionally simple, social, lightweight, calm, modern, emotionally warm, and approachable.
2. **Prioritization of Comfort**: The interface must prioritize usability, clarity, speed, readability, and emotional comfort over cinematic excess, artistic complexity, or purely visual impressiveness.
3. **Core Inspirations**: Adhere to Instagram's interaction simplicity (focused profiles, clear visual tiles, direct action), Spotify's dark mode calmness (deep dark backgrounds, soft neon accents, crisp typography), and Opal's minimal structure (generous padding, rounded corners, clean content framing).
4. **NOT SaaS or Dashboard**: The app must **never** feel like an enterprise dashboard, a productivity SaaS, a fintech transaction terminal, a heavy gaming dashboard, or a cold luxury editorial layout.

### B. Color & Theme Palette
5. **Dark Mode by Default**: Deep slate and pitch black canvas structures represent the default behavioral theme.
6. **Official Palette**:
   - **Main Canvas Backgrounds**: `#0C0C0E` and `#09090b` (Deep warm obsidian)
   - **Surface & Cards Backgrounds**: Slate-zinc layers (`#18181b` / `#27272a` & `#1c1c1e`)
   - **Primary Action Accent Swatches**:
     - Brand Peach/Coral: `#ff8b66` (Main interactive highlighters)
     - Brand Orange/Volt: `#ff5d41` (Secondary high-energy indicators)
     - Zinc-Nuted Borders: `#27272a` / `#18181b` for thin outlines
   - **Status Indicators (Muted Tone)**:
     - Emerald Green (`#10b981` / `#064e3b` container) for slots locked & confirmed going
     - Golden Amber (`#f59e0b` / `#451a03` container) for fully booked & waitlists
7. **Tonal Layering**: Favor warmth-rich dark surfaces, restrained accent highlights, soft atmospheric contrast, and subtle tonal levels.
8. **Anti-Neon & No Cold Grids**: Avoid clinical neon accent combinations, excessive glows, aggressive multi-color gradient sweeps, or cold enterprise gray grid designs.
9. **Accent Economy**: Accent colors must be reserved exclusively for active navigation states, tactile CTA highlights, or vital confirmation/feedback states.

### C. Typography Hierarchy
10. **Clean, Readable, Modern**: Text styling must feel fresh, legible, and socially natural.
11. **Hierarchy Order**: Prioritize **Activity Name / Title** $\rightarrow$ **People (Attendee Facepiles)** $\rightarrow$ **Timing & Date** $\rightarrow$ **Venue / Location** before secondary tags or administrative details.
12. **Anti-Editorial**: Avoid oversized editorial font pairings, luxury minimalist magazine headers, or aggressive text-scaling steps.
13. **Subtle Metadata**: Secondary information and system logs should remain visually compact (`text-[10px]` to `text-xs`) and nested in soft zinc tones (`text-zinc-500` / `text-zinc-400`).

### D. Layout & Spacing Rhythm
14. **Intentionally Generous Space**: The application must incorporate breathing room, low interface density, and soft spacing rhythms to reduce anxiety.
15. **Figma Spacing Guides**: Utilize standard consistent spacing scales (typically multiples of `4px` or `8px` such as `p-4`, `p-6`, `space-y-4`) to build consistency.
16. **No Crowd Clusters**: Avoid cramming multiple cards in small grids, cluttered dashboard lists, bloated sideboxes, or tightly squeezed informational tables.
17. **One Action per Screen**: Each focused view should revolve around a single primary action, one central interactive gesture, and a clear, singular information hierarchy.
18. **Negative Space**: Whitespace must be applied deliberately to provide rest intervals for the user's eyes.

### E. Immersive Swipe Feed Rules
19. **Vertical Swipe Architecture**: The home screen feed must operate exactly like standard short-video platforms (such as TikTok, Reels, or Shorts) but adapted for real-world plans.
20. **One Screen = One Plan**: The Home Feed must present full-screen vertical swipe containers. Only one plan is shown at any given moment.
21. **Zero Peeking & Perfect Snaps**: The next card in the feed must not be visible *at all* beforehand. It appears strictly after a vertical swipe up/down using perfect snapping alignment (`snap-y snap-mandatory`). 
22. **Emotional & Active Vibe**: The feed cards must feel immersive and socially active, inviting instant choice without cluttered post elements, high counts of comments, or excessive scroll bars.

### F. Card Design Principles
23. **Interactive Surface**: Cards are the primary container of the experience and must be friendly to thumbs, easy to scan, and visually high-contrast.
24. **Aesthetic Priorities**: Ensure the titles, host avatar, face pile of joined friends, venue, and timing elements take up the dominant visual footprint.
25. **No Badge Overload**: Avoid layering multiple cards with dozens of tiny warning labels, detailed system timestamps, analytical numbers, or unnecessary icons.
26. **Corner Radius Scale**:
    - Full-Screen Feed Overlays & Large Modal Panels: `rounded-[2rem]` to `rounded-[2.4rem]`
    - Standard Content Cards & Slideouts: `rounded-3xl`
    - Small Tags, Segment Controllers, and Chips: `rounded-full` or `rounded-xl`
27. **Soft Atmosphere Shadows**: Prefer clean tonal backdrop shifts or transparent borders (`border border-white/10` or `border-zinc-900`) instead of heavy dark shadows for physical separation. Minimise hard horizontal lines and dividers; utilize background contrast or grouping instead.

### G. Smooth Micro-Interactions
28. **Thumb-Safe Zones**: Crucial triggers, swipe lines, and action buttons must be easily reachable by thumbs in the bottom half of the mobile viewport.
29. **Responsive & Fast Feel**: UI responses (hover highlights, active button compressions, card reveals) must trigger instantly to maintain momentum.
30. **Subtle Feedback Animation**:
    - Use `motion` transitions for soft fade-ins and scale checks (`whileTap={{ scale: 0.95 }}`).
    - Avoid aggressive physical bouncing, infinite loops, heavy spinning transitions, or complex viewport animations.
    - Motion must act as functional support, never as generic decoration.

### H. Clean Button & CTA Styling
31. **Minimal and Calm**: Buttons should remain clean, minimal, content-informed, and neat.
32. **No Visual Hype**: Main primary action buttons must **never** contain emojis inside the text, glow shadows, multi-color animations, neon flashing borders, or oversized gradient halos.
33. **Consistent Copy**: Preferred CTAs are direct, plain, and warm: *Join Plan*, *Host Plan*, *Create Plan*, or *View Details*.
34. **Informed Contrast**: Let the hierarchy speak through contrasting colors (e.g., highly visible coral/peach for Join, muted zinc/black for secondary actions) instead of physical size modifications.

### I. Input & Form Simplicity
35. **Ultra-Low Typing**: Minimize text field constraints. Forms must be swift, offering single-tap selectors, quick presets, and automatic defaults wherever possible.
36. **Zero-Friction Boarding**: Avoid multi-tiered registration flows, verbose questionnaires, or long field requirements. A plan must be spawnable in seconds using intuitive selectors.

### J. Social Proof & Energy
37. **Active Facepiles**: Display real face pictures of organizers and mutual joiners to communicate organic social warmth.
38. **Muted Vanity Metrics**: Rather than showing global statistics or popularity rankings, focus on nearby proximity tags (e.g., "3 mutuals attending", "Circle match"). Keep the energy friendly and inviting but quiet and calm.

### K. Sticky Navigation Architecture
39. **Fixed and Accessible**: The primary footer navigation bar must remain completely fixed, static, and simple.
40. **Secondary Presence**: The tab bar (`Home`, `Plans`, `Create`, `Circle`, `Profile`) must sit in the bottom margin, blending into the background color with soft translucent backing (`backdrop-blur-md`) without taking the focus off the plan itself.

### L. Anti-Patterns to Overdrive out of Codebase
41. **No Enterprise Tables & SaaS Dashboards**: Never display information in square grids, hard box lines, or thick divider tables.
42. **No Telemetry Clutter**: No mock logging terms, host container addresses, system port descriptors, or server console tags.
43. **No Over-Animation & Flash**: Clean transitions only; never apply spinning loops, constant scaling pulses, or chaotic entry shakes.
44. **No Hidden Costs or Complexity**: When a feature or UI begins to feel intimidating, confusing, or too cold—immediately simplify it.

---

## Ⅲ. COMPLIANCE & VERIFICATION DECREE

1. **Before Commits**: Any changes made by the AI coding assistant must be mentally verified against these 44 rules.
2. **Design Priority**: Visual design, typography pairing, alignment safety, and touch bounds are critical. Never output dry default components. Maintain cohesive consistency.
