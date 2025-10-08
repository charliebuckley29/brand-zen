/**
 * Enhanced Design System
 * 
 * Centralized design tokens and utilities for consistent UI across the application.
 * This system extends the base shadcn/ui design system with additional semantic
 * colors, typography scales, and spacing patterns.
 */

// Enhanced Color Palette
export const colors = {
  // Primary Brand Colors
  primary: {
    50: 'hsl(210 40% 98%)',    // Lightest backgrounds
    100: 'hsl(210 40% 96%)',   // Light backgrounds
    200: 'hsl(214 32% 91%)',   // Subtle borders
    300: 'hsl(213 27% 84%)',   // Disabled states
    400: 'hsl(215 20% 65%)',   // Placeholder text
    500: 'hsl(215 16% 47%)',   // Muted text
    600: 'hsl(215 19% 35%)',   // Secondary text
    700: 'hsl(215 25% 27%)',   // Primary text
    800: 'hsl(217 33% 17%)',   // Dark text
    900: 'hsl(222 84% 5%)',    // Darkest text
    DEFAULT: 'hsl(222 47% 11%)',
    foreground: 'hsl(210 40% 98%)'
  },

  // Semantic Status Colors
  success: {
    50: 'hsl(138 76% 97%)',
    100: 'hsl(141 84% 93%)',
    200: 'hsl(141 79% 85%)',
    300: 'hsl(142 76% 73%)',
    400: 'hsl(142 71% 45%)',
    500: 'hsl(142 69% 58%)',
    600: 'hsl(142 71% 45%)',
    700: 'hsl(142 76% 36%)',
    800: 'hsl(143 64% 24%)',
    900: 'hsl(144 61% 20%)',
    DEFAULT: 'hsl(142 69% 58%)',
    foreground: 'hsl(210 40% 98%)'
  },

  warning: {
    50: 'hsl(48 96% 89%)',
    100: 'hsl(48 96% 77%)',
    200: 'hsl(48 96% 71%)',
    300: 'hsl(46 95% 53%)',
    400: 'hsl(43 96% 56%)',
    500: 'hsl(38 92% 50%)',
    600: 'hsl(32 95% 44%)',
    700: 'hsl(26 90% 37%)',
    800: 'hsl(23 83% 31%)',
    900: 'hsl(22 78% 26%)',
    DEFAULT: 'hsl(48 96% 53%)',
    foreground: 'hsl(222 84% 5%)'
  },

  danger: {
    50: 'hsl(0 86% 97%)',
    100: 'hsl(0 93% 94%)',
    200: 'hsl(0 96% 89%)',
    300: 'hsl(0 94% 82%)',
    400: 'hsl(0 91% 71%)',
    500: 'hsl(0 84% 60%)',
    600: 'hsl(0 72% 51%)',
    700: 'hsl(0 74% 42%)',
    800: 'hsl(0 70% 35%)',
    900: 'hsl(0 63% 31%)',
    DEFAULT: 'hsl(0 84% 60%)',
    foreground: 'hsl(210 40% 98%)'
  },

  info: {
    50: 'hsl(213 94% 93%)',
    100: 'hsl(213 97% 87%)',
    200: 'hsl(212 96% 78%)',
    300: 'hsl(213 94% 68%)',
    400: 'hsl(213 91% 60%)',
    500: 'hsl(213 94% 68%)',
    600: 'hsl(213 91% 60%)',
    700: 'hsl(213 87% 47%)',
    800: 'hsl(213 85% 39%)',
    900: 'hsl(213 84% 32%)',
    DEFAULT: 'hsl(213 94% 68%)',
    foreground: 'hsl(210 40% 98%)'
  }
};

// Typography Scale
export const typography = {
  // Headings
  h1: 'text-3xl sm:text-4xl font-bold tracking-tight',
  h2: 'text-2xl sm:text-3xl font-semibold tracking-tight',
  h3: 'text-xl sm:text-2xl font-semibold',
  h4: 'text-lg sm:text-xl font-medium',
  h5: 'text-base sm:text-lg font-medium',
  h6: 'text-sm sm:text-base font-medium',

  // Body text
  body: 'text-base leading-7',
  bodySmall: 'text-sm leading-6',
  caption: 'text-xs leading-5',

  // Special text
  lead: 'text-lg sm:text-xl text-muted-foreground leading-8',
  muted: 'text-sm text-muted-foreground',

  // Labels
  label: 'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
  labelSmall: 'text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
};

// Spacing System (8px-based)
export const spacing = {
  xs: '4px',    // 0.5 units
  sm: '8px',    // 1 unit
  md: '16px',   // 2 units
  lg: '24px',   // 3 units
  xl: '32px',   // 4 units
  '2xl': '48px', // 6 units
  '3xl': '64px', // 8 units
  '4xl': '96px'  // 12 units
};

// Layout System
export const layout = {
  // Container widths
  container: {
    sm: 'max-w-2xl',
    md: 'max-w-4xl',
    lg: 'max-w-6xl',
    xl: 'max-w-7xl',
    full: 'max-w-full'
  },

  // Page layouts
  pageContainer: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
  contentContainer: 'max-w-4xl mx-auto px-4 sm:px-6',
  formContainer: 'max-w-2xl mx-auto px-4 sm:px-6',

  // Grid patterns
  grid: {
    twoColumn: 'grid grid-cols-1 lg:grid-cols-2 gap-6',
    threeColumn: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6',
    autoFit: 'grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-6',
    autoFill: 'grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4'
  },

  // Flex patterns
  flex: {
    center: 'flex items-center justify-center',
    between: 'flex items-center justify-between',
    start: 'flex items-center justify-start',
    end: 'flex items-center justify-end'
  }
};

// Component Variants
export const components = {
  // Card variants
  card: {
    default: 'rounded-lg border bg-card text-card-foreground shadow-sm',
    elevated: 'rounded-lg border bg-card text-card-foreground shadow-md',
    outlined: 'rounded-lg border-2 border-border bg-card text-card-foreground',
    interactive: 'rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow cursor-pointer',
    compact: 'rounded-lg border bg-card text-card-foreground shadow-sm p-4'
  },

  // Button variants
  button: {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    success: 'bg-success text-success-foreground hover:bg-success/90',
    warning: 'bg-warning text-warning-foreground hover:bg-warning/90',
    danger: 'bg-danger text-danger-foreground hover:bg-danger/90',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground'
  },

  // Status indicators
  status: {
    emailConfirmed: { 
      icon: 'MailCheck', 
      color: 'text-success-600 bg-success-50 border-success-200',
      label: 'Confirmed',
      description: 'Email verified'
    },
    emailUnconfirmed: { 
      icon: 'Mail', 
      color: 'text-warning-600 bg-warning-50 border-warning-200',
      label: 'Unconfirmed',
      description: 'Email pending verification'
    },
    approved: { 
      icon: 'CheckCircle', 
      color: 'text-success-600 bg-success-50 border-success-200',
      label: 'Approved',
      description: 'Account active'
    },
    pending: { 
      icon: 'Clock', 
      color: 'text-warning-600 bg-warning-50 border-warning-200',
      label: 'Pending',
      description: 'Awaiting approval'
    },
    rejected: { 
      icon: 'XCircle', 
      color: 'text-danger-600 bg-danger-50 border-danger-200',
      label: 'Rejected',
      description: 'Account rejected'
    },
    suspended: { 
      icon: 'AlertTriangle', 
      color: 'text-danger-600 bg-danger-50 border-danger-200',
      label: 'Suspended',
      description: 'Account suspended'
    }
  }
};

// Animation and Transitions
export const animations = {
  // Transitions
  transition: {
    fast: 'transition-all duration-150 ease-in-out',
    normal: 'transition-all duration-200 ease-in-out',
    slow: 'transition-all duration-300 ease-in-out'
  },

  // Hover effects
  hover: {
    lift: 'hover:shadow-md hover:-translate-y-0.5',
    scale: 'hover:scale-105',
    glow: 'hover:shadow-lg hover:shadow-primary/25'
  },

  // Focus states
  focus: {
    ring: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    ringPrimary: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
  }
};

// Utility Functions
export const utils = {
  // Generate consistent spacing
  spacing: (size: keyof typeof spacing) => spacing[size],

  // Generate typography classes
  text: (variant: keyof typeof typography) => typography[variant],

  // Generate color classes
  color: (color: string, variant: string = 'DEFAULT') => {
    const colorObj = colors[color as keyof typeof colors];
    return colorObj ? colorObj[variant as keyof typeof colorObj] || colorObj.DEFAULT : '';
  },

  // Generate layout classes
  layout: (type: keyof typeof layout) => layout[type],

  // Generate component classes
  component: (component: keyof typeof components, variant: string) => {
    const componentObj = components[component as keyof typeof components];
    return componentObj && variant in componentObj ? componentObj[variant as keyof typeof componentObj] : '';
  }
};

// Export default configuration
export const designSystem = {
  colors,
  typography,
  spacing,
  layout,
  components,
  animations,
  utils
};

export default designSystem;
