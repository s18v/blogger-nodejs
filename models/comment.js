let mongoose = require('mongoose')
require('songbird')

let CommentSchema = mongoose.Schema({
  content: {
    type: String,
    required: true
  }
})

module.exports = mongoose.model('Comment', CommentSchema)