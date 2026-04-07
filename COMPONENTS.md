# Sponexus Component Library

## Overview

This document describes all reusable UI components for the Sponexus platform built with Next.js, TypeScript, and Tailwind CSS.

## Design System

### Colors
- **Primary**: `#F59E0B` (Orange) - Used for CTAs and highlights
- **Background Dark**: `#020617` - Main background
- **Surface Dark**: `#0F172A` - Card surfaces
- **Text Light**: `#FFFFFF` - Primary text
- **Text Muted**: `#9CA3AF` - Secondary text

### Spacing
- Uses Tailwind's 4px grid spacing
- Consistent padding: `px-4 py-3` for standard elements
- Section padding: `py-16` or `py-20`

### Typography
- **Headings**: `font-bold` with sizes 2xl-5xl
- **Body**: `text-base` with `text-text-light` or `text-text-muted`
- **Small**: `text-sm` for secondary info
- **Buttons**: `font-medium`

### Visual Effects
- **Glow**: Orange glow on hover for premium feel
- **Radius**: `rounded-2xl` for cards, `rounded-xl` for inputs/buttons
- **Borders**: `border-white/10` for subtle separation
- **Transitions**: `smooth-transition` class or `duration-300`

---

## Components

### 1. Button

**Purpose**: Reusable button component with multiple variants and sizes

**Props**:
```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}
```

**Usage**:
```tsx
import { Button } from '@/components';

// Primary button
<Button variant="primary" size="md">
  Click Me
</Button>

// With icon
<Button variant="primary" icon={<CheckIcon />}>
  Confirm
</Button>

// Full width
<Button fullWidth variant="secondary">
  Secondary Action
</Button>

// Loading state
<Button loading>
  Processing...
</Button>
```

**Variants**:
- **primary**: Orange gradient with glow on hover - use for main CTAs
- **secondary**: Dark surface with orange border - use for secondary actions
- **ghost**: Transparent with subtle hover - use for tertiary actions

**Sizes**:
- **sm**: `px-4 py-2 text-sm`
- **md**: `px-6 py-3 text-base` (default)
- **lg**: `px-8 py-4 text-lg`

---

### 2. Input

**Purpose**: Styled text input component with label, error handling, and icons

**Props**:
```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  required?: boolean;
  helperText?: string;
}
```

**Usage**:
```tsx
import { Input } from '@/components';

// Basic input
<Input
  type="email"
  placeholder="your@email.com"
  label="Email Address"
/>

// With error
<Input
  type="password"
  label="Password"
  error="Password must be at least 6 characters"
  required
/>

// With hint and helper
<Input
  type="text"
  label="Username"
  hint="3-20 characters"
  helperText="Choose something memorable"
/>

// With icon
<Input
  type="text"
  icon={<SearchIcon />}
  placeholder="Search..."
/>
```

**Features**:
- Auto-generated unique ID if not provided
- Accessible label with required indicator
- Error styling with visual indicator
- Helper text for additional context
- Icon support for left alignment

---

### 3. Navbar

**Purpose**: Premium sticky navigation bar with mobile responsiveness

**Props**:
```typescript
// No props - uses localStorage for user state
```

**Features**:
- Sticky positioning at top
- Responsive hamburger menu on mobile
- User authentication state handling
- Links for Events, Sponsors, Match
- Login/Register or Dashboard/Logout based on auth state

**Usage**:
```tsx
import { Navbar } from '@/components';

// Just include in layout
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}
```

---

### 4. Footer

**Purpose**: Comprehensive footer with links, branding, and social

**Features**:
- Brand section with tagline
- Product links (Events, Sponsors, Matching, Dashboard)
- Company links (About, Blog, Careers, Contact)
- Legal links (Privacy, Terms, Cookie, Disclaimer)
- Social media links
- Copyright notice with current year
- Responsive grid layout

**Usage**:
```tsx
import { Footer } from '@/components';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
```

---

### 5. SectionHeading

**Purpose**: Reusable section heading component for landing pages

**Props**:
```typescript
interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
}
```

**Usage**:
```tsx
import { SectionHeading } from '@/components';

<SectionHeading
  title="Find Perfect Matches"
  subtitle="Our algorithm analyzes multiple factors to find ideal sponsorship partnerships"
  align="center"
/>
```

**Features**:
- Gradient text for title automatically applied
- Optional subtitle in muted color
- Text alignment control
- Custom className support

---

### 6. EventCard

**Purpose**: Premium card component for displaying events

**Props**:
```typescript
interface EventCardProps {
  event: Event;
  matchScore?: number;
  onAction?: () => void;
  actionLabel?: string;
}
```

**Usage**:
```tsx
import { EventCard } from '@/components';

<EventCard
  event={eventData}
  matchScore={85}
  actionLabel="View Event"
  onAction={() => navigateToEvent()}
/>
```

**Features**:
- Event image with lazy loading
- Optional match score badge (top-right)
- Title, description, and category display
- Category tags with truncation
- Details grid (Date, Budget, Location, Attendees)
- Full height for grid layouts
- Hover animations with glow effect

---

### 7. SponsorCard

**Purpose**: Premium card component for displaying sponsors

**Props**:
```typescript
interface SponsorCardProps {
  sponsor: Sponsor;
  matchScore?: number;
  onAction?: () => void;
  actionLabel?: string;
}
```

**Usage**:
```tsx
import { SponsorCard } from '@/components';

<SponsorCard
  sponsor={sponsorData}
  matchScore={92}
/>
```

**Features**:
- Logo display with centered image handling
- Optional match score badge
- Company name and website link
- Description with truncation
- Category tags
- Details grid (Budget, Status, Locations)
- Full height for grid layouts
- Premium hover animations

---

### 8. EmptyState

**Purpose**: Reusable component for empty data states

**Props**:
```typescript
interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}
```

**Usage**:
```tsx
import { EmptyState } from '@/components';

<EmptyState
  title="No Events Found"
  description="Create your first event to get started with Sponexus"
  icon="📅"
  actionLabel="Create Event"
  onAction={() => router.push('/events/create')}
/>
```

**Features**:
- Icon support (emoji or React components)
- Centered card layout
- Optional action button
- Custom className support

---

### 9. Loader

**Purpose**: Premium spinner/loader component

**Props**:
```typescript
interface LoaderProps {
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
  message?: string;
  className?: string;
}
```

**Usage**:
```tsx
import { Loader } from '@/components';

// Inline loader
<Loader size="md" message="Loading..." />

// Full screen modal
<Loader fullScreen size="lg" message="Processing request..." />

// Small spinner
<Loader size="sm" />
```

**Features**:
- Three size options
- Full-screen modal option with backdrop blur
- Optional loading message
- Premium orange gradient animation
- Custom sizing via className

---

## Usage Patterns

### Grid Layouts

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {items.map(item => (
    <EventCard key={item.id} event={item} />
  ))}
</div>
```

### Form Sections

```tsx
<form className="space-y-4">
  <Input
    label="Email"
    type="email"
    required
    error={errors.email}
  />
  <Input
    label="Password"
    type="password"
    required
    error={errors.password}
  />
  <Button type="submit" fullWidth>
    Sign In
  </Button>
</form>
```

### Page Scaffolding

```tsx
export default function Page() {
  return (
    <>
      <SectionHeading
        title="Our Events"
        subtitle="Explore upcoming events"
      />
      
      <div className="grid grid-cols-3 gap-6">
        {/* Content */}
      </div>
    </>
  );
}
```

---

## Styling Guidelines

### Consistency
- Always use Sponexus color tokens
- Use `smooth-transition` for all hover effects
- Apply `rounded-2xl` for cards
- Use `text-text-light` and `text-text-muted`

### Responsiveness
- Design mobile-first
- Use `hidden md:flex` for desktop-only sections
- Test all components on mobile

### Accessibility
- Use semantic HTML (`<button>`, `<form>`, etc.)
- Include `aria-label` on icon buttons
- Ensure color contrast meets WCAG standards
- Use proper `<label>` associations in forms

---

## Export/Import

### From Components Package

```typescript
// Import individual components
import { Button } from '@/components';
import { Input } from '@/components';

// Or import all
import * as Components from '@/components';

// Or use index export for convenience
import { Button, Input, Navbar } from '@/components';
```

---

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

---

## Performance Notes

- Components use CSS transitions (hardware accelerated)
- No external dependencies added
- Minimal bundle impact
- Lazy loading support for images in cards

---

## Future Enhancements

- [ ] Theme switching support
- [ ] Storybook integration
- [ ] Component prop validation
- [ ] Animation variants
- [ ] Dark/Light mode toggle
