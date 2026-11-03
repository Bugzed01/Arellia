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
    if item.get('category') in ('ville-satellite','gare-metropolitaine'):
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
assert city['meta']['version']=='1.0.0'
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
assert metro['version']=='1.0.0'
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

# V0.7 — topological linkage and station alignment.
assert len(metro['road_connections'])==7
assert len(metro['local_streets'])>=45 and len(metro['fabric_parcels'])>=200
assert len(metro['landuse_patches'])==7
assert len(metro['rail_stations'])==8
assert len([p for p in city['places'] if p['category']=='gare-metropolitaine'])==8
roads_by_id={r['id']:r for r in city['streets']}
for connection in metro['road_connections']:
    assert connection['urban_street_id'] in roads_by_id
    assert connection['urban_vertex'] in roads_by_id[connection['urban_street_id']]['points']
    road=next(r for r in metro['roads'] if r['id']==connection['road_id'])
    assert road['points'][0]==connection['urban_vertex']
for station in metro['rail_stations']:
    assert station['id'] in city_ids
    assert all(any([station['x'],station['y']]==point for point in r['points'])
               for r in metro['regional_rail'] if r['id'] in station['lines'])
print('Grand Vésone v0.7 : raccordements, gares alignées et tissus suburbains validés.')

# v0.8 : le calcul routier partage les axes nationaux métriques sans prétendre à la navigation réelle.
assert metro['version']==city['meta']['version']
assert (root/'site/assets/arelia-routing.js').is_file()
assert (root/'src/maps/route_validate.cjs').is_file()

# V0.9 — topography is relative, streams must connect and road crossings must be geometric.
terrain=metro['terrain']
assert terrain['version']=='0.9.0'
grid=terrain['grid']
assert grid['cols']>=40 and grid['rows']>=30
assert len(grid['values'])==grid['cols']*grid['rows']
assert all(isinstance(e,(float,int)) and math.isfinite(e) and 0<=e<=100 for e in grid['values'])
assert max(grid['values'])-min(grid['values'])>30
assert len(terrain['contours'])>=6
assert len(terrain['waterways'])==5 and len(terrain['connections'])==5
assert len(terrain['lowlands'])==5 and len(terrain['crossings'])>=5
left,top=grid['origin']
right=left+grid['step']*(grid['cols']-1)
bottom=top+grid['step']*(grid['rows']-1)
for contour in terrain['contours']:
    assert contour['segments']
    for seg in contour['segments']:
        assert len(seg)==2
        assert all(left-.01<=x<=right+.01 and top-.01<=y<=bottom+.01 for x,y in seg)
streams={s['id']:s for s in terrain['waterways']}
channels={s['id']:s for s in city['canals']}
for stream in streams.values():
    assert len(stream['points'])>=4
    assert all(left<=x<=right and top<=y<=bottom for x,y in stream['points'])
for connector in terrain['connections']:
    source=streams[connector['stream_id']]
    target=streams.get(connector['target_id']) or channels.get(connector['target_id'])
    assert target is not None
    assert any(x in target['points'] for x in [source['points'][0],source['points'][-1]])
def dist_segment(point,a,b):
    ux,uy=b[0]-a[0],b[1]-a[1]
    q=ux*ux+uy*uy
    t=max(0,min(1,((point[0]-a[0])*ux+(point[1]-a[1])*uy)/q)) if q else 0
    return math.hypot(point[0]-a[0]-t*ux,point[1]-a[1]-t*uy)
def dist_path(point,vertices):
    return min(dist_segment(point,a,b) for a,b in zip(vertices,vertices[1:]))
roads={r['id']:r for r in metro['roads']}
for bridge in terrain['crossings']:
    point=(bridge['x'],bridge['y'])
    assert bridge['road_id'] in roads
    assert bridge['waterway_id'] in streams
    assert dist_path(point,roads[bridge['road_id']]['points'])<.015
    assert dist_path(point,streams[bridge['waterway_id']]['points'])<.015
    assert bridge['kind']=='franchissement-indicatif'
assert 'PAS une carte d’inondation' in terrain['disclaimer']
print('Relief relatif et hydrographie v0.9 :',len(terrain['waterways']),'cours d’eau,',len(terrain['crossings']),'franchissements.')

# V1.0 — no generated building footprint may occupy a generated canal corridor.
assert city['water_clearance']['excluded_buildings']>0
assert city['water_clearance']['after']==len(city['buildings'])
assert len(city['buildings'])>=600
for building in city['buildings']:
    poly=building['polygon']
    for canal in city['canals']:
        for a,b in zip(canal['points'],canal['points'][1:]):
            radius=canal['width']*.5+.1
            assert all(dist_segment(q,a,b)>=radius-1e-8 for q in poly)
            for c,d in zip(poly,poly[1:]+poly[:1]):
                assert dist_segment(a,c,d)>=radius-1e-8
                assert dist_segment(b,c,d)>=radius-1e-8
print('Vésone 1.0 :',city['water_clearance']['excluded_buildings'],'bâtiments écartés des canaux.')
