
Array.from(document.getElementsByClassName('controllerButton')).forEach(setupButton);
Array.from(document.getElementsByClassName('joystick')).forEach(setupJoystick);

function getTouch(e, id) {
    if (!(window.TouchEvent && e instanceof TouchEvent) || id == -1) return;
    return Array.from(e.touches).find(x => x.identifier === id)
}

/* Joystick Functions */
function startJoystick(e) {
    e.preventDefault();
    if (window.TouchEvent && e instanceof TouchEvent) { this.touchID = e.targetTouches[e.targetTouches.length - 1].identifier }
    this.classList.add('active')
    this.isDragging = true;
    document.addEventListener(this.touchID > -1 ? 'touchmove' : 'mousemove', this.moveJoystick);
    document.addEventListener(this.touchID > -1 ? 'touchend' : 'mouseup', this.resetJoystick);
    if (Date.now() - this.lastClick < 400) this.press()
    this.lastClick = Date.now()
}

function moveJoystick(e) {
    e.preventDefault();
    let x = 0.0
    let y = 0.0

    const rect = this.parentElement.getBoundingClientRect();
    if (this.touchID > -1 && e instanceof TouchEvent) {
        var t = getTouch(e, this.touchID);
        x = t.clientX - rect.left;
        y = t.clientY - rect.top;
    }
    else if (e instanceof MouseEvent) {
        x = e.clientX - rect.left;
        y = e.clientY - rect.top;
    }

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const angle = Math.atan2(y - centerY, x - centerX);
    const radius = Math.min(centerX, centerY)
    const distanceFromCenter = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
    if (distanceFromCenter > radius) {
        x = centerX + radius * Math.cos(angle);
        y = centerY + radius * Math.sin(angle);
    }

    const normalizedX = ((x / Math.min(rect.width, rect.height)) * 2 - 1);
    const normalizedY = ((y / Math.min(rect.width, rect.height)) * 2 - 1);

    this.style.left = `${x}px`;
    this.style.top = `${y}px`;

    sendJoystickState(this.getAttribute('id'), normalizedX, -normalizedY)
}

function resetJoystick(e) {
    if (getTouch(e, this.touchID)) return;
    document.removeEventListener(this.touchID > -1 ? 'touchmove' : 'mousemove', this.moveJoystick);
    document.removeEventListener(this.touchID > -1 ? 'touchend' : 'mouseup', this.resetJoystick);
    this.classList.remove('active')
    this.touchID = -1
    this.isDragging = false;
    this.release.call(e);
    // Reset joystick position
    this.style.left = '50%';
    this.style.top = '50%';
    sendJoystickState(this.getAttribute('id'), 0.0, 0.0)
}

/* button Functions */
function startPress(e) {
    if (e) e.preventDefault();
    this.classList.add('active')
    if (window.TouchEvent && e instanceof TouchEvent) { this.touchID = e.targetTouches[e.targetTouches.length - 1].identifier }
    document.addEventListener(this.touchID > -1 ? 'touchend' : 'mouseup', this.releasePress);
    buttonPressed(this.getAttribute('id'), true)
}

function releasePress(e) {
    if (e) e.preventDefault();
    if (this.touchID != -1 && getTouch(e, this.touchID)) return;
    this.classList.remove('active')
    document.removeEventListener(this.touchID > -1 ? 'touchend' : 'mouseup', this.releasePress);
    this.touchID = -1
    buttonPressed(this.getAttribute('id'), false)
}

/* Elements Setup */
function setupButton(button) {

    var img = document.createElement("img")
    img.src = `/static/images/${button.getAttribute('id')}.png`
    img.alt = button.getAttribute('id')

    button.appendChild(img)
    button.press = startPress.bind(button)
    button.releasePress = releasePress.bind(button)

    button.ontouchstart = button.press
    button.onmousedown = button.press
    button.ontouchend = button.releasePress
    button.onmouseup = button.releasePress
}

function setupJoystick(joystick) {
    joystick.startJoystick = startJoystick.bind(joystick)
    joystick.moveJoystick = moveJoystick.bind(joystick)
    joystick.resetJoystick = resetJoystick.bind(joystick)

    joystick.lastClick = Date.now()
    joystick.press = buttonPressed.bind(joystick, joystick.getAttribute('id'), true)
    joystick.release = buttonPressed.bind(joystick, joystick.getAttribute('id'), false)

    joystick.resetJoystick.call()

    joystick.addEventListener('mousedown', joystick.startJoystick);
    joystick.addEventListener('touchstart', joystick.startJoystick);
}
