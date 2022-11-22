const StompJs = require('stompjs');
const SockJS = require('sockjs-client');
const handler = require('./handler');

const socket = new SockJS('http://core.deliver.ar/franquicia');
const stompClient = StompJs.over(socket);
connect()

function connect() {
  stompClient.connect({}, (frame) => connected(frame), (error) => {
    console.log(error)
    disconnect()
    connect()
  })
}

function connected(frame) {
    console.log('Connected: ' + frame);
    stompClient.subscribe('/topic/franquicia', function (user) {
        handler.processMessage(JSON.parse(user.body));
    });
    stompClient.send("/app/franquicia");
}

function disconnect() {
    if (stompClient !== null) {
        stompClient.disconnect();
    }
    console.log("Disconnected");
}
