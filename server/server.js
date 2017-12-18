const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require("path");
const http = require('http');
const https = require('https');
const OK = 200;
const CREATED = 201;
const SEE_OTHER = 303;
const BAD_REQUEST = 400;
const NOT_FOUND = 404;
const NO_CONTENT = 204;
const SERVER_ERROR = 500;
const UNAUTHORIZED = 401;
var jwt = require('jsonwebtoken');
var passwordHash = require('password-hash');


function serve(port, authTimeout, sslDir, model) {


  const app = express();
  app.locals.model = model;
  app.locals.port = port;
  app.use(bodyParser.urlencoded({
    extended: true
  }));
  app.use(bodyParser.json());

  var sslOptions = {
    key: fs.readFileSync(sslDir + '/key.pem'),
    cert: fs.readFileSync(sslDir + '/cert.pem')
  };

  setupRoutes(app);

  https.createServer(sslOptions, app).listen(port, function() {
    console.log(`listening on port ${port}`);
  });

  app.get('/users/:id', function(req, res) {
    var token = req.body.token || req.query.token || req.headers['x-access-token'] || req.header('Bearer');
    const id = req.params.id;
    if (token) {
      //Decode the token
      jwt.verify(token, "shhhhh", (err, decod) => {
        if (err) {

          if (!req.user) {
            res.status(NOT_FOUND).json({
              "status": "ERROR_NOT_FOUND",
              "info": "user " + id + " not found"
            });
          } else {
            res.status(UNAUTHORIZED).json({
              "status": "ERROR_UNAUTHORIZED",
              "info": "/users/" + id + " requires a bearer authorization header"
            });
          }
        } else {
          //If decoded then call next() so that respective route is called.
          req.decoded = decod;


          if (typeof id === 'undefined') {
            res.status(NOT_FOUND).json({
              "status": "ERROR_NOT_FOUND",
              "info": "user " + id + "not found"
            });
          } else {

            req.app.locals.model.users.getUser(id).
            then((results) => res.json(results)).
            catch((err) => {
              console.error(err);
              res.status(NOT_FOUND).json({
                "status": "ERROR_NOT_FOUND",
                "info": "user " + id + " not found"
              });
            });
          }

        }
      });
    } else {
      res.status(UNAUTHORIZED).json({
        "status": "ERROR_UNAUTHORIZED",
        "info": "/users/" + id + " requires a bearer authorization header"
      });
    }
  });
  app.put('/users/:id', function(request, response) {
    var id = request.params.id;
    var pw = request.query.pw;
    const other = request.body;
    var hashedPassword = passwordHash.generate(pw);
    // console.log(hashedPassword);
    // console.log(passwordHash.verify(pw,hashedPassword));
    if (typeof other === 'undefined') {
      console.error(`missing body`);
      response.sendStatus(BAD_REQUEST);
    } else if (request.user) {
      response.status(SEE_OTHER).json({
        "status": "EXISTS",
        "info": "user <ID> already exists"
      });
    } else {

      request.app.locals.model.users.newUser(id, hashedPassword, other).
      then(function(id) {
        var token = jwt.sign({
          id
        }, 'shhhhh', {
          expiresIn: authTimeout // expires in authTimeout
        });
        response.append('Location', requestUrl(request));
        response.status(CREATED).json({
          "status": "CREATED",
          "authToken": token
        });
      }).
      catch((err) => {
        console.error(err);
        console.log(err.code);
        response.sendStatus(SERVER_ERROR);
      });

    }

  }); // end of put
  app.put('/users/:id/auth', function(request, response) {
    var id = request.params.id;
    // var hashedP = request.user.hashedPassword;
    var passwordBody = request.body.pw;
    // console.log(passwordBody);
    // console.log(request.user.hashedPassword);
    // var checkPassword = passwordHash.verify(passwordBody,hashedP);
    // console.log(checkPassword);
    if (!request.user) {
      response.status(NOT_FOUND).json({
        "status": "ERROR_NOT_FOUND",
        "info": "user " + id + " not found"
      });
    } else {
      var hashedP = request.user.hashedPassword;
      var checkPassword = passwordHash.verify(passwordBody, hashedP);
      if (!checkPassword) {
        response.status(NOT_FOUND).json({
          "status": "ERROR_UNAUTHORIZED",
          "info": "/users/" + id + "/auth requires a valid 'pw' password query parameter"
        });
      } else {
        var token = jwt.sign({
          id
        }, 'shhhhh', {
          expiresIn: authTimeout // expires in authTimeout
        });
        response.status(CREATED).json({
          "status": "CREATED",
          "authToken": token
        });
      }
    } //end of else

  }); //end of put


} // end of serve


function setupRoutes(app) {
  app.use('/users/:id', cacheUser(app));
}

function requestUrl(req) {
  const port = req.app.locals.port;
  return `${req.protocol}://${req.hostname}:${port}${req.originalUrl}`;
}

module.exports = {
  serve: serve
}

function cacheUser(app) {
  return function(request, response, next) {
    const id = request.params.id;
    if (typeof id === 'undefined') {
      response.sendStatus(BAD_REQUEST);
    } else {

      request.app.locals.model.users.getUser(id, false).
      then(function(user) {
        request.user = user;
        next();
      }).
      catch((err) => {
        console.error(err);
        response.sendStatus(SERVER_ERROR);
      });
    }
  }
}
