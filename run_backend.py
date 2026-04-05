import sys
import os
import re
import subprocess
import time
import threading
import signal

def update_file(filepath, patterns):
    if not os.path.exists(filepath):
        print(f"Warning: {filepath} not found.")
        return
        
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    for pattern, replacement in patterns:
        content = re.sub(pattern, replacement, content)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

def prefix_output(process, prefix):
    """Reads lines from the child process and prints them with a tag."""
    for line in iter(process.stdout.readline, b''):
        # Decode the child's UTF-8 output
        decoded = line.decode('utf-8', errors='replace')
        # Safely drop unprintable emojis/characters so the main terminal doesn't crash
        safe_string = decoded.encode('cp1252', errors='ignore').decode('cp1252')
        sys.stdout.write(f"[{prefix}] {safe_string}")
    process.stdout.close()

def main():
    print("="*60)
    print("PulsePrice Unified Backend")
    print("="*60)
    
    if len(sys.argv) < 2:
        print("\nError: Missing the IP Address.")
        print("Usage: python run_backend.py <IP_ADDRESS>")
        print("Example: python run_backend.py 172.25.199.101\n")
        sys.exit(1)
        
    new_ip = sys.argv[1].strip()
    print(f"\n[SYSTEM] Verifying network IPs to: {new_ip} ...")

    db_pattern = (r"'host':\s*'[0-9\.]+'", f"'host': '{new_ip}'")
    kafka_boot_pattern = (r"KAFKA_BOOTSTRAP\s*=\s*\"[0-9\.]+:9092\"", f'KAFKA_BOOTSTRAP = "{new_ip}:9092"')
    kafka_servers_pattern = (r"KAFKA_BOOTSTRAP_SERVERS\s*=\s*\['[0-9\.]+:9092'\]", f"KAFKA_BOOTSTRAP_SERVERS = ['{new_ip}:9092']")

    base_dir = os.path.dirname(os.path.abspath(__file__))

    update_file(os.path.join(base_dir, 'api', 'database.py'), [db_pattern])
    update_file(os.path.join(base_dir, 'spark', 'streaming_processor.py'), [db_pattern, kafka_boot_pattern])
    update_file(os.path.join(base_dir, 'data_generator', 'click_simulator.py'), [kafka_servers_pattern])
    
    print("[SYSTEM] IPs configured successfully!")
    print("\n[SYSTEM] Starting Unified Backend Services...")
    print("[SYSTEM] (Press Ctrl+C at any time to gracefully stop all 3 services)\n")
    
    python_exe_api = os.path.join(base_dir, 'api', 'venv', 'Scripts', 'python.exe')
    python_exe_spark = os.path.join(base_dir, 'spark', 'venv', 'Scripts', 'python.exe')
    python_exe_gen = os.path.join(base_dir, 'data_generator', 'venv', 'Scripts', 'python.exe')
    
    if not os.path.exists(python_exe_api): python_exe_api = "python"
    if not os.path.exists(python_exe_spark): python_exe_spark = "python"
    if not os.path.exists(python_exe_gen): python_exe_gen = "python"

    commands = [
        ("API_SERVER", [python_exe_api, "-u", "main.py"], os.path.join(base_dir, 'api')),
        ("SPARK", [python_exe_spark, "-u", "streaming_processor.py"], os.path.join(base_dir, 'spark')),
        ("TRAFFIC_GEN", [python_exe_gen, "-u", "click_simulator.py", "10"], os.path.join(base_dir, 'data_generator'))
    ]
    
    processes = []
    threads = []
    
    # CRITICAL FIX: Force child processes to output UTF-8 so they don't crash when printing emojis
    custom_env = os.environ.copy()
    custom_env["PYTHONIOENCODING"] = "utf-8"

    def signal_handler(sig, frame):
        print("\n\n[SYSTEM] Ctrl+C Detected. Shutting down all backend services safely...")
        for p in processes:
            p.terminate()
        sys.exit(0)
        
    signal.signal(signal.SIGINT, signal_handler)

    for prefix, cmd, cwd in commands:
        print(f"[SYSTEM] Booting {prefix}...")
        p = subprocess.Popen(
            cmd,
            cwd=cwd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            bufsize=1,
            env=custom_env  # Pass the UTF-8 environment variable
        )
        processes.append(p)
        
        t = threading.Thread(target=prefix_output, args=(p, prefix))
        t.daemon = True
        t.start()
        threads.append(t)
        time.sleep(1.5)

    try:
        for p in processes:
            p.wait()
    except KeyboardInterrupt:
        signal_handler(None, None)

if __name__ == "__main__":
    main()
