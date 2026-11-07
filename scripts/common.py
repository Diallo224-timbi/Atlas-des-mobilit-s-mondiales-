"""Fonctions et chemins partagés par les scripts du pipeline (bibliothèque standard uniquement)."""
import csv, math, re, unicodedata
from pathlib import Path

DATA = Path(__file__).resolve().parents[1] / 'data'
OUT = DATA / 'processed'
ACCESSIBLE = {'free', 'arrival', 'eta'}


def norm(value):
    s = unicodedata.normalize('NFD', value or '')
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn').lower()
    return re.sub(r'[^a-z0-9]', '', s)


def visa_type(raw):
    x = str(raw or '').strip().lower()
    if x == '-1': return 'own'
    if x.isdigit() and int(x) > 0: return 'free'
    if x == 'visa free': return 'free'
    if x == 'visa on arrival': return 'arrival'
    if x == 'eta': return 'eta'
    if x == 'e-visa': return 'evisa'
    if x in ('no admission', 'covid ban'): return 'blocked'
    if x == 'visa required': return 'required'
    return 'unknown'


def pearson(pairs):
    n = len(pairs)
    if n < 3: return float('nan')
    ax = sum(p[0] for p in pairs) / n
    ay = sum(p[1] for p in pairs) / n
    num = sum((x - ax) * (y - ay) for x, y in pairs)
    dx = sum((x - ax) ** 2 for x, _ in pairs)
    dy = sum((y - ay) ** 2 for _, y in pairs)
    return num / math.sqrt(dx * dy) if dx and dy else float('nan')


def write_csv(name, header, rows):
    OUT.mkdir(parents=True, exist_ok=True)
    with open(OUT / name, 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f, lineterminator='\n')
        w.writerow(header)
        w.writerows(rows)
    print(f'  {name}: {len(rows)} lignes')
