import asyncio
import sys
from pathlib import Path
from aiohttp import web

# Paths
ROOT = Path(__file__).resolve().parent
FRONTEND_DIR = ROOT / "frontend"
BACKEND_SCRIPT = ROOT / "backend" / "backend_api_to_geo.py"


# Serve static files (index.html, js, css, etc.)
async def handle_index(request):
    return web.FileResponse(str(FRONTEND_DIR / "index.html"))


async def start_backend_process():
    process = await asyncio.create_subprocess_exec(
        sys.executable,
        "-u",
        str(BACKEND_SCRIPT),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
        cwd=str(ROOT),
    )
    print(f"[INFO] Started backend process with PID {process.pid}")
    # Stream output
    async for line in process.stdout:
        print(f"[backend] {line.decode().rstrip()}")
    await process.wait()
    print(f"[INFO] Backend process exited with code {process.returncode}")


async def on_startup(app):
    # Start backend script as a background task
    app["backend_task"] = asyncio.create_task(start_backend_process())


async def on_cleanup(app):
    # Cancel backend task if running
    task = app.get("backend_task")
    if task:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass


def main():
    """
    Main entry point for running the web server and backend process.

    This function parses command-line arguments to determine the network interface
    on which the web server should listen. By default, the server binds to
    localhost (127.0.0.1), but can be configured to listen on all interfaces
    (0.0.0.0) using the `--global` flag.

    The function sets up an aiohttp web application with the following routes:
        - Serves `index.html` at the root path (`/`).
        - Serves static frontend files (JavaScript, CSS, etc.) from the frontend directory.
        - Serves static files from the `data` directory at the `/data/` path, allowing access to GeoJSON and other files.

    Additionally, startup and cleanup hooks are registered for application lifecycle management.

    Command-line Arguments:
        --local   Serve only on localhost (127.0.0.1). This is the default behavior.
        --global  Serve on all network interfaces (0.0.0.0).

    Side Effects:
        - Prints the URL where the frontend is being served.
        - Starts the aiohttp web server on port 8080.

    Raises:
        SystemExit: If invalid command-line arguments are provided.

    Note:
        This function should be called from the command line or as the main entry point
        of the application.
    """
    import argparse

    parser = argparse.ArgumentParser(description="Run web server with backend process.")
    group = parser.add_mutually_exclusive_group()
    group.add_argument(
        "--local",
        action="store_true",
        help="[default] Serve only on localhost (127.0.0.1)",
    )
    group.add_argument(
        "--global",
        dest="global_",
        action="store_true",
        help="Serve on all interfaces (0.0.0.0)",
    )
    args = parser.parse_args()

    # Default is local (127.0.0.1) unless --global is specified
    if args.global_:
        host = "0.0.0.0"
        print("[INFO] Serving frontend at http://0.0.0.0:8080/")
    else:
        host = "127.0.0.1"
        print("[INFO] Serving frontend at http://127.0.0.1:8080/")

    app = web.Application()
    # Serve index.html at root
    app.router.add_get("/", handle_index)
    # Serve static files (js, css, etc.)
    app.router.add_static("/", str(FRONTEND_DIR), show_index=True)
    # Serve data directory for geojson and other files
    DATA_DIR = ROOT / "data"
    app.router.add_static("/data/", str(DATA_DIR), show_index=True)
    app.on_startup.append(on_startup)
    app.on_cleanup.append(on_cleanup)

    web.run_app(app, port=8080, host=host)


if __name__ == "__main__":
    main()
