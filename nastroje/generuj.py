"""Převede stažený katalog Démos trade (data/*.json) na js/katalog-demos.js."""
import json, re, sys, os, datetime

DATA, VYSTUP = sys.argv[1], sys.argv[2]

DREVINY = {'BUK': 'buk', 'DUB': 'dub', 'SMRK': 'smrk', 'BOROVICE': 'borovice', 'BŘÍZA': 'bříza', 'HEVEA': 'hevea',
           'OLŠE': 'olše', 'JASAN': 'jasan', 'TOPOL': 'topol', 'Buk': 'buk', 'Dub': 'dub', 'Smrk': 'smrk', 'Jedle': 'jedle'}
BARVY = [('dub', '#c49a6c'), ('buk', '#d6ae84'), ('smrk', '#e8c99b'), ('jedle', '#e8cfa5'), ('borovice', '#e3c08a'),
         ('bor', '#e3c08a'), ('bříza', '#e9d5ac'), ('hevea', '#d9b98c'), ('olše', '#c98f5f'), ('jasan', '#e2cfa6'),
         ('topol', '#efe3c4'), ('eucalyptus', '#c99a78')]


def cislo(s):
    return float(s.replace(',', '.')) if ',' in s else int(s)


def cena_kc(text):
    m = re.match(r'([\d\s]+(?:,\d+)?)\s*Kč\s*/\s*(\S+)', text.replace('\xa0', ' '))
    if not m:
        return None, None
    return float(m.group(1).replace(' ', '').replace(',', '.')), m.group(2)


def dostupnost(text):
    t = text.lower()
    if t.startswith('skladem'):
        return 'skladem'
    if t.startswith('na objedn'):
        return 'na objednávku'
    return None  # doprodej a ostatní vynecháváme


def male_drevo(s):
    return ' '.join(DREVINY.get(w, w) for w in s.split())


def barva_dle(nazev, vychozi):
    n = nazev.lower()
    for k, b in BARVY:
        if k in n:
            return b
    return vychozi


def barva_lamina(dekor):
    d = dekor.lower()
    for klic, b in [('bíl', '#f3f2ee'), ('černá', '#2f2f2f'), ('antracit', '#45474a'), ('grafit', '#4f5154'),
                    ('šed', '#a3a39f'), ('beton', '#9d9a94'), ('béž', '#d9c9ad'), ('kašmír', '#cfc3b0'),
                    ('ořech', '#7a5236'), ('čokol', '#5a3c2b'), ('třešeň', '#b5734c'), ('javor', '#e6cfa3'),
                    ('dub', '#c49a6c'), ('jasan', '#d8c3a0'), ('buk', '#d6ae84'), ('hickory', '#b98a5c'),
                    ('akácie', '#c99c6b'), ('kaštan', '#8a5a3c'), ('modr', '#4d6d8f'), ('zelen', '#61795d'),
                    ('růž', '#d9aeb0'), ('červen', '#a5473b')]:
        if klic in d:
            return b
    return '#d6d0c4'


DREVO_DEKOR = ('dub', 'ořech', 'jasan', 'buk', 'třešeň', 'javor', 'hickory', 'akácie', 'kaštan', 'oak', 'borovice', 'smrk')

ROZ3 = re.compile(r'(\d+)/(\d+)/(\d+(?:,\d+)?)(?!\d)')
vysledek, vynechano = [], {}


def vynech(kat, duvod):
    vynechano.setdefault(kat, {}).setdefault(duvod, 0)
    vynechano[kat][duvod] += 1


def deska(kat, polozka, label, vlakno, barva, kategorie):
    m = ROZ3.search(polozka['nazev'])
    D, S, T = int(m.group(1)), int(m.group(2)), cislo(m.group(3))
    c, mj = cena_kc(polozka['cena'])
    dost = dostupnost(polozka['dostupnost'])
    vysledek.append({
        'id': 'demos-' + polozka['kod'], 'typ': 'deska', 'kategorie': kategorie,
        'nazev': f"{label} {str(T).replace('.', ',')} mm · {D}×{S}" + (' (na obj.)' if dost != 'skladem' else ''),
        'tloustka': T, 'formatD': D, 'formatS': S, 'vlakno': vlakno, 'orez': 10, 'barva': barva,
        'dodavatel': 'Démos trade', 'kod': polozka['kod'], 'puvodniNazev': polozka['nazev'],
        'cena': round(c, 2) if mj == 'ks' else None, 'dostupnost': dost, 'url': polozka['url'],
    })


def rezivo(kat, polozka, label, kategorie):
    m = ROZ3.search(polozka['nazev'])
    T, S, L = int(m.group(1)), int(m.group(2)), int(m.group(3))
    c, mj = cena_kc(polozka['cena'])
    if mj == 'm³':
        c = c * T * S * L / 1e9
    dost = dostupnost(polozka['dostupnost'])
    vysledek.append({
        'id': 'demos-' + polozka['kod'], 'typ': 'rezivo', 'kategorie': kategorie,
        'nazev': f"{label} {T}×{S} · {L} mm" + (' (na obj.)' if dost != 'skladem' else ''),
        'tloustka': T, 'sirka': S, 'delka': L, 'barva': barva_dle(label, '#e8c99b'),
        'dodavatel': 'Démos trade', 'kod': polozka['kod'], 'puvodniNazev': polozka['nazev'],
        'cena': round(c, 2) if c is not None else None, 'dostupnost': dost, 'url': polozka['url'],
    })


def nacti(kat):
    return json.load(open(os.path.join(DATA, kat + '.json')))


def zbytek(nazev, prefix):
    """Text mezi prefixem a rozměry, bez balicích poznámek."""
    s = nazev[len(prefix):] if nazev.startswith(prefix) else nazev
    s = ROZ3.split(s)[0] if ROZ3.search(s) else s
    return re.sub(r'\s+', ' ', s).strip()


for kat in ['sparovky', 'preklizky-truhlarske', 'preklizky-vodevzdorne-surove', 'latovky-dyhovane', 'biodesky',
            'mdf-surove', 'hdf-surove-a-sololit', 'drevotrisky-surove', 'deskove-plosne', 'dtd-laminovane', 'masivni']:
    for p in nacti(kat):
        n = p['nazev']
        if not dostupnost(p['dostupnost']):
            vynech(kat, 'doprodej'); continue
        r = ROZ3.search(n)
        # rozsahy typu 22-25/100, 24/80+, 50/190-220 nejsou jednoznačný průřez
        if not r or re.search(r'\d-\d+/|/\d+-\d|\d\+', n):
            vynech(kat, 'bez jednoznačného rozměru'); continue

        if kat == 'sparovky':
            if 'Stupeň' in n or 'Podstupeň' in n:
                vynech(kat, 'schodišťové stupně'); continue
            typ = ' napoj.' if re.search(r'napoj', n, re.I) else ' průb.' if 'průb' in n else ''
            label = 'Spárovka ' + male_drevo(zbytek(n, 'SPAR '))
            deska(kat, p, label + typ, True, barva_dle(label, '#d6ae84'), 'Spárovky')
        elif kat == 'preklizky-truhlarske':
            label = 'Překližka ' + male_drevo(zbytek(n, 'PT ').replace('(INT) ', '').replace('OBAL(INT) ', 'obalová ')
                                              .replace('OBAL (INT) ', 'obalová '))
            deska(kat, p, label, True, barva_dle(label, '#e9d5ac'), 'Překližky truhlářské')
        elif kat == 'preklizky-vodevzdorne-surove':
            z = zbytek(n, 'PV ').replace('SUR ', '').replace('OBAL ', 'obalová ').replace('SMRK//BOR', 'smrk/bor')
            label = 'Překližka vodovzd. ' + male_drevo(z)
            deska(kat, p, label, True, barva_dle(label, '#e9d5ac'), 'Překližky vodovzdorné')
        elif kat == 'latovky-dyhovane':
            label = 'Laťovka dýh. ' + male_drevo(zbytek(n, 'LATD '))
            deska(kat, p, label, True, barva_dle(label, '#d6ae84'), 'Laťovky dýhované')
        elif kat == 'biodesky':
            if 'VRTANÝ' in n:
                vynech(kat, 'vrtané (policové systémy)'); continue
            z = zbytek(n, 'BIO DESKA ').replace('3v ', '3vrstvá ').replace(' 4*PD', '').replace('Smrk', 'smrk').replace('Jedle', 'jedle').replace('SMRK', 'smrk')
            deska(kat, p, 'Biodeska ' + z, True, barva_dle(z, '#e8c99b'), 'Biodesky (třívrstvé)')
        elif kat == 'mdf-surove':
            if 'FIRE X' in n:
                vynech(kat, 'protipožární'); continue
            if n.startswith('MDFS (HDFS)'):
                z = zbytek(n, 'MDFS (HDFS) ').replace('KRONOSPAN', 'Kronospan').replace(' E05', '')
                deska(kat, p, 'HDF ' + z, False, '#8a6a4a', 'HDF a sololit')
            else:
                z = zbytek(n, 'MDFS ').replace(' E05', '').replace(' CARB2', '').replace('KRONOSPAN', 'Kronospan')
                barva = '#2f2f2f' if 'ČERNÁ' in n else '#9a9a98' if 'GREY' in n else '#7f9a74' if 'Hydro' in n else '#b89c78'
                deska(kat, p, 'MDF ' + z, False, barva, 'MDF')
        elif kat == 'hdf-surove-a-sololit':
            label = 'Sololak bílý' if n.startswith('SOLOLAK') else 'Sololit'
            deska(kat, p, label, False, '#f3f2ee' if 'BÍLÝ' in n else '#8a6a4a', 'HDF a sololit')
        elif kat in ('drevotrisky-surove', 'deskove-plosne'):
            if n.startswith('OSB'):
                if 'FIRESTOP' in n:
                    vynech(kat, 'protipožární'); continue
                z = re.sub(r'\s+', ' ', zbytek(n, '').replace('Sonae Arauco (AGEPAN)', 'Agepan')).strip()
                deska(kat, p, z, False, '#c9a45c', 'OSB')
            elif n.startswith('DTDS'):
                if re.search(r'GRENAMAT|DĚROVANÁ|PYROEX|Jakost', n):
                    vynech(kat, 'speciální (nehořlavé/děrované)'); continue
                z = zbytek(n, 'DTDS ').replace(' E05', '').replace('KRONOSPAN', 'Kronospan').replace('EGGER', 'Egger') \
                    .replace('STANDARD', 'standard').replace('PFLEIDERER', 'Pfleiderer').replace('DURELIS', 'Durelis')
                deska(kat, p, 'DTD ' + z, False, '#c8b48e', 'DTD surová')
            else:
                vynech(kat, 'stavební (Cetris, Agepan, hobra, DHF)')
        elif kat == 'dtd-laminovane':
            dekor = zbytek(n, 'DTDL ')
            drevo = any(k in dekor.lower() for k in DREVO_DEKOR)
            deska(kat, p, 'Lamino ' + dekor, drevo, barva_lamina(dekor), 'Lamino DTD 18 mm (skladem)')
        elif kat == 'masivni':
            if 'EUROHRANOL' in n or 'imp.' in n:
                vynech(kat, 'impregnované / eurohranoly'); continue
            if int(r.group(3)) > 6000:
                vynech(kat, 'délka nad 6 m'); continue
            if n.startswith('KVH'):
                rezivo(kat, p, 'KVH smrk' + (' DUO' if 'DUO' in n else ''), 'Řezivo – KVH hranoly')
            elif 'HOBLOVANÉ' in n:
                rezivo(kat, p, 'Prkno smrk hoblované A/B', 'Řezivo – hoblovaná prkna')
            elif 'STŘEŠNÍ LATĚ' in n:
                rezivo(kat, p, 'Lať smrk/jedle', 'Řezivo – hranoly a latě')
            elif 'HRANOL' in n:
                rezivo(kat, p, 'Hranol smrk/jedle', 'Řezivo – hranoly a latě')
            elif 'FOŠNA' in n:
                rezivo(kat, p, 'Fošna smrk/jedle omítaná', 'Řezivo – prkna a fošny')
            elif 'PRKNO' in n:
                rezivo(kat, p, 'Prkno smrk/jedle tříděné', 'Řezivo – prkna a fošny')
            else:
                vynech(kat, 'ostatní')

# stabilní pořadí: kategorie v pořadí výskytu, uvnitř podle názvu a tloušťky
poradi = {}
for m in vysledek:
    poradi.setdefault(m['kategorie'], len(poradi))
vysledek.sort(key=lambda m: (poradi[m['kategorie']], m['dostupnost'] != 'skladem',
                             re.sub(r'\s[\d,]+(?: mm| ·).*', '', m['nazev']), m['tloustka'], m.get('formatD', m.get('delka'))))
for m in vysledek:
    if m['cena'] is None:
        del m['cena']

dnes = datetime.date.today().isoformat()
with open(VYSTUP, 'w') as f:
    f.write('window.Truhla = window.Truhla || {};\n\n')
    f.write(f'// Katalog materiálů Démos trade (www.demos-trade.cz), staženo {dnes}.\n')
    f.write('// Ceny v Kč bez DPH za kus (řezivo prodávané po m³ přepočteno na kus). Generovaný soubor – needitovat ručně.\n')
    f.write(f"window.Truhla.katalogDemos = {{ stazeno: '{dnes}', materialy: [\n")
    for m in vysledek:
        f.write('  ' + json.dumps(m, ensure_ascii=False) + ',\n')
    f.write(']};\n')

from collections import Counter
print(len(vysledek), 'materiálů')
for k, v in Counter(m['kategorie'] for m in vysledek).items():
    print(f'  {k}: {v}')
print('vynecháno:', json.dumps(vynechano, ensure_ascii=False, indent=1))
