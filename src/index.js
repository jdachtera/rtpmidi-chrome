"use strict";

process.on = function(eventName, callback) {
  if ('eventName' == 'SIGINT') {
    chrome.app.window.current().onClosed.addListener(callback);
  }
};

module.exports = {
  manager:            require('./node-rtpmidi/src/manager'),
  Session:            require('./node-rtpmidi/src/Session'),
  Stream:             require('./node-rtpmidi/src/Stream'),
  AbstractMessage:    require('./node-rtpmidi/src/AbstractMessage'),
  ControlMessage:     require('./node-rtpmidi/src/ControlMessage'),
  RTPMessage:         require('./node-rtpmidi/src/RTPMessage'),
  MTC:                require('./node-rtpmidi/src/MTC')
};

