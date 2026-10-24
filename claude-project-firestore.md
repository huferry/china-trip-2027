# China Trip 2027 — Firestore Guide

## Project
Firebase project: `huferry-china-trip`  
App: https://huferry-china-trip.web.app

---

## `places` collection — schema

Each document in the `places` collection represents one place. The Firestore document ID is auto-generated.

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | ✓ | English name |
| `name_zh` | string | ✓ | Chinese name |
| `city` | string | ✓ | `Shenzhen`, `Guangzhou`, or `Foshan` |
| `category` | string | ✓ | See categories below |
| `type` | string | ✓ | `place` or `restaurant` |
| `area` | string \| null | | District or neighbourhood |
| `rating` | number | ✓ | 1–5 |
| `description` | string | ✓ | What makes it worth visiting |
| `practical` | string | | Opening hours, tips, metro stop |
| `links.source` | string | | Source URL |
| `links.photos` | string | | Wikimedia Commons search URL |
| `suggestedBy` | string | | Email of user who suggested it |
| `suggestedAt` | Timestamp | | When it was suggested |

### Known categories
- `Iconic buildings & viewpoints`
- `Museums & culture`
- `Parks & nature`
- `Markets & shopping`
- `Kung fu & temples`
- `Old towns, gardens & crafts`
- `Nature`
- `Restaurants`
- `Food`
- `Day trip`

### `links.photos` format
Use a Wikimedia Commons media search URL:
```
https://commons.wikimedia.org/w/index.php?search=Place+Name+City&title=Special:MediaSearch&type=image
```

---

## Adding a new place

### Via Firebase Admin SDK (Node.js script)

```js
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { readFile } from 'fs/promises';

const key = JSON.parse(await readFile('./service-account.json', 'utf8'));
initializeApp({ credential: cert(key), projectId: 'huferry-china-trip' });
const db = getFirestore();

await db.collection('places').add({
  name: 'Place Name',
  name_zh: '地名',
  city: 'Shenzhen',
  category: 'Parks & nature',
  type: 'place',
  area: null,
  rating: 4,
  description: 'What makes this place worth visiting.',
  practical: 'Opening hours and useful tips.',
  links: {
    source: '',
    photos: 'https://commons.wikimedia.org/w/index.php?search=Place+Name+Shenzhen&title=Special:MediaSearch&type=image',
  },
});
```

Requires `./service-account.json` — download from Firebase Console → Project Settings → Service Accounts → Generate new private key.

### Via Firebase Console
Firestore → `places` collection → Add document → leave ID blank (auto-generate) → add fields as above.

---

## Removing a place

```js
// Find by name
const snap = await db.collection('places').where('name', '==', 'Place Name').get();
for (const doc of snap.docs) await doc.ref.delete();
```

---

## Other collections

| Collection | Purpose |
|---|---|
| `allowedUsers/{email}` | Registered users (added via invite link) |
| `invites/{token}` | One-time invite tokens (20-day expiry) |
| `wishlists/{email}` | Per-user "I want to go" selections (array of place document IDs) |

---

## Firestore security rules (summary)

- `places`: read by allowed users, create by allowed users, no update/delete
- `allowedUsers`: read by authenticated users, create only via valid invite token
- `invites`: read by authenticated users, update only to mark as used
- `wishlists`: read/write by the owner only
