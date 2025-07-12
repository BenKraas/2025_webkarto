@echo off
REM Check for venv directory
IF NOT EXIST venv (
    echo Creating virtual environment...
    python -m venv venv
    IF %ERRORLEVEL% NEQ 0 (
        echo Failed to create virtual environment.
        exit /b 1
    )
)

REM Activate the virtual environment
CALL venv\Scripts\activate.bat

REM Upgrade pip and install requirements
python -m pip install --upgrade pip
IF EXIST requirements.txt (
    pip install -r requirements.txt
)

REM Run the server script
python run_server_and_backend.py
