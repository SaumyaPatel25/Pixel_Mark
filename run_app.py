import subprocess
import os
import time

def run_services():
    root_dir = os.getcwd()
    backend_dir = os.path.join(root_dir, "backend")
    frontend_dir = os.path.join(root_dir, "web")
    
    # Path to the virtualenv python
    backend_python = os.path.join(backend_dir, "venv", "Scripts", "python.exe")
    
    # Check if backend venv exists
    if not os.path.exists(backend_python):
        print(f"❌ Error: Backend virtualenv not found at {backend_python}")
        return

    # 1. Backend Command (Running from root directory)
    backend_cmd = [
        backend_python,
        "-m", "uvicorn", "backend.main:app",
        "--host", "127.0.0.1",
        "--port", "8765"
    ]
    
    # 2. Frontend Command
    frontend_cmd = ["npm", "run", "dev"]

    print("\n" + "="*50)
    print("LAUNCHING FULLSTACK APP...")
    print("="*50 + "\n")
    
    processes = []
    try:
        # Launch Backend
        print(f"📡 [BACKEND] Starting on http://localhost:8765...")
        backend_proc = subprocess.Popen(
            backend_cmd,
            cwd=root_dir,
            env={**os.environ, "PYTHONPATH": f"{root_dir};{backend_dir}"}
        )
        processes.append(backend_proc)

        # Small delay to let backend bind port
        time.sleep(2)

        # Launch Frontend
        print(f"🎨 [FRONTEND] Starting on http://localhost:3000...")
        frontend_proc = subprocess.Popen(
            frontend_cmd,
            cwd=frontend_dir,
            shell=True 
        )
        processes.append(frontend_proc)

        print("\n✨ ALL SYSTEMS OPERATIONAL")
        print("--------------------------------------------------")
        print("Frontend: http://localhost:3000")
        print("Backend:  http://localhost:8765")
        print("--------------------------------------------------")
        print("Press Ctrl+C to terminate both services safely.\n")
        
        while True:
            time.sleep(1)
            if backend_proc.poll() is not None:
                print("❌ Backend process exited.")
                break
            if frontend_proc.poll() is not None:
                print("❌ Frontend process exited.")
                break
                
    except KeyboardInterrupt:
        print("\n🛑 SHUTTING DOWN...")
    finally:
        for p in processes:
            try:
                # On Windows, taskkill /F /T is more effective for child processes (like uvicorn reloader)
                subprocess.run(['taskkill', '/F', '/T', '/PID', str(p.pid)], capture_output=True)
            except:
                p.terminate()
        print("👋 Services stopped. Re-run 'python run_app.py' to restart.")

if __name__ == "__main__":
    run_services()
