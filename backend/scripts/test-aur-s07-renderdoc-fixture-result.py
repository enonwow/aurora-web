import json, math, pathlib, sys
expected=json.loads(pathlib.Path(sys.argv[1]).read_text())
actual=json.loads(pathlib.Path(sys.argv[2]).read_text())
assert actual['ok'] and len(actual['selectedDraws']) == 2
comparisons=0
def compare(a,b):
    global comparisons
    assert len(a)==len(b)
    for x,y in zip(a,b):
        if isinstance(x,list): compare(x,y)
        else:
            assert math.isclose(x,y,rel_tol=0,abs_tol=1e-6),(x,y)
            comparisons+=1
for i,draw in enumerate(actual['selectedDraws']):
    attrs={a['name']:a for a in draw['vertexInputs']['attributes']}
    compare(attrs['vPos']['values'],expected['positions'])
    compare(attrs['vColor']['values'],expected['colorsNormalized'])
    compare(attrs['vTcIn']['values'],expected['uvs'])
    assert all(a['stride']==24 for a in attrs.values())
    column=expected['matricesColumnMajor'][i]
    row=[column[c*4+r] for r in range(4) for c in range(4)]
    compare(draw['requiredUniforms']['m_mv']['values'],row)
    identity=[1 if r==c else 0 for r in range(4) for c in range(4)]
    compare(draw['requiredUniforms']['m_view_inv']['values'],identity)
    compare(draw['requiredUniforms']['m_texture']['values'],identity)
    assert draw['cpuCorrelation']['explicitAbsence']
assert actual['nativeAcceptance'] is False
print(json.dumps({'ok':True,'numericComparisons':comparisons,'draws':2,'nativeNwnProof':False}))
