#!/usr/bin/env python3
"""Kontrola spójności kampanii. Wykrywa dryf, którego człowiek nie zauważy.

Sprawdza rzeczy, które w długiej kampanii cicho się rozjeżdżają:
czy czar nie zmienił szkoły, czy nie pojawił się w ekwipunku przedmiot znikąd,
czy postać niezależna nie mówi czegoś sprzecznego z tym, co już powiedziała.

  python3 narzedzia/spojnosc.py
"""
import json, pathlib, unicodedata, hashlib, sys, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
BLEDY, OSTRZ = [], []

def k(s):
    s = s.lower().strip().replace('ł', 'l')
    return ''.join(c for c in unicodedata.normalize('NFKD', s) if not unicodedata.combining(c))

def blad(m): BLEDY.append(m)
def ostrz(m): OSTRZ.append(m)

st = json.loads((ROOT / 'postac' / 'stan.json').read_text(encoding='utf-8'))
czary = json.loads((ROOT / 'swiat' / 'czary.json').read_text(encoding='utf-8'))
CZ = {k(n): (n, d) for n, d in czary.items()}

# 1. Czy każdy czar w księdze istnieje w wykazie i ma tę samą szkołę
zakazana = k(st['postac']['zakazana'])
for poz in ('0', '1'):
    for c in st['ksiega'][poz]:
        wpis = CZ.get(k(c['nazwa']))
        if not wpis:
            blad(f"czar '{c['nazwa']}' jest w księdze, ale nie ma go w swiat/czary.json — nie znam jego działania")
            continue
        nazwa, d = wpis
        if k(d['szkola']) != k(c['szkola']):
            blad(f"czar '{c['nazwa']}': księga mówi '{c['szkola']}', wykaz mówi '{d['szkola']}'")
        if str(d['poziom']) != poz:
            blad(f"czar '{c['nazwa']}' leży na poziomie {poz}, a jest czarem {d['poziom']}. poziomu")
        if k(d['szkola']) == zakazana:
            blad(f"czar '{c['nazwa']}' należy do szkoły zakazanej ({st['postac']['zakazana']}) — nie wolno go mieć")

# 2. Czy przygotowane czary pochodzą z księgi i mieszczą się w miejscach
for poz in ('0', '1'):
    g = st['zaklecia'][poz]
    ksiega = {k(c['nazwa']) for c in st['ksiega'][poz]}
    if len(g['przygotowane']) > g['miejsc']:
        blad(f"poziom {poz}: przygotowano {len(g['przygotowane'])} czarów na {g['miejsc']} miejsc")
    for s in g['przygotowane']:
        if k(s['nazwa']) not in ksiega:
            blad(f"przygotowany '{s['nazwa']}' nie występuje w księdze poziomu {poz}")
    if g['przygotowane']:
        w = sum(1 for s in g['przygotowane'] if k(s['szkola']) == k('wróżbiarstwo'))
        if w < g['wrozbiarskich']:
            blad(f"poziom {poz}: miejsce specjalisty niewypełnione czarem wróżbiarskim")

# 2b. Treści spoza kanonu — muszą mieć pochodzenie w fikcji
WLASNE = [n for n, d in czary.items() if not d.get('kanon', True)]
for n in WLASNE:
    if not czary[n].get('zrodlo'):
        blad(f"czar '{n}' jest spoza kanonu, ale nie ma pola 'zrodlo' — skąd się wziął w świecie?")
rejestr_wlasne = (ROOT / 'swiat' / 'wlasne.md').read_text(encoding='utf-8')
for n in WLASNE:
    if n not in rejestr_wlasne:
        blad(f"czar spoza kanonu '{n}' nie jest wpisany do swiat/wlasne.md")

# 2c. Bestiariusz — kompletność i pochodzenie
przeciw = json.loads((ROOT / 'swiat' / 'przeciwnicy.json').read_text(encoding='utf-8'))
WYMAGANE = ['nazwa', 'opis', 'kw', 'pw', 'kp', 'inicjatywa', 'atak', 'bron',
            'obrazenia', 'krytyk', 'ruch', 'rzuty', 'pd', 'taktyka']
opis_best = (ROOT / 'swiat' / 'przeciwnicy.md').read_text(encoding='utf-8')
WLASNE_ISTOTY = []
for pid, d in przeciw.items():
    braki = [f for f in WYMAGANE if f not in d]
    if braki:
        blad(f"przeciwnik '{pid}' nie ma pól: {', '.join(braki)} — nie da się nim poprowadzić walki")
    if not d.get('taktyka'):
        blad(f"przeciwnik '{pid}' nie ma zapisanej taktyki — zachowanie musi wynikać z rodzaju, nie z nastroju MG")
    if not d.get('kanon', True):
        WLASNE_ISTOTY.append(d['nazwa'])
        if not d.get('zrodlo'):
            blad(f"istota spoza kanonu '{d['nazwa']}' nie ma pola 'zrodlo'")
        if d['nazwa'] not in rejestr_wlasne:
            blad(f"istota spoza kanonu '{d['nazwa']}' nie jest wpisana do swiat/wlasne.md")
    if d['nazwa'] not in opis_best:
        ostrz(f"przeciwnik '{d['nazwa']}' ma statystyki, ale nie ma go w tabeli w przeciwnicy.md — kiedy się pojawia?")

# 3. Ekwipunek — czy wszystko ma udokumentowane pochodzenie
for e in st.get('ekwipunek', []):
    if not e.get('skad'):
        blad(f"przedmiot '{e['co']}' nie ma zapisanego pochodzenia — skąd się wziął?")
    if e.get('ile', 0) < 0:
        blad(f"przedmiot '{e['co']}': ujemna ilość {e['ile']}")

# 4. Punkty wytrzymałości w granicach
pw = st['pw']
if pw['teraz'] > pw['maks']:
    blad(f"punkty wytrzymałości {pw['teraz']} przekraczają maksimum {pw['maks']}")
if st['zloto'] < 0:
    blad(f"ujemne złoto: {st['zloto']}")

# 5. Łańcuch dziennika
LOG = ROOT / 'postac' / 'dziennik.log'
if LOG.exists():
    linie = [l for l in LOG.read_text(encoding='utf-8').splitlines() if l.strip()]
    for i in range(1, len(linie)):
        ocz = hashlib.sha256(linie[i - 1].encode('utf-8')).hexdigest()[:16]
        pod = linie[i].split('| prev:')[1].split(' |')[0]
        if pod != ocz:
            blad(f"dziennik: zerwany łańcuch w wierszu {i + 1}")
    if linie:
        biez = hashlib.sha256(json.dumps(st, ensure_ascii=False, sort_keys=True).encode('utf-8')).hexdigest()[:16]
        if biez != linie[-1].split('| stan:')[1].split(' |')[0]:
            blad("stan.json zmieniony poza programem — odcisk nie zgadza się z dziennikiem")

# 6. Tajemnice — czy nikt ich nie podmienił
sha = (ROOT / 'swiat' / 'TAJEMNICE.sha256').read_text(encoding='utf-8').split()[0]
prawda = (ROOT / 'swiat' / 'PRAWDA.md').read_text(encoding='utf-8')
if sha not in prawda:
    blad("suma kontrolna tajemnic w PRAWDA.md nie zgadza się z TAJEMNICE.sha256")
import base64
tresc = base64.b64decode((ROOT / 'swiat' / 'TAJEMNICE.b64').read_text(encoding='utf-8'))
if hashlib.sha256(tresc).hexdigest() != sha:
    blad("TAJEMNICE.b64 zostały zmienione — treść nie odpowiada zapisanej sumie kontrolnej")

# 7. Postacie niezależne — każda wymieniona w kronice musi mieć własny plik
KAT = ROOT / 'swiat' / 'postacie'
znane = {k(p.stem.replace('_', ' ')) for p in KAT.glob('*.md')} if KAT.exists() else set()
kronika = (ROOT / 'kronika' / 'KRONIKA.md').read_text(encoding='utf-8')
NIE_OSOBY = set()
nf = ROOT / 'swiat' / 'nie_postacie.txt'
if nf.exists():
    NIE_OSOBY = {k(l) for l in nf.read_text(encoding='utf-8').splitlines()
                 if l.strip() and not l.startswith('#')}
for m in re.findall(r'\*\*([A-ZŚŻŹĆŃŁÓĄĘ][\w\.\'-]+(?: [A-ZŚŻŹĆŃŁÓĄĘ][\w\.\'-]+)+)\*\*', kronika):
    mm = m.rstrip('.,:;!?')
    if k(mm) not in znane and k(mm) not in NIE_OSOBY and len(mm.split()) == 2:
        ostrz(f"kronika wymienia '{mm}', a nie ma pliku w swiat/postacie/ — grozi utratą ciągłości")

# --------------------------------------------------------------------------
print('=' * 62)
print('KONTROLA SPÓJNOŚCI KAMPANII')
print('=' * 62)
liczby = (len(st['ksiega']['0']) + len(st['ksiega']['1']), len(st.get('ekwipunek', [])), len(znane))
print(f'sprawdzono: {liczby[0]} czarów, {liczby[1]} pozycji ekwipunku, {liczby[2]} postaci niezależnych')
MIEJSCA = list((ROOT / 'swiat' / 'miejsca').glob('*.md')) if (ROOT / 'swiat' / 'miejsca').exists() else []
for f in MIEJSCA:
    t = f.read_text(encoding='utf-8')
    if 'zanim gracz wejdzie' not in t and 'Co w ni' not in t:
        ostrz(f"miejsce '{f.stem}' nie ma spisanej zawartości — grozi improwizacją na miejscu")
print(f'miejsca opisane z góry: {len(MIEJSCA)}')
print(f'bestiariusz: {len(przeciw)} przeciwników' + (f", spoza kanonu: {', '.join(WLASNE_ISTOTY)}" if WLASNE_ISTOTY else ''))
print(f'treści spoza kanonu (czary): {len(WLASNE)}' + (f" ({', '.join(WLASNE)})" if WLASNE else ' — na razie czysty SRD'))
for b in BLEDY: print('  BŁĄD:      ' + b)
for o in OSTRZ: print('  ostrzeżenie: ' + o)
if not BLEDY and not OSTRZ:
    print('\n  Bez zastrzeżeń. Wszystko zgadza się ze źródłami.')
elif not BLEDY:
    print(f'\n  Błędów brak. Ostrzeżeń: {len(OSTRZ)}.')
else:
    print(f'\n  BŁĘDÓW: {len(BLEDY)}. Nie zaczynaj sesji, dopóki nie znikną.')
sys.exit(1 if BLEDY else 0)
