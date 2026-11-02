#!/usr/bin/env python3
"""Deterministic cartographic basis for the fictional Empire of Arélia.
The coordinates are a local, synthetic plane: north is top, units are abstract
until normalized to the 1,000,000 km² canonical land area.
"""
from pathlib import Path
import json, math
import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import gaussian_filter, distance_transform_edt
from shapely.geometry import Polygon

ROOT=Path(__file__).resolve().parents[2]
DEST=ROOT/'site'/'assets'
DEST.mkdir(parents=True,exist_ok=True)
W,H=1500,1400
rng=np.random.default_rng(210911)
anchors=np.array([(610,104),(678,153),(747,100),(806,126),(891,120),(972,163),(1066,200),(1113,270),(1078,328),(1185,345),(1158,413),(1280,472),(1245,543),(1360,604),(1299,675),(1378,735),(1302,810),(1362,879),(1282,928),(1266,999),(1181,1020),(1208,1111),(1128,1132),(1073,1210),(951,1253),(869,1234),(779,1294),(701,1235),(613,1234),(543,1166),(448,1161),(368,1098),(313,1009),(232,980),(254,899),(184,844),(220,756),(197,685),(258,629),(235,550),(290,504),(245,450),(308,404),(284,331),(359,294),(422,256),(449,191),(533,201),(573,136)],dtype=float)

def coast_points(a):
    pts=[];n=len(a)
    for i in range(n):
        p=a[i]; q=a[(i+1)%n]; prev=a[(i-1)%n]; following=a[(i+2)%n]
        nseg=max(4,int(np.linalg.norm(q-p)/8))
        for j in range(nseg):
            t=j/nseg
            # Centripetal-ish Catmull–Rom for a smooth coastline interrupted by bays.
            z=.5*((2*p)+(-prev+q)*t+(2*prev-5*p+4*q-following)*t*t+(-prev+3*p-3*q+following)*t*t*t)
            tangent=(q-p);norm=np.array([tangent[1],-tangent[0]])/(np.linalg.norm(tangent)+1e-8)
            jag=(6*np.sin(i*3.27+t*22.0)+3*np.sin(i*9.4+t*48)+1.9*np.sin(i*5.5+t*91))*math.sin(math.pi*t)
            z+=norm*jag
            pts.append((float(z[0]),float(z[1])))
    return pts
coast=coast_points(anchors)
main_polygon=Polygon(coast)
main_area=main_polygon.area
km_per_unit=math.sqrt(1000000/main_area)
# Several offshore archipelagos: illustrative, not counted in canonical continental area.
islands=[[(1350,488),(1377,477),(1404,495),(1391,523),(1366,524)],[(1385,537),(1400,527),(1426,550),(1411,570),(1394,559)],[(1203,1193),(1228,1175),(1247,1196),(1234,1220)],[(1259,1179),(1281,1163),(1294,1192),(1277,1208)],[(300,312),(315,292),(339,307),(331,330)],[(273,274),(285,261),(302,275),(290,290)],[(325,1038),(341,1023),(354,1041),(339,1054)]]

city_data=[
 ('vesone','Vésone','Capitale impériale',1110,698, 'vesone','capitale','Réseau de canaux, ponts et institutions impériales.','10.6 M · aire métropolitaine fictive'),
 ('occidian','Occidian','Métropole occidentale',266,751,'occidian','metropole','Estuaire du grand fleuve central et porte maritime de l’Ouest.','8.9 M · aire métropolitaine fictive'),
 ('orientale','Orientale','Métropole méridionale',966,1094,'orientale','metropole','Grand port du Sud, à la bordure du désert de Solmar.','9.4 M · aire métropolitaine fictive'),
 ('katoru','Katoru','Métropole nordique',493,338,'katoru','metropole','Métropole des mers froides et des hautes terres.','5.3 M · aire métropolitaine fictive'),
 ('estrel','Estrel','Cité centrale',747,739,'estrel','ville','Carrefour des plaines et de la vallée fluviale.','3.1 M · aire métropolitaine fictive'),
 ('namiya','Namiya','Ville littorale',1208,917,'littoral-est','ville','Port secondaire sur la côte orientale.','Population à déterminer'),
 ('valmere','Valmère','Ville des piémonts',904,560,'massif-nord','ville','Bourg-centre des collines et lacs de piémont.','Population à déterminer'),
 ('azure','Azuré','Ville du Sud-Ouest',640,1120,'desert-solmar','ville','Ville de transition entre les terres arides et les plaines.','Population à déterminer'),
 ('tessal','Tessal','Ville des forêts',1088,865,'foret-arelia','ville','Ville des vallées boisées et des zones humides.','Population à déterminer'),
 ('drel','Drél','Ville des hauts-plateaux',596,440,'massif-nord','ville','Ville de montagne sur les vallées nordiques.','Population à déterminer'),
]
places=[{'id':i,'name':name,'type':typ,'x':x,'y':y,'wiki':wiki,'category':category,'description':desc,'population':pop} for i,name,typ,x,y,wiki,category,desc,pop in city_data]

poi=[
 dict(id='eldan',name='Glaciers d’Eldan',x=800,y=296,type='Glaciers',category='nature',wiki='massif-nord',description='Cirques glaciaires et sommets de la chaîne nordique.'),
 dict(id='yrmoth',name='Yrmoth',x=696,y=159,type='Désert de glace',category='nature',wiki='yrmoth',description='Territoire polaire réduit de l’extrême Nord.'),
 dict(id='orelys',name='Lac d’Orélys',x=731,y=523,type='Lac alpin',category='nature',wiki='lac-orelys',description='Lac de piémont alimenté par les massifs du Nord.'),
 dict(id='azran',name='Volcan d’Azran',x=464,y=1030,type='Volcan',category='nature',wiki='volcan-azran',description='Volcan actif dominant les étendues sableuses de Solmar.'),
 dict(id='solmar',name='Désert de Solmar',x=595,y=1027,type='Désert',category='nature',wiki='desert-solmar',description='Zone sableuse compacte entourant le volcan d’Azran.'),
 dict(id='forest',name='Grande forêt d’Arélia',x=1100,y=832,type='Forêt tropicale',category='nature',wiki='foret-arelia',description='Mosaïque de forêts humides et de cours d’eau.'),
 dict(id='river',name='Grand fleuve central',x=560,y=670,type='Fleuve',category='hydro',wiki='reseau-hydrographique',description='Il naît dans le massif du Nord et atteint l’océan à Occidian.'),
 dict(id='icebergs',name='Détroit des icebergs',x=770,y=61,type='Milieu marin',category='nature',wiki='yrmoth',description='Quelques icebergs dérivent au large des hautes terres polaires.'),
]
# Routes are schematic connecting corridors, not surveyed or complete street networks.
roads=[
 ('A1','Corridor occidental',['katoru','drel','estrel','occidian'],[[493,338],[565,420],[652,582],[747,739],[584,790],[419,762],[266,751]]),
 ('A2','Transarélienne',['occidian','estrel','vesone'],[[266,751],[423,765],[565,735],[747,739],[876,703],[1006,686],[1110,698]]),
 ('A3','Route méridionale',['estrel','azure','orientale'],[[747,739],[715,852],[687,963],[640,1120],[790,1160],[886,1140],[966,1094]]),
 ('A4','Corridor oriental',['vesone','tessal','namiya','orientale'],[[1110,698],[1077,778],[1088,865],[1174,905],[1208,917],[1140,1002],[1048,1067],[966,1094]]),
 ('A5','Route des piémonts',['drel','valmere','vesone'],[[596,440],[725,471],[817,524],[904,560],[1016,616],[1110,698]]),
]
rail=[
 ('L1','Ligne impériale',['occidian','estrel','vesone'],[[266,751],[426,780],[590,764],[747,739],[904,726],[1110,698]]),
 ('L2','Ligne du Sud',['estrel','orientale'],[[747,739],[788,871],[862,981],[966,1094]]),
 ('L3','Ligne du Nord',['katoru','estrel'],[[493,338],[560,458],[650,601],[747,739]]),
]
river_main=[[771,275],[757,309],[738,346],[727,380],[722,422],[727,451],[733,486],[730,523],[713,548],[691,580],[646,613],[602,643],[560,673],[504,704],[449,721],[394,738],[345,748],[301,751],[267,755],[242,767]]
rivers=[dict(id='fleuve-central',name='Grand fleuve central',points=river_main,importance='majeur'),
 dict(id='affluent-nord',name='Affluent du Nord',points=[[612,309],[619,359],[644,413],[671,467],[708,509]],importance='secondaire'),
 dict(id='affluent-des-plaines',name='Affluent des plaines',points=[[1000,549],[950,563],[902,594],[840,626],[788,652],[725,664],[657,649]],importance='secondaire'),
 dict(id='rio-forest',name='Rivière orientale',points=[[1152,633],[1127,682],[1155,715],[1174,768],[1152,810],[1164,851],[1197,885],[1268,911]],importance='secondaire')]
lake=[[713,483],[737,471],[758,480],[769,509],[754,535],[761,555],[738,565],[710,551],[699,531],[703,505]]

# generate raster at 1.7px / geographic unit. High-quality but appropriately sized for Github Pages.
S=1.68; pw,ph=round(W*S),round(H*S)
x=np.linspace(0,W,pw,dtype=np.float32)[None,:];y=np.linspace(0,H,ph,dtype=np.float32)[:,None]
mask_im=Image.new('L',(pw,ph),0);d=ImageDraw.Draw(mask_im)
d.polygon([(round(a*S),round(b*S)) for a,b in coast], fill=255)
for poly in islands:d.polygon([(round(a*S),round(b*S)) for a,b in poly], fill=255)
mask=np.array(mask_im)>0
lake_im=Image.new('L',(pw,ph));ld=ImageDraw.Draw(lake_im);ld.polygon([(int(a*S),int(b*S)) for a,b in lake],fill=255);lake_mask=np.array(lake_im)>0

# deterministic fractal noise at several scales
random_field=rng.normal(size=(ph//8+2,pw//8+2)).astype(np.float32)
random_fine=rng.normal(size=(ph,pw)).astype(np.float32)
def noise(sigma):
 r=gaussian_filter(random_field,sigma,mode='reflect');r=(r-r.mean())/(r.std()+1e-8)
 return np.array(Image.fromarray(((r.clip(-3,3)+3)/6*255).astype('uint8')).resize((pw,ph),Image.Resampling.BILINEAR),dtype=np.float32)/85.-1.5
n1=noise(10);n2=noise(3);n3=gaussian_filter(random_fine,6);n3/=n3.std()+1e-6

def gauss(cx,cy,sx,sy):return np.exp(-.5*((x-cx)/sx)**2-.5*((y-cy)/sy)**2)
# Mountain systems north, a subtropical highland belt in the west, local volcanic cone.
elevation=(.85*gauss(740,340,245,155)+.53*gauss(568,302,142,135)+.4*gauss(960,305,116,130)+.21*gauss(435,565,87,188)+.16*gauss(1010,560,125,105)+.43*gauss(466,1028,54,57))
elevation+=(.10*n1+.065*n2+.025*n3)*np.clip(elevation*1.75,0,1)
elevation=np.clip(elevation,0,1.2)
forest=np.clip(.90*gauss(1094,818,198,177)+.27*gauss(977,900,160,110)+.43*gauss(575,655,175,130),0,1)
desert=np.clip(1.15*gauss(488,1028,155,135)+.26*gauss(666,1034,130,110),0,1)
forest*=1.0-np.clip((elevation-.20)*1.2,0,1)
ice=np.clip(.99*gauss(722,204,215,95)*(.4+.72*elevation)+.50*gauss(784,326,188,128)*np.clip(elevation-.29,0,1.1),0,1)
shore=distance_transform_edt(~mask).astype(np.float32)/S
inner=distance_transform_edt(mask).astype(np.float32)/S
# Hillshading oriented with NW illumination
sy,sx=np.gradient(elevation)
shade=np.clip(.80-4.2*sx-3.7*sy, .38,1.24)
sea_n=np.clip(.42*n1+.18*n2,-1,1)
sea_shallows=np.exp(-shore/38)
# RGB color mixing functions
sea=np.stack([25+33*sea_shallows+3*sea_n,65+56*sea_shallows+5*sea_n,84+52*sea_shallows+7*sea_n],axis=-1)
land=np.stack([176-40*elevation-46*forest+36*desert+16*ice,189-48*elevation-23*forest+10*desert+30*ice,159-38*elevation-46*forest-23*desert+52*ice],axis=-1)
land+=np.stack([n1*4+n2*3,n1*6+n2*5,n1*3+n2*4],axis=-1)
# alpine rock/snow transition
rock=np.clip((elevation-.39)*1.5,0,.7)
land=land*(1-rock[:,:,None])+np.array([134,140,137])[None,None,:]*rock[:,:,None]
snow=np.clip((elevation-.70)*2.55,0,.82)+ice*.53
snow=np.clip(snow,0,.94)
land=land*(1-snow[:,:,None])+np.array([231,237,235])[None,None,:]*snow[:,:,None]
land*=shade[:,:,None]
# Compressed light engraving contours based on terrain (not strict surveyed elevations)
contour=np.clip(1-np.abs(np.sin(elevation*43))*19,0,1)*np.clip((elevation-.10)*3,0,1)
land*=1-.08*contour[:,:,None]
land*=1+.055*np.exp(-inner/12)[:,:,None]
img=np.where(mask[:,:,None],land,sea)
img=np.where(lake_mask[:,:,None], np.array([76,130,143]),img)
img=np.clip(img,0,255).astype('uint8')
Image.fromarray(img,'RGB').save(DEST/'arelia-terrain.webp',quality=83,method=6)
# cleaner map variant emphasizing land cover and coastal silhouette
carto_land=np.stack([207-54*forest+21*desert-20*elevation+24*ice,
                     213-43*forest+5*desert-20*elevation+25*ice,
                     189-45*forest-22*desert-7*elevation+32*ice],axis=-1)
carto_land*=np.clip(.98+.12*(shade-.8),.92,1.05)[:,:,None]
carto_sea=np.stack([179+4*sea_n+16*sea_shallows,207+4*sea_n+11*sea_shallows,211+4*sea_n+10*sea_shallows],axis=-1)
carto=np.where(mask[:,:,None],carto_land,carto_sea)
carto=np.where(lake_mask[:,:,None],np.array([147,189,200]),carto)
Image.fromarray(np.clip(carto,0,255).astype('uint8'),'RGB').save(DEST/'arelia-plan.webp',quality=83,method=6)

points=places+poi
geo={
 'meta':{'name':'Arélia Maps','version':'0.1.0','coordinate_system':'Arellia synthetic XY, y grows south','units':'local atlas units','kilometres_per_unit':round(km_per_unit,6),'land_area_km2':1000000,'population':100000000,'extent':{'width':W,'height':H},'source':'Géographie construite pour la fiction; elle n’est pas géoréférencée sur Terre.','accuracy':'Implantations et infrastructures esquissées; coordonnées non cadastrales.'},
 'coastline':[[round(a,2),round(b,2)] for a,b in coast[::3]],
 'islands':islands,'lake':lake,'places':points,
 'roads':[{'id':i,'name':name,'cities':cities,'points':pts} for i,name,cities,pts in roads],
 'railways':[{'id':i,'name':name,'cities':cities,'points':pts} for i,name,cities,pts in rail],
 'rivers':rivers,
 'capital':{'name':'Vésone','center':[1110,698],'canals':[
 {'name':'Grand Canal Impérial','points':[[1093,672],[1104,680],[1110,690],[1125,699],[1142,706],[1147,720],[1136,736]]},
 {'name':'Canal du Palais','points':[[1072,700],[1086,704],[1101,712],[1118,710],[1136,720]]},
 {'name':'Canal des Marchands','points':[[1098,655],[1114,674],[1122,689],[1129,706],[1148,713]]},
 {'name':'Canal des Jardins','points':[[1065,731],[1087,723],[1108,728],[1125,743]]}],
 'districts':[{'name':'Vieux-Canaux','x':1104,'y':692},{'name':'Quartier du Palais','x':1124,'y':722},{'name':'Berges des Marchands','x':1086,'y':720},{'name':'Quartier des Jardins','x':1120,'y':664}],
 'places':[{'name':'Palais impérial (emplacement indicatif)','x':1120,'y':721},{'name':'Place des Écluses (indicative)','x':1099,'y':704},{'name':'Port des Canaux (indicatif)','x':1144,'y':713}]},
 'labels':[{'name':'Mer des Glaces','x':770,'y':72,'kind':'sea'},{'name':'Chaîne du Nord','x':784,'y':366,'kind':'mountains'},{'name':'Vallée centrale','x':680,'y':658,'kind':'region'},{'name':'Forêt d’Arélia','x':1110,'y':835,'kind':'region'},{'name':'Désert de Solmar','x':530,'y':1090,'kind':'region'},{'name':'Golfe d’Occidian','x':134,'y':763,'kind':'sea'},{'name':'Océan oriental','x':1417,'y':722,'kind':'sea'}]
}
(DEST/'arelia-map-data.json').write_text(json.dumps(geo,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print(f'CARTE : raster {pw}x{ph}; aire continentale normalisée à 1 000 000 km²; facteur {km_per_unit:.4f} km/unité; {len(points)} POI')
