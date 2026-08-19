// Unlike layout.tsx, a template.tsx remounts on every navigation — the one thing that makes a
// per-page entrance animation possible here. Kept to a single wrapper div with no state of its own.
export default function StaffTemplate({ children }: { children: React.ReactNode }) {
  return <div className="fade-in">{children}</div>;
}
