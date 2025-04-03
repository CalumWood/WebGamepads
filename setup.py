from cx_Freeze import setup, Executable
import platform

VERSION=f"1.0.0"

executables = [
    Executable("app.py", base="console", target_name="WebGamepads.exe", icon="static/icon.ico")
]

build_exe_options = {
    "build_exe": f"build/WebGamepads.{platform.system()}.{VERSION}",
    "packages": [
        "engineio",
    ],
    "excludes": ["tkinter", "unittest"],
    "zip_include_packages": ["encodings", "PySide6", "shiboken6"],
    "bin_path_includes": ["vgamepad"],
    "include_files": [
        "static",
        "templates",
        "settings.ini",
        "readme.md",
        "licence.txt",
    ],
}

setup(
    name="WebGamepads",
    version=VERSION,
    description="Web Based Controllers",
    options={"build_exe": build_exe_options},
    executables=executables,
)
