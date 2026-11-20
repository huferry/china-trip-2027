import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_OPTS = {
  subdomains: 'abc',
  maxZoom: 19,
  attribution: '© OpenStreetMap',
};

function makeMarkerHtml(num, name, isHotel) {
  const dotClass = isHotel ? 'dm-dot dm-dot--hotel' : 'dm-dot';
  const badge = isHotel
    ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9.5L12 3l9 6.5V21H15v-6H9v6H3V9.5z"/></svg>`
    : `<span class="dm-num">${num}</span>`;
  return `
    <div class="dm-marker">
      <div class="${dotClass}">${badge}</div>
      <div class="dm-bubble${isHotel ? ' dm-bubble--hotel' : ''}">
        <div class="dm-bubble-tail${isHotel ? ' dm-bubble-tail--hotel' : ''}"></div>
        <span class="dm-name">${name}</span>
      </div>
    </div>`;
}

export default function DayMapDialog({ pois, dayTitle, onClose, hasPrev, hasNext, onPrev, onNext }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || pois.length === 0) return;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer(TILE_URL, TILE_OPTS).addTo(map);

    // Markers — hotels numbered separately from places
    let placeNum = 0;
    pois.forEach((poi) => {
      const isHotel = poi.type === 'hotel';
      if (!isHotel) placeNum++;
      const num = isHotel ? 'H' : placeNum;
      const icon = L.divIcon({
        className: '',
        html: makeMarkerHtml(num, poi.name, isHotel),
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });
      L.marker([poi.lat, poi.lng], { icon, zIndexOffset: isHotel ? 200 : 100 }).addTo(map);
    });

    // Animated route line
    if (pois.length > 1) {
      const coords = pois.map(p => [p.lat, p.lng]);

      // Shadow / glow pass
      L.polyline(coords, {
        color: '#f0a500',
        weight: 8,
        opacity: 0.15,
        className: 'dm-route-glow',
        interactive: false,
      }).addTo(map);

      // Animated dashed line
      L.polyline(coords, {
        color: '#f0a500',
        weight: 3,
        opacity: 0.9,
        className: 'dm-route-line',
        interactive: false,
      }).addTo(map);
    }

    // Fit all POIs in view
    const bounds = L.latLngBounds(pois.map(p => [p.lat, p.lng]));
    map.fitBounds(bounds.pad(0.25));

    return () => map.remove();
  }, [pois]);

  return (
    <div className="dm-overlay" onClick={onClose}>
      <div className="dm-dialog" onClick={e => e.stopPropagation()}>
        <div className="dm-header">
          <button className="dm-nav" onClick={onPrev} disabled={!hasPrev} title="Previous day">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <h3 className="dm-title">{dayTitle}</h3>
          <button className="dm-nav" onClick={onNext} disabled={!hasNext} title="Next day">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
          <button className="dm-close" onClick={onClose} title="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        {pois.length === 0
          ? <p className="dm-empty">No mapped places found for this day.</p>
          : <div ref={containerRef} className="dm-map" />
        }
      </div>
    </div>
  );
}
