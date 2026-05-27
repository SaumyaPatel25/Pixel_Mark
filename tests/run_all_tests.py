import subprocess
import sys
import time

def run_suite(name, command):
    print(f"\n{'='*60}")
    print(f" RUNNING SUITE: {name}")
    print(f"{'='*60}")
    
    start_time = time.time()
    process = subprocess.run(command, capture_output=True, text=True, shell=True)
    duration = time.time() - start_time
    
    print(process.stdout)
    if process.stderr:
        print("ERRORS:", process.stderr)
        
    status = "PASS" if process.returncode == 0 else "FAIL"
    return status, duration

def main():
    suites = [
        ("Infrastructure", "python -m pytest tests/test_01_infrastructure.py -s"),
        ("Auth", "python -m pytest tests/test_02_auth_production.py -s"),
        ("Data Chain", "python -m pytest tests/test_03_data_chain.py -s"),
        ("Export", "python -m pytest tests/test_04_export.py -s"),
        ("Share Links", "python -m pytest tests/test_05_share_links.py -s"),
        ("WebSocket", "python -m pytest tests/test_06_websocket.py -s"),
        ("Frontend E2E", "python -m pytest tests/test_07_frontend_e2e.py -s"),
        ("Database Direct", "python -m pytest tests/test_08_database.py -s"),
        ("Load Tests", "python -m pytest tests/test_09_load.py -s"),
    ]
    
    results = []
    total_start = time.time()
    
    for name, cmd in suites:
        # Use venv python if available
        venv_python = r".\backend\venv\Scripts\python.exe"
        full_cmd = cmd.replace("python", venv_python)
        
        status, duration = run_suite(name, full_cmd)
        results.append((name, status, duration))
        
    print(f"\n\n{'='*60}")
    print(" FINAL PRODUCTION TEST SUMMARY")
    print(f"{'='*60}")
    print(f"{'Suite':<20} | {'Status':<10} | {'Duration':<10}")
    print(f"{'-'*20}-+-{'-'*10}-+-{'-'*10}")
    
    for name, status, duration in results:
        print(f"{name:<20} | {status:<10} | {duration:.2f}s")
        
    total_duration = time.time() - total_start
    print(f"{'-'*60}")
    print(f"TOTAL DURATION: {total_duration/60:.2f} minutes")
    
    any_fail = any(r[1] == "FAIL" for r in results)
    sys.exit(1 if any_fail else 0)

if __name__ == "__main__":
    main()
