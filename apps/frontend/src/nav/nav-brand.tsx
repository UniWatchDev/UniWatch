import { Link } from 'react-router-dom';

function BrandMark() {
  return (
    <span className="navbar-brand-mark" aria-hidden>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path
          d="M15 10l4.553-2.526A1 1 0 0121 8.382v7.236a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function NavBrand() {
  return (
    <Link to="/" className="navbar-brand">
      <BrandMark />
      <span className="navbar-brand-label display">Uni-Watch</span>
    </Link>
  );
}
