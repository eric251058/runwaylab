import assert from "node:assert/strict";
import { ProjectOrderPaymentStatus, ProjectOrderStatus } from "@prisma/client";
import {
  activeLimitedPreorderBuyerQuantity,
  exceedsPilotBuyerCampaignLimit,
  hasVerifiedBuyerContact,
  limitedPreorderOrderConsumesCapacity,
  PILOT_BUYER_CAMPAIGN_QUANTITY_LIMIT,
  type LimitedPreorderCapacityOrder
} from "../src/lib/projects/preorder-buyer-cap";

const now = new Date("2026-08-18T12:00:00.000Z");
const activeUntil = new Date("2026-08-18T13:00:00.000Z");
const expiredAt = new Date("2026-08-18T11:00:00.000Z");

function order(overrides: Partial<LimitedPreorderCapacityOrder> = {}): LimitedPreorderCapacityOrder {
  return {
    status: ProjectOrderStatus.RESERVATION,
    paymentStatus: ProjectOrderPaymentStatus.UNPAID,
    quantity: 1,
    reservationExpiresAt: activeUntil,
    ...overrides
  };
}

assert.equal(PILOT_BUYER_CAMPAIGN_QUANTITY_LIMIT, 2);
assert.equal(hasVerifiedBuyerContact({
  email: "buyer@example.com",
  phone: null,
  emailVerifiedAt: now,
  phoneVerifiedAt: null
}), true);
assert.equal(hasVerifiedBuyerContact({
  email: "buyer@example.com",
  phone: null,
  emailVerifiedAt: null,
  phoneVerifiedAt: null
}), false);
assert.equal(hasVerifiedBuyerContact({
  email: null,
  phone: null,
  emailVerifiedAt: now,
  phoneVerifiedAt: now
}), false, "a stale verification timestamp without a usable contact is not enough");

// Product/SKU identity is intentionally absent from the aggregate input: two
// one-unit reservations on different SKUs still consume the same buyer cap.
const acrossDifferentSkus = [order(), order()];
assert.equal(activeLimitedPreorderBuyerQuantity(acrossDifferentSkus, now), 2);
assert.equal(exceedsPilotBuyerCampaignLimit(
  activeLimitedPreorderBuyerQuantity(acrossDifferentSkus, now),
  1
), true);

assert.equal(limitedPreorderOrderConsumesCapacity(order({ reservationExpiresAt: expiredAt }), now), false);
assert.equal(limitedPreorderOrderConsumesCapacity(order({ status: ProjectOrderStatus.CANCELLED }), now), false);
assert.equal(limitedPreorderOrderConsumesCapacity(order({
  status: ProjectOrderStatus.CANCELLED,
  paymentStatus: ProjectOrderPaymentStatus.PAID
}), now), false, "a cancelled record must not consume the pilot buyer cap even when legacy payment data is inconsistent");
assert.equal(activeLimitedPreorderBuyerQuantity([
  order({ reservationExpiresAt: expiredAt }),
  order({ status: ProjectOrderStatus.CANCELLED }),
  order()
], now), 1, "expired and cancelled reservations must not consume the buyer cap");
assert.equal(exceedsPilotBuyerCampaignLimit(1, 1), false);

console.log("limited preorder buyer cap tests: PASS");
