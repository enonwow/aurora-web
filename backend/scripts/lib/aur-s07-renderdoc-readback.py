import json, os, sys, traceback, hashlib, struct
from datetime import datetime, timezone

def digest_file(path):
    digest = hashlib.sha256()
    with open(path, 'rb') as stream:
        for chunk in iter(lambda: stream.read(1024*1024), b''):
            digest.update(chunk)
    return digest.hexdigest()

def decode_attribute(data, kind, width, count, bgra=False):
    if width not in (1,2,4,8) or count < 1 or count > 4:
        raise ValueError('unsupported_attribute_dimensions')
    signed = kind in ('SInt','SNorm')
    if kind == 'Float': code = {2:'e',4:'f',8:'d'}.get(width)
    elif kind in ('UInt','SInt','UNorm','SNorm'): code = ({1:'b',2:'h',4:'i',8:'q'} if signed else {1:'B',2:'H',4:'I',8:'Q'})[width]
    else: raise ValueError('unsupported_component_type:'+kind)
    if not code: raise ValueError('unsupported_float_width')
    values = list(struct.unpack('<'+code*count, data))
    if kind == 'UNorm': values = [v/((1<<(8*width))-1) for v in values]
    if kind == 'SNorm': values = [max(-1.0,v/((1<<(8*width-1))-1)) for v in values]
    if bgra:
        if count != 4: raise ValueError('invalid_bgra')
        values = [values[2],values[1],values[0],values[3]]
    return values

def flatten(actions):
    for action in actions:
        yield action
        yield from flatten(action.children)

def serialize_variable(variable):
    result = {'name':variable.name,'rows':variable.rows,'columns':variable.columns,'type':str(variable.type)}
    if variable.members:
        result['members'] = [serialize_variable(v) for v in variable.members]
    else:
        size = variable.rows * variable.columns
        if size > 16: raise ValueError('unexpected_shader_variable_size')
        kind = str(variable.type).split('.')[-1]
        field = {'Float':'f32v','Double':'f64v','UInt':'u32v','SInt':'s32v','Bool':'u32v'}.get(kind)
        if field: result['values'] = list(getattr(variable.value,field))[:size]
        else: result['explicitAbsence'] = 'Unsupported variable type; no fabricated interpretation.'
    return result

def variables_named(variables, wanted):
    found = []
    for v in variables:
        if v['name'] in wanted: found.append(v)
        found.extend(variables_named(v.get('members',[]),wanted))
    return found

def read_vertices(rd, controller, pipe, action):
    if action.numInstances != 1: raise ValueError('multi_instance_draw_requires_explicit_instance_selection')
    count = action.numIndices
    if count > 4096: raise ValueError('draw_exceeds_explicit_4096_vertex_budget')
    indexed = bool(action.flags & rd.ActionFlags.Indexed)
    if indexed:
        ib = pipe.GetIBuffer()
        if ib.byteStride not in (1,2,4): raise ValueError('unsupported_index_width')
        offset = ib.byteOffset + action.indexOffset*ib.byteStride
        data = bytes(controller.GetBufferData(ib.resourceId,offset,count*ib.byteStride))
        indices = list(struct.unpack('<'+{1:'B',2:'H',4:'I'}[ib.byteStride]*count,data))
        indices = [i+action.baseVertex for i in indices]
    else: indices = list(range(action.vertexOffset,action.vertexOffset+count))
    if any(i<0 for i in indices): raise ValueError('negative_vertex_index')
    buffers=pipe.GetVBuffers()
    result={'indexed':indexed,'indices':indices,'attributes':[]}
    for attr in pipe.GetVertexInputs():
        if not attr.used: continue
        fmt=attr.format
        item={'name':attr.name,'format':fmt.Name(),'componentType':str(fmt.compType),'componentWidth':fmt.compByteWidth,
            'componentCount':fmt.compCount,'bufferSlot':attr.vertexBuffer,'attributeByteOffset':attr.byteOffset}
        if attr.genericEnabled:
            item['explicitAbsence']='Generic vertex value, not buffer-backed; inspect pipeline separately.'
            result['attributes'].append(item); continue
        if attr.perInstance: raise ValueError('per_instance_attribute_requires_explicit_instance_selection')
        if str(fmt.type).split('.')[-1] != 'Regular': raise ValueError('unsupported_packed_vertex_format:'+fmt.Name())
        binding=buffers[attr.vertexBuffer]
        width=fmt.compByteWidth*fmt.compCount
        values=[]; offsets=[]; raw=[]
        for index in indices:
            offset=binding.byteOffset+index*binding.byteStride+attr.byteOffset
            data=bytes(controller.GetBufferData(binding.resourceId,offset,width))
            if len(data)!=width: raise ValueError('vertex_buffer_read_incomplete')
            values.append(decode_attribute(data,str(fmt.compType).split('.')[-1],fmt.compByteWidth,fmt.compCount,fmt.BGRAOrder()))
            offsets.append(offset); raw.append(data.hex())
        item.update(resourceId=str(binding.resourceId),bufferByteOffset=binding.byteOffset,
                    stride=binding.byteStride,sourceByteOffsets=offsets,rawHex=raw,values=values)
        result['attributes'].append(item)
    return result

def read_draw(rd, controller, action, resources):
    pipe=controller.GetPipelineState()
    stage=rd.ShaderStage.Vertex
    reflection=pipe.GetShaderReflection(stage)
    shader=pipe.GetShader(stage)
    uniforms=[]
    if reflection:
        for index,block in enumerate(reflection.constantBlocks):
            descriptor=pipe.GetConstantBlock(stage,index,0).descriptor
            variables=controller.GetCBufferVariableContents(pipe.GetGraphicsPipelineObject(),shader,stage,
                pipe.GetShaderEntryPoint(stage),index,descriptor.resource,descriptor.byteOffset,descriptor.byteSize)
            uniforms.append({'index':index,'name':block.name,'bufferBacked':block.bufferBacked,
                             'variables':[serialize_variable(v) for v in variables]})
    descriptors=[]
    for used in pipe.GetAllUsedDescriptors(True):
        resource=str(used.descriptor.resource)
        descriptors.append({'stage':str(used.access.stage),'type':str(used.access.type),'resourceId':resource,
                            'resourceName':resources.get(resource),'index':used.access.index})
    wanted=['m_mv','m_view_inv','m_texture']
    found=variables_named([v for b in uniforms for v in b['variables']],wanted)
    return {'eventId':action.eventId,'pipelineId':str(pipe.GetGraphicsPipelineObject()),
        'shaders':{str(s):str(pipe.GetShader(s)) for s in (stage,rd.ShaderStage.Pixel)},
        'vertexInputs':read_vertices(rd,controller,pipe,action),'uniformBlocks':uniforms,
        'requiredUniforms':{name:next((v for v in found if v['name']==name),
                                    {'explicitAbsence':'Not exposed by this captured vertex shader.'}) for name in wanted},
        'descriptors':descriptors,
        'material':{'explicitAbsence':'RenderDoc exposes GPU bindings, not NWN material objects; descriptors and shader IDs are recorded.'},
        'cpuCorrelation':{'emitterCenter':None,'particleCenter':None,
            'explicitAbsence':'CPU simulation state is not captured by this GPU replay API; do not infer exact CPU particle centers from billboard vertices.'},
        'localPhase':{'observed':None,'explicitAbsence':'No native effect-age marker exists in this capture readback.'}}

def read_capture(rd, job, mark):
    if digest_file(job['capturePath']) != job['captureSha256']: raise ValueError('capture_hash_mismatch')
    cap=rd.OpenCaptureFile(); controller=None
    try:
        mark('capture_open')
        status=cap.OpenFile(job['capturePath'],'rdc',None)
        if status != rd.ResultCode.Succeeded: raise RuntimeError('capture_open_failed:'+str(status))
        mark('capture_replay')
        status,controller=cap.OpenCapture(rd.ReplayOptions(),None)
        if status != rd.ResultCode.Succeeded: raise RuntimeError('capture_replay_failed:'+str(status))
        api=controller.GetAPIProperties()
        resources={str(r.resourceId):r.name for r in controller.GetResources()}
        actions={a.eventId:a for a in flatten(controller.GetRootActions()) if a.flags & rd.ActionFlags.Drawcall}
        if len(actions)>10000: raise ValueError('draw_index_exceeds_10000_limit')
        missing=set(job['eventIds'])-set(actions)
        if missing: raise ValueError('selected_draws_absent:'+str(sorted(missing)))
        result={'ok':True,'version':'aur-s07-renderdoc-readback/v1','captureSha256':job['captureSha256'],
                'api':str(api.pipelineType),'drawIndex':[],'selectedDraws':[],
                'nativeAcceptance':False,'sourceMatchConfirmed':False}
        for event,action in actions.items():
            controller.SetFrameEvent(event,False)
            pipe=controller.GetPipelineState()
            names=[a.name for a in pipe.GetVertexInputs() if a.used]
            result['drawIndex'].append({'eventId':event,'vertices':action.numIndices,'instances':action.numInstances,
                'inputs':names,'vertexShaderId':str(pipe.GetShader(rd.ShaderStage.Vertex)),
                'requiredInputNamesPresent':all(n in names for n in ('vPos','vColor','vTcIn'))})
            if event in job['eventIds']:
                mark('draw_'+str(event))
                result['selectedDraws'].append(read_draw(rd,controller,action,resources))
        return result
    finally:
        if controller is not None: controller.Shutdown()
        cap.Shutdown()

def main(rd):
    with open(os.environ['AURORA_RENDERDOC_JOB'], encoding='utf8') as stream:
        job = json.load(stream)
    def mark(stage):
        with open(os.path.join(job['directory'], 'timeline.jsonl'), 'a', encoding='utf8') as stream:
            stream.write(json.dumps({'stage':stage, 'atUtc':datetime.now(timezone.utc).isoformat()})+'\n')
            stream.flush(); os.fsync(stream.fileno())
    try:
        mark('script_entered')
        if job['mode'] == 'api':
            queries = {
                'ReplayController':['GetRootActions','GetPipelineState','GetCBufferVariableContents','GetBufferData','GetAPIProperties','SetFrameEvent','GetResources'],
                'PipeState':['GetVertexInputs','GetVBuffers','GetIBuffer','GetConstantBlocks','GetConstantBlock','GetShaderReflection','GetShader','GetShaderEntryPoint','GetGraphicsPipelineObject','GetAllUsedDescriptors'],
                'VertexInputAttribute':['name','byteOffset','vertexBuffer','format','used','genericValue','genericEnabled','perInstance','instanceRate'],
                'BoundVBuffer':['resourceId','byteOffset','byteStride','byteSize'],
                'ActionDescription':['eventId','numIndices','numInstances','vertexOffset','baseVertex','indexOffset','instanceOffset','flags'],
                'ShaderVariable':['name','rows','columns','value','type','members'],
                'CaptureFile':['OpenFile','OpenCapture','LocalReplaySupport'],
            }
            result = {'ok':True, 'version':'aur-s07-renderdoc-api/v1','types':{}}
            for name, members in queries.items():
                cls = getattr(rd,name,None)
                result['types'][name] = {'available':cls is not None,'members':{
                    member:{'available':hasattr(cls,member),'doc':getattr(getattr(cls,member,None),'__doc__',None)} for member in members}}
        else:
            result = read_capture(rd,job,mark)
        with open(job['outputPath'],'x',encoding='utf8') as stream:
            json.dump(result,stream,indent=2,allow_nan=False); stream.write('\n'); stream.flush(); os.fsync(stream.fileno())
        mark('result_written')
    except BaseException as error:
        with open(os.path.join(job['directory'],'error.json'),'x',encoding='utf8') as stream:
            json.dump({'error':str(error),'traceback':traceback.format_exc()},stream,indent=2)
        raise

if __name__ == '__main__':
    try:
        main(globals().get('renderdoc'))
    except Exception:
        # qrenderdoc otherwise enters its GUI event loop after a Python exception.
        sys.exit(1)
    sys.exit(0)
