"use client";

import { useFormStatus } from "react-dom";
import { Trash2 } from "lucide-react";
import { removeStaffAction } from "./actions";

function Button({ name }: { name: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (
          !window.confirm(
            `Remove "${name}"? This deletes their login account; they will no ` +
              `longer be able to sign in.`
          )
        )
          e.preventDefault();
      }}
      className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2.5 py-1.5 text-xs font-medium text-danger transition hover:bg-danger/5 disabled:opacity-60"
    >
      <Trash2 className="h-3.5 w-3.5" />
      {pending ? "Removing…" : "Remove"}
    </button>
  );
}

export function RemoveStaffButton({
  staffId,
  staffName,
}: {
  staffId: string;
  staffName: string;
}) {
  return (
    <form action={removeStaffAction}>
      <input type="hidden" name="staff_id" value={staffId} />
      <Button name={staffName} />
    </form>
  );
}
