"""통합 개발 환경 시작 스크립트.

Usage:
    uv run python scripts/dev.py           # Docker(Postgres) + Web 서버
    uv run python scripts/dev.py --cli     # Docker(Postgres) + CLI 상담
    uv run python scripts/dev.py docker    # Postgres만 시작
    uv run python scripts/dev.py stop      # Postgres 종료
"""

from __future__ import annotations

import argparse
import signal
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from dotenv import load_dotenv

load_dotenv(ROOT / ".env")


# ---------------------------------------------------------------------------
# Docker helpers
# ---------------------------------------------------------------------------

def docker_up() -> None:
    print("  [docker] PostgreSQL 시작 중...")
    subprocess.run(
        ["docker", "compose", "up", "-d", "--wait"],
        cwd=ROOT,
        check=True,
    )
    print("  [docker] PostgreSQL 준비 완료\n")


def docker_stop() -> None:
    print("  [docker] PostgreSQL 종료 중...")
    subprocess.run(["docker", "compose", "stop"], cwd=ROOT, check=False)
    print("  [docker] 종료 완료")


def wait_for_postgres(timeout: int = 30) -> None:
    """docker compose --wait 가 없는 구버전 대비 폴링."""
    import socket

    host, port = "127.0.0.1", 5433
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with socket.create_connection((host, port), timeout=1):
                return
        except OSError:
            time.sleep(1)
    raise TimeoutError(f"Postgres가 {timeout}초 안에 응답하지 않았습니다 ({host}:{port})")


# ---------------------------------------------------------------------------
# Process launchers
# ---------------------------------------------------------------------------

def run_web(port: int = 8000, https: bool = False) -> subprocess.Popen:
    cmd = [sys.executable, str(ROOT / "scripts" / "run_web.py"), "--port", str(port)]
    if https:
        cmd.append("--https")
    print(f"  [web]    {'HTTPS' if https else 'HTTP'} → http{'s' if https else ''}://localhost:{port}")
    return subprocess.Popen(cmd, cwd=ROOT)


def run_cli() -> subprocess.Popen:
    print("  [cli]    CLI 상담 시작...")
    return subprocess.Popen(
        [sys.executable, str(ROOT / "scripts" / "run_advisor.py")],
        cwd=ROOT,
    )


# ---------------------------------------------------------------------------
# DB init (테이블 생성)
# ---------------------------------------------------------------------------

def init_db() -> None:
    from wealth_advisor.db.session import Base, engine
    from wealth_advisor.db import models  # noqa: F401 — ORM 모델 등록

    Base.metadata.create_all(bind=engine)
    print("  [db]     테이블 확인/생성 완료")


def seed_demo() -> None:
    import importlib.util, sys as _sys
    spec = importlib.util.spec_from_file_location("seed_demo", ROOT / "scripts" / "seed_demo.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    mod.seed()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Wealth Advisor 개발 환경")
    parser.add_argument("command", nargs="?", default="web", choices=["web", "docker", "stop"],
                        help="web(기본)|docker(DB만)|stop(DB종료)")
    parser.add_argument("--cli", action="store_true", help="Web 대신 CLI 상담 실행")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--https", action="store_true")
    parser.add_argument("--no-docker", action="store_true", help="Docker 시작 건너뜀")
    args = parser.parse_args()

    if args.command == "stop":
        docker_stop()
        return

    # --- Docker 시작 ---
    if not args.no_docker:
        try:
            docker_up()
        except subprocess.CalledProcessError:
            # --wait 미지원 구버전: 직접 폴링
            subprocess.run(["docker", "compose", "up", "-d"], cwd=ROOT, check=True)
            print("  [docker] 포트 대기 중...")
            wait_for_postgres()
            print("  [docker] PostgreSQL 준비 완료\n")

    if args.command == "docker":
        print("  Postgres 실행 중. 종료: uv run python scripts/dev.py stop")
        return

    # --- DB 테이블 초기화 + 체험 계정 시드 ---
    init_db()
    seed_demo()

    # --- 앱 프로세스 시작 ---
    procs: list[subprocess.Popen] = []
    if args.cli:
        procs.append(run_cli())
    else:
        procs.append(run_web(port=args.port, https=args.https))

    print("\n  Ctrl+C 로 종료\n")

    def shutdown(sig, frame):  # noqa: ANN001
        print("\n  종료 중...")
        for p in procs:
            p.terminate()
        for p in procs:
            try:
                p.wait(timeout=5)
            except subprocess.TimeoutExpired:
                p.kill()
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    # 자식 프로세스 감시
    while True:
        for p in procs:
            rc = p.poll()
            if rc is not None:
                print(f"  프로세스가 종료되었습니다 (exit {rc}). 재시작하려면 스크립트를 다시 실행하세요.")
                shutdown(None, None)
        time.sleep(1)


if __name__ == "__main__":
    main()
