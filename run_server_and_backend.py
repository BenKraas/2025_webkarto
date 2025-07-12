
import asyncio
import sys
from pathlib import Path
from aiohttp import web


# Paths
ROOT = Path(__file__).resolve().parent
FRONTEND_DIR = ROOT / 'frontend'
BACKEND_SCRIPT = ROOT / 'backend' / 'backend_api_to_geo.py'


# Serve static files (index.html, js, css, etc.)
async def handle_index(request):
    return web.FileResponse(str(FRONTEND_DIR / 'index.html'))

async def start_backend_process():
    """Run the backend script and stream its output to the server console."""
    process = await asyncio.create_subprocess_exec(
        sys.executable, '-u', str(BACKEND_SCRIPT),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
        cwd=str(ROOT)
    )
    print(f"[INFO] Started backend process with PID {process.pid}")
    # Stream output
    async for line in process.stdout:
        print(f"[backend] {line.decode().rstrip()}")
    await process.wait()
    print(f"[INFO] Backend process exited with code {process.returncode}")

async def on_startup(app):
    # Start backend script as a background task
    app['backend_task'] = asyncio.create_task(start_backend_process())

async def on_cleanup(app):
    # Cancel backend task if running
    task = app.get('backend_task')
    if task:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass


def main():
    app = web.Application()
    # Serve index.html at root
    app.router.add_get('/', handle_index)
    # Serve static files (js, css, etc.)
    app.router.add_static('/', str(FRONTEND_DIR), show_index=True)
    # Serve data directory for geojson and other files
    DATA_DIR = ROOT / 'data'
    app.router.add_static('/data/', str(DATA_DIR), show_index=True)
    app.on_startup.append(on_startup)
    app.on_cleanup.append(on_cleanup)
    print("[INFO] Serving frontend at http://0.0.0.0:8080/")
    web.run_app(app, port=8080, host='0.0.0.0')

if __name__ == '__main__':
    main()
