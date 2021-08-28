'use strict';
var bcrypt = require('bcryptjs');
var csrf = require('csurf');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
const redis = require('redis');
const connectRedis = require('connect-redis');

/**
 * Constructor for Authentication class
 *
 * @class Authentication
 * @param {Object[]} validUsers
 * @param {boolean} useEncryptedPasswords
 */
function Authentication(validUsers, useEncryptedPasswords, mountPath) {
  this.validUsers = validUsers;
  this.useEncryptedPasswords = useEncryptedPasswords || false;
  this.mountPath = mountPath;
}

function initialize(app, options) {
  options = options || { };
  var self = this;
  passport.use('local', new LocalStrategy(
    function (username, password, cb) {
      var match = self.authenticate({
        name: username,
        pass: password
      });
      if (!match.matchingUsername) {
        return cb(null, false, { message: 'Invalid username or password' });
      }
      cb(null, match.matchingUsername);
    })
  );

  passport.serializeUser(function (username, cb) {
    cb(null, username);
  });

  passport.deserializeUser(function (username, cb) {
    var user = self.authenticate({
      name: username
    }, true);
    cb(null, user);
  });

  var cookieSessionSecret = options.cookieSessionSecret || require('crypto').randomBytes(64).toString('hex');
  app.use(require('connect-flash')());
  app.use(require('body-parser').urlencoded({ extended: true }));
  app.set('trust proxy', 1);
  const RedisStore = connectRedis(session)
  const redisClient = redis.createClient(options.config.redisOptions || {
    host: 'localhost',
    port: 6379
  })
  redisClient.on('error', function (err) {
    console.log('Could not establish a connection with redis. ' + err);
  });
  redisClient.on('connect', function (err) {
    console.log('Connected to redis successfully');
  });
  app.use(session({
    store: new RedisStore({ client: redisClient }),
    secret: cookieSessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // if true only transmit cookie over https
      httpOnly: false, // if true prevent client side JS from reading the cookie
      maxAge: 1000 * 60 * 10 // session max age in miliseconds
    }
  }))

  app.use(passport.initialize());
  app.use(passport.session());

  app.post('/login',
    csrf(),
    passport.authenticate('local', {
      successRedirect: `${self.mountPath}apps`,
      failureRedirect: `${self.mountPath}login`,
      failureFlash: true
    })
  );

  app.get('/logout', function (req, res) {
    req.session.destroy(err => {
      if (err) {
        return console.log(err);
      }
      res.redirect(`${self.mountPath}login`);
    });
  });
}

/**
 * Authenticates the `userToTest`
 *
 * @param {Object} userToTest
 * @returns {Object} Object with `isAuthenticated` and `appsUserHasAccessTo` properties
 */
function authenticate(userToTest, usernameOnly) {
  let appsUserHasAccessTo = null;
  let matchingUsername = null;
  let isReadOnly = false;

  //they provided auth
  let isAuthenticated = userToTest &&
    //there are configured users
    this.validUsers &&
    //the provided auth matches one of the users
    this.validUsers.find(user => {
      let isAuthenticated = false;
      let usernameMatches = userToTest.name == user.user;
      let passwordMatches = this.useEncryptedPasswords && !usernameOnly ? bcrypt.compareSync(userToTest.pass, user.pass) : userToTest.pass == user.pass;
      if (usernameMatches && (usernameOnly || passwordMatches)) {
        isAuthenticated = true;
        matchingUsername = user.user;
        // User restricted apps
        appsUserHasAccessTo = user.apps || null;
        isReadOnly = !!user.readOnly; // make it true/false
      }

      return isAuthenticated;
    }) ? true : false;

  return {
    isAuthenticated,
    matchingUsername,
    appsUserHasAccessTo,
    isReadOnly,
  };
}

Authentication.prototype.initialize = initialize;
Authentication.prototype.authenticate = authenticate;

module.exports = Authentication;
