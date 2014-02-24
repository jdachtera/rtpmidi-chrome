if (window.angular) {
  angular.module('rtpmidi', []).
    factory('rtpmidi', function($rootScope, $timeout) {
      var EventEmitter = require("events").EventEmitter;

      // Monkey patch EventEmitter to make Angular perfom a digest
      var emit = EventEmitter.prototype.emit;
      EventEmitter.prototype.emit = function() {
        emit.apply(this, arguments);
        $timeout(function() {});
      };

      return require('rtpmidi')
    });
} else {
  window.rtpmidi = require('rtpmidi');
}

