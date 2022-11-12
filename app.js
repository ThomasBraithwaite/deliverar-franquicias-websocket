const StompJs = require('stompjs');
const SockJS = require('sockjs-client');
const handler = require('./handler');

const socket = new SockJS('http://core.deliver.ar/cliente');
const stompClient = StompJs.over(socket);
connect()

function connect() {
  stompClient.connect({}, (frame) => connected(frame), (error) => {
    console.log(error)
    disconnect()
    connect()
  });
}

function connected(frame) {
    console.log('Connected: ' + frame);
    stompClient.subscribe('/topic/proveedor', function (user) {
        handler.processMessage(JSON.parse(user.body));
    });
    stompClient.subscribe('/topic/repartidor', function (user) {
        handler.processMessage(JSON.parse(user.body));
    });
    stompClient.subscribe('/topic/partners', function (user) {
        handler.processMessage(JSON.parse(user.body));
    });

    stompClient.send('/topic/proveedor', undefined, JSON.stringify({hola: "hola"}))
}

function disconnect() {
    if (stompClient !== null) {
        stompClient.disconnect();
    }
    console.log("Disconnected");
}
