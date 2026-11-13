import { useState } from 'react';
import GoingTab from './GoingTab';
import PlanTab from './PlanTab';

export default function PlanMode({ places, votersByPlace, isAdmin, isGuest, user }) {
  const [tab, setTab] = useState('plan');

  return (
    <div className="plan-mode">
      {!isGuest && (
        <nav className="plan-subtab-bar">
          <button
            className={`plan-subtab-btn${tab === 'going' ? ' active' : ''}`}
            onClick={() => setTab('going')}
          >
            ★ Going
          </button>
          <button
            className={`plan-subtab-btn${tab === 'plan' ? ' active' : ''}`}
            onClick={() => setTab('plan')}
          >
            📅 Plan
          </button>
        </nav>
      )}
      <div className="plan-mode-content">
        {!isGuest && tab === 'going'
          ? <GoingTab places={places} votersByPlace={votersByPlace} />
          : <PlanTab places={places} votersByPlace={votersByPlace} isAdmin={isAdmin} isGuest={isGuest} user={user} />
        }
      </div>
    </div>
  );
}
