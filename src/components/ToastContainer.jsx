export default function ToastContainer({ toasts, onDismiss, onNavigate }) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map(place => (
        <div
          key={place.id}
          className="toast"
          onClick={() => { onNavigate(place); onDismiss(place.id); }}
        >
          <div className="toast-body">
            <span className="toast-name">{place.name}</span>
            <span className="toast-label"> is added</span>
          </div>
          <button
            className="toast-close"
            onClick={e => { e.stopPropagation(); onDismiss(place.id); }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
