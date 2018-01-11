var mongoose = require('mongoose');

module.exports = mongoose.model('User',{
  google: {
    id: String,
    access_token: String,
    email: String
  }
});