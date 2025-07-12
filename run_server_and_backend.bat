@echo off
REM Get the directory of this script (project root)
SET "ROOT=%~dp0"

REM Check for venv directory in project root
IF NOT EXIST "%ROOT%venv" (
    echo Creating virtual environment in %ROOT%venv ...
    python -m venv "%ROOT%venv"
    IF %ERRORLEVEL% NEQ 0 (
        echo Failed to create virtual environment.
        exit /b 1
    )
)

REM Activate the virtual environment from project root
CALL "%ROOT%venv\Scripts\activate.bat"

REM Upgrade pip and install requirements
python -m pip install --upgrade pip
IF EXIST "%ROOT%requirements.txt" (
    pip install -r "%ROOT%requirements.txt"
)

REM Run the server script using the activated venv
python "%ROOT%run_server_and_backend.py"
