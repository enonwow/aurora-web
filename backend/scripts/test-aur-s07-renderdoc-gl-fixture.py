"""Owned, hidden OpenGL fixture for replay-tool qualification; never launches NWN.

Run through the official renderdoccmd capture command. Application API 1.6
table layout: RenderDoc v1.46 renderdoc/api/app/renderdoc_app.h, indices 19/21.
"""
import ctypes, json, pathlib, struct, sys
import moderngl

output=pathlib.Path(sys.argv[1])
dll=ctypes.CDLL(sys.argv[2])
get_api=dll.RENDERDOC_GetAPI
get_api.argtypes=[ctypes.c_int,ctypes.POINTER(ctypes.c_void_p)]; get_api.restype=ctypes.c_int
pointer=ctypes.c_void_p()
assert get_api(10600,ctypes.byref(pointer)) == 1
table=ctypes.cast(pointer,ctypes.POINTER(ctypes.c_void_p))
start=ctypes.CFUNCTYPE(None,ctypes.c_void_p,ctypes.c_void_p)(table[19])
end=ctypes.CFUNCTYPE(ctypes.c_uint32,ctypes.c_void_p,ctypes.c_void_p)(table[21])
ctx=moderngl.create_standalone_context(require=330)
fbo=ctx.simple_framebuffer((64,64)); fbo.use()
vs='''#version 330
in vec4 vColor; in vec3 vPos; in vec2 vTcIn;
uniform mat4 m_mv; uniform mat4 m_view_inv; uniform mat4 m_texture;
out vec4 color; out vec2 uv;
void main() {gl_Position=m_mv*m_view_inv*vec4(vPos,1); color=vColor; uv=(m_texture*vec4(vTcIn,0,1)).xy;}
'''
fs='''#version 330
in vec4 color; in vec2 uv; out vec4 outColor;
void main(){outColor=color*vec4(uv.x+0.1,uv.y+0.2,0.8,1);}
'''
program=ctx.program(vertex_shader=vs,fragment_shader=fs)
positions=[[-.4,-.4,0],[.4,-.4,0],[0,.4,0]]
colors=[[255,128,0,255],[128,64,0,255],[255,32,0,128]]
uvs=[[0,0],[1,0],[.5,1]]
data=b''.join(struct.pack('<4B3f2f',*c,*p,*uv) for c,p,uv in zip(colors,positions,uvs))
buffer=ctx.buffer(data)
vao=ctx.vertex_array(program,[(buffer,'4f1 3f 2f','vColor','vPos','vTcIn')])
identity=[1.,0,0,0,0,1.,0,0,0,0,1.,0,0,0,0,1.]
matrices=[identity[:],identity[:]]; matrices[0][12]=-.25; matrices[1][12]=.25
start(None,None)
fbo.clear()
program['m_view_inv'].write(struct.pack('<16f',*identity))
program['m_texture'].write(struct.pack('<16f',*identity))
for m in matrices:
    program['m_mv'].write(struct.pack('<16f',*m)); vao.render(moderngl.TRIANGLES)
ctx.finish()
captured=end(None,None)
output.write_text(json.dumps({'toolFixtureOnly':True,'nativeNwnProof':False,'captured':captured,
    'renderer':ctx.info['GL_RENDERER'],'glVersion':ctx.info['GL_VERSION'],
    'positions':positions,'colorsNormalized':[[x/255 for x in c] for c in colors],
    'uvs':uvs,'matricesColumnMajor':matrices},indent=2))
assert captured == 1
ctx.release()
