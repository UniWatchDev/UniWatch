const SECTIONS = [
  {
    id: 'data-collected',
    title: '1. Data we collect',
    body: `When you create an account, we collect your display name and email address. During a watch session, we collect session metadata (room ID, timestamps, playback events) to power frame-perfect sync. We do not store video files you upload beyond their active room lifetime unless you explicitly save them to your library.`,
  },
  {
    id: 'how-we-use',
    title: '2. How we use your data',
    body: `Your email is used solely for account authentication and transactional messages (verification, password reset). Session metadata is used to deliver sync and to improve our infrastructure. We do not use your data for advertising, and we do not build behavioral profiles.`,
  },
  {
    id: 'cookies',
    title: '3. Cookies & local storage',
    body: `We use a single HttpOnly session cookie to keep you signed in across page loads. We do not use tracking cookies, third-party analytics cookies, or advertising pixels. Theme preferences are stored in localStorage and never transmitted to our servers.`,
  },
  {
    id: 'third-parties',
    title: '4. Third-party services',
    body: `Video files are stored on Cloudflare R2 (object storage). Transactional emails are delivered via Resend. Neither provider receives personally identifiable information beyond what is strictly necessary to perform the service. We do not share your data with any other third parties.`,
  },
  {
    id: 'retention',
    title: '5. Data retention',
    body: `Account data is retained for as long as your account is active. You may delete your account at any time from your profile settings, at which point your data is permanently erased within 30 days. Watch session metadata is anonymized after 90 days.`,
  },
  {
    id: 'security',
    title: '6. Security',
    body: `Passwords are hashed with bcrypt before storage. All data is transmitted over TLS. Access tokens are short-lived (15 minutes) and refresh tokens are stored in HttpOnly cookies, inaccessible to JavaScript. We conduct regular dependency audits and follow OWASP guidelines.`,
  },
  {
    id: 'your-rights',
    title: '7. Your rights',
    body: `You have the right to access, correct, or delete your personal data at any time. To exercise these rights, email us at privacy@uniwatch.com. For users in the EU, you also have the right to data portability and the right to lodge a complaint with your local supervisory authority.`,
  },
  {
    id: 'contact',
    title: '8. Contact',
    body: `If you have questions about this policy, reach us at privacy@uniwatch.com. We aim to respond within 5 business days. Our registered address is available on request.`,
  },
] as const;

export function PrivacyPolicyPage() {
  return (
    <div
      className="relative flex flex-col"
      style={{ background: 'var(--bg-primary)', minHeight: 'calc(100dvh - 56px)' }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
        style={{
          background: `
            radial-gradient(ellipse at 80% 10%, rgba(65,90,119,0.07) 0%, transparent 45%),
            radial-gradient(ellipse at 20% 90%, rgba(119,141,169,0.06) 0%, transparent 40%)
          `,
        }}
      />

      <div
        className="relative z-10 mx-auto w-full"
        style={{ maxWidth: 740, padding: '56px 24px 80px' }}
      >
        {/* Header */}
        <div className="fade-up" style={{ animationDelay: '0ms', marginBottom: 48 }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.20em',
              textTransform: 'uppercase',
              color: 'var(--accent)',
              marginBottom: 14,
              fontFamily: 'var(--font-mono)',
            }}
          >
            ✦ Last updated June 2026
          </p>
          <h1
            className="display"
            style={{
              fontSize: 'clamp(32px, 5vw, 52px)',
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: '-0.03em',
              color: 'var(--text-primary)',
              margin: '0 0 18px',
            }}
          >
            Privacy Policy
          </h1>
          <p
            style={{
              fontSize: 15,
              color: 'var(--text-secondary)',
              lineHeight: 1.7,
              maxWidth: 560,
            }}
          >
            We built Uni-Watch to bring people together, not to harvest their data.
            This policy explains plainly what we collect, why, and how you stay in control.
          </p>
        </div>

        {/* Sections */}
        <div
          className="fade-up"
          style={{
            animationDelay: '80ms',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {SECTIONS.map(({ id, title, body }) => (
            <div
              key={id}
              style={{
                padding: '22px 24px',
                borderRadius: 12,
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-surface)',
              }}
            >
              <h2
                style={{
                  margin: '0 0 10px',
                  fontSize: 14,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-display)',
                  letterSpacing: '-0.01em',
                }}
              >
                {title}
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.7,
                }}
              >
                {body}
              </p>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div
          className="fade-up"
          style={{
            animationDelay: '160ms',
            marginTop: 32,
            padding: '16px 20px',
            borderRadius: 10,
            border: '1px solid var(--border-medium)',
            background: 'var(--accent-dim)',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: 'var(--text-muted)',
              lineHeight: 1.6,
            }}
          >
            This privacy policy is provided for informational purposes and reflects
            our current practices. We may update it as the product evolves; material
            changes will be communicated by email. Continued use of Uni-Watch after
            an update constitutes acceptance of the revised policy.
          </p>
        </div>
      </div>
    </div>
  );
}
