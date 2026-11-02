const CITY_ORDER = ['Shenzhen', 'Guangzhou', 'Foshan'];

function LinkIcon({ url }) {
  if (!url) return null;
  let domain;
  try { domain = new URL(url).hostname.replace(/^www\./, ''); } catch { return null; }
  const labels = {
    'tripadvisor.com': 'TripAdvisor',
    'en.wikipedia.org': 'Wikipedia',
    'trip.com': 'Trip.com',
    'guide.michelin.com': 'Michelin',
    'maps.google.com': 'Google Maps',
  };
  const label = labels[domain] ?? domain;
  return (
    <a className="place-icon-link" href={url} target="_blank" rel="noopener noreferrer" title={label}>
      <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`} alt={label} width="14" height="14" />
    </a>
  );
}

function PlaceLinks({ place }) {
  const urls = [place.links?.source, place.links?.tripcom, place.links?.maps].filter(Boolean);
  if (urls.length === 0) return null;
  return (
    <div className="place-icons">
      {urls.map(url => <LinkIcon key={url} url={url} />)}
    </div>
  );
}

export default function GoingTab({ places, votersByPlace }) {
  const votedPlaces = places.filter(p => votersByPlace.has(p.id) && p.type !== 'restaurant');

  if (votedPlaces.length === 0) {
    return <p className="going-empty">No places have been voted for yet.</p>;
  }

  return (
    <div className="going-tab">
      {CITY_ORDER.map(city => {
        const cityPlaces = votedPlaces
          .filter(p => p.city === city)
          .sort((a, b) => (votersByPlace.get(b.id)?.length || 0) - (votersByPlace.get(a.id)?.length || 0));
        if (cityPlaces.length === 0) return null;
        return (
          <section key={city} className="going-city-section">
            <h3 className="going-city-heading">{city}</h3>
            <table className="places-table going-table">
              <thead>
                <tr>
                  <th className="col-name">Place</th>
                  <th className="col-desc">Description</th>
                  <th className="going-col-votes">Voters</th>
                </tr>
              </thead>
              <tbody>
                {cityPlaces.map(place => {
                  const voters = votersByPlace.get(place.id) || [];
                  return (
                    <tr key={place.id}>
                      <td className="col-name">
                        <span>{place.name}</span>
                        {place.name_zh && <div className="name-zh">{place.name_zh}</div>}
                        <PlaceLinks place={place} />
                      </td>
                      <td className="col-desc" data-label="Description">{place.description || ''}</td>
                      <td className="going-col-votes" data-label="Voters">
                        <span className="going-vote-count">{voters.length}</span>
                        <div className="going-voter-names">{voters.join(', ')}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        );
      })}
    </div>
  );
}
