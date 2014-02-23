if (window.angular) {
  angular.module('rtpmidi', []).
    factory('rtpmidi', function($timeout) {
      var EventEmitter = require("events").EventEmitter;

      var emit = EventEmitter.prototype.emit;
      EventEmitter.prototype.emit = function() {
        var that = this;
        emit.apply(that, arguments);
        $timeout(function() {

        })
      };

      return require('rtpmidi')
    });
} else {
  window.rtpmidi = require('rtpmidi');
}

