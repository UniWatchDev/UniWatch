import { Link } from 'react-router-dom';

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
          <Link to="/about" className="site-footer-link">
            About
          </Link>
          <a href="mailto:support@uniwatch.com" className="site-footer-link">
            Contact
          </a>
          <Link to="/privacy" className="site-footer-link">
            Privacy Policy
          </Link>
        </nav>
      </div>
    </footer>
  );
}
