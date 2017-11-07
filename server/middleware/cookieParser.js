const auth = require('./auth.js');

const parseCookies = (req, res, next) => {
  let result = {};
  if (req.headers.cookie) {
    let cookies = req.headers.cookie.split('; ');
    for (let cookie of cookies) {
      let keyValue = cookie.split('=');
      result[keyValue[0]] = keyValue[1];
    }
    req.cookies = result;
    res.end(result);
    next();
  } else {
    auth.createSession(req, res, next);
  }
};

module.exports = parseCookies;