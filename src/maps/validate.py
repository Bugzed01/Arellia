#!/usr/bin/env python3
"""Check the static atlas contract without third-party packages."""
from pathlib import Path
import json,math
root=Path(__file__).resolve().parents[2]
data=json.loads((root/'site/assets/arelia-map-data.json').read_text(encoding='utf-8'))
assert data['meta']['land_area_km2']==1000000
assert data['meta']['population']==100000000
assert data['meta']['kilometres_per_unit']>0
assert len(data['places'])>=15
ids=[p['id'] for p in data['places']]
assert len(ids)==len(set(ids))
assert {'vesone','occidian','orientale','katoru','estrel'} <= set(ids)
assert all(0<=p['x']<=data['meta']['extent']['width'] and 0<=p['y']<=data['meta']['extent']['height'] for p in data['places'])
assert all((root/'site/wiki'/p['wiki']/'index.html').exists() for p in data['places'])
road_network=set()
for road in data['roads']:
    assert all(p in ids for p in road['cities']), road['name']
    for a,b in zip(road['cities'],road['cities'][1:]):road_network.add(tuple(sorted((a,b))))
connected={'occidian'}
for _ in range(30):
    for a,b in road_network:
        if a in connected:connected.add(b)
        if b in connected:connected.add(a)
assert {'occidian','estrel','vesone','orientale','katoru'} <= connected,connected
# The mountain-fed main river must reach the western estuary near Occidian.
river=next(p for p in data['rivers'] if p['id']=='fleuve-central')['points']
assert river[0][1]<400 and river[-1][0]<300 and abs(river[-1][1]-751)<40
for name in ['arelia-terrain.webp','arelia-plan.webp','arelia-maps.css','arelia-maps.js']:
    assert (root/'site/assets'/name).stat().st_size>100
print(f"Carte valide : {len(data['places'])} lieux; {len(data['roads'])} corridors; {len(data['rivers'])} fleuves et affluents; 1 M km².")
