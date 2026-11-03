"""Plan urbain reproductible et provisoire de Vésone, en coordonnées fictives d'Arélia Maps.

Ne pas confondre ces données avec un véritable cadastre ou un réseau viaire validé.
Aucune dépendance externe ; appelé lors de chaque génération du portail.
"""
from __future__ import annotations
import json
import math
from pathlib import Path

CENTER = (1110, 698)
RX, RY = 57, 44

def p(x, y):
    return [round(CENTER[0]+x, 2), round(CENTER[1]+y, 2)]

def loop(rx, ry, offset=0, start=0, finish=2*math.pi, count=80):
    return [p(rx*math.cos(start+(finish-start)*i/count)+1.1*math.sin(3*(start+(finish-start)*i/count)+offset),
              ry*math.sin(start+(finish-start)*i/count)+0.7*math.cos(2*(start+(finish-start)*i/count))+offset)
            for i in range(count+1)]

def generate():
    canals = [
        {'id':'grand-canal','name':'Grand Canal Impérial','type':'principal','width':7.2,
         'points':[p(*v) for v in [(-59,18),(-47,14),(-37,10),(-28,13),(-16,9),(-4,5),(8,3),(19,7),(32,8),(44,13),(60,13)]]},
        {'id':'canal-orelys','name':'Canal d’Orélys','type':'principal','width':5.2,
         'points':[p(*v) for v in [(-23,-49),(-23,-38),(-19,-29),(-21,-20),(-17,-9),(-12,0),(-16,9)]]},
        {'id':'canal-marchands','name':'Canal des Marchands','type':'secondaire','width':3.2,
         'points':[p(*v) for v in [(9,-35),(7,-22),(10,-10),(8,3),(3,17),(5,37)]]},
        {'id':'canal-jardins','name':'Canal des Jardins','type':'secondaire','width':2.7,
         'points':[p(*v) for v in [(-37,-9),(-27,-6),(-19,-8),(-6,-15),(9,-17),(26,-14),(39,-9)]]},
        {'id':'canal-quais','name':'Canal des Quais','type':'secondaire','width':3.0,
         'points':[p(*v) for v in [(-32,33),(-20,28),(-5,27),(11,28),(25,32),(39,30)]]},
        {'id':'canal-palais','name':'Canal du Palais','type':'secondaire','width':2.9,
         'points':[p(*v) for v in [(19,-29),(22,-18),(28,-7),(31,9),(29,23)]]},
        {'id':'ceinture-eau','name':'Ceinture des Îles','type':'secondaire','width':2.6,
         'points':loop(29,22,0,0,2*math.pi,80)},
    ]
    districts = [
        {'id':'ile-palais','name':'Île du Palais','center':p(8,3),'color':'#ddc9a4', 'description':'Cœur monumental et institutionnel, parcouru de ponts et de places.'},
        {'id':'vieux-canaux','name':'Vieux-Canaux','center':p(-19,8),'color':'#e7d7b6','description':'Ruelles, quais historiques et petits canaux du vieux centre.'},
        {'id':'marchands','name':'Quartier des Marchands','center':p(27,17),'color':'#dfc6a8','description':'Halles, marchés et quais commerciaux.'},
        {'id':'jardins','name':'Jardins d’Orélys','center':p(-14,-28),'color':'#cbd9bd','description':'Promenades plantées le long du canal d’Orélys.'},
        {'id':'ambassades','name':'Cité des Ambassades','center':p(28,-22),'color':'#e5d3ba','description':'Institutions diplomatiques et boulevards arborés.'},
        {'id':'rive-ouest','name':'Rive Occidentale','center':p(-42,-7),'color':'#e3cfaf','description':'Quartier résidentiel et universitaire sur la rive occidentale.'},
        {'id':'port-est','name':'Quais de l’Est','center':p(42,27),'color':'#d2d9d0','description':'Bassins portuaires et accès maritimes de la capitale.'},
    ]
    streets=[]
    # Une trame dense avec inflexions : les tronçons ne revendiquent aucune précision cadastrale.
    for j in range(-8,9):
        yy=j*5.0
        max_x=RX*math.sqrt(max(.01,1-(yy/RY)**2))
        if max_x<11:continue
        pts=[]
        for i in range(17):
            xx=-max_x+(2*max_x)*i/16
            pts.append(p(xx,yy+0.62*math.sin((xx+23)/11+j*.8)))
        streets.append({'id':f'rue-lat-{j+8:02d}',
                        'name':{0:'Boulevard de la Concorde',-4:'Rue des Verriers',3:'Rue des Tisserands',6:'Avenue des Jardins',-7:'Promenade des Platanes'}.get(j,f'Rue transversale {j+9:02d}'),
                        'class':'boulevard' if j in (0,-4,6) else 'rue','points':pts})
    for i in range(-11,12):
        xx=i*4.8
        max_y=RY*math.sqrt(max(.01,1-(xx/RX)**2))
        if max_y<9:continue
        pts=[]
        for j in range(15):
            yy=-max_y+(2*max_y)*j/14
            pts.append(p(xx+0.65*math.sin((yy+41)/9+i*.7),yy))
        streets.append({'id':f'rue-long-{i+11:02d}',
                        'name':{0:'Avenue Impériale',-5:'Rue des Archives',5:'Boulevard des Ambassades',-9:'Rue de la Rive'}.get(i,f'Rue longitudinale {i+12:02d}'),
                        'class':'avenue' if i in (0,-5,5) else 'rue','points':pts})
    for i,(name,angles) in enumerate([
        ('Avenue du Palais',(-160,17)),('Avenue de l’Est',(-17,162)),('Avenue du Nord',(-87,92)),
        ('Avenue de la Charte',(-139,41)),('Promenade des Quais',(-44,136))]):
        a,b=angles
        pts=[]
        for k in range(18):
            t=k/17
            ang=math.radians(a+(b-a)*t)
            radius=7+47*t
            pts.append(p(radius*math.cos(ang),radius*.77*math.sin(ang)))
        streets.append({'id':f'avenue-{i}','name':name,'class':'avenue','points':pts})
    for idx,(name,radius) in enumerate([('Boulevard intérieur',15),('Boulevard des Îles',34),('Périphérique vert',49)]):
        streets.append({'id':f'anneau-{idx}','name':name,'class':'boulevard','points':loop(radius,radius*.74,0,0,2*math.pi,90)})
    bridges=[
        ('Pont de la Charte',-31,11,'pont-monument'),('Pont des Verriers',-22,11,'pont'),('Pont des Lettres',-11,8,'pont'),
        ('Pont du Palais',6,3,'pont-monument'),('Pont des Marchands',21,7,'pont'),('Pont des Quais',38,11,'pont'),
        ('Pont du Levant',48,14,'pont'),('Pont d’Orélys',-21,-25,'pont'),('Pont des Jardins',-20,-9,'pont'),
        ('Pont de la Concorde',7,-12,'pont'),('Pont de la Gare',9,17,'pont'),('Pont des Tisserands',27,24,'pont'),
        ('Passerelle des Archives',28,-5,'passerelle'),('Passerelle de l’Îlot',-1,26,'passerelle')]
    bridges=[{'id':f'bridge-{i:02d}','name':name,'x':p(x,y)[0],'y':p(x,y)[1],
              'type':typ,'category':'pont','description':'Ouvrage de franchissement des canaux de Vésone (tracé provisoire).'}
             for i,(name,x,y,typ) in enumerate(bridges)]
    parks=[
        {'name':'Parc des Archives','polygon':[p(-47,-22),p(-30,-24),p(-28,-35),p(-44,-37)]},
        {'name':'Jardins du Canal','polygon':[p(-5,-33),p(9,-36),p(14,-27),p(0,-23)]},
        {'name':'Parc des Ambassades','polygon':[p(32,-31),p(45,-29),p(46,-17),p(33,-17)]},
        {'name':'Square du Levant','polygon':[p(34,27),p(46,27),p(45,35),p(33,36)]},
        {'name':'Jardins du Palais','polygon':[p(2,-5),p(15,-6),p(17,0),p(5,2)]},
    ]
    sites=[
        ('palais','Palais impérial','monument',11,-1,'Île du Palais','Siège symbolique de la Couronne ; dénomination et emplacement proposés.'),
        ('forum','Forum de la Charte','monument',-1,1,'Île du Palais','Grande place de rassemblement institutionnel, en conception.'),
        ('cathedrale','Basilique des Marées','monument',-29,5,'Vieux-Canaux','Monument historique proposé dans le vieux centre.'),
        ('archives','Archives impériales','monument',-18,-17,'Rive Occidentale','Bibliothèque et archives de l’Empire, en conception.'),
        ('halles','Halles des Marchands','monument',24,20,'Quartier des Marchands','Marchés couverts au débouché du Grand Canal.'),
        ('gare','Gare centrale de Vésone','transport',-8,31,'Vieux-Canaux','Pôle ferroviaire et fluvial de la capitale, à confirmer.'),
        ('opera','Opéra des Canaux','monument',7,-20,'Cité des Ambassades','Équipement culturel imaginaire, emplacement proposé.'),
        ('universite','Université du Levant','monument',-42,-8,'Rive Occidentale','Campus urbain de la rive occidentale, en conception.'),
        ('port','Port du Levant','transport',43,25,'Quais de l’Est','Bassins et quais reliant Vésone aux autres ports de l’île.'),
        ('serres','Serres d’Orélys','nature',-8,-31,'Jardins d’Orélys','Jardin botanique et promenades à proximité des canaux.'),
        ('observatoire','Observatoire des Marées','monument',40,-13,'Cité des Ambassades','Institut d’étude des courants et du littoral, proposé.'),
    ]
    pois=[{'id':'v-'+ident,'name':name,'type':('Équipement de transport' if typ=='transport' else 'Jardin' if typ=='nature' else 'Monument et patrimoine'),
          'category':typ,'x':p(x,y)[0],'y':p(x,y)[1], 'district':district,
          'description':desc,'wiki':'vesone','status':'Proposition — non canonique'}
         for ident,name,typ,x,y,district,desc in sites]
    for dist in districts:
        pois.append({'id':'district-'+dist['id'],'name':dist['name'],'type':'Quartier','category':'quartier',
                     'x':dist['center'][0],'y':dist['center'][1],'description':dist['description'],
                     'district':dist['name'],'wiki':'vesone','status':'Proposition — non canonique'})
    for b in bridges:
        if b['type']=='pont-monument':
            pois.append({**b,'type':'Pont','district':'Vésone','wiki':'vesone','status':'Proposition — non canonique'})
    data={
        'meta':{'name':'Plan de Vésone','version':'0.2.0','status':'provisoire','coordinate_system':'Arélia Maps XY','center':list(CENTER),
                'bounds':[p(-RX,-RY),p(RX,RY)],'disclaimer':'Tracé urbain illustratif. Les rues, monuments et ponts ne constituent pas un cadastre ni un canon définitivement établi.'},
        'districts':districts,'streets':streets,'canals':canals,'bridges':bridges,'parks':parks,'places':pois,
    }
    return data

def write_city(destination):
    destination=Path(destination)
    destination.parent.mkdir(parents=True,exist_ok=True)
    data=generate()
    destination.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    return data

if __name__=='__main__':
    r=write_city(Path(__file__).resolve().parents[2]/'site/assets/vesone-city.json')
    print('Vésone :',len(r['districts']),'quartiers,',len(r['streets']),'rues,',len(r['bridges']),'ponts,',len(r['places']),'fiches')
