Build and deploy the China Trip app to the demo Firebase project (chine-trip-demo).

Steps:
1. Verify `.env.demo` exists. If not, tell the user to create it from `.env.demo.example` and stop.
2. Verify `service-account.demo.json` exists. If not, warn the user (needed for backup) but continue.
3. Run `npm run backup` to snapshot the current demo database before deploying (requires `service-account.demo.json`). Skip with a warning if the service account is missing.
4. Run `npm run build:demo` and confirm it succeeds.
5. Run `npx firebase-tools deploy --project demo --config firebase/firebase.demo.json`
6. Report the hosting URL (https://chine-trip-demo.web.app) when done.
