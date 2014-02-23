#!/usr/bin/env node

var browserify = require('browserify'),
    fs = require('fs');

var b = browserify();

b.require('./src/dgram', {expose: 'dgram'});
b.require('./src/mdns', {expose: 'mdns'});

b.require('./src/index', {expose: 'rtpmidi'});

b.add('./src/module');

b.bundle({}, function(err, src) {
  if (err) return console.error(err);

  fs.writeFileSync('./sample-app/js/rtpmidi-chrome.js', src);
})