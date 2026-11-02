import { useInWindow } from '../contexts/InWindowContext';

export default function InWindowViewer() {
  const { url, closeUrl } = useInWindow();
  if (!url) return null;

  return (
    <div className="inwindow-overlay" onClick={e => e.target === e.currentTarget && closeUrl()}>
      <div className="inwindow-panel">
        <div className="inwindow-header">
          <span className="inwindow-url" title={url}>{url}</span>
          <div className="inwindow-actions">
            <a
              className="inwindow-newtab-btn"
              href={url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open in new tab ↗
            </a>
            <button className="inwindow-close-btn" onClick={closeUrl}>✕</button>
          </div>
        </div>
        <iframe
          key={url}
          src={url}
          className="inwindow-frame"
          title="Preview"
        />
      </div>
    </div>
  );
}
