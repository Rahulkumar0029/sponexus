# Sponexus Authentication System

## Overview

Complete production-ready authentication system for Sponexus using Next.js, NextAuth.js, TypeScript, and MongoDB.

---

## Features

✅ **Registration** - Users can create accounts with role selection (Organizer or Sponsor)
✅ **Login** - Secure email/password authentication
✅ **Role-Based** - Support for ORGANIZER and SPONSOR roles
✅ **Session Management** - JWT-based sessions with 30-day expiration
✅ **Password Security** - bcryptjs hashing with 10-round salts
✅ **Validation** - Comprehensive client and server-side validation
✅ **Route Protection** - Middleware for protecting authenticated routes
✅ **Error Handling** - Detailed validation errors and user feedback
✅ **Premium UI** - Dark theme auth pages with Sponexus branding

---

## Architecture

### Components

```
Authentication System
├── User Interface (Frontend)
│   ├── app/(auth)/register/page.tsx - Registration form
│   ├── app/(auth)/login/page.tsx - Login form
│   └── components/
│       ├── Input.tsx - Form input with error display
│       └── Button.tsx - CTA button with loading state
│
├── API Routes (Backend)
│   ├── app/api/auth/register/route.ts - User registration endpoint
│   ├── app/api/auth/login/route.ts - User login endpoint
│   └── app/api/auth/[...nextauth]/route.ts - NextAuth configuration
│
├── Data Models
│   ├── models/User.ts - MongoDB User schema
│   └── types/user.ts - TypeScript type definitions
│
├── Utilities
│   ├── lib/auth.ts - Password hashing & JWT generation
│   ├── lib/validations.ts - Input validation logic
│   ├── lib/server-auth.ts - Server-side auth helpers
│   └── lib/db.ts - MongoDB connection
│
├── Hooks
│   └── hooks/useAuth.ts - Client-side auth state management
│
└── Middleware
    └── middleware.ts - Route protection middleware
```

---

## Database Schema

### User Model

```typescript
{
  email: string              // Unique, lowercase
  password: string           // bcryptjs hashed
  role: 'ORGANIZER' | 'SPONSOR'
  firstName: string          // 2-50 chars
  lastName: string           // 2-50 chars
  companyName: string        // 2-100 chars
  avatar?: string            // URL to profile image
  bio?: string               // User bio/description
  phone?: string             // Contact phone
  createdAt: Date            // Auto-created
  updatedAt: Date            // Auto-updated
}
```

---

## API Endpoints

### POST /api/auth/register

Register a new user

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "confirmPassword": "securepassword",
  "firstName": "John",
  "lastName": "Doe",
  "companyName": "Tech Corp",
  "role": "ORGANIZER"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "_id": "...",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "companyName": "Tech Corp",
    "role": "ORGANIZER",
    "createdAt": "2024-04-06T..."
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (Error):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Please enter a valid email address"
    }
  ]
}
```

**Status Codes:**
- 201: User registered successfully
- 400: Validation error
- 409: Email already registered
- 500: Server error

---

### POST /api/auth/login

Authenticate user

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "_id": "...",
    "email": "user@example.com",
    "firstName": "John",
    "role": "ORGANIZER"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Status Codes:**
- 200: Login successful
- 400: Validation error
- 401: Invalid credentials
- 500: Server error

---

## Authentication Flow

### Registration Flow

```
1. User fills registration form
   ├─ Client validation (lib/validations.ts)
   └─ Display errors if invalid

2. Submit to /api/auth/register
   ├─ Server validation
   ├─ Check duplicate email
   ├─ Hash password with bcryptjs
   ├─ Create user in MongoDB
   └─ Generate JWT token

3. Store credentials in localStorage
   ├─ Save user data
   └─ Save JWT token

4. Redirect to role-specific page
   ├─ ORGANIZER → /events/create
   └─ SPONSOR → /sponsors/create
```

### Login Flow

```
1. User submits credentials
   ├─ Client validation
   └─ Display errors if invalid

2. Submit to /api/auth/login
   ├─ Server validation
   ├─ Find user by email
   ├─ Compare password with hash
   └─ Generate JWT token

3. Store in localStorage
   ├─ Save user data
   └─ Save JWT token

4. Redirect to dashboard
   └─ /dashboard
```

### Protected Route Access

```
1. User navigates to protected route (e.g., /dashboard)
   ├─ Middleware checks session
   ├─ If no session: redirect to /login
   └─ If session exists: render page

2. Page can access user data from:
   ├─ localStorage (client)
   ├─ useAuth() hook (client)
   ├─ getCurrentUser() (server)
   └─ getServerSession() (server)
```

---

## Validation Rules

### Email Validation
- Required
- Must be valid email format
- Converted to lowercase for uniqueness
- Trimmed of whitespace

### Password Validation
- Required
- Minimum 6 characters
- Maximum 128 characters
- Hashed with bcryptjs (10 rounds)

### Name Validation
- Required (first & last name)
- 2-50 characters each
- Only letters, spaces, hyphens, apostrophes

### Company Name Validation
- Required
- 2-100 characters
- Trimmed of whitespace

### Role Validation
- Required
- Must be: `ORGANIZER` or `SPONSOR`
- Converted to uppercase

---

## Client-Side Usage

### useAuth Hook

```typescript
import { useAuth } from '@/hooks/useAuth';

export function MyComponent() {
  const { user, isAuthenticated, loading, login, logout } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (!isAuthenticated) {
    return <div>Please log in</div>;
  }

  return (
    <div>
      <p>Hello, {user?.firstName}</p>
      <p>Role: {user?.role}</p>
      <button onClick={logout}>Sign Out</button>
    </div>
  );
}
```

### Hook API

```typescript
useAuth() => {
  // State
  user: User | null              // Current user
  token: string | null           // JWT token
  loading: boolean               // Loading state
  error: string | null           // Error message
  isAuthenticated: boolean       // Session status

  // Methods
  register(data)                 // Register new user
  login(email, password)         // Login user
  logout()                       // Logout user
  clearError()                   // Clear error message
}
```

---

## Server-Side Usage

### Get Current Session

```typescript
// app/dashboard/page.tsx
import { getCurrentSession } from '@/lib/server-auth';

export default async function DashboardPage() {
  const session = await getCurrentSession();

  if (!session) {
    return <div>Not authenticated</div>;
  }

  return <div>Welcome, {session.user?.email}</div>;
}
```

### Check Role

```typescript
import { requireRole } from '@/lib/server-auth';

export default async function OrganizerPage() {
  const user = await requireRole('ORGANIZER');

  return <div>Organizer Dashboard</div>;
}
```

### In API Routes

```typescript
// app/api/events/route.ts
import { requireAuth } from '@/lib/server-auth';

export async function POST(request: Request) {
  const session = await requireAuth(); // Throws if not authenticated

  const userId = (session.user as any).id;
  // ... create event
}
```

---

## Environment Variables

```
# .env.local

# MongoDB configuration
MONGODB_URI=mongodb://localhost:27017/sponexus

# NextAuth configuration
NEXTAUTH_SECRET=your-secret-key-here-change-in-production
NEXTAUTH_URL=http://localhost:3000

# In production, also set:
# NEXTAUTH_URL=https://yourdomain.com
```

Generate `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

---

## Security Features

### Password Security
- Hashed with bcryptjs (10 rounds)
- Never stored in plaintext
- Securely compared on login

### Session Security
- JWT-based sessions
- 30-day expiration
- Signed with NEXTAUTH_SECRET
- HTTP-only cookie support

### Route Protection
- Middleware protects /dashboard, /events, /sponsors, /match, /settings
- Automatic redirect to /login if unauthenticated
- Server-side validation on all API routes

### Input Validation
- Client-side validation on forms
- Server-side validation on all endpoints
- Sanitized and trimmed inputs
- Type-safe TypeScript validation

### CORS & XSS Protection
- NextAuth handles CSRF protection
- No sensitive data in cookies
- CSP headers recommended for production

---

## Error Handling

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| Email already registered | Duplicate email | Use different email |
| Invalid credentials | Wrong password or email | Check credentials |
| Password must be at least 6 chars | Too short | Use longer password |
| Please enter a valid email | Invalid format | Use proper email format |
| Missing required fields | Incomplete form | Fill all fields |

### Error Responses

All API errors follow this format:
```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    { "field": "fieldName", "message": "Field error" }
  ]
}
```

---

## Testing

### Test Accounts

Create test users in MongoDB or use the registration form:

```javascript
// Test Organizer
{
  email: "organizer@sponexus.com",
  password: "test123456",
  role: "ORGANIZER",
  firstName: "Test",
  lastName: "Organizer",
  companyName: "Test Company"
}

// Test Sponsor
{
  email: "sponsor@sponexus.com",
  password: "test123456",
  role: "SPONSOR",
  firstName: "Test",
  lastName: "Sponsor",
  companyName: "Test Sponsor Inc"
}
```

### Manual Testing Checklist

- [ ] Register new user (ORGANIZER)
- [ ] Register new user (SPONSOR)
- [ ] Login with valid credentials
- [ ] Login with invalid email
- [ ] Login with invalid password
- [ ] Validate all form fields
- [ ] Check localStorage persistence
- [ ] Test logout functionality
- [ ] Access protected routes
- [ ] Redirect to login when not authenticated
- [ ] Test role-specific redirects
- [ ] Verify JWT token generation

---

## Troubleshooting

### Users Can't Login After Registration

**Check:**
1. Verify MongoDB connection is working
2. Check user was created in database
3. Verify password hashing is correct
4. Check env variables are set

### Session Not Persisting

**Check:**
1. localStorage is not disabled
2. NEXTAUTH_SECRET is set
3. NEXTAUTH_URL is correct
4. Cookies are not blocked

### Protected Routes Not Working

**Check:**
1. Middleware is enabled
2. Route pattern matches in config
3. NextAuth is properly configured
4. Session is valid and not expired

### Password Comparison Failing

**Check:**
1. bcryptjs is installed
2. Password is properly hashed
3. No extra whitespace in passwords
4. Database password field has correct type

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] Set strong `NEXTAUTH_SECRET` (use `openssl rand -base64 32`)
- [ ] Set correct `NEXTAUTH_URL` (your domain)
- [ ] Enable HTTPS for production
- [ ] Set strong MongoDB password
- [ ] Configure environment variables
- [ ] Test all auth flows
- [ ] Set up monitoring/logging
- [ ] Configure backups
- [ ] Test email verification (if added)
- [ ] Review security policies

### Environment Variables for Production

```
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/sponexus
NEXTAUTH_SECRET=<generate-with-openssl>
NEXTAUTH_URL=https://yourdomain.com
NODE_ENV=production
```

---

## Future Enhancements

- [ ] Email verification on registration
- [ ] Password reset/recovery flow
- [ ] Social login (Google, GitHub, etc.)
- [ ] Two-factor authentication (2FA)
- [ ] Account linking
- [ ] Admin role with dashboard
- [ ] User profile management
- [ ] Account deactivation
- [ ] Session management (multiple devices)
- [ ] Activity logging

---

## Support

For issues or questions:
1. Check middleware.ts configuration
2. Verify NextAuth setup
3. Check MongoDB connection
4. Review validation rules
5. Check environment variables
6. Review logs in console
