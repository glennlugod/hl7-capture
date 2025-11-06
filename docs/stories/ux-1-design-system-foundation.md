# Story: UX Design System Foundation

Status: review

## Story

As a **developer**,
I want **to establish the visual foundation of the application using the shadcn/ui design system**,
so that **all subsequent UI components are built with a consistent, professional, and accessible aesthetic that promotes a calm and focused user experience**.

## Acceptance Criteria

1.  **AC #1: shadcn/ui Integration**
    - Given: The project is set up with React and Tailwind CSS.
    - When: The developer runs the shadcn/ui initialization command.
    - Then: All necessary configuration files (`tailwind.config.js`, `postcss.config.js`, `components.json`) are created and correctly configured.
    - Verified: The `components` directory is created and the `Button` component can be added and rendered successfully.

2.  **AC #2: Theme and Color System Implementation**
    - Given: The `ux-design-specification.md` defines the color palette.
    - When: The developer configures the Tailwind CSS theme.
    - Then: All primary, neutral, semantic, and data visualization colors are available as CSS variables and Tailwind utility classes.
    - Verified: A test page demonstrates the correct application of the brand blue (`#1e3a5f`), brand teal (`#00bcd4`), and all semantic colors.

3.  **AC #3: Typography System Setup**
    - Given: The `ux-design-specification.md` defines the font families and type scale.
    - When: The developer configures the Tailwind CSS theme.
    - Then: The `Inter` font is used for the interface and `JetBrains Mono` for monospace text. All type scale classes (Display, H1, H2, etc.) are available.
    - Verified: A test page displays text using the correct fonts and sizes for each heading and body style.

4.  **AC #4: Spacing, Shadows, and Border Radius Configuration**
    - Given: The `ux-design-specification.md` defines the spacing, shadow, and border radius systems.
    - When: The developer configures the Tailwind CSS theme.
    - Then: The 4px base unit spacing scale, subtle shadow variants, and consistent border radius values are available as utility classes.
    - Verified: A test page demonstrates components using the correct spacing, shadows, and border radii as defined in the design spec.

5.  **AC #5: Base Component Styling**
    - Given: shadcn/ui is initialized and the theme is configured.
    - When: The developer adds the `Button`, `Input`, `Card`, and `Badge` components.
    - Then: These components automatically adopt the custom theme (colors, fonts, spacing, etc.) without needing manual style overrides.
    - Verified: A `Button` component displays with the brand teal background, a `Card` has the correct border radius and shadow, and an `Input` field uses the `Inter` font.

## Tasks / Subtasks

### Phase 1: Setup and Initialization

- [x] Install `tailwindcss`, `postcss`, and `autoprefixer`.
- [x] Initialize Tailwind CSS in the project.
- [x] Run `npx shadcn-ui@latest init` to set up the shadcn/ui configuration.
- [x] Verify the creation of `components.json` and updates to `tailwind.config.js`.

### Phase 2: Theme Configuration

- [x] Add the complete color palette from the UX design spec to `tailwind.config.js`.
- [x] Configure the font families (`Inter` and `JetBrains Mono`) in `tailwind.config.js`.
- [x] Implement the full type scale (Display, H1, H2, etc.) in `tailwind.config.js`.
- [x] Configure the spacing, shadow, and border radius systems in `tailwind.config.js`.

### Phase 3: Component Verification

- [x] Add the `Button` component using `npx shadcn-ui@latest add button`.
- [x] Add the `Input` component using `npx shadcn-ui@latest add input`.
- [x] Add the `Card` component using `npx shadcn-ui@latest add card`.
- [x] Add the `Badge` component using `npx shadcn-ui@latest add badge`.
- [x] Create a new React component (`DesignSystemTestPage.tsx`) to render and visually verify all configured components and styles.

### Phase 4: Documentation

- [x] Create a `DESIGN_SYSTEM.md` file in the `docs` folder.
- [x] Document the key decisions, theme values, and how to add new components.

## Dev Notes

### Technical Summary

This story establishes the foundational design system for the entire application. By integrating `shadcn/ui` and configuring it according to the `ux-design-specification.md`, we ensure that all future UI development will be consistent, professional, and efficient. The core of this task is translating the design principles from the UX spec into a functional Tailwind CSS theme.

### Learnings from Previous Story

- **Project Structure:** The existing file structure (`src/renderer/components`, etc.) is well-established and should be used for any new components, including the test page.
- **Component-Based Architecture:** The previous story successfully implemented a component-based architecture with React. This story will build upon that by providing a standardized set of base components.
- **Styling:** The previous story used a single `App.css` file. This story will introduce a more robust, utility-first styling approach with Tailwind CSS, which will supersede the existing CSS file for new components.

### References

- **Story Context:** [ux-1-design-system-foundation.context.xml](./ux-1-design-system-foundation.context.xml) - The dynamic context for this story.
- **UX Design Specification:** [ux-design-specification.md](../ux-design-specification.md) - The single source of truth for all visual design decisions.
- **shadcn/ui Documentation:** [https://ui.shadcn.com/](https://ui.shadcn.com/) - For installation and component usage instructions.
