# Music Room Bookings API
Currently, my college uses a physical notebook for bookings in the music room. I decided to write an electronic web app to offer an alternative.

## Files included in this package
- `static/*`: Static content for the web app.
- `server.js`: The code that launches the Express app defined by `app.js`.
  - `app.js`: The Express app defining API endpoints. Requires `booksys.js` and `verify.js`.
    - `booksys.js`: The system for managing bookings.
    - `verify.js`: The definition of Google's signin API, used to authenticate users making requests.
- `package.json`: The NPM information for this project.
- `package-lock.json`: The required modules for the project.
- `README.md`: This readme.
# ADD ESLINTRC, TEST SCRIPT

## API Endpoints
### `/bookings`

#### GET `/bookings`
Returns a list of bookings

##### Headers
- (String, Optional) `token` - Google API token associated with the user whose bookings are required

##### Example response
```json
{
    "1": { // booking ID
        "booktime": "2019-05-01T18:46:34.124Z", // time, in ISO 8601, at which the booking was made
        "date": "04/05/2019",                   // date of booking
        "STime": "16:00",                       // start time of booking
        "ETime": "19:00",                       // end time of booking
        "recurrence": false,                    // whether or not the booking repeats every week
        "name": "Keith Johnson"                 // name of the booking
    },
    "2": {
        "booktime": "2019-05-01T18:42:47.125Z",
        "date": "02/05/2019",
        "STime": "20:00",
        "ETime": "22:00",
        "recurrence": true,
        "name": "Recurring booking"
    },
}
```

##### Sample call
```js
var response = await fetch('/bookings', {
    headers: {
        'token': idtoken
    }
});
```


#### POST `/bookings`
Makes a new booking, returns a list of the user's bookings

##### Headers
- (String, Required) `token` - Google API token associated with the user making the booking

#### Body (JSON)
- (String, Required) `date`: The date to make the booking on, formatted as `DD/MM/YYYY`
- (String, Required) `stime`: The time to start the booking at, formatted as `HH/mm`
- (String, Required) `etime`: The time to end the booking at, formatted as `HH/mm`
- (String, Optional) `name`: The name to give the booking (will use the first 32 characters of long inputs)
- (Boolean, Optional) `recurrence`: Whether or not the booking should repeat every week

`name` defaults to the name of the user's Google profile, and cannot be set otherwise except by users with permission level 2+
`recurrence` defaults to false, and cannot be set true except by users with permission level 2+

##### Example response
```json
{
    "1": { // booking ID
        "booktime": "2019-05-01T18:46:34.124Z", // time, in ISO 8601, at which the booking was made
        "date": "04/05/2019",                   // date of booking
        "STime": "16:00",                       // start time of booking
        "ETime": "19:00",                       // end time of booking
        "recurrence": false,                    // whether or not the booking repeats every week
        "name": "Keith Johnson"                 // name of the booking
    },
    "2": {
        "booktime": "2019-05-01T18:42:47.125Z",
        "date": "02/05/2019",
        "STime": "20:00",
        "ETime": "22:00",
        "recurrence": true,
        "name": "Keith Johnson"
    }
}
```

##### Sample call
```js
var response = await fetch('/bookings', {
    method: 'post',
    headers: {
        'Content-Type': 'application/json',
        'token': idtoken
    },
    body: {
        "date": "09/05/2019",
        "stime": "11:00",
        "etime": "13:00",
        "name": "Keith Johnson",
        "recurrence": true
    }
});
```


#### DELETE `/bookings`
Deletes a booking by ID

##### Headers
- (String, Required) `token` - Google API token associated with the user deleting the booking

#### Body (JSON)
- (String, Required) `id` - ID of the booking to be deleted

Users are always able to delete their own bookings, but admins (permission level 9) can delete any booking.

##### Response
Responds with 204 No Content

##### Sample call
```js
let response = await fetch('/bookings', {
    method: 'delete',
    headers: {
        'Content-Type': 'application/json',
        'token': idtoken
    },
    body: {
        'id': "1"
    }
});
```

### `/perms`

#### GET `/perms`
Gets the permission level of a user

##### Headers
- (String, Required) `token` - Google API token associated with the user whose perms are being queried

##### Example Response
```json
{
    "perms": 9
}
```

##### Sample call
```js
let response = await fetch('/perms', {
    headers: {
        'token': idtoken
    }
});
```

#### POST `/perms`
Updates the permissions for a user (only usable by users with permission level 9)

##### Headers
- (String, Required) `token` - Google API token associated with the user making the change

#### Body (JSON)
- (String, Required) `id`: The ID of the user whose permission level is to be changed
- (String, Required) `perms`: The level to give them

##### Sample call
```js
let response = await fetch('/perms', {
    method: 'post',
    headers: {
        'token': idtoken,
        'Content-Type': 'application/json'
    },
    body: {
        'id': '80',
        'perms': '9'
    }
});
```