import asyncio
import os
from aiohttp import web

# Paths
ROOT = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(ROOT, 'frontend')
BACKEND_SCRIPT = os.path.join(ROOT, 'backend', 'backend_api_to_geo.py')

# Serve static files (index.html, js, css, etc.)
async def handle_index(request):
    return web.FileResponse(os.path.join(FRONTEND_DIR, 'index.html'))

async def start_backend_process():
    """Run the backend script and stream its output to the server console."""
    process = await asyncio.create_subprocess_exec(
        'python3', BACKEND_SCRIPT,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
        cwd=ROOT
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
    app.router.add_static('/', FRONTEND_DIR, show_index=True)
    # Serve data directory for geojson and other files
    DATA_DIR = os.path.join(ROOT, 'data')
    app.router.add_static('/data/', DATA_DIR, show_index=True)
    app.on_startup.append(on_startup)
    app.on_cleanup.append(on_cleanup)
    print("[INFO] Serving frontend at http://localhost:8080/")
    web.run_app(app, port=8080)

if __name__ == '__main__':
    main()
