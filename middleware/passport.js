let LocalStrategy = require('passport-local').Strategy
let nodeifyit = require('nodeifyit')
let User = require('../user')

module.exports = (app) => {
  let passport = app.passport

  passport.serializeUser(nodeifyit(async (user) => user._id))
  passport.deserializeUser(nodeifyit(async (id) => {
    return await User.promise.findById(id)
  }))

  passport.use(new LocalStrategy({
    // Use "email" and "username"
    usernameField: 'username',
    failureFlash: true
  }, nodeifyit(async (username, password) => {
    let user;
    if (username.indexOf('@')) {
      let email = username.toLowerCase()
      user = await User.promise.findOne({email})
    } else {
      // 'i' in the regex means ignore case
      let regexp = new RegExp(username, 'i')
      user = await User.promise.findOne({
        username: {$regex: regexp}
      })
    }

    if (!user || username !== user.username) {
      return [false, {message: 'Invalid username'}]
    }

    if (!await user.validatePassword(password)) {
      return [false, {message: 'Invalid password'}]
    }
    return user
  }, {spread: true})))

  passport.use('local-signup', new LocalStrategy({
    // Use "email" field instead of "username"
    usernameField: 'email',
    failureFlash: true,
    passReqToCallback: true
  }, nodeifyit(async (req, email, password) => {
      email = (email || '').toLowerCase()
      // Is the email taken?
      if (await User.promise.findOne({email})) {
        return [false, {message: 'That email is already taken.'}]
      }

      let {username, title, description} = req.body

      let regexp = new RegExp(username, 'i')
      let query = {username: {$regex: regexp}}

      if (await User.promise.findOne(query)) {
        return [false, {message: 'That username is already taken.'}]
      }
      // create the user
      let user = new User()
      user.email = email
      user.username = username
      user.blogTitle = title
      user.blogDescription = description

      // conditions for the password (length > 4, one letter(small and cap) and number)
      let passed = password.length >= 4 && 
      /[A-Z]/.test(password) && 
      /[a-z]/.test(password) && 
      /[0-9]/.test(password) 
      
      if (passed) {
        user.password = await user.generateHash(password)
      } else {
        return [false, {message: 'Password does not satsfy the conditions'}]
      }

      try {
        return await user.save()
      } catch(e) {
        return [false, {message: e.message}]
      }
  }, {spread: true})))
}