# Sponexus™ – Event Sponsorship Marketplace

**Founder:** Rahul Kumar  
**Created On:** 2026  
**Ownership Claim:** This repository, concept, and implementation of Sponexus™ is originally created and owned by Rahul Kumar. All rights reserved.

---

⚠️ This project represents an original concept, system design, and implementation. Unauthorized copying, redistribution, or commercial use without permission is not allowed.

## Intellectual Ownership

Sponexus is an independently developed platform by Rahul Kumar.

This repository serves as a timestamped proof of:
- Idea origination
- System architecture
- Matching logic
- Technical implementation

All intellectual property rights belong to the creator unless otherwise licensed.

## Vision

To become the default infrastructure layer for event sponsorship discovery, enabling seamless partnerships between brands and organizers across industries.

## Overview

Sponexus is a production-ready two-sided marketplace designed to solve the inefficiencies in event sponsorship discovery.

It connects event organizers with relevant sponsors using a structured matching system based on:

- Budget compatibility
- Category alignment
- Target audience fit
- Geographic relevance

Unlike traditional sponsorship outreach, Sponexus enables data-driven partnership discovery, reducing time, increasing relevance, and improving deal success rates.

## 🎯 Core Features

### 1. Authentication System
- User registration with role selection (Organizer / Sponsor)
- Secure login with JWT tokens
- Persistent sessions with localStorage
- Password hashing with bcryptjs

### 2. Event Management
- Create and publish events
- Detailed event information (budget, categories, audience, dates)
- Event listing with pagination
- Event detail pages with sponsorship matches

### 3. Sponsor Management
- Sponsor profile creation
- Sponsorship preferences and budget management
- Sponsor directory listing
- Sponsor detail pages with matching events

### 4. ## Smart Matching Engine (Core Innovation)

Sponexus uses a weighted scoring algorithm to rank sponsor-event compatibility:

Score = (Budget × 30%) + (Category × 30%) + (Audience × 20%) + (Location × 20%)

Each match includes:
- Score (0–100)
- Match quality classification
- Factor-wise breakdown
- Reasoning layer (why this match exists)

This system ensures intelligent discovery instead of random listings.

Matches are automatically generated and ranked for better discovery.

### 5. Dashboard
- Role-specific dashboards (Organizer vs Sponsor)
- Quick stats and actions
- Personalized content and recommendations

### 6. Additional Pages
- Landing page with problem/solution messaging
- Events directory with filtering
- Sponsors directory with discovery
- Match recommendation page
- Settings and profile management

## Unique Value Proposition

- Intelligent sponsor-event matching (not just listings)
- Dual-sided marketplace optimization
- Data-driven decision making
- Scalable SaaS-ready architecture

## 🏗️ Tech Stack

- **Frontend**: Next.js 14 with React 18
- **Styling**: Tailwind CSS with custom dark theme
- **Backend**: Next.js API Routes
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Custom JWT + bcryptjs
- **Language**: TypeScript throughout

## 📁 Project Structure

```
sponexus/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── dashboard/page.tsx
│   ├── events/
│   │   ├── page.tsx (listing)
│   │   ├── create/page.tsx
│   │   └── [id]/page.tsx (detail)
│   ├── sponsors/
│   │   ├── page.tsx (listing)
│   │   ├── create/page.tsx
│   │   └── [id]/page.tsx (detail)
│   ├── match/page.tsx
│   ├── settings/page.tsx
│   ├── api/
│   │   ├── auth/
│   │   ├── events/
│   │   ├── sponsors/
│   │   └── match/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── Navbar.tsx
│   ├── Footer.tsx
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── EventCard.tsx
│   └── SponsorCard.tsx
├── models/
│   ├── User.ts
│   ├── Event.ts
│   ├── Sponsor.ts
│   └── Deal.ts (Matches)
├── lib/
│   ├── db.ts (MongoDB connection)
│   ├── auth.ts (auth utilities)
│   └── matcher.ts (matching engine)
├── hooks/
│   ├── useAuth.ts
│   ├── useFetch.ts
│   └── useMatch.ts
├── types/
│   ├── user.ts
│   ├── event.ts
│   ├── sponsor.ts
│   └── match.ts
└── public/

```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Set up environment variables in `.env.local`:
```
MONGODB_URI=mongodb://localhost:27017/sponexus
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000
```

4. Start MongoDB locally or update the connection string to Atlas

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🎨 Design System

### Colors
- **Primary**: #F59E0B (Orange)
- **Background**: #020617 (Dark Base), #0F172A (Dark Layer)
- **Text**: #FFFFFF (Light), #9CA3AF (Muted)

### Components
- Cards with subtle borders and glow effects
- Gradient buttons (orange to blue)
- Glass-morphism effects for visual hierarchy
- Smooth transitions on all interactive elements

### Spacing & Typography
- Consistent 4px grid spacing
- Clear visual hierarchy with semantic HTML
- Responsive design (mobile-first)

## 🧠 Matching Algorithm

The matching engine is the heart of Sponexus. It analyzes multiple dimensions:

```typescript
Score = (Budget_Match × 0.30) + 
        (Category_Match × 0.30) + 
        (Audience_Match × 0.20) + 
        (Location_Match × 0.20)
```

- Scores ≥ 85: Excellent Match
- Scores ≥ 70: Good Match
- Scores ≥ 50: Moderate Match
- Scores ≥ 30: Fair Match
- Scores < 30: Poor Match

## 📊 Database Models

### User
- Email (unique)
- Password (hashed)
- Role (ORGANIZER | SPONSOR)
- Personal info (firstName, lastName, companyName)

### Event
- Title, description
- Organizer reference
- Categories, target audience
- Location, budget, dates
- Attendee count
- Status (DRAFT | PUBLISHED | ONGOING | COMPLETED | CANCELLED)

### Sponsor
- Company info
- Categories, target audience
- Locations (geographic preferences)
- Budget
- Status (ACTIVE | INACTIVE | PAUSED)

### Match
- Event & Sponsor references
- Match score (0-100)
- Quality rating
- Reasons for match
- Breakdown by factor
- Status tracking

## 🔐 Security

- Passwords hashed with bcryptjs
- JWT tokens for sessions
- Protected routes require authentication
- Environment variables for secrets
- MongoDB connection pooling

## Future Enhancements

- [ ] In-app messaging system
- [ ] Video calls/demos
- [ ] Payment processing
- [ ] Contract management
- [ ] Advanced analytics dashboard
- [ ] Email notifications
- [ ] Real-time notifications
- [ ] User reviews & ratings
- [ ] Admin panel
- [ ] AI-powered recommendations

## 📝 License

MIT

## 🤝 Support

For issues or questions, please open an issue in the repository.
