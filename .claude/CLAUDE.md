# China Trip 2027 Application

## Stacks
No backend, it's a web application with Firestore database.
The frontend is build using React framework.

## Phase 1
This is an application that will show the places to see
in Chine in our next trip in January 2027.
The initial database data is collected on `./temp/china-trip-places.json`. For the initial look and feel,
build the list in tables style. There should be a table for each category. 
There will be a tab for each city.
Links should work, when click should be opened in a new tab.
The application is in dark-mode.

## Phase 2 - SSO protection
The application is protected by SSO. Only Google account is allowed.
The user is asked to join by a invitation link.
The invitation link can be created by running 'npm run create-invite-url', then create a QR code for the link 
on `./invitations/<chinatrip>-<date:yyyymmdd>.png` (the date/time is the invitation creation time). 
This folder should be git-ignored.
The invitation link can be used for 20 days.

When the inviation link is opened, it will ask you to sign in with Google SSO. It will add the user to the application

When a user want to use the application, he should authenticate first.

When a user tries to login using Google SSO and it's not registered, the permission is denied.

## Phase 3 - Voting
On each item (row) create a toggle button "I want to go".
This should be saved in the database, and each selection is unique per user.
When selected, the row will be slightly lighter coloured.
Voting doesn't apply for restaurants, so don't beuild toggle button for restaurants.
On the right side, same line as city names, add toggle 'all' and 'going', to filter the places.

## Phase 4 - Add suggestion
Above every table, on the right side add button 'Make suggestion'.
When click, a dialog bo will appear.
A chat box will appear, and this chat box is connected to Claude API.
It will start by the question 'Name the place you want to suggest. Describe it 
as clear as possible, mention the name, place, and a small description is most welcome'.
Then Claude will find the place, show the result to the user and prompt whether this is 
the place the user meant. Iterate this until the user is satisfied.
When satisfied, Claude will fill in the properties, just as the other items.
Claude will add this item only when it's not already on the list.
Upon succesful add, confirm the user.
User can cancel the process anythime by clicking 'Cancel' button.

### add 1
When a new suggestion is accepted and saved, a toast notification will appear '<name> is addded'.
Toast will stays for 1 minute. It's clickable, when clicked it will navigate the user to the newly added place.
For other users:
- when he's online he will get the toast notification immediately
- otherwise, the toast will appear at the moment he opens the app

## Phase 5 - Admin features
The user `huferry@gmail.com` is the superadmin. This must be configurable in the environment variable, and the
value should not be commited to git.
As a superadmin, it has these features that the other users do not have:
- On the list, there is a 'delete' button for each item
- On the last column 'Going', it also mentions who has voted 'want to go'. Mentioned the first name of the user, not the email address. The first name will be extracted from the full name, based on best effort.

### Add 1
On the very bottom, display the version number and date of release (yyyy-mm-dd)

## Deployment
Application should be deployed on Firebase as a web host.
The data will be stored in the Firstore from the same project.