import { applyPaymentNotification, PaymentServiceError } from "@/lib/payments/order-payment-service";
import { createPaymentOperationsProvider } from "@/lib/payments/provider";

export const dynamic = "force-dynamic";
const MAX_NOTIFICATION_BYTES = 64 * 1024;

function reply(value: "success" | "failure", status = 200) {
  return new Response(value, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" }
  });
}

export async function POST(request: Request) {
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > MAX_NOTIFICATION_BYTES) return reply("failure", 413);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/x-www-form-urlencoded")) {
    return reply("failure", 415);
  }

  const reader = request.body?.getReader();
  if (!reader) return reply("failure", 400);
  const decoder = new TextDecoder();
  let size = 0;
  let raw = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_NOTIFICATION_BYTES) {
      await reader.cancel();
      return reply("failure", 413);
    }
    raw += decoder.decode(value, { stream: true });
  }
  raw += decoder.decode();
  const form = new URLSearchParams(raw);
  const values: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (key.length <= 80 && value.length <= 4_096) values[key] = value;
  }

  const provider = createPaymentOperationsProvider();
  const notification = provider.verifyNotification(values);
  try {
    await applyPaymentNotification(notification);
    return reply("success");
  } catch (error) {
    if (error instanceof PaymentServiceError) return reply("failure", error.status >= 500 ? 500 : 400);
    return reply("failure", 500);
  }
}
