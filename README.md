# Splot i Cień — kampania Zapomnianych Krain

D&D 3.5, Wybrzeże Mieczy, rok 1372 Doliny (Rok Dzikiej Magii).
Piotr gra. Claude prowadzi.

## Jak to działa

- `ZASADY-MG.md` — czego Mistrzowi Gry **nie wolno**. Czytane na starcie każdej sesji.
- `swiat/` — prawda o świecie, zapisana **zanim** gracz zada pytanie. To nie są notatki po fakcie.
- `swiat/TAJEMNICE.b64` — rzeczy, których gracz jeszcze nie wie. Zakodowane, żeby nie zepsuć gry przypadkowym spojrzeniem, ale **zatwierdzone w gicie**, żeby MG nie mógł ich po cichu zmienić.
- `postac/` — karta postaci. Stan bieżący, nie wspomnienie.
- `kronika/` — co się wydarzyło i każdy rzut kością, jaki padł.
- `narzedzia/kosci.py` — prawdziwe kości. MG nie wybiera wyników.

## Dlaczego kości są w kodzie

Model językowy proszony o „rzut k20" nie losuje — dobiera token, który pasuje do narracji.
Dlatego rzuty idą przez `secrets.randbelow()` i lądują w `kronika/rzuty.log`,
którego nie kasuję i nie edytuję. Jeśli zginiesz, zginiesz na liczbie, którą oboje widzieliśmy.
