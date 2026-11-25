import os
import sys
import time
import subprocess
import urllib.request
import urllib.error

def free_port(port: int):
    """Kills any process currently occupying the given port on Windows."""
    try:
        cmd = f"netstat -ano | findstr :{port}"
        out = subprocess.check_output(cmd, shell=True, text=True, stderr=subprocess.DEVNULL)
        for line in out.strip().splitlines():
            parts = line.strip().split()
            if len(parts) >= 5 and "LISTENING" in line:
                pid = parts[-1]
                if pid and pid != "0":
                    subprocess.run(
                        ["taskkill", "/F", "/T", "/PID", pid],
                        capture_output=True,
                        text=True
                    )
    except Exception:
        pass

def wait_for_backend(url: str, timeout: int = 15) -> bool:
    """Polls backend healthcheck until ready or timeout expires."""
    start = time.time()
    while time.time() - start < timeout:
        try:
            req = urllib.request.urlopen(url, timeout=1.0)
            if req.status == 200:
                return True
        except Exception:
            time.sleep(0.5)
    return False

def run_services():
    root_dir = os.path.abspath(os.path.dirname(__file__))
    backend_dir = os.path.join(root_dir, "backend")
    frontend_dir = os.path.join(root_dir, "web")

    # 1. Resolve Python executable
    backend_python = os.path.join(backend_dir, "venv", "Scripts", "python.exe")
    alt_python = r"C:\sp\ai-agent\ai_agent_env\Scripts\python.exe"

    if os.path.exists(backend_python):
        python_exe = backend_python
    elif os.path.exists(alt_python):
        python_exe = alt_python
    else:
        python_exe = sys.executable

    print("\n" + "=" * 55)
    print("             STARTING STAGE FULLSTACK APP")
    print("=" * 55)
    print(f"[*] Python runtime:  {python_exe}")
    print(f"[*] Project root:    {root_dir}")

    # 2. Clear lingering ports if any
    print("[*] Checking ports 8765 and 3000...")
    free_port(8765)
    free_port(3000)
    time.sleep(0.5)

    processes = []

    try:
        # 3. Launch Backend
        print("[*] Starting FastAPI Backend on http://localhost:8765...")
        backend_cmd = [
            python_exe,
            "-m", "uvicorn", "main:app",
            "--app-dir", backend_dir,
            "--host", "0.0.0.0",
            "--port", "8765",
            "--reload",
            "--reload-exclude", "scratch",
            "--reload-exclude", "*.py.bak",
            "--reload-exclude", "*.log"
        ]

        backend_env = {
            **os.environ,
            "PYTHONPATH": f"{root_dir};{backend_dir}"
        }

        backend_proc = subprocess.Popen(
            backend_cmd,
            cwd=root_dir,
            env=backend_env
        )
        processes.append(backend_proc)

        # 4. Launch Frontend
        print("[*] Starting Next.js Frontend on http://localhost:3000...")
        frontend_cmd = "npm run dev"
        frontend_env = {
            **os.environ,
            "NODE_OPTIONS": "--max-old-space-size=4096"
        }

        frontend_proc = subprocess.Popen(
            frontend_cmd,
            cwd=frontend_dir,
            env=frontend_env,
            shell=True
        )
        processes.append(frontend_proc)

        # 5. Wait for backend readiness
        print("[*] Awaiting backend initialization...")
        is_ready = wait_for_backend("http://127.0.0.1:8765/health", timeout=12)

        print("\n" + "=" * 55)
        print("          ALL STAGE SERVICES ARE RUNNING!")
        print("=" * 55)
        print("  Frontend Web App:  http://localhost:3000")
        print("  FastAPI Backend:   http://localhost:8765")
        print("  API Docs:          http://localhost:8765/docs")
        print("=" * 55)
        print("Press Ctrl+C to terminate both servers safely.\n")

        # 6. Monitor health in loop
        while True:
            time.sleep(1)
            if backend_proc.poll() is not None:
                print("\n[!] Backend process exited unexpectedly.")
                break
            if frontend_proc.poll() is not None:
                print("\n[!] Frontend process exited unexpectedly.")
                break

    except KeyboardInterrupt:
        print("\n[*] Shutting down all services...")
    finally:
        for p in processes:
            try:
                subprocess.run(
                    ["taskkill", "/F", "/T", "/PID", str(p.pid)],
                    capture_output=True
                )
            except Exception:
                try:
                    p.terminate()
                except Exception:
                    pass

        # Ensure ports are freed
        free_port(8765)
        free_port(3000)
        print("[*] All services terminated cleanly.")

if __name__ == "__main__":
    run_services()
