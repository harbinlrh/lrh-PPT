#!/usr/bin/env python3
"""Static OOXML checks; does not establish visual or PowerPoint compatibility."""
import argparse,json,re,zipfile,xml.etree.ElementTree as ET
from pathlib import Path
NS={'p':'http://schemas.openxmlformats.org/presentationml/2006/main','a':'http://schemas.openxmlformats.org/drawingml/2006/main','r':'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
def check(path,expected=None,require_all_editable=False):
    errors=[]; warnings=[]; rows=[]
    with zipfile.ZipFile(path) as z:
        if z.testzip(): errors.append('Corrupt ZIP entry')
        for name in z.namelist():
            if name.endswith('.xml'):
                try: ET.fromstring(z.read(name))
                except ET.ParseError: errors.append('Invalid XML: '+name)
        if errors: return {'slides':None,'errors':errors,'warnings':warnings,'pages':rows}
        pres=ET.fromstring(z.read('ppt/presentation.xml'))
        ids=pres.findall('p:sldIdLst/p:sldId',NS)
        rels=ET.fromstring(z.read('ppt/_rels/presentation.xml.rels'))
        relmap={x.get('Id'):x.get('Target') for x in rels}
        total=len(ids)
        if expected is not None and total!=expected: errors.append(f'Expected {expected} slides, got {total}')
        size=pres.find('p:sldSz',NS); cx,cy=int(size.get('cx')),int(size.get('cy'))
        for i,entry in enumerate(ids,1):
            target=relmap[entry.get('{'+NS['r']+'}id')]
            name=target.lstrip('/') if target.startswith('/') else str(Path('ppt')/target)
            root=ET.fromstring(z.read(name)); texts=[''.join(t.text or '' for t in para.findall('.//a:t',NS)) for para in root.findall('.//a:p',NS)]
            numbers=[t for t in texts if re.fullmatch(r'\d{2,}\s*/\s*\d{2,}',t.strip())]
            desired=f'{i:02d} / {total:02d}'
            if numbers!=[desired]: errors.append(f'Slide {i}: native page number expected {desired!r}; got {numbers!r}')
            if require_all_editable:
                if root.findall('.//a:blip',NS): errors.append(f'Slide {i}: image or image fill violates all-editable requirement')
                if root.findall('.//p:oleObj',NS): errors.append(f'Slide {i}: OLE object violates all-editable requirement')
                if root.findall('.//a:videoFile',NS) or root.findall('.//a:audioFile',NS): errors.append(f'Slide {i}: media object violates all-editable requirement')
                if not any(t.strip() and t not in numbers for t in texts): errors.append(f'Slide {i}: no native body text')
            pics=len(root.findall('.//p:pic',NS)); native=len(root.findall('.//p:sp',NS))
            if root.findall('.//p:grpSp',NS): warnings.append(f'Slide {i}: nested group geometry requires renderer inspection')
            for shape in root.findall('p:cSld/p:spTree/*',NS):
                xf=shape.find('p:spPr/a:xfrm',NS)
                if xf is None: continue
                off,ext=xf.find('a:off',NS),xf.find('a:ext',NS)
                if off is not None and ext is not None:
                    x,y,w,h=[int(v) for v in (off.get('x'),off.get('y'),ext.get('cx'),ext.get('cy'))]
                    if w<0 or h<0 or x<-1000 or y<-1000 or x+w>cx+1000 or y+h>cy+1000: errors.append(f'Slide {i}: shape outside canvas or negative size')
            if not pics and not any(t.strip() and t not in numbers for t in texts): warnings.append(f'Slide {i}: no body text or pictures; inspect empty content')
            if pics and native<5: warnings.append(f'Slide {i}: few native shapes; inspect whether this is an image review page')
            rows.append({'slide':i,'page_number':numbers,'pictures':pics,'native_shapes':native})
        if require_all_editable:
            for part in z.namelist():
                if part.startswith('ppt/') and part.endswith('.xml'):
                    doc=ET.fromstring(z.read(part))
                    if doc.findall('.//a:blip',NS): errors.append('Image in slide, master, layout or notes violates all-editable requirement: '+part)
                    if doc.findall('.//p:oleObj',NS) or doc.findall('.//a:videoFile',NS) or doc.findall('.//a:audioFile',NS): errors.append('Noneditable media or OLE in inherited or slide part: '+part)
                    for shape in doc.findall('.//p:sp',NS):
                        props=shape.find('p:nvSpPr/p:cNvPr',NS)
                        if props is not None and props.get('hidden') in ('1','true') and shape.findall('.//a:t',NS): errors.append('Hidden text shape cannot establish editable visible content: '+part)
            for relfile in z.namelist():
                if relfile.endswith('.rels'):
                    for rel in ET.fromstring(z.read(relfile)):
                        if rel.get('TargetMode')=='External': errors.append('External relationship requires manual review: '+relfile)
    return {'slides':total,'errors':errors,'warnings':warnings,'pages':rows,'limitations':['No rendering, factual verification, embedded-image OCR or PowerPoint compatibility check']}
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('file');p.add_argument('--expected-slides',type=int);p.add_argument('--require-all-editable',action='store_true');p.add_argument('--json-out');a=p.parse_args()
    result=check(a.file,a.expected_slides,a.require_all_editable);body=json.dumps(result,ensure_ascii=False,indent=2)
    if a.json_out: Path(a.json_out).write_text(body,encoding='utf-8')
    print(body);raise SystemExit(bool(result['errors']))
