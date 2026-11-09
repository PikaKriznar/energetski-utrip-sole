# Energetski utrip šole

Demo interaktivnega energetskega portala za zaslon v šolski avli: sončna elektrarna (PV), baterijski hranilnik (BESS) in časovno prilagajanje kuhinjskih naprav.

**Vsi podatki so simulirani za generično šolo.** Portal ne upravlja nobenih naprav.

## Prikazi

- **Stanje zdaj** – vrtljiv 3D model šole (three.js) z infografikami; izbira dela šole spremeni grafe.
- **Kako deluje?** – shema energijskih tokov z razlagami posameznih komponent.
- **Kaj lahko naredimo bolje?** – primerjava osnovnega in optimiziranega delovanja, kapacitet baterije, vremena ter priporočila za kuhinjo.

Za javni zaslon dodajte `?kiosk` na konec povezave: po dveh minutah brez dotika se portal vrne na ambientni prikaz.

## Podatki in model

`model/optimize.py` izračuna 15-minutne sintetične profile in za 3 vremenske scenarije × 4 kapacitete baterije reši model MILP (SciPy/HiGHS). Cilj je najnižji strošek omrežja ob upoštevanju ravnovesja moči, omejitev baterije in časovnih oken kuhinje. Rezultat je datoteka `data.js`, ki jo portal uvozi.

```bash
pip install numpy scipy
python3 model/optimize.py
```

Sintetične profile v razdelku *Input profiles* je treba nadomestiti s podatki PVGIS, ARSO in meritvami šole, ko bodo na voljo.
