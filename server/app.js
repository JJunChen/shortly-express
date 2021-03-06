const express = require('express');
const path = require('path');
const utils = require('./lib/hashUtils');
const partials = require('express-partials');
const bodyParser = require('body-parser');
const Auth = require('./middleware/auth');
const models = require('./models');
const cookieParser = require('./middleware/cookieParser');

const app = express();

app.set('views', `${__dirname}/views`);
app.set('view engine', 'ejs');
app.use(partials());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));
app.use('/', (req, res, next) => {
  cookieParser(req, res, next);
});
app.use('/', (req, res, next) => {
  Auth.createSession(req, res, next);
});

var getSession = (req) => {
  return models.Sessions.get({hash: req.session.hash}).then(session => session);
};

app.get('/', 
(req, res) => {
  getSession(req).then(session => {
    if (models.Sessions.isLoggedIn(session)) {
      res.render('index');
    } else {
      res.redirect('/login');
    }
  });
});

app.get('/create', 
(req, res) => {
  getSession(req).then(session => {
    if (models.Sessions.isLoggedIn(session)) {
      res.render('index');
    } else {
      res.redirect('/login');
    }
  });
});

app.get('/links', 
(req, res, next) => {
  getSession(req).then(session => {
    if (models.Sessions.isLoggedIn(session)) {
      models.Links.getAll()
        .then(links => {
          res.status(200).send(links);
        })
        .error(error => {
          res.status(500).send(error);
        });
    } else {
      res.redirect('/login');
    }
  });
});

app.post('/links', 
(req, res, next) => {
  var url = req.body.url;
  if (!models.Links.isValidUrl(url)) {
    // send back a 404 if link is not valid
    return res.sendStatus(404);
  }

  return models.Links.get({ url })
    .then(link => {
      if (link) {
        throw link;
      }
      return models.Links.getUrlTitle(url);
    })
    .then(title => {
      return models.Links.create({
        url: url,
        title: title,
        baseUrl: req.headers.origin
      });
    })
    .then(results => {
      return models.Links.get({ id: results.insertId });
    })
    .then(link => {
      throw link;
    })
    .error(error => {
      res.status(500).send(error);
    })
    .catch(link => {
      res.status(200).send(link);
    });
});

app.post('/signup',
(req, res, next) => {
  let username = req.body.username;
  let password = req.body.password;
  models.Users.get({username: username}).then(user => {
    if (user) {
      res.redirect('/signup');
    } else {
      models.Users.create({username, password}).then(() => {
        models.Users.get({username: username}).then(user => {
          models.Sessions.update({hash: req.session.hash}, {userId: user.id}).then(() => {
            res.redirect('/');
          });
        });
      });
    }
  });
});

app.post('/login',
(req, res, next) => {
  let username = req.body.username;
  let password = req.body.password;
  models.Users.get({username: username}).then(user => {
    if (user) {
      if (models.Users.compare(password, user.password, user.salt)) {
        res.redirect('/');
      } else {
        res.redirect('/login');
      }
    } else {
      res.redirect('/login');
    }
  });
});

app.get('/logout',
(req, res, next) => {
  models.Sessions.delete({hash: req.session.hash}).then(() => {
    next();
  });
});

app.get('/login',
(req, res, next) => {
  res.render('login');
});

app.get('/signup',
(req, res, next) => {
  res.render('signup');
});
/************************************************************/
// Write your authentication routes here
/************************************************************/



/************************************************************/
// Handle the code parameter route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/:code', (req, res, next) => {

  return models.Links.get({ code: req.params.code })
    .tap(link => {

      if (!link) {
        throw new Error('Link does not exist');
      }
      return models.Clicks.create({ linkId: link.id });
    })
    .tap(link => {
      return models.Links.update(link, { visits: link.visits + 1 });
    })
    .then(({ url }) => {
      res.redirect(url);
    })
    .error(error => {
      res.status(500).send(error);
    })
    .catch(() => {
      res.redirect('/');
    });
});

module.exports = app;
