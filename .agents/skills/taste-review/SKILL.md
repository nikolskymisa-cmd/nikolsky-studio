---
name: taste-review
description: Use this skill when reviewing frontend UI, landing pages, components, animations, spacing, typography, visual hierarchy, or overall product feel. It helps detect generic AI-looking design and improve visual taste.
---

# Taste Review Skill

Use this skill before finalizing any frontend/UI task.

Review the interface through these lenses:

## 1. First impression

Ask:
- Does this feel premium within 3 seconds?
- Is the visual hierarchy obvious?
- Is there a strong focal point?
- Does it look like a real product or a generated template?

Fix:
- weak hero sections
- unclear hierarchy
- bland cards
- generic gradients
- random decorative blobs
- poor whitespace
- inconsistent alignment

## 2. Typography

Check:
- font sizes
- line-height
- contrast
- heading rhythm
- paragraph width
- weight hierarchy

Fix:
- oversized body text
- cramped text
- weak headings
- inconsistent font weights
- poor readability

## 3. Spacing and layout

Check:
- section rhythm
- card padding
- gaps
- alignment
- grid consistency
- mobile layout

Fix:
- cramped sections
- random spacing values
- uneven cards
- weak vertical rhythm
- poor responsive behavior

## 4. Motion

Motion should be:
- useful
- subtle
- fast
- interruptible
- performant
- connected to user intent

Avoid:
- slow fade-ins everywhere
- excessive spring bounce
- animation that delays usability
- animating layout-heavy properties
- motion with no purpose

Prefer:
- opacity
- transform
- small scale changes
- subtle stagger
- clear entrance/exit transitions
- reduced-motion support

## 5. Interaction polish

Check:
- hover states
- active states
- focus states
- loading states
- empty states
- error states
- button feedback
- link feedback

Fix anything that feels unfinished.

## 6. Anti-generic pass

Remove or improve anything that feels like:
- default Tailwind template
- generic AI landing page
- random gradient background
- meaningless glass card
- fake dashboard screenshot with no purpose
- overly centered layout with no tension
- decorative elements that do not support the message

## Final instruction

After review, make concrete improvements in code.
Do not only describe issues.
Actually improve the UI.
