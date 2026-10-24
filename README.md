# China Trip 2027

A private trip-planning web app for our China trip in January 2027 — Shenzhen, Guangzhou, and Foshan.

**Live:** https://huferry-china-trip.web.app

## Release Notes

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

```sh
npx firebase-tools deploy --only hosting --project huferry-china-trip
```
