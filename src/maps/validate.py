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
city=json.loads((root/'site/assets/vesone-city.json').read_text(encoding='utf-8'))
assert city['meta']['name']=='Vésone — plan organique'
assert city['meta']['status']=='provisoire'
assert len(city['districts'])>=5 and len(city['streets'])>=10 and len(city['canals'])>=5 and len(city['bridges'])>=10
city_ids=[p['id'] for p in city['places']]
assert len(city_ids)==len(set(city_ids))
minpos,maxpos=city['meta']['bounds']
for item in city['places']+city['bridges']:
    if item.get('category')=='ville-satellite':
        assert 0<=item['x']<=1500 and 0<=item['y']<=1400,item
    else:
        assert minpos[0]<=item['x']<=maxpos[0] and minpos[1]<=item['y']<=maxpos[1],item
for collection in ['streets','canals']:
    for item in city[collection]:
        assert len(item['points'])>=2,item
        assert all(minpos[0]-6<=x<=maxpos[0]+6 and minpos[1]-8<=y<=maxpos[1]+8 for x,y in item['points']),item['name']
assert (root/'site/wiki/vesone/index.html').exists()
assert 'href="../../atlas/?vue=vesone"' in (root/'site/wiki/vesone/index.html').read_text()
for name in ['arelia-terrain.webp','arelia-plan.webp','arelia-maps.css','arelia-maps.js','vesone-city.json']:
    assert (root/'site/assets'/name).stat().st_size>100
print(f"Carte valide : {len(data['places'])} lieux, {len(city['places'])} lieux urbains, {len(city['streets'])} rues, {len(city['canals'])} canaux, {len(city['bridges'])} ponts; 1 M km².")

# Organic urban atlas v0.3
assert city['meta']['version']=='0.6.0'
assert len(city['blocks'])>=200 and len(city['buildings'])>=600
assert len(city['streets'])>=10 and len(city['canals'])>=5 and len(city['bridges'])>=10
assert not any(s['id'].startswith(('rue-lat','rue-long')) for s in city['streets'])

assert len(city['lanes'])>=500 and len(city['quays'])==2*len(city['canals'])
assert len(city['squares'])==5 and len(city['trees'])>=80 and len(city['landmarks'])==3

# v0.5: functional zones and public-transit overlays.
assert len(city['urban_zones'])==7
assert len(city['transit_lines'])>=4 and len(city['stations'])>=10
assert len(city['expressways'])>=2 and len(city['harbour_basins'])>=2
assert sum(city['landuse_stats'].values())==len(city['buildings'])
assert all(b['height_class'] in {'lowrise','midrise','highrise','warehouse','monumental'} for b in city['buildings'])
assert all(s['id'] in city_ids for s in city['stations'])
assert all(len(r['points'])>=3 for r in city['transit_lines']+city['expressways'])

# V0.6: satellite centres, regional roads and express rail links.
metro=city['metropolitan']
assert metro['version']=='0.6.0'
assert len(metro['satellites'])==7
assert len(metro['neighborhoods'])>=140
assert len(metro['green_corridors'])>=4
assert len(metro['regional_rail'])>=4 and len(metro['roads'])>=8
assert len([p for p in city['places'] if p['category']=='ville-satellite'])==7
assert all(s['id'] in {p['id'].removeprefix('sat-') for p in city['places']} for s in metro['satellites'])
assert all(0<=s['x']<=1500 and 0<=s['y']<=1400 for s in metro['satellites'])
assert len(set(p['id'] for p in city['places']))==len(city['places'])
assert all(len(line['points'])>=4 for line in metro['regional_rail']+metro['roads'])
assert (root/'src/maps/metro_overlay.json').exists()
print('Grand Vésone :',len(metro['satellites']),'villes satellites,',len(metro['roads']),'axes métropolitains,',len(metro['regional_rail']),'liaisons express.')
