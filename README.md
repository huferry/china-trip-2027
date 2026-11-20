# China Trip 2027

A private trip-planning web app for our China trip in January 2027 — Shenzhen, Guangzhou, and Foshan.

**Demo:** https://chine-trip-demo.web.app — open to any Google account, AI capped at 3 calls/hour

![Demo QR code](docs/qr-demo.png)

## Release Notes

### v1.6.2 (2026-11-20)
- Plan versioning: each plan is now named (e.g. "v2 - 5 days Shenzhen - 9 days Guangzhou") and displayed in the app
- Admin history panel: list all saved plan versions and restore any version with one click
- Each Claude-generated plan is auto-snapshotted to `planVersions` collection for full history
- Didi prices updated throughout the plan to reflect Didi XL (7-seater) for 6 people (~1.5× standard fare)
- Firestore rules extended to cover `planVersions` collection

### v1.6.1 (2026-11-17)
- Security: Anthropic API key moved server-side to a Firebase Cloud Function — no longer exposed in the browser bundle
- Rate limiting and model selection now enforced server-side (not bypassable by extracting the key)
- Removed `@anthropic-ai/sdk` from browser dependencies

### v1.6.0
- Phase 10: Demo mode on separate Firebase project (chine-trip-demo) — open to any Google account, no invite needed
- AI capped at 3 calls/hour per user in demo mode; uses Haiku model to keep costs low
- Admin can backup the database via Claude chat: "backup database"
- Admin can restore the database via Claude chat: "restore-database"
- Database snapshots stored in Firestore `snapshots/latest`; backup script seeds demo from main project if empty
- Firebase config reorganised into `firebase/` folder; Firestore rules/indexes into `firestore/` folder
- `.gitignore` extended to block any filename containing key, secret, password, credentials

### v1.5.2
- Phase 9: Guest mode — "Enter as guest" link on login page
- Guests see the plan read-only: no voting, no suggestions, no Claude chat, no mode switch, no subtabs
- Guest TTS falls back to browser speech synthesis (no Cloud TTS charges)
- Firestore rules updated to allow anonymous users read-only access

### v1.5.1
- Text-to-speech upgraded to Google Cloud WaveNet (en-US-Wavenet-H) for natural-sounding narration
- Falls back to browser speech synthesis if Cloud TTS is unavailable
- Custom domain cn27.fun added as authorized domain for Firebase Auth

### v1.5.0
- Phase 8: Story feature — places with stories show a book icon in plan cards
- Clicking the story icon opens a dialog with the full narrative text
- Navigate between multiple stories per place with prev/next arrows
- Read-aloud button uses text-to-speech (prefers premium/enhanced system voices)
- Keyboard support: Escape to close, arrow keys to navigate stories
- Chinese addresses added for all 106 places in the database

### v1.4.1
- Amap (高德地图) POI links added for 27 major attractions across Shenzhen, Guangzhou, and Foshan
- Amap icon now shows alongside TripAdvisor, Trip.com, and Google Maps on Info and Going pages
- Plan mode cards now show place links (TripAdvisor, Trip.com, Google Maps, Amap) matched from the itinerary
- Plan mode cards show Chinese address with a copy-to-clipboard button (for easy Didi input)
- New suggestions now include Amap link and Chinese address fields

### v1.4.0
- Plan mode is now the default view when opening the app
- Plan mode is visible to all users (previously admin-only)
- Claude plan assistant chat remains admin-only

### v1.3.7
- Phase 7 rework: clicking a link opens a right-side drawer panel within the app (no new tabs or popups)
- Drawer shows site name, favicon, URL, and a prominent "Open in new tab" button
- Clicking the backdrop or pressing Escape closes the drawer

### v1.3.6
- Fix: place links now open in a popup window instead of an embedded iframe (external sites block iframe embedding)

### v1.3.5
- Mobile: link icons are 2× larger for easier tapping
- Fix: selected "Going" row now highlights evenly (no background gaps between cells)
- Fix: price column text now wraps on mobile
- Suggestions now include TripAdvisor, Trip.com, and Google Maps links automatically

### v1.3.4
- Added Google Maps links for 85 places across all three cities
- Each place now shows up to 3 icons: source (TripAdvisor/Wikipedia/Michelin), Trip.com, Google Maps

### v1.3.3
- Phase 5 Add 2: favicon icons below Chinese name for each place (Wikipedia, TripAdvisor, Michelin, Trip.com, etc.)
- Added Trip.com links for 77 places across Shenzhen, Guangzhou, and Foshan

### v1.3.2
- Phase 5: Superadmin features (configurable via env var, not committed to git)
  - Delete button per place (two-step confirm, no JS dialogs)
  - "Going" column shows voter first names for the admin
- Version number and release date shown in app footer (stamped at build time)

### v1.3.1
- Rotated Firebase API key (old key was exposed in git history)
- Firebase config moved to environment variables

### v1.3.0
- Phase 4: "Make suggestion" button on each category using Claude AI chat dialog
- Claude uses tool use to write directly to Firestore when user confirms a suggestion
- Toast notifications when a new place is added (real-time for online users, on next open for offline)
- Toast is clickable — navigates to the newly added place
- Markdown rendering in chat bubbles

### v1.2.0
- Phase 3: "I want to go" voting per place (non-restaurant rows only)
- Votes are saved per user in Firestore
- Selected rows are highlighted
- Filter toggle (All / Going) on the city tab bar

### v1.1.0
- Phase 2: Google SSO with invite-link access control
- Invitation links generated via `npm run create-invite-url` (QR code saved to `./invitations/`)
- Invitations valid for 20 days
- Firestore security rules protecting all data

### v1.0.0
- Phase 1: Places listed by city and category in dark-mode tables
- City tabs: Shenzhen, Guangzhou, Foshan
- Links open in new tab

## Inviting People

```sh
npm run create-invite-url
```

Generates a one-time invite link (valid 20 days) and saves a QR code to `./invitations/`.
Requires `./service-account.json` (Firebase service account key, git-ignored).

## Deployment

**Full mode** (huferry-china-trip):
```sh
npx firebase-tools deploy --only hosting --project huferry-china-trip --config firebase/firebase.json
```

**Demo mode** (chine-trip-demo):
```sh
# First, create .env.demo from .env.demo.example and fill in demo project credentials
# Optionally run a database backup first:
npm run backup

npm run deploy:demo
```

The demo deploy builds with `VITE_DEMO_MODE=true` and deploys to the `chine-trip-demo` Firebase project using `firebase.demo.json` (which references `firestore.demo.rules`).

**Demo service account:** save the demo project service account as `service-account.demo.json` (git-ignored) for `npm run backup`.
