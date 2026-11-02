import { useInWindow } from '../contexts/InWindowContext';

const SITE_LABELS = {
  'tripadvisor.com': 'TripAdvisor',
  'en.wikipedia.org': 'Wikipedia',
  'trip.com': 'Trip.com',
  'guide.michelin.com': 'Michelin Guide',
  'maps.google.com': 'Google Maps',
  'google.com': 'Google Maps',
};

function getSiteInfo(url) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    const label = SITE_LABELS[hostname] ?? hostname;
    const favicon = `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
    return { hostname, label, favicon };
  } catch {
    return { hostname: url, label: url, favicon: null };
  }
}

export default function InWindowViewer() {
  const { url, closeUrl } = useInWindow();
  if (!url) return null;

  const { hostname, label, favicon } = getSiteInfo(url);

  return (
    <div className="inwindow-backdrop" onClick={closeUrl}>
      <aside className="inwindow-drawer" onClick={e => e.stopPropagation()}>
        <div className="inwindow-drawer-header">
          <span className="inwindow-drawer-title">Link preview</span>
          <button className="inwindow-close-btn" onClick={closeUrl} title="Close">✕</button>
        </div>

        <div className="inwindow-preview-card">
          {favicon && (
            <img
              className="inwindow-site-icon"
              src={favicon}
              alt={label}
              width="48"
              height="48"
            />
          )}
          <div className="inwindow-site-label">{label}</div>
          <div className="inwindow-site-host">{hostname}</div>
          <div className="inwindow-url-full" title={url}>{url}</div>
          <a
            className="inwindow-open-btn"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={closeUrl}
          >
            Open in new tab ↗
          </a>
        </div>

        <p className="inwindow-note">
          Most travel sites don&apos;t allow in-app embedding.
          Use the button above to open in a new tab.
        </p>
      </aside>
    </div>
  );
}
