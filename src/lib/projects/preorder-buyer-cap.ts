import {
  ProjectOrderPaymentStatus,
  ProjectOrderStatus
} from "@prisma/client";
import { ACTIVE_RESERVATION_STATUSES } from "@/lib/projects/rules";

/**
 * First-pilot abuse guard: every eligible buyer can reserve at most two units
 * in one V2.3 campaign, across every product/SKU. Eligibility is deliberately
 * stricter than registration: a still-present email or phone must also have a
 * verification timestamp before the account may consume any hard capacity.
 */
export const PILOT_BUYER_CAMPAIGN_QUANTITY_LIMIT = 2;

const EXPIRING_RESERVATION_STATUSES: ProjectOrderStatus[] = [
  ProjectOrderStatus.RESERVATION,
  ProjectOrderStatus.PENDING_PAYMENT
];

const DURABLE_CAPACITY_STATUSES: ProjectOrderStatus[] = ACTIVE_RESERVATION_STATUSES.filter(
  (status) => !EXPIRING_RESERVATION_STATUSES.includes(status)
);

export type BuyerVerificationState = {
  email: string | null;
  phone: string | null;
  emailVerifiedAt: Date | null;
  phoneVerifiedAt: Date | null;
};

export type LimitedPreorderCapacityOrder = {
  status: ProjectOrderStatus;
  paymentStatus: ProjectOrderPaymentStatus;
  quantity: number;
  reservationExpiresAt: Date | null;
};

export function hasVerifiedBuyerContact(account: BuyerVerificationState) {
  return Boolean(
    (account.email?.trim() && account.emailVerifiedAt)
    || (account.phone?.trim() && account.phoneVerifiedAt)
  );
}

export function limitedPreorderOrderConsumesCapacity(order: LimitedPreorderCapacityOrder, now: Date) {
  if (
    order.status === ProjectOrderStatus.CANCELLED
    || order.status === ProjectOrderStatus.REFUNDED
  ) {
    return false;
  }
  if (
    order.paymentStatus === ProjectOrderPaymentStatus.PAID
    || order.paymentStatus === ProjectOrderPaymentStatus.PARTIALLY_REFUNDED
  ) {
    return true;
  }
  if (DURABLE_CAPACITY_STATUSES.includes(order.status)) return true;
  return EXPIRING_RESERVATION_STATUSES.includes(order.status)
    && (!order.reservationExpiresAt || order.reservationExpiresAt > now);
}

export function activeLimitedPreorderBuyerQuantity(
  orders: readonly LimitedPreorderCapacityOrder[],
  now: Date
) {
  return orders.reduce(
    (sum, order) => sum + (limitedPreorderOrderConsumesCapacity(order, now) ? order.quantity : 0),
    0
  );
}

export function exceedsPilotBuyerCampaignLimit(activeQuantity: number, requestedQuantity: number) {
  return activeQuantity + requestedQuantity > PILOT_BUYER_CAMPAIGN_QUANTITY_LIMIT;
}
