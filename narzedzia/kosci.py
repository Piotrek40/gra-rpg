#!/usr/bin/env python3
"""Prawdziwe kości. Nie ja wybieram wynik — wybiera go generator systemowy.
Każdy rzut dopisuje się do kronika/rzuty.log, którego nie kasuję i nie edytuję.

Użycie:
  python3 narzedzia/kosci.py 1k20+5 "test Wiedzy (tajemna)"
  python3 narzedzia/kosci.py 4k6o3 "cecha"     # rzuć 4k6, odrzuć najniższą
  python3 narzedzia/kosci.py 2k6 "obrażenia"
"""
import sys, re, secrets, datetime, os, pathlib

LOG = pathlib.Path(__file__).resolve().parent.parent / 'kronika' / 'rzuty.log'

def d(sides):
    """Losowanie kryptograficzne — bez ziarna, którego mógłbym się domyślić."""
    return secrets.randbelow(sides) + 1

def rzut(zapis):
    m = re.fullmatch(r'(\d*)k(\d+)(?:o(\d+))?([+-]\d+)?', zapis.replace(' ', ''), re.I)
    if not m:
        raise SystemExit(f'Nie rozumiem zapisu: {zapis}')
    ile = int(m.group(1) or 1)
    scian = int(m.group(2))
    zostaw = int(m.group(3)) if m.group(3) else ile
    mod = int(m.group(4) or 0)
    kosci = [d(scian) for _ in range(ile)]
    wybrane = sorted(kosci, reverse=True)[:zostaw]
    suma = sum(wybrane) + mod
    return kosci, wybrane, mod, suma

def opis(zapis, kosci, wybrane, mod, suma, po_co):
    odrzucone = ''
    if len(wybrane) != len(kosci):
        reszta = sorted(kosci, reverse=True)[len(wybrane):]
        odrzucone = f' (odrzucono {", ".join(map(str, reszta))})'
    m = f' {mod:+d}' if mod else ''
    return f'{zapis:<10} {kosci}{odrzucone}{m}  =  {suma}   {po_co}'

if __name__ == '__main__':
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    zapis = sys.argv[1]
    po_co = ' '.join(sys.argv[2:]) or '—'
    kosci, wybrane, mod, suma = rzut(zapis)
    linia = opis(zapis, kosci, wybrane, mod, suma, po_co)
    print(linia)
    LOG.parent.mkdir(parents=True, exist_ok=True)
    with open(LOG, 'a', encoding='utf-8') as f:
        f.write(f'{datetime.datetime.now():%Y-%m-%d %H:%M:%S}  {linia}\n')
