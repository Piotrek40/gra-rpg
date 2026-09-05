# Bestiariusz kampanii

Statystyki w `przeciwnicy.json` — to jest źródło prawdy, z którego czyta `walka.py`.
Ten plik opisuje, **kiedy** kto się pojawia i dlaczego.

| Przeciwnik | Gdzie | Kiedy pasuje |
|---|---|---|
| **Zbir** | Dzielnica Portowa, zaułki | Ktoś komuś zapłacił. Zbir wie tylko, ile dostał |
| **Rzezimieszek** | tłum, targ, doki | Kradzież, nie zabójstwo. Znika po jednym ataku |
| **Strażnik Straży Miejskiej** | wszędzie w mieście | Gdy Aelrindel złamie prawo albo ktoś go oskarży |
| **Szczur olbrzymi** | kanały, piwnice, Podgórze | Wszędzie pod miastem, w grupach po 2–4 |
| **Pies obronny** | składy, bramy, dziedzińce | Gdy ktoś wchodzi tam, gdzie nie powinien |
| **Pomniejszy cień** | tam, gdzie tknięto Splot Cienia | **Wyłącznie** przy śladach T2/T4 — nie jako zwykły wróg |

## Zasada użycia

Przeciwnik pojawia się dlatego, że **ktoś go tam postawił albo tam mieszka** — nigdy dlatego,
że scena potrzebuje walki. Pomniejszy cień jest sygnałem fabularnym, nie potworem na drodze:
jeśli się pojawia, znaczy, że Splot Cienia jest blisko, i gracz ma prawo to odczytać.

## Doświadczenie

Postać 1. poziomu za przeciwnika o poziomie wyzwania 1 dostaje **300 PD**.
Awans na 2. poziom przy **2000 PD**. Doświadczenie przyznaje się także za rozwiązanie
sytuacji bez walki — tyle samo. Ucieczka od walki, której nie dało się wygrać, też się liczy.

## Jak ten bestiariusz rośnie

Sześć wpisów to **komplet na ulice Głębi Wodnej dla postaci 1. poziomu** i nic więcej.
Będzie rósł, ale wyłącznie według tych zasad:

1. **Statystyki przed pojawieniem się.** Istota trafia do `przeciwnicy.json` z pełnym
   zestawem pól, **zanim** wejdzie do sceny. Wymyślanie przeciwnika w trakcie walki
   jest zakazane tak samo jak wymyślanie czaru.
2. **Każdy ma zapisaną taktykę.** Zachowanie wynika z rodzaju istoty, nie z nastroju MG.
   Zbir ucieka poniżej 2 PW, bo jest najemnikiem. Pies obronny nie ucieka nigdy.
   Kontrola spójności odrzuca wpis bez taktyki.
3. **Wpis do tabeli powyżej: gdzie i kiedy.** Istota bez odpowiedzi na pytanie „skąd się tu wzięła"
   nie wchodzi do gry.
4. **Świat NIE skaluje się do poziomu postaci.** Zbir na zawsze zostaje zbirem z sześcioma
   punktami wytrzymałości. Na 5. poziomie przestanie być groźny — i bardzo dobrze, bo to
   właśnie jest widoczny dowód rozwoju. Niebezpieczeństwo rośnie dlatego, że **idziesz
   w głębsze miejsca**, a nie dlatego, że ktoś dolewa punktów przeciwnikom.
5. **Istota spoza kanonu** ma pola `kanon: false` i `zrodlo`, oraz wpis w `swiat/wlasne.md`.

## Co dojdzie, gdy fabuła tam pójdzie

| Kierunek | Co się dopisze |
|---|---|
| Kanały i piwnice | więcej robactwa, coś, co je zjada |
| Podgórze | to, co Halaster tam zostawił — od 3. poziomu wzwyż |
| Ślad Splotu Cienia | istoty cienia, każda jako sygnał, nie jako przeszkoda |
| Konflikt gildii | zawodowcy: zabójcy, magowie na żołdzie, ochroniarze |
| Wybrzeże i porty | to, co przypływa i to, co czeka pod wodą |
