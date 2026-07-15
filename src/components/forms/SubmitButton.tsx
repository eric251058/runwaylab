"use client";

import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  children: string;
  pendingText?: string;
  disabled?: boolean;
  disabledText?: string;
  className?: string;
};

export function SubmitButton({
  children,
  pendingText = "正在保存...",
  disabled = false,
  disabledText,
  className
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  const isDisabled = pending || disabled;

  return (
    <button
      type="submit"
      disabled={isDisabled}
      className={className ?? "h-12 rounded-full bg-ink px-5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"}
    >
      {pending ? pendingText : disabled && disabledText ? disabledText : children}
    </button>
  );
}
