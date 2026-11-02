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

### Add 2
The names are now clickable. I want the item to have multiple links.
Instead of making the name clickable, add icon(s) under the Chinese name.
Find the icons for Wikipedia, Trip.com, TripAdvisor.com, etc.
When an item has more than 1 links, all should be shown.

### Add 3
When resultion is mobile, make the link-icons twice the width and twice the height, because
it's now too small to tap.

### Fix 4
- When an item is marked 'Going', the element highlighted is not even
the original background color is still seen between the texts.
- The text on price column on restaurants, doesn't flow to new line.

### Add 5
When adding a new suggestion, try to add the links from: TripAdvisor.com, Trip.Com, Google Maps

## Phase 6 - Plan mode
The current mode is called 'info' mode and a new 'plan' mode will be introduced.
The switch could be made by 'info'/'plan' icon next to the title, on the right side. This will be display with an icon
and the text 'switch to ... mode'.

The 'Plan' mode. On this mode there are two tabs: 'Going', 'Plan'.

On the 'Going' tab, list all the places which are voted by the users.
The list is grouped by the city. Display in a table format, with columns: place name, short description, how many voters. Also include the links, like on the 'info' mode.

On the 'Plan' tab. 
For all users: display the plan. When no plan is created show the text to inform that.
For super admin, under the plan add text box, to give instruction to create a plan.
Super admin will give instruction to Claude to create a plan based on the votes.
This plan will be day by day plan. Super admin can refine the plan by chatting to claude.

General requirements for the plan:
- Itinerery should include columns: time, place name, note, how to get there
- On 'note': short description of the place, entrence ticket if any, reservation necessity if any
- How to get there: give 2 alternatives, with metro and with taxi (Didi). For both give price estimation for 6 people.
- Start the day on 9:00 am
- Walking on food, is slow walk
- Upon calculating walking to metro station, add 10 minutes (to compensate lost the way)
- For lunch and dinner, suggest 5 places near the place we are already at. Prioritize
  dining places that are already suggested in the list. The prices should be mixed, only 2 places
  which are above $30 per person

### Fix 1
The toast notification for new places should be dismissed for each user when the user click on the close button.
Right now, each time I logged in the toast notifications appear, even if I have dismissed it in the previous session.

## Deployment
Application should be deployed on Firebase as a web host.
The data will be stored in the Firstore from the same project.