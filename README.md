# Payment-Processing-with-Stripe
Used a payment processing system to manage and charge users. Used a template engine and sessions. Also created user and admin interfaces

Created a subscription app using Stripe that allows customer users to create and manage subscriptions, and that allows an
administrator user to manage subscriptions of all customer users.
This web application has three monthly subscription plans:
  - Basic - $10 per month
  - Plus - $20 per month
  - Advanced - $30 per month
  
 
#### This guide

* node_modules – Our application's dependancies. npm manages this folder automatically.
* api.db – The database where the table "messages" exits.
* package-lock.json – Machine-readable version of package.json for npm. npm manages this folder automatically. [More here](https://docs.npmjs.com/configuring-npm/package-lock-json.html#:~:text=Description,regardless%20of%20intermediate%20dependency%20updates.)
* package.json – Works with npm to manage application's dependancies.
* README.md - This file.

# Languages and Tools used
    - NodeJS
    - Stripe
    - Axios Promises
    - Socket.IO
    - Twilio
 
 # Learning Objectives
    - Use a payment processing system to manage and charge users
    - Use a template engine and sessions
    - Create user and admin interfaces

#### Development
* Make sure you install npm dependances first: `npm install`
* To run both server and client: `npm run start`
* To run only server or client: `npm run server|client`
