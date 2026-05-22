export function PrivateProfileBanner() {
  return (
    <section
      className="card fade-up"
      style={{
        marginTop: 16,
        padding: 20,
        textAlign: 'center',
        borderColor: 'rgba(124, 58, 237, 0.25)'
      }}
    >
      <p className="display" style={{ margin: '0 0 8px', fontSize: 16, color: 'var(--text-primary)' }}>
        This profile is private
      </p>
      <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
        Friends, watch history, achievements, and stats are only visible to the account owner.
      </p>
    </section>
  );
}
