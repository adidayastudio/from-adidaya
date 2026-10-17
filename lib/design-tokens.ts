/**
 * Design Tokens - Concentric Radius System
 * 
 * Base anchor: Button = 12px
 * Each layer adds ~4px for concentric alignment
 * 
 * Layer hierarchy (inside → outside):
 * - L0: Buttons, badges, small elements
 * - L1: Cards, GlassCards (contains buttons)
 * - L2: Content containers, wrappers
 * - L3: Page-level wrappers (if any)
 */

export const RADIUS = {
    // Layer 0 - Smallest elements (buttons, badges, inputs)
    button: '12px',      // rounded-xl equivalent
    badge: '9999px',     // rounded-full for pills
    input: '12px',

    // Layer 1 - Cards (button + 4 = 16)
    card: '16px',        // GlassCard, SummaryCard - rounded-2xl

    // Layer 2 - Containers (card + 8 = 24)
    container: '24px',   // Content wrapper, Sidebar - rounded-3xl

    // Layer 3 - Page level (if needed)
    page: '24px',

    // Special
    full: '9999px',      // Perfect circle
    none: '0px',
} as const;

// Tailwind class mappings for reference
export const RADIUS_CLASSES = {
    button: 'rounded-xl',
    badge: 'rounded-full',
    input: 'rounded-xl',
    card: 'rounded-xl',
    container: 'rounded-2xl',
    page: 'rounded-[20px]',
    full: 'rounded-full',
    none: 'rounded-none',
} as const;

// Height tokens for buttons
export const BUTTON_HEIGHT = {
    sm: '32px',    // py-1.5
    md: '40px',    // py-2.5
    lg: '48px',    // py-3
} as const;

export type RadiusKey = keyof typeof RADIUS;
export type RadiusClass = keyof typeof RADIUS_CLASSES;
