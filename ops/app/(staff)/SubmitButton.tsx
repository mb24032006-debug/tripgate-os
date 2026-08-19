"use client";

import { useFormStatus } from "react-dom";

// Paper never leaves you wondering "did that register?" — a button that goes straight back to
// its idle label the instant you click it does. This shows a pending state and disables itself
// while the Server Action is in flight, so a nervous double-click can't create two Trips/Quotes.
export default function SubmitButton({
  children,
  pendingLabel,
  className = "btn btn-primary",
}: {
  children: React.ReactNode;
  pendingLabel: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}
