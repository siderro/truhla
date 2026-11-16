#!/bin/sh
# Znovu stáhne katalog Démos trade a přegeneruje js/katalog-demos.js.
set -e
cd "$(dirname "$0")/.."
D=$(mktemp -d)
for c in sparovky preklizky-truhlarske preklizky-vodevzdorne-surove mdf-surove drevotrisky-surove hdf-surove-a-sololit masivni deskove-plosne latovky-dyhovane biodesky; do
  python3 -I nastroje/scrape.py "$c" 20 > "$D/$c.json"
done
# lamino: jen skladem, 18 mm, 2800×2070
python3 -I nastroje/scrape.py dtd-laminovane 40 '&product_filter_form%5BavailabilitiesData%5D%5B%5D=3&product_filter_form%5Bparameters%5D%5B52%5D%5B%5D=51&product_filter_form%5Bparameters%5D%5B96%5D%5B%5D=21' > "$D/dtd-laminovane.json"
python3 -I nastroje/generuj.py "$D" js/katalog-demos.js
