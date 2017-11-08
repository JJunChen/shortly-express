const models = require('../models');
const Promise = require('bluebird');

module.exports.createSession = (req, res, next) => {
  if (!req.cookies || !req.cookies.shortlyid) {
    models.Sessions.create().then((result) => {
      models.Sessions.get({id: result.insertId}).then(session => {
        req.session = session;
        res.cookie('shortlyid', session.hash);
        next();
      });
    });
  } else {
    models.Sessions.get({hash: req.cookies.shortlyid}).then(result => {
      if (result) {
        req.session = result;
        models.Users.get({id: result.userId}).then(user => {
          if ( user ) {
            req.user = user;
            req.userId = user.id;
          }
          next();
        });
      } else {
        models.Sessions.create().then((result) => {
          models.Sessions.get({id: result.insertId}).then(session => {
            req.session = session;
            res.cookie('shortlyid', session.hash);
            next();
          });
        });
        
      }
    });
  }
};

/************************************************************/
// Add additional authentication middleware functions below
/************************************************************/

