import { ProjectOrderPaymentStatus, UserRole, UserStatus } from "@prisma/client";
import { readFileSync } from "node:fs";
import { createPaymentProvider } from "@/lib/payments/provider";
import { createSmsProvider } from "@/lib/notifications/sms";
import { resolveManualPaymentStatusUpdate } from "@/lib/projects/rules";

async function assertEqual(label: string, actual: unknown, expected: unknown) {
  if (actual !== expected) throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
  console.log(`PASS ${label}`);
}

async function main() {
  const payment = createPaymentProvider({});
  const paymentResult = await payment.createPayment({
    orderId: "order_1",
    amountCents: 19900,
    currency: "CNY",
    description: "limited preorder"
  });
  await assertEqual("payment disabled by default", paymentResult.ok, false);
  await assertEqual("payment provider name", paymentResult.provider, "disabled");

  const productionPayment = createPaymentProvider({ "feature.live_payment": true }, "production");
  const productionPaymentResult = await productionPayment.createPayment({
    orderId: "order_2",
    amountCents: 19900,
    currency: "CNY",
    description: "production guard"
  });
  await assertEqual("no production mock payment", productionPaymentResult.ok, false);
  await assertEqual("disabled provider never paid", "status" in productionPaymentResult ? productionPaymentResult.status : ProjectOrderPaymentStatus.UNPAID, ProjectOrderPaymentStatus.UNPAID);

  const normalUser = { id: "user_1", role: UserRole.USER, status: UserStatus.ACTIVE, manualPaymentPilotEnabled: true };
  const ownerUser = { id: "owner_1", role: UserRole.USER, status: UserStatus.ACTIVE, manualPaymentPilotEnabled: true };
  const providerUser = { id: "provider_1", role: UserRole.USER, status: UserStatus.ACTIVE, manualPaymentPilotEnabled: true };
  const adminWithoutFlag = { id: "admin_1", role: UserRole.ADMIN, status: UserStatus.ACTIVE, manualPaymentPilotEnabled: false };
  const adminWithFlag = { id: "admin_1", role: UserRole.ADMIN, status: UserStatus.ACTIVE, manualPaymentPilotEnabled: true };

  await assertEqual(
    "ordinary user cannot set PAID",
    resolveManualPaymentStatusUpdate({ actor: normalUser, oldStatus: ProjectOrderPaymentStatus.UNPAID, requestedStatus: ProjectOrderPaymentStatus.PAID, reason: "manual test" }).ok,
    false
  );
  await assertEqual(
    "project owner cannot set PAID",
    resolveManualPaymentStatusUpdate({ actor: ownerUser, oldStatus: ProjectOrderPaymentStatus.UNPAID, requestedStatus: ProjectOrderPaymentStatus.PAID, reason: "manual test" }).ok,
    false
  );
  await assertEqual(
    "provider cannot set PAID",
    resolveManualPaymentStatusUpdate({ actor: providerUser, oldStatus: ProjectOrderPaymentStatus.UNPAID, requestedStatus: ProjectOrderPaymentStatus.PAID, reason: "manual test" }).ok,
    false
  );
  await assertEqual(
    "admin needs manual payment flag",
    resolveManualPaymentStatusUpdate({ actor: adminWithoutFlag, oldStatus: ProjectOrderPaymentStatus.UNPAID, requestedStatus: ProjectOrderPaymentStatus.PAID, reason: "manual test" }).ok,
    false
  );
  await assertEqual(
    "admin needs payment reason",
    resolveManualPaymentStatusUpdate({ actor: adminWithFlag, oldStatus: ProjectOrderPaymentStatus.UNPAID, requestedStatus: ProjectOrderPaymentStatus.PAID, reason: "" }).ok,
    false
  );
  const manualPaid = resolveManualPaymentStatusUpdate({
    actor: adminWithFlag,
    oldStatus: ProjectOrderPaymentStatus.UNPAID,
    requestedStatus: ProjectOrderPaymentStatus.PAID,
    reason: "bank transfer confirmed"
  });
  await assertEqual("admin with flag and reason can confirm", manualPaid.ok, true);
  await assertEqual("manual confirmation marks changed", manualPaid.ok && manualPaid.changed, true);
  const actionSource = readFileSync("src/lib/projects/actions.ts", "utf8");
  await assertEqual("manual payment writes AdminLog action", actionSource.includes("PROJECT_ORDER_UPDATE"), true);
  await assertEqual("manual payment logs old status", actionSource.includes("oldPaymentStatus"), true);
  await assertEqual("manual payment logs new status", actionSource.includes("newPaymentStatus"), true);
  await assertEqual("manual payment logs reason", actionSource.includes("reason: paymentReason"), true);
  const preorderRoute = readFileSync("src/app/api/projects/[id]/preorders/route.ts", "utf8");
  await assertEqual("preorder route does not read client paymentStatus", preorderRoute.includes("body?.paymentStatus"), false);
  await assertEqual("preorder route only system sets pending", preorderRoute.includes("ProjectOrderPaymentStatus.PENDING"), true);
  await assertEqual("preorder route only system sets unpaid", preorderRoute.includes("ProjectOrderPaymentStatus.UNPAID"), true);

  const sms = createSmsProvider({});
  const smsResult = await sms.send({ to: "+8613800138000", template: "preorder", variables: { code: "1234" } });
  await assertEqual("sms disabled by default", smsResult.ok, false);
  await assertEqual("sms provider name", smsResult.provider, "disabled");
}

main().catch((error) => {
  console.error("Limited preorder V2.3 tests failed", { errorType: error instanceof Error ? error.name : typeof error });
  process.exit(1);
});
