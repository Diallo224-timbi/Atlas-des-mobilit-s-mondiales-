#!/usr/bin/env python3
"""Lance les trois étapes de traitement dans l'ordre : 01 → 02 → 03 (voir docs/pipeline.svg)."""
import subprocess, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
for step in ('01_clean_visas.py', '02_aggregate_routes.py', '03_compute_stats.py'):
    print(f'→ {step}')
    subprocess.run([sys.executable, str(HERE / step)], check=True, cwd=HERE)
