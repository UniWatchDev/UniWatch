export function EditRoomSection({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5">
      <div className="grid gap-1">
        <h2 className="m-0 text-base font-bold text-[var(--text-primary)]">{title}</h2>
        <p className="m-0 text-sm leading-relaxed text-[var(--text-muted)]">{description}</p>
      </div>
      <div className="grid gap-3">{children}</div>
    </section>
  );
}
