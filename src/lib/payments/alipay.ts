import { AlipaySdk } from "alipay-sdk";

import type {
  PaymentNotification,
  PaymentProvider,
  PaymentRequest,
  PaymentResult,
  RefundRequest,
  RefundResult
} from "@/lib/payments/provider";

const DEFAULT_GATEWAY = "https://openapi.alipay.com/gateway.do";
const ALLOWED_GATEWAYS = new Set([
  DEFAULT_GATEWAY,
  "https://openapi-sandbox.dl.alipaydev.com/gateway.do"
]);

type AlipayConfig = {
  appId: string;
  privateKey: string;
  alipayPublicKey: string;
  gateway: string;
  sellerId?: string;
};

function normalizedPem(value: string | undefined) {
  return value?.trim().replaceAll("\\n", "\n") ?? "";
}

function parseAlipayDate(value: string | undefined) {
  if (!value) return null;
  const parsed = new Date(value.replace(" ", "T") + "+08:00");
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function amountCentsToAlipayAmount(amountCents: number) {
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) throw new Error("INVALID_AMOUNT_CENTS");
  return `${Math.floor(amountCents / 100)}.${String(amountCents % 100).padStart(2, "0")}`;
}

export function alipayAmountToCents(value: string) {
  if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(value)) throw new Error("INVALID_ALIPAY_AMOUNT");
  const [whole, fraction = ""] = value.split(".");
  const cents = Number(whole) * 100 + Number((fraction + "00").slice(0, 2));
  if (!Number.isSafeInteger(cents) || cents <= 0) throw new Error("INVALID_ALIPAY_AMOUNT");
  return cents;
}

export class AlipayPaymentProvider implements PaymentProvider {
  readonly name = "alipay";
  readonly configured: boolean;
  private readonly sdk: AlipaySdk | null;

  constructor(private readonly config: AlipayConfig | null) {
    this.configured = Boolean(config?.appId && config.privateKey && config.alipayPublicKey && config.gateway);
    this.sdk = this.configured && config
      ? new AlipaySdk({
          appId: config.appId,
          privateKey: config.privateKey,
          alipayPublicKey: config.alipayPublicKey,
          gateway: config.gateway,
          signType: "RSA2",
          keyType: config.privateKey.includes("BEGIN PRIVATE KEY") ? "PKCS8" : "PKCS1",
          timeout: 10_000,
          camelcase: true
        })
      : null;
  }

  async createPayment(input: PaymentRequest): Promise<PaymentResult> {
    if (!this.sdk || !this.config) return this.notConfigured();
    if (!input.attemptId || !input.returnUrl || !input.notifyUrl) {
      return { ok: false, provider: this.name, reason: "支付请求参数不完整。", code: "INVALID_PAYMENT_REQUEST" };
    }
    if (input.currency !== "CNY") {
      return { ok: false, provider: this.name, reason: "支付宝首期仅支持人民币。", code: "UNSUPPORTED_CURRENCY" };
    }

    try {
      const paymentUrl = this.sdk.pageExecute("alipay.trade.page.pay", "GET", {
        returnUrl: input.returnUrl,
        notifyUrl: input.notifyUrl,
        bizContent: {
          out_trade_no: input.attemptId,
          product_code: "FAST_INSTANT_TRADE_PAY",
          subject: input.description.slice(0, 128),
          body: `RunwayLab 订单 ${input.orderId}`.slice(0, 128),
          total_amount: amountCentsToAlipayAmount(input.amountCents),
          timeout_express: "15m"
        }
      });
      const url = new URL(paymentUrl);
      if (url.protocol !== "https:") throw new Error("NON_HTTPS_PAYMENT_URL");
      return {
        ok: true,
        provider: this.name,
        paymentUrl: url.toString(),
        merchantReference: input.attemptId,
        message: "支付宝收银台已创建。"
      };
    } catch {
      return { ok: false, provider: this.name, reason: "支付宝收银台创建失败，请稍后重试。", code: "ALIPAY_CREATE_FAILED" };
    }
  }

  verifyNotification(input: Record<string, string>): PaymentNotification {
    if (!this.sdk || !this.config) {
      return { ok: false, provider: this.name, reason: "支付宝商户配置不完整。", code: "ALIPAY_NOT_CONFIGURED" };
    }
    try {
      if (!this.sdk.checkNotifySignV2(input)) {
        return { ok: false, provider: this.name, reason: "支付宝通知签名无效。", code: "INVALID_SIGNATURE" };
      }
      if (input.app_id !== this.config.appId) {
        return { ok: false, provider: this.name, reason: "支付宝应用标识不匹配。", code: "APP_ID_MISMATCH" };
      }
      if (this.config.sellerId && input.seller_id !== this.config.sellerId) {
        return { ok: false, provider: this.name, reason: "支付宝收款方不匹配。", code: "SELLER_ID_MISMATCH" };
      }
      if (!input.notify_id || !input.out_trade_no || !input.total_amount) {
        return { ok: false, provider: this.name, reason: "支付宝通知字段不完整。", code: "INVALID_NOTIFICATION" };
      }
      const status = input.trade_status === "TRADE_SUCCESS" || input.trade_status === "TRADE_FINISHED"
        ? "CAPTURED"
        : input.trade_status === "TRADE_CLOSED"
          ? "FAILED"
          : null;
      if (!status) {
        return { ok: false, provider: this.name, reason: "支付宝通知状态暂不处理。", code: "IGNORED_TRADE_STATUS" };
      }
      if (status === "CAPTURED" && !input.trade_no) {
        return { ok: false, provider: this.name, reason: "支付宝成功通知缺少渠道流水号。", code: "INVALID_NOTIFICATION" };
      }
      return {
        ok: true,
        provider: this.name,
        eventId: input.notify_id,
        merchantReference: input.out_trade_no,
        providerPaymentId: input.trade_no || null,
        amountCents: alipayAmountToCents(input.total_amount),
        currency: "CNY",
        status,
        capturedAt: status === "CAPTURED" ? parseAlipayDate(input.gmt_payment) : null
      };
    } catch {
      return { ok: false, provider: this.name, reason: "支付宝通知无法验证。", code: "INVALID_NOTIFICATION" };
    }
  }

  async refundPayment(input: RefundRequest): Promise<RefundResult> {
    if (!this.sdk) return this.notConfigured();
    if (input.currency !== "CNY") {
      return { ok: false, provider: this.name, reason: "支付宝首期仅支持人民币退款。", code: "UNSUPPORTED_CURRENCY" };
    }
    try {
      const result = await this.sdk.exec("alipay.trade.refund", {
        bizContent: {
          trade_no: input.providerPaymentId,
          refund_amount: amountCentsToAlipayAmount(input.amountCents),
          refund_reason: input.reason.slice(0, 200),
          out_request_no: input.refundId
        }
      });
      if (result.code !== "10000") {
        const code = result.sub_code || result.code || "ALIPAY_REFUND_FAILED";
        return {
          ok: false,
          provider: this.name,
          reason: result.sub_msg || result.msg || "支付宝退款未成功。",
          code,
          retryable: result.code === "20000" || /SYSTEM_ERROR|SERVICE_UNAVAILABLE/i.test(code)
        };
      }
      return {
        ok: true,
        provider: this.name,
        providerRefundId: String(result.outRequestNo || input.refundId),
        message: "支付宝退款成功。"
      };
    } catch {
      return { ok: false, provider: this.name, reason: "支付宝退款请求结果未知，请使用同一退款编号复核。", code: "ALIPAY_REFUND_UNKNOWN", retryable: true };
    }
  }

  private notConfigured(): { ok: false; provider: string; reason: string; code: string } {
    return { ok: false, provider: this.name, reason: "支付宝商户配置不完整。", code: "ALIPAY_NOT_CONFIGURED" };
  }
}

export function createAlipayPaymentProviderFromEnv(env: NodeJS.ProcessEnv = process.env) {
  const appId = env.ALIPAY_APP_ID?.trim() ?? "";
  const privateKey = normalizedPem(env.ALIPAY_PRIVATE_KEY);
  const alipayPublicKey = normalizedPem(env.ALIPAY_PUBLIC_KEY);
  const gateway = env.ALIPAY_GATEWAY?.trim() || DEFAULT_GATEWAY;
  const config = appId && privateKey && alipayPublicKey && ALLOWED_GATEWAYS.has(gateway)
    ? { appId, privateKey, alipayPublicKey, gateway, sellerId: env.ALIPAY_SELLER_ID?.trim() || undefined }
    : null;
  return new AlipayPaymentProvider(config);
}
