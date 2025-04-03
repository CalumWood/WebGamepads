import os
from flask import Flask, render_template, request
from flask_socketio import SocketIO
import logging
import vgamepad as vg
from pathlib import Path
import qrcode
import io
import socket
import configparser

controllers: dict = {}
config: configparser.ConfigParser = None
app = Flask(__name__)
socketio = SocketIO(app)

mappingButton = {
    "A": vg.XUSB_BUTTON.XUSB_GAMEPAD_A,
    "B": vg.XUSB_BUTTON.XUSB_GAMEPAD_B,
    "X": vg.XUSB_BUTTON.XUSB_GAMEPAD_X,
    "Y": vg.XUSB_BUTTON.XUSB_GAMEPAD_Y,
    "Left": vg.XUSB_BUTTON.XUSB_GAMEPAD_LEFT_THUMB,
    "Right": vg.XUSB_BUTTON.XUSB_GAMEPAD_RIGHT_THUMB,
    "Menu": vg.XUSB_BUTTON.XUSB_GAMEPAD_START,
    "View": vg.XUSB_BUTTON.XUSB_GAMEPAD_BACK,
    "DPAD_UP": vg.XUSB_BUTTON.XUSB_GAMEPAD_DPAD_UP,
    "DPAD_LEFT": vg.XUSB_BUTTON.XUSB_GAMEPAD_DPAD_LEFT,
    "DPAD_DOWN": vg.XUSB_BUTTON.XUSB_GAMEPAD_DPAD_DOWN,
    "DPAD_RIGHT": vg.XUSB_BUTTON.XUSB_GAMEPAD_DPAD_RIGHT,
    "LB": vg.XUSB_BUTTON.XUSB_GAMEPAD_LEFT_SHOULDER,
    "RB": vg.XUSB_BUTTON.XUSB_GAMEPAD_RIGHT_SHOULDER,
}


def main() -> None:
    """Main function to start the server using the flask app"""
    global config

    path = Path(os.path.realpath(__file__)).parent
    path = path.parent.parent if path.name == "library.zip" else path
    load_config(path.joinpath("settings.ini"))

    app.static_folder = path.joinpath("static").resolve()
    app.template_folder = path.joinpath("templates").resolve()

    with app.app_context():
        init_before_first_serve()

    socketio.run(
        app,
        host=config.get("server_settings", "host", fallback="0.0.0.0"),
        port=config.getint("server_settings", "port", fallback=27037),
        debug=config.getint("server_settings", "debug", fallback=0),
    )


def init_before_first_serve() -> None:
    """Tasks to do before server is available,
    initialise controllers and print network info
    """
    print_QR_code_address()
    print()
    initialise_new_controller()
    print("\n(CTRL + C) to stop")


def load_config(dir: Path) -> None:
    """Load the config file into the `global config`

    :param dir: Path to the config file
    :type dir: Path
    """
    global config

    config = configparser.ConfigParser()
    config.read(dir)


def print_QR_code_address() -> None:
    """Prints network information to the terminal"""
    port = str(config.getint("server_settings", "port", fallback=27037))
    host = socket.gethostname()

    # Get LAN IP addresses from each of the network adapters
    ip_addresses = []
    for ip in socket.gethostbyname_ex(host)[2]:
        ip_addresses.append(f"http://{ip}:{port}")

    # Create a QR code of the first IP address
    qr = qrcode.QRCode()
    if ip_addresses:
        qr.add_data(ip_addresses[0])
    stream = io.StringIO()
    qr.print_ascii(out=stream)
    stream.seek(0)

    # Print collected information to terminal
    print(stream.getvalue())
    for ip_address in ip_addresses:
        print(f"IP Address:\t{ip_address}")
    print(f"Host Address:\thttp://{host}:{port}")


def get_controller(data: dict) -> vg.VX360Gamepad:
    """Returns the gamepad given a dict sent by a client.

    :param data: where `key = gamepad` and `value = valid`
    index of an initialised controller
    :type data: dict
    :return: A valid and initialised controller or `None`
    :rtype: VX360Gamepad
    """
    try:
        index = int(data.get("gamepad", -1))
        return controllers.get(index, None)
    except ValueError:
        logging.error("Malformed Gamepad Index")
        return None


def initialise_new_controller() -> None:
    """Initialise a new controller and adds it to `controllers`"""
    gamepad = vg.VX360Gamepad()
    index = int(gamepad.get_index())
    gamepad.register_notification(
        callback_function=(
            lambda client, target, large_motor, small_motor, led_number, user_data: controller_callback(
                index, large_motor, small_motor, led_number
            )
        )
    )
    controllers[index] = gamepad
    logging.info(f"Created controller {index}")


def controller_callback(
    index: int, large_motor: int, small_motor: int, led_number: int
) -> None:
    """Callback function for when the virtual controller wants to send
    data to the clients, currently sends all data to all clients.

    :param index: index of which controller in controllers
    :type index: int
    :param large_motor: State of large motor for vibrations
    :type large_motor: int
    :param small_motor: State of small motor for vibrations
    :type small_motor: int
    :param led_number: State of LEDs
    :type led_number: int
    """
    data = {}
    data["gamepad"] = index
    data["large_motor"] = large_motor
    data["small_motor"] = small_motor
    data["led_number"] = led_number
    socketio.emit("controllerStateChanged", data)


@app.route("/")
def default_path() -> None:
    """Docstring for defaultPath"""
    return render_template("gamepad.html")


@socketio.event
def connect() -> None:
    """Called when a socket connection is made,
    returns a list of controllers available.
    """
    socketio.emit("controllerListChanged", list(controllers.keys()), to=request.sid)
    logging.info("Client connected")


@socketio.event
def disconnect() -> None:
    """Called on disconnect, not currently used"""
    logging.info("Client disconnected")


@socketio.event
def add_joycon() -> None:
    """checks that a controller can be added and adds it"""
    if len(controllers) < config.getint(
        "controller_settings", "max_controllers", fallback=4
    ):
        initialise_new_controller()
        print("Added Controller")
        socketio.emit("controllerListChanged", list(controllers.keys()))


@socketio.event
def update_joycon_axis(data: dict) -> None:
    """Update the state of a Joy-Con axis.

    This function is triggered by a WebSocket event named "update_joycon_axis".
    It receives a dictionary containing the joycon axis and state.
    If the gamepad is found, it updates its corresponding button or
    trigger based on the given data.

    :param data: A dictionary containing the following keys:\n
            - gamepad: The index of the gamepad to update.\n
            - Axis: The name of the joycon axis being manipulated.\n
            - State: An array where stick position is [x, y]
    :type data: dict
    """
    gamepad = get_controller(data)
    if not isinstance(data["State"][0], (int, float)) or not isinstance(
        data["State"][1], (int, float)
    ):
        return None

    x = max(min(float(data["State"][0]), 1), -1)
    y = max(min(float(data["State"][1]), 1), -1)
    match (data["Axis"]):
        case "Left":
            gamepad.left_joystick_float(
                x_value_float=x,
                y_value_float=y,
            )
        case "Right":
            gamepad.right_joystick_float(
                x_value_float=x,
                y_value_float=y,
            )
    gamepad.update()


@socketio.event
def update_joycon_button(data: dict) -> None:
    """Update the state of a Joy-Con button.

    This function is triggered by a WebSocket event named "update_joycon_button".
    It receives a dictionary containing the gamepad index and the button state.
    If the gamepad is found, it updates its corresponding button or trigger
    based on the given data.

    :param data: A dictionary containing the following keys:\n
            - gamepad: The index of the gamepad to update.\n
            - Button: The name of the button or trigger to update.\n
            - State:  pressed (true) or released (false) defaults to False
    :type data: dict
    """
    gamepad = get_controller(data)
    if gamepad == None:
        return None

    mapping = mappingButton.get(data.get("Button"))
    if mapping:
        if data.get("State", False):
            gamepad.press_button(button=mapping)
        else:
            gamepad.release_button(button=mapping)
    elif data.get("Button"):
        if data.get("Button") == "LT":
            if data.get("State", False):
                gamepad.left_trigger_float(1.0)
            else:
                gamepad.left_trigger_float(0.0)
        elif data.get("Button") == "RT":
            if data.get("State", False):
                gamepad.right_trigger_float(1.0)
            else:
                gamepad.right_trigger_float(0.0)
    gamepad.update()


if __name__ == "__main__":
    main()
