import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './auth';
import { useWishlist } from './hooks/useWishlist';
import CityTab from './components/CityTab';
import LoginPage from './components/LoginPage';

const CITIES = ['Shenzhen', 'Guangzhou', 'Foshan'];

function App() {
  const { user, status, signOut } = useAuth();
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCity, setActiveCity] = useState('Shenzhen');
  const [filter, setFilter] = useState('all');
  const { items: wishlist, toggle: toggleWishlist } = useWishlist(user?.email);

  useEffect(() => {
    if (status !== 'allowed') return;
    async function fetchPlaces() {
      try {
        const snapshot = await getDocs(collection(db, 'places'));
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPlaces(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchPlaces();
  }, [status]);

  if (status === 'loading') return <div className="loading">Loading…</div>;
  if (status !== 'allowed') return <LoginPage status={status} />;

  const cityPlaces = places.filter(p =>
    p.city === activeCity && (filter === 'all' || wishlist.has(p.id))
  );

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-main">
          <div>
            <h1>China Trip 2027</h1>
            <p className="subtitle">Shenzhen · Guangzhou · Foshan &nbsp;|&nbsp; Jan 2027</p>
          </div>
          <div className="header-user">
            <span className="user-email">{user.email}</span>
            <button className="signout-btn" onClick={signOut}>Sign out</button>
          </div>
        </div>
      </header>

      <nav className="tab-bar">
        <div className="tab-cities">
          {CITIES.map(city => (
            <button
              key={city}
              className={`tab-btn${activeCity === city ? ' active' : ''}`}
              onClick={() => setActiveCity(city)}
            >
              {city}
            </button>
          ))}
        </div>
        <div className="tab-filter">
          <button
            className={`filter-btn${filter === 'all' ? ' active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={`filter-btn${filter === 'going' ? ' active' : ''}`}
            onClick={() => setFilter('going')}
          >
            ★ Going
          </button>
        </div>
      </nav>

      <main className="content">
        {loading && <p className="loading">Loading…</p>}
        {error && <p className="error">Error: {error}</p>}
        {!loading && !error && <CityTab places={cityPlaces} city={activeCity} wishlist={wishlist} onToggleWishlist={toggleWishlist} />}
      </main>
    </div>
  );
}

export default App;
