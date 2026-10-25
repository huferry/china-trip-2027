Build and deploy the China Trip app to Firebase Hosting.

Steps:
1. Ask the user whether it is a minor or patch release
2. Update the project version
3. Run `npm run build` and confirm it succeeds
4. Add release notes on README.md
5. Commit changes, tag with version number, push to this origin `https://github.com/huferry/china-trip-2027.git`
6. Run `npx firebase-tools deploy --only hosting --project huferry-china-trip`
7. Report the hosting URL when done
