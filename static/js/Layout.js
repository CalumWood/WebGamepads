const HIDABLES = ["Triggers", "Bumpers", "Menus", "DPAD", "Buttons", "LeftJoystick", "RightJoystick"]
const REVERSABLES = ["LeftJoystickColumn", "RightJoystickColumn"]

var state = { "hidden": {}, "reverseOrder": {} }

loadState()
populateHidables()

window.addEventListener("resize", setupKeepAspectRatio);
setupKeepAspectRatio()

function populateHidables() {
    var settingsList = document.getElementById("settingsBox");
    addLabel(settingsList, "Hidable Elements", "header")
    HIDABLES.forEach(addButton.bind(settingsList, handleToggleHiding, "hidden", true));
    addLabel(settingsList, "Reversable Elements", "header")
    REVERSABLES.forEach(addButton.bind(settingsList, handleToggleReversed, "reverseOrder", false));
}

function safeGet(dict, default_value) {
    return dict !== "undefined" ? dict : default_value
}

function addLabel(elem, text, cls="") {
    var label = document.createElement("label");
    label.classList.add(cls)
    label.textContent = text
    elem.appendChild(label);
}

function addButton(fun, category, defaultVal, id) {
    var input = document.createElement("input")
    input.type = "checkbox"
    input.onchange = fun.bind(input, id)
    input.checked = state[category][id] !== undefined ? state[category][id] : defaultVal

    var label = document.createElement("label");
    label.textContent = id.replace(/([A-Z]+)*([A-Z][a-z])/g, "$1 $2")
    label.appendChild(input);

    this.appendChild(label);
}

function saveState() {
    window.localStorage.setItem("Settings", JSON.stringify(state))
}

function loadState() {
    var string = window.localStorage.getItem("Settings")
    if (string) {
        console.log("Loading Settings...")
        var data = JSON.parse(string)
        if (data.hidden) {
            for (const [key, value] of Object.entries(data.hidden)) {
                setElementHidden(key, value);
            }
        } else { data.hidden = {} }
        if (data.reverseOrder) {
            for (const [key, value] of Object.entries(data.reverseOrder)) {
                setReverseOrder(key, value);
            }
        } else { data.reverseOrder = {} }
        state = data
        console.log("Loading Complete")
    }
}

function openFullscreen() {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
        elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) { /* Safari */
        elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) { /* IE11 */
        elem.msRequestFullscreen();
    }
    screen.orientation.lock('landscape');
    document.getElementById("fullscreenButton").onclick = closeFullscreen
}

/* Close fullscreen */
function closeFullscreen() {
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.webkitExitFullscreen) { /* Safari */
        document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) { /* IE11 */
        document.msExitFullscreen();
    }
    screen.orientation.unlock();
    document.getElementById("fullscreenButton").onclick = openFullscreen
}


function alignElement() {
    this.flexDirection = "column-reverse"
}

function handleToggleReversed(id) {
    state["reverseOrder"][id] = this.checked
    setReverseOrder(id, this.checked)
    saveState()
}

function setReverseOrder(id, val) {
    state["reverseOrder"][id] = val
    if (val) {
        document.getElementById(id).style.flexDirection = "column-reverse"
    } else {
        document.getElementById(id).style.flexDirection = "column"
    }
}

function handleToggleHiding(id) {
    state["hidden"][id] = this.checked
    setElementHidden(id, this.checked)
    saveState()
}

function setElementHidden(id, val) {
    if (val) {
        document.getElementById(id).style.display = 'inherit';
    }
    else {
        document.getElementById(id).style.display = 'none';
    }
    setupKeepAspectRatio()
}

function keepAspectRatio(container) {
    var rect = container.getBoundingClientRect();
    if (rect.width < rect.height) {
        container.style.maxHeight = `${container.firstElementChild.getBoundingClientRect().width}px`;
    }
    else {
        container.style.maxHeight = "unset"
    }
    container.style.maxHeight = `${container.firstElementChild.getBoundingClientRect().width}px`;
}

function setupKeepAspectRatio() {
    Array.from(document.getElementsByClassName("aspect-container")).forEach(keepAspectRatio)
}
