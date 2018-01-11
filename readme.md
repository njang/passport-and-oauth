# Into to OAuth and 3rd Party APIs with Express

### Objectives
*After this lesson, students will be able to:*

- Describe OAuth is & why it's commonly used
- Understand Passport Middleware
- Use a Passport strategy to authenticate with a 3rd party login

### Preparation
*Before this lesson, students should already be able to:*

- Use Mongo and Mongoose
- Create an app with Node and Express


## What is OAuth? Intro (10 mins)

You see many sites with buttons that allow for users to sign up with their Google or Twitter credentials.  OAuth makes all this possible.  

[OAuth](https://en.wikipedia.org/wiki/OAuth) is an agreed-upon set of standards for logging in through a third party service. It involves:

1. Leaving a website
2. Authenticating with the third party
3. Then the third party will redirect the user back to the original website with, among other things, an authentication token that can be persisted and used to request more information later.  

At a high level, the standard lays out the overall protocol of login: you have to have _this_ route in your application, with _these_ parameters in your request/response, and after that, you need to be directed to _these_ pages.  And because it's a set of standards that are universally accepted, there's a whole bunch of libraries we can use to make this happen - like [Passport](http://passportjs.org/)!

![google-login](https://www.busymac.com/images/google-oauth1.png)


You probably know this as "Login with Google": you click on "Login with Google", you're redirected to Google's application, and then you get back to your site.  As a developer, one benefit is that you don't have to worry about developing your own authentication system.  The other benefit is your application gets a whole bunch of information it can use - or persist - later on, from Google.  A downside for the users is that in order to login, they're giving a lot of of their data to the requesting application. Developers and companies love this, though, because they can use all this data from the OAuth provider (Google/Twitter etc).

#### How it works

To make any of our apps work, we need to first declare our app as a Google application using Google's [developer interface](https://console.developers.google.com/apis/dashboard).  Ultimately, we'll be defining the set of permissions / information we are requesting from the user.

A visitor of our website clicks **Login with Google**, and leaves our original application and are brought to Google - as a developer, you lose everything you had (params from a form, for example).  

As a Google user, when you login, you pass in two important pieces of information to Google: the **app ID** and the **app secret** that identifies the application requesting the information.  

After our app is given the okay, Google sends back an **access token**. With that access token, Google can identify users of our application as real Google users. These access tokens only last so long, usually expiring after a week or so, but with this access token we can call out to Google, if we want, and get Google data associated with that Google user.

## What is Passport?

From Passports Docs:


  "Passport is authentication middleware for Node. It is designed to serve a singular purpose: authenticate requests. When writing modules, encapsulation is a virtue, so Passport delegates all other functionality to the application. This separation of concerns keeps code clean and maintainable, and makes Passport extremely easy to integrate into an application.
  
  In modern web applications, authentication can take a variety of forms. Traditionally, users log in by providing a username and password. With the rise of social networking, single sign-on using an OAuth provider such as Facebook or Twitter has become a popular authentication method. Services that expose an API often require token-based credentials to protect access.
  
  Passport recognizes that each application has unique authentication requirements. Authentication mechanisms, known as strategies, are packaged as individual modules. Applications can choose which strategies to employ, without creating unnecessary dependencies."

## Let's create an app implementing Google login using Passport

To demonstrate OAuth, we are going to create a really simple app that shows the Google details of a user when there is a user connected or a link to Google login if the user isn't connected.

**note:** Passport allows for other strategies than OAuth, like a regular username and password. We will just be using OAuth. 

#### First, signup to use Google's API

Google provides step by step instructions [here](https://developers.google.com/identity/sign-in/web/devconsole-project)

For your Authorized Origins and Authorized Redirect URI's you are going to use: 

`http://127.0.0.1:3000`
and
`http://127.0.0.1:3000/auth/google/callback`

and the callback must be exactly identical in your route. (We'll get to the route later).

**IGNORE the Add Google Sign-in** button at the bottom. That is one way to do it, but we will do it another way, using Passport. 

#### Install the modules
```bash
npm install passport --save
npm install passport-oauth --save
$ npm install passport-google-oauth --save
```

#### Save environment variables

We now have GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET API keys! We need to use them in our app. This allows Google to keep tabs on who is using Google Login, and shut sites down that break their rules. 

We could plug them right into our code, but that would be **a bad idea** because their are clevel bad actors who want to steal good API keys and use them for malicious activities. There are currently probably several bots scraping github looking for lost API keys to grab, plug into apps, and continue black-hat-hacking the cyberweb. 

So we need to store them securely on our machine. We can do this by storing them in a JS file that doesn't get added to Github.

In app-env.js:
```js
module.exports.GOOGLE_CLIENT_ID="yourkey";
module.exports.GOOGLE_CLIENT_SECRET="yoursecret"
```
We put this file in our .gitignore, so it never gets pushed up to Github.

In .gitignore:
```
app-env.js
```

In our app.js, we can access these variables like this: 

```js
const ENV                = require('./app-env');
const googleClientKey    = ENV.GOOGLE_CLIENT_ID;
const googleClientSecret = ENV.GOOGLE_CLIENT_SECRET;
```

[Here](https://hackernoon.com/how-to-use-environment-variables-keep-your-secret-keys-safe-secure-8b1a7877d69c) are great step by step instructions on how to do this. 

#### Sessions

Sessions allow a user to stay logged in to a site. This is done using a Cookie stored in the users browser. Passport makes this easy :)

#### Hashing 

To keep our website secure, we don't want to store our session token in plain text. Our sessions middleware will help with that by hashing our session token. 

From Wikipedia: 
"
A cryptographic hash function allows one to easily verify that some input data maps to a given hash value, but if the input data is unknown, it is deliberately difficult to reconstruct it (or equivalent alternatives) by knowing the stored hash value. This is used for assuring integrity of transmitted data, and is the building block for HMACs, which provide message authentication.
"

A hashing algorithm can take a string as an optional parameter to make the hash unique. This is getting complicated, so just accept that this works, and [look into it more](https://en.wikipedia.org/wiki/Hash_function#Hashing_with_cryptographic_hash_functions) if you like later. 

#### Adding Passport Middleware
```js
// we need cookieParser middleware to handle Sessions
app.use(express.cookieParser());
app.use(express.bodyParser());
// here we set up sessions, and add a string to our secret. This string will be used to hash our session token. 
app.use(express.session({ secret: 'random string used for creating a unique hash' }));
app.use(passport.initialize());
app.use(passport.session());
app.use(app.router);
```

#### Create the User Model

To have a user, we need a user model!

Now that Google knows about us - and note, you'll have to do this for each application you use Google auth - we can jump into our application and add the fields into the user model to store the data sent back by Google.

In `models/user.js`:

```javascript
var mongoose = require('mongoose');

module.exports = mongoose.model('User',{
  google: {
    id: String,
    access_token: String,
    email: String
  }
});
```

#### Add the Google strategy

We need to add our Google strategy. This is found in the Passport documentation.

```javascript
const User = require('../models/user');
const passport = require('passport');
const googleClientKey = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

// Use the GoogleStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and Google
//   profile), and invoke a callback with a user object.

passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: "http://www.example.com/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, done) {
       User.findOrCreate({ googleId: profile.id }, function (err, user) {
         return done(err, user);
       });
  }
));
```

There's a lot going on here so lets break it down.

- First, we give the credentials for the current app to the Google strategy;
- The function that follows will be executed when Google sends back the data to the website using `/auth/google/callback` endpoint;
- Finally, if the user already exists, the code directly executes the callback and gives the user object found by mongo to the callback, otherwise, we create a new user object and execute the callback.

#### Add the routes and the views

To authenticate via OAuth with Google, an app needs three routes:

- A route to request Google
- A route for the Google callback
- A route for the logout

Here's the routes for the request and the callback from Passport's docs:

```js
// GET /auth/google
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in Google authentication will involve redirecting
//   the user to google.com.  After authorization, Google will redirect the user
//   back to this application at /auth/google/callback
app.get('/auth/google',
  passport.authenticate('google', { scope: 'https://www.google.com/m8/feeds' });

// GET /auth/google/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
  });
```

And finally, the logout route is nice and simple:

```js
app.get('/logout', () => {
  req.logout();
  res.redirect('/')
});    
```

For simplicity sake, we will set up just one view that shows different data depending on whether or not the user is logged in or not. In layout.hbs, add:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Google authentication</title>
</head>
<body>
  <h1>GOOGLE LOGIN USING PASSPORT</h1>
  <div>
      {{#if user }}
        <h2> Below is the data sent by google</h2>
        <pre>
          {{user.fb}}
        </pre>
        <a href="/logout">Logout</a>
      {{else}}
        <a href="/auth/google">Login with Google</a>
      {{/if}}
  </div>
</body>
</html>
```

Look, again, in your `user.js` file, to the block of code that provides us with the `user` object if it already exists - there are a whole bunch of attributes that we'll have access to. In this case, if the user exists, we'll do a `user.google` to show the Google data for the current user and a link to logout, or a link to sign-in via Google, if the user isn't logged in.  Remember, from our logic above, if the user doesn't exist, and they click sign-in, we will create a new user for our application using information from Google.

Now, we need to create a route to render this view:

```javascript
app.get('/', function(req, res){
  res.render('layout', {user: req.user});
});
```

When using passport, the user object will always be attached to the request object. In this method, the user object will be sent to the view using `{user: req.user}`.


## Conclusion

- Why does OAuth make it easy for third-party libraries to be developed to allow for social login?
- Why is OAuth awesome for developers and comapnies?
- What concerns should users have as they login with Google?

# The Lab
**For your sanity** this lab is reccomended to be done in pairs. There are a lot of small details and two heads are better than one. 

## Set Up
1. Fork and Clone this repo!
2. `cd starter-code/app`
3. `npm install`
4. in new tab in same directory: `mongod`
5. in new tab in same directory: `nodemon app.js`

## The Work
1. Go through the instructions in this lesson to add Google OAuth2 to this app! 

## A Small Warning
OK, so the view file for this assignment is in Handlebars, instead of EJS. It's just another template engine, and you don't need to change that code at all. It's just there for you to test out if your OAuth is working. So don't freak out. It's just what was there in the lesson I used as a template, and it's a pain to switch them out, so don't be mad, k thanks. 

## Resources
1. This lesson
2. [Passport's OAuth docs](http://www.passportjs.org/docs/oauth/)
3. [Passport's Google OAuth docs](http://www.passportjs.org/docs/google/)
4. [Google's Developer Docs](https://developers.google.com/identity/sign-in/web/devconsole-project)
4. Your Peers
5. The solution Code
6. Your instructors

