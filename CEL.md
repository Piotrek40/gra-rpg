# CEL — Odmęt

> Ten plik czytasz na starcie KAŻDEJ sesji, zanim cokolwiek zaproponujesz.
> Ten plik aktualizujesz na końcu KAŻDEJ sesji.
> Wersja docelowa opisana niżej jest wiążąca. Nie wolno jej pomniejszyć bez wyraźnej decyzji Piotra zapisanej w sekcji „Zmiany decyzji".

---

## 1. Czym to jest na końcu

Gra przeglądarkowa na telefon (jeden plik HTML, bez bibliotek). Prowadzisz kolejne drużyny z portowego miasta Odmęt na wyprawy za mury, z których się ginie. Miasto pamięta każdą wyprawę — reputację, długi, wiedzę, ludzi — więc po miesiącach gry świat jest gęsty od konsekwencji twoich decyzji, a każda sesja (5–15 minut) kończy się myślą „jeszcze jedna wyprawa".

## 2. Skala docelowa

- Regiony za murami: 20+ (ruiny imperium, podziemia Bladych, wieże, bagna, wybrzeże…).
- Rodzaje spotkań: 30+ (dziś 3: wybór, walka, odpoczynek; potem handel, świątynia, ruina, spotkanie z bogiem…).
- Komórki tekstowe aktor × napięcie: setki. Aktorzy: 50+. Napięcia: 15+.
- Przeciwnicy: 30+ rodzajów, każdy z własną regułą zachowania.
- Towarzysze: 10+; gildie: 4–6 (polityka miasta); bogowie: 6–8; przedmioty: 50+.
- Jedna wyprawa: 5–15 minut. Progresja: miesiące. Jeden plik HTML < 1 MB, płynnie (60 kl./s) na Samsungu S24 w Chrome.

## 3. Zakazy stałe — obowiązują na każdym etapie

- Żadna liczba określająca skalę nie występuje w kodzie inaczej niż jako konfiguracja (sekcja KONFIGURACJA na górze pliku).
- Żadnych danych przykładowych udających prawdziwe. Brak danych = widoczna pustka.
- Żadnej listy gotowych spotkań. Spotkanie = miejsce × aktor × napięcie, wybrane wagami ze stanu (region, drużyna, reputacja, znaki z przeszłości). Tekst jest pisany ręcznie na poziomie komórki aktor × napięcie i wiąże się ze stanem (imiona, płeć, długi, wiedza).
- Każdy wybór ma koszt teraz albo znak, który wraca później. Wybór bez skutku to błąd.
- Bogowie odpowiadają mechanicznie, nie tekstem. Modlitwa bez efektu to błąd.
- Dodanie regionu / aktora / przeciwnika / towarzysza / przedmiotu / boga / gildii = dopisanie wpisu w konfiguracji, nigdy przeróbka silnika.
- Żadnych nazw i stworów z D&D/WotC. Nazwy własne własne.
- Żadnego „docelowo to przepiszemy". Jeśli coś nie obsłuży 20 regionów po zmianie parametru, robi się to inaczej od razu.
- Jeden plik, zero zewnętrznych zasobów. Fonty tylko systemowe (na Androidzie: Noto Serif). Tekstury generowane w kodzie.
- Sterowanie tylko dotykiem, cele dotyku ≥ 48 px, nic nie wymaga kursora ani klawiatury.

## 4. Etapy

### Etap 1 — Pierwsza warstwa: jeden region, miasto, które pamięta (ZROBIONY 2026-09-02)
- **Widać:** wychodzisz z Odmętu na Bagna Dłużników, idziesz rozgałęzionym szlakiem po mapie w SVG, trafiasz na wybory, walki i noclegi, giniesz lub wracasz z łupem; miasto pokazuje, co pamięta (reputacja w Cechu Wagi, kronika zmarłych, znaki, wiedza, odblokowana Ida); ruszasz drugi raz i idziesz dalej.
- **Zakazy etapu:** wszystkie stałe; do tego: jeden region, trzy rodzaje spotkań, dwa rodzaje przeciwników, jeden towarzysz, jedna gildia — ale silniki (mapa, spotkania, walka, zapis, pamięć miasta, rozliczenie, bogowie) docelowe.
- **Test eskalacji:** TAK — region, aktor, komórka, przeciwnik, przedmiot, bóg, gildia, towarzysz, znak, wiedza, ulepszenie: każde jest wpisem w konfiguracji z regułami wag/warunków; silnik wybiera z dowolnej liczby wpisów. Długość szlaku i liczba węzłów to parametry.

### Etap 2 — Handel i drugi region
- **Widać:** węzeł handlu na szlaku i rynek w mieście (znaki dłużników mają cenę, jak obiecał Przewoźnik); drugi region (ruiny imperium) z własnymi aktorami, przeciwnikami i pogodą; wybór regionu w kontrakcie Cechu.
- **Zakazy etapu:** ceny wynikają z reguł (podaż = to, co przynoszą wyprawy; popyt = gildie i bogowie), nie z tabeli. Drugi region nie kopiuje bagien — inne napięcia, inne zachowania przeciwników.
- **Test eskalacji:** ten sam silnik spotkań obsługuje 2 regiony; jeśli trzeba go ruszyć, plan etapu jest zły.

### Etap 3 — Miasto jako gra: gildie, bogowie, polityka
- **Widać:** 3 gildie z konfliktem interesów (przysługa jednej = dług u drugiej); bogowie z żądaniami (świątynia, kapłani, kary w mieście); wydarzenia miejskie między wyprawami wynikające ze znaków.
- **Zakazy etapu:** wydarzenia miejskie z reguł, nie z listy. Żadna gildia nie jest „tą dobrą".
- **Test eskalacji:** gildia = wpis; wydarzenie = reguła ze stanem.

### Etap 4 — Głębia postaci
- **Widać:** towarzysze z własnymi znakami (pamiętają, co im zrobiłeś, odchodzą, zdradzają); umiejętności rozwijane przez czyny, nie punkty; epitety i kronika, którą chce się czytać.
- **Zakazy etapu:** zero drzewek talentów; rozwój wynika z tego, co postać robiła.
- **Test eskalacji:** cechy postaci = reguły na historii czynów.

## 5. Reguły zamiast danych

- Spotkanie wynika z iloczynu miejsce × aktor × napięcie ważonego stanem (złoto → myto; rany → pokusa; długi → sąd; noc → utopieni).
- Skład wrogów wynika z głębokości, pory dnia i znaków (obrabowanie topielca sprowadza topielców).
- Zachowanie wroga wynika z jego rodzaju (topielec dusi najsłabszego; ognik wysysa manę i ucieka), nie ze skryptu walki.
- Odpowiedź boga wynika z łaski (poziom łaski to jedna liczba, którą zmieniają czyny), a łaska należy do miasta, nie do bohatera.
- Reputacja Cechu wynika z dostarczonego złota i kwitów oraz z tego, co Cech się dowiedział (poborca donosi, bagno śmierdzi).
- Znaki (konsekwencje) mają zasięg: „wyprawa" (giną z bohaterem) albo „miasto" (dziedziczy kolejny bohater).
- Mapa wyprawy generowana z ziarna: warstwy, rozgałęzienia, rodzaje węzłów z wag zależnych od głębokości; treść węzła powstaje dopiero w chwili wejścia, ze stanu w tej chwili.
- Imiona bohaterów z sylab, epitety z przyczyny śmierci, sylwetki scen z reguł regionu (gęstość trzcin, drzewa, ruiny), tekstura pergaminu z szumu liczonego w kodzie.

## 6. Stan bieżący

- **Etap:** 1 zrobiony; następny: 2.
- **Ostatnio powstało:** `index.html` — cała gra (konfiguracja, silniki, grafika, ekrany, zapis); `tools/sim.js` — symulator setek wypraw bez przeglądarki (błędy, zawieszenia, balans).
- **Następny krok:** węzeł handlu + rynek znaków w mieście; drugi region (ruiny imperium) jako test, że silnik spotkań nie wymaga ruszania.
- **Odłożone świadomie:** handel (etap 2); więcej niż jedna gildia (etap 3); rozwój postaci (etap 4); dźwięk (brak decyzji, czy w ogóle); 3 archetypy bohatera (dziś 2, trzeci to wpis).

## 7. Zmiany decyzji

- 2026-09-02 — Start projektu. Poprzednia zawartość repozytorium (silnik RPG na Electron) usunięta w całości; zostaje w historii gita.
- 2026-09-02 — Model spotkań: reguły wybierają miejsce × aktor × napięcie; tekst pisany ręcznie na poziomie komórki aktor × napięcie (model jak w Wildermyth), bo proza składana z fragmentów brzmi jak generator, a to jest zakazane. Każda komórka ma warunek wejścia i wagę zależną od stanu.
- 2026-09-02 — Łaska bogów i większość znaków należą do miasta (dziedziczy je następny bohater). Śmierć bohatera kończy wyprawę; żywi towarzysze wracają sami, łup przepada, wiedza zostaje.
- 2026-09-02 — Towarzysz powalony w walce nie ginie, jeśli drużyna wygra albo ucieknie: wstaje z 1 zdrowia i trwałą blizną (−2 maks. zdrowia na zawsze, widoczne w Tawernie). Ginie naprawdę tylko wtedy, gdy pada razem z bohaterem. Powód: symulacja pokazała, że przy jednym towarzyszu i śmierci ostatecznej tawerna pustoszeje po kilku wyprawach; blizny są konsekwencją, która wraca, a nie kasowaniem postaci.
- 2026-09-02 — Reguła silnika walki: po otrząśnięciu się z oszołomienia jednostka jest przez rundę odporna. Bez tego ogniki blokowały bohatera w nieskończoność (wykryte symulatorem).
- 2026-09-02 — Łaska bogów ograniczona do ±6, żeby dało się ją stracić.
- 2026-09-02 — Powrót z wyprawy możliwy z każdego rozstrzygniętego węzła (naciśnij, ile chcesz); cel kontraktu na końcu szlaku daje premię. To jest mechanizm „jeszcze jeden węzeł".
