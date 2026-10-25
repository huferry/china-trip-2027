List all users of the China Trip app.

Run:
`node -e "const {initializeApp,cert}=require('firebase-admin/app');const {getFirestore}=require('firebase-admin/firestore');const k=JSON.parse(require('fs').readFileSync('./service-account.json','utf8'));initializeApp({credential:cert(k),projectId:'huferry-china-trip'});const db=getFirestore();db.collection('allowedUsers').get().then(s=>s.docs.forEach(d=>console.log(d.id,d.data().displayName??'')))" 2>/dev/null`

Display the results as a markdown table with columns: Email, Name.
