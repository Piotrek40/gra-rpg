#!/usr/bin/env python3
"""Starcie zbrojne prowadzone przez program, nie przez pamięć Mistrza Gry.

Inicjatywa, tura, rzut na trafienie kontra klasa pancerza, obrażenia, trafienia
krytyczne, trwanie czarów w rundach, stany. Wszystkie rzuty idą przez kosci.py,
więc lądują w kronika/rzuty.log. Punkty wytrzymałości Aelrindela zmieniane są
przez postac.py, więc trafiają do tego samego łańcucha skrótów.

  python3 narzedzia/walka.py nowa "Zaułek za Ziejącym Portalem" zbir zbir
  python3 narzedzia/walka.py stan
  python3 narzedzia/walka.py atak zbir1 aelrindel
  python3 narzedzia/walka.py atak aelrindel zbir1 kusza
  python3 narzedzia/walka.py czar "zbroja maga" aelrindel
  python3 narzedzia/walka.py obrazenia zbir1 5 "magiczny pocisk"
  python3 narzedzia/walka.py stan-nalozony zbir1 przewrocony 1
  python3 narzedzia/walka.py runda
  python3 narzedzia/walka.py koniec
"""
import json, sys, pathlib, subprocess, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
STARCIE = ROOT / 'kronika' / 'starcie.json'
KOSCI = ROOT / 'narzedzia' / 'kosci.py'
POSTAC = ROOT / 'narzedzia' / 'postac.py'


def rzut(zapis, po_co):
    """Prawdziwa kość przez kosci.py — wynik ląduje w rzuty.log."""
    w = subprocess.run([sys.executable, str(KOSCI), zapis, po_co],
                       capture_output=True, text=True)
    linia = w.stdout.strip()
    if not linia:
        raise SystemExit('kosci.py nie zwróciły wyniku: ' + w.stderr)
    print('    ' + linia)
    return int(linia.split('=')[-1].split()[0])


def blad(m):
    print('ODMOWA: ' + m, file=sys.stderr); raise SystemExit(1)


def gracz():
    return json.loads((ROOT / 'postac' / 'stan.json').read_text(encoding='utf-8'))


def wczytaj():
    if not STARCIE.exists():
        blad('nie trwa żadne starcie — zacznij od "nowa"')
    return json.loads(STARCIE.read_text(encoding='utf-8'))


def zapisz(s):
    STARCIE.write_text(json.dumps(s, ensure_ascii=False, indent=1)+'\n', encoding='utf-8')


def kp_gracza(s):
    """Klasa pancerza Aelrindela zależy od tego, co na nim działa TERAZ."""
    kp, opis = 12, ['baza 10', 'Zręczność +2']
    for e in s['uczestnicy']['aelrindel']['efekty']:
        if e['nazwa'] == 'zbroja maga':
            kp += 4; opis.append('zbroja maga +4')
        if e['nazwa'] == 'tarcza':
            kp += 4; opis.append('tarcza +4')
    return kp, ', '.join(opis)


# ---------------------------------------------------------------- polecenia

def nowa(nazwa, wrogowie):
    BEST = json.loads((ROOT / 'swiat' / 'przeciwnicy.json').read_text(encoding='utf-8'))
    g = gracz()
    s = {'nazwa': nazwa, 'runda': 1, 'uczestnicy': {}, 'kolejnosc': [], 'log': []}
    s['uczestnicy']['aelrindel'] = {
        'nazwa': g['postac']['imie'].split()[0], 'gracz': True,
        'pw': g['pw']['teraz'], 'pw_maks': g['pw']['maks'],
        'kp': 12, 'inicjatywa_mod': 6, 'efekty': [], 'stany': {},
    }
    licznik = {}
    for w in wrogowie:
        if w not in BEST:
            blad(f"nie znam przeciwnika '{w}'. Znam: {', '.join(BEST)}")
        licznik[w] = licznik.get(w, 0) + 1
        uid = f'{w}{licznik[w]}'
        b = BEST[w]
        s['uczestnicy'][uid] = {
            'nazwa': b['nazwa'] + (f" {licznik[w]}" if wrogowie.count(w) > 1 else ''),
            'gracz': False, 'rodzaj': w, 'pw': b['pw'], 'pw_maks': b['pw'],
            'kp': b['kp'], 'inicjatywa_mod': b['inicjatywa'], 'atak': b['atak'],
            'bron': b['bron'], 'obrazenia': b['obrazenia'], 'krytyk': b['krytyk'],
            'efekty': [], 'stany': {},
        }
    print(f'\n=== {nazwa} ===')
    print('Inicjatywa (1k20 + modyfikator):')
    wyniki = []
    for uid, u in s['uczestnicy'].items():
        w = rzut(f"1k20+{u['inicjatywa_mod']}", f"inicjatywa: {u['nazwa']}")
        wyniki.append((w, u['inicjatywa_mod'], uid))
    wyniki.sort(reverse=True)
    s['kolejnosc'] = [uid for _, _, uid in wyniki]
    s['tura'] = 0
    zapisz(s)
    print('\nKolejność: ' + ' → '.join(s['uczestnicy'][u]['nazwa'] for u in s['kolejnosc']))
    stan()


def stan():
    s = wczytaj()
    kp, opis = kp_gracza(s)
    print(f"\n=== {s['nazwa']} · runda {s['runda']} ===")
    for i, uid in enumerate(s['kolejnosc']):
        u = s['uczestnicy'][uid]
        if u['pw'] <= 0 and not u['gracz']:
            print(f"  {'▸' if i == s['tura'] else ' '} {u['nazwa']:<22} POKONANY")
            continue
        k = kp if u['gracz'] else u['kp']
        st = ', '.join(f'{n}({t})' for n, t in u['stany'].items())
        ef = ', '.join(f"{e['nazwa']}({e['rundy']})" for e in u['efekty'])
        dop = ('  [' + '; '.join(x for x in (ef, st) if x) + ']') if (ef or st) else ''
        znak = '▸' if i == s['tura'] else ' '
        print(f"  {znak} {u['nazwa']:<22} PW {u['pw']:>3}/{u['pw_maks']:<3} KP {k}{dop}")
    if s['uczestnicy']['aelrindel']['efekty']:
        print(f"    (klasa pancerza Aelrindela: {opis})")
    tera = s['uczestnicy'][s['kolejnosc'][s['tura']]]['nazwa']
    print(f"\n  Tura: {tera}")


def atak(kto, cel, czym=None):
    s = wczytaj()
    if kto not in s['uczestnicy'] or cel not in s['uczestnicy']:
        blad(f'nie ma takiego uczestnika. Są: {", ".join(s["uczestnicy"])}')
    a, c = s['uczestnicy'][kto], s['uczestnicy'][cel]
    if a['pw'] <= 0:
        blad(f"{a['nazwa']} jest pokonany i nie atakuje")
    if a['stany'].get('przewrocony'):
        print('    (atakujący przewrócony: −4 do ataku wręcz)')
    if a['gracz']:
        BRON = {'kusza': (2, '1k8', '19-20/×2', 'kusza lekka'),
                'sztylet': (-2, '1k4', '19-20/×2', 'sztylet')}
        if czym not in BRON:
            blad(f'czym atakuje Aelrindel? {", ".join(BRON)}')
        prem, obr, kryt, nazwa_broni = BRON[czym]
    else:
        prem, obr, kryt, nazwa_broni = a['atak'], a['obrazenia'], a['krytyk'], a['bron']
    kp = kp_gracza(s)[0] if c['gracz'] else c['kp']
    prog = int(kryt.split('/')[0].split('-')[0])
    print(f"\n  {a['nazwa']} atakuje: {c['nazwa']} ({nazwa_broni}, KP celu {kp})")
    kostka = rzut('1k20', f"atak: {a['nazwa']} -> {c['nazwa']}")
    suma = kostka + prem
    if kostka == 1:
        print('    Naturalna 1 — automatyczne chybienie.'); zapisz(s); return
    trafil = kostka == 20 or suma >= kp
    print(f"    {kostka} + {prem} = {suma} wobec KP {kp} — " + ('TRAFIENIE' if trafil else 'chybienie'))
    if not trafil:
        zapisz(s); return
    krytyczne = False
    if kostka >= prog:
        print(f'    Zagrożenie trafieniem krytycznym (próg {prog}) — rzut potwierdzający:')
        p = rzut('1k20', f"potwierdzenie krytyka: {a['nazwa']}")
        krytyczne = (p + prem) >= kp or p == 20
        print('    ' + ('KRYTYK POTWIERDZONY — obrażenia podwójne' if krytyczne else 'niepotwierdzony, zwykłe obrażenia'))
    d = rzut(obr, f"obrażenia: {a['nazwa']} -> {c['nazwa']}")
    if krytyczne:
        d2 = rzut(obr, f"obrażenia krytyczne (drugi rzut): {a['nazwa']}")
        d += d2
    zadaj(s, cel, d, f"{a['nazwa']} ({nazwa_broni})")


def zadaj(s, cel, ile, skad):
    c = s['uczestnicy'][cel]
    if c['gracz']:
        w = subprocess.run([sys.executable, str(POSTAC), 'obrazenia', str(ile), skad],
                           capture_output=True, text=True)
        print('    ' + (w.stdout.strip().split('| ')[-1] if w.stdout else w.stderr.strip()))
        c['pw'] = gracz()['pw']['teraz']
    else:
        c['pw'] -= ile
        koniec = '  >>> POKONANY <<<' if c['pw'] <= 0 else ''
        print(f"    {c['nazwa']}: −{ile} → {c['pw']}/{c['pw_maks']}{koniec}")
    s['log'].append(f"r{s['runda']}: {skad} zadaje {ile} celowi {c['nazwa']}")
    zapisz(s)


def czar(nazwa, cel):
    """Rzucenie czaru: zużywa miejsce przez postac.py i nakłada efekt na czas trwania."""
    s = wczytaj()
    CZARY = json.loads((ROOT / 'swiat' / 'czary.json').read_text(encoding='utf-8'))
    poziom_postaci = gracz()['postac']['poziom']
    w = subprocess.run([sys.executable, str(POSTAC), 'rzuc', nazwa], capture_output=True, text=True)
    if w.returncode != 0:
        blad(w.stderr.strip().replace('ODMOWA: ', ''))
    print('    ' + w.stdout.strip().split('| ')[-1])
    klucz = next((k for k in CZARY if k.lower() == nazwa.lower()), None)
    if klucz:
        tr = CZARY[klucz]['trwanie']
        rundy = None
        if 'minuta/poziom' in tr: rundy = 10 * poziom_postaci
        elif 'godzina/poziom' in tr: rundy = 600 * poziom_postaci
        elif '10 minut/poziom' in tr: rundy = 100 * poziom_postaci
        if rundy and cel in s['uczestnicy']:
            s['uczestnicy'][cel]['efekty'].append({'nazwa': klucz.lower(), 'rundy': rundy})
            print(f"    efekt '{klucz.lower()}' na {rundy} rund ({tr})")
    zapisz(s); stan()


def stan_nalozony(kto, nazwa, rundy):
    s = wczytaj()
    if kto not in s['uczestnicy']:
        blad('nie ma takiego uczestnika')
    s['uczestnicy'][kto]['stany'][nazwa] = int(rundy)
    print(f"  {s['uczestnicy'][kto]['nazwa']}: {nazwa} na {rundy} rund")
    zapisz(s); stan()


def runda():
    s = wczytaj()
    s['tura'] += 1
    if s['tura'] >= len(s['kolejnosc']):
        s['tura'] = 0
        s['runda'] += 1
        print(f"\n--- runda {s['runda']} ---")
        for u in s['uczestnicy'].values():
            for e in list(u['efekty']):
                e['rundy'] -= 1
                if e['rundy'] <= 0:
                    u['efekty'].remove(e)
                    print(f"    {u['nazwa']}: efekt '{e['nazwa']}' wygasa")
            for n in list(u['stany']):
                u['stany'][n] -= 1
                if u['stany'][n] <= 0:
                    del u['stany'][n]
                    print(f"    {u['nazwa']}: stan '{n}' mija")
    # pomiń pokonanych
    while s['uczestnicy'][s['kolejnosc'][s['tura']]]['pw'] <= 0 and not s['uczestnicy'][s['kolejnosc'][s['tura']]]['gracz']:
        s['tura'] += 1
        if s['tura'] >= len(s['kolejnosc']):
            s['tura'] = 0; s['runda'] += 1
    zapisz(s); stan()


def koniec():
    s = wczytaj()
    zywi = [u for uid, u in s['uczestnicy'].items() if not u['gracz'] and u['pw'] > 0]
    BEST = json.loads((ROOT / 'swiat' / 'przeciwnicy.json').read_text(encoding='utf-8'))
    pd = sum(BEST[u['rodzaj']]['pd'] for uid, u in s['uczestnicy'].items()
             if not u['gracz'] and u['pw'] <= 0)
    print(f"\n=== koniec: {s['nazwa']} po {s['runda']} rundach ===")
    print(f"  pokonani: {sum(1 for uid,u in s['uczestnicy'].items() if not u['gracz'] and u['pw']<=0)}"
          f"   niepokonani: {len(zywi)}")
    print(f"  Aelrindel: {s['uczestnicy']['aelrindel']['pw']} PW")
    if pd:
        print(f"  doświadczenie do przyznania: {pd} PD")
    STARCIE.unlink()
    print('  starcie zamknięte, plik usunięty')


if __name__ == '__main__':
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    c, a = sys.argv[1], sys.argv[2:]
    if c == 'nowa': nowa(a[0], a[1:])
    elif c == 'stan': stan()
    elif c == 'atak': atak(a[0], a[1], a[2] if len(a) > 2 else None)
    elif c == 'czar': czar(a[0], a[1] if len(a) > 1 else 'aelrindel')
    elif c == 'obrazenia': zadaj(wczytaj(), a[0], int(a[1]), ' '.join(a[2:]) or '—')
    elif c == 'stan-nalozony': stan_nalozony(a[0], a[1], a[2])
    elif c == 'runda': runda()
    elif c == 'koniec': koniec()
    else: blad(f'nieznane polecenie: {c}')
