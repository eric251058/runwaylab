"use client";

import type { UserStatus } from "@prisma/client";

type UserStatusActionFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  userId: string;
  status: UserStatus;
  label: string;
  confirmMessage: string;
  disabled?: boolean;
};

export function UserStatusActionForm({
  action,
  userId,
  status,
  label,
  confirmMessage,
  disabled = false
}: UserStatusActionFormProps) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(confirmMessage)) event.preventDefault();
      }}
    >
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="status" value={status} />
      <button
        disabled={disabled}
        className="h-9 rounded-full border border-black/10 px-4 text-xs font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-40"
      >
        {label}
      </button>
    </form>
  );
}
