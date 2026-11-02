import { createContext, useContext, useState, useEffect } from 'react';

const InWindowContext = createContext(null);

export function InWindowProvider({ children }) {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') setUrl(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <InWindowContext.Provider value={{ url, openUrl: setUrl, closeUrl: () => setUrl(null) }}>
      {children}
    </InWindowContext.Provider>
  );
}

export function useInWindow() {
  return useContext(InWindowContext);
}
