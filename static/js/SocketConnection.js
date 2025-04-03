var socket = io.connect('http://' + location.hostname + ':' + location.port);
var lastSelectedController = -1

// server side connections
socket.on('connect', function () {
    document.getElementById("DisconnectedImg").style.display = 'none';
    console.log('Connected to the server');
});

socket.on('disconnect', function () {
    document.getElementById("DisconnectedImg").style.display = 'inherit';
    console.log('Disconnected to the server');
});

socket.on('controllerListChanged', populateControllerList)
socket.on('controllerStateChanged', controllerStateChanged)


function get(object, key, default_value) {
    var result = object[key];
    return (typeof result !== "undefined") ? result : default_value;
}


function getCurrentGamepad() {
    return document.getElementById("controllersList").value
}


function addController() {
    document.getElementById("addControllerButton").disabled = true;
    console.log("Adding new Gamepad")
    socket.emit('add_joycon')
}


function populateControllerList(controllerList) {
    console.log(`Updated Controller List: controllerList=${controllerList}`);
    var container = document.getElementById("controllersList")
    container.innerHTML = ""
    controllerList.forEach(controller => {
        var el = document.createElement("option");
        el.textContent = controller;
        el.value = controller;
        container.appendChild(el);
    });
    document.getElementById("addControllerButton").disabled = false;
}


function controllerStateChanged(data) {
    // needs work, check which browsers support this
    if ('vibrate' in navigator && get(data, "gamepad", -1) == getCurrentGamepad()) {
        let vibrate = (get(data, "small_motor", 0) + get(data, "large_motor", 0))
        navigator.vibrate(vibrate > 0 ? 1000 : 0)
        console.log(`vibrating: ${vibrate}`)
    }

}


// client side actions
function buttonPressed(button, state) {
    if (socket.connected) {
        console.log(`Sending: button=${button}, state=${state}`);
        socket.emit('update_joycon_button', { 'gamepad': getCurrentGamepad(), 'Button': button, 'State': state });
    }
}


function sendJoystickState(stick, X, Y) {
    if (socket.connected) {
        console.log(`Sending: Stick=${stick}  X=${X}, Y=${Y}`);
        socket.emit('update_joycon_axis', { 'gamepad': getCurrentGamepad(), 'Axis': stick, 'State': [X, Y] });
    }
}