export type DealStatus =
  | 'pending'
  | 'connected'
  | 'negotiating'
  | 'completed'
  | 'cancelled'
  | 'rejected'
  | 'disputed';

export type DealInitiator = 'organizer' | 'sponsor';

export interface DealContact {
  phone?: string;
  email?: string;
  name?: string;
}

export interface DealItem {
  _id: string;
  organizerId: string;
  sponsorId: string;
  eventId: string;
  sponsorshipId: string;
  initiatedBy: DealInitiator;
  status: DealStatus;
  proposedAmount: number;
  finalAmount?: number | null;
  message?: string;
  contactSharedAt?: string | null;
  acceptedAt?: string | null;
  rejectedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  expiresAt?: string | null;
  disputeReason?: string;
  disputeReportedBy?: DealInitiator | null;
  disputeReportedAt?: string | null;
  createdAt: string;
  updatedAt: string;

  eventTitle?: string;
  sponsorshipTitle?: string;
  counterpartyName?: string;
  counterpartyContact?: DealContact;
  canViewContact?: boolean;
}
