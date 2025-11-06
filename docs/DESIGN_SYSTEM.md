# Design System Documentation

## Overview

The hl7-capture design system is built on **shadcn/ui** with a custom theme tailored for medical device communication analysis. The system provides a consistent, professional, and accessible user interface that promotes a "calm and focused" user experience.

## Technology Stack

- **shadcn/ui**: Component library with full code ownership
- **Tailwind CSS**: Utility-first CSS framework
- **Radix UI**: Accessible component primitives
- **React**: UI framework
- **TypeScript**: Type-safe development

## Theme Configuration

### Colors

The color system is defined in `tailwind.config.js` and uses CSS variables for theming.

#### Brand Colors

- **Brand Blue** (`#1e3a5f`): Primary brand color for headers and key text
- **Brand Teal** (`#00bcd4`): Primary action color for buttons, links, active states
- **Brand Light** (`#e3f2fd`): Subtle backgrounds and hover states

#### Semantic Colors

- **Success** (`#10b981`): Successful operations, valid states
- **Warning** (`#f59e0b`): Warnings, important notices
- **Error** (`#ef4444`): Errors, destructive actions
- **Info** (`#3b82f6`): Informational messages

#### HL7 Protocol Colors

Special colors for protocol visualization:

- **Outbound** (`#ff6b35`): Device → LIS communication
- **Inbound** (`#9333ea`): LIS → Device communication
- **Start Marker** (`#10b981`): Session initialization (0x05)
- **Message** (`#00bcd4`): HL7 message content
- **Acknowledgment** (`#3b82f6`): ACK marker (0x06)
- **End Marker** (`#64748b`): Session termination (0x04)

### Typography

#### Font Families

- **Interface**: Inter (with system font fallbacks)
- **Monospace**: JetBrains Mono (for hex data and protocol markers)

#### Type Scale

| Name    | Size             | Line Height | Weight | Usage                    |
| ------- | ---------------- | ----------- | ------ | ------------------------ |
| Display | 32px (2rem)      | 1.2         | 700    | Page titles              |
| H1      | 24px (1.5rem)    | 1.3         | 600    | Section headers          |
| H2      | 20px (1.25rem)   | 1.4         | 600    | Subsection headers       |
| H3      | 16px (1rem)      | 1.5         | 600    | Component titles         |
| Body    | 14px (0.875rem)  | 1.6         | 400    | Main text                |
| Small   | 12px (0.75rem)   | 1.5         | 400    | Secondary text, captions |
| Tiny    | 11px (0.6875rem) | 1.4         | 400    | Timestamps, metadata     |

### Spacing

Based on a 4px unit system:

| Name | Value         | Usage                             |
| ---- | ------------- | --------------------------------- |
| xs   | 4px (0.25rem) | Tight spacing, inline elements    |
| sm   | 8px (0.5rem)  | Close relationships, icon padding |
| md   | 16px (1rem)   | Standard component padding        |
| lg   | 24px (1.5rem) | Section spacing, card padding     |
| xl   | 32px (2rem)   | Major section breaks              |
| 2xl  | 48px (3rem)   | Page-level spacing                |
| 3xl  | 64px (4rem)   | Large gaps (rare)                 |

### Shadows

Subtle elevation system:

| Name | Value                             | Usage                     |
| ---- | --------------------------------- | ------------------------- |
| sm   | `0 1px 2px rgba(0, 0, 0, 0.05)`   | Subtle lift, hover states |
| md   | `0 4px 6px rgba(0, 0, 0, 0.07)`   | Cards, dropdowns          |
| lg   | `0 10px 15px rgba(0, 0, 0, 0.1)`  | Modals, popovers          |
| xl   | `0 20px 25px rgba(0, 0, 0, 0.15)` | Major overlays            |

### Border Radius

| Name | Value  | Usage               |
| ---- | ------ | ------------------- |
| none | 0px    | Tables, data grids  |
| sm   | 4px    | Buttons, inputs     |
| md   | 6px    | Cards, panels       |
| lg   | 8px    | Modals, large cards |
| full | 9999px | Pills, badges       |

## Available Components

### Button

Located: `src/renderer/components/ui/button.tsx`

**Variants:**

- `default`: Primary teal background
- `secondary`: Neutral gray background
- `outline`: Border with transparent background
- `ghost`: No background, hover effect only
- `destructive`: Red background for dangerous actions
- `link`: Text-only link style

**Sizes:**

- `sm`: Small (h-9)
- `default`: Standard (h-10)
- `lg`: Large (h-11)
- `icon`: Square button for icons (h-10 w-10)

**Usage:**

```tsx
import { Button } from "./components/ui/button";

<Button variant="default">Click me</Button>
<Button variant="outline" size="sm">Small Outline</Button>
<Button variant="destructive">Delete</Button>
```

### Input

Located: `src/renderer/components/ui/input.tsx`

Standard text input with Inter font and consistent styling.

**Usage:**

```tsx
import { Input } from "./components/ui/input";

<Input placeholder="Enter IP address" />
<Input type="password" placeholder="Password" />
<Input disabled value="192.168.1.100" />
```

### Card

Located: `src/renderer/components/ui/card.tsx`

Container component with header, content, and footer sections.

**Components:**

- `Card`: Main container
- `CardHeader`: Header section
- `CardTitle`: Title text
- `CardDescription`: Subtitle/description text
- `CardContent`: Main content area
- `CardFooter`: Footer section with actions

**Usage:**

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./components/ui/card";

<Card>
  <CardHeader>
    <CardTitle>Session Details</CardTitle>
    <CardDescription>HL7 communication session information</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Content goes here</p>
  </CardContent>
</Card>;
```

### Badge

Located: `src/renderer/components/ui/badge.tsx`

Small status indicators and labels.

**Variants:**

- `default`: Primary teal background
- `secondary`: Neutral gray background
- `destructive`: Red background
- `outline`: Border only

**Usage:**

```tsx
import { Badge } from "./components/ui/badge";

<Badge variant="default">Active</Badge>
<Badge variant="destructive">Error</Badge>
<Badge className="bg-hl7-start text-white">Start Marker</Badge>
```

## Adding New Components

To add a new shadcn/ui component:

1. Run the CLI command:

   ```bash
   npx shadcn@latest add <component-name>
   ```

2. The component will be created in `src/renderer/components/ui/`

3. Update the import path in the generated component:

   ```tsx
   import { cn } from "../../utils/cn";
   ```

4. The component will automatically use the custom theme

## Utility Function

### cn (Class Name Utility)

Located: `src/renderer/utils/cn.ts`

Combines class names intelligently, merging Tailwind classes properly.

**Usage:**

```tsx
import { cn } from "./utils/cn";

<div className={cn("base-class", isActive && "active-class", className)} />;
```

## Testing Components

Component tests are located in `src/renderer/components/ui/__tests__/`

**Running tests:**

```bash
npm test
```

**Test example:**

```tsx
import { render, screen } from "@testing-library/react";
import { Button } from "../button";

it("renders button with text", () => {
  render(<Button>Click me</Button>);
  expect(screen.getByRole("button")).toHaveTextContent("Click me");
});
```

## Design System Test Page

A comprehensive test page is available to verify all components and theme configurations:

**Location:** `src/renderer/components/DesignSystemTestPage.tsx`

**To view:**

1. Set `SHOW_DESIGN_SYSTEM_TEST = true` in `src/renderer/App.tsx`
2. Run the application: `npm run dev`
3. The test page displays all colors, typography, components, and spacing

**The test page includes:**

- Complete color palette with hex codes
- Typography scale examples
- All button variants and sizes
- Input states
- Badge variants
- Card examples
- Spacing and shadow demonstrations
- Border radius examples

## Accessibility

All components are built with accessibility in mind:

- **WCAG 2.1 Level AA compliant** color contrast (4.5:1 minimum)
- **Keyboard navigation** fully supported
- **Focus indicators** clearly visible (2px teal outline)
- **ARIA labels** on all interactive elements
- **Screen reader support** through semantic HTML and ARIA attributes

## CSS Variables

Theme colors are defined as HSL CSS variables in `src/renderer/index.css`:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222 47% 11%;
  --primary: 187 100% 42%; /* Brand Teal */
  --primary-foreground: 0 0% 100%;
  /* ... more variables */
}
```

These variables can be customized for dark mode or alternative themes.

## Best Practices

1. **Use semantic color variables** instead of hard-coded colors
2. **Apply spacing scale** consistently (xs, sm, md, lg, xl)
3. **Use component variants** rather than custom styling
4. **Leverage the cn utility** for conditional classes
5. **Test with the DesignSystemTestPage** before deployment
6. **Follow TypeScript strict mode** for type safety
7. **Write tests** for custom components

## Resources

- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Radix UI Documentation](https://www.radix-ui.com/docs/primitives)
- [UX Design Specification](./ux-design-specification.md)

## Version History

| Date       | Version | Changes                              |
| ---------- | ------- | ------------------------------------ |
| 2025-11-06 | 1.0.0   | Initial design system implementation |
