"""Arélia Maps: Vésone, a reproducible fictional organic city plan.

All geometry is in the invented, local Arélia XY reference system.
This is cartographic/worldbuilding design, NOT surveyed cadastral data.
No third-party runtime dependencies, compatible with GitHub Pages build.
"""
from __future__ import annotations
import json, math, random
from pathlib import Path

CENTER=(1110.,698.)
RX,RY=57.,44.
SEED=20261103
TAU=2*math.pi

def p(x,y):return [round(CENTER[0]+x,3),round(CENTER[1]+y,3)]
def curve(points):return [p(x,y) for x,y in points]
def ellipse(rx,ry,n=110,phase=0,begin=0,end=TAU):
    out=[]
    for i in range(n+1):
        a=begin+(end-begin)*i/n
        wobble=1+.024*math.sin(5*a+.4)+.015*math.sin(9*a+1.8)
        out.append(p(rx*math.cos(a)*wobble,ry*math.sin(a)*wobble))
    return out

def area(poly):return .5*sum(x*y2-x2*y for (x,y),(x2,y2) in zip(poly,poly[1:]+poly[:1]))
def centroid(poly):
    if not poly:return (0.,0.)
    a=area(poly)
    if abs(a)<1e-8:return (sum(x for x,y in poly)/len(poly),sum(y for x,y in poly)/len(poly))
    cx=sum((x+x2)*(x*y2-x2*y) for (x,y),(x2,y2) in zip(poly,poly[1:]+poly[:1]))/(6*a)
    cy=sum((y+y2)*(x*y2-x2*y) for (x,y),(x2,y2) in zip(poly,poly[1:]+poly[:1]))/(6*a)
    return cx,cy

def clip(poly,a,b,c):
    """Retain ax+by<=c; exact convex clipping, preserving street-cell adjacency."""
    if not poly:return []
    out=[];prev=poly[-1];pv=a*prev[0]+b*prev[1]-c
    for nxt in poly:
        nv=a*nxt[0]+b*nxt[1]-c
        if (pv<=0)!=(nv<=0):
            t=pv/(pv-nv)
            out.append((prev[0]+t*(nxt[0]-prev[0]),prev[1]+t*(nxt[1]-prev[1])))
        if nv<=0:out.append(nxt)
        prev,pv=nxt,nv
    return out

def inset(poly,scale):
    cx,cy=centroid(poly)
    return [(cx+(x-cx)*scale,cy+(y-cy)*scale) for x,y in poly]

def dsegment(pt,a,b):
    vx,vy=b[0]-a[0],b[1]-a[1]
    t=max(0.,min(1.,((pt[0]-a[0])*vx+(pt[1]-a[1])*vy)/(vx*vx+vy*vy+1e-8)))
    return math.hypot(pt[0]-(a[0]+vx*t),pt[1]-(a[1]+vy*t))

def near_path(pt,path,threshold):
    return any(dsegment(pt,a,b)<threshold for a,b in zip(path,path[1:]))

def crossing(a,b,c,d):
    ax,ay=a;bx,by=b;cx,cy=c;dx,dy=d
    r=(bx-ax,by-ay);s=(dx-cx,dy-cy);det=r[0]*s[1]-r[1]*s[0]
    if abs(det)<1e-8:return None
    u=((cx-ax)*s[1]-(cy-ay)*s[0])/det
    v=((cx-ax)*r[1]-(cy-ay)*r[0])/det
    if 0<=u<=1 and 0<=v<=1:return ax+u*r[0],ay+u*r[1],math.atan2(r[1],r[0])
    return None

def ring(rx,ry,start=0,end=TAU,n=90,phase=.3):
    pts=[]
    for i in range(n+1):
        a=start+(end-start)*i/n
        modulation=1+.065*math.sin(3*a+phase)+.035*math.cos(7*a+.4)
        pts.append((rx*modulation*math.cos(a),ry*modulation*math.sin(a)))
    return pts

def generate():
    rng=random.Random(SEED)
    # The waterways predate the roads; they determine the medieval urban silhouette.
    canals=[
      dict(id='grand-canal',name='Grand Canal Impérial',type='principal',width=2.8,points=curve([(-62,10),(-54,12),(-47,11),(-39,7),(-33,6),(-27,10),(-19,12),(-11,9),(-3,3),(5,0),(13,3),(21,8),(29,10),(39,7),(48,9),(63,13)])),
      dict(id='orelys',name='Canal d’Orélys',type='principal',width=2.25,points=curve([(-24,-52),(-23,-43),(-26,-35),(-27,-27),(-21,-19),(-22,-11),(-17,-3),(-19,11)])),
      dict(id='marchands',name='Canal des Marchands',type='secondaire',width=1.55,points=curve([(18,-46),(16,-36),(12,-27),(10,-18),(13,-9),(13,3),(8,13),(5,21),(7,37),(9,45)])),
      dict(id='jardins',name='Canal des Jardins',type='secondaire',width=1.3,points=curve([(-42,-11),(-34,-8),(-25,-10),(-17,-14),(-10,-13),(-3,-18),(7,-18),(16,-16),(25,-19),(37,-22),(48,-19)])),
      dict(id='quais',name='Canal des Quais',type='secondaire',width=1.6,points=curve([(-36,34),(-29,31),(-19,28),(-7,30),(3,33),(14,31),(25,34),(39,33),(52,29)])),
      dict(id='bassin-iles',name='Canal des Îlots',type='secondaire',width=1.3,points=curve([(-8,-9),(-4,-5),(2,-7),(10,-6),(18,-1),(20,7),(15,15),(8,17),(0,16),(-7,12),(-8,3),(-8,-9)])),
      dict(id='canal-delta',name='Bras du Levant',type='secondaire',width=1.95,points=curve([(28,10),(32,17),(39,21),(49,22),(60,25)])),
    ]
    districts=[
      dict(id='ile-palais',name='Île du Palais',center=p(7,5),color='#d7c4a3',description='Couronne monumentale, places historiques et canaux'),
      dict(id='vieux-canaux',name='Vieux-Canaux',center=p(-26,8),color='#e6d3b1',description='Ruelles anciennes et façades sur les quais'),
      dict(id='marchands',name='Quartier des Marchands',center=p(34,15),color='#dccab2',description='Halles, entrepôts réhabilités et bassins'),
      dict(id='jardins',name='Jardins d’Orélys',center=p(-13,-29),color='#b4c6ab',description='Jardins et promenades longeant l’eau'),
      dict(id='ambassades',name='Cité des Ambassades',center=p(30,-24),color='#decfb9',description='Grands hôtels et îlots institutionnels'),
      dict(id='rive-ouest',name='Rive Occidentale',center=p(-44,-7),color='#d9c8af',description='Faubourgs, universités et rues étroites'),
      dict(id='port-est',name='Quais de l’Est',center=p(43,30),color='#cdd7d2',description='Quais de commerce et liaisons maritimes'),
    ]
    outline=ellipse(RX,RY,120)
    bounds=[(-RX*math.cos(i*TAU/96),-RY*math.sin(i*TAU/96)) for i in range(96)]
    # A Poisson-like scatter creates an irregular tessellation, not a rectangular grid.
    seeds=[]
    for trial in range(32000):
        x=rng.uniform(-RX,RX); y=rng.uniform(-RY,RY)
        if (x/RX)**2+(y/RY)**2>.985:continue
        radius=math.hypot(x/60,y/48)
        min_dist=2.6 if radius<.29 else 3.25 if radius<.55 else 4.15 if radius<.79 else 5.3
        min_dist*=rng.uniform(.88,1.09)
        if all((x-x2)**2+(y-y2)**2>min_dist**2 for x2,y2 in seeds):seeds.append((x,y))
        if len(seeds)>=430:break
    # Convex Voronoi cells are clipped by the city's shoreline outline.
    cells=[]
    for i,(sx,sy) in enumerate(seeds):
        polygon=bounds[:]
        for j,(ox,oy) in enumerate(seeds):
            if i==j:continue
            vx,vy=ox-sx,oy-sy
            if vx*vx+vy*vy>28*28:continue
            polygon=clip(polygon,vx,vy,(ox*ox+oy*oy-sx*sx-sy*sy)/2)
            if len(polygon)<3:break
        if len(polygon)<3 or abs(area(polygon))<.35:continue
        cells.append((i,polygon))
    # Roads obey medieval topography: winding boulevards and non-concentric partial belts.
    streets=[]
    def street(ident,name,typ,pts):streets.append(dict(id=ident,name=name,**{'class':typ},points=curve(pts)))
    street('rives-ouest','Route des Rives','avenue',[(-61,-10),(-47,-16),(-36,-20),(-27,-16),(-16,-22),(-8,-28),(4,-32),(20,-33),(38,-32),(55,-22)])
    street('axe-palais','Promenade de la Charte','boulevard',[(-56,-2),(-43,-1),(-30,-3),(-16,-5),(-7,-1),(4,1),(16,-3),(29,-5),(41,-3),(56,0)])
    street('nord-ancien','Rue des Verriers','rue',[(-49,-29),(-40,-23),(-31,-24),(-24,-19),(-16,-20),(-11,-11),(-5,-13),(2,-11)])
    street('avenue-imperiale','Avenue Impériale','avenue',[(2,-48),(0,-39),(3,-30),(5,-22),(3,-13),(2,-3),(1,8),(1,23),(-1,35),(0,47)])
    street('ambassades','Boulevard des Ambassades','boulevard',[(30,-41),(32,-33),(27,-25),(34,-17),(37,-10),(36,-1),(41,7),(42,20),(46,37)])
    street('tisserands','Rue des Tisserands','rue',[(-45,25),(-38,20),(-29,19),(-25,22),(-16,18),(-10,23),(-3,20),(7,22),(15,26),(22,23),(29,27)])
    street('levants','Avenue du Levant','avenue',[(-52,31),(-41,26),(-29,27),(-16,33),(-4,35),(8,36),(25,38),(42,34),(55,31)])
    street('gare','Avenue de la Gare','boulevard',[(-24,47),(-21,36),(-16,29),(-14,21),(-9,11),(-4,0),(6,-9),(17,-16)])
    street('universite','Rue de l’Université','rue',[(-56,-31),(-44,-20),(-41,-12),(-39,-3),(-43,8),(-39,17),(-35,30)])
    street('quais','Boulevard des Quais','boulevard',[(49,-34),(53,-26),(50,-17),(52,-7),(52,4),(50,14),(50,25),(53,35)])
    for n,(name,rx,ry,first,last) in enumerate([
        ('Promenade des Anciens Remparts',20,15,.35,5.5),
        ('Ceinture des Faubourgs',39,30,2.2,8.1),
        ('Boulevard des Collines',50,37,4.2,9.4)]):
        street(f'courbe-{n}',name,'boulevard',ring(rx,ry,first,last,80,phase=n*.7))
    parks=[
        dict(name='Parc des Archives',polygon=curve([(-49,-27),(-41,-30),(-34,-34),(-38,-40),(-50,-35)])),
        dict(name='Jardins d’Orélys',polygon=curve([(-12,-35),(-1,-39),(7,-35),(10,-25),(0,-23),(-11,-26)])),
        dict(name='Jardins des Ambassades',polygon=curve([(28,-36),(39,-35),(46,-28),(41,-20),(32,-22),(26,-30)])),
        dict(name='Promenade des Tilleuls',polygon=curve([(34,29),(46,27),(51,34),(43,39),(35,38)])),
        dict(name='Esplanade du Palais',polygon=curve([(1,-7),(10,-9),(16,-4),(15,3),(8,5),(1,0)])),
        dict(name='Jardins des Archives',polygon=curve([(-29,22),(-20,19),(-16,27),(-22,34),(-31,30)])),
    ]
    def inpoly(pt,poly):
        x,y=pt;inside=False
        for (x1,y1),(x2,y2) in zip(poly,poly[1:]+poly[:1]):
            if (y1>y)!=(y2>y) and x<(x2-x1)*(y-y1)/(y2-y1)+x1:inside=not inside
        return inside
    squares=[
        dict(id='place-charte',name='Place de la Charte',polygon=curve([(-8,-4),(-2,-6),(3,-3),(4,2),(-2,5),(-7,1)]),kind='civic'),
        dict(id='place-halles',name='Place des Halles',polygon=curve([(23,16),(28,14),(32,18),(30,24),(25,24),(21,21)]),kind='market'),
        dict(id='parvis-gare',name='Parvis de la Gare',polygon=curve([(-14,28),(-8,26),(-3,31),(-5,35),(-13,35)]),kind='transport'),
        dict(id='place-marées',name='Place des Marées',polygon=curve([(-35,-1),(-29,-3),(-25,2),(-30,8),(-36,6)]),kind='historic'),
        dict(id='parvis-palais',name='Parvis impérial',polygon=curve([(7,-3),(15,-4),(17,1),(14,6),(8,6)]),kind='palace'),
    ]
    blocks=[];buildings=[];lanes=[]
    seen_edges=set()
    # A fine network of irregular alleys follows shared parcel boundaries.
    # This replaces the illusion of an orthogonal street grid in the old plan.
    for idx,poly in cells:
        for a,b in zip(poly,poly[1:]+poly[:1]):
            if math.hypot(b[0]-a[0],b[1]-a[1])<1.25:continue
            key=tuple(sorted(((round(a[0],1),round(a[1],1)),(round(b[0],1),round(b[1],1)))))
            if key in seen_edges:continue
            seen_edges.add(key)
            mid=p((a[0]+b[0])/2,(a[1]+b[1])/2)
            if any(near_path(mid,c['points'],c['width']*.85) for c in canals):continue
            if any(inpoly(mid,plaza['polygon']) for plaza in squares):continue
            lanes.append(dict(points=[p(*a),p(*b)],kind='ruelle' if a[0] < -7 else 'passage'))

    def road_axis(pt):
        # Align frontage and parcel splitting with the nearest established street.
        best=(1e30,1.,0.)
        for roadway in streets:
            for a,b in zip(roadway['points'],roadway['points'][1:]):
                dd=dsegment(pt,a,b)
                if dd < best[0]:
                    length=math.hypot(b[0]-a[0],b[1]-a[1]) or 1
                    best=(dd,(b[0]-a[0])/length,(b[1]-a[1])/length)
        return best
    
    for index,poly in cells:
        cx,cy=centroid(poly)
        mid=[p(cx,cy)[0],p(cx,cy)[1]]
        if any(inpoly(mid,pk['polygon']) for pk in parks):continue
        if any(inpoly(mid,sq['polygon']) for sq in squares):continue
        if any(near_path(mid,c['points'],c['width']*.9+.45) for c in canals):continue
        if math.hypot(cx,cy)<7:district='palatial'
        elif cx < -15 and abs(cy)<21:district='historical'
        elif cx>20 and cy<0:district='civic'
        elif cx>20 and cy>8:district='port'
        elif cx<5 and cy < -14:district='park-edge'
        elif math.hypot(cx/57,cy/44)>.73:district='residential'
        else:district='mixed'
        color={'historical':'#ddceb8','palatial':'#e0d1b6','civic':'#e2d7c1','port':'#d2c6b4',
               'residential':'#e6d9c6','park-edge':'#d9dbc5','mixed':'#e0d1bb'}[district]
        blocks.append(dict(id=f'block-{index:03d}',polygon=[p(x,y) for x,y in inset(poly,.975)],district=district,color=color))
        # Split true irregular parcels with bisectors. No fixed horizontal or vertical lattice.
        nplots=1 if abs(area(poly))<9 else 2 if abs(area(poly))<15 else 3 if abs(area(poly))<23 else 4
        near_distance,ux,uy=road_axis(p(cx,cy))
        if near_distance>11:
            e1,e2=max(zip(poly,poly[1:]+poly[:1]),key=lambda e:math.hypot(e[1][0]-e[0][0],e[1][1]-e[0][1]))
            tangent=math.hypot(e2[0]-e1[0],e2[1]-e1[1]) or 1
            ux,uy=(e2[0]-e1[0])/tangent,(e2[1]-e1[1])/tangent
        # Parcels are narrow along the street and deeper behind the facade.
        angle=math.atan2(uy,ux)+rng.uniform(-.08,.08)
        ux,uy=math.cos(angle),math.sin(angle)
        projections=[x*ux+y*uy for x,y in poly]
        lo,hi=min(projections),max(projections)
        for k in range(nplots):
            left=lo+(hi-lo)*k/nplots+.10
            right=lo+(hi-lo)*(k+1)/nplots-.10
            if right<=left:continue
            sub=clip(clip(poly,-ux,-uy,-left),ux,uy,right)
            if len(sub)<3 or abs(area(sub))<.40:continue
            sub=inset(sub,rng.uniform(.81,.92))
            scx,scy=centroid(sub)
            if any(inpoly(p(scx,scy),pk['polygon']) for pk in parks):continue
            if any(inpoly(p(scx,scy),sq['polygon']) for sq in squares):continue
            if any(near_path(p(scx,scy),c['points'],c['width']*.58+.35) for c in canals):continue
            palette={
                'historical':['#c9aa91','#d8b9a1','#e6d2ba','#c4a48c','#e2c7aa'],
                'palatial':['#e1d4bc','#cbbca0','#ddceb3'],
                'civic':['#c5bfb1','#d4cbbb','#b5b1a5'],
                'port':['#b1b5ab','#bdb6a8','#c9b9a3'],
                'residential':['#d5baa4','#dac5ac','#cbb6a3','#e5d4bd'],
                'park-edge':['#d3c6ab','#b9c0a4'],
                'mixed':['#cdb99e','#d9c4a8','#decdb2','#c1b6a5'],
            }
            roof=rng.choice(palette[district])
            buildings.append(dict(polygon=[p(x,y) for x,y in sub],roof=roof,landuse=district))
    # Narrow promenades follow both banks without concealing the actual canal.
    quays=[]
    for c in canals:
        pts=c['points']
        for sign in [-1,1]:
            shifted=[]
            for i,(x,y) in enumerate(pts):
                a=pts[max(0,i-1)];b=pts[min(len(pts)-1,i+1)]
                dx,dy=b[0]-a[0],b[1]-a[1];length=math.hypot(dx,dy) or 1
                offset=(c['width']*.5+.75)*sign
                shifted.append([round(x-dy/length*offset,3),round(y+dx/length*offset,3)])
            quays.append(dict(id=f"{c['id']}-{sign}",points=shifted,kind='promenade' if c['type']=='principal' else 'quai'))

    # Sparse planted boulevards and garden-edge trees.
    trees=[]
    for road in streets:
        if road['class'] not in ('avenue','boulevard'):continue
        for a,b in zip(road['points'],road['points'][1:]):
            dx,dy=b[0]-a[0],b[1]-a[1];length=math.hypot(dx,dy)
            if length<2:continue
            n=max(1,round(length/3.0))
            for k in range(n):
                t=(k+.5)/n
                for side in [-1,1]:
                    x=a[0]+dx*t-side*dy/length*1.65
                    y=a[1]+dy*t+side*dx/length*1.65
                    if ((x-CENTER[0])/RX)**2+((y-CENTER[1])/RY)**2>=.96:continue
                    if any(near_path([x,y],c['points'],c['width']*.55+.55) for c in canals):continue
                    if rng.random()>.78:trees.append([round(x,3),round(y,3)])

    landmarks=[
       dict(id='palais',name='Palais impérial',polygon=curve([(8,-1),(12,-2),(15,1),(13,4),(9,4),(7,1)]),kind='imperial'),
       dict(id='gare',name='Gare centrale',polygon=curve([(-14,30),(-10,29),(-8,33),(-12,35)]),kind='transport'),
       dict(id='halles',name='Halles des Marchands',polygon=curve([(25,17),(28,17),(29,21),(25,21)]),kind='market')
    ]
    # Bridge decks exactly at crossings between major streets and canal centrelines.
    cross=[]
    for street_item in streets:
        sp=street_item['points']
        for canal in canals:
            if canal['id']=='bassin-iles':continue
            cp=canal['points']
            for a,b in zip(sp,sp[1:]):
                for c,d in zip(cp,cp[1:]):
                    item=crossing(a,b,c,d)
                    if item and all(math.hypot(item[0]-z['x'],item[1]-z['y'])>3.3 for z in cross):
                        cross.append(dict(x=round(item[0],3),y=round(item[1],3),angle=round(item[2],5),
                                          span=canal['width']+1.5,width=1.30,canal=canal['id']))
    cross.sort(key=lambda q:(q['y'],q['x']))
    bridge_names=['Pont d’Orélys','Pont des Jardins','Pont des Verriers','Pont de la Charte','Pont des Marchands','Pont du Palais','Pont du Levant','Pont des Archives','Pont des Tisserands','Pont de la Gare','Pont du Marché','Pont des Quais','Passerelle des Ambassades','Pont des Marées','Pont du Forum','Pont des Halles']
    bridges=[]
    for idx,z in enumerate(cross[:25]):
        bridges.append(dict(id=f'bridge-{idx:02d}',name=bridge_names[idx%len(bridge_names)],type='Pont',category='pont',
                     description='Traversée située sur un croisement de voie et de canal (tracé proposé).',**z))
    sites=[
        ('palais','Palais impérial','monument',11,-1,'Île du Palais','Siège symbolique de la Couronne ; position proposée.'),
        ('forum','Forum de la Charte','monument',-1,1,'Île du Palais','Esplanade institutionnelle en conception.'),
        ('basilique','Basilique des Marées','monument',-31,4,'Vieux-Canaux','Monument historique imaginé dans les rues anciennes.'),
        ('archives','Archives impériales','monument',-17,-17,'Rive Occidentale','Bibliothèque et archives publiques de l’Empire.'),
        ('halles','Halles des Marchands','monument',27,20,'Quartier des Marchands','Marché couvert du débouché du Grand Canal.'),
        ('gare','Gare centrale de Vésone','transport',-8,31,'Vieux-Canaux','Gare à correspondances ferroviaires et fluviales.'),
        ('opera','Opéra des Canaux','monument',5,-21,'Cité des Ambassades','Équipement culturel et scène lyrique.'),
        ('universite','Université du Levant','monument',-43,-8,'Rive Occidentale','Campus urbain proche de l’ancienne rive.'),
        ('port','Port du Levant','transport',46,27,'Quais de l’Est','Bassins maritimes et quais commerciaux.'),
        ('serres','Serres d’Orélys','nature',-7,-30,'Jardins d’Orélys','Jardin botanique et promenade arborée.'),
        ('observatoire','Observatoire des Marées','monument',42,-13,'Cité des Ambassades','Institut de recherche du littoral.'),
    ]
    pois=[dict(id='v-'+ident,name=name,type=('Équipement de transport' if kind=='transport' else 'Jardin' if kind=='nature' else 'Monument'),category=kind,
               x=p(x,y)[0],y=p(x,y)[1],district=where,description=desc,wiki='vesone',status='Proposition — non canonique')
          for ident,name,kind,x,y,where,desc in sites]
    for d in districts:
        pois.append(dict(id='district-'+d['id'],name=d['name'],type='Quartier',category='quartier',x=d['center'][0],y=d['center'][1],
                         description=d['description'],district=d['name'],wiki='vesone',status='Proposition — non canonique'))
    for sq in squares:
        cx,cy=centroid(sq['polygon'])
        pois.append(dict(id=sq['id'],name=sq['name'],type='Place publique',category='monument',x=round(cx,3),y=round(cy,3),
                         district='Vésone',description='Espace public du plan urbain fictif, à confirmer.',wiki='vesone',status='Proposition — non canonique'))
    for b in bridges[:4]:
        pois.append(dict(id=b['id'],name=b['name'],type='Pont',category='pont',x=b['x'],y=b['y'],
                         description=b['description'],district='Vésone',wiki='vesone',status='Proposition — non canonique'))
    for road in streets:
        middle=road['points'][len(road['points'])//2]
        pois.append(dict(id='street-'+road['id'],name=road['name'],type='Voie urbaine',category='voie',
                         x=middle[0],y=middle[1],description='Voie structurante du plan urbain fictif.',district='Vésone',wiki='vesone',
                         status='Proposition — non canonique'))
    return {
        'meta':{'name':'Vésone — plan organique','version':'0.5.0','status':'provisoire','coordinate_system':'Arélia Maps XY',
                'center':list(CENTER),'bounds':[p(-RX,-RY),p(RX,RY)],'seed':SEED,
                'disclaimer':'Plan fictif de conception. La voirie et les bâtiments ne sont pas un cadastre.'},
        'outline':outline,'districts':districts,'streets':streets,'lanes':lanes,'canals':canals,'quays':quays,'bridges':bridges,'parks':parks,'squares':squares,'landmarks':landmarks,'trees':trees,'blocks':blocks,'buildings':buildings,'places':pois,
    }


def enrich_city(city):
    """Add the functional districts and transit skeleton to Vésone's v0.4 organic plan.

    This is a reproducible planning overlay, NOT a real cadastral or traffic dataset.
    All positions are expressed in local coordinates through `p()`.
    """
    zone_specs=[
      ('vieille-ville','Centre historique','patrimoine','#c7ad93',
       [(-43,-16),(-34,-23),(-20,-25),(-11,-17),(-10,-3),(-17,12),(-28,23),(-43,17),(-49,1)],
       'Ruelles et tissus anciens, quais et patrimoine historique.'),
      ('couronne-imperiale','Cité impériale','institutions','#e2c9a6',
       [(-9,-13),(3,-16),(17,-10),(24,3),(16,19),(2,22),(-12,10)],
       'Monuments institutionnels, parvis et grands jardins.'),
      ('nord-jardins','Jardins et universités','espaces-verts','#aed0b0',
       [(-35,-42),(-10,-43),(12,-40),(16,-27),(6,-18),(-9,-21),(-30,-23)],
       'Campus, avenues plantées et grand parc de promenade.'),
      ('affaires-nord','Quartier des affaires','activites','#b7c7c8',
       [(14,-38),(35,-40),(49,-30),(51,-9),(35,-8),(21,-16)],
       'Quartiers modernes, services et bureaux, réseau de transports structurant.'),
      ('marchands','Faubourgs marchands','mixte','#d6bfa9',
       [(20,10),(35,3),(54,8),(53,28),(33,32),(21,22)],
       'Marchés, rues commerciales et habitat dense en bord de canaux.'),
      ('port-levant','Port et docks du Levant','port','#a8bac0',
       [(31,20),(43,16),(53,23),(51,35),(39,39),(28,32)],
       'Entrepôts, terminaux portuaires et activités logistiques.'),
      ('faubourgs-sud','Faubourgs résidentiels','habitat','#dfc9b2',
       [(-47,11),(-30,27),(-12,23),(9,29),(21,35),(3,42),(-28,41),(-48,29)],
       'Quartiers résidentiels de densité progressive et services de proximité.'),
    ]
    zones=[{'id':key,'name':name,'type':kind,'color':color,'polygon':curve(pts),'description':description}
           for key,name,kind,color,pts,description in zone_specs]
    def inside(point,polygon):
        x,y=point;ok=False
        for (x1,y1),(x2,y2) in zip(polygon,polygon[1:]+polygon[:1]):
            if (y1>y)!=(y2>y) and x<(x2-x1)*(y-y1)/(y2-y1)+x1:ok=not ok
        return ok
    def classify(point):
        for zone in zones:
            if inside(point,zone['polygon']):return zone['id']
        return 'peripherie'
    zone_palette={
        'vieille-ville':['#cbb49b','#c2a88b','#dfc7ac','#d0ad96'],
        'couronne-imperiale':['#ede0c8','#d6c2a2','#d9c9b4'],
        'nord-jardins':['#d4d4bd','#b8c6b2','#d3cead'],
        'affaires-nord':['#bac5c7','#a8b7bb','#cfd3c8'],
        'marchands':['#d3bca4','#bcb6aa','#cfb3a0'],
        'port-levant':['#aebdb9','#aab2b3','#bcc5be'],
        'faubourgs-sud':['#dbc7b1','#d5bba7','#ddcebb'],
        'peripherie':['#d8c8ae','#d1c5ac'],
    }
    block_zone={}
    for block in city['blocks']:
        x,y=centroid(block['polygon']);z=classify((x,y))
        block['zone']=z;block_zone[block['id']]=z
        # Subtle color shift by function instead of universal ivory polygons.
        block['color']={'vieille-ville':'#d6c2aa','couronne-imperiale':'#eadbc1','nord-jardins':'#cbd7bd',
                        'affaires-nord':'#c8d2d0','marchands':'#d9c5b3','port-levant':'#bfcac6',
                        'faubourgs-sud':'#ddcbb7','peripherie':'#e2d6c1'}[z]
    distribution={key:0 for key in zone_palette}
    for i,building in enumerate(city['buildings']):
        x,y=centroid(building['polygon']);z=classify((x,y))
        building['zone']=z;building['roof']=zone_palette[z][(i*17+7)%len(zone_palette[z])]
        building['height_class']= ('monumental' if z=='couronne-imperiale' else 'highrise' if z=='affaires-nord' and (i%3!=0) else 'warehouse' if z=='port-levant' else 'lowrise' if z=='vieille-ville' else 'midrise')
        distribution[z]+=1
    city['urban_zones']=zones
    city['landuse_stats']=distribution
    # Routes are conceptual trunk networks: never presented as surveyed streets.
    city['expressways']=[
      dict(id='contournement-sud',name='Rocade méridionale',kind='rocade',points=curve([(-52,23),(-43,32),(-27,38),(-11,40),(9,41),(26,39),(41,35),(50,28)])),
      dict(id='liaison-nord',name='Axe des Hautes-Rives',kind='radiale',points=curve([(-49,-26),(-39,-36),(-21,-40),(-2,-39),(17,-38),(37,-33),(49,-26)])),
    ]
    city['transit_lines']=[
      dict(id='M1',name='Métro des Rives',kind='metro',color='#a46b39',points=curve([(-47,-12),(-37,-12),(-29,-7),(-17,-3),(-7,1),(8,4),(21,6),(33,12),(45,19)])),
      dict(id='M2',name='Métro Impérial',kind='metro',color='#648b70',points=curve([(-21,-39),(-19,-28),(-12,-17),(-3,-7),(6,3),(10,17),(9,30),(12,40)])),
      dict(id='T1',name='Tram des Jardins',kind='tram',color='#687fad',points=curve([(-50,21),(-39,18),(-30,20),(-22,27),(-13,29),(-4,30),(11,31),(27,34),(39,32)])),
      dict(id='R1',name='Réseau express du Levant',kind='rail',color='#626d7e',points=curve([(-52,35),(-39,34),(-25,30),(-10,31),(5,32),(20,32),(35,33),(48,31)])),
    ]
    station_specs=[
      ('station-rive','Rive Occidentale',-39,-12,'M1'),
      ('station-archives','Archives',-18,-3,'M1'),
      ('station-charte','Forum de la Charte',0,2,'M1 / M2'),
      ('station-marchands','Halles des Marchands',33,12,'M1'),
      ('station-nord','Jardins d’Orélys',-19,-28,'M2'),
      ('station-palais','Palais impérial',8,7,'M2'),
      ('station-gare','Gare centrale',-10,31,'R1 / T1'),
      ('station-quais','Port du Levant',38,32,'R1 / T1'),
      ('station-faubourgs','Faubourgs du Sud',-39,18,'T1'),
      ('station-boulevards','Boulevard des Jardins',10,31,'T1'),
    ]
    stations=[]
    for sid,name,x,y,lines in station_specs:
        station={'id':sid,'name':name,'x':p(x,y)[0],'y':p(x,y)[1],'lines':lines,'type':'Station','category':'transport','wiki':'vesone',
                 'district':'Vésone','description':'Station proposée du réseau métropolitain fictif.','status':'Proposition — non canonique'}
        stations.append(station)
        city['places'].append(station.copy())
    city['stations']=stations
    # Basin polygons emphasize water-facing functions at the eastern fringe.
    city['harbour_basins']=[
      dict(name='Bassin du Levant',polygon=curve([(37,19),(42,19),(44,23),(42,26),(38,25)])),
      dict(name='Bassin des Chantiers',polygon=curve([(44,26),(48,25),(49,29),(46,31),(43,29)])),
    ]
    city['meta']['version']='0.5.0'
    city['meta']['disclaimer']='Structure urbaine fictive et provisoire. Les quartiers, transports, bâtiments et itinéraires sont schématiques.'
    return city


def write_city(destination):
    destination=Path(destination)
    destination.parent.mkdir(parents=True,exist_ok=True)
    result=enrich_city(generate())
    destination.write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
    return result

if __name__=='__main__':
    result=write_city(Path(__file__).resolve().parents[2]/'site/assets/vesone-city.json')
    print('Vésone :',len(result['blocks']),'îlots',len(result['buildings']),'bâtiments',len(result['streets']),'axes',len(result['bridges']),'ponts',len(result['places']),'lieux')
