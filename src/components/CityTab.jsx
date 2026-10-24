import CategoryTable from './CategoryTable';

// Define a preferred order for categories
const CATEGORY_ORDER = [
  'Iconic buildings & viewpoints',
  'Museums & culture',
  'Parks & nature',
  'Markets & shopping',
  'Kung fu & temples',
  'Old towns, gardens & crafts',
  'Nature',
  'Restaurants',
  'Food',
  'Day trip',
  'Day trips',
];

function getCategoryOrder(cat) {
  const lower = cat.toLowerCase();
  for (let i = 0; i < CATEGORY_ORDER.length; i++) {
    if (lower.includes(CATEGORY_ORDER[i].toLowerCase())) return i;
  }
  return 99;
}

function CityTab({ places, city }) {
  if (!places || places.length === 0) {
    return <p className="loading">No places found for {city}.</p>;
  }

  // Group by category
  const categoryMap = {};
  for (const place of places) {
    if (!categoryMap[place.category]) {
      categoryMap[place.category] = [];
    }
    categoryMap[place.category].push(place);
  }

  const categories = Object.keys(categoryMap).sort(
    (a, b) => getCategoryOrder(a) - getCategoryOrder(b)
  );

  return (
    <div className="city-tab">
      {categories.map(cat => (
        <CategoryTable
          key={cat}
          category={cat}
          places={categoryMap[cat]}
        />
      ))}
    </div>
  );
}

export default CityTab;
