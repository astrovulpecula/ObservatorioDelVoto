#!/usr/bin/env python3
"""Validate data/polls.json and generate browser-friendly data/polls.js.
No external packages. Run: python3 scripts/sync-data.py
"""
from __future__ import annotations
from collections import Counter
from datetime import date
from pathlib import Path
from urllib.parse import urlparse
import json

BASE = Path(__file__).resolve().parents[1]
SOURCE = BASE / 'data' / 'polls.json'
TARGET = BASE / 'data' / 'polls.js'
PARTIES = ('PP', 'PSOE', 'VOX', 'SUMAR')

def run():
    data = json.loads(SOURCE.read_text(encoding='utf-8'))
    meta, rows = data['metadata'], data['polls']
    assert rows and isinstance(rows, list), 'polls.json must have one or more rows'
    ids = [p['id'] for p in rows]
    assert len(ids) == len(set(ids)), 'Duplicate poll ID'
    assert meta['from'] <= meta['to'] <= meta['lastUpdated'], 'Invalid data window'
    for p in rows:
        assert meta['from'] <= p['published'] <= meta['to'], f'Publication date outside scope: {p["id"]}'
        for key in ('published', 'fieldworkStart', 'fieldworkEnd'):
            date.fromisoformat(p[key])
        assert p['fieldworkStart'] <= p['fieldworkEnd'] <= p['published'], f'Invalid field dates: {p["id"]}'
        assert 0 < sum(p['vote'].values()) <= 100, f'Invalid shares: {p["id"]}'
        for k in PARTIES:
            assert isinstance(p['vote'][k],(int,float)) and 0<=p['vote'][k]<=100, f'Invalid vote value: {p["id"]} {k}'
        for k,v in p['seats'].items():
            assert k in PARTIES and 0<=v<=350, f'Invalid seat projection: {p["id"]}'
        for k,interval in p.get('seatIntervals',{}).items():
            assert k in PARTIES and len(interval)==2 and interval[0] <= p['seats'][k] <= interval[1], f'Invalid seat range: {p["id"]}'
        assert urlparse(p['sourceUrl']).scheme in ('https','http'), f'Invalid source URL: {p["id"]}'
        assert p['category'] in ('organismo','prensa','tv_radio','digital','informe'), f'Invalid category: {p["id"]}'
    TARGET.write_text('// AUTO-GENERATED from data/polls.json; run python3 scripts/sync-data.py\nwindow.PULSO_DATA = '+json.dumps(data,ensure_ascii=False,indent=2)+';\n',encoding='utf-8')
    print(f'OK: {len(rows)} polls · {len(set(p["pollster"] for p in rows))} institutes · {len(set(p["publisher"] for p in rows))} publishers')
    print('Updated',TARGET.relative_to(BASE))

if __name__ == '__main__':
    run()
