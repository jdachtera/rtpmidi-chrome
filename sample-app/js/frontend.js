angular.module('helloRtpmidi', ['rtpmidi']).
  controller('MainCtrl', function($scope, $timeout, rtpmidi) {
    $scope.hello = 'RTPMidi'
    rtpmidi.debug = true;

    chrome.storage.local.get(['lastAddress', 'lastPort'], function(results) {
      $timeout(function() {
        $scope.address = results.lastAddress || '127.0.0.1';
        $scope.port = results.lastPort || '5004';
      });
    });


    $scope.session = rtpmidi.manager.createSession({
      localName: 'My RTPMidi Session',
      bonjourName: 'Node Midi Client',
      port: 5006
    });

    $scope.messages = [];

    $scope.session.on('message', function(deltaTime, message) {
      $scope.messages.unshift(message);
      if ($scope.messages.length > 10) {
        $scope.messages.length = 10;
      }
    });

    $scope.clearMessages = function() {
      $scope.messages.length = 0;
    };

    $scope.formatMessage = function(message) {
      var output = '', piece;
      for (var i = 0; i < message.length; i++) {
        var piece = message[i];
        output += '0x' + (piece < 0x10 ? '0' : '') + piece.toString(16) + ' ';
      }
      return output;
    };


    $scope.connect = function() {
      chrome.storage.local.set({
        lastAddress: $scope.address,
        lastPort: $scope.port
      }, function(results) {
        console.log('Saved last address and port');
      });
      $scope.session.connect({ address: $scope.address, port: parseInt($scope.port, 10) });
      console.log($scope.session.streams[0].rinfo1);
    };

    $scope.mtc = new rtpmidi.MTC();
    $scope.mtc.setSource($scope.session);

  });