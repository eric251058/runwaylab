"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type PersonaOption = {
  value: string;
  label: string;
  description: string;
};

type PersonaOnboardingFormProps = {
  options: PersonaOption[];
  currentPersona: string;
};

export function PersonaOnboardingForm({ options, currentPersona }: PersonaOnboardingFormProps) {
  const router = useRouter();
  const [selectedPersona, setSelectedPersona] = useState(currentPersona);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function savePersona(persona: string) {
    setSelectedPersona(persona);
    setMessage(null);
    startTransition(async () => {
      const response = await fetch("/api/me/persona", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ persona })
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setMessage(data?.error ?? "保存失败，请稍后再试。");
        return;
      }

      router.push("/me");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => savePersona(option.value)}
          disabled={isPending}
          className={`rounded-[8px] border p-5 text-left transition ${
            selectedPersona === option.value ? "border-ink bg-ink text-white" : "border-black/8 bg-white text-ink hover:border-ink/35"
          } disabled:cursor-not-allowed disabled:opacity-70`}
        >
          <span className="block text-lg font-semibold">{option.label}</span>
          <span className={`mt-3 block text-sm leading-6 ${selectedPersona === option.value ? "text-white/68" : "text-ink/56"}`}>{option.description}</span>
        </button>
      ))}
      {message ? <p className="text-sm text-red-600 sm:col-span-2 lg:col-span-3">{message}</p> : null}
    </div>
  );
}
