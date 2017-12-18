const assert = require('assert');
const ObjectID = require('mongodb').ObjectID;

const USERS = 'users';

function Users(db) {
  this.db = db;
  this.users = db.collection(USERS);
}

Users.prototype.getUser = function(id, mustFind = true) {
  const searchSpec = {
    _id: new String(id)
  };
  return this.users.find(searchSpec).toArray().
  then(function(users) {
    return new Promise(function(resolve, reject) {
      if (users.length === 1) {

        resolve(users[0]);
      } else if (users.length == 0 && !mustFind) {
        resolve(null);
      } else {
        reject(new Error(`cannot find user ${id}`));
      }
    });
  });
}
Users.prototype.newUser = function(id, hashedPassword, other) {

  return this.users.insertOne({
    _id: new String(id),
    hashedPassword,
    other
  }).
  then(function(results) {
    console.log(results)
    return new Promise((resolve) => resolve(id));

  });
}
module.exports = {
  Users: Users,
};
