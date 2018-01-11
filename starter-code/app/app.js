const express        = require('express');
const path           = require('path');
const logger         = require('morgan');
const bodyParser     = require('body-parser');
const app            = express();
const mongoose       = require('mongoose');
const passport       = require('passport');
const expressSession = require('express-session');
const cookieParser   = require("cookie-parser");

const User           = require('./models/user');
const ENV            = require('./app-env');
const findOrCreate   = require('mongoose-findorcreate');

// Mongoose Setup
mongoose.connect('mongodb://localhost:27017/google-authentication-app');

// Middleware
app.use(cookieParser());
app.use(expressSession({secret: 'mySecretKey'}));
app.use(passport.initialize());
app.use(passport.session());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
app.use(express.static(__dirname + '/public'));

passport.serializeUser((user, done) => {
	done(null, user);
});
passport.deserializeUser((user, done) => {
	done(null, user);
});

// require("./config/passport")(passport)

// Setting up the Passport Strategies
const googleClientKey    = ENV.GOOGLE_CLIENT_ID;
const googleClientSecret = ENV.GOOGLE_CLIENT_SECRET;
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
// Add code here:
// Use the GoogleStrategy within Passport.
// Strategies in Passport require a `verify` function, which accept
// credentials (in this case, an accessToken, refreshToken, and Google
// profile), and invoke a callback with a user object.
passport.use(new GoogleStrategy({
    clientID: googleClientKey,
    clientSecret: googleClientSecret,
    callbackURL: "http://127.0.0.1:3000/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, done) {
		User.findOrCreate({ googleId: profile.id }, function (err, user) {
			return done(err, user);
  	});
  }
));

// GET /auth/google
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in Google authentication will involve redirecting
//   the user to google.com.  After authorization, Google will redirect the user
//   back to this application at /auth/google/callback
app.get('/auth/google',
  passport.authenticate('google', { scope: 'email' }));

// GET /auth/google/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/auth/google/callback', 
  passport.authenticate('google', { successRedirect: '/', failureRedirect: '/' }));

// Logout
app.get('/logout', () => {
  req.logout();
  res.redirect('/')
}); 

// Homepage
app.get('/', function(req, res){
  res.render('layout', {user: req.user});
});

app.listen(3000);
