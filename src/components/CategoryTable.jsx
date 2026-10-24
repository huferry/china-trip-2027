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

function PlaceRow({ place, wishlist, onToggleWishlist }) {
  const active = wishlist?.has(place.id);
  return (
    <tr className={active ? 'row--selected' : ''}>
      <td className="col-name"><NameCell place={place} /></td>
      <td className="col-rating"><Stars rating={place.rating} /></td>
      <td className="col-desc" data-label="Description">{place.description || ''}</td>
      <td className="col-practical" data-label="Practical">{place.practical || ''}</td>
      <td className="col-vote">
        <WantToGoBtn placeId={place.id} wishlist={wishlist} onToggle={onToggleWishlist} />
      </td>
    </tr>
  );
}

function RestaurantRow({ place }) {
  return (
    <tr>
      <td className="col-name"><NameCell place={place} /></td>
      <td className="col-rating"><Stars rating={place.rating} /></td>
      <td className="col-desc" data-label="Description">{place.description || ''}</td>
      <td className="col-price" data-label="Price/person">{place.price_per_person || ''}</td>
      <td className="col-watch" data-label="Watch out">{place.watch_out || ''}</td>
    </tr>
  );
}

function CategoryTable({ category, places, wishlist, onToggleWishlist }) {
  const isRestaurant = places.some(p => p.type === 'restaurant');

  return (
    <section className="category-section">
      <h3>{category}</h3>
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
                <th className="col-vote"></th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {places.map(place =>
            isRestaurant
              ? <RestaurantRow key={place.id} place={place} />
              : <PlaceRow key={place.id} place={place} wishlist={wishlist} onToggleWishlist={onToggleWishlist} />
          )}
        </tbody>
      </table>
    </section>
  );
}

export default CategoryTable;
