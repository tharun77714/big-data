#!/usr/bin/env python3
"""
PulsePrice Unified Backend Launcher
Starts API, Spark Streaming, and Traffic Generator in one terminal.
Single-machine (Ubuntu) version — no IP argument needed.
"""

import sys
import os
import subprocess
import time
import threading
import signal


def prefix_output(process, prefix):
    """Reads lines from the child process and prints them with a tag."""
    for line in iter(process.stdout.readline, b''):
        decoded = line.decode('utf-8', errors='replace')
        sys.stdout.write(f"[{prefix}] {decoded}")
        sys.stdout.flush()
    process.stdout.close()


def main():
    print("=" * 60)
    print("  PulsePrice Unified Backend — Ubuntu Edition")
    print("=" * 60)
    print("\n[SYSTEM] All services will connect to localhost.")
    print("[SYSTEM] Starting Unified Backend Services...")
    print("[SYSTEM] (Press Ctrl+C at any time to stop all services)\n")

    base_dir = os.path.dirname(os.path.abspath(__file__))

    commands = [
        ("API_SERVER",  ["python3", "-u", "main.py"],                 os.path.join(base_dir, "api")),
        ("SPARK",       ["python3", "-u", "streaming_processor.py"],  os.path.join(base_dir, "spark")),
        ("TRAFFIC_GEN", ["python3", "-u", "click_simulator.py", "10"], os.path.join(base_dir, "data_generator")),
    ]

    processes = []
    threads = []

    custom_env = os.environ.copy()
    custom_env["PYTHONIOENCODING"] = "utf-8"

    def signal_handler(sig, frame):
        print("\n\n[SYSTEM] Ctrl+C detected. Shutting down all backend services safely...")
        for p in processes:
            try:
                p.terminate()
            except Exception:
                pass
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
            env=custom_env,
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
