#!/usr/bin/env python3
"""Generuje kartę postaci (HTML) z postac/stan.json.

Strona jest LUSTREM stanu, nie edytorem: nie ma na niej niczego do klikania,
co zmieniałoby liczby. Wartości zmienne wstrzykiwane są jako JSON i renderowane
przez skrypt; jeśli przeglądarka dostanie zdolność `db`, strona dosubskrybuje
ten sam dokument i będzie się odświeżać w trakcie gry bez przeładowania.
"""
import json, pathlib, html, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
ST = json.loads((ROOT / 'postac' / 'stan.json').read_text(encoding='utf-8'))
OUT = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'postac' / 'karta.html'

def zmienne(st):
    """Tylko to, co zmienia się w trakcie gry."""
    return {
        'dzien': st['dzien'], 'pw': st['pw'], 'zloto': st['zloto'],
        'doswiadczenie': st['doswiadczenie'], 'laska': st['laska'],
        'reputacja': st['reputacja'], 'znaki': st['znaki'], 'zmian': st['zmian'],
        'zaklecia': {p: {'miejsc': g['miejsc'], 'wrozbiarskich': g['wrozbiarskich'],
                         'przygotowane': g['przygotowane']} for p, g in st['zaklecia'].items()},
        'ksiega': st['ksiega'],
    }

SZABLON = open(ROOT / 'narzedzia' / 'karta.szablon.html', encoding='utf-8').read()
OUT.write_text(SZABLON.replace('/*__STAN__*/null', json.dumps(zmienne(ST), ensure_ascii=False)), encoding='utf-8')
print(f'{OUT} — {OUT.stat().st_size} B, stan nr {ST["zmian"]}')
