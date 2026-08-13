# Manuály

Návod pre prevádzky (`navodpreprevadzky_zb.pdf`) žije v
[`backend/api/assets/manualy/`](../../backend/api/assets/manualy/).

Presunuli sme ho tam, lebo sa posiela ako príloha prvého (set-password) e-mailu
pre nový login (issue #475) — backend image sa buildí z `backend/` ako kontextu,
takže súbor mimo tohto adresára by v kontajneri neexistoval. Aby existovala len
jedna kópia, kanonické miesto je backend a tento súbor je len rozcestník.
