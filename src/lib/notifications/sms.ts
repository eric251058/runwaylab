import type { FeatureKey } from "@/lib/features";

export type SmsMessage = {
  to: string;
  template: string;
  variables?: Record<string, string>;
};

export type SmsResult = { ok: true; provider: string } | { ok: false; provider: string; reason: string };

export interface SmsProvider {
  readonly name: string;
  send(message: SmsMessage): Promise<SmsResult>;
}

export class DisabledSmsProvider implements SmsProvider {
  readonly name = "disabled";

  async send(_message: SmsMessage): Promise<SmsResult> {
    return { ok: false, provider: this.name, reason: "真实短信尚未开启。" };
  }
}

export function createSmsProvider(flags: Partial<Record<FeatureKey, boolean>>): SmsProvider {
  if (!flags["feature.live_sms"]) return new DisabledSmsProvider();
  return new DisabledSmsProvider();
}
