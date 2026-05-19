export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer
      className="relative z-10 border-t"
      style={{
        borderColor: 'var(--border-subtle)',
        background: 'var(--bg-primary)',
        padding: '16px 24px',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          fontSize: 12,
          color: 'var(--text-muted)',
        }}
      >
        <span>© {year} Uni-Watch. All rights reserved.</span>
        <nav style={{ display: 'flex', gap: 16 }}>
          <a href="#about" className="site-footer-link">
            About
          </a>
          <a href="mailto:support@example.com" className="site-footer-link">
            Contact
          </a>
          <a href="#privacy" className="site-footer-link">
            Privacy Policy
          </a>
        </nav>
      </div>
    </footer>
  );
}
