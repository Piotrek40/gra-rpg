#!/usr/bin/env python3
"""Stan postaci jako program, nie notatka.

Reguły są tutaj i to one odmawiają, a nie Mistrz Gry z pamięci.
Każda zmiana dopisuje wpis do postac/dziennik.log z sumą kontrolną
poprzedniego wpisu — łańcuch, w którym nie da się po cichu zmienić
niczego wstecz, bo rozjadą się skróty.

  python3 narzedzia/postac.py pokaz
  python3 narzedzia/postac.py przygotuj "zbroja maga,sen,zrozumienie jezykow"
  python3 narzedzia/postac.py rzuc sen
  python3 narzedzia/postac.py obrazenia 5 "bełt z kuszy"
  python3 narzedzia/postac.py lecz 3 "wywar"
  python3 narzedzia/postac.py odpoczynek
  python3 narzedzia/postac.py laska +1 "nauczyl kogos czaru za darmo"
  python3 narzedzia/postac.py sprawdz          # weryfikacja łańcucha
"""
import json, sys, hashlib, datetime, pathlib, unicodedata

ROOT = pathlib.Path(__file__).resolve().parent.parent
STAN = ROOT / 'postac' / 'stan.json'
LOG = ROOT / 'postac' / 'dziennik.log'


def klucz(s):
    """Porównywanie nazw czarów bez znaków diakrytycznych i wielkości liter.

    NFKD nie rozkłada polskiego 'ł' (to osobna litera, nie l z akcentem),
    więc podmieniamy ją ręcznie — inaczej 'swiatlo' nie trafiłoby w 'Światło'.
    """
    s = s.lower().strip().replace('ł', 'l')
    s = unicodedata.normalize('NFKD', s)
    return ''.join(c for c in s if not unicodedata.combining(c))


def wczytaj():
    return json.loads(STAN.read_text(encoding='utf-8'))


def zapisz(st, akcja):
    poprzedni = ''
    if LOG.exists():
        linie = [l for l in LOG.read_text(encoding='utf-8').splitlines() if l.strip()]
        if linie:
            poprzedni = hashlib.sha256(linie[-1].encode('utf-8')).hexdigest()[:16]
    st['zmian'] = st.get('zmian', 0) + 1
    STAN.write_text(json.dumps(st, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    odcisk = hashlib.sha256(json.dumps(st, ensure_ascii=False, sort_keys=True).encode('utf-8')).hexdigest()[:16]
    wpis = f'{datetime.datetime.now():%Y-%m-%d %H:%M:%S} | {st["zmian"]:04d} | prev:{poprzedni or "-"*16} | stan:{odcisk} | {akcja}'
    with open(LOG, 'a', encoding='utf-8') as f:
        f.write(wpis + '\n')
    print(wpis)


def blad(msg):
    print('ODMOWA: ' + msg, file=sys.stderr)
    raise SystemExit(1)


# ---------------------------------------------------------------- polecenia

def pokaz(st):
    p = st['postac']
    print(f"{p['imie']} — {p['rasa']}, {p['klasa']} {p['poziom']} ({p['specjalizacja']})")
    print(f"  Punkty wytrzymałości: {st['pw']['teraz']} / {st['pw']['maks']}"
          + ('   [NIEPRZYTOMNY]' if st['pw']['teraz'] < 0 else '')
          + ('   [MARTWY]' if st['pw']['teraz'] <= -10 else ''))
    print(f"  Złoto: {st['zloto']} sz   Doświadczenie: {st['doswiadczenie']}")
    print(f"  Łaska Mystry: {st['laska']}   Reputacja (Czuwający Zakon): {st['reputacja']}")
    for poz in ('0', '1'):
        g = st['zaklecia'][poz]
        if not g['przygotowane']:
            print(f"  Poziom {poz}: NIEPRZYGOTOWANE ({g['miejsc']} miejsc, w tym {g['wrozbiarskich']} wróżbiarskie)")
            continue
        opis = ', '.join(('~~' + s['nazwa'] + '~~' if s['zuzyty'] else s['nazwa']) for s in g['przygotowane'])
        wolne = sum(1 for s in g['przygotowane'] if not s['zuzyty'])
        print(f"  Poziom {poz} ({wolne}/{g['miejsc']} wolnych): {opis}")
    if st['znaki']:
        print('  Znaki: ' + '; '.join(st['znaki']))


def przygotuj(st, lista, poz='1'):
    g = st['zaklecia'][poz]
    ksiega = st['ksiega'][poz]
    nazwy = [n.strip() for n in lista.split(',') if n.strip()]
    if len(nazwy) != g['miejsc']:
        blad(f"poziom {poz} ma {g['miejsc']} miejsc, podano {len(nazwy)}")
    wybrane = []
    for n in nazwy:
        trafienia = [c for c in ksiega if klucz(c['nazwa']) == klucz(n)]
        if not trafienia:
            blad(f"'{n}' nie ma w księdze czarów poziomu {poz}. "
                 f"Dostępne: {', '.join(c['nazwa'] for c in ksiega)}")
        wybrane.append(dict(trafienia[0]))
    wrozby = sum(1 for c in wybrane if c['szkola'] == 'wróżbiarstwo')
    if wrozby < g['wrozbiarskich']:
        blad(f"miejsce specjalisty musi być wypełnione czarem wróżbiarskim "
             f"({g['wrozbiarskich']} wymagane, podano {wrozby})")
    g['przygotowane'] = [{'nazwa': c['nazwa'], 'szkola': c['szkola'], 'zuzyty': False} for c in wybrane]
    zapisz(st, f'przygotowano poziom {poz}: ' + ', '.join(c['nazwa'] for c in wybrane))


def rzuc(st, nazwa):
    for poz in ('0', '1'):
        g = st['zaklecia'][poz]
        for s in g['przygotowane']:
            if klucz(s['nazwa']) == klucz(nazwa) and not s['zuzyty']:
                s['zuzyty'] = True
                zapisz(st, f'rzucono: {s["nazwa"]} (poziom {poz})')
                return
    przyg = [s['nazwa'] for poz in ('0', '1') for s in st['zaklecia'][poz]['przygotowane'] if not s['zuzyty']]
    blad(f"'{nazwa}' nie jest przygotowany albo miejsce już zużyte. "
         f"Wolne: {', '.join(przyg) if przyg else 'żadne'}")


def obrazenia(st, ile, skad):
    ile = int(ile)
    if ile < 0:
        blad('obrażenia nie mogą być ujemne — użyj polecenia "lecz"')
    st['pw']['teraz'] -= ile
    stan = ''
    if st['pw']['teraz'] <= -10:
        stan = '  >>> MARTWY <<<'
    elif st['pw']['teraz'] < 0:
        stan = '  >>> nieprzytomny, wykrwawia się <<<'
    elif st['pw']['teraz'] == 0:
        stan = '  >>> nieprzytomny, stabilny <<<'
    zapisz(st, f'obrażenia {ile} ({skad}) -> {st["pw"]["teraz"]}/{st["pw"]["maks"]}{stan}')


def lecz(st, ile, skad):
    ile = int(ile)
    przed = st['pw']['teraz']
    st['pw']['teraz'] = min(st['pw']['maks'], st['pw']['teraz'] + ile)
    faktycznie = st['pw']['teraz'] - przed
    zapisz(st, f'leczenie {faktycznie} z {ile} ({skad}) -> {st["pw"]["teraz"]}/{st["pw"]["maks"]}')


def odpoczynek(st):
    """8 godzin snu: naturalne leczenie 1 PW za poziom, miejsca na czary wracają puste."""
    if st['pw']['teraz'] <= -10:
        blad('martwi nie odpoczywają')
    przed = st['pw']['teraz']
    st['pw']['teraz'] = min(st['pw']['maks'], st['pw']['teraz'] + st['postac']['poziom'])
    for poz in ('0', '1'):
        st['zaklecia'][poz]['przygotowane'] = []
    st['dzien'] = st.get('dzien', 1) + 1
    zapisz(st, f'odpoczynek: PW {przed} -> {st["pw"]["teraz"]}, czary wymagają ponownego przygotowania, dzień {st["dzien"]}')


def liczba(st, pole, delta, powod):
    delta = int(delta)
    st[pole] = st.get(pole, 0) + delta
    zapisz(st, f'{pole} {delta:+d} ({powod}) -> {st[pole]}')


def znak(st, tresc):
    st['znaki'].append(tresc)
    zapisz(st, f'znak: {tresc}')


def sprawdz():
    if not LOG.exists():
        print('dziennik pusty'); return
    linie = [l for l in LOG.read_text(encoding='utf-8').splitlines() if l.strip()]
    ok = True
    for i in range(1, len(linie)):
        oczekiwany = hashlib.sha256(linie[i - 1].encode('utf-8')).hexdigest()[:16]
        podany = linie[i].split('| prev:')[1].split(' |')[0]
        if podany != oczekiwany:
            print(f'ZERWANY ŁAŃCUCH w wierszu {i + 1}: jest {podany}, powinno być {oczekiwany}')
            ok = False
    biezacy = hashlib.sha256(json.dumps(wczytaj(), ensure_ascii=False, sort_keys=True).encode('utf-8')).hexdigest()[:16]
    ostatni = linie[-1].split('| stan:')[1].split(' |')[0]
    if biezacy != ostatni:
        print(f'STAN NIE ZGADZA SIĘ Z DZIENNIKIEM: plik {biezacy}, dziennik {ostatni}')
        ok = False
    print(f'{len(linie)} wpisów — ' + ('łańcuch spójny, stan zgodny z dziennikiem' if ok else 'WYKRYTO ZMIANY'))


# --- eksport do bazy artefaktu (karta na telefonie) -------------------------
def eksport(sciezka='/tmp/stan_db.json'):
    """Zapisuje zmienną część stanu do pliku, który MG wysyła do bazy artefaktu."""
    st = wczytaj()
    zm = {'dzien': st['dzien'], 'pw': st['pw'], 'zloto': st['zloto'],
          'doswiadczenie': st['doswiadczenie'], 'laska': st['laska'],
          'reputacja': st['reputacja'], 'znaki': st['znaki'], 'zmian': st['zmian'],
          'zaklecia': {p: {'miejsc': g['miejsc'], 'wrozbiarskich': g['wrozbiarskich'],
                           'przygotowane': g['przygotowane']} for p, g in st['zaklecia'].items()},
          'ksiega': st['ksiega']}
    pathlib.Path(sciezka).write_text(json.dumps(zm, ensure_ascii=False, indent=1), encoding='utf-8')
    print(sciezka)

if __name__ == '__main__':
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    cmd, arg = sys.argv[1], sys.argv[2:]
    if cmd == 'sprawdz':
        sprawdz(); raise SystemExit
    st = wczytaj()
    if cmd == 'pokaz': pokaz(st)
    elif cmd == 'przygotuj': przygotuj(st, arg[0], arg[1] if len(arg) > 1 else '1')
    elif cmd == 'rzuc': rzuc(st, ' '.join(arg))
    elif cmd == 'obrazenia': obrazenia(st, arg[0], ' '.join(arg[1:]) or '—')
    elif cmd == 'lecz': lecz(st, arg[0], ' '.join(arg[1:]) or '—')
    elif cmd == 'odpoczynek': odpoczynek(st)
    elif cmd in ('laska', 'doswiadczenie', 'zloto', 'reputacja'): liczba(st, cmd, arg[0], ' '.join(arg[1:]) or '—')
    elif cmd == 'znak': znak(st, ' '.join(arg))
    elif cmd == 'eksport': eksport(arg[0] if arg else '/tmp/stan_db.json')
    else: blad(f'nieznane polecenie: {cmd}')
