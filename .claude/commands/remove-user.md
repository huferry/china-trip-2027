Remove a user from the China Trip app.

The argument is the user's email address.

Steps:
1. If no email was provided as argument, list all current users by running:
   `node -e "const {initializeApp,cert}=require('firebase-admin/app');const {getFirestore}=require('firebase-admin/firestore');const k=JSON.parse(require('fs').readFileSync('./service-account.json','utf8'));initializeApp({credential:cert(k),projectId:'huferry-china-trip'});const db=getFirestore();db.collection('allowedUsers').get().then(s=>s.docs.forEach(d=>console.log(d.id,d.data().displayName??'')))"`
   Then ask the user which email to remove.
2. Confirm with the user: "Remove [email] ([name])? This will also delete their wishlist. (yes/no)"
3. Only proceed if the user confirms with "yes".
4. Run: `node scripts/remove-user.mjs $ARGUMENTS`
5. Report the result.
