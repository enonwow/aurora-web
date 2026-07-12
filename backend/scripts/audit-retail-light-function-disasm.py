from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

try:
    from capstone import Cs, CS_ARCH_X86, CS_MODE_64
    from capstone.x86_const import (
        X86_OP_IMM,
        X86_OP_MEM,
        X86_OP_REG,
        X86_REG_EBX,
        X86_REG_RAX,
        X86_REG_RBX,
        X86_REG_RCX,
        X86_REG_RIP,
        X86_REG_RSI,
        X86_REG_R15,
    )
    _CAPSTONE_IMPORT_ERROR: Exception | None = None
except Exception as exc:  # pragma: no cover - import-only source scans do not need capstone
    Cs = None
    CS_ARCH_X86 = CS_MODE_64 = 0
    X86_OP_IMM = X86_OP_MEM = X86_OP_REG = 0
    X86_REG_EBX = X86_REG_RAX = X86_REG_RBX = X86_REG_RCX = 0
    X86_REG_RIP = X86_REG_RSI = X86_REG_R15 = 0
    _CAPSTONE_IMPORT_ERROR = exc


def require_capstone() -> None:
    if _CAPSTONE_IMPORT_ERROR is not None:
        raise SystemExit(f"capstone is required for binary audit: {_CAPSTONE_IMPORT_ERROR}") from _CAPSTONE_IMPORT_ERROR


DEFAULT_BINARIES = [
    Path("C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/bin/win32/nwserver.exe"),
    Path("C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/bin/win32/nwmain.exe"),
]
DEFAULT_TOOLSET_BINARY = Path("C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/bin/win32/nwtoolset.exe")
DEFAULT_DECOMPILED_SOURCE = Path("C:/Projects/New Folder/export/decompiled_all.c")
DEFAULT_REFERENCE_ROOT = Path("C:/Projects/New Folder")

REQUESTED_SYMBOLS = {
    "?ApplyLight@CNWSItemPropertyHandler@@QEAAHPEAVCNWSItem@@PEAVCNWItemProperty@@PEAVCNWSCreature@@IH@Z": "CNWSItemPropertyHandler::ApplyLight",
    "?OnApplyLight@CNWSEffectListHandler@@QEAAHPEAVCNWSObject@@PEAVCGameEffect@@H@Z": "CNWSEffectListHandler::OnApplyLight",
    "?OnRemoveLight@CNWSEffectListHandler@@QEAAHPEAVCNWSObject@@PEAVCGameEffect@@@Z": "CNWSEffectListHandler::OnRemoveLight",
    "?OnItemPropertyApplied@CNWSItemPropertyHandler@@UEAAHPEAVCNWSItem@@PEAVCNWItemProperty@@PEAVCNWSCreature@@IH@Z": "CNWSItemPropertyHandler::OnItemPropertyApplied",
    "?AddLight@LightManager@@UEAAXPEAVPartLight@@@Z": "LightManager::AddLight",
    "?RemoveLight@LightManager@@UEAAXPEAVPartLight@@@Z": "LightManager::RemoveLight",
    "?PrioritizeLights@LightManager@@UEAAXAEBVVector@@@Z": "LightManager::PrioritizeLights",
    "?UpdateLights@LightManager@@UEAAXXZ": "LightManager::UpdateLights",
    "??0PartLight@@QEAA@PEAVMdlNode@@@Z": "PartLight::PartLight",
    "?AsPartLight@PartLight@@UEAAPEAV1@XZ": "PartLight::AsPartLight",
    "?Draw@PartLight@@UEAAXXZ": "PartLight::Draw",
    "?Mat@PartLight@@UEAAXXZ": "PartLight::Mat",
    "?InternalCreateInstance@MdlNodeLight@@QEAAPEAVPart@@PEAVGob@@@Z": "MdlNodeLight::InternalCreateInstance",
    "?InternalDestructor@MdlNodeLight@@QEAAXXZ": "MdlNodeLight::InternalDestructor",
    "?CollectLights@Gob@@QEAAXAEAV?$List@PEAVPartLight@@@@@Z": "Gob::CollectLights",
    "?Add@?$CExoArrayList@PEAVPartLight@@@@QEAAXPEAVPartLight@@@Z": "CExoArrayList<PartLight>::Add",
    "?Remove@?$CExoArrayList@PEAVPartLight@@@@QEAAXPEAVPartLight@@@Z": "CExoArrayList<PartLight>::Remove",
    "?OnApplyVisualEffect@CNWSEffectListHandler@@QEAAHPEAVCNWSObject@@PEAVCGameEffect@@H@Z": "CNWSEffectListHandler::OnApplyVisualEffect",
    "?OnRemoveVisualEffect@CNWSEffectListHandler@@QEAAHPEAVCNWSObject@@PEAVCGameEffect@@@Z": "CNWSEffectListHandler::OnRemoveVisualEffect",
    "?ExecuteCommandEffectVisualEffect@CNWSVirtualMachineCommands@@QEAAHHH@Z": "CNWSVirtualMachineCommands::ExecuteCommandEffectVisualEffect",
    "?GetInteger@CGameEffect@@QEAAHH@Z": "CGameEffect::GetInteger",
    "?GetObjectID@CGameEffect@@QEAAIH@Z": "CGameEffect::GetObjectID",
    "?GetFloat@CGameEffect@@QEAAMH@Z": "CGameEffect::GetFloat",
    "?GetVector@CGameEffect@@QEAA?AVVector@@H@Z": "CGameEffect::GetVector",
    "??0CLoopingVisualEffect@@QEAA@XZ": "CLoopingVisualEffect::CLoopingVisualEffect",
    "?GetIsBeam@CLoopingVisualEffect@@QEAAHXZ": "CLoopingVisualEffect::GetIsBeam",
    "?Add@?$CExoArrayList@VCLoopingVisualEffect@@@@QEAAXVCLoopingVisualEffect@@@Z": "CExoArrayList<CLoopingVisualEffect>::Add",
    "?Allocate@?$CExoArrayList@VCLoopingVisualEffect@@@@QEAAXH@Z": "CExoArrayList<CLoopingVisualEffect>::Allocate",
    "??4?$CExoArrayList@VCLoopingVisualEffect@@@@QEAAAEAV0@AEBV0@@Z": "CExoArrayList<CLoopingVisualEffect>::operator=",
    "?AddLoopingVisualEffect@CNWSObject@@QEAAXGIEUObjectVisualTransformData@@@Z": "CNWSObject::AddLoopingVisualEffect",
    "?RemoveLoopingVisualEffect@CNWSObject@@QEAAXGIEAEBUObjectVisualTransformData@@@Z": "CNWSObject::RemoveLoopingVisualEffect",
    "?SendServerToPlayerGameObjUpdateVisEffect@CNWSMessage@@QEAAHPEAVCNWSPlayer@@GIIEEVVector@@MUObjectVisualTransformData@@@Z": "CNWSMessage::SendServerToPlayerGameObjUpdateVisEffect",
    "?SendServerToPlayerArea_VisualEffect@CNWSMessage@@QEAAHPEAVCNWSPlayer@@GVVector@@UObjectVisualTransformData@@@Z": "CNWSMessage::SendServerToPlayerArea_VisualEffect",
    "?AssignVisualEffectLists@CNWSMessage@@IEAAXPEAV?$CExoArrayList@VCLoopingVisualEffect@@@@0@Z": "CNWSMessage::AssignVisualEffectLists",
    "?CompareVisualEffectLists@CNWSMessage@@IEAAHPEBV?$CExoArrayList@VCLoopingVisualEffect@@@@0@Z": "CNWSMessage::CompareVisualEffectLists",
    "?ComputeUpdateRequired@CNWSMessage@@IEAAIPEAVCNWSPlayer@@PEAVCNWSObject@@PEAVCLastUpdateObject@@H@Z": "CNWSMessage::ComputeUpdateRequired",
    "?CreateNewLastUpdateObject@CNWSMessage@@QEAAPEAVCLastUpdateObject@@PEAVCNWSPlayer@@PEAVCNWSObject@@PEAI2@Z": "CNWSMessage::CreateNewLastUpdateObject",
    "?StoreValuesInLastUpdateObject@CNWSMessage@@QEAAXPEAVCNWSPlayer@@PEAVCLastUpdateObject@@PEAVCNWSObject@@II@Z": "CNWSMessage::StoreValuesInLastUpdateObject",
    "?UpdateLastUpdateObject@CNWSMessage@@IEAAXPEAVCNWSPlayer@@PEAVCNWSObject@@PEAVCLastUpdateObject@@I@Z": "CNWSMessage::UpdateLastUpdateObject",
    "?WriteGameObjUpdate_UpdateObject@CNWSMessage@@QEAAXPEAVCNWSPlayer@@PEAVCNWSObject@@PEAVCLastUpdateObject@@II@Z": "CNWSMessage::WriteGameObjUpdate_UpdateObject",
    "?GetVisualTransformData@CLastUpdateObject@@QEBAAEBUObjectVisualTransformData@@XZ": "CLastUpdateObject::GetVisualTransformData",
    "?SetVisualTransformData@CLastUpdateObject@@QEAAXAEBUObjectVisualTransformData@@@Z": "CLastUpdateObject::SetVisualTransformData",
    "?WriteBYTE@CNWMessage@@QEAAXEHH@Z": "CNWMessage::WriteBYTE",
    "?WriteWORD@CNWMessage@@QEAAXGH@Z": "CNWMessage::WriteWORD",
    "?WriteOBJECTIDServer@CNWSMessage@@QEAAXI@Z": "CNWSMessage::WriteOBJECTIDServer",
    "?Write@ObjectVisualTransformData@@SAXPEAVCNWSPlayer@@PEAVCNWMessage@@AEBU1@@Z": "ObjectVisualTransformData::Write",
    "?SatisfiesBuild@CNWSPlayer@@QEAAHHHH@Z": "CNWSPlayer::SatisfiesBuild",
    "?UpdateVisualEffect@CNWSItem@@QEAAXXZ": "CNWSItem::UpdateVisualEffect",
    "?PlayVisualEffect@CNWSArea@@QEAAXPEAVCGameEffect@@VVector@@@Z": "CNWSArea::PlayVisualEffect",
}

STRING_NEEDLES = [
    "IPRP_LightCost",
    "IPRP_LIGHTCOST",
    "IPRP_Color",
    "IPRP_COLOR",
    "ItemPropertyLight",
    "ApplyLight",
    "OnApplyLight",
    "OnRemoveLight",
    "PartLight",
    "LightManager",
    "visualeffects",
    "progfx",
]

IPRP_COLOR_LABELS = ["Blue", "Yellow", "Purple", "Red", "Green", "Orange", "White"]
IPRP_LIGHTCOST_BRIGHTNESS = [
    {"iprpLightCostValue": 1, "label": "Dim", "tokenRadiusMeters": 5, "vfxRowAdd": 0},
    {"iprpLightCostValue": 2, "label": "Low", "tokenRadiusMeters": 10, "vfxRowAdd": 1},
    {"iprpLightCostValue": 3, "label": "Normal", "tokenRadiusMeters": 15, "vfxRowAdd": 2},
    {"iprpLightCostValue": 4, "label": "Bright", "tokenRadiusMeters": 20, "vfxRowAdd": 3},
]

VISUAL_EFFECT_MESSAGE_TARGET_NAMES = {
    "CNWSMessage::AssignVisualEffectLists",
    "CNWSMessage::CompareVisualEffectLists",
    "CNWSMessage::ComputeUpdateRequired",
    "CNWSMessage::CreateNewLastUpdateObject",
    "CNWSMessage::StoreValuesInLastUpdateObject",
    "CNWSMessage::UpdateLastUpdateObject",
    "CNWSMessage::WriteGameObjUpdate_UpdateObject",
    "CLastUpdateObject::GetVisualTransformData",
    "CLastUpdateObject::SetVisualTransformData",
}

RENDER_LIGHT_TARGET_NAMES = {
    "LightManager::AddLight",
    "LightManager::RemoveLight",
    "LightManager::PrioritizeLights",
    "LightManager::UpdateLights",
    "MdlNodeLight::InternalCreateInstance",
    "CExoArrayList<PartLight>::Add",
}

RETAIL_DEFAULT_IMAGE_BASE = 0x140000000
TOOLSET_DEFAULT_IMAGE_BASE = 0x400000
TOOLSET_STENCIL_OP_SEPARATE_PROC_POINTER_VA = 0x00D3DD6C
TOOLSET_GL_STENCIL_OP_SEPARATE_POINTER_VA = 0x00D12D20
TOOLSET_STENCIL_FACE_TABLE_VA = 0x00CC9A38
TOOLSET_STENCIL_OP_TABLE_VA = 0x00CC99D8
TOOLSET_RENDER_STATE_ENABLE_TABLE_VA = 0x00A6EFC4
TOOLSET_RENDER_STATE_DISABLE_TABLE_VA = 0x00A6F0F2
TOOLSET_RENDER_STATE_GL_ENABLE_WRAPPER_VA = 0x00B9BE70
TOOLSET_RENDER_STATE_GL_DISABLE_WRAPPER_VA = 0x00B9BE5E
TOOLSET_SHADOW_VOLUME_RENDER_STATE_SLOT = 3
GL_STENCIL_FACE_NAMES = {
    0x0404: "GL_FRONT",
    0x0405: "GL_BACK",
    0x0408: "GL_FRONT_AND_BACK",
}
GL_STENCIL_OP_NAMES = {
    0x0000: "GL_ZERO",
    0x1E00: "GL_KEEP",
    0x1E01: "GL_REPLACE",
    0x1E02: "GL_INCR",
    0x1E03: "GL_DECR",
    0x150A: "GL_INVERT",
    0x8507: "GL_INCR_WRAP",
    0x8508: "GL_DECR_WRAP",
}
GL_CAP_NAMES = {
    0x0BE2: "GL_BLEND",
    0x0B44: "GL_CULL_FACE",
    0x0B90: "GL_STENCIL_TEST",
    0x0B71: "GL_DEPTH_TEST",
    0x809D: "GL_MULTISAMPLE",
    0x0C11: "GL_SCISSOR_TEST",
    0x8037: "GL_POLYGON_OFFSET_FILL",
}
SHADOW_VOLUME_SOURCE_NEEDLES = {
    "shadowOpacityField": "ShadowOpacity",
    "shadowPlaneAlphaFunction": "FUN_00a82d8c",
    "runtimeExtentsFunction": "FUN_00a83fec",
    "shadowVolumeFunction": "FUN_00a878f8",
    "shadowVertexShader": "vs_shadowvol",
    "shadowFragmentShader": "fs_shadowvol",
    "casterDrawFunction": "FUN_00a78128",
}

SHADOW_VOLUME_LOCAL_DRAW_STATE_ORDER = [
    {
        "needle": "FUN_00a7818c(3)",
        "call": "FUN_00a7818c(3)",
        "role": "disable-render-state-slot-3-before-shadow-volume-traversal",
    },
    {
        "needle": "FUN_00a78344(0,0,0,3)",
        "call": "FUN_00a78344(0,0,0,3)",
        "role": "front-face-zpass-stencil-keep-keep-increment",
    },
    {
        "needle": "FUN_00a78344(1,0,0,4)",
        "call": "FUN_00a78344(1,0,0,4)",
        "role": "back-face-zpass-stencil-keep-keep-decrement",
    },
    {
        "needle": "FUN_00a780f0",
        "call": "FUN_00a780f0()",
        "role": "push-render-state-block-before-first-caster-draw",
    },
    {
        "needle": "FUN_00a785d4",
        "call": "FUN_00a785d4(light-matrix-pointer)",
        "role": "upload-shadow-light-transform",
    },
    {
        "needle": "FUN_00a788b0",
        "call": "FUN_00a788b0(DAT_00d0247c)",
        "role": "bind-vs_shadowvol-fs_shadowvol-program",
    },
    {
        "needle": "FUN_00a78994(0)",
        "call": "FUN_00a78994(0)",
        "role": "upload-shadow-volume-uniform-slot-0",
    },
    {
        "needle": "FUN_00a78980(1",
        "call": "FUN_00a78980(1,fVar2)",
        "role": "upload-shadow-volume-scalar-uniform-slot-1",
    },
    {
        "needle": "FUN_00a78128",
        "call": "FUN_00a78128(buffer0x58,buffer0x5c,4,count0x64,buffer0x68)",
        "role": "draw-caster-buffer-through-FUN_00a75e3c",
    },
    {
        "needle": "FUN_00a780e8",
        "call": "FUN_00a780e8()",
        "role": "pop-render-state-block-after-caster-draw",
    },
    {
        "needle": "FUN_00a7816c(3)",
        "call": "FUN_00a7816c(3)",
        "role": "restore-render-state-slot-3-after-shadow-volume-traversal",
    },
    {
        "needle": "FUN_00a78344(0,0,4,0)",
        "call": "FUN_00a78344(0,0,4,0)",
        "role": "front-face-zfail-stencil-keep-decrement-keep",
    },
    {
        "needle": "FUN_00a78344(1,0,3,0)",
        "call": "FUN_00a78344(1,0,3,0)",
        "role": "back-face-zfail-stencil-keep-increment-keep",
    },
]

SHADOW_VOLUME_LOCAL_BLEND_DEPTH_COLOR_MASK_NEEDLES = [
    "FUN_00a6f1ec",
    "FUN_00a6f3bc",
    "FUN_00a6f4f8",
    "FUN_00a6f518",
    "FUN_00a7819c",
    "FUN_00a78384",
    "glBlendFunc",
    "glDepthFunc",
    "glDepthMask",
    "glColorMask",
    "FUN_00a78724",
    "FUN_00a78734",
    "FUN_00a78750",
    "FUN_00a785bc",
    "FUN_00a78108",
]

SHADOW_VOLUME_BLEND_DEPTH_COLOR_MASK_FACADE_WINDOWS = [
    {
        "lineStart": 904153,
        "lineEnd": 904157,
        "function": "FUN_00a7819c",
        "target": "FUN_00a6f1ec",
        "semantic": "blendFunc",
    },
    {
        "lineStart": 904335,
        "lineEnd": 904339,
        "function": "FUN_00a78384",
        "target": "FUN_00a6f3bc",
        "semantic": "colorMask",
    },
    {
        "lineStart": 904542,
        "lineEnd": 904546,
        "function": "FUN_00a785bc",
        "target": "FUN_00a6f4f8",
        "semantic": "depthMask",
    },
    {
        "lineStart": 904686,
        "lineEnd": 904690,
        "function": "FUN_00a78724",
        "target": "FUN_00a6f518",
        "semantic": "depthFunc",
    },
]

LIGHT_MANAGER_ORDERING_SOURCE_NEEDLES = {
    "insertFunction": "FUN_00a4128c",
    "activeSortFunction": "FUN_00a4165c",
    "shadowSortFunction": "FUN_00a417bc",
    "scoreFunction": "FUN_00a41850",
    "uploadFunction": "FUN_00a41e50",
    "tileLightField": "Tile_MainLight1",
    "tileSourceLightCarrier": "fx_flame01",
    "tileSourceLightNode": "sourcelight1",
}

PROGFX_TYPE4_SOURCE_NEEDLES = {
    "visualEffectsTableLoader": "visualeffects",
    "param1TemplateField": "Param1",
    "param1ValueTemplateField": "Param1Value",
    "requiredParam1Field": "ReqParam1",
    "requiredParam2Field": "ReqParam2",
}

PROGFX_TYPE4_SCHEDULER_NEEDLES = [
    "progfx",
    "ProgFX",
    "progfx.2da",
    "fx_light_clr",
    "Blind_Vision",
    "Param3",
    "Param4",
    "Param5",
    "Param6",
    "Param7",
]

PROGFX_TYPE4_LOCAL_RESOURCE_NAMES = [
    "progfx.2da",
    "visualeffects.2da",
    "fx_light_clr.mdl",
    "fx_light_clr.mdb",
]

PROGFX_TYPE4_LOCAL_RESOURCE_INDEX_FILES = [
    Path("2da.csv"),
    Path("export/strings_2da.tsv"),
    Path("export/strings.tsv"),
    Path("item-retail-extract/2da-summary.json"),
    Path("item-retail-extract/extract-summary.json"),
]

PROGFX_TYPE4_LOCAL_RESOURCE_INDEX_NEEDLES = [
    "visualeffects",
    *PROGFX_TYPE4_SCHEDULER_NEEDLES,
]

CLIENT_VFX_FUNCTIONS = {
    "CNWCMessage::HandleServerToPlayerMessage": {
        "signature": "void __cdecl CNWCMessage::HandleServerToPlayerMessage(unsigned char *,unsigned int)",
        "va": 0x1407A41A0,
    },
    "CNWCMessage::HandleServerToPlayerGameObjectUpdate": {
        "signature": "int __cdecl CNWCMessage::HandleServerToPlayerGameObjectUpdate(unsigned char)",
        "va": 0x14079BCE0,
    },
    "CNWCMessage::HandleServerToPlayerGenericObjectUpdate_Update": {
        "signature": "int __cdecl CNWCMessage::HandleServerToPlayerGenericObjectUpdate_Update(unsigned int,unsigned int)",
        "va": 0x14079C050,
    },
    "CNWCMessage::HandleServerToPlayerCreatureUpdate_Update": {
        "signature": "int __cdecl CNWCMessage::HandleServerToPlayerCreatureUpdate_Update(unsigned int,unsigned int)",
        "va": 0x140781E80,
    },
    "CNWCMessage::HandleServerToPlayerUpdate_Update": {
        "signature": "int __cdecl CNWCMessage::HandleServerToPlayerUpdate_Update(void)",
        "va": 0x1407B8380,
    },
    "CNWCMessage::HandleServerToPlayerUpdateVisualEffects": {
        "signature": "int __cdecl CNWCMessage::HandleServerToPlayerUpdateVisualEffects(class CNWCObject *)",
        "va": 0x1407B1F00,
    },
    "CNWCObject::RefreshVisualEffects": {
        "signature": "int __cdecl CNWCObject::RefreshVisualEffects(int)",
        "va": 0x140763D60,
    },
    "CNWCAnimBaseVisualEffect::LoadModel": {
        "signature": "int __cdecl CNWCAnimBaseVisualEffect::LoadModel(class CResRef,unsigned char)",
        "va": 0x1409B2CB0,
    },
}

CLIENT_VFX_HELPER_NAMES = {
    0x1402D9630: "CNWMessage::ReadBYTE",
    0x1402DA450: "CNWMessage::ReadWORD",
    0x1402D9BC0: "CNWMessage::ReadDWORD",
    0x1402D9C30: "CNWMessage::ReadFLOAT",
    0x1407C4AB0: "client-build/satisfies-build-check-helper",
    0x1409737C0: "client-object-id-read-helper",
    0x140973160: "ObjectVisualTransformData::Read-client-helper",
    0x140968660: "CNWCVisualEffectOnObject::constructor-or-init-helper",
    0x140968810: "CNWCVisualEffectOnObject::post-load-helper",
    0x14096CF10: "CNWCVisualEffectOnObject::LoadVisualEffect-progfx-source-loader",
    0x140970E20: "CNWCVisualEffectOnObject::LoadVisualEffect-2da-row-loader",
    0x1409702E0: "CNWCVisualEffectOnObject::LoadVisualEffect-node-attach",
    0x14096C610: "CNWCVisualEffectOnObject::LoadVisualEffect-fx-light-loader-region",
    0x14096C180: "CNWCVisualEffectOnObject::runtime-state-helper",
    0x14096C450: "CNWCVisualEffectOnObject::runtime-scene-helper",
    0x140169030: "CExoLinkedListInternal::AddTail",
    0x1400931F0: "NewCAurObject",
}

CLIENT_VFX_MESSAGE_CHAIN = [
    {
        "from": "CNWCMessage::HandleServerToPlayerMessage",
        "to": "CNWCMessage::HandleServerToPlayerGameObjectUpdate",
        "expectedCallVa": 0x1407A4843,
    },
    {
        "from": "CNWCMessage::HandleServerToPlayerGameObjectUpdate",
        "to": "CNWCMessage::HandleServerToPlayerUpdate_Update",
        "expectedCallVa": 0x14079BE47,
    },
    {
        "from": "CNWCMessage::HandleServerToPlayerGenericObjectUpdate_Update",
        "to": "CNWCMessage::HandleServerToPlayerUpdateVisualEffects",
        "expectedCallVa": 0x14079CD60,
    },
    {
        "from": "CNWCMessage::HandleServerToPlayerCreatureUpdate_Update",
        "to": "CNWCMessage::HandleServerToPlayerUpdateVisualEffects",
        "expectedCallVa": 0x140782FB1,
    },
]

CLIENT_VFX_VTABLES = [
    (".?AVCNWCObject@@", 0x140E3BF58),
    (".?AVCNWCCreature@@", 0x140E474E8),
    (".?AVCNWCDoor@@", 0x140E52F68),
    (".?AVCNWCTrigger@@", 0x140E533F8),
    (".?AVCNWCPlaceable@@", 0x140E53950),
    (".?AVCNWCVisualEffect@@", 0x140E53E18),
    (".?AVCNWCAreaOfEffectObject@@", 0x140E72120),
    (".?AVCNWCItem@@", 0x140E4CEB0),
    (".?AVCNWCItem@@", 0x140E4CEC0),
]

CLIENT_VFX_STRING_NEEDLES = [
    "visualeffects.2da",
    "ProgFX_Impact",
    "ProgFX_Duration",
    "ProgFX_Cessation",
    "_impact",
    "_ground",
    "fxground",
    "fximpact",
    "fxhead",
    "fx_light",
    "CNWCVisualEffectOnObject::LoadVisualEffect: Failed to load ground node visual.",
    "CNWCVisualEffectOnObject::LoadVisualEffect: Failed to load impact node visual.",
    "CNWCVisualEffectOnObject::LoadVisualEffect: Failed to load head node visual.",
    "CNWCVisualEffect::LoadModel: Failed to load visual effect model.",
]


def read_u16(data: bytes, offset: int) -> int:
    return int.from_bytes(data[offset : offset + 2], "little")


def read_u32(data: bytes, offset: int) -> int:
    return int.from_bytes(data[offset : offset + 4], "little")


def read_u64(data: bytes, offset: int) -> int:
    return int.from_bytes(data[offset : offset + 8], "little")


def hx(value: int | None) -> str | None:
    return None if value is None else f"0x{value:x}"


def hx_signed(value: int | None) -> str | None:
    if value is None:
        return None
    return f"-0x{abs(value):x}" if value < 0 else hx(value)


class PeImage:
    def __init__(self, path: Path) -> None:
        self.path = path
        self.data = path.read_bytes()
        pe_offset = read_u32(self.data, 0x3C)
        number_of_sections = read_u16(self.data, pe_offset + 6)
        optional_header_size = read_u16(self.data, pe_offset + 20)
        optional_header_offset = pe_offset + 24
        magic = read_u16(self.data, optional_header_offset)
        is_pe32_plus = magic == 0x20B
        self.image_base = (
            read_u64(self.data, optional_header_offset + 24)
            if is_pe32_plus
            else read_u32(self.data, optional_header_offset + 28)
        )
        data_directory_offset = optional_header_offset + (112 if is_pe32_plus else 96)
        self.export_rva = read_u32(self.data, data_directory_offset)
        section_offset = optional_header_offset + optional_header_size
        self.sections = []
        for index in range(number_of_sections):
            offset = section_offset + index * 40
            name = self.data[offset : offset + 8].split(b"\0", 1)[0].decode("ascii", "replace")
            self.sections.append(
                {
                    "name": name,
                    "virtual_size": read_u32(self.data, offset + 8),
                    "virtual_address": read_u32(self.data, offset + 12),
                    "raw_size": read_u32(self.data, offset + 16),
                    "raw_pointer": read_u32(self.data, offset + 20),
                }
            )
        self.exports = self._parse_exports()
        self.pdata = self._parse_pdata()

    def rva_to_offset(self, rva: int) -> int | None:
        for section in self.sections:
            start = section["virtual_address"]
            size = max(section["virtual_size"], section["raw_size"])
            if start <= rva < start + size:
                return section["raw_pointer"] + (rva - start)
        return None

    def offset_to_rva(self, offset: int) -> int | None:
        for section in self.sections:
            start = section["raw_pointer"]
            if start <= offset < start + section["raw_size"]:
                return section["virtual_address"] + (offset - start)
        return None

    def _parse_exports(self) -> list[dict[str, int | str]]:
        export_offset = self.rva_to_offset(self.export_rva)
        if export_offset is None:
            return []
        number_of_functions = read_u32(self.data, export_offset + 20)
        number_of_names = read_u32(self.data, export_offset + 24)
        functions_offset = self.rva_to_offset(read_u32(self.data, export_offset + 28))
        names_offset = self.rva_to_offset(read_u32(self.data, export_offset + 32))
        ordinals_offset = self.rva_to_offset(read_u32(self.data, export_offset + 36))
        if functions_offset is None or names_offset is None or ordinals_offset is None:
            return []
        exports = []
        for index in range(number_of_names):
            name_rva = read_u32(self.data, names_offset + index * 4)
            name_offset = self.rva_to_offset(name_rva)
            if name_offset is None:
                continue
            end = self.data.find(b"\0", name_offset)
            name = self.data[name_offset:end].decode("ascii", "replace")
            ordinal_index = read_u16(self.data, ordinals_offset + index * 2)
            if ordinal_index >= number_of_functions:
                continue
            function_rva = read_u32(self.data, functions_offset + ordinal_index * 4)
            exports.append({"name": name, "rva": function_rva, "va": self.image_base + function_rva})
        return exports

    def _parse_pdata(self) -> list[dict[str, int]]:
        section = next((entry for entry in self.sections if entry["name"] == ".pdata"), None)
        if section is None:
            return []
        entries = []
        start = section["raw_pointer"]
        end = start + section["raw_size"]
        for offset in range(start, end - 11, 12):
            begin_rva = read_u32(self.data, offset)
            end_rva = read_u32(self.data, offset + 4)
            unwind_rva = read_u32(self.data, offset + 8)
            if begin_rva or end_rva:
                entries.append({"begin_rva": begin_rva, "end_rva": end_rva, "unwind_rva": unwind_rva})
        return entries

    def find_function_entry(self, rva: int) -> dict[str, int] | None:
        return next((entry for entry in self.pdata if entry["begin_rva"] <= rva < entry["end_rva"]), None)

    def find_ascii_needles(self) -> dict[int, str]:
        found: dict[int, str] = {}
        for needle in STRING_NEEDLES:
            raw = needle.encode("ascii") + b"\0"
            offset = self.data.find(raw)
            while offset >= 0:
                rva = self.offset_to_rva(offset)
                if rva is not None:
                    found[self.image_base + rva] = needle
                offset = self.data.find(raw, offset + 1)
        return found


def disassemble_linear_fallback(image: PeImage, rva: int, max_bytes: int = 96) -> tuple[int, bytes, list[str]]:
    begin_offset = image.rva_to_offset(rva)
    if begin_offset is None:
        return rva, b"", []
    section = next(
        (
            entry
            for entry in image.sections
            if entry["virtual_address"] <= rva < entry["virtual_address"] + max(entry["virtual_size"], entry["raw_size"])
        ),
        None,
    )
    section_end_offset = (
        section["raw_pointer"] + section["raw_size"] if section is not None else begin_offset + max_bytes
    )
    sample = image.data[begin_offset : min(begin_offset + max_bytes, section_end_offset)]
    md = Cs(CS_ARCH_X86, CS_MODE_64)
    instructions: list[str] = []
    end_va = image.image_base + rva
    for insn in md.disasm(sample, image.image_base + rva):
        instructions.append(f"{hx(insn.address)} {insn.mnemonic} {insn.op_str}".rstrip())
        end_va = insn.address + insn.size
        if insn.mnemonic in {"ret", "jmp"}:
            break
    end_rva = end_va - image.image_base
    code = image.data[begin_offset : begin_offset + max(0, end_rva - rva)]
    return end_rva, code, instructions


def disassemble_until_ret(image: PeImage, rva: int, max_bytes: int = 768) -> tuple[int, bytes, list[str]]:
    begin_offset = image.rva_to_offset(rva)
    if begin_offset is None:
        return rva, b"", []
    section = next(
        (
            entry
            for entry in image.sections
            if entry["virtual_address"] <= rva < entry["virtual_address"] + max(entry["virtual_size"], entry["raw_size"])
        ),
        None,
    )
    section_end_offset = section["raw_pointer"] + section["raw_size"] if section is not None else begin_offset + max_bytes
    sample = image.data[begin_offset : min(begin_offset + max_bytes, section_end_offset)]
    md = Cs(CS_ARCH_X86, CS_MODE_64)
    instructions: list[str] = []
    end_va = image.image_base + rva
    for insn in md.disasm(sample, image.image_base + rva):
        instructions.append(f"{hx(insn.address)} {insn.mnemonic} {insn.op_str}".rstrip())
        end_va = insn.address + insn.size
        if insn.mnemonic == "ret":
            break
    end_rva = end_va - image.image_base
    code = image.data[begin_offset : begin_offset + max(0, end_rva - rva)]
    return end_rva, code, instructions


REGISTER_ALIASES = {
    "eax": "rax",
    "ax": "rax",
    "al": "rax",
    "ebx": "rbx",
    "bx": "rbx",
    "bl": "rbx",
    "ecx": "rcx",
    "cx": "rcx",
    "cl": "rcx",
    "edx": "rdx",
    "dx": "rdx",
    "dl": "rdx",
    "esi": "rsi",
    "sil": "rsi",
    "edi": "rdi",
    "dil": "rdi",
    "ebp": "rbp",
    "bpl": "rbp",
    "esp": "rsp",
    "spl": "rsp",
}
for register_index in range(8, 16):
    REGISTER_ALIASES[f"r{register_index}d"] = f"r{register_index}"
    REGISTER_ALIASES[f"r{register_index}w"] = f"r{register_index}"
    REGISTER_ALIASES[f"r{register_index}b"] = f"r{register_index}"


def normalized_register_name(insn, register_id: int) -> str:
    name = insn.reg_name(register_id)
    return REGISTER_ALIASES.get(name, name)


def update_constant_registers(insn, constants: dict[str, int]) -> None:
    if not insn.operands or insn.operands[0].type != X86_OP_REG:
        return
    destination = normalized_register_name(insn, insn.operands[0].reg)
    if insn.mnemonic == "xor" and len(insn.operands) == 2 and insn.operands[1].type == X86_OP_REG:
        source = normalized_register_name(insn, insn.operands[1].reg)
        if source == destination:
            constants[destination] = 0
            return
    if insn.mnemonic == "mov" and len(insn.operands) == 2:
        source_operand = insn.operands[1]
        if source_operand.type == X86_OP_IMM:
            constants[destination] = int(source_operand.imm)
            return
        if source_operand.type == X86_OP_REG:
            source = normalized_register_name(insn, source_operand.reg)
            if source in constants:
                constants[destination] = constants[source]
            else:
                constants.pop(destination, None)
            return
    if insn.mnemonic == "lea" and len(insn.operands) == 2 and insn.operands[1].type == X86_OP_MEM:
        mem = insn.operands[1].mem
        base_name = normalized_register_name(insn, mem.base) if mem.base else None
        index_name = normalized_register_name(insn, mem.index) if mem.index else None
        if base_name in constants and (not index_name or index_name in constants):
            constants[destination] = constants[base_name] + (
                0 if not index_name else constants[index_name] * int(mem.scale)
            ) + int(mem.disp)
            return
    if insn.mnemonic not in {"cmp", "test", "call"}:
        constants.pop(destination, None)


def read_mov_ebx_immediate_at(image: PeImage, va: int) -> int | None:
    offset = image.rva_to_offset(va - image.image_base)
    if offset is None:
        return None
    md = Cs(CS_ARCH_X86, CS_MODE_64)
    md.detail = True
    for insn in md.disasm(image.data[offset : offset + 16], va):
        if (
            insn.mnemonic == "mov"
            and len(insn.operands) == 2
            and insn.operands[0].reg == X86_REG_EBX
            and insn.operands[1].type == X86_OP_IMM
        ):
            return int(insn.operands[1].imm)
        if insn.mnemonic in {"jmp", "ret"}:
            return None
    return None


def va_to_offset(image: PeImage, va: int) -> int | None:
    return image.rva_to_offset(va - image.image_base)


def rebase_retail_va(image: PeImage, va: int) -> int:
    return image.image_base + (va - RETAIL_DEFAULT_IMAGE_BASE)


def rebase_toolset_va(image: PeImage, va: int) -> int:
    return image.image_base + (va - TOOLSET_DEFAULT_IMAGE_BASE)


def rebase_retail_target_map(image: PeImage, targets: dict[int, str]) -> dict[int, str]:
    return {rebase_retail_va(image, va): name for va, name in targets.items()}


def read_u32_va(image: PeImage, va: int) -> int | None:
    offset = va_to_offset(image, va)
    if offset is None or offset + 4 > len(image.data):
        return None
    return read_u32(image.data, offset)


def read_bytes_va(image: PeImage, va: int, count: int) -> bytes | None:
    offset = va_to_offset(image, va)
    if offset is None or offset + count > len(image.data):
        return None
    return image.data[offset : offset + count]


def read_u64_va(image: PeImage, va: int) -> int | None:
    offset = va_to_offset(image, va)
    if offset is None or offset + 8 > len(image.data):
        return None
    return read_u64(image.data, offset)


def read_ascii_c_string(image: PeImage, va: int, max_bytes: int = 512) -> str | None:
    offset = va_to_offset(image, va)
    if offset is None:
        return None
    end = image.data.find(b"\0", offset, min(len(image.data), offset + max_bytes))
    if end < 0 or end == offset:
        return None
    try:
        value = image.data[offset:end].decode("ascii")
    except UnicodeDecodeError:
        return None
    if any(ord(char) < 0x20 and char not in "\t\r\n" for char in value):
        return None
    return value


def find_ascii_string_va(image: PeImage, text: str) -> int | None:
    raw = text.encode("ascii") + b"\0"
    offset = image.data.find(raw)
    if offset < 0:
        raw = text.encode("ascii")
        offset = image.data.find(raw)
    if offset < 0:
        return None
    rva = image.offset_to_rva(offset)
    return image.image_base + rva if rva is not None else None


def find_signature_metadata_record(image: PeImage, signature: str) -> dict[str, object] | None:
    signature_va = find_ascii_string_va(image, signature)
    if signature_va is None:
        return None

    raw = signature_va.to_bytes(8, "little")
    offset = image.data.find(raw)
    while offset >= 0:
        # Observed retail PGO metadata can be either [sig,file,line] or
        # [0,sig,file,line]. Prefer the full aligned record when present.
        for base_offset in (offset - 8, offset):
            if base_offset < 0:
                continue
            record_rva = image.offset_to_rva(base_offset)
            if record_rva is None or section_name_for_offset(image, base_offset) != ".rdata":
                continue
            maybe_zero = read_u64(image.data, base_offset)
            maybe_sig = read_u64(image.data, base_offset + 8)
            if maybe_zero == 0 and maybe_sig == signature_va:
                file_va = read_u64(image.data, base_offset + 16)
                line = read_u32(image.data, base_offset + 24)
                source_file = read_ascii_c_string(image, file_va)
                return {
                    "recordVa": hx(image.image_base + record_rva),
                    "signatureVa": hx(signature_va),
                    "signature": signature,
                    "sourceFileVa": hx(file_va),
                    "sourceFile": source_file,
                    "line": line,
                    "layout": "[0,signature,file,line]",
                }
            maybe_sig = read_u64(image.data, base_offset)
            if maybe_sig == signature_va:
                file_va = read_u64(image.data, base_offset + 8)
                line = read_u32(image.data, base_offset + 16)
                source_file = read_ascii_c_string(image, file_va)
                return {
                    "recordVa": hx(image.image_base + record_rva),
                    "signatureVa": hx(signature_va),
                    "signature": signature,
                    "sourceFileVa": hx(file_va),
                    "sourceFile": source_file,
                    "line": line,
                    "layout": "[signature,file,line]",
                }
        offset = image.data.find(raw, offset + 1)
    return {
        "signatureVa": hx(signature_va),
        "signature": signature,
        "proofStatus": "signature-string-found-no-pgo-record",
    }


def get_function_code_by_va(
    image: PeImage, va: int, max_linear_bytes: int = 0x4000
) -> tuple[int, int, bytes, str]:
    rva = va - image.image_base
    entry = image.find_function_entry(rva)
    if entry is not None:
        begin_rva = entry["begin_rva"]
        end_rva = entry["end_rva"]
        begin_offset = image.rva_to_offset(begin_rva)
        end_offset = image.rva_to_offset(end_rva)
        if begin_offset is not None and end_offset is not None and end_offset > begin_offset:
            return (
                image.image_base + begin_rva,
                image.image_base + end_rva,
                image.data[begin_offset:end_offset],
                ".pdata",
            )
    end_rva, code, _ = disassemble_until_ret(image, rva, max_bytes=max_linear_bytes)
    return va, image.image_base + end_rva, code, "linear-ret-scan"


def disassemble_function_by_va(
    image: PeImage, va: int, max_linear_bytes: int = 0x4000
) -> tuple[int, int, list[object], str]:
    begin_va, end_va, code, range_source = get_function_code_by_va(image, va, max_linear_bytes)
    md = Cs(CS_ARCH_X86, CS_MODE_64)
    md.detail = True
    return begin_va, end_va, list(md.disasm(code, begin_va)), range_source


def disassemble_linear_region_by_va(
    image: PeImage, va: int, byte_count: int
) -> tuple[int, int, list[object], str]:
    offset = va_to_offset(image, va)
    if offset is None:
        return va, va, [], "linear-fixed-window-missing"
    code = image.data[offset : min(len(image.data), offset + byte_count)]
    md = Cs(CS_ARCH_X86, CS_MODE_64)
    md.detail = True
    return va, va + len(code), list(md.disasm(code, va)), "linear-fixed-window"


def collect_direct_call_sites(instructions: list[object], known_targets: dict[int, str]) -> list[dict[str, object]]:
    calls = []
    for insn in instructions:
        if insn.mnemonic == "call" and insn.operands and insn.operands[0].type == X86_OP_IMM:
            target = int(insn.operands[0].imm)
            if target in known_targets:
                calls.append(
                    {
                        "at": hx(insn.address),
                        "targetVa": hx(target),
                        "target": known_targets[target],
                    }
                )
    return calls


def collect_rip_string_refs(
    instructions: list[object], string_by_va: dict[int, str]
) -> list[dict[str, object]]:
    refs = []
    for insn in instructions:
        for operand in insn.operands:
            if operand.type == X86_OP_MEM and operand.mem.base == X86_REG_RIP:
                target = insn.address + insn.size + operand.mem.disp
                string_value = string_by_va.get(target)
                if string_value is not None:
                    refs.append(
                        {
                            "at": hx(insn.address),
                            "targetVa": hx(target),
                            "string": string_value,
                        }
                    )
    return refs


def section_name_for_offset(image: PeImage, offset: int) -> str | None:
    section = next(
        (
            entry
            for entry in image.sections
            if entry["raw_pointer"] <= offset < entry["raw_pointer"] + entry["raw_size"]
        ),
        None,
    )
    return None if section is None else str(section["name"])


def executable_code_sections(image: PeImage) -> list[dict[str, int | str]]:
    text_sections = [
        entry
        for entry in image.sections
        if str(entry["name"]).lower().startswith(".text")
        or str(entry["name"]).lower() == "code"
    ]
    if text_sections:
        return text_sections
    return [entry for entry in image.sections if int(entry["raw_size"]) > 0]


def scan_relative_call_xrefs(
    image: PeImage,
    targets: dict[int, str],
    max_hits_per_target: int = 64,
) -> list[dict[str, object]]:
    if not targets:
        return []

    hits: list[dict[str, object]] = []
    hit_counts: dict[int, int] = {}
    for section in executable_code_sections(image):
        start = int(section["raw_pointer"])
        end = min(len(image.data), start + int(section["raw_size"]))
        section_va = image.image_base + int(section["virtual_address"])
        for offset in range(start, max(start, end - 4)):
            if image.data[offset] != 0xE8:
                continue
            call_va = section_va + (offset - start)
            rel = int.from_bytes(image.data[offset + 1 : offset + 5], "little", signed=True)
            target_va = call_va + 5 + rel
            target_name = targets.get(target_va)
            if target_name is None:
                continue
            hit_counts[target_va] = hit_counts.get(target_va, 0) + 1
            if hit_counts[target_va] > max_hits_per_target:
                continue
            rva = call_va - image.image_base
            entry = image.find_function_entry(rva)
            hits.append(
                {
                    "at": hx(call_va),
                    "target": target_name,
                    "targetVa": hx(target_va),
                    "functionBeginVa": hx(image.image_base + entry["begin_rva"]) if entry else None,
                    "functionEndVa": hx(image.image_base + entry["end_rva"]) if entry else None,
                    "scan": "x64-e8-rel32",
                }
            )
    return hits


def summarize_direct_call_xrefs_by_target(
    xrefs: list[dict[str, object]],
    max_targets: int = 32,
    max_callers_per_target: int = 8,
    max_call_sites_per_caller: int = 8,
) -> list[dict[str, object]]:
    grouped: dict[tuple[str, str], dict[str, object]] = {}
    for xref in xrefs:
        key = (str(xref["target"]), str(xref["targetVa"]))
        group = grouped.setdefault(
            key,
            {
                "target": key[0],
                "targetVa": key[1],
                "callCount": 0,
                "_callers": {},
            },
        )
        group["callCount"] = int(group["callCount"]) + 1
        caller_key = (
            xref.get("functionBeginVa"),
            xref.get("functionEndVa"),
        )
        callers = group["_callers"]
        caller = callers.setdefault(
            caller_key,
            {
                "functionBeginVa": caller_key[0],
                "functionEndVa": caller_key[1],
                "callSites": [],
            },
        )
        if len(caller["callSites"]) < max_call_sites_per_caller:
            caller["callSites"].append(xref["at"])

    summary: list[dict[str, object]] = []
    for group in grouped.values():
        callers = list(group["_callers"].values())
        callers.sort(
            key=lambda caller: (
                str(caller.get("functionBeginVa")),
                str(caller.get("functionEndVa")),
            )
        )
        summary.append(
            {
                "target": group["target"],
                "targetVa": group["targetVa"],
                "callCount": group["callCount"],
                "callerFunctionCount": len(callers),
                "sampleCallerFunctions": callers[:max_callers_per_target],
            }
        )

    summary.sort(key=lambda group: (-int(group["callCount"]), str(group["target"])))
    return summary[:max_targets]


def known_requested_export_targets(image: PeImage) -> dict[int, str]:
    return {
        int(entry["va"]): REQUESTED_SYMBOLS.get(str(entry["name"]), str(entry["name"]))
        for entry in image.exports
        if str(entry["name"]) in REQUESTED_SYMBOLS or "LightManager" in str(entry["name"])
    }


def scan_relative_call_xrefs_in_rva_range(
    image: PeImage,
    targets: dict[int, str],
    begin_rva: int,
    end_rva: int,
    max_hits: int = 64,
) -> list[dict[str, object]]:
    if not targets or end_rva <= begin_rva:
        return []
    begin_offset = image.rva_to_offset(begin_rva)
    end_offset = image.rva_to_offset(end_rva)
    if begin_offset is None or end_offset is None:
        return []
    begin_offset = max(0, begin_offset)
    end_offset = min(len(image.data), end_offset)
    hits: list[dict[str, object]] = []
    for offset in range(begin_offset, max(begin_offset, end_offset - 4)):
        if image.data[offset] != 0xE8:
            continue
        call_rva = begin_rva + (offset - begin_offset)
        call_va = image.image_base + call_rva
        rel = int.from_bytes(image.data[offset + 1 : offset + 5], "little", signed=True)
        target_va = call_va + 5 + rel
        target_name = targets.get(target_va)
        if target_name is None:
            continue
        hits.append(
            {
                "at": hx(call_va),
                "target": target_name,
                "targetVa": hx(target_va),
                "functionBeginVa": hx(image.image_base + begin_rva),
                "functionEndVa": hx(image.image_base + end_rva),
                "scan": "x64-e8-rel32-function-range",
            }
        )
        if len(hits) >= max_hits:
            break
    return hits


def classify_client_vfx_target_families(xrefs: list[dict[str, object]]) -> list[str]:
    targets = {str(xref["target"]) for xref in xrefs}
    families: list[tuple[str, bool]] = [
        ("message-readers", any(target.startswith("CNWMessage::Read") for target in targets)),
        (
            "visual-transform-reader",
            "ObjectVisualTransformData::Read-client-helper" in targets,
        ),
        (
            "client-vfx-object-vtable-add-remove",
            any("client-vslot" in target for target in targets),
        ),
        (
            "looping-vfx-list-attach",
            "CExoLinkedListInternal::AddTail" in targets,
        ),
        (
            "progfx-source-loader",
            "CNWCVisualEffectOnObject::LoadVisualEffect-progfx-source-loader" in targets,
        ),
        (
            "vfx-2da-row-loader",
            "CNWCVisualEffectOnObject::LoadVisualEffect-2da-row-loader" in targets,
        ),
        (
            "fx-light-loader-region",
            "CNWCVisualEffectOnObject::LoadVisualEffect-fx-light-loader-region" in targets,
        ),
        (
            "aurora-object-gob-construction",
            "NewCAurObject" in targets,
        ),
        (
            "runtime-state-scene-helpers",
            any(
                target
                in {
                    "CNWCVisualEffectOnObject::runtime-state-helper",
                    "CNWCVisualEffectOnObject::runtime-scene-helper",
                }
                for target in targets
            ),
        ),
        (
            "visual-effect-model-loader",
            "CNWCAnimBaseVisualEffect::LoadModel" in targets,
        ),
    ]
    return [name for name, present in families if present]


def scan_absolute_address_refs(
    image: PeImage,
    targets: dict[int, str],
    max_hits_per_target: int = 64,
) -> list[dict[str, object]]:
    refs: list[dict[str, object]] = []
    for target_va, target_name in targets.items():
        raw = target_va.to_bytes(8, "little")
        hit_count = 0
        offset = image.data.find(raw)
        while offset >= 0:
            hit_count += 1
            if hit_count <= max_hits_per_target:
                rva = image.offset_to_rva(offset)
                refs.append(
                    {
                        "target": target_name,
                        "targetVa": hx(target_va),
                        "refVa": hx(image.image_base + rva) if rva is not None else None,
                        "section": section_name_for_offset(image, offset),
                        "scan": "absolute-va-u64",
                    }
                )
            offset = image.data.find(raw, offset + 1)
    return refs


def parse_hex_int(value: object) -> int | None:
    if not isinstance(value, str):
        return None
    try:
        return int(value, 16)
    except ValueError:
        return None


def scan_light_manager_rdata_vtable_cluster(
    image: PeImage,
    absolute_address_refs: list[dict[str, object]],
    requested_light_targets: dict[int, str],
) -> dict[str, object] | None:
    rdata_refs = [
        ref
        for ref in absolute_address_refs
        if ref.get("section") == ".rdata" and parse_hex_int(ref.get("refVa")) is not None
    ]
    if not rdata_refs:
        return None

    sorted_refs = sorted(rdata_refs, key=lambda ref: parse_hex_int(ref.get("refVa")) or 0)
    ref_vas = [
        ref_va
        for ref_va in (parse_hex_int(ref.get("refVa")) for ref in sorted_refs)
        if ref_va is not None
    ]
    contiguous = all(
        ref_vas[index] - ref_vas[index - 1] == 8 for index in range(1, len(ref_vas))
    )
    requested_names = set(requested_light_targets.values())
    requested_slots = [ref for ref in sorted_refs if ref.get("target") in requested_names]
    light_manager_string_va = find_ascii_string_va(image, "LightManager")
    cluster_begin = ref_vas[0]
    cluster_end = ref_vas[-1]

    return {
        "proofStatus": (
            "retail-binary-backed-lightmanager-core-methods-rdata-vtable-cluster-no-direct-callsite"
            if len(requested_slots) == len(requested_light_targets) and contiguous
            else "partial-lightmanager-rdata-vtable-cluster"
        ),
        "clusterBeginVa": hx(cluster_begin),
        "clusterEndVa": hx(cluster_end),
        "slotStrideBytes": 8,
        "slotCount": len(sorted_refs),
        "contiguousSlots": contiguous,
        "requestedCoreSlotCount": len(requested_slots),
        "requestedCoreSlots": [
            {
                "slotVa": ref.get("refVa"),
                "target": ref.get("target"),
                "targetVa": ref.get("targetVa"),
            }
            for ref in requested_slots
        ],
        "slots": [
            {
                "slotVa": ref.get("refVa"),
                "target": ref.get("target"),
                "targetVa": ref.get("targetVa"),
            }
            for ref in sorted_refs
        ],
        "lightManagerNameStringVa": hx(light_manager_string_va) if light_manager_string_va else None,
        "lightManagerNameDistanceBytes": (
            light_manager_string_va - cluster_begin
            if light_manager_string_va is not None and cluster_begin <= light_manager_string_va
            else None
        ),
        "remainingBlockedSemantics": [
            "vtable cluster proves exported LightManager virtual slots, not lane owner call-sites",
            "no direct or indirect dispatch data-flow from tile/placeable/MDL/item/VFX lanes into the vtable cluster is recovered",
        ],
    }


def scan_light_manager_indirect_vtable_slot_calls(
    image: PeImage,
    vtable_cluster_evidence: dict[str, object] | None,
    max_candidates_per_slot: int = 48,
) -> dict[str, object]:
    if not vtable_cluster_evidence:
        return {
            "proofStatus": "blocked-lightmanager-vtable-cluster-missing-indirect-call-scan",
            "candidateCount": 0,
            "slotCandidates": [],
            "remainingBlockedSemantics": [
                "LightManager vtable cluster is missing, so slot offsets cannot be derived",
            ],
        }

    cluster_begin = parse_hex_int(vtable_cluster_evidence.get("clusterBeginVa"))
    requested_slots = vtable_cluster_evidence.get("requestedCoreSlots")
    if cluster_begin is None or not isinstance(requested_slots, list):
        return {
            "proofStatus": "blocked-lightmanager-vtable-slot-offsets-unavailable",
            "candidateCount": 0,
            "slotCandidates": [],
            "remainingBlockedSemantics": [
                "LightManager vtable cluster did not expose parseable requested core slots",
            ],
        }

    slot_targets: dict[int, dict[str, object]] = {}
    for slot in requested_slots:
        if not isinstance(slot, dict):
            continue
        slot_va = parse_hex_int(slot.get("slotVa"))
        target = slot.get("target")
        if slot_va is None or not isinstance(target, str):
            continue
        slot_targets[slot_va - cluster_begin] = {
            "target": target,
            "slotVa": slot.get("slotVa"),
            "targetVa": slot.get("targetVa"),
        }
    if not slot_targets:
        return {
            "proofStatus": "blocked-lightmanager-vtable-slot-offsets-unavailable",
            "candidateCount": 0,
            "slotCandidates": [],
            "remainingBlockedSemantics": [
                "LightManager vtable cluster did not expose requested core slot offsets",
            ],
        }

    slot_candidates: dict[int, dict[str, object]] = {
        slot_offset: {
            "slotOffset": hx(slot_offset),
            "target": slot_info["target"],
            "slotVa": slot_info["slotVa"],
            "targetVa": slot_info["targetVa"],
            "candidateCount": 0,
            "samples": [],
        }
        for slot_offset, slot_info in slot_targets.items()
    }
    base_register_names = ["rax", "rcx", "rdx", "rbx", "rsp", "rbp", "rsi", "rdi"]
    known_targets = known_requested_export_targets(image)
    for section in executable_code_sections(image):
        start = int(section["raw_pointer"])
        end = min(len(image.data), start + int(section["raw_size"]))
        section_va = image.image_base + int(section["virtual_address"])
        offset = start
        while offset + 2 < end:
            rex_prefix = image.data[offset] if 0x40 <= image.data[offset] <= 0x4f else None
            opcode_offset = offset + 1 if rex_prefix is not None else offset
            if opcode_offset + 1 >= end or image.data[opcode_offset] != 0xFF:
                offset += 1
                continue
            modrm = image.data[opcode_offset + 1]
            reg_opcode = (modrm >> 3) & 0x7
            if reg_opcode != 2:
                offset += 1
                continue
            mod = (modrm >> 6) & 0x3
            rm = modrm & 0x7
            if mod == 3 or rm == 4:
                offset += 1
                continue
            if mod == 0:
                if rm == 5:
                    offset += 1
                    continue
                slot_offset = 0
                instruction_size = (opcode_offset - offset) + 2
            elif mod == 1:
                if opcode_offset + 2 >= end:
                    offset += 1
                    continue
                slot_offset = int.from_bytes(
                    image.data[opcode_offset + 2 : opcode_offset + 3], "little", signed=True
                )
                instruction_size = (opcode_offset - offset) + 3
            else:
                if opcode_offset + 5 >= end:
                    offset += 1
                    continue
                slot_offset = int.from_bytes(
                    image.data[opcode_offset + 2 : opcode_offset + 6], "little", signed=True
                )
                instruction_size = (opcode_offset - offset) + 6
            slot_candidate = slot_candidates.get(slot_offset)
            if slot_candidate is None:
                offset += 1
                continue
            slot_candidate["candidateCount"] = int(slot_candidate["candidateCount"]) + 1
            samples = slot_candidate["samples"]
            if len(samples) >= max_candidates_per_slot:
                offset += max(1, instruction_size)
                continue
            call_va = section_va + (offset - start)
            entry = image.find_function_entry(call_va - image.image_base)
            function_direct_xrefs: list[dict[str, object]] = []
            if entry:
                function_direct_xrefs = scan_relative_call_xrefs_in_rva_range(
                    image,
                    known_targets,
                    int(entry["begin_rva"]),
                    int(entry["end_rva"]),
                    max_hits=64,
                )
            base_register_index = rm + (8 if rex_prefix is not None and rex_prefix & 0x1 else 0)
            base_register = (
                f"r{base_register_index}"
                if base_register_index >= 8
                else base_register_names[base_register_index]
            )
            slot_operand = (
                f"[{base_register}]"
                if slot_offset == 0
                else f"[{base_register} + {hx(slot_offset)}]"
            )
            samples.append(
                {
                    "at": hx(call_va),
                    "instruction": f"call qword ptr {slot_operand}",
                    "baseRegister": base_register,
                    "indexRegister": None,
                    "functionBeginVa": hx(image.image_base + entry["begin_rva"]) if entry else None,
                    "functionEndVa": hx(image.image_base + entry["end_rva"]) if entry else None,
                    "functionKnownDirectCallCount": len(function_direct_xrefs),
                    "functionKnownDirectCallTargetSummary": summarize_direct_call_xrefs_by_target(
                        function_direct_xrefs,
                        max_targets=12,
                        max_callers_per_target=2,
                        max_call_sites_per_caller=4,
                    ),
                    "scan": "capstone-free-x64-ff-2-call-mem-disp-slot",
                }
            )
            offset += max(1, instruction_size)

    candidate_count = sum(int(entry["candidateCount"]) for entry in slot_candidates.values())
    sampled_candidates = [
        sample
        for entry in slot_candidates.values()
        for sample in entry["samples"]
        if isinstance(sample, dict)
    ]
    sampled_candidates_with_known_direct_context = [
        sample
        for sample in sampled_candidates
        if int(sample.get("functionKnownDirectCallCount") or 0) > 0
    ]
    sampled_context_target_counts: dict[str, int] = {}
    for sample in sampled_candidates_with_known_direct_context:
        for group in sample.get("functionKnownDirectCallTargetSummary", []):
            if not isinstance(group, dict):
                continue
            target = str(group.get("target"))
            sampled_context_target_counts[target] = sampled_context_target_counts.get(
                target, 0
            ) + int(group.get("callCount") or 0)
    sampled_context_target_summary = [
        {"target": target, "callCount": count}
        for target, count in sorted(
            sampled_context_target_counts.items(),
            key=lambda item: (-item[1], item[0]),
        )
    ]
    return {
        "proofStatus": (
            "capstone-free-lightmanager-vtable-slot-indirect-call-candidates-register-dataflow-blocked"
            if candidate_count > 0
            else "blocked-no-lightmanager-vtable-slot-indirect-call-candidates"
        ),
        "candidateCount": candidate_count,
        "sampledCandidateCount": len(sampled_candidates),
        "sampledCandidatesWithKnownDirectCallContextCount": len(
            sampled_candidates_with_known_direct_context
        ),
        "sampledKnownDirectCallTargetSummary": sampled_context_target_summary[:16],
        "slotCandidates": list(slot_candidates.values()),
        "remainingBlockedSemantics": [
            "indirect calls by vtable slot offset are generic dispatch candidates; register receiver type is not proven",
            "same-function direct-call target summaries are context inventory only and do not prove the indirect receiver type",
            "no data-flow ties these candidates to terrain tile, placeable, source MDL, item-property, or ProgFX light lane owners",
        ],
    }


def scan_light_manager_xrefs(image: PeImage, requested: list[dict[str, int | str]]) -> dict[str, object] | None:
    requested_light_targets = {
        int(entry["va"]): REQUESTED_SYMBOLS.get(str(entry["name"]), str(entry["name"]))
        for entry in requested
        if REQUESTED_SYMBOLS.get(str(entry["name"]), "").startswith("LightManager::")
    }
    light_targets = dict(requested_light_targets)
    for entry in image.exports:
        raw_name = str(entry["name"])
        if "LightManager" not in raw_name:
            continue
        target_va = int(entry["va"])
        target_offset = va_to_offset(image, target_va)
        if target_offset is None or section_name_for_offset(image, target_offset) != ".text":
            continue
        light_targets.setdefault(target_va, REQUESTED_SYMBOLS.get(raw_name, raw_name))
    if not light_targets:
        return None

    direct_call_xrefs = scan_relative_call_xrefs(image, light_targets)
    direct_call_target_summary = summarize_direct_call_xrefs_by_target(direct_call_xrefs)
    requested_direct_call_xrefs = [
        entry
        for entry in direct_call_xrefs
        if entry["target"] in set(requested_light_targets.values())
    ]
    requested_direct_call_target_summary = summarize_direct_call_xrefs_by_target(
        requested_direct_call_xrefs
    )
    absolute_address_refs = scan_absolute_address_refs(image, light_targets)
    vtable_cluster_evidence = scan_light_manager_rdata_vtable_cluster(
        image, absolute_address_refs, requested_light_targets
    )
    indirect_vtable_slot_call_evidence = scan_light_manager_indirect_vtable_slot_calls(
        image, vtable_cluster_evidence
    )

    return {
        "targetCount": len(light_targets),
        "requestedTargetCount": len(requested_light_targets),
        "targets": [{"name": name, "va": hx(va)} for va, name in light_targets.items()],
        "directCallXrefCount": len(direct_call_xrefs),
        "directCallXrefs": direct_call_xrefs,
        "directCallTargetSummary": direct_call_target_summary,
        "requestedDirectCallXrefCount": len(requested_direct_call_xrefs),
        "requestedDirectCallXrefs": requested_direct_call_xrefs,
        "requestedDirectCallTargetSummary": requested_direct_call_target_summary,
        "absoluteAddressRefCount": len(absolute_address_refs),
        "absoluteAddressRefs": absolute_address_refs,
        "absoluteVtableClusterEvidence": vtable_cluster_evidence,
        "indirectVtableSlotCallEvidence": indirect_vtable_slot_call_evidence,
        "proofStatus": (
            "blocked-lightmanager-core-lane-ordering-no-add-prioritize-remove-update-direct-call-xrefs"
            if not requested_direct_call_xrefs
            else "source-backed-lightmanager-core-direct-call-xrefs-cross-lane-ordering-still-blocked"
        ),
    }


def scan_visual_effect_message_xrefs(
    image: PeImage, requested: list[dict[str, int | str]]
) -> dict[str, object] | None:
    targets = {
        int(entry["va"]): REQUESTED_SYMBOLS.get(str(entry["name"]), str(entry["name"]))
        for entry in requested
        if REQUESTED_SYMBOLS.get(str(entry["name"]), str(entry["name"])) in VISUAL_EFFECT_MESSAGE_TARGET_NAMES
    }
    if not targets:
        return None

    direct_call_xrefs = scan_relative_call_xrefs(image, targets)

    return {
        "targetCount": len(targets),
        "targets": [{"name": name, "va": hx(va)} for va, name in targets.items()],
        "directCallXrefCount": len(direct_call_xrefs),
        "directCallXrefs": direct_call_xrefs,
        "proofStatus": "source-backed-visualeffect-message-update-direct-call-xrefs",
    }


def describe_looping_visual_effect_list_reference(
    display_name: str,
    register: str,
    base_register: str | None,
    offset: int,
    at: int,
) -> dict[str, object]:
    if offset == 0x160:
        semantic = "CNWSObject.loopingVisualEffects"
    elif offset == 0x108:
        semantic = "CLastUpdateObject.loopingVisualEffectsSnapshot"
    else:
        semantic = "unknown-looping-visual-effect-list"
    return {
        "at": hx(at),
        "targetRegister": register,
        "baseRegister": base_register,
        "offset": hx(offset),
        "semantic": semantic,
        "_address": at,
        "_displayName": display_name,
    }


def strip_private_fields(entry: dict[str, object] | None) -> dict[str, object] | None:
    if entry is None:
        return None
    return {key: value for key, value in entry.items() if not key.startswith("_")}


def extract_visual_effect_message_update_evidence(
    code: bytes, begin_va: int, display_name: str, export_by_va: dict[int, str]
) -> dict[str, object] | None:
    md = Cs(CS_ARCH_X86, CS_MODE_64)
    md.detail = True
    assign_trampoline_targets = []
    compare_calls = []
    get_visual_transform_calls = []
    set_visual_transform_calls = []
    list_copy_calls = []
    render_path_direct_calls = []
    list_count_reads = []
    list_data_reads = []
    element_field_compares = []
    element_stride_advances = []
    recent_list_refs: dict[str, dict[str, object]] = {}

    def recent_ref(register: str, at: int, max_distance: int = 0x48) -> dict[str, object] | None:
        entry = recent_list_refs.get(register)
        if entry is None:
            return None
        address = entry.get("_address")
        if isinstance(address, int) and at - address <= max_distance:
            return entry
        return None

    for insn in md.disasm(code, begin_va):
        if insn.mnemonic == "lea" and len(insn.operands) == 2:
            destination, source = insn.operands
            if destination.type == X86_OP_REG and source.type == X86_OP_MEM:
                destination_name = normalized_register_name(insn, destination.reg)
                base_name = normalized_register_name(insn, source.mem.base) if source.mem.base else None
                displacement = int(source.mem.disp)
                if displacement in {0x108, 0x160}:
                    recent_list_refs[destination_name] = describe_looping_visual_effect_list_reference(
                        display_name, destination_name, base_name, displacement, insn.address
                    )

        if insn.mnemonic in {"jmp", "call"} and insn.operands and insn.operands[0].type == X86_OP_IMM:
            target = int(insn.operands[0].imm)
            target_name = export_by_va.get(target)
            if target_name in RENDER_LIGHT_TARGET_NAMES:
                render_path_direct_calls.append({"at": hx(insn.address), "targetVa": hx(target), "target": target_name})
            if display_name == "CNWSMessage::AssignVisualEffectLists" and insn.mnemonic == "jmp":
                assign_trampoline_targets.append({"at": hx(insn.address), "targetVa": hx(target)})
            if target_name == "CLastUpdateObject::GetVisualTransformData":
                get_visual_transform_calls.append({"at": hx(insn.address), "targetVa": hx(target), "target": target_name})
            if target_name == "CLastUpdateObject::SetVisualTransformData":
                set_visual_transform_calls.append({"at": hx(insn.address), "targetVa": hx(target), "target": target_name})
            if target_name == "CNWSMessage::CompareVisualEffectLists":
                compare_calls.append(
                    {
                        "at": hx(insn.address),
                        "targetVa": hx(target),
                        "target": target_name,
                        "leftList": strip_private_fields(recent_ref("rdx", insn.address)),
                        "rightList": strip_private_fields(recent_ref("r8", insn.address)),
                    }
                )
            if display_name == "CNWSMessage::UpdateLastUpdateObject":
                destination = recent_ref("rcx", insn.address)
                source = recent_ref("rdx", insn.address)
                if (
                    destination is not None
                    and source is not None
                    and destination.get("offset") == "0x108"
                    and source.get("offset") == "0x160"
                ):
                    list_copy_calls.append(
                        {
                            "at": hx(insn.address),
                            "helperTargetVa": hx(target),
                            "destinationList": strip_private_fields(destination),
                            "sourceList": strip_private_fields(source),
                        }
                    )

        for operand_index, operand in enumerate(insn.operands):
            if operand.type != X86_OP_MEM:
                continue
            base_name = normalized_register_name(insn, operand.mem.base) if operand.mem.base else None
            displacement = int(operand.mem.disp)
            if display_name == "CNWSMessage::CompareVisualEffectLists" and base_name in {"rdx", "r8"}:
                if displacement == 8:
                    list_count_reads.append({"at": hx(insn.address), "baseRegister": base_name, "listOffset": "0x8"})
                elif displacement == 0:
                    list_data_reads.append({"at": hx(insn.address), "baseRegister": base_name, "listOffset": "0x0"})
            if display_name == "CNWSMessage::CompareVisualEffectLists" and base_name in {"rdi", "rsi"}:
                if displacement in {-4, 0, 4, 8, 0x10, 0x18}:
                    element_field_compares.append(
                        {
                            "at": hx(insn.address),
                            "baseRegister": base_name,
                            "elementOffset": hx_signed(displacement),
                        }
                    )
        if (
            display_name == "CNWSMessage::CompareVisualEffectLists"
            and insn.mnemonic == "add"
            and len(insn.operands) == 2
            and insn.operands[0].type == X86_OP_REG
            and insn.operands[1].type == X86_OP_IMM
            and normalized_register_name(insn, insn.operands[0].reg) in {"rdi", "rsi"}
            and int(insn.operands[1].imm) == 0x20
        ):
            element_stride_advances.append({"at": hx(insn.address), "register": normalized_register_name(insn, insn.operands[0].reg), "strideBytes": 32})

    if not any(
        [
            assign_trampoline_targets,
            compare_calls,
            get_visual_transform_calls,
            set_visual_transform_calls,
            list_copy_calls,
            list_count_reads,
            render_path_direct_calls,
        ]
    ):
        return None

    if display_name == "CNWSMessage::ComputeUpdateRequired" and compare_calls:
        proof_status = "source-backed-cnwsmessage-computeupdate-looping-vfx-list-compare-offsets-0x108-0x160"
    elif display_name == "CNWSMessage::UpdateLastUpdateObject" and list_copy_calls:
        proof_status = "source-backed-cnwsmessage-lastupdate-visual-transform-and-looping-vfx-list-store"
    elif display_name == "CNWSMessage::CompareVisualEffectLists" and list_count_reads and element_stride_advances:
        proof_status = "source-backed-cnwsmessage-comparevisualeffectlists-record-size-32"
    elif display_name == "CNWSMessage::AssignVisualEffectLists" and assign_trampoline_targets:
        proof_status = "source-backed-cnwsmessage-assignvisualeffectlists-trampoline-to-list-helper"
    elif get_visual_transform_calls or set_visual_transform_calls:
        proof_status = "source-backed-cnwsmessage-visual-transform-call"
    else:
        proof_status = "partial-cnwsmessage-visualeffect-update-evidence"

    return {
        "assignTrampolineTargets": assign_trampoline_targets,
        "compareVisualEffectListCalls": compare_calls,
        "getVisualTransformDataCalls": get_visual_transform_calls,
        "setVisualTransformDataCalls": set_visual_transform_calls,
        "lastUpdateLoopingVisualEffectListCopyCalls": list_copy_calls,
        "compareListCountReads": list_count_reads[:8],
        "compareListDataReads": list_data_reads[:8],
        "compareElementFieldReads": element_field_compares[:16],
        "compareElementStrideAdvances": element_stride_advances[:8],
        "directRenderPathCalls": render_path_direct_calls,
        "directRenderPathProofStatus": (
            "source-backed-direct-render-light-call"
            if render_path_direct_calls
            else "blocked-no-direct-render-light-call-from-message-update-function"
            if display_name in {"CNWSMessage::ComputeUpdateRequired", "CNWSMessage::UpdateLastUpdateObject"}
            else "not-applicable-no-direct-render-light-call"
        ),
        "proofStatus": proof_status,
    }


def extract_visual_effect_network_update_evidence(
    code: bytes, begin_va: int, display_name: str, export_by_va: dict[int, str]
) -> dict[str, object] | None:
    if display_name != "CNWSMessage::WriteGameObjUpdate_UpdateObject":
        return None

    md = Cs(CS_ARCH_X86, CS_MODE_64)
    md.detail = True
    current_list_reads = []
    snapshot_list_reads = []
    record_field_reads = []
    get_is_beam_calls = []
    message_writer_calls = []
    transform_write_calls = []
    render_path_direct_calls = []
    recent_transform_refs: dict[str, dict[str, object]] = {}

    writer_names = {
        "CNWMessage::WriteBYTE",
        "CNWMessage::WriteWORD",
        "CNWSMessage::WriteOBJECTIDServer",
        "ObjectVisualTransformData::Write",
        "CNWSPlayer::SatisfiesBuild",
    }
    field_offsets = {
        0: "visualEffectId",
        4: "objectId",
        8: "subtypeOrFlags",
        0x10: "transformData",
        0x18: "transformDataTail",
    }

    for insn in md.disasm(code, begin_va):
        if insn.mnemonic == "lea" and len(insn.operands) == 2:
            destination, source = insn.operands
            if destination.type == X86_OP_REG and source.type == X86_OP_MEM:
                displacement = int(source.mem.disp)
                if displacement == 0x10:
                    destination_name = normalized_register_name(insn, destination.reg)
                    base_name = normalized_register_name(insn, source.mem.base) if source.mem.base else None
                    recent_transform_refs[destination_name] = {
                        "at": hx(insn.address),
                        "targetRegister": destination_name,
                        "baseRegister": base_name,
                        "recordOffset": "0x10",
                        "semantic": "CLoopingVisualEffect.transformData",
                        "_address": insn.address,
                    }

        if insn.mnemonic == "call" and insn.operands and insn.operands[0].type == X86_OP_IMM:
            target = int(insn.operands[0].imm)
            target_name = export_by_va.get(target)
            if target_name in RENDER_LIGHT_TARGET_NAMES:
                render_path_direct_calls.append({"at": hx(insn.address), "targetVa": hx(target), "target": target_name})
            if target_name == "CLoopingVisualEffect::GetIsBeam":
                get_is_beam_calls.append({"at": hx(insn.address), "targetVa": hx(target), "target": target_name})
            if target_name in writer_names:
                entry = {"at": hx(insn.address), "targetVa": hx(target), "target": target_name}
                if target_name == "ObjectVisualTransformData::Write":
                    entry["transformDataArgument"] = strip_private_fields(
                        recent_transform_refs.get("r8")
                    )
                    transform_write_calls.append(entry)
                message_writer_calls.append(entry)

        for operand in insn.operands:
            if operand.type != X86_OP_MEM:
                continue
            base_name = normalized_register_name(insn, operand.mem.base) if operand.mem.base else None
            displacement = int(operand.mem.disp)
            if displacement == 0x160:
                current_list_reads.append(
                    {
                        "at": hx(insn.address),
                        "baseRegister": base_name,
                        "offset": "0x160",
                        "semantic": "CNWSObject.loopingVisualEffects",
                    }
                )
            elif displacement == 0x108:
                snapshot_list_reads.append(
                    {
                        "at": hx(insn.address),
                        "baseRegister": base_name,
                        "offset": "0x108",
                        "semantic": "CLastUpdateObject.loopingVisualEffectsSnapshot",
                    }
                )
            if base_name in {"rsi", "rdi", "r12", "rcx"} and displacement in field_offsets:
                record_field_reads.append(
                    {
                        "at": hx(insn.address),
                        "baseRegister": base_name,
                        "recordOffset": hx(displacement),
                        "field": field_offsets[displacement],
                    }
                )

    if not get_is_beam_calls and not message_writer_calls and not current_list_reads and not snapshot_list_reads:
        return None

    writer_targets = {entry["target"] for entry in message_writer_calls}
    proof_status = (
        "source-backed-cnwsmessage-writegameobjupdate-looping-vfx-serializes-record-fields"
        if get_is_beam_calls
        and "CNWMessage::WriteBYTE" in writer_targets
        and "CNWMessage::WriteWORD" in writer_targets
        and "CNWSMessage::WriteOBJECTIDServer" in writer_targets
        and "ObjectVisualTransformData::Write" in writer_targets
        and current_list_reads
        and snapshot_list_reads
        else "partial-cnwsmessage-writegameobjupdate-looping-vfx-network-evidence"
    )
    return {
        "currentOwnerListReads": current_list_reads[:12],
        "lastUpdateSnapshotListReads": snapshot_list_reads[:12],
        "recordFieldReads": record_field_reads[:24],
        "getIsBeamCalls": get_is_beam_calls,
        "messageWriterCalls": message_writer_calls[:24],
        "transformDataWriteCalls": transform_write_calls,
        "directRenderPathCalls": render_path_direct_calls,
        "directRenderPathProofStatus": (
            "source-backed-direct-render-light-call"
            if render_path_direct_calls
            else "blocked-no-direct-render-light-call-from-network-update-writer"
        ),
        "proofStatus": proof_status,
    }


def scan_client_signature_records(image: PeImage) -> list[dict[str, object]]:
    records = []
    for name, spec in CLIENT_VFX_FUNCTIONS.items():
        metadata = find_signature_metadata_record(image, str(spec["signature"]))
        expected_va = rebase_retail_va(image, int(spec["va"]))
        entry = image.find_function_entry(expected_va - image.image_base)
        records.append(
            {
                "name": name,
                "expectedFunctionVa": hx(expected_va),
                "pdataBeginVa": hx(image.image_base + entry["begin_rva"]) if entry else None,
                "pdataEndVa": hx(image.image_base + entry["end_rva"]) if entry else None,
                "metadata": metadata,
                "proofStatus": (
                    "source-backed-client-function-signature-metadata-and-pdata-range"
                    if metadata is not None and entry is not None
                    else "partial-client-function-signature-or-pdata-missing"
                ),
            }
        )
    return records


def scan_client_vfx_message_chain(image: PeImage) -> dict[str, object]:
    rebased_functions = {
        name: rebase_retail_va(image, int(spec["va"])) for name, spec in CLIENT_VFX_FUNCTIONS.items()
    }
    chain = []
    for edge in CLIENT_VFX_MESSAGE_CHAIN:
        from_va = rebased_functions[str(edge["from"])]
        to_va = rebased_functions[str(edge["to"])]
        expected_call_va = rebase_retail_va(image, int(edge["expectedCallVa"]))
        begin_va, end_va, instructions, range_source = disassemble_function_by_va(image, from_va)
        calls = collect_direct_call_sites(instructions, {to_va: str(edge["to"])})
        expected_found = any(entry["at"] == hx(expected_call_va) for entry in calls)
        chain.append(
            {
                "from": edge["from"],
                "to": edge["to"],
                "functionBeginVa": hx(begin_va),
                "functionEndVa": hx(end_va),
                "rangeSource": range_source,
                "expectedCallVa": hx(expected_call_va),
                "directCalls": calls,
                "proofStatus": (
                    "source-backed-client-message-direct-call"
                    if expected_found
                    else "partial-client-message-call-target-found"
                    if calls
                    else "blocked-client-message-direct-call-not-found"
                ),
            }
        )
    return {
        "chain": chain,
        "proofStatus": (
            "source-backed-cnwcmessage-client-vfx-update-dispatch-chain"
            if all(entry["proofStatus"] == "source-backed-client-message-direct-call" for entry in chain)
            else "partial-cnwcmessage-client-vfx-update-dispatch-chain"
        ),
    }


def scan_client_update_visual_effects_reader(image: PeImage) -> dict[str, object] | None:
    function_va = rebase_retail_va(
        image, int(CLIENT_VFX_FUNCTIONS["CNWCMessage::HandleServerToPlayerUpdateVisualEffects"]["va"])
    )
    known_targets = rebase_retail_target_map(image, CLIENT_VFX_HELPER_NAMES)
    begin_va, end_va, instructions, range_source = disassemble_function_by_va(image, function_va)
    direct_calls = collect_direct_call_sites(instructions, known_targets)
    read_calls = [
        entry
        for entry in direct_calls
        if entry["target"]
        in {
            "CNWMessage::ReadBYTE",
            "CNWMessage::ReadWORD",
            "CNWMessage::ReadDWORD",
            "CNWMessage::ReadFLOAT",
            "client-object-id-read-helper",
            "ObjectVisualTransformData::Read-client-helper",
            "client-build/satisfies-build-check-helper",
        }
    ]
    action_compares = []
    indirect_add_delete_calls = []
    visualeffects_2da_refs = []
    string_by_va = {
        va: text
        for text in CLIENT_VFX_STRING_NEEDLES
        if (va := find_ascii_string_va(image, text)) is not None
    }

    for insn in instructions:
        if insn.mnemonic == "cmp" and len(insn.operands) == 2:
            immediate_operands = [operand for operand in insn.operands if operand.type == X86_OP_IMM]
            if immediate_operands:
                immediate = int(immediate_operands[0].imm)
                if immediate in {0x41, 0x44}:
                    action_compares.append(
                        {
                            "at": hx(insn.address),
                            "immediate": hx(immediate),
                            "action": "add-looping-vfx" if immediate == 0x41 else "delete-looping-vfx",
                            "instruction": f"{insn.mnemonic} {insn.op_str}",
                        }
                    )
        if insn.mnemonic == "call" and insn.operands:
            operand = insn.operands[0]
            if operand.type == X86_OP_REG and normalized_register_name(insn, operand.reg) == "rbx":
                indirect_add_delete_calls.append(
                    {
                        "at": hx(insn.address),
                        "slot": "vtable+0x178",
                        "operation": "add-looping-vfx-to-client-object",
                        "instruction": f"{insn.mnemonic} {insn.op_str}",
                    }
                )
            elif operand.type == X86_OP_MEM and int(operand.mem.disp) in {0x178, 0x180}:
                slot = int(operand.mem.disp)
                indirect_add_delete_calls.append(
                    {
                        "at": hx(insn.address),
                        "slot": hx(slot),
                        "operation": (
                            "add-looping-vfx-to-client-object"
                            if slot == 0x178
                            else "delete-looping-vfx-from-client-object"
                        ),
                        "instruction": f"{insn.mnemonic} {insn.op_str}",
                    }
                )
        for ref in collect_rip_string_refs([insn], string_by_va):
            if ref["string"] == "visualeffects.2da":
                visualeffects_2da_refs.append(ref)

    required_targets = {entry["target"] for entry in read_calls}
    proof_status = (
        "source-backed-cnwcmessage-updatevisualeffects-reads-serialized-looping-vfx-and-calls-client-object-vtable"
        if {
            "CNWMessage::ReadBYTE",
            "CNWMessage::ReadWORD",
            "client-object-id-read-helper",
            "ObjectVisualTransformData::Read-client-helper",
        }.issubset(required_targets)
        and any(entry["action"] == "add-looping-vfx" for entry in action_compares)
        and any(entry["operation"] == "add-looping-vfx-to-client-object" for entry in indirect_add_delete_calls)
        and any(entry["operation"] == "delete-looping-vfx-from-client-object" for entry in indirect_add_delete_calls)
        else "partial-cnwcmessage-updatevisualeffects-client-reader"
    )
    return {
        "functionBeginVa": hx(begin_va),
        "functionEndVa": hx(end_va),
        "rangeSource": range_source,
        "readCalls": read_calls,
        "actionComparisons": action_compares,
        "clientObjectVtableCalls": indirect_add_delete_calls,
        "visualEffects2daStringRefs": visualeffects_2da_refs,
        "proofStatus": proof_status,
    }


def scan_client_object_vtable_visual_effect_slots(image: PeImage) -> dict[str, object]:
    slots = []
    for type_name, vtable_va in CLIENT_VFX_VTABLES:
        rebased_vtable_va = rebase_retail_va(image, vtable_va)
        add_target = read_u64_va(image, rebased_vtable_va + 0x178)
        remove_target = read_u64_va(image, rebased_vtable_va + 0x180)
        slots.append(
            {
                "type": type_name,
                "vtableVa": hx(rebased_vtable_va),
                "addSlotOffset": "0x178",
                "addSlotTargetVa": hx(add_target),
                "removeSlotOffset": "0x180",
                "removeSlotTargetVa": hx(remove_target),
                "proofStatus": (
                    "source-backed-client-object-looping-vfx-vtable-slots"
                    if add_target is not None and remove_target is not None
                    else "blocked-client-object-vtable-slot-read-failed"
                ),
            }
        )
    generic_add = rebase_retail_va(image, 0x140762180)
    generic_remove = rebase_retail_va(image, 0x140762AD0)
    return {
        "slots": slots,
        "genericAddTargetVa": hx(generic_add),
        "genericRemoveTargetVa": hx(generic_remove),
        "itemSpecificAddTargetVa": hx(rebase_retail_va(image, 0x140765B00)),
        "itemSpecificRemoveTargetVa": hx(rebase_retail_va(image, 0x140765BD0)),
        "proofStatus": (
            "source-backed-client-object-looping-vfx-vtable-add-remove-slots"
            if any(slot["addSlotTargetVa"] == hx(generic_add) for slot in slots)
            and any(slot["removeSlotTargetVa"] == hx(generic_remove) for slot in slots)
            else "partial-client-object-looping-vfx-vtable-slots"
        ),
    }


def scan_client_object_add_remove_visual_effects(image: PeImage) -> dict[str, object]:
    known_targets = rebase_retail_target_map(image, CLIENT_VFX_HELPER_NAMES)
    add_va = rebase_retail_va(image, 0x140762180)
    remove_va = rebase_retail_va(image, 0x140762AD0)
    refresh_va = rebase_retail_va(image, int(CLIENT_VFX_FUNCTIONS["CNWCObject::RefreshVisualEffects"]["va"]))
    functions = []
    for name, va in [
        ("CNWCObject::AddLoopingVisualEffect-client-vslot-0x178", add_va),
        ("CNWCObject::RemoveLoopingVisualEffect-client-vslot-0x180", remove_va),
        ("CNWCObject::RefreshVisualEffects", refresh_va),
    ]:
        begin_va, end_va, instructions, range_source = disassemble_function_by_va(image, va)
        direct_calls = collect_direct_call_sites(instructions, known_targets)
        state_checks = []
        indirect_scene_calls = []
        for insn in instructions:
            for operand in insn.operands:
                if operand.type != X86_OP_MEM:
                    continue
                base_name = normalized_register_name(insn, operand.mem.base) if operand.mem.base else None
                displacement = int(operand.mem.disp)
                if base_name in {"rsi", "rbx", "rdi"} and displacement in {0x108, 0xF4, 0xD8, 0xF8}:
                    state_checks.append(
                        {
                            "at": hx(insn.address),
                            "baseRegister": base_name,
                            "offset": hx(displacement),
                            "instruction": f"{insn.mnemonic} {insn.op_str}",
                        }
                    )
            if insn.mnemonic in {"call", "jmp"} and "qword ptr" in insn.op_str:
                if any(slot in insn.op_str for slot in ["0xe8", "0x190", "0x1f8", "0x200", "0x210", "0x218"]):
                    indirect_scene_calls.append(
                        {
                            "at": hx(insn.address),
                            "instruction": f"{insn.mnemonic} {insn.op_str}",
                        }
                    )
        target_names = {entry["target"] for entry in direct_calls}
        if name.startswith("CNWCObject::Add"):
            proof_status = (
                "source-backed-client-vfx-add-alloc-load-addtail-refresh-path"
                if "CNWCVisualEffectOnObject::LoadVisualEffect-progfx-source-loader" in target_names
                and "CExoLinkedListInternal::AddTail" in target_names
                else "partial-client-vfx-add-path"
            )
        elif name.startswith("CNWCObject::Remove"):
            proof_status = (
                "source-backed-client-vfx-remove-list-and-scene-refresh-path"
                if direct_calls else "partial-client-vfx-remove-path"
            )
        else:
            proof_status = (
                "source-backed-client-vfx-refresh-loadvisualeffect-path"
                if "CNWCVisualEffectOnObject::LoadVisualEffect-node-attach" in target_names
                else "partial-client-vfx-refresh-path"
            )
        functions.append(
            {
                "name": name,
                "functionBeginVa": hx(begin_va),
                "functionEndVa": hx(end_va),
                "rangeSource": range_source,
                "directCalls": direct_calls,
                "stateChecks": state_checks[:16],
                "indirectSceneCalls": indirect_scene_calls[:16],
                "proofStatus": proof_status,
            }
        )
    return {
        "functions": functions,
        "proofStatus": (
            "source-backed-client-object-add-remove-refresh-looping-vfx-path"
            if all(str(function["proofStatus"]).startswith("source-backed") for function in functions)
            else "partial-client-object-add-remove-refresh-looping-vfx-path"
        ),
    }


def scan_visual_effect_source_model_loaders(image: PeImage) -> dict[str, object]:
    new_caur_object = rebase_retail_va(image, 0x1400931F0)
    known_targets = rebase_retail_target_map(image, CLIENT_VFX_HELPER_NAMES)
    string_by_va = {
        va: text
        for text in CLIENT_VFX_STRING_NEEDLES
        if (va := find_ascii_string_va(image, text)) is not None
    }
    loaders = []
    for name, va in [
        ("CNWCVisualEffectOnObject::LoadVisualEffect-progfx-source-loader", 0x14096CF10),
        ("CNWCVisualEffectOnObject::LoadVisualEffect-fx-light-loader-region", 0x14096C610),
        ("CNWCAnimBaseVisualEffect::LoadModel", int(CLIENT_VFX_FUNCTIONS["CNWCAnimBaseVisualEffect::LoadModel"]["va"])),
    ]:
        if name.endswith("fx-light-loader-region"):
            begin_va, end_va, instructions, range_source = disassemble_linear_region_by_va(
                image, rebase_retail_va(image, va), 0x1000
            )
        else:
            begin_va, end_va, instructions, range_source = disassemble_function_by_va(
                image, rebase_retail_va(image, va), max_linear_bytes=0x6000
            )
        direct_calls = collect_direct_call_sites(instructions, known_targets | {new_caur_object: "NewCAurObject"})
        new_object_calls = [entry for entry in direct_calls if entry["target"] == "NewCAurObject"]
        string_refs = collect_rip_string_refs(instructions, string_by_va)
        model_pointer_stores = []
        for insn in instructions:
            if insn.mnemonic != "mov" or len(insn.operands) != 2 or insn.operands[0].type != X86_OP_MEM:
                continue
            mem = insn.operands[0].mem
            base_name = normalized_register_name(insn, mem.base) if mem.base else None
            if base_name in {"r15", "rbx", "rsi"} and int(mem.disp) in {0xC8, 0xD8, 0xF4}:
                model_pointer_stores.append(
                    {
                        "at": hx(insn.address),
                        "baseRegister": base_name,
                        "offset": hx(int(mem.disp)),
                        "instruction": f"{insn.mnemonic} {insn.op_str}",
                    }
                )
        string_values = {entry["string"] for entry in string_refs}
        if name.endswith("fx-light-loader-region"):
            expected_strings = {"fx_light"}
            proof_status = (
                "source-backed-client-vfx-fx-light-newcaurobject-loader"
                if new_object_calls and expected_strings.intersection(string_values)
                else "partial-client-vfx-source-model-loader"
            )
        elif name == "CNWCAnimBaseVisualEffect::LoadModel":
            expected_strings = set()
            proof_status = (
                "source-backed-client-vfx-animbasemodel-newcaurobject-store"
                if new_object_calls
                and any(entry["offset"] == "0xc8" for entry in model_pointer_stores)
                else "partial-client-vfx-source-model-loader"
            )
        else:
            expected_strings = {
                "ProgFX_Impact",
                "ProgFX_Duration",
                "ProgFX_Cessation",
                "fxground",
                "fximpact",
                "fxhead",
            }
            proof_status = (
                "source-backed-client-vfx-source-model-newcaurobject-loader"
                if new_object_calls and expected_strings.intersection(string_values)
                else "partial-client-vfx-source-model-loader"
            )
        loaders.append(
            {
                "name": name,
                "functionBeginVa": hx(begin_va),
                "functionEndVa": hx(end_va),
                "rangeSource": range_source,
                "newCAurObjectCalls": new_object_calls,
                "stringRefs": string_refs[:32],
                "modelPointerStores": model_pointer_stores[:12],
                "proofStatus": proof_status,
            }
        )
    return {
        "loaders": loaders,
        "proofStatus": (
            "source-backed-client-vfx-loadvisualeffect-newcaurobject-model-loader-path"
            if all(str(loader["proofStatus"]).startswith("source-backed") for loader in loaders)
            else "partial-client-vfx-loadvisualeffect-newcaurobject-model-loader-path"
        ),
    }


def scan_client_visual_effect_receive_render_evidence(image: PeImage) -> dict[str, object] | None:
    if image.path.name.lower() != "nwmain.exe":
        return None

    signature_records = scan_client_signature_records(image)
    message_chain = scan_client_vfx_message_chain(image)
    update_reader = scan_client_update_visual_effects_reader(image)
    vtable_slots = scan_client_object_vtable_visual_effect_slots(image)
    object_lifecycle = scan_client_object_add_remove_visual_effects(image)
    source_model_loaders = scan_visual_effect_source_model_loaders(image)

    source_backed_checks = [
        message_chain["proofStatus"] == "source-backed-cnwcmessage-client-vfx-update-dispatch-chain",
        update_reader is not None
        and update_reader["proofStatus"]
        == "source-backed-cnwcmessage-updatevisualeffects-reads-serialized-looping-vfx-and-calls-client-object-vtable",
        vtable_slots["proofStatus"] == "source-backed-client-object-looping-vfx-vtable-add-remove-slots",
        object_lifecycle["proofStatus"] == "source-backed-client-object-add-remove-refresh-looping-vfx-path",
        source_model_loaders["proofStatus"]
        == "source-backed-client-vfx-loadvisualeffect-newcaurobject-model-loader-path",
    ]
    return {
        "signatureRecords": signature_records,
        "messageDispatchChain": message_chain,
        "updateVisualEffectsReader": update_reader,
        "clientObjectVisualEffectVtableSlots": vtable_slots,
        "clientObjectVisualEffectLifecycle": object_lifecycle,
        "visualEffectSourceModelLoaders": source_model_loaders,
        "genericMdlLightPathDependency": (
            "NewCAurObject builds the visual-effect CAurObject/Gob; generic MdlNodeLight::InternalCreateInstance "
            "evidence in this same report proves MDL AuroraLight nodes create PartLight and attach to Gob+0x470."
        ),
        "remainingBlockedSemantics": [
            "no direct recovered cross-lane insertion order between tile/placeable/MDL/item/VFX light lanes",
            "item-light ProgFX Type 4 Param3 shadow toggle is table-backed; no exact non-item ProgFX Type 4 shadow scheduler parity",
            "no exact ProgFX Type 4 priority/proximity/vision scheduler parity",
        ],
        "proofStatus": (
            "source-backed-cnwcmessage-client-vfx-receive-vtable-add-newcaurobject-mdl-gob-light-path"
            if all(source_backed_checks)
            else "partial-cnwcmessage-client-vfx-receive-render-path"
        ),
    }


def read_rel32_call_target_at_va(image: PeImage, call_va: int) -> int | None:
    offset = va_to_offset(image, call_va)
    if offset is None or offset + 5 > len(image.data) or image.data[offset] != 0xE8:
        return None
    rel = int.from_bytes(image.data[offset + 1 : offset + 5], "little", signed=True)
    return call_va + 5 + rel


def scan_direct_calls_in_pdata_function(
    image: PeImage,
    function_va: int,
    known_targets: dict[int, str],
    max_hits: int = 128,
) -> dict[str, object]:
    entry = image.find_function_entry(function_va - image.image_base)
    if entry is None:
        return {
            "functionBeginVa": hx(function_va),
            "functionEndVa": None,
            "rangeSource": "missing-pdata",
            "directCalls": [],
            "proofStatus": "blocked-pdata-function-range-missing",
        }
    begin_rva = int(entry["begin_rva"])
    end_rva = int(entry["end_rva"])
    return {
        "functionBeginVa": hx(image.image_base + begin_rva),
        "functionEndVa": hx(image.image_base + end_rva),
        "rangeSource": ".pdata-capstone-free",
        "directCalls": scan_relative_call_xrefs_in_rva_range(
            image, known_targets, begin_rva, end_rva, max_hits=max_hits
        ),
        "proofStatus": "source-backed-pdata-function-range-direct-call-scan",
    }


def scan_client_vfx_message_chain_capstone_free(image: PeImage) -> dict[str, object]:
    rebased_functions = {
        name: rebase_retail_va(image, int(spec["va"])) for name, spec in CLIENT_VFX_FUNCTIONS.items()
    }
    chain = []
    for edge in CLIENT_VFX_MESSAGE_CHAIN:
        from_va = rebased_functions[str(edge["from"])]
        to_va = rebased_functions[str(edge["to"])]
        expected_call_va = rebase_retail_va(image, int(edge["expectedCallVa"]))
        target = read_rel32_call_target_at_va(image, expected_call_va)
        range_scan = scan_direct_calls_in_pdata_function(image, from_va, {to_va: str(edge["to"])})
        expected_found = target == to_va
        chain.append(
            {
                "from": edge["from"],
                "to": edge["to"],
                "expectedCallVa": hx(expected_call_va),
                "expectedTargetVa": hx(to_va),
                "observedTargetVa": hx(target),
                "directCalls": range_scan["directCalls"],
                "functionBeginVa": range_scan["functionBeginVa"],
                "functionEndVa": range_scan["functionEndVa"],
                "rangeSource": range_scan["rangeSource"],
                "proofStatus": (
                    "source-backed-capstone-free-client-message-exact-e8-call"
                    if expected_found
                    else "blocked-capstone-free-client-message-expected-e8-call-missing"
                ),
            }
        )
    return {
        "chain": chain,
        "proofStatus": (
            "source-backed-capstone-free-cnwcmessage-client-vfx-update-dispatch-chain"
            if all(
                entry["proofStatus"]
                == "source-backed-capstone-free-client-message-exact-e8-call"
                for entry in chain
            )
            else "partial-capstone-free-cnwcmessage-client-vfx-update-dispatch-chain"
        ),
    }


def scan_client_vfx_known_function_callgraph_capstone_free(image: PeImage) -> dict[str, object]:
    known_targets = rebase_retail_target_map(image, CLIENT_VFX_HELPER_NAMES)
    for name, spec in CLIENT_VFX_FUNCTIONS.items():
        known_targets[rebase_retail_va(image, int(spec["va"]))] = name
    for va, name in [
        (0x140762180, "CNWCObject::AddLoopingVisualEffect-client-vslot-0x178"),
        (0x140762AD0, "CNWCObject::RemoveLoopingVisualEffect-client-vslot-0x180"),
        (0x140765B00, "CNWCItem::AddLoopingVisualEffect-client-vslot-0x178"),
        (0x140765BD0, "CNWCItem::RemoveLoopingVisualEffect-client-vslot-0x180"),
        (0x1400931F0, "NewCAurObject"),
    ]:
        known_targets[rebase_retail_va(image, va)] = name

    function_specs = [
        ("CNWCMessage::HandleServerToPlayerUpdateVisualEffects", int(CLIENT_VFX_FUNCTIONS["CNWCMessage::HandleServerToPlayerUpdateVisualEffects"]["va"])),
        ("CNWCObject::AddLoopingVisualEffect-client-vslot-0x178", 0x140762180),
        ("CNWCObject::RemoveLoopingVisualEffect-client-vslot-0x180", 0x140762AD0),
        ("CNWCItem::AddLoopingVisualEffect-client-vslot-0x178", 0x140765B00),
        ("CNWCItem::RemoveLoopingVisualEffect-client-vslot-0x180", 0x140765BD0),
        ("CNWCObject::RefreshVisualEffects", int(CLIENT_VFX_FUNCTIONS["CNWCObject::RefreshVisualEffects"]["va"])),
        ("CNWCVisualEffectOnObject::LoadVisualEffect-progfx-source-loader", 0x14096CF10),
        ("CNWCVisualEffectOnObject::LoadVisualEffect-fx-light-loader-region", 0x14096C610),
        ("CNWCAnimBaseVisualEffect::LoadModel", int(CLIENT_VFX_FUNCTIONS["CNWCAnimBaseVisualEffect::LoadModel"]["va"])),
    ]

    functions = []
    observed_targets: set[str] = set()
    for name, source_va in function_specs:
        rebased_va = rebase_retail_va(image, source_va)
        range_scan = scan_direct_calls_in_pdata_function(image, rebased_va, known_targets)
        direct_calls = list(range_scan["directCalls"])
        for call in direct_calls:
            observed_targets.add(str(call["target"]))
        functions.append(
            {
                "name": name,
                "functionBeginVa": range_scan["functionBeginVa"],
                "functionEndVa": range_scan["functionEndVa"],
                "rangeSource": range_scan["rangeSource"],
                "directCalls": direct_calls,
                "directCallTargetSummary": summarize_direct_call_xrefs_by_target(direct_calls),
                "proofStatus": range_scan["proofStatus"],
            }
        )

    required_observed = {
        "CNWMessage::ReadBYTE",
        "CNWMessage::ReadWORD",
        "client-object-id-read-helper",
        "ObjectVisualTransformData::Read-client-helper",
        "CNWCVisualEffectOnObject::LoadVisualEffect-progfx-source-loader",
        "CNWCVisualEffectOnObject::LoadVisualEffect-node-attach",
        "CExoLinkedListInternal::AddTail",
        "NewCAurObject",
    }
    return {
        "functions": functions,
        "observedDirectCallTargets": sorted(observed_targets),
        "missingExpectedDirectCallTargets": sorted(required_observed - observed_targets),
        "proofStatus": (
            "source-backed-capstone-free-client-vfx-message-owner-loader-callgraph"
            if required_observed.issubset(observed_targets)
            else "partial-capstone-free-client-vfx-message-owner-loader-callgraph"
        ),
    }


def scan_client_visual_effect_receive_render_evidence_capstone_free(
    image: PeImage,
) -> dict[str, object] | None:
    if image.path.name.lower() != "nwmain.exe":
        return None

    signature_records = scan_client_signature_records(image)
    message_chain = scan_client_vfx_message_chain_capstone_free(image)
    vtable_slots = scan_client_object_vtable_visual_effect_slots(image)
    callgraph = scan_client_vfx_known_function_callgraph_capstone_free(image)
    string_hits = [
        {"string": text, "va": hx(va)}
        for text in CLIENT_VFX_STRING_NEEDLES
        if (va := find_ascii_string_va(image, text)) is not None
    ]

    source_backed = (
        message_chain["proofStatus"]
        == "source-backed-capstone-free-cnwcmessage-client-vfx-update-dispatch-chain"
        and vtable_slots["proofStatus"]
        == "source-backed-client-object-looping-vfx-vtable-add-remove-slots"
        and callgraph["proofStatus"]
        == "source-backed-capstone-free-client-vfx-message-owner-loader-callgraph"
    )
    return {
        "signatureRecords": signature_records,
        "messageDispatchChain": message_chain,
        "clientObjectVisualEffectVtableSlots": vtable_slots,
        "clientKnownFunctionCallgraph": callgraph,
        "clientVisualEffectStringNeedleHits": string_hits,
        "genericMdlLightPathDependency": (
            "NewCAurObject builds the visual-effect CAurObject/Gob; generic MdlNodeLight::InternalCreateInstance "
            "evidence in this same report proves MDL AuroraLight nodes create PartLight and attach to Gob+0x470."
        ),
        "clientVisualEffectSchedulerDataFlowProofStatus": (
            "blocked-capstone-free-callgraph-proves-vfx-loader-object-attach-not-progfx-param-scheduler-dataflow"
            if source_backed
            else "blocked-capstone-free-callgraph-incomplete-for-progfx-param-scheduler-dataflow"
        ),
        "remainingBlockedSemantics": [
            "capstone-free retail binary evidence proves message dispatch, owner attach/remove vtable slots, and loader/object attach callgraph only",
            "exact ProgFX Type 4 Param4 priority, Param5 proximity threshold, Param6 attach-to-scene restore timing, and vision mutation data-flow still require instruction-level data-flow or retail oracle",
        ],
        "proofStatus": (
            "source-backed-capstone-free-cnwcmessage-client-vfx-callgraph-vtable-loader-path-scheduler-dataflow-blocked"
            if source_backed
            else "partial-capstone-free-cnwcmessage-client-vfx-callgraph-vtable-loader-path"
        ),
    }


def extract_apply_light_item_property_bridge(image: PeImage, code: bytes, begin_va: int) -> dict[str, object] | None:
    md = Cs(CS_ARCH_X86, CS_MODE_64)
    md.detail = True
    color_offset = None
    brightness_offset = None
    jump_table_va = None
    created_effect_size = None
    internal_apply_target = None
    for insn in md.disasm(code, begin_va):
        if (
            insn.mnemonic == "movzx"
            and len(insn.operands) == 2
            and insn.operands[1].type == X86_OP_MEM
            and insn.operands[1].mem.base == X86_REG_RSI
        ):
            if insn.operands[1].size == 1:
                color_offset = int(insn.operands[1].mem.disp)
            elif insn.operands[1].size == 2:
                brightness_offset = int(insn.operands[1].mem.disp)
        if (
            insn.mnemonic == "mov"
            and len(insn.operands) == 2
            and insn.operands[1].type == X86_OP_MEM
            and insn.operands[1].mem.index == X86_REG_RAX
            and insn.operands[1].mem.scale == 4
        ):
            # The retail code first loads rdx with image base, then addresses
            # the RVA jump table as [rdx + rax*4 + table_rva].
            jump_table_va = image.image_base + int(insn.operands[1].mem.disp)
        if (
            insn.mnemonic == "mov"
            and len(insn.operands) == 2
            and insn.operands[0].reg != 0
            and insn.operands[1].type == X86_OP_IMM
            and int(insn.operands[1].imm) == 0x110
        ):
            created_effect_size = int(insn.operands[1].imm)
        if (
            insn.mnemonic == "call"
            and insn.operands
            and insn.operands[0].type == X86_OP_IMM
        ):
            internal_apply_target = int(insn.operands[0].imm)

    color_mappings = []
    if jump_table_va is not None:
        table_offset = image.rva_to_offset(jump_table_va - image.image_base)
        if table_offset is not None:
            for index, label in enumerate(IPRP_COLOR_LABELS):
                target_rva = read_u32(image.data, table_offset + index * 4)
                target_va = image.image_base + target_rva
                row_id = read_mov_ebx_immediate_at(image, target_va)
                color_mappings.append(
                    {
                        "iprpColorValue": index,
                        "label": label,
                        "targetVa": hx(target_va),
                        "vfxDurLightBaseRowId": row_id,
                    }
                )

    if not color_mappings and color_offset is None and brightness_offset is None:
        return None
    return {
        "itemPropertyColorByteOffset": color_offset,
        "itemPropertyBrightnessWordOffset": brightness_offset,
        "jumpTableVa": hx(jump_table_va),
        "colorToVfxBaseRows": color_mappings,
        "brightnessToVfxRowAdd": IPRP_LIGHTCOST_BRIGHTNESS,
        "createdCGameEffectSizeBytes": created_effect_size,
        "internalApplyTargetVa": hx(internal_apply_target),
    }


def extract_mdl_node_light_partlight_lifecycle(
    image: PeImage, code: bytes, begin_va: int, export_by_va: dict[int, str]
) -> dict[str, object] | None:
    md = Cs(CS_ARCH_X86, CS_MODE_64)
    md.detail = True
    allocation_size = None
    inline_partlight_vtable_writes = []
    gob_partlight_list_offsets = []
    direct_calls = []
    for insn in md.disasm(code, begin_va):
        if (
            insn.mnemonic == "mov"
            and len(insn.operands) == 2
            and insn.operands[1].type == X86_OP_IMM
            and int(insn.operands[1].imm) == 0xC0
        ):
            allocation_size = int(insn.operands[1].imm)
        if (
            insn.mnemonic == "lea"
            and len(insn.operands) == 2
            and insn.operands[1].type == X86_OP_MEM
            and insn.operands[1].mem.base == X86_REG_RIP
        ):
            target = insn.address + insn.size + insn.operands[1].mem.disp
            if 0x140D87000 <= target <= 0x140D89000:
                inline_partlight_vtable_writes.append({"at": hx(insn.address), "targetVa": hx(target)})
        if (
            insn.mnemonic == "lea"
            and len(insn.operands) == 2
            and insn.operands[1].type == X86_OP_MEM
            and int(insn.operands[1].mem.disp) == 0x470
        ):
            gob_partlight_list_offsets.append({"at": hx(insn.address), "offset": "0x470"})
        if (
            insn.mnemonic == "call"
            and insn.operands
            and insn.operands[0].type == X86_OP_IMM
        ):
            target = int(insn.operands[0].imm)
            direct_calls.append({"at": hx(insn.address), "targetVa": hx(target), "target": export_by_va.get(target)})

    add_calls = [entry for entry in direct_calls if entry["target"] == "CExoArrayList<PartLight>::Add"]
    if allocation_size is None and not add_calls and not gob_partlight_list_offsets:
        return None
    return {
        "createdPartLightSizeBytes": allocation_size,
        "inlinePartLightVtableWriteCount": len(inline_partlight_vtable_writes),
        "inlinePartLightVtableWrites": inline_partlight_vtable_writes[:8],
        "gobPartLightListOffsets": gob_partlight_list_offsets,
        "partLightListAddCalls": add_calls,
        "proofStatus": (
            "source-backed-mdlnodelight-internalcreateinstance-partlight-create-gob-list-attach"
            if allocation_size == 0xC0 and add_calls and gob_partlight_list_offsets
            else "partial-mdlnodelight-partlight-lifecycle-evidence"
        ),
    }


def extract_gob_collect_lights_evidence(
    code: bytes, begin_va: int
) -> dict[str, object] | None:
    md = Cs(CS_ARCH_X86, CS_MODE_64)
    md.detail = True
    as_partlight_vtable_call_offsets = []
    output_list_writes = []
    child_walk_offsets = []
    for insn in md.disasm(code, begin_va):
        if insn.mnemonic == "call" and "qword ptr" in insn.op_str and "+ 0x48" in insn.op_str:
            as_partlight_vtable_call_offsets.append(hx(insn.address))
        if (
            insn.mnemonic == "mov"
            and len(insn.operands) == 2
            and insn.operands[0].type == X86_OP_MEM
            and insn.operands[0].mem.scale == 8
        ):
            output_list_writes.append(hx(insn.address))
        if (
            insn.mnemonic == "cmp"
            and len(insn.operands) == 2
            and insn.operands[0].type == X86_OP_MEM
            and int(insn.operands[0].mem.disp) == 0x40
        ):
            child_walk_offsets.append({"at": hx(insn.address), "childCountOffset": "0x40"})
    if not as_partlight_vtable_call_offsets and not output_list_writes:
        return None
    return {
        "asPartLightVtableCallOffsets": as_partlight_vtable_call_offsets,
        "outputListWriteOffsets": output_list_writes[:16],
        "childWalkOffsets": child_walk_offsets,
        "proofStatus": "source-backed-gob-collectlights-aspartlight-recursive-list-build",
    }


def extract_visual_effect_owner_lifecycle(
    code: bytes, begin_va: int, export_by_va: dict[int, str]
) -> dict[str, object] | None:
    md = Cs(CS_ARCH_X86, CS_MODE_64)
    md.detail = True
    constants: dict[str, int] = {}
    parameter_reads = []
    owner_add_calls = []
    owner_remove_calls = []
    network_update_calls = []
    for insn in md.disasm(code, begin_va):
        if insn.mnemonic == "call" and insn.operands and insn.operands[0].type == X86_OP_IMM:
            target = int(insn.operands[0].imm)
            target_name = export_by_va.get(target)
            if target_name in {
                "CGameEffect::GetInteger",
                "CGameEffect::GetObjectID",
                "CGameEffect::GetFloat",
                "CGameEffect::GetVector",
            }:
                index_register = "r8" if target_name == "CGameEffect::GetVector" else "rdx"
                parameter_reads.append(
                    {
                        "at": hx(insn.address),
                        "target": target_name,
                        "effectParameterIndex": constants.get(index_register),
                    }
                )
            elif target_name == "CNWSObject::AddLoopingVisualEffect":
                owner_add_calls.append({"at": hx(insn.address), "targetVa": hx(target), "target": target_name})
            elif target_name == "CNWSObject::RemoveLoopingVisualEffect":
                owner_remove_calls.append({"at": hx(insn.address), "targetVa": hx(target), "target": target_name})
            elif target_name == "CNWSMessage::SendServerToPlayerGameObjUpdateVisEffect":
                network_update_calls.append({"at": hx(insn.address), "targetVa": hx(target), "target": target_name})
        update_constant_registers(insn, constants)

    if not parameter_reads and not owner_add_calls and not owner_remove_calls and not network_update_calls:
        return None
    if owner_add_calls and network_update_calls:
        proof_status = "source-backed-onapplyvisualeffect-addloopingvisualeffect-owner-list-and-network-update"
    elif owner_remove_calls:
        proof_status = "source-backed-onremovevisualeffect-removeloopingvisualeffect-owner-list"
    else:
        proof_status = "partial-visualeffect-owner-lifecycle-evidence"
    return {
        "effectParameterReads": parameter_reads,
        "ownerListAddCalls": owner_add_calls,
        "ownerListRemoveCalls": owner_remove_calls,
        "networkUpdateCalls": network_update_calls,
        "proofStatus": proof_status,
    }


def extract_looping_visual_effect_record_layout(code: bytes, begin_va: int) -> dict[str, object] | None:
    md = Cs(CS_ARCH_X86, CS_MODE_64)
    md.detail = True
    transform_offset = None
    visual_effect_id_offset = None
    object_id_offset = None
    subtype_or_flags_offset = None
    default_object_id = None
    transform_tree_init_calls = []
    for insn in md.disasm(code, begin_va):
        if (
            insn.mnemonic == "lea"
            and len(insn.operands) == 2
            and insn.operands[0].type == X86_OP_REG
            and insn.operands[0].reg == X86_REG_RBX
            and insn.operands[1].type == X86_OP_MEM
            and insn.operands[1].mem.base == X86_REG_RCX
            and int(insn.operands[1].mem.disp) == 0x10
        ):
            transform_offset = 0x10
        if insn.mnemonic == "call" and insn.operands and insn.operands[0].type == X86_OP_IMM:
            transform_tree_init_calls.append({"at": hx(insn.address), "targetVa": hx(int(insn.operands[0].imm))})
        if insn.mnemonic == "mov" and len(insn.operands) == 2 and insn.operands[0].type == X86_OP_MEM:
            mem = insn.operands[0].mem
            base_name = normalized_register_name(insn, mem.base) if mem.base else None
            if base_name != "rdi":
                continue
            if int(mem.disp) == 0 and insn.operands[0].size == 2:
                visual_effect_id_offset = 0
            elif int(mem.disp) == 4 and insn.operands[1].type == X86_OP_IMM:
                object_id_offset = 4
                default_object_id = int(insn.operands[1].imm)
            elif int(mem.disp) == 8 and insn.operands[0].size == 1:
                subtype_or_flags_offset = 8
    if visual_effect_id_offset is None and object_id_offset is None and transform_offset is None:
        return None
    return {
        "recordSizeBytes": 32,
        "visualEffectIdOffset": hx(visual_effect_id_offset),
        "objectIdOffset": hx(object_id_offset),
        "subtypeOrFlagsOffset": hx(subtype_or_flags_offset),
        "transformDataOffset": hx(transform_offset),
        "defaultObjectId": hx(default_object_id),
        "transformTreeInitCalls": transform_tree_init_calls[:4],
        "proofStatus": (
            "source-backed-cloopingvisualeffect-record-layout"
            if visual_effect_id_offset == 0
            and object_id_offset == 4
            and subtype_or_flags_offset == 8
            and transform_offset == 0x10
            else "partial-cloopingvisualeffect-record-layout"
        ),
    }


def extract_looping_visual_effect_list_evidence(
    code: bytes, begin_va: int, display_name: str, export_by_va: dict[int, str]
) -> dict[str, object] | None:
    md = Cs(CS_ARCH_X86, CS_MODE_64)
    md.detail = True
    owner_list_base_offset = None
    owner_list_count_offset = None
    owner_list_capacity_offset = None
    element_size_bytes = None
    list_count_reads = []
    list_count_writes = []
    list_capacity_reads = []
    list_data_reads = []
    list_allocate_calls = []
    element_identity_writes = []
    remove_match_reads = []
    remove_shift_writes = []

    for insn in md.disasm(code, begin_va):
        if (
            display_name == "CNWSObject::AddLoopingVisualEffect"
            and insn.mnemonic == "add"
            and len(insn.operands) == 2
            and insn.operands[0].type == X86_OP_REG
            and insn.operands[0].reg == X86_REG_RBX
            and insn.operands[1].type == X86_OP_IMM
            and int(insn.operands[1].imm) == 0x160
        ):
            owner_list_base_offset = 0x160
            owner_list_count_offset = 0x168
            owner_list_capacity_offset = 0x16C
        if insn.mnemonic == "shl" and len(insn.operands) == 2 and insn.operands[1].type == X86_OP_IMM:
            if int(insn.operands[1].imm) == 5:
                element_size_bytes = 32
        if insn.mnemonic == "call" and insn.operands and insn.operands[0].type == X86_OP_IMM:
            target = int(insn.operands[0].imm)
            if export_by_va.get(target) == "CExoArrayList<CLoopingVisualEffect>::Allocate":
                list_allocate_calls.append({"at": hx(insn.address), "targetVa": hx(target)})

        for operand_index, operand in enumerate(insn.operands):
            if operand.type != X86_OP_MEM:
                continue
            mem = operand.mem
            base_name = normalized_register_name(insn, mem.base) if mem.base else None
            displacement = int(mem.disp)
            is_write = operand_index == 0 and insn.mnemonic in {"mov", "movzx", "inc", "dec"}
            if base_name == "rbx" and display_name in {
                "CNWSObject::AddLoopingVisualEffect",
                "CExoArrayList<CLoopingVisualEffect>::Add",
            }:
                if displacement == 8:
                    entry = {"at": hx(insn.address), "listOffset": "0x8", "ownerObjectOffset": hx(0x168 if owner_list_base_offset == 0x160 else None)}
                    (list_count_writes if is_write else list_count_reads).append(entry)
                elif displacement == 0xC:
                    list_capacity_reads.append(
                        {"at": hx(insn.address), "listOffset": "0xc", "ownerObjectOffset": hx(0x16C if owner_list_base_offset == 0x160 else None)}
                    )
                elif displacement == 0:
                    list_data_reads.append(
                        {"at": hx(insn.address), "listOffset": "0x0", "ownerObjectOffset": hx(owner_list_base_offset)}
                    )
            if base_name in {"rcx", "r15"} and display_name == "CNWSObject::RemoveLoopingVisualEffect":
                if displacement == 0x160:
                    owner_list_base_offset = 0x160
                    list_data_reads.append({"at": hx(insn.address), "ownerObjectOffset": "0x160"})
                elif displacement == 0x168:
                    owner_list_count_offset = 0x168
                    entry = {"at": hx(insn.address), "ownerObjectOffset": "0x168"}
                    (list_count_writes if is_write else list_count_reads).append(entry)
            if base_name == "rcx" and display_name in {
                "CNWSObject::AddLoopingVisualEffect",
                "CExoArrayList<CLoopingVisualEffect>::Add",
            } and is_write:
                if displacement in {0, 4, 8}:
                    field_name = {0: "visualEffectId", 4: "objectId", 8: "subtypeOrFlags"}[displacement]
                    element_identity_writes.append({"at": hx(insn.address), "field": field_name, "elementOffset": hx(displacement)})
            if base_name == "rsi" and display_name == "CNWSObject::RemoveLoopingVisualEffect":
                if displacement in {-4, 0, 4, 0xC, 0x14}:
                    remove_match_reads.append({"at": hx(insn.address), "elementRelativeOffset": hx_signed(displacement)})
            if base_name == "r8" and display_name == "CNWSObject::RemoveLoopingVisualEffect" and is_write:
                if displacement in {0, 4, 8}:
                    field_name = {0: "visualEffectId", 4: "objectId", 8: "subtypeOrFlags"}[displacement]
                    remove_shift_writes.append({"at": hx(insn.address), "field": field_name, "elementOffset": hx(displacement)})

    if (
        owner_list_base_offset is None
        and not list_count_reads
        and not list_count_writes
        and not element_identity_writes
        and not remove_match_reads
    ):
        return None
    if display_name == "CNWSObject::AddLoopingVisualEffect":
        proof_status = "source-backed-cnwsobject-addloopingvisualeffect-list-add-offset-0x160-count-0x168"
    elif display_name == "CNWSObject::RemoveLoopingVisualEffect":
        proof_status = "source-backed-cnwsobject-removeloopingvisualeffect-list-remove-offset-0x160-count-0x168"
    elif display_name == "CExoArrayList<CLoopingVisualEffect>::Add":
        proof_status = "source-backed-cloopingvisualeffect-array-add-element-size-32"
    else:
        proof_status = "partial-loopingvisualeffect-list-evidence"
    return {
        "ownerListBaseOffset": hx(owner_list_base_offset),
        "ownerListCountOffset": hx(owner_list_count_offset),
        "ownerListCapacityOffset": hx(owner_list_capacity_offset),
        "elementSizeBytes": element_size_bytes,
        "listCountReads": list_count_reads[:12],
        "listCountWrites": list_count_writes[:12],
        "listCapacityReads": list_capacity_reads[:8],
        "listDataReads": list_data_reads[:8],
        "listAllocateCalls": list_allocate_calls[:8],
        "elementIdentityWrites": element_identity_writes[:12],
        "removeMatchReads": remove_match_reads[:12],
        "removeShiftWrites": remove_shift_writes[:12],
        "proofStatus": proof_status,
    }


def analyze_function(image: PeImage, export: dict[str, int | str], export_by_va: dict[int, str]) -> dict[str, object]:
    rva = int(export["rva"])
    display_name = REQUESTED_SYMBOLS.get(str(export["name"]), str(export["name"]))
    entry = image.find_function_entry(rva)
    begin_rva = entry["begin_rva"] if entry else rva
    end_rva = entry["end_rva"] if entry else rva
    begin_offset = image.rva_to_offset(begin_rva)
    end_offset = image.rva_to_offset(end_rva)
    code = image.data[begin_offset:end_offset] if begin_offset is not None and end_offset is not None else b""
    range_source = ".pdata"
    fallback_instructions: list[str] = []
    if not code:
        end_rva, code, fallback_instructions = disassemble_linear_fallback(image, rva)
        range_source = "linear-fallback-until-ret-or-jmp"
    short_pdata_range = None
    if display_name == "CNWSObject::RemoveLoopingVisualEffect" and len(code) < 0x100:
        pdata_end_rva = end_rva
        pdata_size = len(code)
        extended_end_rva, extended_code, extended_instructions = disassemble_until_ret(image, rva)
        if len(extended_code) > len(code):
            end_rva = extended_end_rva
            code = extended_code
            range_source = f"{range_source}+linear-ret-scan"
            fallback_instructions = extended_instructions[:24]
            short_pdata_range = {
                "endVa": hx(image.image_base + pdata_end_rva),
                "size": pdata_size,
            }
    if display_name in {
        "CNWSMessage::ComputeUpdateRequired",
        "CNWSMessage::UpdateLastUpdateObject",
    } and len(code) < 0x800:
        pdata_end_rva = end_rva
        pdata_size = len(code)
        extended_end_rva, extended_code, extended_instructions = disassemble_until_ret(image, rva, max_bytes=0x5000)
        if len(extended_code) > len(code):
            end_rva = extended_end_rva
            code = extended_code
            range_source = f"{range_source}+linear-ret-scan"
            fallback_instructions = extended_instructions[:24]
            short_pdata_range = {
                "endVa": hx(image.image_base + pdata_end_rva),
                "size": pdata_size,
            }
    string_by_va = image.find_ascii_needles()

    md = Cs(CS_ARCH_X86, CS_MODE_64)
    md.detail = True
    call_count = 0
    direct_calls = []
    string_refs = []
    unknown_call_targets = []
    for insn in md.disasm(code, image.image_base + begin_rva):
        if insn.mnemonic == "call":
            call_count += 1
            if insn.operands and insn.operands[0].type == X86_OP_IMM:
                target = int(insn.operands[0].imm)
                known_name = export_by_va.get(target)
                if known_name:
                    direct_calls.append({"at": hx(insn.address), "targetVa": hx(target), "target": known_name})
                elif len(unknown_call_targets) < 16:
                    unknown_call_targets.append(hx(target))
        for operand in insn.operands:
            if operand.type == X86_OP_MEM and operand.mem.base == X86_REG_RIP:
                target = insn.address + insn.size + operand.mem.disp
                string_name = string_by_va.get(target)
                if string_name:
                    string_refs.append({"at": hx(insn.address), "targetVa": hx(target), "string": string_name})

    result = {
        "name": export["name"],
        "displayName": display_name,
        "rva": hx(rva),
        "va": hx(int(export["va"])),
        "function": {
            "beginVa": hx(image.image_base + begin_rva),
            "endVa": hx(image.image_base + end_rva),
            "size": len(code),
            "sha256": hashlib.sha256(code).hexdigest() if code else None,
            "rangeSource": range_source,
            "fallbackInstructions": fallback_instructions,
        },
        "callCount": call_count,
        "directCallsToRequestedExports": direct_calls,
        "sampleUnknownDirectCallTargets": unknown_call_targets,
        "ripRelativeStringRefs": string_refs,
    }
    if short_pdata_range is not None:
        result["function"]["shortPdataRange"] = short_pdata_range
    if display_name == "CNWSItemPropertyHandler::ApplyLight":
        bridge = extract_apply_light_item_property_bridge(image, code, image.image_base + begin_rva)
        if bridge is not None:
            result["applyLightItemPropertyBridge"] = bridge
    if display_name == "MdlNodeLight::InternalCreateInstance":
        lifecycle = extract_mdl_node_light_partlight_lifecycle(
            image, code, image.image_base + begin_rva, export_by_va
        )
        if lifecycle is not None:
            result["mdlNodeLightPartLightLifecycle"] = lifecycle
    if display_name == "Gob::CollectLights":
        collect_lights = extract_gob_collect_lights_evidence(code, image.image_base + begin_rva)
        if collect_lights is not None:
            result["gobCollectLightsEvidence"] = collect_lights
    if display_name in {
        "CNWSEffectListHandler::OnApplyVisualEffect",
        "CNWSEffectListHandler::OnRemoveVisualEffect",
    }:
        lifecycle = extract_visual_effect_owner_lifecycle(code, image.image_base + begin_rva, export_by_va)
        if lifecycle is not None:
            result["visualEffectOwnerLifecycle"] = lifecycle
    if display_name == "CLoopingVisualEffect::CLoopingVisualEffect":
        record_layout = extract_looping_visual_effect_record_layout(code, image.image_base + begin_rva)
        if record_layout is not None:
            result["loopingVisualEffectRecordLayout"] = record_layout
    if display_name in {
        "CNWSObject::AddLoopingVisualEffect",
        "CNWSObject::RemoveLoopingVisualEffect",
        "CExoArrayList<CLoopingVisualEffect>::Add",
    }:
        list_evidence = extract_looping_visual_effect_list_evidence(
            code, image.image_base + begin_rva, display_name, export_by_va
        )
        if list_evidence is not None:
            result["loopingVisualEffectListEvidence"] = list_evidence
    if display_name in VISUAL_EFFECT_MESSAGE_TARGET_NAMES:
        message_evidence = extract_visual_effect_message_update_evidence(
            code, image.image_base + begin_rva, display_name, export_by_va
        )
        if message_evidence is not None:
            result["visualEffectMessageUpdateEvidence"] = message_evidence
    if display_name == "CNWSMessage::WriteGameObjUpdate_UpdateObject":
        network_evidence = extract_visual_effect_network_update_evidence(
            code, image.image_base + begin_rva, display_name, export_by_va
        )
        if network_evidence is not None:
            result["visualEffectNetworkUpdateEvidence"] = network_evidence
    return result


def scan_capstone_free_binary_call_target_evidence(
    image: PeImage, requested: list[dict[str, int | str]]
) -> dict[str, object]:
    client_targets: dict[int, str] = {}
    if image.path.name.lower() == "nwmain.exe":
        client_targets.update(rebase_retail_target_map(image, CLIENT_VFX_HELPER_NAMES))
        for name, metadata in CLIENT_VFX_FUNCTIONS.items():
            client_targets[rebase_retail_va(image, int(metadata["va"]))] = name
        for va, name in [
            (0x140762180, "CNWCObject::AddLoopingVisualEffect-client-vslot-0x178"),
            (0x140762AD0, "CNWCObject::RemoveLoopingVisualEffect-client-vslot-0x180"),
            (0x140765B00, "CNWCItem::AddLoopingVisualEffect-client-vslot-0x178"),
            (0x140765BD0, "CNWCItem::RemoveLoopingVisualEffect-client-vslot-0x180"),
        ]:
            client_targets[rebase_retail_va(image, va)] = name

    client_direct_xrefs = scan_relative_call_xrefs(image, client_targets, max_hits_per_target=4096)
    client_string_hits = []
    if image.path.name.lower() == "nwmain.exe":
        for text in CLIENT_VFX_STRING_NEEDLES:
            va = find_ascii_string_va(image, text)
            if va is not None:
                client_string_hits.append({"string": text, "va": hx(va)})

    light_manager_xrefs = scan_light_manager_xrefs(image, requested)
    visual_effect_message_xrefs = scan_visual_effect_message_xrefs(image, requested)
    client_direct_target_summary = summarize_direct_call_xrefs_by_target(client_direct_xrefs)
    client_observed_target_families = classify_client_vfx_target_families(client_direct_xrefs)
    client_known_function_callgraph = (
        scan_client_vfx_known_function_callgraph_capstone_free(image)
        if image.path.name.lower() == "nwmain.exe"
        else None
    )

    return {
        "proofStatus": "capstone-free-binary-relative-call-target-scan-ran",
        "method": "raw x64 E8 rel32 direct-call target scan plus absolute VA/string inventory; no instruction operand semantics",
        "lightManagerRelativeCallEvidence": light_manager_xrefs,
        "visualEffectMessageRelativeCallEvidence": visual_effect_message_xrefs,
        "clientVisualEffectTargetCount": len(client_targets),
        "clientVisualEffectDirectCallXrefCount": len(client_direct_xrefs),
        "clientVisualEffectDirectCallXrefs": client_direct_xrefs[:128],
        "clientVisualEffectDirectCallTargetSummary": client_direct_target_summary,
        "clientVisualEffectObservedTargetFamilies": client_observed_target_families,
        "clientKnownFunctionCallgraph": client_known_function_callgraph,
        "clientVisualEffectSchedulerDataFlowProofStatus": (
            "blocked-direct-call-targets-show-vfx-loader-object-attach-not-progfx-param-scheduler-dataflow"
            if client_direct_xrefs
            else "blocked-no-client-vfx-direct-call-targets-observed"
        ),
        "clientVisualEffectStringNeedleHits": client_string_hits,
        "remainingBlockedSemantics": [
            "capstone-free scan does not recover register/data-flow conditions, vtable dispatch, or scheduler ordering",
            "ProgFX Type 4 priority/proximity/vision/shadow semantics still require disassembly or retail oracle evidence",
        ],
    }


def analyze_binary(path: Path) -> dict[str, object]:
    if _CAPSTONE_IMPORT_ERROR is not None:
        if path.exists():
            image = PeImage(path)
            requested = [entry for entry in image.exports if entry["name"] in REQUESTED_SYMBOLS]
            fallback_evidence = scan_capstone_free_binary_call_target_evidence(image, requested)
            client_receive_render_evidence = (
                scan_client_visual_effect_receive_render_evidence_capstone_free(image)
                if path.name.lower() == "nwmain.exe"
                else None
            )
            return {
                "source": str(path).replace("\\", "/"),
                "imageBase": hx(image.image_base),
                "requestedExportCount": len(requested),
                "functions": [],
                "lightManagerRetailXrefs": fallback_evidence["lightManagerRelativeCallEvidence"],
                "visualEffectMessageRetailXrefs": fallback_evidence[
                    "visualEffectMessageRelativeCallEvidence"
                ],
                "capstoneFreeCallTargetEvidence": fallback_evidence,
                "clientVisualEffectReceiveRenderEvidence": client_receive_render_evidence
                or {
                    "proofStatus": "blocked-capstone-missing-client-vfx-disassembly-call-target-scan-ran",
                    "requiredPythonPackage": "capstone",
                    "importError": str(_CAPSTONE_IMPORT_ERROR),
                    "capstoneFreeCallTargetEvidence": fallback_evidence,
                    "remainingBlockedSemantics": [
                        "client LoadVisualEffect/ProgFX Type 4 scheduler cannot be fully disassembled in this environment",
                        "capstone-free direct-call scan cannot recover indirect/vtable scheduler semantics",
                        "retail binary callgraph still requires capstone or another local x86-64 disassembler for exact scheduler parity",
                    ],
                },
                "proofStatus": "partial-capstone-free-retail-light-binary-call-target-scan-disassembly-blocked",
            }
        return {
            "source": str(path).replace("\\", "/"),
            "requestedExportCount": 0,
            "functions": [],
            "lightManagerRetailXrefs": None,
            "visualEffectMessageRetailXrefs": None,
            "capstoneFreeCallTargetEvidence": {
                "proofStatus": "not-run-binary-missing-capstone-free-call-target-scan",
                "remainingBlockedSemantics": [
                    "binary file path does not exist, so even capstone-free target scanning could not run"
                ],
            },
            "clientVisualEffectReceiveRenderEvidence": {
                "proofStatus": "blocked-capstone-missing-client-vfx-binary-callgraph-not-audited",
                "requiredPythonPackage": "capstone",
                "importError": str(_CAPSTONE_IMPORT_ERROR),
                "remainingBlockedSemantics": [
                    "client LoadVisualEffect/ProgFX Type 4 scheduler callgraph cannot be disassembled in this environment",
                    "retail binary callgraph still requires capstone or another local x86-64 disassembler",
                ],
            },
            "proofStatus": "blocked-capstone-missing-retail-light-binary-disassembly-not-run",
        }
    image = PeImage(path)
    requested = [entry for entry in image.exports if entry["name"] in REQUESTED_SYMBOLS]
    export_by_va = {int(entry["va"]): REQUESTED_SYMBOLS.get(str(entry["name"]), str(entry["name"])) for entry in requested}
    return {
        "source": str(path).replace("\\", "/"),
        "imageBase": hx(image.image_base),
        "requestedExportCount": len(requested),
        "functions": [analyze_function(image, entry, export_by_va) for entry in requested],
        "lightManagerRetailXrefs": scan_light_manager_xrefs(image, requested),
        "visualEffectMessageRetailXrefs": scan_visual_effect_message_xrefs(image, requested),
        "clientVisualEffectReceiveRenderEvidence": scan_client_visual_effect_receive_render_evidence(image),
    }


def read_toolset_u32_table(image: PeImage, va: int, count: int) -> list[int | None]:
    return [
        read_u32_va(image, rebase_toolset_va(image, va + index * 4))
        for index in range(count)
    ]


def describe_gl_table_slots(
    values: list[int | None],
    names: dict[int, str],
    required_slots: set[int] | None = None,
) -> list[dict[str, object]]:
    slots: list[dict[str, object]] = []
    for slot, value in enumerate(values):
        if required_slots is not None and slot not in required_slots:
            continue
        slots.append(
            {
                "slot": slot,
                "value": hx(value),
                "name": names.get(value, "UNKNOWN") if value is not None else "MISSING",
            }
        )
    return slots


def read_rel32_call_target(image: PeImage, va: int, max_bytes: int = 32) -> int | None:
    code = read_bytes_va(image, va, max_bytes)
    if code is None:
        return None
    for index in range(0, max(0, len(code) - 4)):
        if code[index] != 0xE8:
            continue
        relative = int.from_bytes(code[index + 1 : index + 5], "little", signed=True)
        return va + index + 5 + relative
    return None


def decode_toolset_render_state_jump_table_case(
    image: PeImage,
    table_va: int,
    slot: int,
    expected_call_target_va: int,
) -> dict[str, object]:
    table_entry_va = rebase_toolset_va(image, table_va + slot * 4)
    raw_case_va = read_u32_va(image, table_entry_va)
    case_va = rebase_toolset_va(image, raw_case_va) if raw_case_va is not None else None
    leading_bytes = read_bytes_va(image, case_va, 18) if case_va is not None else None
    pushed_cap = read_u32(leading_bytes, 1) if leading_bytes is not None and leading_bytes[:1] == b"\x68" else None
    call_target_va = read_rel32_call_target(image, case_va) if case_va is not None else None
    expected_target_va = rebase_toolset_va(image, expected_call_target_va)

    return {
        "slot": slot,
        "jumpTableVa": hx(rebase_toolset_va(image, table_va)),
        "entryVa": hx(table_entry_va),
        "rawCaseVa": hx(raw_case_va),
        "caseVa": hx(case_va),
        "leadingBytes": leading_bytes.hex(" ") if leading_bytes is not None else None,
        "pushImmediate": hx(pushed_cap),
        "glCapability": GL_CAP_NAMES.get(pushed_cap, "UNKNOWN") if pushed_cap is not None else "MISSING",
        "callTargetVa": hx(call_target_va),
        "expectedCallTargetVa": hx(expected_target_va),
        "callTargetStatus": (
            "matches-expected-gl-wrapper"
            if call_target_va == expected_target_va
            else "blocked-call-target-mismatch"
        ),
    }


def scan_toolset_shadow_volume_render_state_wrapper_evidence(
    binary_path: Path = DEFAULT_TOOLSET_BINARY,
) -> dict[str, object]:
    if not binary_path.exists():
        return {
            "source": str(binary_path).replace("\\", "/"),
            "proofStatus": "blocked-toolset-binary-missing",
        }

    try:
        image = PeImage(binary_path)
    except Exception as exc:
        return {
            "source": str(binary_path).replace("\\", "/"),
            "proofStatus": "blocked-toolset-binary-pe-read-failed",
            "error": str(exc),
        }

    slot = TOOLSET_SHADOW_VOLUME_RENDER_STATE_SLOT
    enable_case = decode_toolset_render_state_jump_table_case(
        image,
        TOOLSET_RENDER_STATE_ENABLE_TABLE_VA,
        slot,
        TOOLSET_RENDER_STATE_GL_ENABLE_WRAPPER_VA,
    )
    disable_case = decode_toolset_render_state_jump_table_case(
        image,
        TOOLSET_RENDER_STATE_DISABLE_TABLE_VA,
        slot,
        TOOLSET_RENDER_STATE_GL_DISABLE_WRAPPER_VA,
    )
    proof_ready = (
        enable_case["pushImmediate"] == "0xb44"
        and disable_case["pushImmediate"] == "0xb44"
        and enable_case["callTargetStatus"] == "matches-expected-gl-wrapper"
        and disable_case["callTargetStatus"] == "matches-expected-gl-wrapper"
    )

    return {
        "source": str(binary_path).replace("\\", "/"),
        "imageBase": hx(image.image_base),
        "slot": slot,
        "sourceCalls": [
            "FUN_00a7818c(3)->FUN_00a6f0bc(3)",
            "FUN_00a7816c(3)->FUN_00a6ef90(3)",
        ],
        "glCapability": "GL_CULL_FACE" if proof_ready else "UNKNOWN",
        "glCapabilityHex": "0xb44" if proof_ready else None,
        "disableCase": disable_case,
        "enableCase": enable_case,
        "proofStatus": (
            "source-backed-toolset-binary-render-state-slot3-gl-cull-face-mapped"
            if proof_ready
            else "partial-toolset-binary-render-state-slot3-cap-mapping"
        ),
    }


def scan_toolset_shadow_volume_stencil_face_op_evidence(
    binary_path: Path = DEFAULT_TOOLSET_BINARY,
) -> dict[str, object]:
    if not binary_path.exists():
        return {
            "source": str(binary_path).replace("\\", "/"),
            "proofStatus": "blocked-toolset-binary-missing",
        }

    try:
        image = PeImage(binary_path)
    except Exception as exc:
        return {
            "source": str(binary_path).replace("\\", "/"),
            "proofStatus": "blocked-toolset-binary-pe-read-failed",
            "error": str(exc),
        }

    proc_pointer_va = rebase_toolset_va(image, TOOLSET_STENCIL_OP_SEPARATE_PROC_POINTER_VA)
    expected_proc_value = rebase_toolset_va(image, TOOLSET_GL_STENCIL_OP_SEPARATE_POINTER_VA)
    proc_pointer_value = read_u32_va(image, proc_pointer_va)
    face_values = read_toolset_u32_table(image, TOOLSET_STENCIL_FACE_TABLE_VA, 4)
    op_values = read_toolset_u32_table(image, TOOLSET_STENCIL_OP_TABLE_VA, 8)
    expected_face_values = [0x0404, 0x0405]
    expected_op_values = {0: 0x1E00, 3: 0x1E02, 4: 0x1E03}
    face_slots_match = face_values[:2] == expected_face_values
    op_slots_match = all(op_values[slot] == value for slot, value in expected_op_values.items())
    proc_pointer_matches = proc_pointer_value == expected_proc_value
    proof_ready = face_slots_match and op_slots_match and proc_pointer_matches

    return {
        "source": str(binary_path).replace("\\", "/"),
        "imageBase": hx(image.image_base),
        "procPointerVa": hx(proc_pointer_va),
        "procPointerValue": hx(proc_pointer_value),
        "expectedGlStencilOpSeparateProcPointer": hx(expected_proc_value),
        "procPointerStatus": (
            "toolset-data-pointer-matches-glStencilOpSeparate-proc-slot"
            if proc_pointer_matches
            else "blocked-toolset-glStencilOpSeparate-proc-pointer-mismatch"
        ),
        "faceTableVa": hx(rebase_toolset_va(image, TOOLSET_STENCIL_FACE_TABLE_VA)),
        "faceSlotMap": describe_gl_table_slots(face_values, GL_STENCIL_FACE_NAMES, {0, 1, 2}),
        "opTableVa": hx(rebase_toolset_va(image, TOOLSET_STENCIL_OP_TABLE_VA)),
        "opSlotMap": describe_gl_table_slots(op_values, GL_STENCIL_OP_NAMES, {0, 3, 4}),
        "zPassResolvedOps": [
            {
                "sourceCall": "FUN_00a78344(0,0,0,3)",
                "faceSlot": 0,
                "face": "GL_FRONT",
                "stencilFail": "GL_KEEP",
                "depthFail": "GL_KEEP",
                "depthPass": "GL_INCR",
            },
            {
                "sourceCall": "FUN_00a78344(1,0,0,4)",
                "faceSlot": 1,
                "face": "GL_BACK",
                "stencilFail": "GL_KEEP",
                "depthFail": "GL_KEEP",
                "depthPass": "GL_DECR",
            },
        ],
        "zFailResolvedOps": [
            {
                "sourceCall": "FUN_00a78344(0,0,4,0)",
                "faceSlot": 0,
                "face": "GL_FRONT",
                "stencilFail": "GL_KEEP",
                "depthFail": "GL_DECR",
                "depthPass": "GL_KEEP",
            },
            {
                "sourceCall": "FUN_00a78344(1,0,3,0)",
                "faceSlot": 1,
                "face": "GL_BACK",
                "stencilFail": "GL_KEEP",
                "depthFail": "GL_INCR",
                "depthPass": "GL_KEEP",
            },
        ],
        "proofStatus": (
            "source-backed-toolset-binary-glstencilopseparate-face-op-table-mapped"
            if proof_ready
            else "partial-toolset-binary-glstencilopseparate-face-op-table"
        ),
    }


def scan_shadow_volume_projection_evidence(
    source_path: Path = DEFAULT_DECOMPILED_SOURCE,
    toolset_binary_path: Path | None = DEFAULT_TOOLSET_BINARY,
) -> dict[str, object]:
    if not source_path.exists():
        return {
            "source": str(source_path).replace("\\", "/"),
            "proofStatus": "blocked-decompiled-source-missing",
        }

    first_hits: dict[str, dict[str, object]] = {}
    render_path_hits: list[dict[str, object]] = []
    light_profile_hits: list[dict[str, object]] = []
    shadow_opacity_hits: list[dict[str, object]] = []
    caster_draw_callsite_hits: list[dict[str, object]] = []
    caster_draw_wrapper_hits: list[dict[str, object]] = []
    caster_draw_dispatch_hits: list[dict[str, object]] = []
    caster_buffer_trigger_hits: list[dict[str, object]] = []
    caster_buffer_allocation_hits: list[dict[str, object]] = []
    caster_buffer_write_hits: list[dict[str, object]] = []
    caster_vertex_transform_hits: list[dict[str, object]] = []
    caster_vertex_pair_write_hits: list[dict[str, object]] = []
    caster_index_pattern_hits: list[dict[str, object]] = []
    caster_buffer_finalize_hits: list[dict[str, object]] = []
    render_state_wrapper_hits: list[dict[str, object]] = []
    render_state_stack_hits: list[dict[str, object]] = []
    render_state_sequence_hits: list[dict[str, object]] = []
    blend_depth_color_mask_wrapper_hits: list[dict[str, object]] = []
    blend_depth_color_mask_facade_wrapper_hits: list[dict[str, object]] = []
    local_draw_state_order_hits: list[dict[str, object]] = []
    local_blend_depth_color_mask_call_hits: list[dict[str, object]] = []
    immediate_caller_blend_depth_color_mask_call_hits: list[dict[str, object]] = []
    direct_caller_buffer_builder_hits: list[dict[str, object]] = []
    direct_caller_blend_depth_color_mask_call_hits: list[dict[str, object]] = []
    active_light_render_envelope_hits: list[dict[str, object]] = []
    active_light_render_envelope_state_hits: list[dict[str, object]] = []
    active_light_render_envelope_vtable_hits: list[dict[str, object]] = []
    active_light_render_envelope_color_depth_mask_hits: list[dict[str, object]] = []
    shader_uniform_wrapper_hits: list[dict[str, object]] = []
    shader_uniform_target_hits: list[dict[str, object]] = []
    shader_uniform_sequence_hits: list[dict[str, object]] = []
    stencil_op_wrapper_hits: list[dict[str, object]] = []
    stencil_op_dispatch_hits: list[dict[str, object]] = []
    stencil_op_cache_hits: list[dict[str, object]] = []
    stencil_op_sequence_hits: list[dict[str, object]] = []
    with source_path.open("r", encoding="utf-8", errors="replace") as handle:
        for line_number, raw_line in enumerate(handle, start=1):
            line = raw_line.strip()
            for key, needle in SHADOW_VOLUME_SOURCE_NEEDLES.items():
                if needle in line and key not in first_hits:
                    first_hits[key] = {
                        "line": line_number,
                        "needle": needle,
                        "text": line[:240],
                    }
            if "ShadowOpacity" in line and len(shadow_opacity_hits) < 8:
                shadow_opacity_hits.append({"line": line_number, "text": line[:240]})
            if 913914 <= line_number <= 914017 and (
                "shadowvol" in line
                or "FUN_00a78128" in line
                or "+ 0x58" in line
                or "+ 0x5c" in line
                or "+ 0x60" in line
                or "+ 0x64" in line
            ):
                render_path_hits.append({"line": line_number, "text": line[:240]})
            if 913930 <= line_number <= 913980 and (
                "+ 0x58" in line or "+ 0x60" in line or "+ 0x64" in line
            ):
                light_profile_hits.append({"line": line_number, "text": line[:240]})
            if "FUN_00a78128(" in line and len(caster_draw_callsite_hits) < 24:
                caster_draw_callsite_hits.append({"line": line_number, "text": line[:240]})
            if 904108 <= line_number <= 904112 and (
                "FUN_00a78128" in line or "FUN_00a75e3c" in line
            ):
                caster_draw_wrapper_hits.append({"line": line_number, "text": line[:240]})
            if 902867 <= line_number <= 902912 and (
                "FUN_00a75e3c" in line
                or "FUN_00a762e4" in line
                or "FUN_00a6a648" in line
                or "FUN_00a6a62c" in line
                or "FUN_00a6a664" in line
                or "FUN_00a6a684" in line
                or "PTR_DAT_00d3dda8" in line
                or "glDrawArrays" in line
            ):
                caster_draw_dispatch_hits.append({"line": line_number, "text": line[:240]})
            if 904308 <= line_number <= 904311 and (
                "FUN_00a78344" in line or "FUN_00a6f2b4" in line
            ):
                stencil_op_wrapper_hits.append({"line": line_number, "text": line[:240]})
            if 898307 <= line_number <= 898416 and (
                "FUN_00a6ef90" in line
                or "FUN_00a6f0bc" in line
                or "glEnable" in line
                or "glDisable" in line
                or "_DAT_00d01c0c" in line
            ):
                render_state_wrapper_hits.append({"line": line_number, "text": line[:240]})
            if (
                (898421 <= line_number <= 898425)
                or (898533 <= line_number <= 898563)
                or (898618 <= line_number <= 898634)
            ) and (
                "FUN_00a6f1ec" in line
                or "FUN_00a6f3bc" in line
                or "FUN_00a6f4f8" in line
                or "FUN_00a6f518" in line
                or "glBlendFunc" in line
                or "glColorMask" in line
                or "glDepthMask" in line
                or "glDepthFunc" in line
                or "DAT_00ccb044" in line
                or "DAT_00ccb04c" in line
            ):
                blend_depth_color_mask_wrapper_hits.append(
                    {"line": line_number, "text": line[:240]}
                )
            for facade_window in SHADOW_VOLUME_BLEND_DEPTH_COLOR_MASK_FACADE_WINDOWS:
                if not (
                    facade_window["lineStart"] <= line_number <= facade_window["lineEnd"]
                ):
                    continue
                function_name = str(facade_window["function"])
                target_name = str(facade_window["target"])
                if function_name in line or target_name in line:
                    blend_depth_color_mask_facade_wrapper_hits.append(
                        {
                            "line": line_number,
                            "semantic": facade_window["semantic"],
                            "function": function_name,
                            "target": target_name,
                            "text": line[:240],
                        }
                    )
            if 896387 <= line_number <= 896475 and (
                "FUN_00a6c44c" in line
                or "FUN_00a6c520" in line
                or "0x40" in line
                or "DAT_00e32024" in line
            ):
                render_state_stack_hits.append({"line": line_number, "text": line[:240]})
            if 913929 <= line_number <= 914027 and (
                "FUN_00a7818c(3)" in line
                or "FUN_00a7816c(3)" in line
                or "FUN_00a780f0" in line
                or "FUN_00a780e8" in line
            ):
                render_state_sequence_hits.append({"line": line_number, "text": line[:240]})
            if 913929 <= line_number <= 914033:
                for order_entry in SHADOW_VOLUME_LOCAL_DRAW_STATE_ORDER:
                    if order_entry["needle"] in line and not any(
                        hit["call"] == order_entry["call"]
                        for hit in local_draw_state_order_hits
                    ):
                        local_draw_state_order_hits.append(
                            {
                                "line": line_number,
                                "call": order_entry["call"],
                                "role": order_entry["role"],
                                "text": line[:240],
                            }
                        )
                for needle in SHADOW_VOLUME_LOCAL_BLEND_DEPTH_COLOR_MASK_NEEDLES:
                    if needle in line:
                        local_blend_depth_color_mask_call_hits.append(
                            {
                                "line": line_number,
                                "needle": needle,
                                "text": line[:240],
                            }
                        )
            if 904560 <= line_number <= 904970 and (
                "FUN_00a785d4" in line
                or "FUN_00a6dda4" in line
                or "FUN_00a788b0" in line
                or "FUN_00a74fd0" in line
                or "FUN_00a78980" in line
                or "FUN_00a72764" in line
                or "FUN_00a78994" in line
                or "FUN_00a7278c" in line
            ):
                shader_uniform_wrapper_hits.append({"line": line_number, "text": line[:240]})
            if (
                (897399 <= line_number <= 897404)
                or (902170 <= line_number <= 902176)
                or (900852 <= line_number <= 900856)
                or (900870 <= line_number <= 900884)
            ) and (
                "FUN_00a6dda4" in line
                or "FUN_00a482a8" in line
                or "DAT_00e34710" in line
                or "FUN_00a74fd0" in line
                or "DAT_00cff754" in line
                or "FUN_00a72764" in line
                or "DAT_00e346b4" in line
                or "FUN_00a7278c" in line
                or "DAT_00cff71c" in line
            ):
                shader_uniform_target_hits.append({"line": line_number, "text": line[:240]})
            if 913995 <= line_number <= 914014 and (
                "FUN_00a785d4" in line
                or "FUN_00a788b0" in line
                or "FUN_00a78994" in line
                or "FUN_00a78980" in line
            ):
                shader_uniform_sequence_hits.append({"line": line_number, "text": line[:240]})
            if 898458 <= line_number <= 898511 and (
                "FUN_00a6f2b4" in line
                or "PTR_DAT_00d3dd6c" in line
                or "(&DAT_00ccb008)" in line
            ):
                stencil_op_dispatch_hits.append({"line": line_number, "text": line[:240]})
            if 898458 <= line_number <= 898511 and (
                "(&DAT_00ccb008)" in line or "iVar1 = 3" in line or "iVar1 = 0" in line
            ):
                stencil_op_cache_hits.append({"line": line_number, "text": line[:240]})
            if 913986 <= line_number <= 914033 and "FUN_00a78344" in line:
                stencil_op_sequence_hits.append({"line": line_number, "text": line[:240]})
            if 888188 <= line_number <= 888213 and (
                "local_30" in line
                or "local_58" in line
                or "FUN_00a878f8" in line
                or "+ 0x68" in line
                or "+ 100" in line
                or "FUN_00a6a828" in line
            ):
                caster_buffer_trigger_hits.append({"line": line_number, "text": line[:240]})
                for needle in SHADOW_VOLUME_LOCAL_BLEND_DEPTH_COLOR_MASK_NEEDLES:
                    if needle in line:
                        immediate_caller_blend_depth_color_mask_call_hits.append(
                            {
                                "line": line_number,
                                "needle": needle,
                                "text": line[:240],
                            }
                        )
                for needle in (
                    "FUN_00a6f1ec",
                    "FUN_00a6f3bc",
                    "FUN_00a6f4f8",
                    "FUN_00a6f518",
                ):
                    if needle in line:
                        immediate_caller_blend_depth_color_mask_call_hits.append(
                            {
                                "line": line_number,
                                "needle": needle,
                                "text": line[:240],
                            }
                        )
            if 888069 <= line_number <= 888414:
                if (
                    "FUN_00a5fdb4" in line
                    or "FUN_00a878f8" in line
                    or "FUN_00a69868" in line
                    or "FUN_00a6a370" in line
                    or "FUN_00a6a6a4" in line
                    or "FUN_00a6a6dc" in line
                    or "FUN_00b2f49c" in line
                    or "FUN_00a6a798" in line
                    or "FUN_00a6a754" in line
                    or "local_30" in line
                    or "local_58" in line
                ):
                    direct_caller_buffer_builder_hits.append(
                        {"line": line_number, "text": line[:240]}
                    )
                for needle in SHADOW_VOLUME_LOCAL_BLEND_DEPTH_COLOR_MASK_NEEDLES:
                    if needle in line:
                        direct_caller_blend_depth_color_mask_call_hits.append(
                            {
                                "line": line_number,
                                "needle": needle,
                                "text": line[:240],
                            }
                        )
            if 910553 <= line_number <= 910663:
                if (
                    "FUN_00a82464" in line
                    or "DAT_00d0233c = param_1" in line
                    or "DAT_00d0233c = 0" in line
                    or "FUN_00a91200" in line
                    or "FUN_00a78a04" in line
                    or "FUN_00a7dda0" in line
                    or "+ 0x138" in line
                    or "+ 0x108" in line
                ):
                    active_light_render_envelope_hits.append(
                        {"line": line_number, "text": line[:240]}
                    )
                if (
                    "FUN_00a7816c(1)" in line
                    or "FUN_00a7816c(0)" in line
                    or "FUN_00a7816c(4)" in line
                    or "FUN_00a7816c(5)" in line
                    or "FUN_00a78724" in line
                    or "FUN_00a7819c" in line
                ):
                    active_light_render_envelope_state_hits.append(
                        {"line": line_number, "text": line[:240]}
                    )
                if "+ 0x138" in line or "+ 0x108" in line:
                    active_light_render_envelope_vtable_hits.append(
                        {"line": line_number, "text": line[:240]}
                    )
                for needle in (
                    "FUN_00a78384",
                    "FUN_00a785bc",
                    "FUN_00a6f3bc",
                    "FUN_00a6f4f8",
                ):
                    if needle in line:
                        active_light_render_envelope_color_depth_mask_hits.append(
                            {
                                "line": line_number,
                                "needle": needle,
                                "text": line[:240],
                            }
                        )
            if 888245 <= line_number <= 888256 and (
                "FUN_00a69868" in line
                or "FUN_00a6a5c8" in line
                or "FUN_00a6a370" in line
                or "FUN_00a6a6a4" in line
                or "FUN_00a6a6dc" in line
                or "+ 0x80" in line
                or "+ 0x84" in line
                or "+ 0x88" in line
            ):
                caster_buffer_allocation_hits.append({"line": line_number, "text": line[:240]})
            if 888319 <= line_number <= 888403 and (
                "FUN_00b2f49c" in line
                or "iVar23" in line
                or "puVar13" in line
                or "FUN_00a6a798" in line
                or "FUN_00a6a754" in line
            ):
                caster_buffer_write_hits.append({"line": line_number, "text": line[:240]})
            if 888319 <= line_number <= 888354 and "FUN_00b2f49c" in line:
                caster_vertex_transform_hits.append({"line": line_number, "text": line[:240]})
            if 888323 <= line_number <= 888368 and (
                "local_68 = 0x3f800000" in line
                or "local_68 = 0" in line
                or "iVar23 + iVar18 * 0x20" in line
                or "iVar23 + 0x10 + iVar18 * 0x20" in line
                or "iVar23 + 0x10" in line
            ):
                caster_vertex_pair_write_hits.append({"line": line_number, "text": line[:240]})
            if 888370 <= line_number <= 888397 and (
                "local_50 = uVar17 * 2" in line
                or "local_54 = local_50 + 1" in line
                or "local_61 = local_61 == false" in line
                or "*puVar13 =" in line
                or "puVar13[1]" in line
                or "puVar13[2]" in line
                or "puVar13[3]" in line
                or "puVar13[4]" in line
                or "puVar13[5]" in line
                or "puVar13 = puVar13 + 6" in line
            ):
                caster_index_pattern_hits.append({"line": line_number, "text": line[:240]})
            if 888360 <= line_number <= 888403 and (
                "FUN_00a6a798" in line or "FUN_00a6a754" in line
            ):
                caster_buffer_finalize_hits.append({"line": line_number, "text": line[:240]})

    required_keys = {
        "shadowOpacityField",
        "shadowPlaneAlphaFunction",
        "runtimeExtentsFunction",
        "shadowVertexShader",
        "shadowFragmentShader",
        "casterDrawFunction",
    }
    found_keys = set(first_hits)
    toolset_stencil_face_op_evidence = (
        scan_toolset_shadow_volume_stencil_face_op_evidence(toolset_binary_path)
        if toolset_binary_path is not None
        else {"proofStatus": "blocked-toolset-binary-not-requested"}
    )
    toolset_render_state_wrapper_evidence = (
        scan_toolset_shadow_volume_render_state_wrapper_evidence(toolset_binary_path)
        if toolset_binary_path is not None
        else {"proofStatus": "blocked-toolset-binary-not-requested"}
    )
    stencil_face_op_mapped = (
        toolset_stencil_face_op_evidence.get("proofStatus")
        == "source-backed-toolset-binary-glstencilopseparate-face-op-table-mapped"
    )
    render_state_slot_mapped = (
        toolset_render_state_wrapper_evidence.get("proofStatus")
        == "source-backed-toolset-binary-render-state-slot3-gl-cull-face-mapped"
    )
    expected_local_draw_state_calls = [
        entry["call"] for entry in SHADOW_VOLUME_LOCAL_DRAW_STATE_ORDER
    ]
    observed_local_draw_state_calls = [
        entry["call"] for entry in local_draw_state_order_hits
    ]
    local_draw_state_order_complete = (
        observed_local_draw_state_calls == expected_local_draw_state_calls
    )
    local_blend_depth_color_mask_absent = (
        len(local_blend_depth_color_mask_call_hits) == 0
    )
    local_draw_state_blocked_semantics = []
    if not local_draw_state_order_complete:
        local_draw_state_blocked_semantics.append(
            "FUN_00a878f8 local shadow-volume call order is incomplete in the audited source window"
        )
    if local_blend_depth_color_mask_absent:
        local_draw_state_blocked_semantics.append(
            "FUN_00a878f8 local draw-state order is source-backed, but no local blend/depth/color-mask wrapper calls were found in 913929-914033; inherited outer render-state parity remains unproven"
        )
    else:
        local_draw_state_blocked_semantics.append(
            "FUN_00a878f8 contains local blend/depth/color-mask-like call hits, but their retail GL semantics still need wrapper mapping"
        )
    immediate_caller_state_wrapper_absent = (
        len(immediate_caller_blend_depth_color_mask_call_hits) == 0
    )
    if immediate_caller_state_wrapper_absent:
        local_draw_state_blocked_semantics.append(
            "FUN_00a878f8 immediate caller window 888188-888213 is source-backed as a caster-buffer flush/capacity path and contains no blend/depth/color-mask wrapper call; broader inherited render-state parity remains unproven"
        )
    direct_caller_state_wrapper_absent = (
        len(direct_caller_blend_depth_color_mask_call_hits) == 0
    )
    if direct_caller_state_wrapper_absent:
        local_draw_state_blocked_semantics.append(
            "FUN_00a5fdb4 direct caller/buffer-builder window 888069-888414 is source-backed and contains no blend/depth/color-mask raw or facade wrapper call; inherited render-state parity must be proven from a higher scene render path or retail oracle"
        )
    active_light_render_envelope_vtable_blocked = (
        bool(active_light_render_envelope_hits)
        and bool(active_light_render_envelope_state_hits)
        and bool(active_light_render_envelope_vtable_hits)
        and len(active_light_render_envelope_color_depth_mask_hits) == 0
    )
    if active_light_render_envelope_vtable_blocked:
        local_draw_state_blocked_semantics.append(
            "FUN_00a82464 active-light render envelope 910553-910663 sets DAT_00d0233c, exposes depthFunc/blendFunc facade calls and render-state slot restores around +0x138/+0x108 vtable dispatch, but contains no color/depth-mask wrapper call; exact inherited state through the indirect scene render target remains blocked"
        )
    remaining_blocked_semantics = []
    if not stencil_face_op_mapped:
        remaining_blocked_semantics.append(
            "FUN_00a78344 recovers z-pass/z-fail stencil op triples, but slot 0/1 to GL_FRONT/GL_BACK mapping is not proven by source-only decompilation"
        )
    if not render_state_slot_mapped:
        remaining_blocked_semantics.append(
            "FUN_00a7818c/FUN_00a7816c bracket shadow-volume rendering through render-state slot 3, but the slot-to-GL-capability mapping is not proven by source-only decompilation"
        )
    remaining_blocked_semantics.extend(
        [
            *local_draw_state_blocked_semantics,
            "retail caster paired-vertex/six-index buffer fill is source-backed, but active renderer integration is not proven by this extractor",
            "no pixel/geometry parity capture against retail shadow-volume output",
        ]
    )
    return {
        "source": str(source_path).replace("\\", "/"),
        "requiredNeedles": SHADOW_VOLUME_SOURCE_NEEDLES,
        "firstHits": first_hits,
        "shadowOpacityHits": shadow_opacity_hits,
        "shadowVolumeRenderPathHits": render_path_hits[:24],
        "shadowVolumeLightProfileHits": light_profile_hits[:24],
        "casterDrawCallSiteHits": caster_draw_callsite_hits[:24],
        "casterDrawWrapperEvidence": {
            "wrapperFunction": "FUN_00a78128",
            "targetFunction": "FUN_00a75e3c",
            "wrapperHits": caster_draw_wrapper_hits[:8],
            "dispatchHits": caster_draw_dispatch_hits[:16],
            "proofStatus": (
                "source-backed-shadowvol-caster-draw-wrapper-gl-dispatch"
                if caster_draw_wrapper_hits and caster_draw_dispatch_hits
                else "partial-shadowvol-caster-draw-wrapper"
            ),
        },
        "renderStateWrapperEvidence": {
            "disableWrapper": "FUN_00a7818c(3)->FUN_00a6f0bc(3)",
            "enableWrapper": "FUN_00a7816c(3)->FUN_00a6ef90(3)",
            "stateStackPush": "FUN_00a780f0()->FUN_00a6c520",
            "stateStackPop": "FUN_00a780e8()->FUN_00a6c44c",
            "wrapperHits": render_state_wrapper_hits[:24],
            "stackHits": render_state_stack_hits[:24],
            "sequenceHits": render_state_sequence_hits[:8],
            "toolsetCapabilityEvidence": toolset_render_state_wrapper_evidence,
            "slotCapabilityStatus": (
                "source-backed-toolset-binary-slot-3-gl-cull-face"
                if render_state_slot_mapped
                else "blocked-no-direct-slot-3-capability-mapping-in-decompiled-source"
            ),
            "proofStatus": (
                "source-backed-shadowvol-render-state-slot3-gl-cull-face-stack-bracket-mapped"
                if render_state_slot_mapped
                and render_state_wrapper_hits
                and render_state_stack_hits
                and len(render_state_sequence_hits) >= 2
                else "source-backed-shadowvol-render-state-slot3-stack-bracket-capability-blocked"
                if render_state_wrapper_hits
                and render_state_stack_hits
                and len(render_state_sequence_hits) >= 2
                else "partial-shadowvol-render-state-wrapper"
            ),
        },
        "blendDepthColorMaskWrapperEvidence": {
            "blendFuncWrapper": "FUN_00a6f1ec()->glBlendFunc",
            "colorMaskWrapper": "FUN_00a6f3bc(r,g,b,a)->glColorMask with DAT_00ccb044 cache",
            "depthMaskWrapper": "FUN_00a6f4f8(flag)->glDepthMask with DAT_00ccb04c cache",
            "depthFuncWrapper": "FUN_00a6f518()->glDepthFunc",
            "blendFuncFacade": "FUN_00a7819c()->FUN_00a6f1ec()->glBlendFunc",
            "colorMaskFacade": "FUN_00a78384(r,g,b,a)->FUN_00a6f3bc(r,g,b,a)->glColorMask",
            "depthMaskFacade": "FUN_00a785bc(flag)->FUN_00a6f4f8(flag)->glDepthMask",
            "depthFuncFacade": "FUN_00a78724()->FUN_00a6f518()->glDepthFunc",
            "wrapperHits": blend_depth_color_mask_wrapper_hits[:24],
            "facadeWrapperHits": blend_depth_color_mask_facade_wrapper_hits[:24],
            "proofStatus": (
                "source-backed-render-state-blend-depth-color-mask-wrappers-mapped"
                if len(blend_depth_color_mask_wrapper_hits) >= 8
                and len(blend_depth_color_mask_facade_wrapper_hits) >= 8
                else "partial-render-state-blend-depth-color-mask-wrapper-evidence"
            ),
        },
        "immediateCallerBufferFlushEvidence": {
            "callerLineWindow": "888188-888213",
            "callee": "FUN_00a878f8(DAT_00d0233c)",
            "triggerHits": caster_buffer_trigger_hits[:24],
            "blendDepthColorMaskCallHits": immediate_caller_blend_depth_color_mask_call_hits[:24],
            "proofStatus": (
                "source-backed-shadowvol-immediate-caller-buffer-flush-no-blend-depth-color-mask-state-wrapper"
                if caster_buffer_trigger_hits
                and immediate_caller_state_wrapper_absent
                else "partial-shadowvol-immediate-caller-state-wrapper-evidence"
            ),
        },
        "directCallerBufferBuilderEvidence": {
            "function": "FUN_00a5fdb4",
            "callerLineWindow": "888069-888414",
            "callee": "FUN_00a878f8(DAT_00d0233c)",
            "builderHits": direct_caller_buffer_builder_hits[:32],
            "blendDepthColorMaskCallHits": direct_caller_blend_depth_color_mask_call_hits[:24],
            "proofStatus": (
                "source-backed-shadowvol-direct-caller-buffer-builder-no-blend-depth-color-mask-state-wrapper"
                if direct_caller_buffer_builder_hits
                and direct_caller_state_wrapper_absent
                else "partial-shadowvol-direct-caller-state-wrapper-evidence"
            ),
        },
        "activeLightRenderEnvelopeEvidence": {
            "function": "FUN_00a82464",
            "lineWindow": "910553-910663",
            "activeLightGlobal": "DAT_00d0233c",
            "renderDispatchSlots": ["vtable+0x138", "vtable+0x108"],
            "envelopeHits": active_light_render_envelope_hits[:24],
            "stateWrapperHits": active_light_render_envelope_state_hits[:16],
            "vtableDispatchHits": active_light_render_envelope_vtable_hits[:8],
            "colorDepthMaskCallHits": active_light_render_envelope_color_depth_mask_hits[:16],
            "proofStatus": (
                "source-backed-shadowvol-active-light-render-envelope-vtable-dispatch-blend-depthfunc-wrapper-exposed-parity-blocked"
                if active_light_render_envelope_vtable_blocked
                else "partial-shadowvol-active-light-render-envelope-evidence"
            ),
        },
        "localDrawStateOrderEvidence": {
            "function": "FUN_00a878f8",
            "lineWindow": "913929-914033",
            "orderedCallSequence": local_draw_state_order_hits[:16],
            "expectedCallSequence": expected_local_draw_state_calls,
            "localBlendDepthColorMaskCallHits": local_blend_depth_color_mask_call_hits[:24],
            "blockedSemantics": local_draw_state_blocked_semantics,
            "proofStatus": (
                "source-backed-shadowvol-local-draw-state-order-exposed-outer-blend-depth-color-mask-parity-blocked"
                if local_draw_state_order_complete
                and local_blend_depth_color_mask_absent
                else "source-backed-shadowvol-local-draw-state-order-exposed-blend-depth-color-mask-wrapper-mapping-blocked"
                if local_draw_state_order_complete
                else "partial-shadowvol-local-draw-state-order"
            ),
        },
        "shaderUniformEvidence": {
            "transformUpload": "FUN_00a785d4(light-matrix-pointer)->FUN_00a6dda4()->FUN_00a482a8(0xe320d0,param_1)",
            "shaderProgramBind": "FUN_00a788b0(DAT_00d0247c)->FUN_00a74fd0 stores nonzero program in DAT_00cff754",
            "uniformSlot0": "FUN_00a78994(0)->FUN_00a7278c copies 4 words into DAT_00cff71c + slot*0x10",
            "uniformSlot1": "FUN_00a78980(1,fVar2)->FUN_00a72764 writes scalar into DAT_00e346b4 + slot*4",
            "wrapperHits": shader_uniform_wrapper_hits[:24],
            "targetHits": shader_uniform_target_hits[:24],
            "sequenceHits": shader_uniform_sequence_hits[:8],
            "proofStatus": (
                "source-backed-shadowvol-shader-bind-transform-and-uniform-slot-writes-exposed"
                if shader_uniform_wrapper_hits
                and shader_uniform_target_hits
                and len(shader_uniform_sequence_hits) >= 4
                else "partial-shadowvol-shader-uniform-wrapper-evidence"
            ),
        },
        "stencilOpSequenceEvidence": {
            "wrapperFunction": "FUN_00a78344",
            "targetFunction": "FUN_00a6f2b4",
            "zPassOps": [
                "FUN_00a78344(0,0,0,3)",
                "FUN_00a78344(1,0,0,4)",
            ],
            "zFailOps": [
                "FUN_00a78344(0,0,4,0)",
                "FUN_00a78344(1,0,3,0)",
            ],
            "wrapperHits": stencil_op_wrapper_hits[:8],
            "dispatchHits": stencil_op_dispatch_hits[:24],
            "cacheHits": stencil_op_cache_hits[:24],
            "sequenceHits": stencil_op_sequence_hits[:8],
            "toolsetFaceOpTableEvidence": toolset_stencil_face_op_evidence,
            "faceSlotMappingStatus": (
                "source-backed-toolset-binary-face-slot-0-front-1-back"
                if stencil_face_op_mapped
                else "blocked-no-direct-front-back-slot-mapping-in-decompiled-source"
            ),
            "proofStatus": (
                "source-backed-shadowvol-zpass-zfail-stencil-op-sequence-face-op-mapped"
                if stencil_face_op_mapped
                and stencil_op_wrapper_hits
                and stencil_op_dispatch_hits
                and len(stencil_op_sequence_hits) >= 4
                else "source-backed-shadowvol-zpass-zfail-stencil-op-sequence-face-slot-mapping-blocked"
                if stencil_op_wrapper_hits
                and stencil_op_dispatch_hits
                and len(stencil_op_sequence_hits) >= 4
                else "partial-shadowvol-stencil-op-sequence"
            ),
        },
        "casterBufferPreparationEvidence": {
            "builderFunction": "FUN_00a878f8",
            "triggerLineWindow": "888188-888213",
            "allocationLineWindow": "888245-888256",
            "writeLineWindow": "888319-888403",
            "triggerHits": caster_buffer_trigger_hits[:24],
            "allocationHits": caster_buffer_allocation_hits[:16],
            "writeHits": caster_buffer_write_hits[:24],
            "proofStatus": (
                "source-backed-shadowvol-caster-buffer-prep-index-vertex-fill"
                if caster_buffer_trigger_hits
                and caster_buffer_allocation_hits
                and caster_buffer_write_hits
                else "partial-shadowvol-caster-buffer-prep"
            ),
        },
        "casterBufferGeometryEvidence": {
            "builderFunction": "FUN_00a878f8",
            "geometryLineWindow": "888319-888403",
            "sourceVertexTransformHits": caster_vertex_transform_hits[:8],
            "pairedVertexWriteHits": caster_vertex_pair_write_hits[:16],
            "indexPatternHits": caster_index_pattern_hits[:24],
            "bufferFinalizeHits": caster_buffer_finalize_hits[:8],
            "perSourceVertexRecords": 2,
            "indicesPerCasterEdge": 6,
            "maxCasterEdgeClamp": "0x2aaa",
            "proofStatus": (
                "source-backed-shadowvol-caster-geometry-paired-vertex-index-buffer-fill"
                if caster_vertex_transform_hits
                and caster_vertex_pair_write_hits
                and caster_index_pattern_hits
                and caster_buffer_finalize_hits
                else "partial-shadowvol-caster-geometry-buffer-fill"
            ),
        },
        "shaderNamesFound": [
            name
            for key, name in [
                ("shadowVertexShader", "vs_shadowvol"),
                ("shadowFragmentShader", "fs_shadowvol"),
            ]
            if key in first_hits
        ],
        "renderBuckets": ["0xd", "0xe", "0xb", "0xc"],
        "recoveredInputs": [
            "ARE.ShadowOpacity",
            "light radius +0x58",
            "light shadowradius +0x60",
            "light verticaldisplacement +0x64",
            "vs_shadowvol/fs_shadowvol",
            "FUN_00a878f8 caster buffer preparation",
            "FUN_00a878f8 paired vertex + six-index caster edge buffer fill",
            *(
                ["FUN_00a5fdb4 direct caller/buffer-builder has no blend/depth/color-mask wrapper hits"]
                if direct_caller_buffer_builder_hits
                and direct_caller_state_wrapper_absent
                else []
            ),
            *(
                [
                    "FUN_00a82464 active-light render envelope spans DAT_00d0233c and +0x138/+0x108 vtable dispatch with blend/depthFunc facades"
                ]
                if active_light_render_envelope_vtable_blocked
                else []
            ),
            "caster draw through FUN_00a78128",
            "FUN_00a78128 wrapper to FUN_00a75e3c draw dispatch",
            "FUN_00a78344 z-pass/z-fail stencil op sequence",
            *(
                [
                    "FUN_00a878f8 local draw-state order through z-pass stencil setup, state push, shader bind, draw wrapper, state pop, restore, and z-fail switch"
                ]
                if local_draw_state_order_complete
                else []
            ),
            *(
                ["shadow-volume shader bind + transform/uniform slot writes"]
                if shader_uniform_wrapper_hits
                and shader_uniform_target_hits
                and len(shader_uniform_sequence_hits) >= 4
                else []
            ),
            *(
                ["nwtoolset.exe glStencilOpSeparate face/op table mapping"]
                if stencil_face_op_mapped
                else []
            ),
            *(
                ["nwtoolset.exe render-state slot 3 GL_CULL_FACE mapping"]
                if render_state_slot_mapped
                else []
            ),
        ],
        "remainingBlockedSemantics": remaining_blocked_semantics,
        "proofStatus": (
            "source-backed-shadowplane-shadowvol-shader-caster-path-stencil-face-op-render-state-slot3-and-local-draw-order-mapped-retail-parity-blocked"
            if required_keys.issubset(found_keys)
            and render_path_hits
            and stencil_op_wrapper_hits
            and stencil_op_dispatch_hits
            and len(stencil_op_sequence_hits) >= 4
            and stencil_face_op_mapped
            and render_state_slot_mapped
            and local_draw_state_order_complete
            else
            "source-backed-shadowplane-shadowvol-shader-caster-path-stencil-face-op-and-render-state-slot3-mapped-retail-parity-blocked"
            if required_keys.issubset(found_keys)
            and render_path_hits
            and stencil_op_wrapper_hits
            and stencil_op_dispatch_hits
            and len(stencil_op_sequence_hits) >= 4
            and stencil_face_op_mapped
            and render_state_slot_mapped
            else
            "source-backed-shadowplane-shadowvol-shader-caster-path-stencil-face-op-mapped-retail-parity-blocked"
            if required_keys.issubset(found_keys)
            and render_path_hits
            and stencil_op_wrapper_hits
            and stencil_op_dispatch_hits
            and len(stencil_op_sequence_hits) >= 4
            and stencil_face_op_mapped
            else
            "source-backed-shadowplane-shadowvol-shader-caster-path-stencil-op-sequence-extracted-retail-parity-blocked"
            if required_keys.issubset(found_keys)
            and render_path_hits
            and stencil_op_wrapper_hits
            and stencil_op_dispatch_hits
            and len(stencil_op_sequence_hits) >= 4
            else "source-backed-shadowplane-shadowvol-shader-caster-path-projection-geometry-not-ported"
            if required_keys.issubset(found_keys) and render_path_hits
            else "partial-shadowvolume-source-evidence"
        ),
    }


def is_decompiled_definition_line(line: str, function_name: str) -> bool:
    return any(
        line.startswith(prefix)
        for prefix in (
            f"void __cdecl {function_name}",
            f"void __stdcall {function_name}",
            f"undefined4 __cdecl {function_name}",
            f"undefined4 __stdcall {function_name}",
            f"int __cdecl {function_name}",
            f"bool __cdecl {function_name}",
        )
    )


def scan_light_manager_source_ordering_evidence(
    source_path: Path = DEFAULT_DECOMPILED_SOURCE,
) -> dict[str, object]:
    if not source_path.exists():
        return {
            "source": str(source_path).replace("\\", "/"),
            "proofStatus": "blocked-decompiled-source-missing",
        }

    first_hits: dict[str, dict[str, object]] = {}
    insertion_symbol_hits: list[dict[str, object]] = []
    direct_insertion_call_hits: list[dict[str, object]] = []
    internal_insert_hits: list[dict[str, object]] = []
    score_sort_upload_hits: list[dict[str, object]] = []
    fixed_upload_hits: list[dict[str, object]] = []
    sorted_slot_upload_hits: list[dict[str, object]] = []
    manager_construction_hits: list[dict[str, object]] = []
    frame_rebuild_order_hits: list[dict[str, object]] = []
    vtable_dispatch_hits: list[dict[str, object]] = []
    direct_proximity_upload_hits: list[dict[str, object]] = []
    lane_source_hints: list[dict[str, object]] = []

    with source_path.open("r", encoding="utf-8", errors="replace") as handle:
        for line_number, raw_line in enumerate(handle, start=1):
            line = raw_line.strip()
            for key, needle in LIGHT_MANAGER_ORDERING_SOURCE_NEEDLES.items():
                if needle in line and key not in first_hits:
                    first_hits[key] = {
                        "line": line_number,
                        "needle": needle,
                        "text": line[:240],
                    }
            if "FUN_00a4128c(" in line:
                hit = {"line": line_number, "text": line[:240]}
                insertion_symbol_hits.append(hit)
                if not is_decompiled_definition_line(line, "FUN_00a4128c"):
                    direct_insertion_call_hits.append(hit)
            if 865534 <= line_number <= 865548 and (
                "FUN_00a4139c" in line
                or "+ 8" in line
                or "+ 0x20" in line
                or "+ 0x14" in line
                or "param_2[0x10]" in line
                or "param_2[0x1c]" in line
                or "param_2[0x1b]" in line
            ):
                internal_insert_hits.append({"line": line_number, "text": line[:240]})
            if 865714 <= line_number <= 866424 and (
                "FUN_00a4165c" in line
                or "FUN_00a417bc" in line
                or "FUN_00a41694" in line
                or "FUN_00a41850" in line
                or "FUN_00a41e50" in line
                or "+ 0x84" in line
                or "+ 0x58" in line
                or "+ 0x8c" in line
                or "FUN_00a40b60" in line
            ):
                score_sort_upload_hits.append({"line": line_number, "text": line[:240]})
            if 866325 <= line_number <= 866402 and (
                "param_1 + 0x70" in line
                or "param_1 + 0x6c" in line
                or "FUN_00a78600" in line
                or "FUN_00a78610" in line
                or "FUN_00a40b60" in line
                or "0xffffffff" in line
            ):
                fixed_upload_hits.append({"line": line_number, "text": line[:240]})
            if 866404 <= line_number <= 866425 and (
                "DAT_00cc2314" in line
                or "uVar7 = 2" in line
                or "FUN_00a41b30" in line
                or "FUN_00a41e30" in line
                or "FUN_00a40b60" in line
                or "FUN_00a7817c" in line
            ):
                sorted_slot_upload_hits.append({"line": line_number, "text": line[:240]})
            if 905440 <= line_number <= 905446 and (
                "FUN_00b83ab0" in line
                or "FUN_00a40f10" in line
                or "param_1[0x42]" in line
            ):
                manager_construction_hits.append(
                    {"line": line_number, "phase": "scene-lightmanager-construction", "text": line[:240]}
                )
            if 913205 <= line_number <= 913227 and "+ 0x18" in line and "param_1 + 0x108" in line:
                vtable_dispatch_hits.append(
                    {"line": line_number, "phase": "spatial-light-rebuild-reset-dispatch", "text": line[:240]}
                )
            if 918249 <= line_number <= 918258 and (
                "FUN_00a4131c" in line
                or "FUN_00a4139c" in line
                or "+ 0x10" in line
                or "param_1 + 0x108" in line
            ):
                vtable_dispatch_hits.append(
                    {"line": line_number, "phase": "spatial-cell-light-add-dispatch", "text": line[:240]}
                )
            if 918383 <= line_number <= 918388 and (
                "FUN_00a4148c" in line
                or "+ 0x14" in line
                or "param_1 + 0x108" in line
            ):
                vtable_dispatch_hits.append(
                    {"line": line_number, "phase": "spatial-cell-light-remove-dispatch", "text": line[:240]}
                )
            if 919879 <= line_number <= 919960 and (
                "FUN_00a8b474" in line
                or "FUN_00a8db58" in line
                or "param_1 + 0x108" in line
                or "+ 0x18" in line
                or "+ 0x1c" in line
                or "+ 0x14" in line
                or "+ 0x30" in line
                or "FUN_00a41648" in line
                or "FUN_00a8f134" in line
            ):
                frame_rebuild_order_hits.append(
                    {"line": line_number, "phase": "scene-frame-lightmanager-rebuild-sort-sample", "text": line[:240]}
                )
            if 866994 <= line_number <= 867087 and (
                "FUN_00a42f5c" in line
                or "DAT_00cc2314" in line
                or "FUN_00a41b30" in line
                or "param_1 + 0x70" in line
                or "param_1 + 0x6c" in line
                or "param_1 + 8" in line
                or "FUN_00a40b60" in line
                or "FUN_00a7817c" in line
            ):
                direct_proximity_upload_hits.append(
                    {"line": line_number, "phase": "direct-proximity-upload-path", "text": line[:240]}
                )
            if (
                "Tile_MainLight" in line
                or "Tile_SrcLight" in line
                or "fx_flame01" in line
                or "sourcelight" in line
            ) and len(lane_source_hints) < 24:
                lane_source_hints.append({"line": line_number, "text": line[:240]})

    required_keys = {
        "insertFunction",
        "activeSortFunction",
        "shadowSortFunction",
        "scoreFunction",
        "uploadFunction",
    }
    found_keys = set(first_hits)
    return {
        "source": str(source_path).replace("\\", "/"),
        "requiredNeedles": LIGHT_MANAGER_ORDERING_SOURCE_NEEDLES,
        "firstHits": first_hits,
        "decompiledInsertionSymbolHits": insertion_symbol_hits[:24],
        "directInsertionCallHits": direct_insertion_call_hits[:24],
        "internalInsertionEvidence": {
            "function": "FUN_00a4128c",
            "lineWindow": "865534-865548",
            "listOffsets": ["+0x8", "+0x20", "+0x14"],
            "hits": internal_insert_hits[:16],
            "proofStatus": (
                "source-backed-lightmanager-internal-insertion-lists"
                if internal_insert_hits
                else "partial-lightmanager-internal-insertion-lists"
            ),
        },
        "scoreSortUploadEvidence": {
            "scoreFunction": "FUN_00a41850",
            "activeSortFunction": "FUN_00a4165c",
            "shadowSortFunction": "FUN_00a417bc",
            "uploadFunction": "FUN_00a41e50",
            "lineWindow": "865714-866424",
            "hits": score_sort_upload_hits[:32],
            "proofStatus": (
                "source-backed-lightmanager-score-sort-upload"
                if required_keys.issubset(found_keys) and score_sort_upload_hits
                else "partial-lightmanager-score-sort-upload"
            ),
        },
        "retailUploadOrderEvidence": {
            "function": "FUN_00a41e50",
            "lineWindow": "866325-866425",
            "specialLightOffsets": ["+0x70", "+0x6c"],
            "specialLightUploadSlot": "0xffffffff",
            "sortedSlotUpload": (
                "param_2 active/shadow list is uploaded through FUN_00a40b60 after optional DAT_00cc2314 headlight reservation"
            ),
            "fixedLightHits": fixed_upload_hits[:24],
            "sortedSlotHits": sorted_slot_upload_hits[:24],
            "proofStatus": (
                "source-backed-lightmanager-special-lights-before-sorted-slot-upload"
                if fixed_upload_hits and sorted_slot_upload_hits
                else "partial-lightmanager-special-lights-before-sorted-slot-upload"
            ),
        },
        "frameRebuildOrderingEvidence": {
            "managerPointerOffset": "+0x108 / param_1[0x42]",
            "managerConstructor": "FUN_00a40f10",
            "lineWindows": [
                "905440-905446 scene object allocates LightManager and stores param_1[0x42]",
                "913205-913227 spatial rebuild resets manager through virtual +0x18 before traversing object buckets",
                "918249-918258 spatial-cell light add path appends local cell list then dispatches LightManager virtual +0x10",
                "918383-918388 spatial-cell light remove path prunes local cell list then dispatches LightManager virtual +0x14",
                "919879-919960 frame update rebuilds scene light lists, samples +0x14 shadow candidates, dispatches virtual +4, and reads active count +0x30",
            ],
            "vtableSlotHints": {
                "+4": "post-rebuild active sort/update pass; source frame reads +0x30 active count immediately after it",
                "+0x10": "light add dispatch from spatial-cell list",
                "+0x14": "light remove dispatch from spatial-cell list",
                "+0x18": "manager reset/rebuild dispatch before spatial traversal",
                "+0x1c": "post-reset manager pass before shadow-list sampling; exact source target remains unresolved",
            },
            "managerConstructionHits": manager_construction_hits[:12],
            "frameOrderHits": frame_rebuild_order_hits[:32],
            "vtableDispatchHits": vtable_dispatch_hits[:32],
            "proofStatus": (
                "source-backed-lightmanager-frame-rebuild-vtable-dispatch-order-owner-lane-precedence-blocked"
                if manager_construction_hits and frame_rebuild_order_hits and vtable_dispatch_hits
                else "partial-lightmanager-frame-rebuild-vtable-dispatch-order"
            ),
        },
        "directProximityUploadEvidence": {
            "function": "FUN_00a42f5c",
            "lineWindow": "866994-867087",
            "ordering": (
                "optional DAT_00cc2314 headlight reservation via FUN_00a41b30 sets first free slot to 2; "
                "special +0x70/+0x6c lights upload through FUN_00a40b60 before scanning the +0x8 all-light list for proximity-accepted slots; "
                "remaining slots are cleared through FUN_00a7817c"
            ),
            "hits": direct_proximity_upload_hits[:24],
            "proofStatus": (
                "source-backed-lightmanager-direct-proximity-upload-order"
                if direct_proximity_upload_hits
                else "partial-lightmanager-direct-proximity-upload-order"
            ),
        },
        "laneSourceHints": lane_source_hints[:24],
        "remainingBlockedSemantics": [
            "source-only decompiled call scan finds no direct FUN_00a4128c callers, but frame-level LightManager +0x108 virtual dispatch order is now recovered",
            "source-only frame order covers scene rebuild/add/remove/sort/upload dispatch and special-before-sorted slots, not owner-lane creation precedence between tile/placeable/MDL/item/ProgFX",
            "retail cross-lane insertion precedence still requires receiver/owner data-flow or retail oracle for tile/placeable/MDL/item/ProgFX lane ordering",
        ],
        "proofStatus": (
            "source-backed-lightmanager-frame-rebuild-sort-upload-cross-lane-owner-precedence-blocked"
            if required_keys.issubset(found_keys)
            and manager_construction_hits
            and frame_rebuild_order_hits
            and vtable_dispatch_hits
            and not direct_insertion_call_hits
            else "source-backed-lightmanager-insert-score-sort-upload-cross-lane-source-callsite-blocked"
            if required_keys.issubset(found_keys) and not direct_insertion_call_hits
            else "source-backed-lightmanager-source-direct-insertion-callsite-found"
            if direct_insertion_call_hits
            else "partial-lightmanager-source-ordering-evidence"
        ),
    }


def scan_progfx_type4_local_resource_evidence(
    reference_root: Path = DEFAULT_REFERENCE_ROOT,
) -> dict[str, object]:
    normalized_root = str(reference_root).replace("\\", "/")
    if not reference_root.exists():
        return {
            "referenceRoot": normalized_root,
            "requestedResourceNames": PROGFX_TYPE4_LOCAL_RESOURCE_NAMES,
            "proofStatus": "blocked-local-reference-root-missing",
        }

    requested_names = {name.lower(): name for name in PROGFX_TYPE4_LOCAL_RESOURCE_NAMES}
    exact_resource_path_hits: list[dict[str, object]] = []
    scanned_file_count = 0
    for path in reference_root.rglob("*"):
        if not path.is_file():
            continue
        scanned_file_count += 1
        requested_name = requested_names.get(path.name.lower())
        if requested_name is None:
            continue
        exact_resource_path_hits.append(
            {
                "resourceName": requested_name,
                "path": str(path).replace("\\", "/"),
                "bytes": path.stat().st_size,
            }
        )

    found_names = {str(hit["resourceName"]).lower() for hit in exact_resource_path_hits}
    missing_resource_names = [
        name for name in PROGFX_TYPE4_LOCAL_RESOURCE_NAMES if name.lower() not in found_names
    ]
    index_string_hits: list[dict[str, object]] = []
    searched_index_files: list[str] = []
    for relative_path in PROGFX_TYPE4_LOCAL_RESOURCE_INDEX_FILES:
        index_path = reference_root / relative_path
        if not index_path.exists() or not index_path.is_file():
            continue
        searched_index_files.append(str(index_path).replace("\\", "/"))
        with index_path.open("r", encoding="utf-8", errors="replace") as handle:
            for line_number, raw_line in enumerate(handle, start=1):
                line = raw_line.strip()
                for needle in PROGFX_TYPE4_LOCAL_RESOURCE_INDEX_NEEDLES:
                    if needle.lower() in line.lower():
                        index_string_hits.append(
                            {
                                "file": str(relative_path).replace("\\", "/"),
                                "line": line_number,
                                "needle": needle,
                                "text": line[:240],
                            }
                        )
                        break
                if len(index_string_hits) >= 32:
                    break

    return {
        "referenceRoot": normalized_root,
        "requestedResourceNames": PROGFX_TYPE4_LOCAL_RESOURCE_NAMES,
        "scannedFileCount": scanned_file_count,
        "exactResourcePathHits": exact_resource_path_hits[:16],
        "missingResourceNames": missing_resource_names,
        "searchedIndexFiles": searched_index_files,
        "indexStringHits": index_string_hits[:32],
        "remainingBlockedSemantics": [
            "local reference inventory did not expose the ProgFX Type 4 scheduler resource files needed to prove priority/proximity/vision/shadow semantics",
            "decompiled source still proves the visualeffects.2da bootstrap, but the runtime scheduler remains outside the available source-only/resource dump evidence",
        ],
        "proofStatus": (
            "source-backed-local-reference-root-lacks-progfx-type4-scheduler-resource-dump"
            if {"progfx.2da", "fx_light_clr.mdl", "fx_light_clr.mdb"}.isdisjoint(
                found_names
            )
            else "local-reference-root-contains-progfx-type4-scheduler-resource-candidates"
        ),
    }


def scan_progfx_type4_source_scheduler_evidence(
    source_path: Path = DEFAULT_DECOMPILED_SOURCE,
    reference_root: Path = DEFAULT_REFERENCE_ROOT,
) -> dict[str, object]:
    if not source_path.exists():
        return {
            "source": str(source_path).replace("\\", "/"),
            "proofStatus": "blocked-decompiled-source-missing",
        }

    first_hits: dict[str, dict[str, object]] = {}
    visualeffects_loader_hits: list[dict[str, object]] = []
    template_parameter_hits: list[dict[str, object]] = []
    scheduler_string_hits: list[dict[str, object]] = []

    with source_path.open("r", encoding="utf-8", errors="replace") as handle:
        for line_number, raw_line in enumerate(handle, start=1):
            line = raw_line.strip()
            for key, needle in PROGFX_TYPE4_SOURCE_NEEDLES.items():
                if needle in line and key not in first_hits:
                    first_hits[key] = {
                        "line": line_number,
                        "needle": needle,
                        "text": line[:240],
                    }
            if 348220 <= line_number <= 348260 and "visualeffects" in line:
                visualeffects_loader_hits.append({"line": line_number, "text": line[:240]})
            if 300120 <= line_number <= 300560 and (
                "Param1" in line or "Param1Value" in line
            ):
                template_parameter_hits.append({"line": line_number, "text": line[:240]})
            if 322160 <= line_number <= 322270 and (
                "ReqParam1" in line or "ReqParam2" in line
            ):
                template_parameter_hits.append({"line": line_number, "text": line[:240]})
            for needle in PROGFX_TYPE4_SCHEDULER_NEEDLES:
                if needle in line:
                    if needle in {"Param3", "Param4", "Param5", "Param6", "Param7"} and (
                        "s_Param" not in line and "Param" not in line
                    ):
                        continue
                    scheduler_string_hits.append(
                        {"line": line_number, "needle": needle, "text": line[:240]}
                    )
                    break

    found_keys = set(first_hits)
    required_keys = {"visualEffectsTableLoader"}
    local_resource_evidence = scan_progfx_type4_local_resource_evidence(reference_root)
    runtime_scheduler_hits = [
        hit
        for hit in scheduler_string_hits
        if hit["needle"] in {"progfx", "ProgFX", "progfx.2da", "fx_light_clr", "Blind_Vision"}
        or hit["needle"] in {"Param3", "Param4", "Param5", "Param6", "Param7"}
    ]
    return {
        "source": str(source_path).replace("\\", "/"),
        "requiredNeedles": PROGFX_TYPE4_SOURCE_NEEDLES,
        "schedulerNeedles": PROGFX_TYPE4_SCHEDULER_NEEDLES,
        "firstHits": first_hits,
        "visualEffectsTableLoaderHits": visualeffects_loader_hits[:16],
        "templateParameterHits": template_parameter_hits[:24],
        "schedulerStringHits": scheduler_string_hits[:24],
        "runtimeSchedulerStringHitCount": len(runtime_scheduler_hits),
        "localResourceDumpEvidence": local_resource_evidence,
        "recoveredInputs": [
            "visualeffects.2da bootstrap in decompiled source",
            "generic item/template Param1/Param1Value and ReqParam1/ReqParam2 field strings",
            "progfx.2da Type 4 Param1..Param7 table values are preserved by resource parser outside decompiled_all.c",
            "local reference resource inventory is measured separately from scheduler inference",
        ],
        "remainingBlockedSemantics": [
            "source-only decompiled_all.c has no progfx.2da/fx_light_clr/Blind_Vision scheduler string hit",
            "source-only decompiled_all.c does not expose Param3/Param4/Param5/Param6 runtime scheduler semantics for ProgFX Type 4",
            "local C:/Projects/New Folder resource inventory does not expose progfx.2da/visualeffects.2da/fx_light_clr scheduler resource files in the available dump",
            "retail ProgFX Type 4 scheduler still requires binary disassembly/callgraph or retail runtime oracle",
        ],
        "proofStatus": (
            "source-backed-visualeffects-loader-progfx-type4-scheduler-not-in-source-only-decompilation"
            if required_keys.issubset(found_keys) and not runtime_scheduler_hits
            else "partial-progfx-type4-source-scheduler-evidence"
        ),
    }


def main() -> None:
    paths = [Path(arg) for arg in sys.argv[1:]] or DEFAULT_BINARIES
    reports = [analyze_binary(path) for path in paths]
    has_requested = all(report["requestedExportCount"] > 0 for report in reports)
    print(
        json.dumps(
            {
                "reports": reports,
                "shadowVolumeProjectionEvidence": scan_shadow_volume_projection_evidence(),
                "lightManagerSourceOrderingEvidence": scan_light_manager_source_ordering_evidence(),
                "progfxType4SourceSchedulerEvidence": scan_progfx_type4_source_scheduler_evidence(),
                "proofStatus": (
                    "source-backed-retail-light-export-function-ranges-disassembled"
                    if has_requested
                    else "blocked-retail-light-export-function-missing"
                ),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
