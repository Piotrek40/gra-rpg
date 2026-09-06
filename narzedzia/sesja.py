#!/usr/bin/env python3
"""Odprawa przed sesją. Mistrz Gry czyta to, zanim powie pierwsze zdanie.

Sens: nie polegać na tym, że MG pamięta. Wszystko, co musi wiedzieć,
zostaje mu wypisane ze źródeł — a kontrola spójności musi przejść.

  python3 narzedzia/sesja.py
"""
import json, pathlib, subprocess, sys, re

ROOT = pathlib.Path(__file__).resolve().parent.parent

def naglowek(t):
    print('\n' + t)
    print('─' * len(t))

wynik = subprocess.run([sys.executable, str(ROOT / 'narzedzia' / 'spojnosc.py')],
                       capture_output=True, text=True)
print(wynik.stdout.strip())
if wynik.returncode != 0:
    print('\n>>> ODPRAWA PRZERWANA: napraw błędy, zanim zaczniesz sesję. <<<')
    sys.exit(1)

st = json.loads((ROOT / 'postac' / 'stan.json').read_text(encoding='utf-8'))
p = st['postac']

naglowek('POSTAĆ')
print(f"{p['imie']} — {p['rasa']}, {p['klasa']} {p['poziom']} ({p['specjalizacja']}, "
      f"zakazana: {p['zakazana']}), {p['charakter']}, wyznawca: {p['bostwo']}")
print(f"PW {st['pw']['teraz']}/{st['pw']['maks']} · złoto {st['zloto']} sz · PD {st['doswiadczenie']} "
      f"· łaska {st['laska']} · reputacja {st['reputacja']} · dzień {st['dzien']}")
for poz in ('0', '1'):
    g = st['zaklecia'][poz]
    if g['przygotowane']:
        wolne = [s['nazwa'] for s in g['przygotowane'] if not s['zuzyty']]
        zuzyte = [s['nazwa'] for s in g['przygotowane'] if s['zuzyty']]
        print(f"  poz. {poz}: wolne [{', '.join(wolne) or '—'}]"
              + (f"  zużyte [{', '.join(zuzyte)}]" if zuzyte else ''))
    else:
        print(f"  poz. {poz}: NIEPRZYGOTOWANE")

if st['znaki']:
    naglowek('ZNAKI — to musi wrócić')
    for z in st['znaki']:
        print('  ◆ ' + z)

naglowek('POSTACIE NIEZALEŻNE — nastawienie i co już powiedziały')
for f in sorted((ROOT / 'swiat' / 'postacie').glob('*.md')):
    if f.stem == 'SZABLON':
        continue
    t = f.read_text(encoding='utf-8')
    imie = t.splitlines()[0].lstrip('# ').strip()
    # minus typograficzny (−, U+2212) też się liczy — pliki pisane są po ludzku
    nast = re.search(r'\*\*Nastawienie[^:]*:\*\*\s*([+\-−]?\d+)', t)
    powiedziane = t.split('## Co już powiedział')[1].split('## Jak mówi')[0] if '## Co już powiedział' in t else ''
    linie = [l.strip('- ').strip() for l in powiedziane.splitlines() if l.strip().startswith('-')]
    print(f"\n  {imie}  [nastawienie {nast.group(1) if nast else '?'}]")
    for l in linie[-3:]:
        print(f"    · {l}")

naglowek('ROZSTRZYGNIĘCIA — wiążą także MG')
r = ROOT / 'swiat' / 'rozstrzygniecia.md'
if r.exists():
    for l in r.read_text(encoding='utf-8').splitlines():
        if l.startswith('## R'):
            print('  ' + l[3:])

naglowek('OBIETNICE — to wraca')
import re as _re
obietnice = []
for f in sorted((ROOT / 'swiat' / 'postacie').glob('*.md')):
    for l in f.read_text(encoding='utf-8').splitlines():
        if 'obiecał' in l or 'obiecała' in l or 'Obiecał' in l:
            obietnice.append(f'{f.stem.replace("_", " ")}: ' + _re.sub(r'\*+', '', l).strip('- ').strip())
print('  ' + ('\n  '.join(obietnice) if obietnice else 'żadnych'))

naglowek('CO POSTAĆ JUŻ WIE — nie zakładaj więcej, nie zapominaj mniej')
w = (ROOT / 'postac' / 'wiedza.md')
if w.exists():
    for l in w.read_text(encoding='utf-8').splitlines():
        if l.startswith('**') or l.startswith('## Sesja'):
            print('  ' + l.replace('**', ''))

naglowek('OSTATNI WPIS W KRONICE')
k = (ROOT / 'kronika' / 'KRONIKA.md').read_text(encoding='utf-8').split('\n## ')
print('## ' + k[-1].strip() if len(k) > 1 else '(kronika pusta)')

naglowek('OSTATNIE ZMIANY STANU')
log = ROOT / 'postac' / 'dziennik.log'
if log.exists():
    for l in log.read_text(encoding='utf-8').splitlines()[-5:]:
        print('  ' + l.split('| ', 3)[-1])

naglowek('NAUKA GRACZA — czego jeszcze nie tłumaczyłem')
nauka = (ROOT / 'postac' / 'nauka.md').read_text(encoding='utf-8')
doWyt = nauka.split('## Do wytłumaczenia')[1].split('## Zasada nadrzędna')[0]
poz = [l.strip('- ').strip() for l in doWyt.splitlines() if l.strip().startswith('-')]
print('  ' + ('; '.join(poz) if poz else 'wszystko wytłumaczone'))
print('  ZASADA: gracz nigdy nie przegrywa dlatego, że nie wiedział o istnieniu zasady.')

naglowek('ZAKAZY — przeczytaj, zanim otworzysz scenę')
z = (ROOT / 'ZASADY-MG.md').read_text(encoding='utf-8')
for l in z.split('## Czego MG nie wolno')[1].split('## Co MG robi')[0].splitlines():
    if re.match(r'^\d+[a-z]?\. ', l.strip()):
        print('  ' + l.strip())

print('\n' + '=' * 62)
print('Odprawa zakończona. Można zaczynać.')
