// types/deal.ts

export type DealStatus =
  | "pending"
  | "negotiating"
  | "accepted"
  | "rejected"
  | "completed"
  | "cancelled"
  | "disputed";

export type DealPaymentStatus = "unpaid" | "pending" | "paid";

// 🔹 Contact reveal state
export interface DealContactReveal {
  organizerRevealed: boolean;
  sponsorRevealed: boolean;
  organizerRevealedAt: string | null;
  sponsorRevealedAt: string | null;
  fullyRevealed: boolean;
}

// 🔹 Basic User Summary (used in Deal response)
export interface DealUser {
  _id: string;
  name?: string;
  email?: string;
  companyName?: string;
  phone?: string;
}

// 🔹 Event Summary (used in Deal response)
export interface DealEvent {
  _id: string;
  title?: string;
  location?: string;
  startDate?: string;
}

// 🔹 Main Deal Object (frontend safe version)
export interface Deal {
  _id: string;

  title: string;
  description: string;

  proposedAmount: number;
  finalAmount: number | null;

  status: DealStatus;
  paymentStatus: DealPaymentStatus;

  message: string;
  deliverables: string[];
  notes: string;

  disputeReason: string;

  expiresAt: string | null;

  acceptedAt: string | null;
  rejectedAt: string | null;
  cancelledAt: string | null;
  completedAt: string | null;

  contactReveal: DealContactReveal;

  createdAt: string;
  updatedAt: string;

  organizer: DealUser;
  sponsor: DealUser;
  event: DealEvent;
}

// 🔹 API Response: Single Deal
export interface DealResponse {
  success: boolean;
  deal: Deal;
  message?: string;
}

// 🔹 API Response: Deal List
export interface DealListResponse {
  success: boolean;
  deals: Deal[];
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// 🔹 Create Deal Payload
export interface CreateDealPayload {
  organizerId: string;
  sponsorId: string;
  eventId: string;

  title?: string;
  description?: string;

  proposedAmount: number;

  message?: string;
  deliverables?: string[];
  notes?: string;

  expiresAt?: string;
}

// 🔹 Update Deal Payload (PATCH)
export interface UpdateDealPayload {
  status?: DealStatus;
  paymentStatus?: DealPaymentStatus;

  finalAmount?: number | null;

  message?: string;
  deliverables?: string[];
  notes?: string;

  disputeReason?: string;

  revealContact?: boolean;
}