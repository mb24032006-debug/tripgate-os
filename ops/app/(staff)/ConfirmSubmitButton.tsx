"use client";

// A speed bump for the one kind of action that's genuinely irreversible — the form still works
// with no JS at all (it just submits immediately); this only adds a confirmation prompt on top.
export default function ConfirmSubmitButton({
  confirmMessage,
  children,
  className,
}: {
  confirmMessage: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(confirmMessage)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
