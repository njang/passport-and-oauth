var mongoose = require('mongoose');

const Schema = mongoose.Schema;

const userSchema = new Schema({
	google: {
	    id: String,
	    access_token: String,
	    email: String
  	}
});



module.exports = mongoose.model('User', userSchema);
