import { useState } from 'react';
import SuggestionDialog from './SuggestionDialog';

function Stars({ rating }) {
  const max = 5;
  const filled = Math.round(rating || 0);
  return (
    <span title={`${rating}/5`}>
      {'★'.repeat(filled)}{'☆'.repeat(max - filled)}
    </span>
  );
}

function NameCell({ place }) {
  const url = place.links?.photos || null;
  const name = (
    <>
      {place.name}
      {place.name_zh && <div className="name-zh">{place.name_zh}</div>}
    </>
  );
  if (url) {
    return (
      <a className="place-link" href={url} target="_blank" rel="noopener noreferrer">
        {name}
      </a>
    );
  }
  return <span>{name}</span>;
}

function WantToGoBtn({ placeId, wishlist, onToggle }) {
  const active = wishlist?.has(placeId);
  return (
    <button
      className={`want-btn${active ? ' want-btn--active' : ''}`}
      onClick={() => onToggle(placeId)}
      title={active ? 'Remove from my list' : 'Add to my list'}
    >
      {active ? '★ Going' : '☆ Want to go'}
    </button>
  );
}

function DeleteBtn({ onDelete }) {
  const [confirm, setConfirm] = useState(false);
  if (confirm) {
    return (
      <span className="delete-confirm">
        <button className="delete-yes-btn" onClick={onDelete}>✓</button>
        <button className="delete-no-btn" onClick={() => setConfirm(false)}>✗</button>
      </span>
    );
  }
  return (
    <button className="delete-btn" onClick={() => setConfirm(true)} title="Delete">🗑</button>
  );
}

function PlaceRow({ place, wishlist, onToggleWishlist, isAdmin, onDelete, voters }) {
  const active = wishlist?.has(place.id);
  return (
    <tr id={`place-${place.id}`} className={active ? 'row--selected' : ''}>
      <td className="col-name"><NameCell place={place} /></td>
      <td className="col-rating"><Stars rating={place.rating} /></td>
      <td className="col-desc" data-label="Description">{place.description || ''}</td>
      <td className="col-practical" data-label="Practical">{place.practical || ''}</td>
      <td className="col-vote">
        <WantToGoBtn placeId={place.id} wishlist={wishlist} onToggle={onToggleWishlist} />
        {isAdmin && voters?.length > 0 && (
          <div className="voters">{voters.join(', ')}</div>
        )}
      </td>
      {isAdmin && (
        <td className="col-admin">
          <DeleteBtn onDelete={() => onDelete(place.id)} />
        </td>
      )}
    </tr>
  );
}

function RestaurantRow({ place, isAdmin, onDelete }) {
  return (
    <tr>
      <td className="col-name"><NameCell place={place} /></td>
      <td className="col-rating"><Stars rating={place.rating} /></td>
      <td className="col-desc" data-label="Description">{place.description || ''}</td>
      <td className="col-price" data-label="Price/person">{place.price_per_person || ''}</td>
      <td className="col-watch" data-label="Watch out">{place.watch_out || ''}</td>
      {isAdmin && (
        <td className="col-admin">
          <DeleteBtn onDelete={() => onDelete(place.id)} />
        </td>
      )}
    </tr>
  );
}

function CategoryTable({ category, places, city, wishlist, onToggleWishlist, onPlaceAdded, isAdmin, onDeletePlace, votersByPlace }) {
  const [showDialog, setShowDialog] = useState(false);
  const isRestaurant = places.some(p => p.type === 'restaurant');

  return (
    <section className="category-section">
      <div className="category-header">
        <h3>{category}</h3>
        <button className="suggest-btn" onClick={() => setShowDialog(true)}>+ Make suggestion</button>
      </div>
      {showDialog && (
        <SuggestionDialog
          city={city}
          category={category}
          existingPlaces={places}
          onClose={() => setShowDialog(false)}
          onPlaceAdded={onPlaceAdded}
        />
      )}
      <table className="places-table">
        <thead>
          <tr>
            <th className="col-name">Name</th>
            <th className="col-rating">★</th>
            <th className="col-desc">Description</th>
            {isRestaurant ? (
              <>
                <th className="col-price">Price/person</th>
                <th className="col-watch">Watch out</th>
              </>
            ) : (
              <>
                <th className="col-practical">Practical</th>
                <th className="col-vote">Going</th>
              </>
            )}
            {isAdmin && <th className="col-admin"></th>}
          </tr>
        </thead>
        <tbody>
          {places.map(place =>
            isRestaurant
              ? <RestaurantRow key={place.id} place={place} isAdmin={isAdmin} onDelete={onDeletePlace} />
              : <PlaceRow
                  key={place.id}
                  place={place}
                  wishlist={wishlist}
                  onToggleWishlist={onToggleWishlist}
                  isAdmin={isAdmin}
                  onDelete={onDeletePlace}
                  voters={votersByPlace?.get(place.id)}
                />
          )}
        </tbody>
      </table>
    </section>
  );
}

export default CategoryTable;
