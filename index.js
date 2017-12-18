#!/usr/bin/env nodejs

'use strict';
const assert = require('assert');
const mongo = require('mongodb').MongoClient;
const process = require('process');
const model = require('./model/model');
const server = require('./server/server');
const DB_URL = 'mongodb://localhost:27017/user';
const path = require('path');
const minimist = require('minimist');
var port = 0;
var authTimeout = '';
var sslDir = '';
const OPTS = [
  ['t', 'auth-time'],
  ['d', 'ssl-dir']
];

const DEFAULT_AUTH_TIMEOUT = 300;
const DEFAULT_SSL_DIR = '.';

function usage(prg) {
  const opts = OPTS.map(function(opt) {
    const value = opt[1].replace('-', '_').toUpperCase();
    return `[ -${opt[0]}|--${opt[1]} ${value} ]`
  });
  console.error(`usage: ${path.basename(prg)} ${opts.join(' ')} PORT`);
  process.exit(1);
}

function getOptions(argv) {
  const opts0 = OPTS.reduce((a, b) => a.concat(b), []);
  const opts = minimist(argv.slice(2));
  if (opts._.length !== 1) usage(argv[1]);
  for (let k of Object.keys(opts)) {
    if (k === '_') continue;
    if (opts0.indexOf(k) < 0) {
      console.error(`bad option '${k}'`);
      usage(argv[1]);
    }
  }
  port = opts._[0];
  authTimeout = opts.t || opts['auth-time'] || DEFAULT_AUTH_TIMEOUT;
  sslDir = opts.d || opts['ssl-dir'] || DEFAULT_SSL_DIR;
  return {
    port: opts._[0],
    authTimeout: opts.t || opts['auth-time'] || DEFAULT_AUTH_TIMEOUT,
    sslDir: opts.d || opts['ssl-dir'] || DEFAULT_SSL_DIR
  };
}

if (!module.parent) {
  getOptions(process.argv);

}
mongo.connect(DB_URL).

then(function(db) {
  const model1 = new model.Model(db);
  server.serve(port, authTimeout, sslDir, model1);
  //db.close();
}).
catch((e) => console.error(e));


module.exports = {
  options: getOptions(process.argv)
};
