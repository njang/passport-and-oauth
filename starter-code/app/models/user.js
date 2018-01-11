
var mongoose = require('mongoose');
var findOrCreate = require('mongoose-findorcreate');
var Schema = mongoose.Schema;

var userSchema = new Schema ({
    google: {
       id: String,
       access_token: String,
       email: String
 }
});

userSchema.plugin(findOrCreate);
module.exports = mongoose.model('User', userSchema);