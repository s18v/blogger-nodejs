let mongoose = require('mongoose')
let bcrypt = require('bcrypt')
let nodeify = require('bluebird-nodeify')

require('songbird')

let userSchema = mongoose.Schema({
  username: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  blogTitle: String,
  blogDescription: String
})

userSchema.methods.generateHash = async function(password) {
  return await bcrypt.promise.hash(password, 8)
}

userSchema.methods.validatePassword = async function(password) {
  return await bcrypt.promise.compare(password, this.password)
}

userSchema.pre('save', function (callback) {
  nodeify(async() => {
    // isModified checks if the argument is modified from the original
    if(!this.isModified('password')) {
      return callback()
    }
    this.password = await this.generateHash(this.password)
    console.log('this password - ', this.password)
  }(), callback)
})

//checks this just before the password (or other field) is added to the db
userSchema.path('password').validate((pw) => {
  return pw.length >= 4 && /[A-Z]/.test(pw) && /[a-z]/.test(pw) &&
  /[0-9]/.test(pw) 
})

module.exports = mongoose.model('User', userSchema)
