import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import CityTab from './components/CityTab';

const CITIES = ['Shenzhen', 'Guangzhou', 'Foshan'];

function App() {
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCity, setActiveCity] = useState('Shenzhen');

  useEffect(() => {
    async function fetchPlaces() {
      try {
        const snapshot = await getDocs(collection(db, 'places'));
        const data = snapshot.docs.map(doc => doc.data());
        setPlaces(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchPlaces();
  }, []);

  const cityPlaces = places.filter(p => p.city === activeCity);

  return (
    <div className="app">
      <header className="app-header">
        <h1>China Trip 2027</h1>
        <p className="subtitle">Shenzhen · Guangzhou · Foshan &nbsp;|&nbsp; Jan 2027</p>
      </header>

      <nav className="tab-bar">
        {CITIES.map(city => (
          <button
            key={city}
            className={`tab-btn${activeCity === city ? ' active' : ''}`}
            onClick={() => setActiveCity(city)}
          >
            {city}
          </button>
        ))}
      </nav>

      <main className="content">
        {loading && <p className="loading">Loading…</p>}
        {error && <p className="error">Error: {error}</p>}
        {!loading && !error && <CityTab places={cityPlaces} city={activeCity} />}
      </main>
    </div>
  );
}

export default App;
