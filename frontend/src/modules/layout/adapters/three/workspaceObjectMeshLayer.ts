import * as THREE from "three";
import type { PlaceableViewportRenderPayload } from "../../../placeables/application/placeableRenderPayloadResolver";
import type {
  PlaceableRenderPackageAuroraModelGraph,
  PlaceableRenderPackageAuroraMaterial,
  PlaceableRenderPackageTextureBinding,
  PlaceableRenderPackageTextureTxiState
} from "../../../placeables/contracts";
import { decodeAuroraPltTexture } from "../../../placeables/adapters/aurora/auroraPltTextureDecoder";
import {
  AURORA_PLT_PALETTE_ROW_MAX,
  ensureAuroraPltPaletteDataLoaded,
  isAuroraPltPaletteDataReady,
  normalizeAuroraPltPaletteRow,
  resolveAuroraPltPaletteRgbaSync
} from "../../../placeables/adapters/aurora/auroraPltPalette";
import type { CreatureViewportRenderPayload } from "../../../creatures/application/creatureRenderPayloadResolver";
import {
  resolveCreatureAnimationStateClip,
  type CreatureAnimationStateClipResolution
} from "../../../creatures/domain/creatureAnimationState";
import {
  resolveCreatureEquipmentModelPartResolutions,
  resolveCreatureModelResolution,
  resolveCreaturePartModelResolutions,
  resolveCreatureSkeletonModelResolution,
  resolveCreatureTextureDeliveryUrlsByReference,
  type CreatureRenderEquipmentModelPartResolution,
  type CreatureRenderPartModelResolution,
  type CreatureRenderModelResolution,
  type CreatureRenderSkeletonModelResolution
} from "../../../creatures/application/creatureRenderAssetResolver";
import {
  resolveItemArmorPartModelResolutions,
  resolveItemModelPartResolutions,
  resolveItemTextureDeliveryUrlsByReference,
  type ItemRenderArmorPartModelResolution,
  type ItemRenderModelPartResolution
} from "../../../items/application/itemRenderAssetResolver";
import {
  composeItemIconPreview,
  resolveDecodedItemIconPreview,
  type ItemIconComposition
} from "../../../items/application/itemIconComposer";
import { decodeRawTextureToRgba } from "../../../items/application/itemRawTextureDecoder";
import {
  buildVfxPayloadFromPlaceablePreview,
  buildVfxPayloadFromRenderPayload
} from "../../../placeables/application/placeableVfxPreservePayload";
import {
  applyPlaceableTextureToModel,
  applyPlaceableTexturesToModel,
  buildAuroraSupermodelAnimationClips,
  createAuroraSourceAlphaRuntime,
  createAuroraSourceAnimmeshRuntime,
  createAuroraSourceDanglymeshRuntime,
  createAuroraSourceSelfIllumColorRuntime,
  createAuroraSourceSkinningRuntime,
  ensureNormalizedPlaceableModel,
  ensurePlaceableModel,
  ensurePlaceableTexture,
  ensurePlaceableTexturesByReference,
  ensurePlaceableTexturesByReferenceProgressive,
  getCachedPlaceableTexture,
  getPlaceableMissingTextureFallbackTexture,
  isAuroraSupermodelRetargetedAnimationClip,
  normalizePlaceableModelToObjectRadius,
  PLACEABLE_AREA_MODEL_AURORA_UNITS_TO_TILE_SPACE,
  PLACEABLE_MODEL_LOAD_PRIORITY_HIGH,
  PLACEABLE_PREVIEW_MODEL_TARGET_MAX_AXIS_FACTOR,
  PLACEABLE_SHARED_MODEL_GEOMETRY_FLAG,
  PLACEABLE_SHARED_MODEL_MATERIAL_FLAG,
  type PlaceableTextureApplicationOptions,
  type PlaceableTextureLoadOptions,
  readPlaceableModelAnimationClips,
  resolvePlaceableNormalizedModelPresentationMetrics
} from "../../../placeables/adapters/three/placeableThreeAssetLoader";
import {
  resolvePlaceableAssetDeliveryUrl,
  resolveUnsupportedModelCandidateReason
} from "../../../placeables/application/placeableRenderAssetResolver";
import { normalizePlaceableTextureReference } from "../../../placeables/application/placeableTextureReferences";
import type { RuntimeSoundNowPlayingBadge } from "../../runtimeSoundPlaybackState";
import { applyAuroraAreaModelSpaceScale } from "../../../shared/adapters/three/auroraAreaModelSpace";
import { SOUND_NOW_PLAYING_BADGE_LABEL } from "../../application/workspaceObjectPropertyDrafts";
import type { SceneObject, SceneObjectKind } from "../../contracts";
import type {
  AuroraAreaVfxCollisionContract,
  AuroraVfxPayload,
  SceneObjectItemMaterialColors,
  SceneObjectItemModelAssetCandidate,
  SceneObjectItemPropertyEntry
} from "../../../scene/contracts";
import { resolveAuroraVfxSceneRuntimePayload } from "./auroraVfxSceneRuntime";
import {
  normalizeSoundGuidePositioning,
  resolveEditorSoundGuideOverlayFlags,
  resolveSoundGuideWorldGeometry,
  SOUND_GUIDE_WORLD_GEOMETRY_REVISION
} from "../../soundGuideDomain";
import { isVisualTransformAppliedToObject } from "../../visualTransformGizmoRules";
import {
  isKindLocked,
  resolveObjectRenderStatus,
  resolveSceneObjectRenderScale,
  usesStatusMapForKind,
  type DebugState,
  type ObjectRenderStatus
} from "../../application/workspaceSceneInteraction";
import { resolveAreaObjectPolygonRenderOffsets } from "../../application/areaObjectPolygonRenderGeometry";
import {
  isAreaSharedPlaceablesRendererSceneObject,
  isAreaPreviewOnlyAuroraVfxPayload,
  resolveAreaPlaceablePlaceholderReason,
  resolvePlaceableRenderContractState,
  resolvePlaceableTextureDeliveryUrlsByReference,
  resolvePlaceableVfxChunkModelDeliveryUrlsByAssetId,
  SHARED_PLACEABLES_RENDERER_PATH,
  type AreaPlaceablePlaceholderReason
} from "../../application/workspacePlaceableRenderContracts";
import {
  createSoundModeMarkerGroup,
  createTextSprite
} from "./workspaceCanvasSprites";
import {
  createAuroraVfxCanonicalRenderGroup,
  isCanonicalAuroraVfxRenderablePayload,
  resolveAuroraVfxCanonicalPltPaletteResolution,
  resolveAuroraVfxCanonicalPltPaletteRows,
  type AuroraVfxCanonicalModelGraph
} from "./auroraVfxCanonicalRenderer";
import {
  applyCanonicalSourceMdlLightFallbackPolicy,
  resolveCanonicalSourceMdlLightFallbackPolicy,
  writeSourceMdlLightFallbackDiagnostics,
  type CanonicalSourceMdlLightFallbackPolicy
} from "./canonicalSourceMdlLightFallbackPolicy";
import { clearObjectLayer } from "./workspaceObjectLayerDisposal";
import {
  resolveAuroraAreaRenderYaw,
  resolveAuroraAreaRenderZ
} from "./workspaceAreaRenderCoordinates";
import {
  applyPlaceableVfxParticleTexture,
  bindPlaceableTwoDaFastShadowTexture,
  createPlaceableFallbackGeometry,
  createPlaceableGeometryFromPayload,
  createPlaceableTwoDaLightPreviewGroup,
  resolvePlaceableTwoDaLightPreviewSourceUserData,
  resolvePlaceableTwoDaLightPreviewStatusUserData,
  createPlaceableVfxPreviewGroup,
  decoratePlaceableModelForObjectSelection,
  isPlaceableVfxNullTextureReference,
  isPlaceableVfxPayload,
  resolvePlaceableVfxAlphaCompanionTextureReference,
  resolvePlaceableVfxColor,
  resolvePlaceableVfxTextureReference,
  summarizePlaceableTextureSourceFormats,
  writePlaceableFastShadowTextureDebugStatus,
  writePlaceableModelDebugStatus
} from "./workspacePlaceableModelPresentation";
import {
  AURORA_LIGHT_MANAGER_PREVIEW_BUDGET_STRATEGY,
  AURORA_LIGHT_MANAGER_PREVIEW_BUDGET_STRATEGY_PROOF_STATUS,
  AURORA_LIGHT_MANAGER_PREVIEW_BUDGET_STRATEGY_SOURCE,
  buildAuroraLightManagerPreviewScoreUserData,
  resolveAuroraLightManagerPreviewScore,
  selectAuroraLightManagerPreviewBudget,
  type AuroraLightManagerPreviewScore
} from "./auroraLightManagerPreview";
import {
  AURORA_THREE_LOCALIZED_AMBIENT_LIGHT_PROOF_STATUS,
  AURORA_THREE_LOCALIZED_AMBIENT_LIGHT_SOURCE,
  installAuroraLinearLightFalloffShaderChunk,
  resolveAuroraThreePointLightDecay
} from "./auroraThreeLightFalloff";
import type { RuntimeState } from "./workspaceThreeRuntime";
import {
  buildRuntimeObjectAnimationRunUserData,
  clearRuntimeObjectAnimationPlayback,
  registerRuntimeAuroraTextureCyclePlayback,
  registerRuntimeObjectAnimationPlayback,
  writeRuntimeObjectAnimationDataset
} from "./workspaceThreeRuntime";

export interface SoundRenderDiagnostics {
  readonly marker: number;
  readonly editorGuides: number;
}

export interface PlaceableTwoDaLightRenderDiagnostics {
  readonly status: "active" | "disabled" | "missing";
  readonly sourceGroups: number;
  readonly pointLights: number;
  readonly halos: number;
  readonly cores: number;
  readonly receivers: number;
  readonly fastShadows: number;
  readonly disabledByLightState: number;
  readonly disabledByUseAreaLighting: number;
  readonly samples: readonly string[];
}

interface AuroraRuntimeLightBudgetSelection {
  readonly activeSlotCap: number;
  readonly configuredMaxLights?: number;
}

const SOUND_MARKER_DIAGNOSTIC_ROLE = "sound-marker";
const SOUND_EDITOR_GUIDE_DIAGNOSTIC_ROLE = "sound-editor-guide";
const PLACEABLE_TWO_DA_LIGHT_SOURCE_NAME = "placeable_2da_light_source";
const PLACEABLE_TWO_DA_FAST_SHADOW_NAME = "placeable_2da_light_fast_shadow";
const PLACEABLE_TWO_DA_POINT_LIGHT_ROLE = "placeables-2da-point-light";
const PLACEABLE_TWO_DA_HALO_ROLE = "placeables-2da-light-halo";
const PLACEABLE_TWO_DA_CORE_ROLE = "placeables-2da-light-core";
const PLACEABLE_TWO_DA_RECEIVER_ROLE = "placeables-2da-light-receiver";
const PLACEABLE_TWO_DA_FAST_SHADOW_TEXTURE_REFERENCE = "fxpa_dot01";
const PLACEABLE_TWO_DA_FAST_SHADOW_TEXTURE_SOURCE =
  "placeable render asset contract delivered fxpa_dot01.tga requested from placeables.2da ShadowSize/Fx_Shadow_* fxpa_Dot01 evidence";
const PLACEABLE_TWO_DA_FAST_SHADOW_TEXTURE_PROOF_STATUS =
  "source-backed-retail-key-bif-fxpa-dot01-texture-bound";
const AURORA_LIGHT_PREVIEW_ACTIVE_SLOT_CAP = 128;
const AURORA_LIGHT_PREVIEW_DROPPED_SAMPLE_LIMIT = 32;
const AURORA_LIGHT_PREVIEW_BUDGET_CAP_SOURCE =
  "C:/Projects/New Folder/export/decompiled_all.c:866086-866096 FUN_00a41e30 caps light slots at 0x80 unless runtime max-lights is lower";
const AURORA_LIGHT_PREVIEW_BUDGET_CAP_PROOF_STATUS =
  "source-backed-mdl-light-slot-cap-max-128";
const AURORA_LIGHT_QUADRATIC_ATTEN_SOURCE =
  "C:/Projects/New Folder/export/decompiled_all.c:865404-865409 FUN_00a40b60 uploads lightQuadraticAtten = 9/(max(radius,0.1)^2*2)";
const AURORA_LIGHT_QUADRATIC_ATTEN_PROOF_STATUS =
  "source-backed-mdl-radius-quadratic-attenuation";
const AURORA_LIGHT_LINEAR_FALLOFF_SOURCE =
  "Active retail inc_lighting.shd GAMMA_CORRECTION==0 surface branch plus C:/Projects/New Folder/export/decompiled_all.c:865404-865409 FUN_00a40b60 lightQuadraticAtten=9/(max(radius,0.1)^2*2); selected retail gamma profile remains parity-pending";
const AURORA_LIGHT_LINEAR_FALLOFF_PROOF_STATUS =
  "source-backed-gamma0-quadratic-surface-falloff-profile-parity-pending";
const AURORA_LIGHT_LINEAR_FALLOFF_DECAY = 1;
const AURORA_LIGHT_LINEAR_FALLOFF_FORMULA =
  "1/(1+4.5*(distance/radius)^2)";
const CREATURE_AURORA_LIGHT_SOURCE_RADIUS_UNITS = "aurora-model-units";
const CREATURE_AURORA_LIGHT_SOURCE_UNIT_SCALE = 1;
const CREATURE_AURORA_LIGHT_SOURCE_UNIT_SCALE_SOURCE =
  "creature source MDL light radius is used directly as Three.PointLight distance in the current creature preview scale";
const CREATURE_AURORA_LIGHT_SOURCE_RADIUS_WORLD_DISTANCE_SOURCE =
  "creature source MDL light-node radius multiplied by source-unit scale 1";
const CREATURE_AURORA_LIGHT_RADIUS_PROOF_STATUS =
  "source-backed-creature-mdl-light-radius-controller";
const PLACEABLE_MODEL_TEXTURE_REFERENCE_TIMEOUT_MS = 60_000;
const CANONICAL_VFX_TEXTURE_LOAD_CONCURRENCY = 2;
const CREATURE_EQUIPMENT_MODEL_PART_LOAD_TIMEOUT_MS = 12_000;
const CREATURE_HELD_LONG_MELEE_MODEL_TYPES = new Set([
  "waxgr",
  "wdbqs",
  "wmgst",
  "wswgs"
]);
const CREATURE_HELD_LONG_MELEE_MODEL_TYPE_PREFIXES = ["wpl"];
const CREATURE_AMMUNITION_MODEL_TYPES = new Set(["wamar", "wambo", "wambu"]);
const CREATURE_HANDHELD_BOW_MODEL_TYPES = new Set(["wbwln", "wbwsh"]);
const CREATURE_HANDHELD_SLING_MODEL_TYPES = new Set(["wbwsl"]);
const CREATURE_HANDHELD_CROSSBOW_MODEL_TYPES = new Set(["wbwxh", "wbwxl"]);
const CREATURE_HANDHELD_SHIELD_MODEL_TYPES = new Set(["ashlw", "ashsw", "ashto"]);
const CREATURE_RUNTIME_ARROW_PROXY_LENGTH = 0.68;
const CREATURE_RUNTIME_ARROW_PROXY_SHAFT_LENGTH = 0.58;
const CREATURE_RUNTIME_ARROW_PROXY_SHAFT_RADIUS = 0.008;
const CREATURE_RUNTIME_ARROW_PROXY_HEAD_LENGTH = 0.075;
const CREATURE_RUNTIME_ARROW_PROXY_HEAD_RADIUS = 0.025;
const CREATURE_RUNTIME_BOLT_PROXY_SHAFT_LENGTH = 0.34;
const CREATURE_RUNTIME_BOLT_PROXY_SHAFT_RADIUS = 0.012;
const CREATURE_RUNTIME_BOLT_PROXY_HEAD_LENGTH = 0.055;
const CREATURE_RUNTIME_BOLT_PROXY_HEAD_RADIUS = 0.028;
const CREATURE_RUNTIME_BULLET_PROXY_RADIUS = 0.055;
const CREATURE_RUNTIME_AMMUNITION_DRAW_NODE_NAMES = [
  "drawdummy",
  "arrowdummy",
  "boltdummy",
  "longbowstring",
  "bowstring",
  "xbowstring",
  "crossbowstring"
];

const ITEM_PROPERTY_LIGHT_PROPERTY_NAME = 44;
const ITEM_PROPERTY_LIGHT_SOURCE =
  "C:/Projects/New Folder/item-retail-extract/nss/nwscript.nss:617,4643-4653,9732-9734";
const ITEM_PROPERTY_LIGHT_RUNTIME_SOURCE =
  "nwscript.nss ItemPropertyLight(int nBrightness, int nColor)";
const ITEM_PROPERTY_LIGHT_VALUE_SOURCE =
  "C:/Projects/New Folder/item-retail-extract/nss/nwscript.nss:4643-4653 defines IP_CONST_LIGHTBRIGHTNESS_* and IP_CONST_LIGHTCOLOR_*; C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/data/nwn_base.key -> base_2da.bif has itempropdef.2da row 44 Light costtable=18/param1=9, iprp_lightcost.2da rows 1..4 Dim 5m/Low 10m/Normal 15m/Bright 20m, and iprp_color.2da rows 0..6 Blue/Yellow/Purple/Red/Green/Orange/White";
const ITEM_PROPERTY_LIGHT_RADIUS_SOURCE =
  "C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/data/nwn_base.key -> base_2da.bif: itempropdef.2da row 44 Light has costtable=18 and param1=9; iprp_costtable.2da row 18 is IPRP_LIGHTCOST ClientLoad=1; iprp_paramtable.2da row 9 is IPRP_COLOR; iprp_lightcost.2da rows 1..4 label Dim (5m), Low (10m), Normal (15m), Bright (20m); iprp_color.2da rows 0..6 label Blue, Yellow, Purple, Red, Green, Orange, White";
const ITEM_PROPERTY_LIGHT_SOURCE_MDL_COLOR_SOURCE =
  "nwn_base.key fx_light_clr.mdl AuroraLight01 animation light-color controller type 76 supplies RGB for Blue/Yello/Purp/Red/Gren/Orng/white_5m/10m/15m/20m";
const ITEM_PROPERTY_LIGHT_SOURCE_MDL_RADIUS_SOURCE =
  "nwn_base.key fx_light_clr.mdl AuroraLight01 animation radius controller type 88 has frames 0 -> 13.3 for normal colored light animations";
const ITEM_PROPERTY_LIGHT_SOURCE_MDL_RADIUS_METERS = 13.3;
const ITEM_PROPERTY_LIGHT_NO_SELF_GLOW_SOURCE =
  "NWN Lexicon ItemPropertyLight remarks: light source does not make the item mesh glow";
const ITEM_PROPERTY_LIGHT_SOURCE_NAME = "item_property_light_source";
const ITEM_PROPERTY_LIGHT_POINT_LIGHT_ROLE = "item-property-point-light";
const ITEM_PROPERTY_LIGHT_CORE_ROLE = "item-property-light-core";
const ITEM_PROPERTY_LIGHT_HALO_ROLE = "item-property-light-halo";
const ITEM_PROPERTY_LIGHT_RANGE_ROLE = "item-property-light-range";
const ITEM_PROPERTY_LIGHT_FALLOFF_PROOF_STATUS =
  "source-family-backed-fx_light_clr-mdl-radius-gamma0-quadratic-surface-profile-parity-pending";
const ITEM_PROPERTY_LIGHT_POINT_LIGHT_DECAY = AURORA_LIGHT_LINEAR_FALLOFF_DECAY;
const LOOPING_VISUAL_EFFECT_MESSAGE_UPDATE_PROOF_SOURCE =
  "backend/scripts/audit-retail-light-function-disasm.py extracts nwmain.exe CNWSMessage::UpdateLastUpdateObject 0x1404e5700..0x1404e6305 proofStatus=source-backed-cnwsmessage-lastupdate-visual-transform-and-looping-vfx-list-store, copying CNWSObject.loopingVisualEffects at +0x160 into CLastUpdateObject.loopingVisualEffectsSnapshot at +0x108 via helper 0x1404c76b0 and calling CLastUpdateObject::SetVisualTransformData at 0x1404e584e; CNWSMessage::ComputeUpdateRequired 0x1404ca840..0x1404cba1a proofStatus=source-backed-cnwsmessage-computeupdate-looping-vfx-list-compare-offsets-0x108-0x160, comparing CLastUpdateObject+0x108 against CNWSObject+0x160 through CompareVisualEffectLists calls at 0x1404caac1 and 0x1404cb4cb; both message/update functions report blocked-no-direct-render-light-call-from-message-update-function";
const LOOPING_VISUAL_EFFECT_NETWORK_UPDATE_PROOF_SOURCE =
  "backend/scripts/audit-retail-light-function-disasm.py extracts nwmain.exe CNWSMessage::WriteGameObjUpdate_UpdateObject 0x1404eb590..0x1404edc4a proofStatus=source-backed-cnwsmessage-writegameobjupdate-looping-vfx-serializes-record-fields, reading CNWSObject+0x160 and CLastUpdateObject+0x108, calling CLoopingVisualEffect::GetIsBeam at 0x1404ec33e/0x1404ec4ec/0x1404ec74b/0x1404ec9ef, and writing record fields through CNWMessage::WriteBYTE, CNWMessage::WriteWORD, CNWSMessage::WriteOBJECTIDServer, and ObjectVisualTransformData::Write at 0x1404eca3a; it reports blocked-no-direct-render-light-call-from-network-update-writer";
const LOOPING_VISUAL_EFFECT_CLIENT_RECEIVE_RENDER_PROOF_SOURCE =
  "backend/scripts/audit-retail-light-function-disasm.py extracts nwmain.exe clientVisualEffectReceiveRenderEvidence proofStatus=source-backed-cnwcmessage-client-vfx-receive-vtable-add-newcaurobject-mdl-gob-light-path: CNWCMessage dispatch calls HandleServerToPlayerGameObjectUpdate at 0x1407a4843, HandleServerToPlayerUpdate_Update at 0x14079be47, and HandleServerToPlayerUpdateVisualEffects from generic/creature update paths at 0x14079cd60/0x140782fb1; HandleServerToPlayerUpdateVisualEffects 0x1407b1f00..0x1407b23db reads count/action/visualEffectId/objectId/subtype/ObjectVisualTransformData through ReadWORD/ReadBYTE/client object-id/helper calls, maps actions 0x41/0x44 to client object vtable slots +0x178/+0x180; CNWCObject/CNWCCreature/CNWCDoor/CNWCTrigger/CNWCPlaceable/CNWCVisualEffect/CNWCAreaOfEffectObject vtables resolve those slots to 0x140762180/0x140762ad0, with CNWCItem also exposing item-specific slots 0x140765b00/0x140765bd0; slot +0x178 calls CNWCVisualEffectOnObject::LoadVisualEffect 0x14096cf10 then CExoLinkedListInternal::AddTail at 0x1407622c6 and refresh/node-attach helpers, while visual-effect loaders create CAurObject/Gob instances through NewCAurObject for fxground/fximpact/fxhead and fx_light; generic MdlNodeLight::InternalCreateInstance proof in the same report proves MDL AuroraLight nodes create PartLight and attach to Gob+0x470";
const ITEM_PROPERTY_LIGHT_POINT_LIGHT_DECAY_SOURCE =
  "fx_light_clr.mdl AuroraLight01 radius controller plus active inc_lighting.shd GAMMA_CORRECTION==0 quadratic surface branch; selected retail gamma profile, cross-lane ordering, and parity remain pending";
const ITEM_PROPERTY_LIGHT_FALLOFF_FORMULA =
  "source-family 1/(1+4.5*(distance/13.3)^2)";
const ITEM_PROPERTY_LIGHT_RUNTIME_SCHEDULER_PROOF_SOURCE =
  "C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/bin/win32/nwserver.exe exports CNWSItemPropertyHandler::ApplyLight at 0x140405e40 plus CNWSEffectListHandler::OnApplyLight 0x1403c28d0 and OnRemoveLight 0x1403cb370; nwmain.exe exports the same light handlers at 0x140472270/0x14042ed70/0x140437810 and LightManager Add/Prioritize/Remove/Update at 0x14007dbd0/0x14007ff60/0x1400802d0/0x140081100; backend/scripts/audit-retail-light-function-disasm.py disassembles nwmain.exe ApplyLight 0x140472270..0x1404723e4 sha256 f8f65f048d2955e1e99a74c96a10d397950d68d0ec9c35909d20e611a6796376 and extracts applyLightItemPropertyBridge: color byte [CNWItemProperty+9] jump-table maps iprp_color values 0..6 to VFX_DUR_LIGHT base rows 153/157/161/165/177/169/173 for Blue/Yellow/Purple/Red/Green/Orange/White, brightness word [CNWItemProperty+6] adds 0..3 for Dim/Low/Normal/Bright, createdCGameEffectSizeBytes=272, and internalApplyTargetVa=0x14048e350; the same script extracts nwmain.exe OnApplyVisualEffect 0x140434fc0..0x140435635 reading CGameEffect GetObjectID(0), GetInteger(0/1/2), GetFloat(0), GetVector(0/1), calling CNWSObject::AddLoopingVisualEffect at 0x140435400 and CNWSMessage::SendServerToPlayerGameObjUpdateVisEffect at 0x140435598; OnRemoveVisualEffect 0x140439730..0x140439ac7 calls CNWSObject::RemoveLoopingVisualEffect at 0x140439a75; CNWSObject::AddLoopingVisualEffect 0x14048da00..0x14048db90 writes 32-byte CLoopingVisualEffect records to the owner list at CNWSObject+0x160 with count +0x168 and capacity +0x16c, while RemoveLoopingVisualEffect 0x140498960..0x140498ae1 removes from the same list; CLoopingVisualEffect layout stores visualEffectId +0x0, objectId +0x4, subtype/flags +0x8, transform data +0x10, default object id 0x7f000000; the same script extracts mdlNodeLightPartLightLifecycle from nwmain.exe MdlNodeLight::InternalCreateInstance 0x140091980 with createdPartLightSizeBytes=192, inlinePartLightVtableWriteCount=2, gobPartLightListOffsets=0x470, and partLightListAddCalls CExoArrayList<PartLight>::Add at 0x140091acc, plus Gob::CollectLights evidence with AsPartLight vtable call 0x14008cdba and recursive PartLight list writes; OnRemoveLight disassembles via linear fallback to mov eax,1; ret in nwserver.exe 0x1403cb370..0x1403cb376 and nwmain.exe 0x140437810..0x140437816, so this export does not contain client PartLight removal; C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/data/nwn_base.key -> base_2da.bif contains itempropdef.2da row 44 costtable=18/param1=9, iprp_costtable.2da row 18 IPRP_LIGHTCOST ClientLoad=1, iprp_paramtable.2da row 9 IPRP_COLOR, iprp_lightcost.2da rows 1..4 Dim 5m/Low 10m/Normal 15m/Bright 20m, and iprp_color.2da rows 0..6 Blue/Yellow/Purple/Red/Green/Orange/White; retail resources map VFX_DUR_LIGHT visualeffects.2da rows 153..180 to explicit progfx.2da Type 4 normal rows 300..327/fade rows 350..377 and fx_light_clr.mdl animations; progfx.2da Type 4 Param3 provides item-light cast-shadow toggle with 5m rows=0 and 10m/15m/20m rows=1; object-level looping VFX owner add/remove, message diff/serialization, client receive/render/Gob instantiation, and generic MDL light-node PartLight creation/Gob-list attach are recovered for the fx_light_clr.mdl source family; cross-lane ordering and retail shadow-volume projection parity are still unrecovered";
const ITEM_PROPERTY_LIGHT_RUNTIME_SCHEDULER_BLOCKER =
  "Retail ApplyLight bridge, retail KEY/BIF item-light tables, object-level looping VFX owner add/remove, CNWSMessage last-update copy/diff, CNWSMessage game-object update serialization, client receive/render/Gob instantiation through CNWCMessage/CNWCObject/NewCAurObject, generic MdlNodeLight PartLight creation/Gob-list attach, and progfx.2da Param3 item-light shadow toggle are recovered, but cross-lane insertion order and retail shadow-volume projection parity are not recovered; preview uses source-family fx_light_clr radius/RGB and maps Three castShadow from retail Param3";
const ITEM_PROPERTY_LIGHT_SHADOW_POLICY_SOURCE =
  "nwn_base.key progfx.2da Type 4 item-light rows 300..327 and fade rows 350..377 use Param3 as cast shadows: 5m rows have 0, 10m/15m/20m rows have 1; fx_light_clr.mdl AuroraLight01 has shadow=true and shadowradius=15, while retail shadow-volume projection parity remains blocked";
const ITEM_PROPERTY_LIGHT_SHADOW_PROOF_STATUS =
  "source-backed-progfx-type4-param3-item-light-shadow-toggle-shadowvol-projection-blocked";
const ITEM_PROPERTY_LIGHT_COLOR_PROOF_STATUS =
  "source-family-backed-fx_light_clr-mdl-animation-rgb";
const ITEM_PROPERTY_LIGHT_RADIUS_PROOF_STATUS =
  "source-backed-retail-key-bif-iprp-lightcost-token-radius";
const ITEM_PROPERTY_LIGHT_PROGFX_FAMILY_SOURCE =
  "nwscript.nss VFX_DUR_LIGHT_* constants plus visualeffects.2da rows 153..180 mapping to progfx.2da normal rows 300..327 and fade rows 350..377; progfx.2da Type 4 Param1 Blue/Yello/Purp/Red/Gren/Orng/white_5m/10m/15m/20m -> fx_light_clr.mdl animation";
const ITEM_PROPERTY_LIGHT_PROGFX_FAMILY_PROOF_STATUS =
  "source-backed-applylight-vfxdur-looping-vfx-owner-message-lastupdate-client-receive-newcaurobject-mdlnodelight-partlight-create-gob-attach";
const ITEM_PROPERTY_LIGHT_BUDGET_CAP_PROOF_STATUS =
  "source-backed-active-light-slot-cap-max-128";
const AREA_OBJECT_NO_TERRAIN_THIN_SOURCE_ANCHOR_MAX_FOOTPRINT = 0.06;
const AREA_OBJECT_NO_TERRAIN_THIN_SOURCE_ANCHOR_MIN_HEIGHT = 0.2;

function ensurePlaceableTextureReferenceWithTimeout(
  runtime: RuntimeState,
  textureDeliveryUrl: string
): Promise<THREE.Texture | null> {
  let timeout: ReturnType<typeof globalThis.setTimeout> | null = null;
  const timeoutPromise = new Promise<null>((resolve) => {
    timeout = globalThis.setTimeout(
      () => resolve(null),
      PLACEABLE_MODEL_TEXTURE_REFERENCE_TIMEOUT_MS
    );
  });
  return Promise.race([
    ensurePlaceableTexture(runtime, textureDeliveryUrl),
    timeoutPromise
  ]).finally(() => {
    if (timeout) {
      globalThis.clearTimeout(timeout);
    }
  });
}

async function ensurePlaceableTexturesWithConcurrency(
  runtime: RuntimeState,
  textureDeliveryUrls: readonly string[],
  options: PlaceableTextureLoadOptions,
  concurrency = CANONICAL_VFX_TEXTURE_LOAD_CONCURRENCY
): Promise<Array<THREE.Texture | null>> {
  const resolvedTextures = new Array<THREE.Texture | null>(textureDeliveryUrls.length).fill(null);
  const workerCount = Math.min(
    textureDeliveryUrls.length,
    Math.max(1, Math.floor(concurrency))
  );
  let nextIndex = 0;
  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < textureDeliveryUrls.length) {
        const textureIndex = nextIndex;
        nextIndex += 1;
        resolvedTextures[textureIndex] = await ensurePlaceableTexture(
          runtime,
          textureDeliveryUrls[textureIndex]!,
          options
        );
      }
    })
  );
  return resolvedTextures;
}

function markSoundEditorGuide(node: THREE.Object3D, objectId: string, role: string): void {
  node.userData = {
    ...node.userData,
    soundRenderDiagnosticRole: SOUND_EDITOR_GUIDE_DIAGNOSTIC_ROLE,
    soundGuideRole: role,
    objectId,
    objectKind: "sounds"
  };
}

export function resolveSoundRenderDiagnostics(runtime: Pick<RuntimeState, "objectLayer" | "objectMeshById">): SoundRenderDiagnostics {
  let marker = 0;
  runtime.objectMeshById.forEach((node) => {
    if (node.userData?.soundRenderDiagnosticRole === SOUND_MARKER_DIAGNOSTIC_ROLE) {
      marker += 1;
    }
  });

  let editorGuides = 0;
  runtime.objectLayer.traverse((node) => {
    if (node.userData?.soundRenderDiagnosticRole === SOUND_EDITOR_GUIDE_DIAGNOSTIC_ROLE) {
      editorGuides += 1;
    }
  });

  return { marker, editorGuides };
}

export function writeSoundRenderDiagnostics(runtime: RuntimeState): SoundRenderDiagnostics {
  const diagnostics = resolveSoundRenderDiagnostics(runtime);
  runtime.container.dataset.soundMarkerCount = String(diagnostics.marker);
  runtime.container.dataset.soundEditorGuideCount = String(diagnostics.editorGuides);
  return diagnostics;
}

function formatPlaceableTwoDaLightValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .map((entry) =>
        typeof entry === "number" && Number.isFinite(entry)
          ? Number(entry.toFixed(6)).toString()
          : String(entry ?? "unknown")
      )
      .join(",");
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return Number(value.toFixed(6)).toString();
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  return "unknown";
}

function buildPlaceableTwoDaLightSample(node: THREE.Object3D): string {
  const userData = node.userData ?? {};
  return [
    `object=${formatPlaceableTwoDaLightValue(userData.objectId)}`,
    `role=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaLightPreviewRole)}`,
    `row=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaLightColorRow)}`,
    `raw=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaLightColorRaw)}`,
    `label=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaLightColorLabel)}`,
    `source=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaLightColorSourceKey)}`,
    `status=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaLightPreviewStatus)}`,
    `disabledReason=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaLightDisabledReason)}`,
    `lightState=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaLightState)}`,
    `lightStateSource=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaLightStateSource)}`,
    `lightStateProof=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaLightStateProofStatus)}`,
    `lightStateDefaulted=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaLightStateDefaulted)}`,
    `color=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaLightColor)}`,
    `toolsetColor=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaLightToolsetColor)}`,
    `toolsetColorSource=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaLightToolsetColorSource)}`,
    `toolsetColorEvidence=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaLightToolsetColorEvidence)}`,
    `toolsetColorProof=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaLightToolsetColorProofStatus)}`,
    `preview=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaLightPreviewColor)}`,
    `display=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaLightDisplayColor)}`,
    `displaySource=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaLightDisplayColorSource)}`,
    `colorSource=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaLightColorSource)}`,
    `colorProof=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaLightColorProofStatus)}`,
    `rgbVectorSource=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaLightRgbVectorSource)}`,
    `rgbVectorProof=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaLightRgbVectorProofStatus)}`,
    `intensity=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaLightIntensity)}`,
    `intensitySource=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaLightIntensitySource)}`,
    `intensityProof=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaLightIntensityProofStatus)}`,
    `distance=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaLightDistance)}`,
    `distanceSource=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaLightDistanceSource)}`,
    `distanceUsesShadowSize=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaLightDistanceUsesShadowSize)}`,
    `sourceRadius=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaLightSourceRadius)}`,
    `sourceRadiusUnits=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaLightSourceRadiusUnits)}`,
    `sourceUnitScale=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaLightSourceUnitScale)}`,
    `sourceWorldDistance=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaLightSourceRadiusWorldDistance)}`,
    `radiusProof=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaLightRadiusProofStatus)}`,
    `receiver=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaLightReceiverRadius)}`,
    `receiverSource=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaLightReceiverSource)}`,
    `offset=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaLightMappedOffset)}`,
    `offsetSource=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaLightOffsetSource)}`,
    `offsetProof=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaLightOffsetProofStatus)}`,
    `shadow=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaShadowSize)}`,
    `shadowSource=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaShadowSizeSource)}`,
    `shadowProof=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaShadowSizeProofStatus)}`,
    `shadowLane=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaShadowSizeLane)}`,
    `shadowSelection=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaShadowSizeSelectionRule)}`,
    `shadowSelectionProof=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaShadowSizeSelectionProofStatus)}`,
    `fastShadowModel=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowModelFileName)}`,
    `fastShadowModelHash=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowSourceModelHash)}`,
    `fastShadowSourceNodeOffset=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowSourceNodeOffset)}`,
    `fastShadowEmitter=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowEmitterNodeName)}`,
    `fastShadowEmitterType=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowEmitterType)}`,
    `fastShadowTexture=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowTexture)}`,
    `fastShadowTextureBinding=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowTextureBindingStatus)}`,
    `fastShadowTextureMapBound=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowTextureMapBound)}`,
    `fastShadowTextureBindingProof=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowTextureBindingProofStatus)}`,
    `fastShadowRenderMode=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowRenderMode)}`,
    `fastShadowBlendMode=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowBlendMode)}`,
    `fastShadowEmitterPosition=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowEmitterPosition)}`,
    `fastShadowEmitterSize=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowEmitterSize)}`,
    `fastShadowGeometry=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowGeometryType)}`,
    `fastShadowQuadSize=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowQuadSize)}`,
    `fastShadowGeometryProof=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowGeometryProofStatus)}`,
    `fastShadowEmitterAlpha=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowEmitterAlphaStart)}`,
    `fastShadowRadius=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowRadius)}`,
    `fastShadowRadiusSource=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowRadiusSource)}`,
    `fastShadowBaseOpacity=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowBaseOpacity)}`,
    `fastShadowOpacity=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowOpacity)}`,
    `fastShadowOpacitySource=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowOpacitySource)}`,
    `fastShadowAreaOpacity=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowAreaOpacity)}`,
    `fastShadowAreaFactor=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowAreaOpacityFactor)}`,
    `fastShadowAreaFactorSource=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowAreaOpacityFactorSource)}`,
    `fastShadowAreaProof=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowAreaOpacityProofStatus)}`,
    `fastShadowOpacityProof=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowOpacityProofStatus)}`,
    `fastShadowProjectionStatus=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowProjectionStatus)}`,
    `fastShadowProjectionSource=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowProjectionSource)}`,
    `fastShadowProjectionProof=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowProjectionProofStatus)}`,
    `fastShadowVolumeStatus=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowVolumeCasterStatus)}`,
    `fastShadowVolumeGeometryStatus=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowVolumeCasterGeometryStatus)}`,
    `fastShadowVolumeSourceVertices=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowVolumeCasterSourceVertexCount)}`,
    `fastShadowVolumeSourceQuadSize=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowVolumeCasterSourceQuadSize)}`,
    `fastShadowVolumeSourceQuadSizeSource=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowVolumeCasterSourceQuadSizeSource)}`,
    `fastShadowVolumeEdges=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowVolumeCasterEdgeCount)}`,
    `fastShadowVolumeRecords=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowVolumeCasterVertexRecordCount)}`,
    `fastShadowVolumeIndices=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowVolumeCasterIndexCount)}`,
    `fastShadowVolumeW=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowVolumeCasterWAttribute)}`,
    `fastShadowVolumeProof=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowVolumeCasterProofStatus)}`,
    `fastShadowVolumePreview=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowVolumeProjectionPreviewStatus)}`,
    `fastShadowVolumePreviewRenderer=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowVolumeProjectionPreviewRendererMode)}`,
    `fastShadowVolumePreviewVisible=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowVolumeProjectionPreviewVisible)}`,
    `fastShadowVolumePreviewW=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowVolumeProjectionPreviewWAttribute)}`,
    `fastShadowVolumePreviewLight=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowVolumeProjectionPreviewLightPosition)}`,
    `fastShadowVolumePreviewExtrusion=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowVolumeProjectionPreviewExtrusionDistance)}`,
    `fastShadowVolumePreviewOpacity=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowVolumeProjectionPreviewOpacity)}`,
    `fastShadowVolumePreviewOpacityScale=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowVolumeProjectionPreviewOpacityScale)}`,
    `fastShadowVolumePreviewOpacitySource=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowVolumeProjectionPreviewOpacitySource)}`,
    `fastShadowVolumePreviewOpacityProof=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowVolumeProjectionPreviewOpacityProofStatus)}`,
    `fastShadowVolumePreviewProof=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowVolumeProjectionPreviewProofStatus)}`,
    `fastShadowVolumeStencil=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowVolumeStencilStatus)}`,
    `fastShadowVolumeStencilRenderer=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowVolumeStencilRendererMode)}`,
    `fastShadowVolumeStencilVisible=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowVolumeStencilVisible)}`,
    `fastShadowVolumeStencilW=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowVolumeStencilWAttribute)}`,
    `fastShadowVolumeStencilLight=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowVolumeStencilLightPosition)}`,
    `fastShadowVolumeStencilExtrusion=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowVolumeStencilExtrusionDistance)}`,
    `fastShadowVolumeStencilReceiverSize=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowVolumeStencilReceiverSize)}`,
    `fastShadowVolumeStencilReceiverOpacity=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowVolumeStencilReceiverOpacity)}`,
    `fastShadowVolumeStencilReceiverOpacityScale=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowVolumeStencilReceiverOpacityScale)}`,
    `fastShadowVolumeStencilReceiverOpacitySource=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowVolumeStencilReceiverOpacitySource)}`,
    `fastShadowVolumeStencilReceiverOpacityProof=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowVolumeStencilReceiverOpacityProofStatus)}`,
    `fastShadowVolumeStencilReceiverFunc=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowVolumeStencilReceiverFunc)}`,
    `fastShadowVolumeStencilPasses=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowVolumeStencilVolumePasses)}`,
    `fastShadowVolumeStencilPassStates=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowVolumeStencilPassStateSamples)}`,
    `fastShadowVolumeStencilReceiverState=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowVolumeStencilReceiverState)}`,
    `fastShadowVolumeStencilStateProof=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowVolumeStencilStateProofStatus)}`,
    `fastShadowVolumeStencilRetailOps=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowVolumeStencilRetailOpSequence)}`,
    `fastShadowVolumeStencilProof=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowVolumeStencilProofStatus)}`,
    `fastShadowVolumeShaders=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowVolumeRenderShaderNames)}`,
    `fastShadowVolumeBuckets=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowVolumeRenderBuckets)}`,
    `fastShadowVolumePath=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowVolumeRenderPathSource)}`,
    `fastShadowVolumeDrawWrapper=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowVolumeDrawWrapperSource)}`,
    `fastShadowVolumeLightProfile=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowVolumeLightProfileSource)}`,
    `fastShadowVolumePathProof=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowVolumeRenderPathProofStatus)}`,
    `fastShadowProof=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaFastShadowProofStatus)}`,
    `toggleSource=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaStaticLightingToggleSource)}`,
    `toggleProof=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaStaticLightingToggleProofStatus)}`,
    `static=${formatPlaceableTwoDaLightValue(userData.placeableTwoDaStaticLightingRecomputeToken)}`
  ].join(";");
}

export function resolvePlaceableTwoDaLightRenderDiagnostics(
  runtime: Pick<RuntimeState, "objectLayer">
): PlaceableTwoDaLightRenderDiagnostics {
  let sourceGroups = 0;
  let pointLights = 0;
  let halos = 0;
  let cores = 0;
  let receivers = 0;
  let fastShadows = 0;
  let disabledByLightState = 0;
  let disabledByUseAreaLighting = 0;
  const samples: string[] = [];

  runtime.objectLayer.traverse((node) => {
    const role = node.userData?.placeableTwoDaLightPreviewRole;
    if (node.userData?.placeableTwoDaLightPreviewStatus === "off-by-lightstate") {
      disabledByLightState += 1;
      if (samples.length < 8) {
        samples.push(buildPlaceableTwoDaLightSample(node));
      }
    }
    if (node.userData?.placeableTwoDaLightPreviewStatus === "off-by-use-area-lighting") {
      disabledByUseAreaLighting += 1;
      if (samples.length < 8) {
        samples.push(buildPlaceableTwoDaLightSample(node));
      }
    }
    if (node.name === PLACEABLE_TWO_DA_LIGHT_SOURCE_NAME) {
      sourceGroups += 1;
      if (samples.length < 8) {
        samples.push(buildPlaceableTwoDaLightSample(node));
      }
    }
    if (role === PLACEABLE_TWO_DA_POINT_LIGHT_ROLE && node instanceof THREE.PointLight) {
      pointLights += 1;
      if (samples.length < 8) {
        samples.push(buildPlaceableTwoDaLightSample(node));
      }
    }
    if (role === PLACEABLE_TWO_DA_HALO_ROLE) {
      halos += 1;
    }
    if (role === PLACEABLE_TWO_DA_CORE_ROLE) {
      cores += 1;
    }
    if (role === PLACEABLE_TWO_DA_RECEIVER_ROLE) {
      receivers += 1;
    }
    if (node.name === PLACEABLE_TWO_DA_FAST_SHADOW_NAME) {
      fastShadows += 1;
    }
  });

  return {
    status:
      sourceGroups > 0 && pointLights > 0
        ? "active"
        : disabledByLightState > 0 || disabledByUseAreaLighting > 0
          ? "disabled"
          : "missing",
    sourceGroups,
    pointLights,
    halos,
    cores,
    receivers,
    fastShadows,
    disabledByLightState,
    disabledByUseAreaLighting,
    samples
  };
}

export function writePlaceableTwoDaLightRenderDiagnostics(
  runtime: RuntimeState
): PlaceableTwoDaLightRenderDiagnostics {
  const diagnostics = resolvePlaceableTwoDaLightRenderDiagnostics(runtime);
  runtime.container.dataset.placeableTwoDaLightStatus = diagnostics.status;
  runtime.container.dataset.placeableTwoDaLightSourceCount = String(diagnostics.sourceGroups);
  runtime.container.dataset.placeableTwoDaLightPointLightCount = String(diagnostics.pointLights);
  runtime.container.dataset.placeableTwoDaLightHaloCount = String(diagnostics.halos);
  runtime.container.dataset.placeableTwoDaLightCoreCount = String(diagnostics.cores);
  runtime.container.dataset.placeableTwoDaLightReceiverCount = String(diagnostics.receivers);
  runtime.container.dataset.placeableTwoDaLightFastShadowCount = String(diagnostics.fastShadows);
  runtime.container.dataset.placeableTwoDaLightDisabledCount = String(
    diagnostics.disabledByLightState + diagnostics.disabledByUseAreaLighting
  );
  runtime.container.dataset.placeableTwoDaLightDisabledByLightStateCount = String(
    diagnostics.disabledByLightState
  );
  runtime.container.dataset.placeableTwoDaLightDisabledByUseAreaLightingCount = String(
    diagnostics.disabledByUseAreaLighting
  );
  runtime.container.dataset.placeableTwoDaLightSamples = diagnostics.samples.join("|");
  return diagnostics;
}

export const OBJECT_COLORS: Record<SceneObjectKind, string> = {
  placeables: "#7fb3ff",
  creatures: "#ff9a7b",
  doors: "#ffd39c",
  encounters: "#f5d66f",
  items: "#b8ffb7",
  sounds: "#c8b4ff",
  stores: "#9edfd3",
  triggers: "#ff8fc7",
  waypoints: "#9be3ff"
};

const OBJECT_LABELS: Record<SceneObjectKind, string> = {
  placeables: "PLC",
  creatures: "CRT",
  doors: "DOR",
  encounters: "ENC",
  items: "ITM",
  sounds: "SND",
  stores: "STO",
  triggers: "TRG",
  waypoints: "WPT"
};

const PLACEABLE_RENDER_TEXTURES_MISSING_DIAGNOSTIC =
  "PLACEABLE_RENDER_TEXTURES_MISSING";
const PLACEABLE_RENDER_SOURCE_MODEL_NO_GEOMETRY_DIAGNOSTIC =
  "PLACEABLE_RENDER_SOURCE_MODEL_NO_GEOMETRY";
const PLACEABLE_RENDER_AREA_INSTANCE_HELPER_NO_GEOMETRY_DIAGNOSTIC =
  "PLACEABLE_RENDER_AREA_INSTANCE_HELPER_NO_GEOMETRY";

type CreatureAuroraLightNode =
  NonNullable<NonNullable<CreatureViewportRenderPayload["renderPackage"]>["auroraLight"]>["lights"][number];
type CreatureAuroraLightAnimation = NonNullable<CreatureAuroraLightNode["animations"]>[number];
interface CreatureAuroraLightPreviewBudgetEntry {
  light: CreatureAuroraLightNode;
  sourceIndex: number;
  retailScore: AuroraLightManagerPreviewScore;
  rank: number;
  accepted: boolean;
}

type CreatureAuroraEmitterNode =
  NonNullable<NonNullable<CreatureViewportRenderPayload["renderPackage"]>["auroraEmitter"]>["emitters"][number];

type CreatureEquipmentModelCandidate =
  NonNullable<CreatureViewportRenderPayload["renderPackage"]>["equipmentModelCandidates"][number];
type CreatureRenderAppearanceProfile =
  NonNullable<CreatureViewportRenderPayload["renderPackage"]>["appearanceProfile"];
type CreatureSkeletonModelCandidate =
  NonNullable<CreatureViewportRenderPayload["renderPackage"]>["skeletonModelCandidates"][number];

const CREATURE_EQUIPMENT_MODEL_PART_REQUEST_TOKEN_KEY =
  "creatureEquipmentModelPartRequestToken";
const CREATURE_EQUIPMENT_ITEM_PROPERTY_LIGHT_GROUP_STATUS =
  "creature-equipment-itemproperty-light";
let creatureEquipmentModelPartRequestSequence = 0;

function hasPlaceableMissingTextureDiagnostic(
  payload: PlaceableViewportRenderPayload | null | undefined
): boolean {
  return (
    payload?.renderPackage?.diagnostics.some(
      (diagnostic) => diagnostic.code === PLACEABLE_RENDER_TEXTURES_MISSING_DIAGNOSTIC
    ) ?? false
  );
}

function readUnknownRecordNumber(value: unknown, path: string[]): number | undefined {
  let current: unknown = value;
  for (const key of path) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "number" && Number.isFinite(current) ? current : undefined;
}

function hasPlaceableNoGeometryDiagnostic(
  payload: PlaceableViewportRenderPayload | null | undefined
): boolean {
  return (
    payload?.renderPackage?.diagnostics?.some(
      (diagnostic) =>
        diagnostic.code === PLACEABLE_RENDER_SOURCE_MODEL_NO_GEOMETRY_DIAGNOSTIC ||
        diagnostic.code === PLACEABLE_RENDER_AREA_INSTANCE_HELPER_NO_GEOMETRY_DIAGNOSTIC
    ) ?? false
  );
}

function buildCreatureRenderPayloadUserData(
  payload: CreatureViewportRenderPayload | null | undefined
): Record<string, unknown> {
  if (!payload) {
    return {
      creatureRenderPayloadStatus: "missing-payload",
      creatureRenderPackageStatus: "missing"
    };
  }
  const renderPackage = payload.renderPackage;
  const appearanceProfile = renderPackage?.appearanceProfile;
  const materialEvidence = renderPackage?.materialPipelineEvidence;
  const skeletonEvidence = renderPackage?.skeletonPipelineEvidence;
  const sourceMdlInspectionModels = renderPackage?.sourceMdlInspection?.models ?? [];
  const equipmentModelCandidates = renderPackage?.equipmentModelCandidates ?? [];
  const creaturePltLayerRows = collectCreaturePltLayerRows(renderPackage?.colors);
  const animationState = readUnknownRecordNumber(
    payload.creature.creatureRuntime,
    ["state", "animationState"]
  );
  return {
    creatureRenderPayloadStatus: "payload-bound",
    creatureRenderPackageStatus: renderPackage?.status ?? "missing",
    creatureRenderRendererPreset: renderPackage?.rendererPreset ?? payload.creature.render.rendererPreset,
    creatureRenderDiagnosticCodes:
      renderPackage?.diagnostics.map((diagnostic) => diagnostic.code) ?? [],
    creatureSourceModelCandidateResRefs:
      renderPackage?.sourceModelCandidates.map((candidate) => candidate.resref) ?? [],
    creatureSourceModelCandidateConfidence:
      renderPackage?.sourceModelCandidates.map((candidate) => candidate.confidence) ?? [],
    creatureSkeletonModelCandidateResRefs:
      renderPackage?.skeletonModelCandidates.map((candidate) => candidate.resref) ?? [],
    creatureSkeletonModelCandidatePrefixes:
      renderPackage?.skeletonModelCandidates.map((candidate) => candidate.modelPrefix) ?? [],
    creatureSkeletonModelCandidateUrlReadyCount:
      renderPackage?.skeletonModelCandidates.filter(
        (candidate) => candidate.glbUrl || candidate.modelUrl
      ).length ?? 0,
    creatureSkeletonModelCandidateAssetIds:
      renderPackage?.skeletonModelCandidates
        .map((candidate) => candidate.assetId)
        .filter((value): value is string => Boolean(value)) ?? [],
    creatureSkeletonModelCandidateUrls:
      renderPackage?.skeletonModelCandidates
        .map((candidate) => candidate.glbUrl ?? candidate.modelUrl)
        .filter((value): value is string => Boolean(value)) ?? [],
    creaturePartModelCandidateCount: renderPackage?.partModelCandidates.length ?? 0,
    creaturePartModelCandidateUrlReadyCount:
      renderPackage?.partModelCandidates.filter(
        (candidate) => candidate.glbUrl || candidate.modelUrl
      ).length ?? 0,
    creaturePartModelCandidateSlots:
      renderPackage?.partModelCandidates.map((candidate) => candidate.slot) ?? [],
    creaturePartModelCandidateResRefs:
      renderPackage?.partModelCandidates
        .map((candidate) => candidate.modelResRef)
        .filter((value): value is string => Boolean(value)) ?? [],
    creaturePartModelCandidateNodeNames:
      renderPackage?.partModelCandidates
        .map((candidate) => candidate.nodeName)
        .filter((value): value is string => Boolean(value)) ?? [],
    creaturePartModelCandidatePatternFormats:
      renderPackage?.partModelCandidates
        .map((candidate) => candidate.modelResRefPatternFormat)
        .filter((value): value is string => Boolean(value)) ?? [],
    creaturePartModelCandidateUrls:
      renderPackage?.partModelCandidates
        .map((candidate) => candidate.glbUrl ?? candidate.modelUrl)
        .filter((value): value is string => Boolean(value)) ?? [],
    creatureEquipmentModelCandidateCount: equipmentModelCandidates.length,
    creatureEquipmentModelCandidateResRefs:
      equipmentModelCandidates.map((candidate) => candidate.resref),
    creatureEquipmentModelCandidateSlotLabels:
      equipmentModelCandidates.map((candidate) => candidate.slotLabels.join("/") || "unknown"),
    creatureEquipmentModelCandidateAttachmentTargets:
      equipmentModelCandidates.map(
        (candidate) =>
          candidate.primaryAttachmentTarget ?? candidate.attachmentTargets[0] ?? "rootdummy"
      ),
    creatureEquipmentModelCandidateSourceStatuses:
      equipmentModelCandidates.map((candidate) => candidate.sourceModelStatus),
    creatureEquipmentModelCandidateModelTypes:
      equipmentModelCandidates
        .map((candidate) => candidate.itemModelType)
        .filter((value): value is string => Boolean(value)),
    creatureEquipmentModelCandidateModelParts:
      equipmentModelCandidates.map((candidate) => candidate.itemModelParts ?? []),
    creatureEquipmentModelCandidateModelPartRoles:
      equipmentModelCandidates.map((candidate) => candidate.itemModelPartRoles ?? []),
    creatureEquipmentModelCandidateModelPartResRefs:
      equipmentModelCandidates.map((candidate) => candidate.itemModelPartResRefs ?? []),
    creatureEquipmentModelCandidateModelPartUrlReadyCount:
      equipmentModelCandidates.reduce(
        (count, candidate) =>
          count +
          (candidate.itemModelPartCandidates?.filter((part) => part.glbUrl || part.modelUrl)
            .length ?? 0),
        0
      ),
    creatureEquipmentModelCandidateModelPartUrls:
      equipmentModelCandidates.flatMap(
        (candidate) =>
          candidate.itemModelPartCandidates
            ?.map((part) => part.glbUrl ?? part.modelUrl)
            .filter((value): value is string => Boolean(value)) ?? []
      ),
    creatureRenderTextureUrlCount: renderPackage?.textureUrls?.length ?? 0,
    creatureRenderTextureUrls: renderPackage?.textureUrls ?? [],
    creatureRenderTextureBindingCount: renderPackage?.textureBindings?.length ?? 0,
    creatureRenderTextureBindingReferences:
      renderPackage?.textureBindings?.map((binding) => binding.reference) ?? [],
    creatureRenderAuroraMaterialCount: renderPackage?.auroraMaterial?.materials.length ?? 0,
    creatureRenderAuroraMaterialFiles:
      renderPackage?.auroraMaterial?.materials.map((material) => material.materialFileName) ?? [],
    creatureAuroraEmitterCount: renderPackage?.auroraEmitter?.emitters.length ?? 0,
    creatureAuroraEmitterNodeNames:
      renderPackage?.auroraEmitter?.emitters.map((emitter) => emitter.nodeName) ?? [],
    creatureAuroraEmitterSourceModelFiles:
      renderPackage?.auroraEmitter?.emitters.map((emitter) => emitter.sourceModelFileName) ?? [],
    creatureAuroraEmitterTextures:
      renderPackage?.auroraEmitter?.emitters.map((emitter) => emitter.texture ?? "") ?? [],
    creatureAuroraEmitterChunkNames:
      renderPackage?.auroraEmitter?.emitters.map((emitter) => emitter.chunkName ?? "") ?? [],
    creatureAuroraLightCount: renderPackage?.auroraLight?.lights.length ?? 0,
    creatureAuroraLightNodeNames:
      renderPackage?.auroraLight?.lights.map((light) => light.nodeName) ?? [],
    creatureAuroraLightSourceModelFiles:
      renderPackage?.auroraLight?.lights.map((light) => light.sourceModelFileName) ?? [],
    creatureSourceMdlInspectionModelCount: sourceMdlInspectionModels.length,
    creatureSourceMdlInspectionNodeCount: sourceMdlInspectionModels.reduce(
      (total, model) => total + model.nodeCount,
      0
    ),
    creatureSourceMdlInspectionAnimationCount: sourceMdlInspectionModels.reduce(
      (total, model) => total + model.animationCount,
      0
    ),
    creatureSourceMdlInspectionModelNames: sourceMdlInspectionModels.map(
      (model) => model.modelName
    ),
    creatureSourceMdlInspectionNodeTypes: Array.from(
      new Set(sourceMdlInspectionModels.flatMap((model) => model.nodeTypes))
    ).sort((left, right) => left.localeCompare(right)),
    creatureSourceMdlInspectionAnimationNames: sourceMdlInspectionModels.flatMap(
      (model) => model.animationNames
    ),
    creatureRenderColorChannels: Object.entries(renderPackage?.colors ?? {})
      .filter(([, value]) => typeof value === "number")
      .map(([key]) => key),
    creatureRenderPltPaletteRowMax: CREATURE_PLT_PALETTE_ROW_MAX,
    creatureRenderPltLayerRows: creaturePltLayerRows,
    creatureRenderPltLayerRowCount: Object.keys(creaturePltLayerRows).length,
    creatureRenderMaterialPipelineSource: materialEvidence?.source,
    creatureRenderPltVertexShaderName: materialEvidence?.pltVertexShaderName,
    creatureRenderPltFragmentShaderName: materialEvidence?.pltFragmentShaderName,
    creatureRenderPltSchemeUniformPattern: materialEvidence?.pltSchemeUniformPattern,
    creatureRenderPltSchemeUniformCount: materialEvidence?.pltSchemeUniformCount,
    creatureRenderPltReplacementUniformName: materialEvidence?.pltReplacementUniformName,
    creatureRenderSkinPaletteResRef: materialEvidence?.skinPaletteResRef,
    creatureRenderSkeletonPipelineSource: skeletonEvidence?.source,
    creatureRenderSupermodelCommandName: skeletonEvidence?.supermodelCommandName,
    creatureRenderAnimationScaleCommandName: skeletonEvidence?.animationScaleCommandName,
    creatureRenderSkinnedMeshNodeType: skeletonEvidence?.skinnedMeshNodeType,
    creatureRenderRequiresComposedSkeleton: skeletonEvidence?.requiresComposedSkeleton,
    creatureTemplateId: payload.templateId,
    creatureResRef: payload.creature.resref,
    creatureCacheKey: payload.cacheKey,
    creatureAppearanceType: appearanceProfile?.appearanceType,
    creatureAppearanceLabel: appearanceProfile?.appearanceLabel,
    creatureAppearanceModelType: appearanceProfile?.modelType,
    creatureAppearanceRaceModel: appearanceProfile?.raceModel,
    creatureAppearancePhenotype: appearanceProfile?.phenotype,
    ...(animationState !== undefined
      ? {
          creatureAnimationState: Math.trunc(animationState),
          creatureAnimationStateMappingStatus: "runtime-state-unmapped",
          creatureAnimationStateMappingSource: "creatureRuntime.state.animationState"
        }
      : {
          creatureAnimationStateMappingStatus: "not-provided",
          creatureAnimationStateMappingSource: "none"
        }),
    creatureAppearanceSizeCategory: appearanceProfile?.sizeCategory,
    creatureAppearanceSizeCategoryLabel: appearanceProfile?.sizeCategoryLabel
  };
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function resolveAuroraRuntimeLightBudgetSelection(
  runtime: RuntimeState
): AuroraRuntimeLightBudgetSelection {
  const configured = runtime.scene?.userData?.auroraLightConfiguredMaxLights;
  if (typeof configured !== "number" || !Number.isFinite(configured)) {
    return { activeSlotCap: AURORA_LIGHT_PREVIEW_ACTIVE_SLOT_CAP };
  }
  const configuredMaxLights = Math.max(0, Math.trunc(configured));
  return {
    activeSlotCap: Math.min(configuredMaxLights, AURORA_LIGHT_PREVIEW_ACTIVE_SLOT_CAP),
    configuredMaxLights
  };
}

interface ItemPropertyLightBrightnessPreview {
  readonly value: number;
  readonly label: string;
  readonly radiusMeters: number;
  readonly radiusSuffix: 5 | 10 | 15 | 20;
}

interface ItemPropertyLightColorPreview {
  readonly value: number;
  readonly label: string;
  readonly sourceMdlRgbByRadiusSuffix: Record<5 | 10 | 15 | 20, [number, number, number]>;
  readonly progFxSymbolicColor: "Blue" | "Yellow" | "Purple" | "Red" | "Orange" | "White" | "Green";
  readonly progFxAnimationPrefix: "Blue" | "Yello" | "Purp" | "Red" | "Orng" | "white" | "Gren";
  readonly visualEffectTableColor:
    | "BLUE"
    | "YELLOW"
    | "PURPLE"
    | "RED"
    | "ORANGE"
    | "WHITE"
    | "GREEN";
  readonly nwscriptVfxConstantColor: "BLUE" | "YELLOW" | "PURPLE" | "RED" | "ORANGE" | "WHITE" | "GREY";
  readonly visualEffectBaseRowId: number;
  readonly progFxBaseRowId: number;
  readonly progFxFadeBaseRowId: number;
  readonly progFxLabelColor: "Blue" | "Yellow" | "Purple" | "Red" | "Orange" | "White" | "Green";
}

interface ItemPropertyLightPreview {
  readonly entry: SceneObjectItemPropertyEntry;
  readonly brightness: ItemPropertyLightBrightnessPreview;
  readonly color: ItemPropertyLightColorPreview;
}

interface ItemPropertyLightSourceMdlPreview {
  readonly sourceRgb: [number, number, number];
  readonly pointLightRgb: [number, number, number];
  readonly intensity: number;
  readonly sourceRadiusMeters: number;
  readonly radiusFrames: [number, number];
}

interface ItemPropertyLightPreviewGroupOptions {
  readonly groupName?: string;
  readonly sourceRole?: string;
  readonly localYOffset?: number;
  readonly extraUserData?: Record<string, unknown>;
  readonly lightBudget?: AuroraRuntimeLightBudgetSelection;
  readonly lightBudgetRank?: number;
  readonly lightBudgetCandidateCount?: number;
}

const ITEM_PROPERTY_LIGHT_BRIGHTNESS_BY_VALUE: Record<
  number,
  ItemPropertyLightBrightnessPreview
> = {
  1: { value: 1, label: "Dim", radiusMeters: 5, radiusSuffix: 5 },
  2: { value: 2, label: "Low", radiusMeters: 10, radiusSuffix: 10 },
  3: { value: 3, label: "Normal", radiusMeters: 15, radiusSuffix: 15 },
  4: { value: 4, label: "Bright", radiusMeters: 20, radiusSuffix: 20 }
};

const ITEM_PROPERTY_LIGHT_COLOR_BY_VALUE: Record<number, ItemPropertyLightColorPreview> = {
  0: {
    value: 0,
    label: "Blue",
    sourceMdlRgbByRadiusSuffix: {
      5: [0.5, 0.5, 1],
      10: [0.75, 0.75, 1.25],
      15: [1, 1, 1.5],
      20: [1.25, 1.25, 1.75]
    },
    progFxSymbolicColor: "Blue",
    progFxAnimationPrefix: "Blue",
    visualEffectTableColor: "BLUE",
    nwscriptVfxConstantColor: "BLUE",
    visualEffectBaseRowId: 153,
    progFxBaseRowId: 304,
    progFxFadeBaseRowId: 354,
    progFxLabelColor: "Blue"
  },
  1: {
    value: 1,
    label: "Yellow",
    sourceMdlRgbByRadiusSuffix: {
      5: [1, 0.75, 0.25],
      10: [1.25, 1, 0.5],
      15: [1.5, 1.25, 0.75],
      20: [1.75, 1.5, 1]
    },
    progFxSymbolicColor: "Yellow",
    progFxAnimationPrefix: "Yello",
    visualEffectTableColor: "YELLOW",
    nwscriptVfxConstantColor: "YELLOW",
    visualEffectBaseRowId: 157,
    progFxBaseRowId: 308,
    progFxFadeBaseRowId: 358,
    progFxLabelColor: "Yellow"
  },
  2: {
    value: 2,
    label: "Purple",
    sourceMdlRgbByRadiusSuffix: {
      5: [1, 0.5, 1],
      10: [1.25, 0.75, 1.25],
      15: [1.5, 1, 1.5],
      20: [1.75, 1.25, 1.75]
    },
    progFxSymbolicColor: "Purple",
    progFxAnimationPrefix: "Purp",
    visualEffectTableColor: "PURPLE",
    nwscriptVfxConstantColor: "PURPLE",
    visualEffectBaseRowId: 161,
    progFxBaseRowId: 320,
    progFxFadeBaseRowId: 370,
    progFxLabelColor: "Purple"
  },
  3: {
    value: 3,
    label: "Red",
    sourceMdlRgbByRadiusSuffix: {
      5: [1, 0.35, 0.2],
      10: [1.25, 0.5, 0.3],
      15: [1.5, 0.66, 0.4],
      20: [1.75, 0.75, 0.5]
    },
    progFxSymbolicColor: "Red",
    progFxAnimationPrefix: "Red",
    visualEffectTableColor: "RED",
    nwscriptVfxConstantColor: "RED",
    visualEffectBaseRowId: 165,
    progFxBaseRowId: 312,
    progFxFadeBaseRowId: 362,
    progFxLabelColor: "Red"
  },
  4: {
    value: 4,
    label: "Green",
    sourceMdlRgbByRadiusSuffix: {
      5: [0.5, 1, 0.25],
      10: [0.75, 1.25, 0.5],
      15: [1, 1.5, 0.75],
      20: [1.25, 1.75, 1]
    },
    progFxSymbolicColor: "Green",
    progFxAnimationPrefix: "Gren",
    visualEffectTableColor: "GREEN",
    nwscriptVfxConstantColor: "GREY",
    visualEffectBaseRowId: 177,
    progFxBaseRowId: 324,
    progFxFadeBaseRowId: 374,
    progFxLabelColor: "Green"
  },
  5: {
    value: 5,
    label: "Orange",
    sourceMdlRgbByRadiusSuffix: {
      5: [1, 0.55, 0.225],
      10: [1.25, 0.75, 0.4],
      15: [1.5, 0.9, 0.55],
      20: [1.75, 1.15, 0.75]
    },
    progFxSymbolicColor: "Orange",
    progFxAnimationPrefix: "Orng",
    visualEffectTableColor: "ORANGE",
    nwscriptVfxConstantColor: "ORANGE",
    visualEffectBaseRowId: 169,
    progFxBaseRowId: 316,
    progFxFadeBaseRowId: 366,
    progFxLabelColor: "Orange"
  },
  6: {
    value: 6,
    label: "White",
    sourceMdlRgbByRadiusSuffix: {
      5: [1, 1, 1],
      10: [1.25, 1.25, 1.25],
      15: [1.5, 1.5, 1.5],
      20: [1.75, 1.75, 1.75]
    },
    progFxSymbolicColor: "White",
    progFxAnimationPrefix: "white",
    visualEffectTableColor: "WHITE",
    nwscriptVfxConstantColor: "WHITE",
    visualEffectBaseRowId: 173,
    progFxBaseRowId: 300,
    progFxFadeBaseRowId: 350,
    progFxLabelColor: "White"
  }
};

function readItemPropertyInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : null;
}

function isItemPropertyLightEntry(entry: SceneObjectItemPropertyEntry): boolean {
  if (readItemPropertyInteger(entry.propertyName) === ITEM_PROPERTY_LIGHT_PROPERTY_NAME) {
    return true;
  }
  return entry.propertyLabel?.trim().toLowerCase() === "light";
}

function resolveItemPropertyLightPreviewFromEntries(
  entries: readonly SceneObjectItemPropertyEntry[] | undefined
): ItemPropertyLightPreview | null {
  const entry = entries?.find(isItemPropertyLightEntry);
  if (!entry) {
    return null;
  }
  const brightnessValue = readItemPropertyInteger(entry.costValue);
  const colorValue = readItemPropertyInteger(entry.param1Value);
  const brightness =
    brightnessValue === null ? undefined : ITEM_PROPERTY_LIGHT_BRIGHTNESS_BY_VALUE[brightnessValue];
  const color = colorValue === null ? undefined : ITEM_PROPERTY_LIGHT_COLOR_BY_VALUE[colorValue];
  if (!brightness || !color) {
    return null;
  }
  return { entry, brightness, color };
}

function resolveItemPropertyLightPreview(object: SceneObject): ItemPropertyLightPreview | null {
  return resolveItemPropertyLightPreviewFromEntries(object.itemProperties?.propertyList);
}

function resolveItemPropertyLightSourceMdlPreview(
  preview: ItemPropertyLightPreview
): ItemPropertyLightSourceMdlPreview {
  const sourceRgb =
    preview.color.sourceMdlRgbByRadiusSuffix[preview.brightness.radiusSuffix];
  const intensity = Math.max(sourceRgb[0], sourceRgb[1], sourceRgb[2], 0.0001);
  return {
    sourceRgb,
    pointLightRgb: [
      sourceRgb[0] / intensity,
      sourceRgb[1] / intensity,
      sourceRgb[2] / intensity
    ],
    intensity,
    sourceRadiusMeters: ITEM_PROPERTY_LIGHT_SOURCE_MDL_RADIUS_METERS,
    radiusFrames: [0, ITEM_PROPERTY_LIGHT_SOURCE_MDL_RADIUS_METERS]
  };
}

function resolveItemPropertyLightCastShadows(preview: ItemPropertyLightPreview): boolean {
  return preview.brightness.value > 1;
}

function buildItemPropertyLightUserData(
  preview: ItemPropertyLightPreview,
  distance: number,
  sourceMdl: ItemPropertyLightSourceMdlPreview,
  metersToWorldScale: number
): Record<string, unknown> {
  const { entry, brightness, color } = preview;
  const castShadows = resolveItemPropertyLightCastShadows(preview);
  const castShadowsRaw = castShadows ? "1" : "0";
  const relatedVisualEffectRowId = color.visualEffectBaseRowId + brightness.value - 1;
  const relatedVisualEffectConstant = `VFX_DUR_LIGHT_${color.nwscriptVfxConstantColor}_${brightness.radiusSuffix}`;
  const relatedVisualEffectLabel = `VFX_DUR_LIGHT_${color.visualEffectTableColor}_${brightness.radiusSuffix}`;
  const relatedProgFxRowId = color.progFxBaseRowId + brightness.value - 1;
  const relatedProgFxFadeRowId = color.progFxFadeBaseRowId + brightness.value - 1;
  const relatedProgFxLabel = `Light${color.progFxLabelColor}${brightness.radiusSuffix}m`;
  const relatedProgFxFadeLabel = `FadeL${color.progFxLabelColor}${brightness.radiusSuffix}m`;
  const relatedProgFxAnimation = `${color.progFxAnimationPrefix}_${brightness.radiusSuffix}m`;
  return {
    itemPropertyLightPreviewStatus: "active",
    itemPropertyLightPreviewMode: "itemproperty-light",
    itemPropertyLightPropertyName: entry.propertyName ?? ITEM_PROPERTY_LIGHT_PROPERTY_NAME,
    itemPropertyLightPropertyLabel: entry.propertyLabel ?? "Light",
    itemPropertyLightSource: ITEM_PROPERTY_LIGHT_RUNTIME_SOURCE,
    itemPropertyLightEvidence: ITEM_PROPERTY_LIGHT_SOURCE,
    itemPropertyLightCostTableDefinition: entry.costTableDefinition ?? "",
    itemPropertyLightParam1Table: entry.param1Table ?? "",
    itemPropertyLightBrightness: brightness.value,
    itemPropertyLightBrightnessLabel: brightness.label,
    itemPropertyLightBrightnessRadiusMeters: brightness.radiusMeters,
    itemPropertyLightBrightnessSource: ITEM_PROPERTY_LIGHT_VALUE_SOURCE,
    itemPropertyLightBrightnessRadiusSource: ITEM_PROPERTY_LIGHT_RADIUS_SOURCE,
    itemPropertyLightRadiusProofStatus: ITEM_PROPERTY_LIGHT_RADIUS_PROOF_STATUS,
    itemPropertyLightColorValue: color.value,
    itemPropertyLightColorLabel: color.label,
    itemPropertyLightColor: sourceMdl.sourceRgb,
    itemPropertyLightColorSource: ITEM_PROPERTY_LIGHT_SOURCE_MDL_COLOR_SOURCE,
    itemPropertyLightColorProofStatus: ITEM_PROPERTY_LIGHT_COLOR_PROOF_STATUS,
    itemPropertyLightProgFxFamilySource: ITEM_PROPERTY_LIGHT_PROGFX_FAMILY_SOURCE,
    itemPropertyLightProgFxFamilyProofStatus: ITEM_PROPERTY_LIGHT_PROGFX_FAMILY_PROOF_STATUS,
    itemPropertyLightRelatedVisualEffectRowId: relatedVisualEffectRowId,
    itemPropertyLightRelatedVisualEffectConstant: relatedVisualEffectConstant,
    itemPropertyLightRelatedVisualEffectLabel: relatedVisualEffectLabel,
    itemPropertyLightRelatedVisualEffectLabelSource:
      "visualeffects.2da rows 153..180; rows 177..180 are labeled VFX_DUR_LIGHT_GREEN_* while nwscript.nss exposes same ids as VFX_DUR_LIGHT_GREY_*",
    itemPropertyLightRelatedProgFxRowId: relatedProgFxRowId,
    itemPropertyLightRelatedProgFxLabel: relatedProgFxLabel,
    itemPropertyLightRelatedProgFxFadeRowId: relatedProgFxFadeRowId,
    itemPropertyLightRelatedProgFxFadeLabel: relatedProgFxFadeLabel,
    itemPropertyLightRelatedProgFxRowSource:
      "visualeffects.2da rows 153..180 map each VFX_DUR_LIGHT_* row to explicit progfx.2da Type 4 normal/fade rows; ordering is White, Blue, Yellow, Red, Orange, Purple, Green in progfx.2da and must not be derived by visualeffects row offset",
    itemPropertyLightRelatedProgFxCastShadowsRaw: castShadowsRaw,
    itemPropertyLightRelatedProgFxCastShadows: castShadows,
    itemPropertyLightRelatedProgFxFadeCastShadowsRaw: castShadowsRaw,
    itemPropertyLightRelatedProgFxFadeCastShadows: castShadows,
    itemPropertyLightRelatedProgFxAnimation: relatedProgFxAnimation,
    itemPropertyLightRelatedProgFxSymbolicColor: color.progFxSymbolicColor,
    itemPropertyLightRelatedProgFxRadiusMeters: brightness.radiusMeters,
    itemPropertyLightRelatedProgFxTokenRadiusMeters: brightness.radiusMeters,
    itemPropertyLightSourceMdlNodeName: "AuroraLight01",
    itemPropertyLightSourceMdlAnimation: relatedProgFxAnimation,
    itemPropertyLightSourceMdlColor: sourceMdl.sourceRgb,
    itemPropertyLightSourceMdlColorSource: ITEM_PROPERTY_LIGHT_SOURCE_MDL_COLOR_SOURCE,
    itemPropertyLightSourceMdlColorProofStatus: ITEM_PROPERTY_LIGHT_COLOR_PROOF_STATUS,
    itemPropertyLightSourceMdlRadiusMeters: sourceMdl.sourceRadiusMeters,
    itemPropertyLightSourceMdlRadiusUnits: "meters",
    itemPropertyLightSourceMdlRadiusFrames: sourceMdl.radiusFrames,
    itemPropertyLightSourceMdlRadiusSource: ITEM_PROPERTY_LIGHT_SOURCE_MDL_RADIUS_SOURCE,
    itemPropertyLightSourceMdlRadiusProofStatus:
      "source-family-backed-fx_light_clr-mdl-animation-radius",
    itemPropertyLightMetersToWorldScale: metersToWorldScale,
    itemPropertyLightMetersToWorldScaleSource:
      "workspace soundUnitsPerTile meter-to-world scale",
    itemPropertyLightSourceMdlRadiusWorldDistance:
      sourceMdl.sourceRadiusMeters * metersToWorldScale,
    itemPropertyLightSourceMdlRadiusWorldDistanceSource:
      "fx_light_clr.mdl source radius 13.3 multiplied by workspace meter-to-world scale",
    itemPropertyLightPointLightColor: sourceMdl.pointLightRgb,
    itemPropertyLightPointLightIntensity: sourceMdl.intensity,
    itemPropertyLightPointLightDistance: distance,
    itemPropertyLightPointLightDistanceSource:
      `${ITEM_PROPERTY_LIGHT_SOURCE_MDL_RADIUS_SOURCE}; workspace units scaled by soundUnitsPerTile`,
    itemPropertyLightPointLightDecay: ITEM_PROPERTY_LIGHT_POINT_LIGHT_DECAY,
    itemPropertyLightPointLightDecaySource: ITEM_PROPERTY_LIGHT_POINT_LIGHT_DECAY_SOURCE,
    itemPropertyLightFalloffFormula: ITEM_PROPERTY_LIGHT_FALLOFF_FORMULA,
    itemPropertyLightFalloffProofStatus: ITEM_PROPERTY_LIGHT_FALLOFF_PROOF_STATUS,
    itemPropertyLightRuntimeSchedulerProofSource:
      `${ITEM_PROPERTY_LIGHT_RUNTIME_SCHEDULER_PROOF_SOURCE}; ${LOOPING_VISUAL_EFFECT_MESSAGE_UPDATE_PROOF_SOURCE}; ${LOOPING_VISUAL_EFFECT_NETWORK_UPDATE_PROOF_SOURCE}; ${LOOPING_VISUAL_EFFECT_CLIENT_RECEIVE_RENDER_PROOF_SOURCE}`,
    itemPropertyLightRuntimeSchedulerBlocker:
      ITEM_PROPERTY_LIGHT_RUNTIME_SCHEDULER_BLOCKER,
    itemPropertyLightNoSelfGlowSource: ITEM_PROPERTY_LIGHT_NO_SELF_GLOW_SOURCE,
    itemPropertyLightNoSelfGlowProofStatus: "source-backed-no-item-mesh-glow",
    itemPropertyLightShadowStatus: castShadows
      ? "enabled-by-progfx-param3"
      : "disabled-by-progfx-param3",
    itemPropertyLightShadowPolicySource: ITEM_PROPERTY_LIGHT_SHADOW_POLICY_SOURCE,
    itemPropertyLightShadowProofStatus: ITEM_PROPERTY_LIGHT_SHADOW_PROOF_STATUS
  };
}

function buildItemPropertyLightBudgetUserData(
  options: ItemPropertyLightPreviewGroupOptions
): Record<string, unknown> {
  const budget = options.lightBudget ?? {
    activeSlotCap: AURORA_LIGHT_PREVIEW_ACTIVE_SLOT_CAP
  };
  const rank = Math.max(1, Math.trunc(options.lightBudgetRank ?? 1));
  const candidateCount = Math.max(
    rank,
    Math.trunc(options.lightBudgetCandidateCount ?? rank)
  );
  const accepted = rank <= budget.activeSlotCap;
  return {
    itemPropertyLightBudgetRank: rank,
    itemPropertyLightBudgetCandidateCount: candidateCount,
    itemPropertyLightBudgetAccepted: accepted,
    itemPropertyLightBudgetCap: budget.activeSlotCap,
    itemPropertyLightBudgetHardCap: AURORA_LIGHT_PREVIEW_ACTIVE_SLOT_CAP,
    itemPropertyLightConfiguredMaxLights: budget.configuredMaxLights,
    itemPropertyLightBudgetCapSource: AURORA_LIGHT_PREVIEW_BUDGET_CAP_SOURCE,
    itemPropertyLightBudgetCapProofStatus: ITEM_PROPERTY_LIGHT_BUDGET_CAP_PROOF_STATUS,
    ...(accepted
      ? {}
      : {
          itemPropertyLightPreviewStatus: "dropped-by-light-budget",
          itemPropertyLightDroppedReason: "active-light-slot-cap"
        })
  };
}

function createItemPropertyLightPreviewGroupFromPreview(
  preview: ItemPropertyLightPreview,
  objectRadius: number,
  metersToWorldScale: number,
  options: ItemPropertyLightPreviewGroupOptions = {}
): THREE.Group {
  const sourceMdl = resolveItemPropertyLightSourceMdlPreview(preview);
  const distance = Math.max(
    sourceMdl.sourceRadiusMeters * metersToWorldScale,
    objectRadius * 2.5
  );
  const color = new THREE.Color(
    clampNumber(sourceMdl.pointLightRgb[0], 0, 1),
    clampNumber(sourceMdl.pointLightRgb[1], 0, 1),
    clampNumber(sourceMdl.pointLightRgb[2], 0, 1)
  );
  const userData = buildItemPropertyLightUserData(
    preview,
    distance,
    sourceMdl,
    metersToWorldScale
  );
  const falloffShaderPatch = installAuroraLinearLightFalloffShaderChunk();
  const falloffRendererUserData = {
    itemPropertyLightFalloffRendererPatchStatus: falloffShaderPatch.status,
    itemPropertyLightFalloffRendererProofStatus: falloffShaderPatch.proofStatus,
    itemPropertyLightFalloffRendererSource: falloffShaderPatch.source
  };
  const budgetUserData = buildItemPropertyLightBudgetUserData(options);
  const budgetAccepted = budgetUserData.itemPropertyLightBudgetAccepted !== false;
  const extraUserData = options.extraUserData ?? {};
  const group = new THREE.Group();
  group.name = options.groupName ?? ITEM_PROPERTY_LIGHT_SOURCE_NAME;
  group.position.set(0, options.localYOffset ?? objectRadius * 0.88, 0);
  group.userData = {
    ...userData,
    ...falloffRendererUserData,
    ...budgetUserData,
    ...extraUserData,
    itemPropertyLightPreviewRole: options.sourceRole ?? "item-property-light-source"
  };
  if (!budgetAccepted) {
    return group;
  }

  const light = new THREE.PointLight(
    color,
    sourceMdl.intensity,
    distance,
    ITEM_PROPERTY_LIGHT_POINT_LIGHT_DECAY
  );
  light.name = "item_property_light_point";
  light.castShadow = resolveItemPropertyLightCastShadows(preview);
  light.userData = {
    ...userData,
    ...falloffRendererUserData,
    ...budgetUserData,
    ...extraUserData,
    itemPropertyLightPreviewRole: ITEM_PROPERTY_LIGHT_POINT_LIGHT_ROLE
  };
  group.add(light);

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(Math.max(0.026, objectRadius * 0.14), 16, 12),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.96,
      depthWrite: false
    })
  );
  core.name = "item_property_light_core";
  core.renderOrder = 12;
  core.raycast = () => undefined;
  core.userData = {
    ...userData,
    ...falloffRendererUserData,
    ...budgetUserData,
    ...extraUserData,
    itemPropertyLightPreviewRole: ITEM_PROPERTY_LIGHT_CORE_ROLE
  };
  group.add(core);

  const haloRadius = Math.max(objectRadius * 0.6, Math.min(distance * 0.22, objectRadius * 3.5));
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(haloRadius, 24, 16),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      depthTest: true
    })
  );
  halo.name = "item_property_light_halo";
  halo.renderOrder = 8;
  halo.raycast = () => undefined;
  halo.userData = {
    ...userData,
    ...budgetUserData,
    ...extraUserData,
    itemPropertyLightPreviewRole: ITEM_PROPERTY_LIGHT_HALO_ROLE,
    itemPropertyLightHaloRadius: haloRadius
  };
  group.add(halo);

  const ringRadius = Math.max(objectRadius * 0.85, Math.min(distance, objectRadius * 7));
  const range = new THREE.Mesh(
    new THREE.TorusGeometry(ringRadius, Math.max(0.004, objectRadius * 0.018), 8, 72),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.24,
      depthWrite: false
    })
  );
  range.name = "item_property_light_range";
  range.rotation.x = Math.PI / 2;
  range.position.y = -objectRadius * 0.86;
  range.renderOrder = 7;
  range.raycast = () => undefined;
  range.userData = {
    ...userData,
    ...budgetUserData,
    ...extraUserData,
    itemPropertyLightPreviewRole: ITEM_PROPERTY_LIGHT_RANGE_ROLE,
    itemPropertyLightRangeRadius: ringRadius,
    itemPropertyLightRangeSource: "diagnostic-preview-ring-not-aurora-rendered-geometry"
  };
  group.add(range);

  return group;
}

function createItemPropertyLightPreviewGroup(
  object: SceneObject,
  objectRadius: number,
  metersToWorldScale: number,
  lightBudget: AuroraRuntimeLightBudgetSelection
): THREE.Group | null {
  const preview = resolveItemPropertyLightPreview(object);
  return preview
    ? createItemPropertyLightPreviewGroupFromPreview(preview, objectRadius, metersToWorldScale, {
        lightBudget,
        lightBudgetRank: 1,
        lightBudgetCandidateCount: 1
      })
    : null;
}

function mapCreatureAuroraVectorToThree(value: [number, number, number]): THREE.Vector3 {
  return new THREE.Vector3(value[0], value[2], value[1]);
}

function toCreatureAuroraLightColor(
  value: [number, number, number] | undefined
): THREE.Color {
  const color = value ?? [1, 1, 1];
  return new THREE.Color(
    clampNumber(color[0], 0, 1),
    clampNumber(color[1], 0, 1),
    clampNumber(color[2], 0, 1)
  );
}

function toCreatureAuroraEmitterColor(emitter: CreatureAuroraEmitterNode): THREE.Color {
  const color =
    emitter.simulation?.colorStart ??
    emitter.simulation?.colorMid ??
    emitter.simulation?.colorEnd ??
    [1, 0.62, 0.18];
  return new THREE.Color(
    clampNumber(color[0], 0, 1),
    clampNumber(color[1], 0, 1),
    clampNumber(color[2], 0, 1)
  );
}

function normalizeCreatureAuroraAnimationToken(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().toLowerCase().replace(/[\s_-]+/gu, "");
}

function findCreatureAuroraLightAnimationByName(
  animations: readonly CreatureAuroraLightAnimation[],
  animationName: string | null | undefined
): CreatureAuroraLightAnimation | null {
  const normalized = normalizeCreatureAuroraAnimationToken(animationName);
  if (!normalized) {
    return null;
  }
  const alias =
    normalized === "activate" || normalized === "activated"
      ? "on"
      : normalized === "deactivate" || normalized === "deactivated"
        ? "off"
        : normalized;
  return (
    animations.find(
      (animation) => normalizeCreatureAuroraAnimationToken(animation.animationName) === alias
    ) ??
    animations.find(
      (animation) => normalizeCreatureAuroraAnimationToken(animation.animationName) === normalized
    ) ??
    null
  );
}

function hasCreatureAuroraLightAnimationTracks(
  animation: CreatureAuroraLightAnimation | null | undefined
): boolean {
  return Boolean(
    animation &&
      ((animation.colorTimeline?.length ?? 0) > 0 ||
        (animation.radiusTimeline?.length ?? 0) > 0 ||
        (animation.positionTimeline?.length ?? 0) > 0 ||
        (animation.multiplierTimeline?.length ?? 0) > 0)
  );
}

function resolveCreatureAuroraLightAnimationSelection(
  light: CreatureAuroraLightNode
): CreatureAuroraLightAnimation | null {
  const animations = Array.isArray(light.animations) ? light.animations : [];
  if (animations.length === 0) {
    return null;
  }
  return (
    findCreatureAuroraLightAnimationByName(animations, "default") ??
    findCreatureAuroraLightAnimationByName(animations, "on") ??
    animations.find(
      (animation) => normalizeCreatureAuroraAnimationToken(animation.animationName) !== "off"
    ) ??
    animations[0] ??
    null
  );
}

function positiveModulo(value: number, divisor: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(divisor) || divisor === 0) {
    return 0;
  }
  return ((value % divisor) + divisor) % divisor;
}

function lerpNumber(start: number, end: number, amount: number): number {
  return start + (end - start) * amount;
}

function lerpCreatureAuroraColorVector(
  start: [number, number, number],
  end: [number, number, number],
  amount: number
): [number, number, number] {
  return [
    lerpNumber(start[0], end[0], amount),
    lerpNumber(start[1], end[1], amount),
    lerpNumber(start[2], end[2], amount)
  ];
}

function sampleCreatureAuroraLightNumberKeyframesAtElapsed(
  frames: Array<{ time: number; value: number }> | undefined,
  elapsedSeconds: number | undefined,
  loop = true
): number | undefined {
  if (!frames || frames.length === 0) {
    return undefined;
  }
  const sortedFrames = frames
    .filter((frame) => Number.isFinite(frame.time) && Number.isFinite(frame.value))
    .sort((left, right) => left.time - right.time);
  if (sortedFrames.length === 0) {
    return undefined;
  }
  if (sortedFrames.length === 1) {
    return sortedFrames[0]?.value;
  }
  const firstFrame = sortedFrames[0];
  const lastFrame = sortedFrames[sortedFrames.length - 1];
  if (!firstFrame || !lastFrame) {
    return undefined;
  }
  const duration = lastFrame.time - firstFrame.time;
  let sampleTime =
    typeof elapsedSeconds === "number" && Number.isFinite(elapsedSeconds)
      ? elapsedSeconds
      : firstFrame.time;
  if (duration > 1e-6) {
    sampleTime = loop
      ? firstFrame.time + positiveModulo(sampleTime - firstFrame.time, duration)
      : clampNumber(sampleTime, firstFrame.time, lastFrame.time);
  }
  if (sampleTime <= firstFrame.time || duration <= 1e-6) {
    return firstFrame.value;
  }
  if (sampleTime >= lastFrame.time) {
    return lastFrame.value;
  }
  for (let index = 1; index < sortedFrames.length; index += 1) {
    const current = sortedFrames[index];
    const previous = sortedFrames[index - 1];
    if (!current || !previous || sampleTime > current.time) {
      continue;
    }
    const segmentDuration = current.time - previous.time;
    if (segmentDuration <= 1e-6) {
      return current.value;
    }
    return lerpNumber(
      previous.value,
      current.value,
      clampNumber((sampleTime - previous.time) / segmentDuration, 0, 1)
    );
  }
  return lastFrame.value;
}

function sampleCreatureAuroraLightColorKeyframesAtElapsed(
  frames: Array<{ time: number; value: [number, number, number] }> | undefined,
  elapsedSeconds: number | undefined,
  loop = true
): [number, number, number] | undefined {
  if (!frames || frames.length === 0) {
    return undefined;
  }
  const sortedFrames = frames
    .filter(
      (frame) =>
        Number.isFinite(frame.time) && frame.value.every((channel) => Number.isFinite(channel))
    )
    .sort((left, right) => left.time - right.time);
  if (sortedFrames.length === 0) {
    return undefined;
  }
  if (sortedFrames.length === 1) {
    return sortedFrames[0]?.value;
  }
  const firstFrame = sortedFrames[0];
  const lastFrame = sortedFrames[sortedFrames.length - 1];
  if (!firstFrame || !lastFrame) {
    return undefined;
  }
  const duration = lastFrame.time - firstFrame.time;
  let sampleTime =
    typeof elapsedSeconds === "number" && Number.isFinite(elapsedSeconds)
      ? elapsedSeconds
      : firstFrame.time;
  if (duration > 1e-6) {
    sampleTime = loop
      ? firstFrame.time + positiveModulo(sampleTime - firstFrame.time, duration)
      : clampNumber(sampleTime, firstFrame.time, lastFrame.time);
  }
  if (sampleTime <= firstFrame.time || duration <= 1e-6) {
    return firstFrame.value;
  }
  if (sampleTime >= lastFrame.time) {
    return lastFrame.value;
  }
  for (let index = 1; index < sortedFrames.length; index += 1) {
    const current = sortedFrames[index];
    const previous = sortedFrames[index - 1];
    if (!current || !previous || sampleTime > current.time) {
      continue;
    }
    const segmentDuration = current.time - previous.time;
    if (segmentDuration <= 1e-6) {
      return current.value;
    }
    return lerpCreatureAuroraColorVector(
      previous.value,
      current.value,
      clampNumber((sampleTime - previous.time) / segmentDuration, 0, 1)
    );
  }
  return lastFrame.value;
}

function resolveCreatureAuroraLightAnimatedPosition(
  light: CreatureAuroraLightNode,
  animation: CreatureAuroraLightAnimation | null | undefined,
  elapsedSeconds: number | undefined
): THREE.Vector3 {
  const sourcePosition =
    sampleCreatureAuroraLightColorKeyframesAtElapsed(
      animation?.positionTimeline,
      elapsedSeconds,
      true
    ) ?? light.transform?.position ?? [0, 0, 0];
  return mapCreatureAuroraVectorToThree(sourcePosition);
}

function resolveCreatureAuroraLightAnimatedRadius(
  light: CreatureAuroraLightNode,
  animation: CreatureAuroraLightAnimation | null | undefined,
  elapsedSeconds: number | undefined,
  objectRadius: number
): number {
  const sourceRadius =
    sampleCreatureAuroraLightNumberKeyframesAtElapsed(
      animation?.radiusTimeline,
      elapsedSeconds,
      true
    ) ?? light.radius;
  if (typeof sourceRadius === "number" && Number.isFinite(sourceRadius) && sourceRadius > 0) {
    return sourceRadius;
  }
  return Math.max(objectRadius * 0.85, 0.85);
}

function resolveCreatureAuroraLightSourceRadius(
  light: CreatureAuroraLightNode,
  animation: CreatureAuroraLightAnimation | null | undefined,
  elapsedSeconds: number | undefined
): number | null {
  const sourceRadius =
    sampleCreatureAuroraLightNumberKeyframesAtElapsed(
      animation?.radiusTimeline,
      elapsedSeconds,
      true
    ) ?? light.radius;
  return typeof sourceRadius === "number" && Number.isFinite(sourceRadius) && sourceRadius > 0
    ? sourceRadius
    : null;
}

function resolveCreatureAuroraLightSourceRadiusWorldDistance(
  light: CreatureAuroraLightNode,
  animation: CreatureAuroraLightAnimation | null | undefined,
  elapsedSeconds: number | undefined
): number | null {
  const sourceRadius = resolveCreatureAuroraLightSourceRadius(
    light,
    animation,
    elapsedSeconds
  );
  return sourceRadius === null
    ? null
    : sourceRadius * CREATURE_AURORA_LIGHT_SOURCE_UNIT_SCALE;
}

function resolveCreatureAuroraLightShadowRadius(
  light: CreatureAuroraLightNode,
  animation: CreatureAuroraLightAnimation | null | undefined,
  elapsedSeconds: number | undefined
): number | null {
  const sourceShadowRadius =
    sampleCreatureAuroraLightNumberKeyframesAtElapsed(
      animation?.shadowRadiusTimeline,
      elapsedSeconds,
      true
    ) ?? light.shadowRadius;
  return typeof sourceShadowRadius === "number" &&
    Number.isFinite(sourceShadowRadius) &&
    sourceShadowRadius > 0
    ? sourceShadowRadius * CREATURE_AURORA_LIGHT_SOURCE_UNIT_SCALE
    : null;
}

function resolveCreatureAuroraLightActiveSelectionRadius(
  light: CreatureAuroraLightNode,
  animation: CreatureAuroraLightAnimation | null | undefined,
  elapsedSeconds: number | undefined
): number | null {
  return (
    resolveCreatureAuroraLightShadowRadius(light, animation, elapsedSeconds) ??
    resolveCreatureAuroraLightSourceRadiusWorldDistance(light, animation, elapsedSeconds)
  );
}

function resolveCreatureAuroraLightAnimatedMultiplier(
  light: CreatureAuroraLightNode,
  animation: CreatureAuroraLightAnimation | null | undefined,
  elapsedSeconds: number | undefined
): number {
  const sourceMultiplier =
    sampleCreatureAuroraLightNumberKeyframesAtElapsed(
      animation?.multiplierTimeline,
      elapsedSeconds,
      true
    ) ?? light.multiplier ?? 1;
  return Number.isFinite(sourceMultiplier) ? Math.max(0, sourceMultiplier) : 1;
}

function resolveCreatureAuroraLightQuadraticAttenuation(radius: number): number {
  const clampedRadius = Number.isFinite(radius) ? Math.max(radius, 0.1) : 0.1;
  return 9 / (clampedRadius * clampedRadius * 2);
}

function resolveCreatureAuroraEmitterPosition(
  emitter: CreatureAuroraEmitterNode
): THREE.Vector3 {
  const sourcePosition = emitter.transform?.position ?? [0, 0, 0];
  return mapCreatureAuroraVectorToThree(sourcePosition);
}

function resolveCreatureAuroraEmitterSurfaceAxis(
  sourceCentimeters: number | undefined,
  fallback: number
): number {
  if (typeof sourceCentimeters === "number" && Number.isFinite(sourceCentimeters)) {
    return Math.max(0.06, Math.abs(sourceCentimeters) / 100);
  }
  return Math.max(0.06, fallback);
}

function hasNonCanonicalCreatureAuroraEmitterPreview(
  payload: CreatureViewportRenderPayload | null | undefined
): boolean {
  return (
    payload?.renderPackage?.diagnostics?.some(
      (diagnostic) =>
        diagnostic.code === "CREATURE_AURORA_MDL_EMITTER_PREVIEW_NON_CANONICAL"
    ) ?? false
  );
}

function createCreatureAuroraEmitterPreviewGroup(
  payload: CreatureViewportRenderPayload | null | undefined,
  objectRadius: number,
  showDiagnosticGizmos: boolean
): THREE.Group | null {
  const emitters = payload?.renderPackage?.auroraEmitter?.emitters ?? [];
  if (emitters.length === 0) {
    return null;
  }
  if (
    hasNonCanonicalCreatureAuroraEmitterPreview(payload) &&
    !showDiagnosticGizmos
  ) {
    return null;
  }

  const group = new THREE.Group();
  emitters.forEach((emitter, index) => {
    const color = toCreatureAuroraEmitterColor(emitter);
    const emitterNode = new THREE.Group();
    emitterNode.name = `creature_aurora_emitter_${emitter.nodeName}`;
    emitterNode.position.copy(resolveCreatureAuroraEmitterPosition(emitter));

    const core = new THREE.Mesh(
      new THREE.SphereGeometry(1, 12, 8),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: showDiagnosticGizmos ? 0.86 : 0.68,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    core.scale.setScalar(Math.max(objectRadius * 0.11, 0.045));
    core.renderOrder = 18 + index;
    core.userData = {
      creatureAuroraEmitterPreviewRole: "source-mdl-emitter-core",
      creatureAuroraEmitterNodeName: emitter.nodeName
    };
    emitterNode.add(core);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(
        Math.max(objectRadius * 0.2, 0.08),
        Math.max(objectRadius * 0.018, 0.006),
        8,
        30
      ),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: showDiagnosticGizmos ? 0.72 : 0.52,
        depthWrite: false
      })
    );
    ring.rotation.x = Math.PI / 2;
    ring.renderOrder = 16 + index;
    ring.userData = {
      creatureAuroraEmitterPreviewRole: "source-mdl-emitter-ring",
      creatureAuroraEmitterNodeName: emitter.nodeName
    };
    emitterNode.add(ring);

    const surfaceWidth = resolveCreatureAuroraEmitterSurfaceAxis(
      emitter.simulation?.xSize,
      objectRadius * 0.55
    );
    const surfaceDepth = resolveCreatureAuroraEmitterSurfaceAxis(
      emitter.simulation?.ySize,
      objectRadius * 0.55
    );
    const surface = new THREE.Mesh(
      new THREE.PlaneGeometry(surfaceWidth, surfaceDepth),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: showDiagnosticGizmos ? 0.28 : 0.16,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    surface.rotation.x = -Math.PI / 2;
    surface.renderOrder = 12 + index;
    surface.userData = {
      creatureAuroraEmitterPreviewRole: "source-mdl-emitter-spawn-area",
      creatureAuroraEmitterNodeName: emitter.nodeName,
      creatureAuroraEmitterSurfaceWidth: surfaceWidth,
      creatureAuroraEmitterSurfaceDepth: surfaceDepth
    };
    emitterNode.add(surface);

    emitterNode.userData = {
      creatureAuroraEmitterPreviewRole: "source-mdl-emitter-node",
      creatureAuroraEmitterNodeName: emitter.nodeName,
      creatureAuroraEmitterSourceModelFileName: emitter.sourceModelFileName,
      creatureAuroraEmitterTexture: emitter.texture,
      creatureAuroraEmitterChunkName: emitter.chunkName,
      creatureAuroraEmitterRenderMode: emitter.renderMode,
      creatureAuroraEmitterBlendMode: emitter.blendMode,
      creatureAuroraEmitterType: emitter.emitterType,
      creatureAuroraEmitterAtlas: emitter.atlas,
      creatureAuroraEmitterBirthrate: emitter.simulation?.birthrate,
      creatureAuroraEmitterLifeExp: emitter.simulation?.lifeExp,
      creatureAuroraEmitterXSize: emitter.simulation?.xSize,
      creatureAuroraEmitterYSize: emitter.simulation?.ySize,
      creatureAuroraEmitterSurfaceWidth: surfaceWidth,
      creatureAuroraEmitterSurfaceDepth: surfaceDepth,
      creatureAuroraEmitterPreviewMode: "source-mdl-emitter-node-preview"
    };
    group.add(emitterNode);
  });

  group.userData = {
    creatureAuroraEmitterPreviewStatus: "active",
    creatureAuroraEmitterPreviewMode: "source-mdl-emitter-node-preview",
    creatureAuroraEmitterCount: emitters.length,
    creatureAuroraEmitterNodeNames: emitters.map((emitter) => emitter.nodeName),
    creatureAuroraEmitterSourceModelFiles: emitters.map(
      (emitter) => emitter.sourceModelFileName
    ),
    creatureAuroraEmitterTextures: emitters.map((emitter) => emitter.texture ?? ""),
    creatureAuroraEmitterChunkNames: emitters.map((emitter) => emitter.chunkName ?? ""),
    creatureAuroraEmitterDiagnosticGizmosVisible: showDiagnosticGizmos
  };
  return group;
}

function buildPlaceableVfxPayloadFromCreatureEmitterPayload(
  payload: CreatureViewportRenderPayload | null | undefined
): PlaceableViewportRenderPayload | null {
  const renderPackage = payload?.renderPackage;
  if (!payload || !renderPackage?.auroraEmitter?.emitters.length) {
    return null;
  }

  return {
    templateId: payload.templateId,
    cacheKey: payload.cacheKey,
    cacheHit: payload.cacheHit,
    storedAt: payload.storedAt,
    hits: payload.hits,
    placeable: {
      templateId: payload.templateId,
      resref: payload.creature.resref,
      name: payload.creature.name,
      category: payload.creature.category,
      placeableSubtype: "vfx",
      render: {
        backendType: "vfx",
        frontendType: "vfx",
        rendererPreset: "creature-source-mdl-emitter-preview",
        isDoor: false,
        isVfx: true
      },
      renderPackage: {
        status: renderPackage.status === "ready" ? "ready" : "missing_assets",
        diagnostics: renderPackage.diagnostics,
        assetRefs: renderPackage.assetRefs ?? {},
        modelUrl: renderPackage.modelUrl,
        glbUrl: renderPackage.glbUrl,
        textureUrls: renderPackage.textureUrls,
        textureBindings: renderPackage.textureBindings,
        auroraEmitter: renderPackage.auroraEmitter
      },
      assetManifest: {
        version: "placeable-asset-manifest/v1",
        source: "module-blob-snapshot",
        generatedAt: payload.storedAt,
        assetCount: 0,
        candidatesScanned: 0,
        assets: []
      },
      metadata: {
        creatureTemplateId: payload.templateId,
        creatureResRef: payload.creature.resref
      }
    },
    renderPackage: {
      status: renderPackage.status === "ready" ? "ready" : "missing_assets",
      diagnostics: renderPackage.diagnostics,
      assetRefs: renderPackage.assetRefs ?? {},
      modelUrl: renderPackage.modelUrl,
      glbUrl: renderPackage.glbUrl,
      textureUrls: renderPackage.textureUrls,
      textureBindings: renderPackage.textureBindings,
      auroraEmitter: renderPackage.auroraEmitter
    },
    assetContracts: {
      cacheKey: payload.cacheKey,
      assets: []
    }
  };
}

function createCreatureAuroraEmitterParticlePreviewGroup(
  runtime: RuntimeState,
  payload: CreatureViewportRenderPayload | null | undefined,
  objectRadius: number,
  colorHex: string,
  textureUrlsByReference: Map<string, string>,
  showDiagnosticGizmos: boolean
): THREE.Group | null {
  const isNonCanonicalPreview = hasNonCanonicalCreatureAuroraEmitterPreview(payload);
  const placeableVfxPayload = buildPlaceableVfxPayloadFromCreatureEmitterPayload(payload);
  if (!placeableVfxPayload) {
    return null;
  }

  const emitterTextureReferences = resolveCreatureAuroraEmitterTextureReferences(payload);
  const emitterTextureUrlsByReference = resolveCreatureAuroraEmitterTextureDeliveryUrlsByReference(
    textureUrlsByReference,
    emitterTextureReferences
  );
  const particleTexturesByReference = collectCachedPlaceableTexturesByReference(
    runtime,
    emitterTextureUrlsByReference
  );
  const particleTextureStatus =
    emitterTextureUrlsByReference.size === 0
      ? "not-applicable"
      : particleTexturesByReference.size >= emitterTextureUrlsByReference.size
        ? "applied"
        : "loading";
  const primaryTextureUrl =
    emitterTextureUrlsByReference.size === 1
      ? Array.from(emitterTextureUrlsByReference.values())[0]
      : null;
  const auroraLightRuntimeBudget = resolveAuroraRuntimeLightBudgetSelection(runtime);
  const particleGroup = createPlaceableVfxPreviewGroup(
    placeableVfxPayload,
    objectRadius,
    colorHex,
    {
      particleTexture: primaryTextureUrl
        ? runtime.placeableTextureCacheByUrl.get(primaryTextureUrl) ?? null
        : null,
      textureDeliveryUrl: primaryTextureUrl,
      particleTexturesByReference,
      textureDeliveryUrlsByReference: emitterTextureUrlsByReference,
      lightPreviewActiveSlotCap: auroraLightRuntimeBudget.activeSlotCap,
      lightPreviewConfiguredMaxLights: auroraLightRuntimeBudget.configuredMaxLights,
      emitterPreviewBudget: {
        minEmitterCount: 8,
        maxEmitterCount: 8,
        maxEmittersPerSignature: 4,
        maxParticlesPerEmitter: 3,
        opacityScale: 1,
        opacityFloor: 0.32,
        sizeScale: 0.72
      }
    }
  );
  particleGroup.name = "creature_aurora_emitter_particle_preview";
  particleGroup.userData = {
    ...particleGroup.userData,
    creatureAuroraEmitterParticlePreviewStatus: "active",
    creatureAuroraEmitterParticlePreviewMode: "placeable-vfx-emitter-runtime-adapter",
    creatureAuroraEmitterParticlePreviewSource: "source-mdl-creature-auroraEmitter",
    creatureAuroraEmitterParticlePreviewCanonicalStatus: isNonCanonicalPreview
      ? "non-canonical-best-effort"
      : "canonical-or-unspecified",
    creatureAuroraEmitterParticlePreviewDiagnosticGizmosVisible:
      showDiagnosticGizmos,
    creatureAuroraEmitterParticlePreviewRequestedTextureReferences:
      emitterTextureReferences,
    creatureAuroraEmitterParticlePreviewRequestedTextureReferenceCount:
      emitterTextureReferences.length,
    creatureAuroraEmitterParticlePreviewTextureReferenceCount:
      emitterTextureUrlsByReference.size,
    creatureAuroraEmitterParticlePreviewTextureLoadedCount:
      particleTexturesByReference.size,
    vfxTextureStatus: particleTextureStatus,
    creatureAuroraEmitterParticlePreviewTextureRefreshStatus:
      particleTextureStatus === "applied" ? "applied" : particleTextureStatus,
    creatureAuroraEmitterParticlePreviewTextureFallbackStatus:
      emitterTextureReferences.length > emitterTextureUrlsByReference.size
        ? "emitter-texture-missing-no-model-fallback"
        : "emitter-texture-only"
  };
  return particleGroup;
}

function resolveCreatureAuroraEmitterTextureReferences(
  payload: CreatureViewportRenderPayload | null | undefined
): string[] {
  const references = new Set<string>();
  const emitters = payload?.renderPackage?.auroraEmitter?.emitters ?? [];
  emitters.forEach((emitter) => {
    if (isPlaceableVfxNullTextureReference(emitter.texture)) {
      return;
    }
    const reference = normalizePlaceableTextureReference(emitter.texture ?? "");
    if (!reference) {
      return;
    }
    references.add(reference);
    const alphaReference = resolvePlaceableVfxAlphaCompanionTextureReference(reference);
    if (alphaReference) {
      references.add(alphaReference);
    }
  });
  return Array.from(references);
}

function resolveCreatureAuroraEmitterTextureDeliveryUrlsByReference(
  textureUrlsByReference: Map<string, string>,
  emitterTextureReferences: readonly string[]
): Map<string, string> {
  const emitterTextureUrlsByReference = new Map<string, string>();
  emitterTextureReferences.forEach((reference) => {
    const deliveryUrl = textureUrlsByReference.get(reference);
    if (deliveryUrl) {
      emitterTextureUrlsByReference.set(reference, deliveryUrl);
    }
  });
  return emitterTextureUrlsByReference;
}

function resolveCreatureAuroraEmitterTextureDeliveryUrlsForPayload(
  payload: CreatureViewportRenderPayload | null | undefined,
  textureUrlsByReference: Map<string, string>
): Map<string, string> {
  return resolveCreatureAuroraEmitterTextureDeliveryUrlsByReference(
    textureUrlsByReference,
    resolveCreatureAuroraEmitterTextureReferences(payload)
  );
}

function clearCreatureAuroraEmitterNonEmitterTextureMaps(root: THREE.Object3D): number {
  let clearedCount = 0;
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }
    const requestedReferences = resolveCreatureAuroraEmitterRequestedTextureReferencesForNode(node);
    if (!requestedReferences) {
      return;
    }
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material) => {
      const mappedMaterial = material as THREE.Material & {
        map?: THREE.Texture | null;
        alphaMap?: THREE.Texture | null;
      };
      const reference = mappedMaterial.map?.userData?.auroraTextureReference;
      if (typeof reference === "string" && !requestedReferences.has(reference)) {
        mappedMaterial.map = null;
        mappedMaterial.alphaMap = null;
        mappedMaterial.needsUpdate = true;
        clearedCount += 1;
      }
    });
  });
  if (clearedCount > 0) {
    root.userData = {
      ...root.userData,
      creatureAuroraEmitterParticlePreviewModelTextureLeakClearedCount: clearedCount
    };
  }
  return clearedCount;
}

function resolveCreatureAuroraEmitterRequestedTextureReferencesForNode(
  node: THREE.Object3D
): Set<string> | null {
  let current: THREE.Object3D | null = node;
  while (current) {
    if (current.name === "creature_aurora_emitter_particle_preview") {
      const references =
        current.userData?.creatureAuroraEmitterParticlePreviewRequestedTextureReferences;
      if (!Array.isArray(references)) {
        return new Set();
      }
      return new Set(
        references.filter(
          (reference): reference is string =>
            typeof reference === "string" && reference.trim().length > 0
        )
      );
    }
    current = current.parent;
  }
  return null;
}

function isCreatureAuroraEmitterAlphaCompanionReference(
  textureUrlsByReference: Map<string, string>,
  textureReference: string
): boolean {
  for (const baseReference of textureUrlsByReference.keys()) {
    if (
      baseReference !== textureReference &&
      resolvePlaceableVfxAlphaCompanionTextureReference(baseReference) ===
        textureReference
    ) {
      return true;
    }
  }
  return false;
}

function applyCreatureAuroraEmitterParticlePreviewTextures(options: {
  particleGroup: THREE.Group;
  textureUrlsByReference: Map<string, string>;
  texturesByReference: Map<string, THREE.Texture>;
}): void {
  const { particleGroup, textureUrlsByReference, texturesByReference } = options;
  textureUrlsByReference.forEach((textureDeliveryUrl, textureReference) => {
    if (
      isCreatureAuroraEmitterAlphaCompanionReference(
        textureUrlsByReference,
        textureReference
      )
    ) {
      return;
    }
    const particleTexture = texturesByReference.get(textureReference);
    if (!particleTexture) {
      return;
    }
    applyPlaceableVfxParticleTexture(
      particleGroup,
      particleTexture,
      textureDeliveryUrl,
      resolveVfxAlphaCompanionTexture(texturesByReference, textureReference)
    );
  });
}

function scheduleCreatureAuroraEmitterParticleTextureRefresh(options: {
  runtime: RuntimeState;
  objectId: string;
  root: THREE.Object3D;
  host: THREE.Object3D;
  particleGroup: THREE.Group | null;
  textureUrlsByReference: Map<string, string>;
  writeModelDebugStatus?: boolean;
}): void {
  const {
    runtime,
    objectId,
    root,
    host,
    particleGroup,
    textureUrlsByReference,
    writeModelDebugStatus = true
  } = options;
  if (!particleGroup || textureUrlsByReference.size === 0) {
    return;
  }

  const textureUrlsForLoading = Array.from(new Set(textureUrlsByReference.values()));
  const missingTextureUrls = textureUrlsForLoading.filter(
    (textureDeliveryUrl) => !runtime.placeableTextureCacheByUrl.has(textureDeliveryUrl)
  );
  if (missingTextureUrls.length === 0) {
    return;
  }

  let resolvedTextureRequests = 0;
  missingTextureUrls.forEach((textureDeliveryUrl) => {
    void ensurePlaceableTexture(runtime, textureDeliveryUrl).then((resolvedTexture) => {
      resolvedTextureRequests += 1;
      if (
        runtime.objectMeshById.get(objectId) !== root ||
        particleGroup.parent !== host
      ) {
        return;
      }

      const refreshedTexturesByReference = collectCachedPlaceableTexturesByReference(
        runtime,
        textureUrlsByReference
      );
      if (resolvedTexture) {
        applyCreatureAuroraEmitterParticlePreviewTextures({
          particleGroup,
          textureUrlsByReference,
          texturesByReference: refreshedTexturesByReference
        });
      }

      const textureStatus =
        refreshedTexturesByReference.size >= textureUrlsForLoading.length
          ? "applied"
          : resolvedTextureRequests >= missingTextureUrls.length
            ? "missing"
            : "loading";
      if (writeModelDebugStatus) {
        writePlaceableModelDebugStatus(
          runtime,
          textureStatus === "loading"
            ? "loading"
            : textureStatus === "missing"
              ? "missing"
              : "loaded",
          {
            objectId,
            url: textureDeliveryUrl,
            loadPhase: "creature-source-preview-texture",
            loadCompleted: resolvedTextureRequests,
            loadTotal: missingTextureUrls.length,
            textureStatus,
            textureCount: textureUrlsForLoading.length,
            textureLoaded: refreshedTexturesByReference.size,
            textureSource:
              typeof resolvedTexture?.userData?.auroraSourceFormat === "string"
                ? resolvedTexture.userData.auroraSourceFormat
                : "source-mdl-emitter-preview"
          }
        );
      }
      particleGroup.userData = {
        ...particleGroup.userData,
        vfxTextureStatus: textureStatus,
        creatureAuroraEmitterParticlePreviewTextureReferenceCount:
          textureUrlsByReference.size,
        creatureAuroraEmitterParticlePreviewTextureLoadedCount:
          refreshedTexturesByReference.size,
        creatureAuroraEmitterParticlePreviewTextureRefreshStatus:
          textureStatus === "applied" ? "applied" : textureStatus
      };
      host.userData = {
        ...host.userData,
        ...particleGroup.userData
      };
      root.userData = {
        ...root.userData,
        ...particleGroup.userData
      };
    });
  });
}

function createCreatureAuroraLightPreviewGroup(
  payload: CreatureViewportRenderPayload | null | undefined,
  objectRadius: number,
  showDiagnosticGizmos: boolean,
  runtimeLightBudget: AuroraRuntimeLightBudgetSelection = {
    activeSlotCap: AURORA_LIGHT_PREVIEW_ACTIVE_SLOT_CAP
  }
): THREE.Group | null {
  const lights = payload?.renderPackage?.auroraLight?.lights ?? [];
  if (lights.length === 0) {
    return null;
  }

  const budgetEntries = buildCreatureAuroraLightPreviewBudget(
    lights,
    runtimeLightBudget.activeSlotCap
  );
  const acceptedEntries = budgetEntries.filter((entry) => entry.accepted);
  const droppedEntries = budgetEntries.filter((entry) => !entry.accepted);
  const group = new THREE.Group();
  const falloffShaderPatch = installAuroraLinearLightFalloffShaderChunk();
  let animatedLightCount = 0;
  acceptedEntries.forEach((budgetEntry, index) => {
    const light = budgetEntry.light;
    const animation = resolveCreatureAuroraLightAnimationSelection(light);
    const hasAnimationTracks = hasCreatureAuroraLightAnimationTracks(animation);
    if (hasAnimationTracks) {
      animatedLightCount += 1;
    }
    const color = toCreatureAuroraLightColor(
      sampleCreatureAuroraLightColorKeyframesAtElapsed(animation?.colorTimeline, 0, true) ??
        light.color
    );
    const radius = resolveCreatureAuroraLightAnimatedRadius(light, animation, 0, objectRadius);
    const sourceRadius = resolveCreatureAuroraLightSourceRadius(light, animation, 0);
    const sourceRadiusWorldDistance =
      resolveCreatureAuroraLightSourceRadiusWorldDistance(light, animation, 0);
    const quadraticAtten = resolveCreatureAuroraLightQuadraticAttenuation(radius);
    const multiplier = resolveCreatureAuroraLightAnimatedMultiplier(light, animation, 0);
    const lightNode = new THREE.Group();
    lightNode.name = `creature_aurora_light_${light.nodeName}`;
    lightNode.position.copy(resolveCreatureAuroraLightAnimatedPosition(light, animation, 0));

    const ambientOnly = light.ambientOnly === true;
    const previewLight = new THREE.PointLight(
      color,
      multiplier,
      radius,
      resolveAuroraThreePointLightDecay(ambientOnly)
    );
    previewLight.userData = {
      creatureAuroraLightPreviewRole: ambientOnly
        ? "source-mdl-localized-ambient-point-light"
        : "source-mdl-point-light",
      creatureAuroraLightNodeName: light.nodeName,
      creatureAuroraLightSourceNodeKind: light.sourceNodeKind,
      ...buildAuroraLightManagerPreviewScoreUserData(
        "creatureAuroraLight",
        budgetEntry.retailScore
      ),
      creatureAuroraLightSourceRadius: sourceRadius,
      creatureAuroraLightSourceRadiusUnits: CREATURE_AURORA_LIGHT_SOURCE_RADIUS_UNITS,
      creatureAuroraLightSourceUnitScale: CREATURE_AURORA_LIGHT_SOURCE_UNIT_SCALE,
      creatureAuroraLightSourceUnitScaleSource:
        CREATURE_AURORA_LIGHT_SOURCE_UNIT_SCALE_SOURCE,
      creatureAuroraLightSourceRadiusWorldDistance: sourceRadiusWorldDistance,
      creatureAuroraLightSourceRadiusWorldDistanceSource:
        CREATURE_AURORA_LIGHT_SOURCE_RADIUS_WORLD_DISTANCE_SOURCE,
      creatureAuroraLightWorldRadius: radius,
      creatureAuroraLightRadiusProofStatus: CREATURE_AURORA_LIGHT_RADIUS_PROOF_STATUS,
      creatureAuroraLightQuadraticAtten: quadraticAtten,
      creatureAuroraLightQuadraticAttenSource: AURORA_LIGHT_QUADRATIC_ATTEN_SOURCE,
      creatureAuroraLightQuadraticAttenProofStatus: AURORA_LIGHT_QUADRATIC_ATTEN_PROOF_STATUS,
      creatureAuroraLightFalloffMode: "gamma0-quadratic-surface",
      creatureAuroraLightFalloffFormula: AURORA_LIGHT_LINEAR_FALLOFF_FORMULA,
      creatureAuroraLightFalloffSource: AURORA_LIGHT_LINEAR_FALLOFF_SOURCE,
      creatureAuroraLightFalloffProofStatus: AURORA_LIGHT_LINEAR_FALLOFF_PROOF_STATUS,
      creatureAuroraLightFalloffRendererPatchStatus: falloffShaderPatch.status,
      creatureAuroraLightFalloffRendererProofStatus: falloffShaderPatch.proofStatus,
      creatureAuroraLightFalloffRendererSource: falloffShaderPatch.source,
      creatureAuroraLightPointLightDecay: previewLight.decay,
      creatureAuroraLightPointLightDecaySource: AURORA_LIGHT_LINEAR_FALLOFF_SOURCE,
      creatureAuroraLightAmbientOnly: ambientOnly,
      creatureAuroraLightChannelMappingStatus: ambientOnly
        ? AURORA_THREE_LOCALIZED_AMBIENT_LIGHT_PROOF_STATUS
        : "source-backed-localized-diffuse-channel-point-light-adapter",
      creatureAuroraLightChannelMappingSource:
        AURORA_THREE_LOCALIZED_AMBIENT_LIGHT_SOURCE,
      creatureAuroraLightShaderChannelMarkerRole: ambientOnly
        ? "negative-decay-localized-ambient-marker"
        : "positive-decay-localized-diffuse"
    };
    lightNode.add(previewLight);

    if (showDiagnosticGizmos) {
      const coreMaterial = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.82,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const core = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 10), coreMaterial);
      core.scale.setScalar(Math.max(objectRadius * 0.13, 0.055));
      core.renderOrder = 18 + index;
      core.userData = {
        creatureAuroraLightPreviewRole: "source-mdl-light-core",
        creatureAuroraLightNodeName: light.nodeName,
        creatureAuroraLightSourceNodeKind: light.sourceNodeKind
      };
      lightNode.add(core);
    }

    if (showDiagnosticGizmos) {
      const radiusGizmo = new THREE.Mesh(
        new THREE.SphereGeometry(1, 20, 10),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.1,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          wireframe: true
        })
      );
      radiusGizmo.scale.setScalar(Math.max(objectRadius * 0.42, radius * 0.18));
      radiusGizmo.renderOrder = 14 + index;
      radiusGizmo.userData = {
          creatureAuroraLightPreviewRole: "source-mdl-light-radius-gizmo",
          creatureAuroraLightNodeName: light.nodeName,
          creatureAuroraLightSourceNodeKind: light.sourceNodeKind
        };
      lightNode.add(radiusGizmo);
    }

    lightNode.userData = {
      creatureAuroraLightPreviewRole: "source-mdl-light-node",
      creatureAuroraLightNodeName: light.nodeName,
      creatureAuroraLightSourceNodeKind: light.sourceNodeKind,
      creatureAuroraLightBudgetRank: budgetEntry.rank,
      creatureAuroraLightBudgetAccepted: true,
      creatureAuroraLightBudgetCap: runtimeLightBudget.activeSlotCap,
      creatureAuroraLightBudgetHardCap: AURORA_LIGHT_PREVIEW_ACTIVE_SLOT_CAP,
      creatureAuroraLightConfiguredMaxLights: runtimeLightBudget.configuredMaxLights,
      creatureAuroraLightBudgetCapSource: AURORA_LIGHT_PREVIEW_BUDGET_CAP_SOURCE,
      creatureAuroraLightBudgetCapProofStatus: AURORA_LIGHT_PREVIEW_BUDGET_CAP_PROOF_STATUS,
      ...buildAuroraLightManagerPreviewScoreUserData(
        "creatureAuroraLight",
        budgetEntry.retailScore
      ),
      creatureAuroraLightSourceModelFileName: light.sourceModelFileName,
      creatureAuroraLightRadius: light.radius,
      creatureAuroraLightSourceRadius: sourceRadius,
      creatureAuroraLightSourceRadiusUnits: CREATURE_AURORA_LIGHT_SOURCE_RADIUS_UNITS,
      creatureAuroraLightSourceUnitScale: CREATURE_AURORA_LIGHT_SOURCE_UNIT_SCALE,
      creatureAuroraLightSourceUnitScaleSource:
        CREATURE_AURORA_LIGHT_SOURCE_UNIT_SCALE_SOURCE,
      creatureAuroraLightSourceRadiusWorldDistance: sourceRadiusWorldDistance,
      creatureAuroraLightSourceRadiusWorldDistanceSource:
        CREATURE_AURORA_LIGHT_SOURCE_RADIUS_WORLD_DISTANCE_SOURCE,
      creatureAuroraLightWorldRadius: radius,
      creatureAuroraLightRadiusProofStatus: CREATURE_AURORA_LIGHT_RADIUS_PROOF_STATUS,
      creatureAuroraLightQuadraticAtten: quadraticAtten,
      creatureAuroraLightQuadraticAttenSource: AURORA_LIGHT_QUADRATIC_ATTEN_SOURCE,
      creatureAuroraLightQuadraticAttenProofStatus: AURORA_LIGHT_QUADRATIC_ATTEN_PROOF_STATUS,
      creatureAuroraLightFalloffMode: "gamma0-quadratic-surface",
      creatureAuroraLightFalloffFormula: AURORA_LIGHT_LINEAR_FALLOFF_FORMULA,
      creatureAuroraLightFalloffSource: AURORA_LIGHT_LINEAR_FALLOFF_SOURCE,
      creatureAuroraLightFalloffProofStatus: AURORA_LIGHT_LINEAR_FALLOFF_PROOF_STATUS,
      creatureAuroraLightFalloffRendererPatchStatus: falloffShaderPatch.status,
      creatureAuroraLightFalloffRendererProofStatus: falloffShaderPatch.proofStatus,
      creatureAuroraLightFalloffRendererSource: falloffShaderPatch.source,
      creatureAuroraLightPointLightDecay: previewLight.decay,
      creatureAuroraLightPointLightDecaySource: AURORA_LIGHT_LINEAR_FALLOFF_SOURCE,
      creatureAuroraLightMultiplier: light.multiplier,
      creatureAuroraLightAnimatedMultiplier: multiplier,
      creatureAuroraLightColor: light.color,
      creatureAuroraLightPreviewColor: [color.r, color.g, color.b],
      creatureAuroraLightAmbientOnly: ambientOnly,
      creatureAuroraLightChannelMappingStatus: ambientOnly
        ? AURORA_THREE_LOCALIZED_AMBIENT_LIGHT_PROOF_STATUS
        : "source-backed-localized-diffuse-channel-point-light-adapter",
      creatureAuroraLightChannelMappingSource:
        AURORA_THREE_LOCALIZED_AMBIENT_LIGHT_SOURCE,
      creatureAuroraLightShaderChannelMarkerRole: ambientOnly
        ? "negative-decay-localized-ambient-marker"
        : "positive-decay-localized-diffuse",
      creatureAuroraLightSourceDefinition: light,
      creatureAuroraLightAnimationDefinition: animation,
      creatureAuroraLightSelectedAnimationName: animation?.animationName,
      creatureAuroraLightSelectedAnimationLengthSeconds: animation?.lengthSeconds,
      creatureAuroraLightAnimationPlaybackStatus: hasAnimationTracks
        ? "available"
        : "not-applicable",
      creatureAuroraLightObjectRadius: objectRadius,
      creatureAuroraLightAnimationNames:
        light.animations?.map((animation) => animation.animationName) ?? [],
      creatureAuroraLightPreviewMode: "source-mdl-light-node-preview"
    };
    group.add(lightNode);
  });

  group.userData = {
    creatureAuroraLightPreviewStatus: "active",
    creatureAuroraLightPreviewMode: "source-mdl-light-node-preview",
    creatureAuroraLightCount: acceptedEntries.length,
    creatureAuroraLightSourceNodeCount: lights.length,
    creatureAuroraLightAcceptedNodeCount: acceptedEntries.length,
    creatureAuroraLightDroppedNodeCount: droppedEntries.length,
    creatureAuroraLightBudgetCap: runtimeLightBudget.activeSlotCap,
    creatureAuroraLightBudgetHardCap: AURORA_LIGHT_PREVIEW_ACTIVE_SLOT_CAP,
    creatureAuroraLightConfiguredMaxLights: runtimeLightBudget.configuredMaxLights,
    creatureAuroraLightBudgetCapSource: AURORA_LIGHT_PREVIEW_BUDGET_CAP_SOURCE,
    creatureAuroraLightBudgetCapProofStatus: AURORA_LIGHT_PREVIEW_BUDGET_CAP_PROOF_STATUS,
    creatureAuroraLightBudgetStrategy: AURORA_LIGHT_MANAGER_PREVIEW_BUDGET_STRATEGY,
    creatureAuroraLightBudgetStrategySource:
      AURORA_LIGHT_MANAGER_PREVIEW_BUDGET_STRATEGY_SOURCE,
    creatureAuroraLightBudgetStrategyProofStatus:
      AURORA_LIGHT_MANAGER_PREVIEW_BUDGET_STRATEGY_PROOF_STATUS,
    creatureAuroraLightFalloffRendererPatchStatus: falloffShaderPatch.status,
    creatureAuroraLightFalloffRendererProofStatus: falloffShaderPatch.proofStatus,
    creatureAuroraLightFalloffRendererSource: falloffShaderPatch.source,
    creatureAuroraLightDroppedNodes: droppedEntries
      .slice(0, AURORA_LIGHT_PREVIEW_DROPPED_SAMPLE_LIMIT)
      .map((entry) => entry.light.nodeName),
    creatureAuroraLightDroppedNodeSampleCount: Math.min(
      droppedEntries.length,
      AURORA_LIGHT_PREVIEW_DROPPED_SAMPLE_LIMIT
    ),
    creatureAuroraLightAnimatedCount: animatedLightCount,
    creatureAuroraLightNodeNames: acceptedEntries.map((entry) => entry.light.nodeName),
    creatureAuroraLightDiagnosticGizmosVisible: showDiagnosticGizmos
  };
  return group;
}

function buildCreatureAuroraLightPreviewBudget(
  lights: readonly CreatureAuroraLightNode[],
  activeSlotCap = AURORA_LIGHT_PREVIEW_ACTIVE_SLOT_CAP
): CreatureAuroraLightPreviewBudgetEntry[] {
  return selectAuroraLightManagerPreviewBudget(
    lights.map((light, sourceIndex) => {
      const animation = resolveCreatureAuroraLightAnimationSelection(light);
      return {
        key: light.nodeName || `creature-light-${sourceIndex}`,
        sourceIndex,
        payload: light,
        scoreInput: {
          position: resolveCreatureAuroraLightAnimatedPosition(light, animation, 0),
          sourceRadius: resolveCreatureAuroraLightSourceRadiusWorldDistance(
            light,
            animation,
            0
          ),
          activeSelectionRadiusOverride: resolveCreatureAuroraLightActiveSelectionRadius(
            light,
            animation,
            0
          ),
          multiplier: resolveCreatureAuroraLightAnimatedMultiplier(light, animation, 0),
          priority: resolveCreatureAuroraLightPriority(light),
          enforceActiveSelectionRadius: false
        }
      };
    }),
    activeSlotCap
  )
    .map((entry) => ({
      light: entry.payload,
      sourceIndex: entry.sourceIndex,
      retailScore: entry.retailScore,
      rank: entry.rank,
      accepted: entry.accepted
    }));
}

function resolveCreatureAuroraLightPriority(light: CreatureAuroraLightNode): number {
  return typeof light.lightPriority === "number" && Number.isFinite(light.lightPriority)
    ? light.lightPriority
    : 0;
}

function attachCreatureAuroraSourcePreviewGroups(options: {
  runtime: RuntimeState;
  objectId: string;
  root: THREE.Object3D;
  host: THREE.Object3D;
  payload: CreatureViewportRenderPayload | null | undefined;
  objectRadius: number;
  colorHex: string;
  textureUrlsByReference: Map<string, string>;
  showDiagnosticGizmos: boolean;
}): Record<string, unknown> {
  const {
    runtime,
    objectId,
    root,
    host,
    payload,
    objectRadius,
    colorHex,
    textureUrlsByReference,
    showDiagnosticGizmos
  } = options;
  const sourcePreviewUserData: Record<string, unknown> = {};
  const previewModes: string[] = [];
  const emitterTextureUrlsByReference =
    resolveCreatureAuroraEmitterTextureDeliveryUrlsForPayload(
      payload,
      textureUrlsByReference
    );

  const particlePreviewGroup = createCreatureAuroraEmitterParticlePreviewGroup(
    runtime,
    payload,
    objectRadius,
    colorHex,
    textureUrlsByReference,
    showDiagnosticGizmos
  );
  if (particlePreviewGroup) {
    host.add(particlePreviewGroup);
    Object.assign(sourcePreviewUserData, particlePreviewGroup.userData);
    previewModes.push("emitter-particles");
    scheduleCreatureAuroraEmitterParticleTextureRefresh({
      runtime,
      objectId,
      root,
      host,
      particleGroup: particlePreviewGroup,
      textureUrlsByReference: emitterTextureUrlsByReference
    });
  }

  const emitterPreviewGroup = createCreatureAuroraEmitterPreviewGroup(
    payload,
    objectRadius,
    showDiagnosticGizmos
  );
  if (emitterPreviewGroup) {
    host.add(emitterPreviewGroup);
    Object.assign(sourcePreviewUserData, emitterPreviewGroup.userData);
    previewModes.push("emitter-nodes");
  }

  const auroraLightRuntimeBudget = resolveAuroraRuntimeLightBudgetSelection(runtime);
  const lightPreviewGroup = createCreatureAuroraLightPreviewGroup(
    payload,
    objectRadius,
    showDiagnosticGizmos,
    auroraLightRuntimeBudget
  );
  if (lightPreviewGroup) {
    host.add(lightPreviewGroup);
    Object.assign(sourcePreviewUserData, lightPreviewGroup.userData);
    previewModes.push("light-nodes");
  }

  if (previewModes.length === 0) {
    return {};
  }

  const mergedUserData = {
    creatureAuroraSourcePreviewStatus: "active",
    creatureAuroraSourcePreviewModes: previewModes,
    ...sourcePreviewUserData
  };
  host.userData = {
    ...host.userData,
    ...mergedUserData
  };
  if (root !== host) {
    root.userData = {
      ...root.userData,
      ...mergedUserData
    };
  }
  return mergedUserData;
}

interface CreatureAuroraSourceLightRuntime {
  lightCount: number;
  animatedLightCount: number;
  nodeNames: string[];
  animationNames: string[];
  apply: (deltaSeconds?: number, elapsedSeconds?: number) => void;
}

interface CreatureAuroraSourceLightRuntimeEntry {
  node: THREE.Object3D;
  light: CreatureAuroraLightNode;
  animation: CreatureAuroraLightAnimation;
  objectRadius: number;
  pointLight: THREE.PointLight | null;
  radiusGizmo: THREE.Mesh | null;
  colorMaterials: Array<THREE.Material & { color: THREE.Color }>;
}

function collectCreatureAuroraLightColorMaterials(
  node: THREE.Object3D
): Array<THREE.Material & { color: THREE.Color }> {
  const materials: Array<THREE.Material & { color: THREE.Color }> = [];
  node.traverse((child) => {
    if (!(child instanceof THREE.Mesh) && !(child instanceof THREE.Sprite)) {
      return;
    }
    const childMaterials = Array.isArray(child.material) ? child.material : [child.material];
    childMaterials.forEach((material) => {
      if (materialSupportsColor(material)) {
        materials.push(material);
      }
    });
  });
  return materials;
}

function resolveCreatureAuroraSourceLightRuntimeEntry(
  node: THREE.Object3D
): CreatureAuroraSourceLightRuntimeEntry | null {
  if (node.userData?.creatureAuroraLightPreviewRole !== "source-mdl-light-node") {
    return null;
  }
  const light = node.userData.creatureAuroraLightSourceDefinition as
    | CreatureAuroraLightNode
    | undefined;
  const animation = node.userData.creatureAuroraLightAnimationDefinition as
    | CreatureAuroraLightAnimation
    | null
    | undefined;
  if (!light || !animation || !hasCreatureAuroraLightAnimationTracks(animation)) {
    return null;
  }

  let pointLight: THREE.PointLight | null = null;
  let radiusGizmo: THREE.Mesh | null = null;
  node.traverse((child) => {
    if (!pointLight && child instanceof THREE.PointLight) {
      pointLight = child;
    }
    if (
      !radiusGizmo &&
      child instanceof THREE.Mesh &&
      child.userData?.creatureAuroraLightPreviewRole === "source-mdl-light-radius-gizmo"
    ) {
      radiusGizmo = child;
    }
  });

  return {
    node,
    light,
    animation,
    objectRadius:
      typeof node.userData.creatureAuroraLightObjectRadius === "number" &&
      Number.isFinite(node.userData.creatureAuroraLightObjectRadius)
        ? node.userData.creatureAuroraLightObjectRadius
        : 1,
    pointLight,
    radiusGizmo,
    colorMaterials: collectCreatureAuroraLightColorMaterials(node)
  };
}

function createCreatureAuroraSourceLightRuntime(
  root: THREE.Object3D
): CreatureAuroraSourceLightRuntime | null {
  const entries: CreatureAuroraSourceLightRuntimeEntry[] = [];
  root.traverse((node) => {
    const entry = resolveCreatureAuroraSourceLightRuntimeEntry(node);
    if (entry) {
      entries.push(entry);
    }
  });
  if (entries.length === 0) {
    return null;
  }

  const falloffShaderPatch = installAuroraLinearLightFalloffShaderChunk();
  const apply = (_deltaSeconds?: number, elapsedSeconds?: number): void => {
    const elapsed =
      typeof elapsedSeconds === "number" && Number.isFinite(elapsedSeconds)
        ? elapsedSeconds
        : 0;
    entries.forEach((entry) => {
      const color = toCreatureAuroraLightColor(
        sampleCreatureAuroraLightColorKeyframesAtElapsed(
          entry.animation.colorTimeline,
          elapsed,
          true
        ) ?? entry.light.color
      );
      const radius = resolveCreatureAuroraLightAnimatedRadius(
        entry.light,
        entry.animation,
        elapsed,
        entry.objectRadius
      );
      const sourceRadius = resolveCreatureAuroraLightSourceRadius(
        entry.light,
        entry.animation,
        elapsed
      );
      const sourceRadiusWorldDistance =
        resolveCreatureAuroraLightSourceRadiusWorldDistance(
          entry.light,
          entry.animation,
          elapsed
        );
      const multiplier = resolveCreatureAuroraLightAnimatedMultiplier(
        entry.light,
        entry.animation,
        elapsed
      );
      entry.node.position.copy(
        resolveCreatureAuroraLightAnimatedPosition(entry.light, entry.animation, elapsed)
      );
      const retailScore = resolveAuroraLightManagerPreviewScore({
        position: entry.node.position,
        sourceRadius: sourceRadiusWorldDistance ?? sourceRadius,
        activeSelectionRadiusOverride: resolveCreatureAuroraLightActiveSelectionRadius(
          entry.light,
          entry.animation,
          elapsed
        ),
        multiplier,
        priority: resolveCreatureAuroraLightPriority(entry.light),
        enforceActiveSelectionRadius: false
      });
      if (entry.pointLight) {
        entry.pointLight.color.copy(color);
        entry.pointLight.distance = radius;
        entry.pointLight.decay = resolveAuroraThreePointLightDecay(
          entry.light.ambientOnly === true
        );
        entry.pointLight.intensity = multiplier;
        entry.pointLight.userData = {
          ...entry.pointLight.userData,
          creatureAuroraLightPreviewColor: [color.r, color.g, color.b],
          ...buildAuroraLightManagerPreviewScoreUserData(
            "creatureAuroraLight",
            retailScore
          ),
          creatureAuroraLightSourceRadius: sourceRadius,
          creatureAuroraLightSourceRadiusUnits: CREATURE_AURORA_LIGHT_SOURCE_RADIUS_UNITS,
          creatureAuroraLightSourceUnitScale: CREATURE_AURORA_LIGHT_SOURCE_UNIT_SCALE,
          creatureAuroraLightSourceUnitScaleSource:
            CREATURE_AURORA_LIGHT_SOURCE_UNIT_SCALE_SOURCE,
          creatureAuroraLightSourceRadiusWorldDistance: sourceRadiusWorldDistance,
          creatureAuroraLightSourceRadiusWorldDistanceSource:
            CREATURE_AURORA_LIGHT_SOURCE_RADIUS_WORLD_DISTANCE_SOURCE,
          creatureAuroraLightWorldRadius: radius,
          creatureAuroraLightRadiusProofStatus: CREATURE_AURORA_LIGHT_RADIUS_PROOF_STATUS,
          creatureAuroraLightQuadraticAtten:
            resolveCreatureAuroraLightQuadraticAttenuation(radius),
          creatureAuroraLightQuadraticAttenSource: AURORA_LIGHT_QUADRATIC_ATTEN_SOURCE,
          creatureAuroraLightQuadraticAttenProofStatus:
            AURORA_LIGHT_QUADRATIC_ATTEN_PROOF_STATUS,
          creatureAuroraLightFalloffMode: "gamma0-quadratic-surface",
          creatureAuroraLightFalloffFormula: AURORA_LIGHT_LINEAR_FALLOFF_FORMULA,
          creatureAuroraLightFalloffSource: AURORA_LIGHT_LINEAR_FALLOFF_SOURCE,
          creatureAuroraLightFalloffProofStatus: AURORA_LIGHT_LINEAR_FALLOFF_PROOF_STATUS,
          creatureAuroraLightFalloffRendererPatchStatus: falloffShaderPatch.status,
          creatureAuroraLightFalloffRendererProofStatus: falloffShaderPatch.proofStatus,
          creatureAuroraLightFalloffRendererSource: falloffShaderPatch.source,
          creatureAuroraLightPointLightDecay: entry.pointLight.decay,
          creatureAuroraLightPointLightDecaySource: AURORA_LIGHT_LINEAR_FALLOFF_SOURCE
        };
      }
      if (entry.radiusGizmo) {
        entry.radiusGizmo.scale.setScalar(
          Math.max(entry.objectRadius * 0.42, radius * 0.18)
        );
      }
      entry.colorMaterials.forEach((material) => {
        material.color.copy(color);
        material.needsUpdate = true;
      });
      entry.node.userData = {
        ...entry.node.userData,
        creatureAuroraLightPreviewColor: [color.r, color.g, color.b],
        ...buildAuroraLightManagerPreviewScoreUserData(
          "creatureAuroraLight",
          retailScore
        ),
        creatureAuroraLightSourceRadius: sourceRadius,
        creatureAuroraLightSourceRadiusUnits: CREATURE_AURORA_LIGHT_SOURCE_RADIUS_UNITS,
        creatureAuroraLightSourceUnitScale: CREATURE_AURORA_LIGHT_SOURCE_UNIT_SCALE,
        creatureAuroraLightSourceUnitScaleSource:
          CREATURE_AURORA_LIGHT_SOURCE_UNIT_SCALE_SOURCE,
        creatureAuroraLightSourceRadiusWorldDistance: sourceRadiusWorldDistance,
        creatureAuroraLightSourceRadiusWorldDistanceSource:
          CREATURE_AURORA_LIGHT_SOURCE_RADIUS_WORLD_DISTANCE_SOURCE,
        creatureAuroraLightWorldRadius: radius,
        creatureAuroraLightRadiusProofStatus: CREATURE_AURORA_LIGHT_RADIUS_PROOF_STATUS,
        creatureAuroraLightQuadraticAtten:
          resolveCreatureAuroraLightQuadraticAttenuation(radius),
        creatureAuroraLightQuadraticAttenSource: AURORA_LIGHT_QUADRATIC_ATTEN_SOURCE,
        creatureAuroraLightQuadraticAttenProofStatus: AURORA_LIGHT_QUADRATIC_ATTEN_PROOF_STATUS,
        creatureAuroraLightFalloffMode: "gamma0-quadratic-surface",
        creatureAuroraLightFalloffFormula: AURORA_LIGHT_LINEAR_FALLOFF_FORMULA,
        creatureAuroraLightFalloffSource: AURORA_LIGHT_LINEAR_FALLOFF_SOURCE,
        creatureAuroraLightFalloffProofStatus: AURORA_LIGHT_LINEAR_FALLOFF_PROOF_STATUS,
        creatureAuroraLightPointLightDecay: entry.pointLight
          ? entry.pointLight.decay
          : undefined,
        creatureAuroraLightPointLightDecaySource: entry.pointLight
          ? AURORA_LIGHT_LINEAR_FALLOFF_SOURCE
          : undefined,
        creatureAuroraLightAnimatedMultiplier: multiplier,
        creatureAuroraLightAnimationPlaybackStatus: "playing",
        creatureAuroraLightAnimationElapsedSeconds: Number(elapsed.toFixed(3))
      };
    });
    root.userData = {
      ...root.userData,
      creatureAuroraLightAnimationStatus: "active",
      creatureAuroraLightAnimationMode: "webviewer-light-keyframes",
      creatureAuroraLightAnimatedCount: entries.length,
      creatureAuroraLightAnimatedNodeNames: entries.map((entry) => entry.light.nodeName),
      creatureAuroraLightSelectedAnimationNames: entries.map(
        (entry) => entry.animation.animationName
      )
    };
  };

  return {
    lightCount: entries.length,
    animatedLightCount: entries.length,
    nodeNames: entries.map((entry) => entry.light.nodeName),
    animationNames: entries.map((entry) => entry.animation.animationName),
    apply
  };
}

type CreatureRenderColors = Record<string, number | undefined>;

const ITEM_MATERIAL_COLOR_KEYS: ReadonlyArray<keyof SceneObjectItemMaterialColors> = [
  "leather1",
  "leather2",
  "cloth1",
  "cloth2",
  "metal1",
  "metal2"
];

function resolveItemRenderColors(object: SceneObject): CreatureRenderColors | undefined {
  const materialColors = object.itemProperties?.materialColors;
  if (!materialColors) {
    return undefined;
  }
  const colors: CreatureRenderColors = {};
  ITEM_MATERIAL_COLOR_KEYS.forEach((key) => {
    const value = materialColors[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      colors[key] = value;
    }
  });
  return Object.keys(colors).length > 0 ? colors : undefined;
}

const itemTextureBindingCacheByUrl = new Map<
  string,
  Promise<PlaceableRenderPackageTextureBinding | null>
>();

function parseItemTxiBoolean(value: string): boolean | undefined {
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }
  return undefined;
}

function parseItemTxiInteger(value: string): number | undefined {
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseItemTxiNumber(value: string): number | undefined {
  const parsed = Number.parseFloat(value.trim());
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseItemTextureTxiState(text: string): PlaceableRenderPackageTextureTxiState | null {
  const state: PlaceableRenderPackageTextureTxiState = {};
  text.split(/\r?\n/u).forEach((line) => {
    const normalizedLine = line.replace(/#.*/u, "").trim();
    if (!normalizedLine) {
      return;
    }
    const [rawKey, ...rawValueParts] = normalizedLine.split(/\s+/u);
    const key = rawKey?.trim().toLowerCase();
    const value = rawValueParts.join(" ").trim();
    if (!key || !value) {
      return;
    }
    if (key === "envmaptexture") {
      state.envmaptexture = value;
      return;
    }
    if (key === "bumpmaptexture") {
      state.bumpmaptexture = value;
      return;
    }
    if (key === "proceduretype") {
      state.proceduretype = value;
      return;
    }
    if (key === "numx") {
      const parsed = parseItemTxiInteger(value);
      if (parsed !== undefined) {
        state.numx = parsed;
      }
      return;
    }
    if (key === "numy") {
      const parsed = parseItemTxiInteger(value);
      if (parsed !== undefined) {
        state.numy = parsed;
      }
      return;
    }
    if (key === "fps") {
      const parsed = parseItemTxiNumber(value);
      if (parsed !== undefined) {
        state.fps = parsed;
      }
      return;
    }
    if (key === "clamp") {
      const parsed = parseItemTxiInteger(value);
      if (parsed === 0 || parsed === 1 || parsed === 2 || parsed === 3) {
        state.clamp = parsed;
      }
      return;
    }
    if (key === "decal") {
      const parsed = parseItemTxiBoolean(value);
      if (parsed !== undefined) {
        state.decal = parsed;
      }
      return;
    }
    if (key === "mipmap") {
      const parsed = parseItemTxiBoolean(value);
      if (parsed !== undefined) {
        state.mipmap = parsed;
      }
      return;
    }
    if (key === "filter") {
      const parsed = parseItemTxiBoolean(value);
      if (parsed !== undefined) {
        state.filter = parsed;
      }
      return;
    }
    if (key === "blending") {
      const normalizedValue = value.toLowerCase();
      if (normalizedValue === "additive" || normalizedValue === "punchthrough") {
        state.blending = normalizedValue;
      }
    }
  });
  return Object.keys(state).length > 0 ? state : null;
}

function isItemTxiAssetCandidate(
  candidate: SceneObjectItemModelAssetCandidate
): boolean {
  return (
    candidate.role === "material" &&
    candidate.extension.trim().toLowerCase() === "txi" &&
    candidate.assetUrl.trim().length > 0
  );
}

async function loadItemTextureBinding(
  runtime: ItemModelPartRuntime,
  candidate: SceneObjectItemModelAssetCandidate
): Promise<PlaceableRenderPackageTextureBinding | null> {
  const cached = itemTextureBindingCacheByUrl.get(candidate.assetUrl);
  if (cached) {
    return cached;
  }
  const request = (async (): Promise<PlaceableRenderPackageTextureBinding | null> => {
    if (!runtime.placeableTextureFetch) {
      return null;
    }
    const response = await runtime.placeableTextureFetch(candidate.assetUrl, {
      headers: runtime.placeableTextureRequestHeader ?? {}
    }).catch(() => null);
    if (!response || response.ok === false) {
      return null;
    }
    const buffer = await response.arrayBuffer().catch(() => null);
    if (!buffer) {
      return null;
    }
    const txi = parseItemTextureTxiState(new TextDecoder("utf-8").decode(buffer));
    if (!txi) {
      return null;
    }
    return {
      reference: normalizePlaceableTextureReference(candidate.reference || candidate.fileName),
      assetId: candidate.assetId,
      fileName: candidate.fileName,
      objectKey: candidate.objectKey,
      deliveryUrl: candidate.assetUrl,
      txi
    };
  })();
  itemTextureBindingCacheByUrl.set(candidate.assetUrl, request);
  return request;
}

function loadItemTextureBindings(
  runtime: ItemModelPartRuntime,
  object: SceneObject
): Promise<PlaceableRenderPackageTextureBinding[]> {
  const candidates =
    object.itemProperties?.modelAssetCandidates?.filter(isItemTxiAssetCandidate) ?? [];
  if (candidates.length === 0) {
    return Promise.resolve([]);
  }
  return Promise.all(candidates.map((candidate) => loadItemTextureBinding(runtime, candidate))).then(
    (bindings) =>
      bindings.filter(
        (binding): binding is PlaceableRenderPackageTextureBinding => Boolean(binding)
      )
  );
}

function resolveItemModelFallbackTextureReferences(
  object: SceneObject,
  itemPart: {
    role?: string;
    slot?: string;
    partResRef?: string;
    modelResRef?: string;
  }
): string[] {
  const normalizedPartTokens = [
    itemPart.role,
    itemPart.slot,
    itemPart.partResRef,
    itemPart.modelResRef
  ]
    .map((value) => String(value ?? "").trim().toLowerCase())
    .filter(Boolean);
  const isCloakPart = normalizedPartTokens.some(
    (token) => token === "cloak" || token === "robe" || /(?:^|_)cloak(?:_|$)/u.test(token)
  );
  if (!isCloakPart) {
    return [];
  }
  const cloakTextureReference = normalizePlaceableTextureReference(
    object.itemProperties?.cloakTextureResRef ?? ""
  );
  const derivedTextureReferences = normalizedPartTokens.flatMap((token) => {
    if (/^cloak_\d+$/u.test(token)) {
      return [token];
    }
    const modelPartTextureMatch = token.match(/^p[mf][a-z]\d+_(cloak_\d+)$/u);
    return modelPartTextureMatch?.[1] ? [modelPartTextureMatch[1]] : [];
  });
  return [cloakTextureReference, ...derivedTextureReferences].filter(
    (reference, index, all) => reference.length > 0 && all.indexOf(reference) === index
  );
}

function resolveItemFallbackTexturesByReference(
  model: THREE.Object3D,
  texturesByReference: Map<string, THREE.Texture>,
  fallbackTextureReferences: readonly string[]
): Map<string, THREE.Texture> {
  const fallbackTexturesByReference = new Map<string, THREE.Texture>();
  fallbackTextureReferences.forEach((reference) => {
    const normalizedReference = normalizePlaceableTextureReference(reference);
    if (!normalizedReference || fallbackTexturesByReference.has(normalizedReference)) {
      return;
    }
    const texture = texturesByReference.get(normalizedReference);
    if (texture) {
      fallbackTexturesByReference.set(normalizedReference, texture);
      if (/^cloak_\d+$/u.test(normalizedReference)) {
        fallbackTexturesByReference.set("cala_cloak", texture);
      }
    }
  });
  if (fallbackTexturesByReference.size === 1) {
    const fallbackTexture = Array.from(fallbackTexturesByReference.values())[0];
    const materialReferences = new Set<string>();
    model.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) {
        return;
      }
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      materials.forEach((material) => {
        [
          ...resolveSharedModelPrimaryMaterialTextureReferences(material),
          ...resolveSharedModelMaterialTextureReferences(material)
        ].forEach((reference) => {
          if (reference) {
            materialReferences.add(reference);
          }
        });
      });
    });
    materialReferences.forEach((reference) => {
      if (!texturesByReference.has(reference) && !fallbackTexturesByReference.has(reference)) {
        fallbackTexturesByReference.set(reference, fallbackTexture);
      }
    });
  }
  return fallbackTexturesByReference;
}

function forceItemFallbackTextureToUnmappedMaterials(
  model: THREE.Object3D,
  texturesByReference: Map<string, THREE.Texture>,
  fallbackTextureReferences: readonly string[]
): { appliedCount: number; reference: string } | null {
  const fallbackReference = fallbackTextureReferences
    .map(normalizePlaceableTextureReference)
    .find((reference) => reference.length > 0 && texturesByReference.has(reference));
  const fallbackTexture =
    (fallbackReference ? texturesByReference.get(fallbackReference) : undefined) ??
    (texturesByReference.size === 1 ? Array.from(texturesByReference.values())[0] : undefined);
  if (!fallbackTexture) {
    return null;
  }
  const reference =
    fallbackReference ??
    normalizePlaceableTextureReference(
      String(fallbackTexture.userData?.auroraTextureReference ?? fallbackTexture.name ?? "")
    ) ??
    "item-fallback";
  let appliedCount = 0;
  model.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material) => {
      if (resolveMaterialTextureMap(material)) {
        return;
      }
      if (!assignMaterialTextureMap(material, fallbackTexture)) {
        return;
      }
      if (materialSupportsColor(material)) {
        material.color.set(0xffffff);
      }
      fallbackTexture.userData = {
        ...fallbackTexture.userData,
        auroraTextureReference: reference
      };
      material.side = THREE.DoubleSide;
      material.userData = {
        ...material.userData,
        itemFallbackTextureApplied: true,
        itemFallbackTextureReference: reference
      };
      material.needsUpdate = true;
      appliedCount += 1;
    });
  });
  return appliedCount > 0 ? { appliedCount, reference } : null;
}

function resolveItemModelTexturesForApplication(
  model: THREE.Object3D,
  texturesByReference: Map<string, THREE.Texture>,
  textureBindings: readonly PlaceableRenderPackageTextureBinding[],
  fallbackTextureReferences: readonly string[] = []
): Map<string, THREE.Texture> {
  const filteredTexturesByReference = resolveModelMaterialMapTexturesByReference(
    model,
    texturesByReference
  );
  const texturesForApplication =
    filteredTexturesByReference.size > 0
      ? filteredTexturesByReference
      : resolveItemFallbackTexturesByReference(
          model,
          texturesByReference,
          fallbackTextureReferences
        );
  if (texturesForApplication.size === 0 || textureBindings.length === 0) {
    return texturesForApplication;
  }
  const expandedTexturesByReference = new Map(texturesForApplication);
  textureBindings.forEach((binding) => {
    const bindingReference = normalizePlaceableTextureReference(binding.reference);
    if (!texturesForApplication.has(bindingReference)) {
      return;
    }
    [binding.txi?.envmaptexture, binding.txi?.bumpmaptexture].forEach((reference) => {
      if (!reference) {
        return;
      }
      const normalizedReference = normalizePlaceableTextureReference(reference);
      const texture = texturesByReference.get(normalizedReference);
      if (texture) {
        expandedTexturesByReference.set(normalizedReference, texture);
      }
    });
  });
  return expandedTexturesByReference;
}

interface CreatureTintApplicationResult {
  appliedCount: number;
  tintHex: string;
  channels: string[];
  layerRows: Record<string, number>;
  textureAppliedCount?: number;
  materialReplacementCount?: number;
}

interface CreaturePltLayerTintDescriptor {
  key: string;
  layerIndex: number;
  baseHue: number;
  hueRange: number;
  saturation: number;
  lightness: number;
  weight: number;
}

interface LoadedCreaturePartModelEntry {
  entry: CreatureRenderPartModelResolution;
  model: THREE.Object3D;
}

interface CreaturePartModelExactTextureApplicationResult {
  appliedCount: number;
  references: string[];
}

interface LoadedCreatureEquipmentModelPartEntry {
  entry: CreatureRenderEquipmentModelPartResolution;
  model: THREE.Object3D;
  sourceAnimationClips?: THREE.AnimationClip[];
}

interface CreatureEquipmentModelPartAssembly {
  equipmentKey: string;
  equipmentResref: string;
  attachmentTarget: string;
  entries: LoadedCreatureEquipmentModelPartEntry[];
}

interface CreatureRuntimeAmmunitionAim {
  originWorld: THREE.Vector3;
  directionWorld: THREE.Vector3;
  source: "launcher-draw-node" | "animated-hands";
  mode:
    | "bow-root-forward-axis"
    | "bow-draw-node-draw-axis"
    | "bow-draw-node-shot-axis"
    | "launcher-draw-axis"
    | "launcher-draw-axis-inverted-crossbow-source"
    | "launcher-draw-axis-crossbow-source"
    | "animated-hands";
  nodeName: string;
  nodeWorldPosition: THREE.Vector3 | null;
  crossbowMeshAxis?: THREE.Vector3 | null;
  crossbowAxisDot?: number | null;
  crossbowAxisSelection?: string;
}

interface LoadedItemModelPartEntry {
  entry: ItemRenderModelPartResolution;
  model: THREE.Object3D;
}

interface LoadedItemArmorPartModelEntry {
  entry: ItemRenderArmorPartModelResolution;
  model: THREE.Object3D;
}

interface ItemModelPartPreviewTransform {
  mode: "default" | "default-model-upright" | "shield-showcase";
  targetMaxAxisFactor: number;
  rotation: THREE.Euler | null;
}

type CreatureEquipmentModelPartRuntime = RuntimeState;

type ItemModelPartRuntime = RuntimeState;

interface CreaturePartAssemblyResult {
  mode: "raw-origin" | "bbox-stack" | "skeleton-anchors" | "preview-layout";
  axis: "none" | "three-y" | "three-x-y" | "three-x-y-z" | "skeleton-nodes";
  adjustedSlots: string[];
  lateralAdjustedSlots: string[];
  attachmentTargets: string[];
  skeletonMatchedSlots?: string[];
  missingAttachmentTargets?: string[];
  partBounds?: Record<string, string>;
  partCenters?: Record<string, string>;
  partAnchorCenters?: Record<string, string>;
  waistSeamCoverStatus?: string;
  waistSeamCoverBounds?: string;
  waistSeamCoverColor?: string;
}

interface CreaturePartSkeletonCompatibilityResult {
  compatible: boolean;
  status:
    | "compatible"
    | "compatible-mounted-phenotype-anchors"
    | "compatible-by-anchor-coverage"
    | "no-skeleton"
    | "no-player-part-prefix"
    | "part-prefix-mismatch";
  skeletonPrefix: string;
  dominantPartPrefix: string;
  anchorCoveredCount?: number;
  anchorTargetCount?: number;
}

interface CreaturePartRuntimeMetrics {
  partBounds: Record<string, string>;
  partCenters: Record<string, string>;
  partAnchorCenters: Record<string, string>;
  partLocalPositions: Record<string, string>;
  partAttachmentCorrections: Record<string, string>;
  partModelResRefs: Record<string, string>;
}

interface CreaturePartEmbeddedAccessoryStabilizationResult {
  status: "not-applicable" | "applied";
  adjustedMeshNames: string[];
  adjustmentOffsets: string[];
}

const CREATURE_PLT_PALETTE_ROW_MAX = AURORA_PLT_PALETTE_ROW_MAX;

const CREATURE_TINT_CHANNELS: ReadonlyArray<CreaturePltLayerTintDescriptor> = [
  { key: "skin", layerIndex: 0, baseHue: 0.06, hueRange: 0.08, saturation: 0.42, lightness: 0.58, weight: 1 },
  { key: "hair", layerIndex: 1, baseHue: 0.08, hueRange: 0.18, saturation: 0.48, lightness: 0.34, weight: 0.62 },
  { key: "metal1", layerIndex: 2, baseHue: 0.57, hueRange: 0.1, saturation: 0.16, lightness: 0.52, weight: 0.34 },
  { key: "metal2", layerIndex: 3, baseHue: 0.61, hueRange: 0.1, saturation: 0.14, lightness: 0.48, weight: 0.3 },
  { key: "cloth1", layerIndex: 4, baseHue: 0.61, hueRange: 0.84, saturation: 0.52, lightness: 0.43, weight: 0.48 },
  { key: "cloth2", layerIndex: 5, baseHue: 0.92, hueRange: 0.84, saturation: 0.48, lightness: 0.43, weight: 0.44 },
  { key: "leather1", layerIndex: 6, baseHue: 0.07, hueRange: 0.16, saturation: 0.42, lightness: 0.34, weight: 0.36 },
  { key: "leather2", layerIndex: 7, baseHue: 0.04, hueRange: 0.16, saturation: 0.38, lightness: 0.31, weight: 0.32 },
  { key: "tattoo1", layerIndex: 8, baseHue: 0.56, hueRange: 0.82, saturation: 0.72, lightness: 0.46, weight: 0.42 },
  { key: "tattoo2", layerIndex: 9, baseHue: 0.72, hueRange: 0.82, saturation: 0.72, lightness: 0.5, weight: 0.42 }
];

const CREATURE_PART_SPINE_STACK_GROUPS: ReadonlyArray<ReadonlyArray<string>> = [
  ["lFoot", "rFoot"],
  ["lShin", "rShin"],
  ["lThigh", "rThigh"],
  ["pelvis"],
  ["belt"],
  ["torso", "robe"],
  ["neck"],
  ["head"]
];

const CREATURE_PART_ARM_STACK_CHAINS: ReadonlyArray<ReadonlyArray<string>> = [
  ["lShoul", "lBicep", "lFArm", "lHand"],
  ["rShoul", "rBicep", "rFArm", "rHand"]
];

const CREATURE_SKIN_FALLBACK_TINT_SLOTS = new Set(["head", "neck", "lHand", "rHand"]);

const CREATURE_PART_ATTACHMENT_TARGETS: Record<string, string> = {
  torso: "torso_g",
  robe: "rootdummy",
  pelvis: "pelvis_g",
  belt: "belt_g",
  neck: "neck_g",
  head: "head_g",
  lShoul: "lshoulder_g",
  rShoul: "rshoulder_g",
  lBicep: "lbicep_g",
  rBicep: "rbicep_g",
  lFArm: "lforearm_g",
  rFArm: "rforearm_g",
  lHand: "lhand_g",
  rHand: "rhand_g",
  lThigh: "lthigh_g",
  rThigh: "rthigh_g",
  lShin: "lshin_g",
  rShin: "rshin_g",
  lFoot: "lfoot_g",
  rFoot: "rfoot_g"
};
const ITEM_ARMOR_PREVIEW_SKELETON_MODE = "pmh0-sourcehierarchy-anchors";
const CREATURE_SYNTHETIC_HUMANOID_SKELETON_NODES: ReadonlyArray<{
  name: string;
  parentName?: string;
  sourcePosition: [number, number, number];
}> = [
  { name: "rootdummy", sourcePosition: [-0.000405171, 0.020006901, 1.20720005] },
  { name: "torso_g", parentName: "rootdummy", sourcePosition: [0.000405168, 0.0108289, 0.000205994] },
  { name: "neck_g", parentName: "torso_g", sourcePosition: [0, -0.081052803, 0.468950003] },
  { name: "head_g", parentName: "neck_g", sourcePosition: [0, 0.0186997, 0.0767157] },
  { name: "head", parentName: "head_g", sourcePosition: [0, -0.000279422, 0.192650005] },
  { name: "pelvis_g", parentName: "rootdummy", sourcePosition: [0.000405168, 0.0108289, 0.000205994] },
  { name: "belt_g1", parentName: "rootdummy", sourcePosition: [0.00356029, 0.0103383, 0.000206528] },
  { name: "belt_g", parentName: "belt_g1", sourcePosition: [0, 0, 0] },
  { name: "lbicep_g", parentName: "torso_g", sourcePosition: [-0.201004997, -0.079490297, 0.349985003] },
  { name: "lshoulder_g", parentName: "lbicep_g", sourcePosition: [0, 0, 0] },
  { name: "lforearm_g", parentName: "lbicep_g", sourcePosition: [-0.039034601, 0.021219101, -0.30192101] },
  { name: "lhand_g", parentName: "lforearm_g", sourcePosition: [-0.033089999, 0.0228936, -0.291763008] },
  { name: "rbicep_g", parentName: "torso_g", sourcePosition: [0.201010004, -0.079490297, 0.349985987] },
  { name: "rshoulder_g", parentName: "rbicep_g", sourcePosition: [0, 0, 0] },
  { name: "rforearm_g", parentName: "rbicep_g", sourcePosition: [0.039030001, 0.021219101, -0.30192101] },
  { name: "rhand_g", parentName: "rforearm_g", sourcePosition: [0.033089999, 0.0228936, -0.291763008] },
  { name: "lthigh_g", parentName: "pelvis_g", sourcePosition: [-0.108069003, -0.0234426, -0.182440996] },
  { name: "lshin_g", parentName: "lthigh_g", sourcePosition: [0.030621801, -0.016471099, -0.46093601] },
  { name: "lfoot_g", parentName: "lshin_g", sourcePosition: [0.020427, -0.066626601, -0.42740801] },
  { name: "rthigh_g", parentName: "pelvis_g", sourcePosition: [0.108070001, -0.0234426, -0.182440996] },
  { name: "rshin_g", parentName: "rthigh_g", sourcePosition: [-0.030619999, -0.016471099, -0.46093601] },
  { name: "rfoot_g", parentName: "rshin_g", sourcePosition: [-0.02043, -0.066626698, -0.42740801] }
];

function normalizeCreaturePltPaletteRow(value: number): number {
  return normalizeAuroraPltPaletteRow(value);
}

function collectCreaturePltLayerRows(
  colors: CreatureRenderColors | undefined
): Record<string, number> {
  if (!colors) {
    return {};
  }
  const hasExplicitLayerRow = CREATURE_TINT_CHANNELS.some(
    (channel) => typeof colors[channel.key] === "number"
  );
  if (!hasExplicitLayerRow) {
    return {};
  }
  const rows: Record<string, number> = {};
  for (const channel of CREATURE_TINT_CHANNELS) {
    const rawValue = colors[channel.key];
    rows[channel.key] =
      typeof rawValue === "number" ? normalizeCreaturePltPaletteRow(rawValue) : 0;
  }
  return rows;
}

function resolveCreatureMaterialTintColor(
  colors: CreatureRenderColors | undefined
): { color: THREE.Color; channels: string[]; layerRows: Record<string, number> } | null {
  if (!colors) {
    return null;
  }
  let red = 0;
  let green = 0;
  let blue = 0;
  let totalWeight = 0;
  const channels: string[] = [];
  const layerRows: Record<string, number> = {};
  for (const channel of CREATURE_TINT_CHANNELS) {
    const rawValue = colors[channel.key];
    if (typeof rawValue !== "number") {
      continue;
    }
    const row = normalizeCreaturePltPaletteRow(rawValue);
    const normalized = row / CREATURE_PLT_PALETTE_ROW_MAX;
    const tint = new THREE.Color().setHSL(
      (channel.baseHue + normalized * channel.hueRange) % 1,
      channel.saturation,
      channel.lightness
    );
    red += tint.r * channel.weight;
    green += tint.g * channel.weight;
    blue += tint.b * channel.weight;
    totalWeight += channel.weight;
    channels.push(channel.key);
    layerRows[channel.key] = row;
  }
  if (totalWeight <= 0) {
    return null;
  }
  return {
    color: new THREE.Color(red / totalWeight, green / totalWeight, blue / totalWeight),
    channels,
    layerRows
  };
}

function resolveCreatureSkinFallbackTintColor(
  colors: CreatureRenderColors | undefined
): { color: THREE.Color; layerRows: Record<string, number> } | null {
  const rawValue = colors?.skin;
  if (typeof rawValue !== "number") {
    return null;
  }
  const skinChannel = CREATURE_TINT_CHANNELS.find((channel) => channel.key === "skin");
  if (!skinChannel) {
    return null;
  }
  const row = normalizeCreaturePltPaletteRow(rawValue);
  const normalized = row / CREATURE_PLT_PALETTE_ROW_MAX;
  const color = new THREE.Color().setHSL(
    (skinChannel.baseHue + normalized * skinChannel.hueRange) % 1,
    skinChannel.saturation,
    skinChannel.lightness
  );
  return {
    color,
    layerRows: { skin: row }
  };
}

interface CreaturePltTextureBridgeResult {
  texturesByReference: Map<string, THREE.Texture>;
  appliedCount: number;
  references: string[];
  layerRows: Record<string, number>;
  mode: CreaturePltTextureBridgeMode;
}

type CreaturePltTextureBridgeMode = "retail-palette" | "hsl-layer-row";

interface CreaturePltLayerPixelColorResult {
  rgba: [number, number, number, number];
  mode: CreaturePltTextureBridgeMode;
}

function resolveCreaturePltLayerPixelColor(
  layerIndex: number,
  colorIndex: number,
  layerRows: Record<string, number>
): CreaturePltLayerPixelColorResult {
  const channel = CREATURE_TINT_CHANNELS.find((entry) => entry.layerIndex === layerIndex);
  if (!channel || layerRows[channel.key] === undefined) {
    return {
      rgba: [colorIndex, colorIndex, colorIndex, 255],
      mode: "hsl-layer-row"
    };
  }

  const row = layerRows[channel.key] ?? 0;
  const retailPaletteRgba = resolveAuroraPltPaletteRgbaSync(layerIndex, row, colorIndex);
  if (retailPaletteRgba) {
    return {
      rgba: retailPaletteRgba,
      mode: "retail-palette"
    };
  }

  const rowRatio = row / CREATURE_PLT_PALETTE_ROW_MAX;
  const shadeRatio = colorIndex / 255;
  const color = new THREE.Color().setHSL(
    (channel.baseHue + rowRatio * channel.hueRange) % 1,
    channel.saturation,
    Math.max(0.05, Math.min(0.94, channel.lightness * (0.42 + shadeRatio * 0.92)))
  );
  return {
    rgba: [
      Math.round(color.r * 255),
      Math.round(color.g * 255),
      Math.round(color.b * 255),
      255
    ],
    mode: "hsl-layer-row"
  };
}

function readCreaturePltBuffer(texture: THREE.Texture): ArrayBuffer | null {
  const buffer = texture.userData?.pltBuffer;
  return buffer instanceof ArrayBuffer ? buffer : null;
}

function writeCreaturePltLayerTextureData(
  source: Uint8Array,
  target: Uint8Array,
  width: number,
  height: number,
  layerRows: Record<string, number>
): CreaturePltTextureBridgeMode {
  let bridgeMode: CreaturePltTextureBridgeMode = "hsl-layer-row";
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixelIndex = y * width + x;
      const sourceOffset = 24 + pixelIndex * 2;
      const colorIndex = source[sourceOffset] ?? 0;
      const layerIndex = source[sourceOffset + 1] ?? 0;
      const targetY = height - 1 - y;
      const targetOffset = (targetY * width + x) * 4;
      const resolvedColor = resolveCreaturePltLayerPixelColor(
        layerIndex,
        colorIndex,
        layerRows
      );
      if (resolvedColor.mode === "retail-palette") {
        bridgeMode = "retail-palette";
      }
      const [red, green, blue, alpha] = resolvedColor.rgba;
      target[targetOffset] = red;
      target[targetOffset + 1] = green;
      target[targetOffset + 2] = blue;
      target[targetOffset + 3] = alpha;
    }
  }
  return bridgeMode;
}

function writeCreaturePltTextureUserData(
  texture: THREE.Texture,
  mode: CreaturePltTextureBridgeMode
): void {
  texture.userData = {
    ...texture.userData,
    creaturePltTextureBridgeMode: mode,
    creaturePltPaletteReady: mode === "retail-palette",
    creaturePltPaletteSource:
      mode === "retail-palette" ? "aurora-retail-key-bif" : "aurora-web-hsl-fallback"
  };
}

function queueCreatureRetailPltPaletteUpgrade(
  texture: THREE.DataTexture,
  source: Uint8Array,
  target: Uint8Array,
  width: number,
  height: number,
  layerRows: Record<string, number>
): void {
  if (isAuroraPltPaletteDataReady()) {
    return;
  }

  void ensureAuroraPltPaletteDataLoaded().then((loaded) => {
    if (!loaded || texture.userData.creaturePltTextureBridgeApplied !== true) {
      return;
    }
    const mode = writeCreaturePltLayerTextureData(source, target, width, height, layerRows);
    if (mode !== "retail-palette") {
      return;
    }
    writeCreaturePltTextureUserData(texture, mode);
    texture.needsUpdate = true;
  });
}

function createCreaturePltLayerTexture(
  sourceTexture: THREE.Texture,
  colors: CreatureRenderColors | undefined
): THREE.Texture | null {
  if (sourceTexture.userData?.isPLT !== true) {
    return null;
  }
  const layerRows = collectCreaturePltLayerRows(colors);
  if (Object.keys(layerRows).length === 0) {
    return null;
  }
  const buffer = readCreaturePltBuffer(sourceTexture);
  if (!buffer) {
    return null;
  }
  const decodedTexture = decodeAuroraPltTexture(buffer);
  if (!decodedTexture) {
    return null;
  }

  const source = new Uint8Array(buffer);
  const data = new Uint8Array(decodedTexture.width * decodedTexture.height * 4);
  const bridgeMode = writeCreaturePltLayerTextureData(
    source,
    data,
    decodedTexture.width,
    decodedTexture.height,
    layerRows
  );

  const texture = new THREE.DataTexture(
    data,
    decodedTexture.width,
    decodedTexture.height,
    THREE.RGBAFormat
  );
  texture.name = sourceTexture.name ? `${sourceTexture.name}:creature-plt` : "creature-plt";
  texture.colorSpace = THREE.NoColorSpace;
  texture.flipY = false;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = sourceTexture.anisotropy;
  texture.needsUpdate = true;
  texture.userData = {
    ...sourceTexture.userData,
    auroraPltGeneratedTargetFormat: "rgba8-linear",
    auroraPltSamplerState: {
      wrapS: "repeat",
      wrapT: "repeat",
      magFilter: "linear",
      minFilter: "linear-mipmap-linear",
      generateMipmaps: true
    },
    creaturePltTextureBridgeApplied: true,
    creaturePltLayerRows: layerRows,
    creaturePltPaletteRowMax: CREATURE_PLT_PALETTE_ROW_MAX
  };
  writeCreaturePltTextureUserData(texture, bridgeMode);
  if (bridgeMode !== "retail-palette") {
    queueCreatureRetailPltPaletteUpgrade(
      texture,
      source,
      data,
      decodedTexture.width,
      decodedTexture.height,
      layerRows
    );
  }
  return texture;
}

function buildCreaturePltTextureBridge(
  texturesByReference: Map<string, THREE.Texture>,
  colors: CreatureRenderColors | undefined
): CreaturePltTextureBridgeResult {
  const layerRows = collectCreaturePltLayerRows(colors);
  if (texturesByReference.size === 0 || Object.keys(layerRows).length === 0) {
    return {
      texturesByReference,
      appliedCount: 0,
      references: [],
      layerRows,
      mode: "hsl-layer-row"
    };
  }

  const bridgedTexturesByReference = new Map<string, THREE.Texture>();
  const references: string[] = [];
  let bridgeMode: CreaturePltTextureBridgeMode = "hsl-layer-row";
  texturesByReference.forEach((texture, reference) => {
    const bridgedTexture = createCreaturePltLayerTexture(texture, colors);
    if (bridgedTexture) {
      bridgedTexturesByReference.set(reference, bridgedTexture);
      references.push(reference);
      if (bridgedTexture.userData.creaturePltTextureBridgeMode === "retail-palette") {
        bridgeMode = "retail-palette";
      }
      return;
    }
    bridgedTexturesByReference.set(reference, texture);
  });
  return {
    texturesByReference: bridgedTexturesByReference,
    appliedCount: references.length,
    references,
    layerRows,
    mode: bridgeMode
  };
}

function isCreaturePltTexture(texture: THREE.Texture): boolean {
  return texture.userData?.isPLT === true || texture.userData?.auroraIsPlt === true;
}

async function ensureCreatureRetailPltPaletteDataForTextures(
  texturesByReference: Map<string, THREE.Texture>,
  colors: CreatureRenderColors | undefined
): Promise<void> {
  if (isAuroraPltPaletteDataReady()) {
    return;
  }
  if (Object.keys(collectCreaturePltLayerRows(colors)).length === 0) {
    return;
  }
  const hasPltTexture = Array.from(texturesByReference.values()).some(isCreaturePltTexture);
  if (!hasPltTexture) {
    return;
  }
  await ensureAuroraPltPaletteDataLoaded();
}

function resolveCreaturePartModelRenderColors(
  entry: CreatureRenderPartModelResolution,
  colors: CreatureRenderColors | undefined
): CreatureRenderColors | undefined {
  const materialColors = entry.materialColors;
  if (!materialColors || Object.keys(materialColors).length === 0) {
    return colors;
  }
  return {
    ...(colors ?? {}),
    ...materialColors
  };
}

function resolveCreaturePartModelExactTextureReference(
  entry: CreatureRenderPartModelResolution
): string | null {
  const reference = normalizePlaceableTextureReference(entry.modelResRef ?? "");
  return reference.length > 0 ? reference : null;
}

function resolveCreaturePartModelPhenotypeZeroTextureReference(reference: string): string | null {
  const match = reference.match(/^(p[mf][a-z])([1-9]\d*)_(.+)$/iu);
  if (!match) {
    return null;
  }
  return `${match[1]}0_${match[3]}`.toLowerCase();
}

function resolveCreaturePartModelSharedArmorTextureReference(reference: string): string | null {
  const match = reference.match(/^(p[mf])[a-z](\d_.+)$/iu);
  if (!match) {
    return null;
  }
  return `${match[1]}h${match[2]}`.toLowerCase();
}

function resolveCreaturePartModelExactTextureReferences(
  entry: CreatureRenderPartModelResolution
): string[] {
  const primaryReference = resolveCreaturePartModelExactTextureReference(entry);
  if (!primaryReference) {
    return [];
  }
  const references = [primaryReference];
  const phenotypeZeroReference =
    resolveCreaturePartModelPhenotypeZeroTextureReference(primaryReference);
  if (phenotypeZeroReference && phenotypeZeroReference !== primaryReference) {
    references.push(phenotypeZeroReference);
  }
  const sharedArmorReference =
    resolveCreaturePartModelSharedArmorTextureReference(primaryReference);
  if (sharedArmorReference && !references.includes(sharedArmorReference)) {
    references.push(sharedArmorReference);
  }
  return references;
}

function isCreaturePlayerBodyPartTextureReference(reference: string): boolean {
  return /^p[mf][a-z]\d_.+/iu.test(normalizePlaceableTextureReference(reference));
}

function resolveCreatureRenderableTextureUrlsByReference(
  textureUrlsByReference: Map<string, string>,
  loadedEntries: LoadedCreaturePartModelEntry[]
): Map<string, string> {
  if (textureUrlsByReference.size === 0 || loadedEntries.length === 0) {
    return textureUrlsByReference;
  }
  const filteredTextureUrlsByReference = new Map<string, string>();
  loadedEntries.forEach(({ entry }) => {
    const reference = resolveCreaturePartModelExactTextureReferences(entry).find((candidate) =>
      textureUrlsByReference.has(candidate)
    );
    if (!reference) {
      return;
    }
    const textureDeliveryUrl = textureUrlsByReference.get(reference);
    if (textureDeliveryUrl) {
      filteredTextureUrlsByReference.set(reference, textureDeliveryUrl);
    }
  });
  textureUrlsByReference.forEach((textureDeliveryUrl, reference) => {
    if (isCreaturePlayerBodyPartTextureReference(reference)) {
      return;
    }
    filteredTextureUrlsByReference.set(reference, textureDeliveryUrl);
  });
  return filteredTextureUrlsByReference.size > 0
    ? filteredTextureUrlsByReference
    : textureUrlsByReference;
}

function applyCreatureExactPartTexturesToLoadedModels(
  loadedEntries: LoadedCreaturePartModelEntry[],
  texturesByReference: Map<string, THREE.Texture>,
  options: PlaceableTextureApplicationOptions,
  colors?: CreatureRenderColors
): CreaturePartModelExactTextureApplicationResult {
  if (loadedEntries.length === 0 || texturesByReference.size === 0) {
    return {
      appliedCount: 0,
      references: []
    };
  }

  const references: string[] = [];
  loadedEntries.forEach(({ entry, model }) => {
    const reference = resolveCreaturePartModelExactTextureReferences(entry).find((candidate) =>
      texturesByReference.has(candidate)
    );
    if (!reference) {
      return;
    }
    const texture = texturesByReference.get(reference);
    if (!texture) {
      return;
    }
    const partColors = resolveCreaturePartModelRenderColors(entry, colors);
    const partTexture = createCreaturePltLayerTexture(texture, partColors) ?? texture;
    applyPlaceableTexturesToModel(model, new Map([[reference, partTexture]]), partTexture, options);
    const forcedMapCount = forceCreatureExactPartTextureToUnmappedMaterials(
      model,
      partTexture,
      reference
    );
    markCreatureExactPartTextureApplied(model, reference);
    references.push(reference);
    model.userData = {
      ...model.userData,
      creaturePartModelExactTextureStatus: "applied",
      creaturePartModelExactTextureReference: reference,
      creaturePartModelExactTextureForcedMapCount: forcedMapCount,
      creaturePartModelExactTextureMaterialColorKeys: Object.keys(
        entry.materialColors ?? {}
      )
    };
  });

  return {
    appliedCount: references.length,
    references
  };
}

function forceCreatureExactPartTextureToUnmappedMaterials(
  model: THREE.Object3D,
  texture: THREE.Texture,
  reference: string
): number {
  let appliedCount = 0;
  model.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material) => {
      if (resolveMaterialTextureMap(material)) {
        return;
      }
      if (!assignMaterialTextureMap(material, texture)) {
        return;
      }
      material.userData = {
        ...material.userData,
        creaturePartModelExactTextureForcedMap: true,
        creaturePartModelExactTextureReference: reference
      };
      material.needsUpdate = true;
      appliedCount += 1;
    });
  });
  return appliedCount;
}

function markCreatureExactPartTextureApplied(model: THREE.Object3D, reference: string): void {
  model.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material) => {
      const textureMap = resolveMaterialTextureMap(material);
      if (!textureMap) {
        return;
      }
      textureMap.userData = {
        ...textureMap.userData,
        creaturePartModelExactTextureApplied: true,
        creaturePartModelExactTextureReference: reference
      };
      material.userData = {
        ...material.userData,
        creaturePartModelExactTextureApplied: true,
        creaturePartModelExactTextureReference: reference
      };
    });
  });
}

function materialSupportsColor(
  material: THREE.Material
): material is THREE.Material & { color: THREE.Color } {
  return "color" in material && material.color instanceof THREE.Color;
}

function resolveMaterialTextureMap(material: THREE.Material): THREE.Texture | null {
  const maybeTexturedMaterial = material as THREE.Material & { map?: unknown };
  return maybeTexturedMaterial.map instanceof THREE.Texture ? maybeTexturedMaterial.map : null;
}

function materialUsesCreaturePltTextureBridge(material: THREE.Material): boolean {
  return resolveMaterialTextureMap(material)?.userData?.creaturePltTextureBridgeApplied === true;
}

function materialUsesCreatureExactPartTexture(material: THREE.Material): boolean {
  if (material.userData?.creaturePartModelExactTextureApplied === true) {
    return true;
  }
  return resolveMaterialTextureMap(material)?.userData?.creaturePartModelExactTextureApplied === true;
}

function modelUsesCreaturePltTextureBridge(model: THREE.Object3D): boolean {
  let usesBridge = false;
  model.traverse((node) => {
    if (usesBridge || !(node instanceof THREE.Mesh)) {
      return;
    }
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    usesBridge = materials.some(materialUsesCreaturePltTextureBridge);
  });
  return usesBridge;
}

function modelUsesCreatureExactPartTexture(model: THREE.Object3D): boolean {
  let usesExactTexture = model.userData?.creaturePartModelExactTextureStatus === "applied";
  model.traverse((node) => {
    if (usesExactTexture || !(node instanceof THREE.Mesh)) {
      return;
    }
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    usesExactTexture = materials.some(materialUsesCreatureExactPartTexture);
  });
  return usesExactTexture;
}

function assignMaterialTextureMap(material: THREE.Material, texture: THREE.Texture): boolean {
  if (!("map" in material)) {
    return false;
  }
  (material as THREE.Material & { map: THREE.Texture | null }).map = texture;
  material.needsUpdate = true;
  return true;
}

function resolveCreatureEquipmentPrimaryTextureReference(
  material: THREE.Material
): string | null {
  const aurora = readUnknownRecord(material.userData?.aurora);
  const candidates = [
    readUserDataString(material.userData?.auroraPrimaryTextureReference),
    readUserDataString(aurora?.textureReference),
    readUserDataString(material.userData?.textureReference)
  ];
  const materialNameMatch = material.name.match(/^Aurora material\s+(.+)$/iu);
  if (materialNameMatch?.[1]) {
    candidates.push(materialNameMatch[1]);
  }
  for (const candidate of candidates) {
    const normalized = normalizePlaceableTextureReference(candidate ?? "");
    if (normalized) {
      return normalized;
    }
  }
  return null;
}

function isCreatureEquipmentTextureForceNode(node: THREE.Object3D): boolean {
  let current: THREE.Object3D | null = node;
  while (current) {
    if (
      current.name === "creature_equipment_model_parts" ||
      current.name.startsWith("creature_equipment_model_part_") ||
      current.name.startsWith("creature_equipment_item_") ||
      current.userData?.creatureEquipmentModelPartStatus === "loaded" ||
      current.userData?.creatureEquipmentModelPartMeshStatus === "flat-composed" ||
      current.userData?.creatureEquipmentModelPartMeshStatus ===
        "source-hierarchy-preserved" ||
      current.userData?.creatureEquipmentModelPartItemGroupStatus ===
        "source-equipment-item-model"
    ) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

function forceCreatureEquipmentPrimaryTexturesToModel(
  model: THREE.Object3D,
  texturesByReference: Map<string, THREE.Texture>
): number {
  if (texturesByReference.size === 0) {
    return 0;
  }
  let appliedCount = 0;
  model.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }
    if (!isCreatureEquipmentTextureForceNode(node)) {
      return;
    }
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material) => {
      const reference = resolveCreatureEquipmentPrimaryTextureReference(material);
      if (!reference) {
        return;
      }
      const texture = texturesByReference.get(reference);
      if (!texture) {
        return;
      }
      const existingTexture = resolveMaterialTextureMap(material);
      const existingReference = normalizePlaceableTextureReference(
        readUserDataString(existingTexture?.userData?.auroraTextureReference) ??
          readUserDataString(existingTexture?.userData?.auroraSourceUrl) ??
          ""
      );
      if (existingReference === reference) {
        return;
      }
      texture.userData = {
        ...texture.userData,
        auroraTextureReference: reference
      };
      if (!assignMaterialTextureMap(material, texture)) {
        return;
      }
      material.side = THREE.DoubleSide;
      if (materialSupportsColor(material)) {
        material.color.set(0xffffff);
      }
      material.userData = {
        ...material.userData,
        auroraTextureApplicationStatus: "forced-equipment-primary",
        auroraTextureApplicationSelectedReference: reference,
        auroraTextureApplicationReferenceCandidates: [reference],
        auroraTextureApplicationAvailableReferences: Array.from(
          texturesByReference.keys()
        ).sort((left, right) => left.localeCompare(right)),
        auroraTextureApplicationMaterialType:
          material.type || material.constructor.name || "Material",
        creatureEquipmentModelPartForcedPrimaryTexture: true
      };
      appliedCount += 1;
    });
  });
  return appliedCount;
}

function createCreatureSkinFallbackTintTexture(
  sourceTexture: THREE.Texture,
  tint: { color: THREE.Color; layerRows: Record<string, number> },
  slot: string
): THREE.Texture | null {
  const image = sourceTexture.image as
    | { data?: ArrayLike<number>; width?: number; height?: number }
    | undefined;
  if (!image?.data || !image.width || !image.height) {
    return null;
  }

  const source = image.data;
  const data = new Uint8Array(image.width * image.height * 4);
  for (let offset = 0; offset < data.length; offset += 4) {
    const red = Number(source[offset] ?? 0);
    const green = Number(source[offset + 1] ?? red);
    const blue = Number(source[offset + 2] ?? red);
    const alpha = Number(source[offset + 3] ?? 255);
    const luminance = (red + green + blue) / (3 * 255);
    const shade = Math.max(0.52, Math.min(1.24, 0.58 + luminance * 0.72));
    data[offset] = Math.round(Math.min(255, tint.color.r * 255 * shade));
    data[offset + 1] = Math.round(Math.min(255, tint.color.g * 255 * shade));
    data[offset + 2] = Math.round(Math.min(255, tint.color.b * 255 * shade));
    data[offset + 3] = alpha;
  }

  const texture = new THREE.DataTexture(data, image.width, image.height, THREE.RGBAFormat);
  texture.name = sourceTexture.name
    ? `${sourceTexture.name}:creature-skin-fallback`
    : "creature-skin-fallback";
  texture.colorSpace = sourceTexture.colorSpace;
  texture.flipY = sourceTexture.flipY;
  texture.wrapS = sourceTexture.wrapS;
  texture.wrapT = sourceTexture.wrapT;
  texture.magFilter = sourceTexture.magFilter;
  texture.minFilter = sourceTexture.minFilter;
  texture.anisotropy = sourceTexture.anisotropy;
  texture.needsUpdate = true;
  texture.userData = {
    ...sourceTexture.userData,
    creatureSkinFallbackTintTextureApplied: true,
    creatureSkinFallbackTintColor: `#${tint.color.getHexString()}`,
    creatureSkinFallbackTintSlot: slot,
    creatureSkinFallbackTintLayerRows: tint.layerRows,
    creaturePltPaletteRowMax: CREATURE_PLT_PALETTE_ROW_MAX
  };
  return texture;
}

function applyCreatureMaterialTintToModel(
  model: THREE.Object3D,
  colors: CreatureRenderColors | undefined
): CreatureTintApplicationResult | null {
  const tint = resolveCreatureMaterialTintColor(colors);
  if (!tint) {
    return null;
  }

  let appliedCount = 0;
  model.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material) => {
      if (materialUsesCreaturePltTextureBridge(material)) {
        return;
      }
      if (materialUsesCreatureExactPartTexture(material)) {
        return;
      }
      if (!materialSupportsColor(material)) {
        return;
      }
      material.color.lerp(tint.color, 0.38);
      material.userData = {
        ...material.userData,
        creatureMaterialTintApplied: true,
        creatureMaterialTintColor: `#${tint.color.getHexString()}`,
        creatureMaterialTintChannels: tint.channels,
        creatureMaterialTintMode: "plt-layer-bridge",
        creatureMaterialTintLayerRows: tint.layerRows,
        creaturePltPaletteRowMax: CREATURE_PLT_PALETTE_ROW_MAX
      };
      material.needsUpdate = true;
      appliedCount += 1;
    });
  });

  if (appliedCount === 0) {
    return null;
  }
  return {
    appliedCount,
    tintHex: `#${tint.color.getHexString()}`,
    channels: tint.channels,
    layerRows: tint.layerRows
  };
}

function applyCreatureSkinFallbackTintToPartModel(
  entry: CreatureRenderPartModelResolution,
  model: THREE.Object3D,
  colors: CreatureRenderColors | undefined
): CreatureTintApplicationResult | null {
  if (!CREATURE_SKIN_FALLBACK_TINT_SLOTS.has(entry.slot)) {
    return null;
  }
  if (modelUsesCreaturePltTextureBridge(model)) {
    return null;
  }
  if (modelUsesCreatureExactPartTexture(model)) {
    return null;
  }
  const tint = resolveCreatureSkinFallbackTintColor(colors);
  if (!tint) {
    return null;
  }

  let appliedCount = 0;
  let textureAppliedCount = 0;
  let materialReplacementCount = 0;
  model.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material, materialIndex) => {
      const textureMap = resolveMaterialTextureMap(material);
      const tintedTexture = textureMap
        ? createCreatureSkinFallbackTintTexture(textureMap, tint, entry.slot)
        : null;
      const shouldReplaceMaterial = entry.slot === "head" || !materialSupportsColor(material);
      const targetMaterial =
        shouldReplaceMaterial
          ? new THREE.MeshStandardMaterial({
              color: 0xffffff,
              map: textureMap,
              side: material.side,
              transparent: material.transparent,
              opacity: material.opacity,
              alphaTest:
                "alphaTest" in material && typeof material.alphaTest === "number"
                  ? material.alphaTest
                  : 0
            })
          : material;
      if (shouldReplaceMaterial) {
        materialReplacementCount += 1;
        targetMaterial.name = material.name;
        if (Array.isArray(node.material)) {
          node.material[materialIndex] = targetMaterial;
        } else {
          node.material = targetMaterial;
        }
      }
      if (!materialSupportsColor(targetMaterial)) {
        return;
      }
      const textureTintApplied =
        tintedTexture !== null && assignMaterialTextureMap(targetMaterial, tintedTexture);
      if (textureTintApplied) {
        textureAppliedCount += 1;
      }
      const materialTintColor = textureTintApplied
        ? tint.color.clone().lerp(
            new THREE.Color(0xffffff),
            entry.slot === "head" ? 0.12 : 0.28
          )
        : tint.color;
      targetMaterial.color.copy(materialTintColor);
      if (
        textureTintApplied &&
        "emissive" in targetMaterial &&
        targetMaterial.emissive instanceof THREE.Color
      ) {
        targetMaterial.emissive.copy(tint.color).multiplyScalar(
          entry.slot === "head" ? 0.16 : 0.08
        );
        if (
          "emissiveIntensity" in targetMaterial &&
          typeof targetMaterial.emissiveIntensity === "number"
        ) {
          targetMaterial.emissiveIntensity = Math.max(
            targetMaterial.emissiveIntensity,
            entry.slot === "head" ? 0.16 : 0.08
          );
        }
      }
      targetMaterial.userData = {
        ...targetMaterial.userData,
        creatureSkinFallbackTintApplied: true,
        creatureSkinFallbackTintColor: `#${tint.color.getHexString()}`,
        creatureSkinFallbackTintMaterialColor: `#${materialTintColor.getHexString()}`,
        creatureSkinFallbackTintSlot: entry.slot,
        creatureSkinFallbackTintMode: textureMap
          ? "skin-slot-texture-tint"
          : "skin-slot-untextured-tint",
        creatureSkinFallbackTintTextureApplied: textureTintApplied,
        creatureSkinFallbackTintLayerRows: tint.layerRows,
        creaturePltPaletteRowMax: CREATURE_PLT_PALETTE_ROW_MAX
      };
      targetMaterial.needsUpdate = true;
      appliedCount += 1;
    });
  });

  if (appliedCount === 0) {
    return null;
  }
  return {
    appliedCount,
    tintHex: `#${tint.color.getHexString()}`,
    channels: ["skin"],
    layerRows: tint.layerRows,
    textureAppliedCount,
    materialReplacementCount
  };
}

function resolveCreaturePartAttachmentTarget(
  entry: CreatureRenderPartModelResolution
): string {
  const canonicalTarget = CREATURE_PART_ATTACHMENT_TARGETS[entry.slot] ?? "";
  if (
    canonicalTarget &&
    (entry.slot === "belt" || entry.slot === "lShoul" || entry.slot === "rShoul")
  ) {
    return canonicalTarget;
  }
  const nodeName = entry.nodeName?.trim();
  if (nodeName) {
    if (normalizeCreatureNodeName(nodeName) === "root") {
      const modelRoot = entry.modelPrefix?.trim().replace(/_+$/u, "");
      return modelRoot && modelRoot.length > 0 ? modelRoot : "rootdummy";
    }
    return nodeName;
  }
  return canonicalTarget;
}

function applyCreaturePartAttachmentCorrection(
  entry: CreatureRenderPartModelResolution,
  _model: THREE.Object3D
): Record<string, unknown> {
  if (entry.slot !== "head") {
    return {};
  }
  return {
    creaturePartAttachmentCorrection: "head-g-anchor",
    creaturePartAttachmentCorrectionYaw: 0
  };
}

function resolveCreaturePartAssemblyAttachmentTargets(
  loadedEntries: LoadedCreaturePartModelEntry[]
): string[] {
  return loadedEntries
    .map(({ entry }) => resolveCreaturePartAttachmentTarget(entry))
    .filter((value) => value.length > 0);
}

function formatCreatureRuntimeNumber(value: number): string {
  if (!Number.isFinite(value) || Math.abs(value) < 0.00005) {
    return "0.0000";
  }
  return value.toFixed(4);
}

function formatCreatureRuntimeVector(value: THREE.Vector3): string {
  return [
    formatCreatureRuntimeNumber(value.x),
    formatCreatureRuntimeNumber(value.y),
    formatCreatureRuntimeNumber(value.z)
  ].join(",");
}

function formatCreatureRuntimeBounds(box: THREE.Box3): string {
  if (box.isEmpty()) {
    return "empty";
  }
  return `${formatCreatureRuntimeVector(box.min)} -> ${formatCreatureRuntimeVector(box.max)}`;
}

function collectCreaturePartRuntimeMetrics(
  root: THREE.Object3D,
  loadedEntries: LoadedCreaturePartModelEntry[]
): CreaturePartRuntimeMetrics {
  root.updateMatrixWorld(true);
  const anchors = collectCreatureEquipmentAttachmentAnchors(root);
  const partBounds: Record<string, string> = {};
  const partCenters: Record<string, string> = {};
  const partAnchorCenters: Record<string, string> = {};
  const partLocalPositions: Record<string, string> = {};
  const partAttachmentCorrections: Record<string, string> = {};
  const partModelResRefs: Record<string, string> = {};
  loadedEntries.forEach(({ entry, model }) => {
    model.updateMatrixWorld(true);
    partLocalPositions[entry.slot] = formatCreatureRuntimeVector(model.position);
    const attachmentCorrection = model.userData?.creaturePartAttachmentCorrection;
    if (typeof attachmentCorrection === "string" && attachmentCorrection.length > 0) {
      partAttachmentCorrections[entry.slot] = attachmentCorrection;
    }
    if (entry.modelResRef) {
      partModelResRefs[entry.slot] = entry.modelResRef;
    }
    const partBox = new THREE.Box3().setFromObject(model);
    if (!partBox.isEmpty()) {
      const center = new THREE.Vector3();
      partBox.getCenter(center);
      partBounds[entry.slot] = formatCreatureRuntimeBounds(partBox);
      partCenters[entry.slot] = formatCreatureRuntimeVector(center);
    }
    const attachmentTarget = resolveCreaturePartAttachmentTarget(entry);
    const anchor = attachmentTarget
      ? anchors.get(normalizeCreatureNodeName(attachmentTarget))
      : undefined;
    if (anchor) {
      const anchorCenter = new THREE.Vector3();
      anchor.getWorldPosition(anchorCenter);
      partAnchorCenters[entry.slot] = formatCreatureRuntimeVector(anchorCenter);
    }
  });
  return {
    partBounds,
    partCenters,
    partAnchorCenters,
    partLocalPositions,
    partAttachmentCorrections,
    partModelResRefs
  };
}

function isCreatureRuntimeNodeEffectivelyVisible(node: THREE.Object3D): boolean {
  if (!isCreatureRuntimeNodeTransformVisible(node)) {
    return false;
  }
  if (node instanceof THREE.Mesh) {
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    return materials.some((material) => material.visible !== false);
  }
  return true;
}

function isCreatureRuntimeNodeTransformVisible(node: THREE.Object3D): boolean {
  let current: THREE.Object3D | null = node;
  while (current) {
    if (!current.visible) {
      return false;
    }
    current = current.parent;
  }
  return true;
}

function isCreatureRuntimeNodeDescendantOf(
  node: THREE.Object3D,
  ancestor: THREE.Object3D
): boolean {
  let current: THREE.Object3D | null = node;
  while (current) {
    if (current === ancestor) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

function shouldSkipCreatureSourcePreviewTextureApplication(mesh: THREE.Mesh): boolean {
  let current: THREE.Object3D | null = mesh;
  while (current) {
    if (
      current.name === "creature_aurora_emitter_particle_preview" ||
      current.name.startsWith("creature_aurora_emitter_") ||
      current.name.startsWith("creature_aurora_light_") ||
      current.name === "creature_equipment_model_parts" ||
      current.name.startsWith("creature_equipment_model_part_") ||
      current.name.startsWith("creature_equipment_item_") ||
      current.userData?.creatureEquipmentModelPartStatus === "loaded" ||
      current.userData?.creatureEquipmentModelPartMeshStatus === "flat-composed" ||
      current.userData?.creatureEquipmentModelPartMeshStatus ===
        "source-hierarchy-preserved" ||
      current.userData?.creatureEquipmentModelPartItemGroupStatus ===
        "source-equipment-item-model"
    ) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

function isCreatureRuntimeNodeWithinAnchoredCreaturePart(node: THREE.Object3D): boolean {
  let current: THREE.Object3D | null = node;
  while (current) {
    if (
      typeof current.userData?.creaturePartSlot === "string" ||
      current.userData?.creatureEquipmentModelPartStatus === "loaded" ||
      current.userData?.creatureEquipmentModelPartItemGroupStatus ===
        "source-equipment-item-model" ||
      current.userData?.creatureEquipmentModelPartGroupStatus ===
        "source-equipment-model-parts"
    ) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

function collectCreatureVisibleMeshRuntimeDiagnostics(
  root: THREE.Object3D,
  skeletonModel: THREE.Object3D | null | undefined
): Record<string, string | number | null> {
  root.updateMatrixWorld(true);
  const visibleNames: string[] = [];
  const visibleSlots: string[] = [];
  const visibleCenters: string[] = [];
  const visibleSizes: string[] = [];
  const visibleWorldScales: string[] = [];
  const visibleAncestorPaths: string[] = [];
  const visibleSourceSkinningBindPoseModes: string[] = [];
  const visibleSourceSkinningRuntimeBounds: string[] = [];
  const visibleSourceSkinningRuntimeSignatures: string[] = [];
  const visibleSkeletonNames: string[] = [];
  let visibleMeshCount = 0;
  let skeletonMeshCount = 0;
  let suppressedSkeletonMeshCount = 0;
  let visibleSkeletonMeshCount = 0;

  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }
    const effectivelyVisible = isCreatureRuntimeNodeEffectivelyVisible(node);
    const isSkeletonMesh = skeletonModel
      ? isCreatureRuntimeNodeDescendantOf(node, skeletonModel) &&
        !isCreatureRuntimeNodeWithinAnchoredCreaturePart(node)
      : false;
    if (isSkeletonMesh) {
      skeletonMeshCount += 1;
      if (node.userData?.creatureAnchorSkeletonRenderGeometrySuppressed === true) {
        suppressedSkeletonMeshCount += 1;
      }
      if (effectivelyVisible) {
        visibleSkeletonMeshCount += 1;
        visibleSkeletonNames.push(node.name || "(unnamed)");
      }
    }
    if (!effectivelyVisible) {
      return;
    }
    visibleMeshCount += 1;
    const slot = resolveCreatureRuntimeNodePartSlot(node);
    visibleNames.push(node.name || node.parent?.name || "(unnamed)");
    visibleSlots.push(slot || "none");
    if (visibleCenters.length < 32) {
      const box = new THREE.Box3().setFromObject(node);
      if (!box.isEmpty()) {
        const center = new THREE.Vector3();
        const size = new THREE.Vector3();
        const worldPosition = new THREE.Vector3();
        const worldQuaternion = new THREE.Quaternion();
        const worldScale = new THREE.Vector3();
        box.getCenter(center);
        box.getSize(size);
        node.matrixWorld.decompose(worldPosition, worldQuaternion, worldScale);
        const ancestorNames: string[] = [];
        let current: THREE.Object3D | null = node;
        while (current && ancestorNames.length < 6) {
          ancestorNames.push(current.name || current.type || "(unnamed)");
          current = current.parent;
        }
        visibleCenters.push(
          `${slot || node.name || "mesh"}:${formatCreatureRuntimeVector(center)}`
        );
        visibleSizes.push(
          `${slot || node.name || "mesh"}:${formatCreatureRuntimeVector(size)}`
        );
        visibleWorldScales.push(
          `${slot || node.name || "mesh"}:${formatCreatureRuntimeVector(worldScale)}`
        );
        visibleAncestorPaths.push(
          `${slot || node.name || "mesh"}:${ancestorNames.join(">")}`
        );
        const sourceSkinningBindPoseMode = node.userData?.auroraSourceSkinningBindPoseMode;
        if (
          typeof sourceSkinningBindPoseMode === "string" &&
          sourceSkinningBindPoseMode.length > 0
        ) {
          visibleSourceSkinningBindPoseModes.push(
            `${slot || node.name || "mesh"}:${sourceSkinningBindPoseMode}`
          );
        }
        const sourceSkinningRuntimeBounds =
          node.userData?.auroraSourceSkinningRuntimeBounds;
        if (
          typeof sourceSkinningRuntimeBounds === "string" &&
          sourceSkinningRuntimeBounds.length > 0
        ) {
          visibleSourceSkinningRuntimeBounds.push(
            `${slot || node.name || "mesh"}:${sourceSkinningRuntimeBounds}`
          );
        }
        const sourceSkinningRuntimeSignature =
          node.userData?.auroraSourceSkinningRuntimeVertexSignature;
        if (
          typeof sourceSkinningRuntimeSignature === "string" &&
          sourceSkinningRuntimeSignature.length > 0
        ) {
          visibleSourceSkinningRuntimeSignatures.push(
            `${slot || node.name || "mesh"}:${sourceSkinningRuntimeSignature}`
          );
        }
      }
    }
  });

  return {
    visibleMeshCount,
    visibleMeshNames: visibleNames.slice(0, 48).join("|"),
    visibleMeshSlots: visibleSlots.slice(0, 48).join("|"),
    visibleMeshCenters: visibleCenters.join("|"),
    visibleMeshSizes: visibleSizes.join("|"),
    visibleMeshWorldScales: visibleWorldScales.join("|"),
    visibleMeshAncestorPaths: visibleAncestorPaths.join("|"),
    visibleMeshSourceSkinningBindPoseModes: visibleSourceSkinningBindPoseModes.join("|"),
    visibleMeshSourceSkinningRuntimeBounds:
      visibleSourceSkinningRuntimeBounds.join("|"),
    visibleMeshSourceSkinningRuntimeVertexSignatures:
      visibleSourceSkinningRuntimeSignatures.join("|"),
    skeletonMeshCount,
    suppressedSkeletonMeshCount,
    visibleSkeletonMeshCount,
    visibleSkeletonMeshNames: visibleSkeletonNames.slice(0, 24).join("|")
  };
}

function resolveCreatureRuntimeNodePartSlot(node: THREE.Object3D): string {
  let current: THREE.Object3D | null = node;
  while (current) {
    const slot = current.userData?.creaturePartSlot;
    if (typeof slot === "string" && slot.trim().length > 0) {
      return slot;
    }
    const equipmentTarget = current.userData?.creatureEquipmentModelPartAttachmentTarget;
    if (typeof equipmentTarget === "string" && equipmentTarget.trim().length > 0) {
      return `equipment:${equipmentTarget.trim()}`;
    }
    const equipmentItemTarget =
      current.userData?.creatureEquipmentModelPartItemAttachmentTarget;
    if (typeof equipmentItemTarget === "string" && equipmentItemTarget.trim().length > 0) {
      return `equipment:${equipmentItemTarget.trim()}`;
    }
    current = current.parent;
  }
  return "";
}

function formatCreatureMaterialColor(material: THREE.Material): string {
  return materialSupportsColor(material) ? `#${material.color.getHexString()}` : "";
}

function readCreatureMaterialTextureUserDataString(
  texture: THREE.Texture | null,
  key: string
): string {
  const value = texture?.userData?.[key];
  return typeof value === "string" ? value : "";
}

function readCreatureMaterialTextureUserDataBoolean(
  texture: THREE.Texture | null,
  key: string
): string {
  const value = texture?.userData?.[key];
  return typeof value === "boolean" ? String(value) : "";
}

function formatCreatureMaterialRuntimeSample(
  node: THREE.Mesh,
  material: THREE.Material,
  materialIndex: number
): string {
  const textureMap = resolveMaterialTextureMap(material);
  const textureReference =
    readCreatureMaterialTextureUserDataString(textureMap, "creaturePartModelExactTextureReference") ||
    readCreatureMaterialTextureUserDataString(textureMap, "auroraTextureReference") ||
    readCreatureMaterialTextureUserDataString(textureMap, "auroraSourceUrl") ||
    textureMap?.name ||
    "";
  return [
    node.name || node.parent?.name || "(unnamed)",
    String(materialIndex),
    textureReference,
    readCreatureMaterialTextureUserDataString(textureMap, "creaturePltTextureBridgeMode"),
    readCreatureMaterialTextureUserDataBoolean(textureMap, "creaturePltPaletteReady"),
    readCreatureMaterialTextureUserDataString(textureMap, "creaturePltPaletteSource"),
    readCreatureMaterialTextureUserDataString(textureMap, "creaturePartModelExactTextureReference"),
    formatCreatureMaterialColor(material)
  ].join(":");
}

function collectCreatureMaterialRuntimeDiagnostics(
  root: THREE.Object3D
): Record<string, string | number | null> {
  const samples: string[] = [];
  const headSamples: string[] = [];
  const torsoSamples: string[] = [];
  let materialCount = 0;
  let pltBridgeCount = 0;
  let retailPaletteCount = 0;
  let hslFallbackCount = 0;
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh) || !isCreatureRuntimeNodeEffectivelyVisible(node)) {
      return;
    }
    const meshName = node.name.toLowerCase();
    const slotName =
      typeof node.userData?.creaturePartSlot === "string"
        ? node.userData.creaturePartSlot.toLowerCase()
        : typeof node.parent?.userData?.creaturePartSlot === "string"
          ? node.parent.userData.creaturePartSlot.toLowerCase()
          : "";
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material, materialIndex) => {
      materialCount += 1;
      const textureMap = resolveMaterialTextureMap(material);
      const bridgeMode = readCreatureMaterialTextureUserDataString(
        textureMap,
        "creaturePltTextureBridgeMode"
      );
      if (textureMap?.userData?.creaturePltTextureBridgeApplied === true) {
        pltBridgeCount += 1;
      }
      if (bridgeMode === "retail-palette") {
        retailPaletteCount += 1;
      } else if (bridgeMode === "hsl-layer-row") {
        hslFallbackCount += 1;
      }
      const sample = formatCreatureMaterialRuntimeSample(node, material, materialIndex);
      if (samples.length < 24) {
        samples.push(sample);
      }
      if (
        headSamples.length < 8 &&
        (slotName === "head" || meshName.includes("head"))
      ) {
        headSamples.push(sample);
      }
      if (
        torsoSamples.length < 8 &&
        (slotName === "torso" || meshName.includes("chest") || meshName.includes("torso"))
      ) {
        torsoSamples.push(sample);
      }
    });
  });
  return {
    materialCount,
    materialPltBridgeCount: pltBridgeCount,
    materialRetailPaletteCount: retailPaletteCount,
    materialHslFallbackCount: hslFallbackCount,
    materialSamples: samples.join("|"),
    headMaterialSamples: headSamples.join("|"),
    torsoMaterialSamples: torsoSamples.join("|")
  };
}

function collectCreatureEquipmentModelPartRuntimeDiagnostics(
  root: THREE.Object3D
): Record<string, string | number | null> {
  root.updateMatrixWorld(true);
  const loadedParts: THREE.Object3D[] = [];
  const itemGroups: THREE.Object3D[] = [];
  root.traverse((node) => {
    if (node.userData?.creatureEquipmentModelPartStatus === "loaded") {
      loadedParts.push(node);
    }
    if (
      node.userData?.creatureEquipmentModelPartItemGroupStatus ===
      "source-equipment-item-model"
    ) {
      itemGroups.push(node);
    }
  });

  const visitedMeshes = new Set<THREE.Mesh>();
  const visibleNames: string[] = [];
  const visibleTargets: string[] = [];
  const visibleCenters: string[] = [];
  const visibleSizes: string[] = [];
  const visibleParentPaths: string[] = [];
  const itemGroupBounds: string[] = [];
  const itemGroupWeaponScales: string[] = [];
  const itemGroupWeaponScaleSources: string[] = [];
  const itemGroupAttachmentTargets: string[] = [];
  const itemGroupResolvedAnchors: string[] = [];
  const itemGroupResolvedAnchorSources: string[] = [];
  const itemGroupParentPaths: string[] = [];
  const itemGroupSourceAnimationStatuses: string[] = [];
  const itemGroupSourceAnimationClipNames: string[] = [];
  const itemGroupSourceAnimationLoopModes: string[] = [];
  const itemGroupSourceAnimationRecoveryPoseClipNames: string[] = [];
  const itemGroupSourceAnimationRecoveryPoseCandidateNames: string[] = [];
  const itemGroupSourceAnimationRecoveryPoseFallbacks: string[] = [];
  const itemGroupSourceAnimationRecoveryPoseFallbackReasons: string[] = [];
  const itemGroupSourceAnimationRecoveryPoseSkippedReasons: string[] = [];
  const partCompositionStatuses: string[] = [];
  const partCompositionReasons: string[] = [];
  const partSourceHierarchyStats: string[] = [];
  const partRuntimeSourceHierarchyNodeNames: string[] = [];
  const ammunitionAimSources: string[] = [];
  const ammunitionAimModes: string[] = [];
  const ammunitionAimNodeNames: string[] = [];
  const ammunitionAimOrigins: string[] = [];
  const ammunitionAimDirections: string[] = [];
  const ammunitionCrossbowMeshAxes: string[] = [];
  const ammunitionCrossbowAxisDots: string[] = [];
  const ammunitionCrossbowAxisSelections: string[] = [];
  const loosePartRootNames: string[] = [];
  loadedParts.forEach((part) => {
    let current = part.parent;
    let hasItemGroupParent = false;
    while (current && current !== root) {
      if (
        current.userData?.creatureEquipmentModelPartItemGroupStatus ===
        "source-equipment-item-model"
      ) {
        hasItemGroupParent = true;
        break;
      }
      current = current.parent;
    }
    if (!hasItemGroupParent) {
      loosePartRootNames.push(part.name || "(unnamed)");
    }
  });
  itemGroups.forEach((group) => {
    const equipmentResRef = String(
      group.userData?.creatureEquipmentModelPartItemEquipmentResRef ?? group.name
    );
    if (itemGroupAttachmentTargets.length < 24) {
      itemGroupAttachmentTargets.push(
        `${equipmentResRef}:${
          typeof group.userData?.creatureEquipmentModelPartItemAttachmentTarget ===
          "string"
            ? group.userData.creatureEquipmentModelPartItemAttachmentTarget
            : ""
        }`
      );
      itemGroupResolvedAnchors.push(
        `${equipmentResRef}:${
          typeof group.userData?.creatureEquipmentModelPartItemResolvedAnchorName ===
          "string"
            ? group.userData.creatureEquipmentModelPartItemResolvedAnchorName
            : ""
        }`
      );
      itemGroupResolvedAnchorSources.push(
        `${equipmentResRef}:${
          typeof group.userData?.creatureEquipmentModelPartItemResolvedAnchorSource ===
          "string"
            ? group.userData.creatureEquipmentModelPartItemResolvedAnchorSource
            : ""
        }`
      );
      itemGroupParentPaths.push(
        `${equipmentResRef}:${formatCreatureRuntimeNodePath(group, root)}`
      );
      itemGroupSourceAnimationStatuses.push(
        `${equipmentResRef}:${
          typeof group.userData?.creatureEquipmentModelPartItemSourceAnimationStatus ===
          "string"
            ? group.userData.creatureEquipmentModelPartItemSourceAnimationStatus
            : ""
        }`
      );
      itemGroupSourceAnimationClipNames.push(
        `${equipmentResRef}:${readUserDataStringArray(
          group.userData?.creatureEquipmentModelPartItemSourceAnimationSelectedClipNames
        ).join(",")}`
      );
      itemGroupSourceAnimationLoopModes.push(
        `${equipmentResRef}:${readUserDataStringArray(
          group.userData?.creatureAnimationPlaybackLoopModes
        ).join(",")}`
      );
      itemGroupSourceAnimationRecoveryPoseClipNames.push(
        `${equipmentResRef}:${readUserDataStringArray(
          group.userData?.creatureAnimationPlaybackRecoveryPoseClipNames
        ).join(",")}`
      );
      itemGroupSourceAnimationRecoveryPoseCandidateNames.push(
        `${equipmentResRef}:${readUserDataStringArray(
          group.userData?.creatureAnimationPlaybackRecoveryPoseCandidateNames
        ).join(",")}`
      );
      itemGroupSourceAnimationRecoveryPoseFallbacks.push(
        `${equipmentResRef}:${readUserDataStringArray(
          group.userData?.creatureAnimationPlaybackRecoveryPoseFallbacks
        ).join(",")}`
      );
      itemGroupSourceAnimationRecoveryPoseFallbackReasons.push(
        `${equipmentResRef}:${readUserDataStringArray(
          group.userData?.creatureAnimationPlaybackRecoveryPoseFallbackReasons
        ).join(",")}`
      );
      itemGroupSourceAnimationRecoveryPoseSkippedReasons.push(
        `${equipmentResRef}:${readUserDataStringArray(
          group.userData?.creatureAnimationPlaybackRecoveryPoseSkippedReasons
        ).join(",")}`
      );
    }
    if (itemGroupWeaponScales.length < 24) {
      const scale =
        typeof group.userData?.creatureEquipmentModelPartItemWeaponScale === "number"
          ? group.userData.creatureEquipmentModelPartItemWeaponScale
          : 1;
      itemGroupWeaponScales.push(`${equipmentResRef}:${scale.toFixed(4)}`);
      itemGroupWeaponScaleSources.push(
        `${equipmentResRef}:${
          typeof group.userData?.creatureEquipmentModelPartItemWeaponScaleSource ===
          "string"
            ? group.userData.creatureEquipmentModelPartItemWeaponScaleSource
            : ""
        }`
      );
    }
    const aimSource =
      typeof group.userData?.creatureRuntimeAmmunitionProxyAimSource === "string"
        ? group.userData.creatureRuntimeAmmunitionProxyAimSource
        : "";
    if (aimSource) {
      ammunitionAimSources.push(aimSource);
      ammunitionAimModes.push(
        typeof group.userData?.creatureRuntimeAmmunitionProxyAimMode === "string"
          ? group.userData.creatureRuntimeAmmunitionProxyAimMode
          : ""
      );
      ammunitionAimNodeNames.push(
        typeof group.userData?.creatureRuntimeAmmunitionProxyAimNodeName === "string"
          ? group.userData.creatureRuntimeAmmunitionProxyAimNodeName
          : ""
      );
      ammunitionAimOrigins.push(
        typeof group.userData?.creatureRuntimeAmmunitionProxyOrigin === "string"
          ? group.userData.creatureRuntimeAmmunitionProxyOrigin
          : ""
      );
      ammunitionAimDirections.push(
        typeof group.userData?.creatureRuntimeAmmunitionProxyDirection === "string"
          ? group.userData.creatureRuntimeAmmunitionProxyDirection
          : ""
      );
      ammunitionCrossbowMeshAxes.push(
        typeof group.userData?.creatureRuntimeAmmunitionProxyCrossbowMeshAxis ===
          "string"
          ? group.userData.creatureRuntimeAmmunitionProxyCrossbowMeshAxis
          : ""
      );
      ammunitionCrossbowAxisDots.push(
        typeof group.userData?.creatureRuntimeAmmunitionProxyCrossbowAxisDot ===
          "string"
          ? group.userData.creatureRuntimeAmmunitionProxyCrossbowAxisDot
          : ""
      );
      ammunitionCrossbowAxisSelections.push(
        typeof group.userData?.creatureRuntimeAmmunitionProxyCrossbowAxisSelection ===
          "string"
          ? group.userData.creatureRuntimeAmmunitionProxyCrossbowAxisSelection
          : ""
      );
    }
    if (itemGroupBounds.length >= 24) {
      return;
    }
    const box = new THREE.Box3().setFromObject(group);
    if (box.isEmpty()) {
      return;
    }
    const size = new THREE.Vector3();
    box.getSize(size);
    itemGroupBounds.push(
      `${equipmentResRef}:${formatCreatureRuntimeVector(size)}`
    );
  });
  loadedParts.forEach((part) => {
    if (partCompositionStatuses.length < 48) {
      const partName = part.name || "(unnamed)";
      const compositionStatus =
        typeof part.userData?.creatureEquipmentModelPartCompositionStatus === "string"
          ? part.userData.creatureEquipmentModelPartCompositionStatus
          : "";
      const compositionReason =
        typeof part.userData?.creatureEquipmentModelPartCompositionReason === "string"
          ? part.userData.creatureEquipmentModelPartCompositionReason
          : "";
      const sourceHierarchyNodeCount = readUserDataNumber(
        part.userData?.creatureEquipmentModelPartSourceHierarchyNodeCount
      );
      const synthesizedNodeCount = readUserDataNumber(
        part.userData?.creatureEquipmentModelPartSourceHierarchySynthesizedNodeCount
      );
      const reparentedNodeCount = readUserDataNumber(
        part.userData?.creatureEquipmentModelPartSourceHierarchyReparentedNodeCount
      );
      const rebasedGeometryCount = readUserDataNumber(
        part.userData?.creatureEquipmentModelPartSourceHierarchyRebasedGeometryCount
      );
      const runtimeSourceHierarchyNodeNames = readUserDataStringArray(
        part.userData?.creatureEquipmentModelPartRuntimeSourceHierarchyNodeNames
      );
      partCompositionStatuses.push(`${partName}:${compositionStatus}`);
      partCompositionReasons.push(`${partName}:${compositionReason}`);
      partSourceHierarchyStats.push(
        `${partName}:nodes=${sourceHierarchyNodeCount},synth=${synthesizedNodeCount},reparent=${reparentedNodeCount},rebased=${rebasedGeometryCount},runtime=${runtimeSourceHierarchyNodeNames.length}`
      );
      partRuntimeSourceHierarchyNodeNames.push(
        `${partName}:${runtimeSourceHierarchyNodeNames.slice(0, 16).join(",")}`
      );
    }
    const target =
      typeof part.userData?.creatureEquipmentModelPartAttachmentTarget === "string"
        ? part.userData.creatureEquipmentModelPartAttachmentTarget
        : "";
    part.traverse((node) => {
      if (!(node instanceof THREE.Mesh) || visitedMeshes.has(node)) {
        return;
      }
      visitedMeshes.add(node);
      if (!isCreatureRuntimeNodeEffectivelyVisible(node)) {
        return;
      }
      visibleNames.push(node.name || part.name || "(unnamed)");
      visibleTargets.push(target || "none");
      if (visibleCenters.length < 32) {
        const box = new THREE.Box3().setFromObject(node);
        if (!box.isEmpty()) {
          const center = new THREE.Vector3();
          const size = new THREE.Vector3();
          box.getCenter(center);
          box.getSize(size);
          visibleCenters.push(
            `${target || node.name || "mesh"}:${formatCreatureRuntimeVector(center)}`
          );
          visibleSizes.push(
            `${node.name || part.name || "mesh"}:${formatCreatureRuntimeVector(size)}`
          );
          visibleParentPaths.push(
            `${node.name || part.name || "mesh"}:${formatCreatureRuntimeNodePath(
              node,
              root
            )}`
          );
        }
      }
    });
  });

  return {
    visibleMeshCount: visibleNames.length,
    visibleMeshNames: visibleNames.slice(0, 48).join("|"),
    visibleMeshSlots: visibleTargets.slice(0, 48).join("|"),
    visibleMeshCenters: visibleCenters.join("|"),
    visibleMeshSizes: visibleSizes.slice(0, 48).join("|"),
    visibleMeshParentPaths: visibleParentPaths.slice(0, 48).join("|"),
    itemGroupCount: itemGroups.length,
    itemGroupBounds: itemGroupBounds.join("|"),
    itemGroupWeaponScales: itemGroupWeaponScales.join("|"),
    itemGroupWeaponScaleSources: itemGroupWeaponScaleSources.join("|"),
    itemGroupAttachmentTargets: itemGroupAttachmentTargets.join("|"),
    itemGroupResolvedAnchors: itemGroupResolvedAnchors.join("|"),
    itemGroupResolvedAnchorSources: itemGroupResolvedAnchorSources.join("|"),
    itemGroupParentPaths: itemGroupParentPaths.join("|"),
    itemGroupSourceAnimationStatuses: itemGroupSourceAnimationStatuses.join("|"),
    itemGroupSourceAnimationClipNames: itemGroupSourceAnimationClipNames.join("|"),
    itemGroupSourceAnimationLoopModes: itemGroupSourceAnimationLoopModes.join("|"),
    itemGroupSourceAnimationRecoveryPoseClipNames:
      itemGroupSourceAnimationRecoveryPoseClipNames.join("|"),
    itemGroupSourceAnimationRecoveryPoseCandidateNames:
      itemGroupSourceAnimationRecoveryPoseCandidateNames.join("|"),
    itemGroupSourceAnimationRecoveryPoseFallbacks:
      itemGroupSourceAnimationRecoveryPoseFallbacks.join("|"),
    itemGroupSourceAnimationRecoveryPoseFallbackReasons:
      itemGroupSourceAnimationRecoveryPoseFallbackReasons.join("|"),
    itemGroupSourceAnimationRecoveryPoseSkippedReasons:
      itemGroupSourceAnimationRecoveryPoseSkippedReasons.join("|"),
    partCompositionStatuses: partCompositionStatuses.join("|"),
    partCompositionReasons: partCompositionReasons.join("|"),
    partSourceHierarchyStats: partSourceHierarchyStats.join("|"),
    partRuntimeSourceHierarchyNodeNames: partRuntimeSourceHierarchyNodeNames.join("|"),
    runtimeAmmunitionProxyAimSources: ammunitionAimSources.join("|"),
    runtimeAmmunitionProxyAimModes: ammunitionAimModes.join("|"),
    runtimeAmmunitionProxyAimNodeNames: ammunitionAimNodeNames.join("|"),
    runtimeAmmunitionProxyOrigins: ammunitionAimOrigins.join("|"),
    runtimeAmmunitionProxyDirections: ammunitionAimDirections.join("|"),
    runtimeAmmunitionProxyCrossbowMeshAxes: ammunitionCrossbowMeshAxes.join("|"),
    runtimeAmmunitionProxyCrossbowAxisDots: ammunitionCrossbowAxisDots.join("|"),
    runtimeAmmunitionProxyCrossbowAxisSelections:
      ammunitionCrossbowAxisSelections.join("|"),
    loosePartRootCount: loosePartRootNames.length,
    loosePartRootNames: loosePartRootNames.slice(0, 48).join("|")
  };
}

function resolveCreaturePlayerBodyPartPrefix(value: string | undefined): string {
  const normalized = normalizeCreatureNodeName(value ?? "");
  const match = normalized.match(/^(p[a-z][a-z]\d+)_/iu);
  return match?.[1] ?? "";
}

function resolveDominantCreaturePartModelPrefix(
  loadedEntries: LoadedCreaturePartModelEntry[]
): string {
  const counts = new Map<string, number>();
  loadedEntries.forEach(({ entry }) => {
    const prefix = resolveCreaturePlayerBodyPartPrefix(entry.modelResRef);
    if (!prefix) {
      return;
    }
    counts.set(prefix, (counts.get(prefix) ?? 0) + 1);
  });
  return (
    Array.from(counts.entries()).sort((left, right) => right[1] - left[1])[0]?.[0] ?? ""
  );
}

function resolveCreaturePartSkeletonAnchorCoverage(
  skeletonModel: THREE.Object3D,
  loadedEntries: LoadedCreaturePartModelEntry[]
): { coveredCount: number; targetCount: number } {
  const anchors = collectCreatureSkeletonAnchors(skeletonModel);
  const targets = new Set(
    resolveCreaturePartAssemblyAttachmentTargets(loadedEntries).map((target) =>
      normalizeCreatureNodeName(target)
    )
  );
  let coveredCount = 0;
  targets.forEach((target) => {
    if (target && anchors.has(target)) {
      coveredCount += 1;
    }
  });
  return {
    coveredCount,
    targetCount: Array.from(targets).filter((target) => target.length > 0).length
  };
}

function resolveCreaturePartSkeletonCompatibility(
  skeletonModel: THREE.Object3D | null,
  skeletonResolution: CreatureRenderSkeletonModelResolution | null,
  loadedEntries: LoadedCreaturePartModelEntry[]
): CreaturePartSkeletonCompatibilityResult {
  if (!skeletonModel || !skeletonResolution) {
    return {
      compatible: false,
      status: "no-skeleton",
      skeletonPrefix: "",
      dominantPartPrefix: ""
    };
  }
  const skeletonPrefix = normalizeCreatureNodeName(skeletonResolution.resref);
  const dominantPartPrefix = resolveDominantCreaturePartModelPrefix(loadedEntries);
  if (!dominantPartPrefix) {
    return {
      compatible: true,
      status: "no-player-part-prefix",
      skeletonPrefix,
      dominantPartPrefix
    };
  }
  const compatible = skeletonPrefix === dominantPartPrefix;
  if (!compatible) {
    const anchorCoverage = resolveCreaturePartSkeletonAnchorCoverage(
      skeletonModel,
      loadedEntries
    );
    const anchorCoveragePrefixStatus = resolveCreaturePartAnchorCoveragePrefixStatus(
      skeletonPrefix,
      dominantPartPrefix
    );
    const canUseAnchorCoverageCompatibility =
      anchorCoveragePrefixStatus !== "rejected" &&
      (skeletonModel.userData?.creatureSourceMdlAnchorSkeletonStatus === "synthesized" ||
        skeletonModel.userData?.creatureSourceMdlAnchorSkeletonStatus === "native" ||
        skeletonModel.userData?.creatureSourceMdlAnchorSkeletonStatus ===
          "synthetic-part-targets");
    if (
      canUseAnchorCoverageCompatibility &&
      anchorCoverage.targetCount > 0 &&
      anchorCoverage.coveredCount === anchorCoverage.targetCount
    ) {
      return {
        compatible: true,
        status:
          anchorCoveragePrefixStatus === "mounted-phenotype"
            ? "compatible-mounted-phenotype-anchors"
            : "compatible-by-anchor-coverage",
        skeletonPrefix,
        dominantPartPrefix,
        anchorCoveredCount: anchorCoverage.coveredCount,
        anchorTargetCount: anchorCoverage.targetCount
      };
    }
    return {
      compatible: false,
      status: "part-prefix-mismatch",
      skeletonPrefix,
      dominantPartPrefix,
      anchorCoveredCount: anchorCoverage.coveredCount,
      anchorTargetCount: anchorCoverage.targetCount
    };
  }
  return {
    compatible,
    status: "compatible",
    skeletonPrefix,
    dominantPartPrefix,
    anchorCoveredCount: undefined,
    anchorTargetCount: undefined
  };
}

function resolveCreaturePartAnchorCoveragePrefixStatus(
  skeletonPrefix: string,
  dominantPartPrefix: string
): "same-family" | "mounted-phenotype" | "rejected" {
  const skeleton = parseCreaturePlayerPartPrefix(skeletonPrefix);
  const dominant = parseCreaturePlayerPartPrefix(dominantPartPrefix);
  if (!skeleton || !dominant) {
    return "rejected";
  }
  if (skeleton.family !== dominant.family) {
    return "rejected";
  }
  if (skeleton.phenotype === dominant.phenotype) {
    return "same-family";
  }
  if (skeleton.phenotype === 3 && dominant.phenotype === 0) {
    return "mounted-phenotype";
  }
  return "same-family";
}

function parseCreaturePlayerPartPrefix(
  value: string
): { family: string; phenotype: number } | null {
  const match = value.trim().toLowerCase().match(/^(p[mf][a-z])(\d+)$/u);
  if (!match) {
    return null;
  }
  const phenotype = Number.parseInt(match[2] ?? "", 10);
  if (!Number.isFinite(phenotype)) {
    return null;
  }
  return {
    family: match[1] ?? "",
    phenotype
  };
}

function shouldKeepCreatureSkeletonForAnchorsOnly(
  skeletonCompatibility: CreaturePartSkeletonCompatibilityResult
): boolean {
  if (skeletonCompatibility.compatible) {
    return false;
  }
  if ((skeletonCompatibility.anchorCoveredCount ?? 0) < 1) {
    return false;
  }
  const skeleton = parseCreaturePlayerPartPrefix(skeletonCompatibility.skeletonPrefix);
  const dominant = parseCreaturePlayerPartPrefix(skeletonCompatibility.dominantPartPrefix);
  return Boolean(skeleton && dominant && skeleton.family === dominant.family);
}

function resolveCreaturePartLateralLane(slot: string): -1 | 0 | 1 {
  if (slot.startsWith("l")) {
    return -1;
  }
  if (slot.startsWith("r")) {
    return 1;
  }
  return 0;
}

function normalizeCreatureNodeName(value: string): string {
  const normalized = value.trim().toLowerCase();
  const handAliasMatch = normalized.match(/^([lr]hand_g)\d+$/u);
  return handAliasMatch?.[1] ?? normalized;
}

function findCreatureRuntimeNodeByNormalizedName(
  root: THREE.Object3D,
  nodeName: string
): THREE.Object3D | null {
  const exact = root.getObjectByName(nodeName);
  if (exact) {
    return exact;
  }
  const normalizedTarget = normalizeCreatureNodeName(nodeName);
  let match: THREE.Object3D | null = null;
  root.traverse((node) => {
    if (!match && normalizeCreatureNodeName(node.name) === normalizedTarget) {
      match = node;
    }
  });
  return match;
}

function findCreatureRuntimeNodesByNormalizedName(
  root: THREE.Object3D,
  nodeName: string
): THREE.Object3D[] {
  const normalizedTarget = normalizeCreatureNodeName(nodeName);
  const matches: THREE.Object3D[] = [];
  root.traverse((node) => {
    if (normalizeCreatureNodeName(node.name) === normalizedTarget) {
      matches.push(node);
    }
  });
  return matches;
}

function formatCreatureRuntimeNodePath(
  node: THREE.Object3D,
  stopAt?: THREE.Object3D
): string {
  const names: string[] = [];
  let current: THREE.Object3D | null = node;
  while (current) {
    names.push(current.name || "(unnamed)");
    if (stopAt && current === stopAt) {
      break;
    }
    current = current.parent;
  }
  return names.join("<-");
}

function findCreatureRuntimeNodeByNormalizedNames(
  root: THREE.Object3D,
  nodeNames: readonly string[]
): THREE.Object3D | null {
  for (const nodeName of nodeNames) {
    const match = findCreatureRuntimeNodeByNormalizedName(root, nodeName);
    if (match) {
      return match;
    }
  }
  return null;
}

function isCreatureEmptyDriverModelResRef(value: string | null | undefined): boolean {
  return normalizeCreatureNodeName(value ?? "") === "c_gennode";
}

function collectCreatureSkeletonAnchors(
  skeletonModel: THREE.Object3D
): Map<string, THREE.Object3D> {
  const anchors = new Map<string, THREE.Object3D>();
  skeletonModel.traverse((node) => {
    const normalizedName = normalizeCreatureNodeName(node.name);
    if (normalizedName.length > 0 && !anchors.has(normalizedName)) {
      anchors.set(normalizedName, node);
    }
  });
  return anchors;
}

function collectCreatureEquipmentAttachmentAnchors(
  root: THREE.Object3D
): Map<string, THREE.Object3D> {
  const anchors = collectCreatureSkeletonAnchors(root);
  root.traverse((node) => {
    if (node.userData?.creaturePartAssemblyAttachmentAnchor !== true) {
      return;
    }
    const normalizedName = normalizeCreatureNodeName(node.name);
    if (normalizedName.length > 0) {
      anchors.set(normalizedName, node);
    }
  });
  return anchors;
}

function addCreaturePartAssemblyAttachmentAnchors(
  partGroup: THREE.Group,
  loadedEntries: LoadedCreaturePartModelEntry[],
  assemblyMode: CreaturePartAssemblyResult["mode"]
): Record<string, unknown> {
  const anchoredTargets: string[] = [];
  partGroup.updateMatrixWorld(true);
  loadedEntries.forEach(({ entry, model }) => {
    const target = resolveCreaturePartAttachmentTarget(entry);
    if (!target) {
      return;
    }
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    if (box.isEmpty()) {
      return;
    }
    const worldCenter = new THREE.Vector3();
    box.getCenter(worldCenter);
    const anchor = new THREE.Group();
    anchor.name = target;
    anchor.position.copy(partGroup.worldToLocal(worldCenter.clone()));
    anchor.userData = {
      creaturePartAssemblyAttachmentAnchor: true,
      creaturePartAssemblyAttachmentAnchorMode: assemblyMode,
      creaturePartAssemblyAttachmentAnchorSlot: entry.slot,
      creaturePartAssemblyAttachmentAnchorTarget: target,
      creaturePartAssemblyAttachmentAnchorWorldCenter:
        formatCreatureRuntimeVector(worldCenter)
    };
    partGroup.add(anchor);
    anchoredTargets.push(target);
  });
  return {
    creaturePartAssemblyAttachmentAnchorStatus:
      anchoredTargets.length > 0 ? "part-centers" : "none",
    creaturePartAssemblyAttachmentAnchorCount: anchoredTargets.length,
    creaturePartAssemblyAttachmentAnchorTargets: anchoredTargets
  };
}

function mapCreatureSourceMdlPositionToThree(
  position: [number, number, number] | undefined
): THREE.Vector3 {
  if (!position) {
    return new THREE.Vector3();
  }
  const [x, y, z] = position;
  return new THREE.Vector3(x, z, y);
}

function mapCreatureSourceMdlOrientationToThree(
  orientation: [number, number, number, number] | undefined,
  sourceModelFormat: string,
  orientationFormat?: "axis-angle" | "quaternion"
): THREE.Quaternion | null {
  if (!orientation) {
    return null;
  }

  const [x, y, z, w] = orientation;
  if (![x, y, z, w].every(Number.isFinite)) {
    return null;
  }

  if (orientationFormat === "axis-angle" || (!orientationFormat && sourceModelFormat === "aurora-mdl-ascii")) {
    const axis = new THREE.Vector3(-x, -z, -y);
    if (axis.lengthSq() <= 1e-12 || Math.abs(w) <= 1e-12) {
      return new THREE.Quaternion();
    }
    return new THREE.Quaternion().setFromAxisAngle(axis.normalize(), w).normalize();
  }

  const sourceQuaternionLengthSq = x * x + y * y + z * z + w * w;
  if (sourceQuaternionLengthSq <= 1e-12) {
    return new THREE.Quaternion();
  }
  return new THREE.Quaternion(-x, -z, -y, w).normalize();
}

function augmentCreatureSkeletonWithSourceMdlAnchors(
  skeletonModel: THREE.Object3D,
  payload: CreatureViewportRenderPayload | null | undefined,
  skeletonResRef: string | undefined
): Record<string, unknown> {
  const existingAnchors = collectCreatureSkeletonAnchors(skeletonModel);
  if (existingAnchors.size > 1) {
    const userData = {
      creatureSourceMdlAnchorSkeletonStatus: "native",
      creatureSourceMdlAnchorSkeletonNodeCount: existingAnchors.size
    };
    skeletonModel.userData = {
      ...skeletonModel.userData,
      ...userData
    };
    return userData;
  }

  const normalizedSkeletonResRef = normalizeCreatureNodeName(skeletonResRef ?? "");
  const inspectionModel = (payload?.renderPackage?.sourceMdlInspection?.models ?? []).find(
    (model) =>
      model.nodes.length > 0 &&
      normalizeCreatureNodeName(model.modelName) === normalizedSkeletonResRef
  );
  if (!inspectionModel) {
    return {
      creatureSourceMdlAnchorSkeletonStatus: "missing",
      creatureSourceMdlAnchorSkeletonNodeCount: 0
    };
  }

  const nodesByName = new Map<string, THREE.Object3D>();
  let orientationCount = 0;
  inspectionModel.nodes.forEach((sourceNode) => {
    const normalizedName = normalizeCreatureNodeName(sourceNode.name);
    if (!normalizedName || nodesByName.has(normalizedName)) {
    return;
  }
  const anchor = new THREE.Group();
  anchor.name = sourceNode.name;
  anchor.position.copy(mapCreatureSourceMdlPositionToThree(sourceNode.position));
  const anchorOrientation = mapCreatureSourceMdlOrientationToThree(
    sourceNode.orientation,
      inspectionModel.source,
      sourceNode.orientationFormat
  );
    if (anchorOrientation) {
      anchor.quaternion.copy(anchorOrientation);
      orientationCount += 1;
    }
    anchor.userData = {
      creatureSourceMdlAnchor: true,
      creatureSourceMdlAnchorModelName: inspectionModel.modelName,
      creatureSourceMdlAnchorNodeType: sourceNode.nodeType,
      creatureSourceMdlAnchorParentName: sourceNode.parentName ?? "",
      ...(sourceNode.orientation
        ? {
            creatureSourceMdlAnchorOrientation: [...sourceNode.orientation],
            creatureSourceMdlAnchorOrientationFormat: sourceNode.orientationFormat
          }
        : {})
    };
    nodesByName.set(normalizedName, anchor);
  });

  inspectionModel.nodes.forEach((sourceNode) => {
    const anchor = nodesByName.get(normalizeCreatureNodeName(sourceNode.name));
    if (!anchor) {
      return;
    }
    const parent = sourceNode.parentName
      ? nodesByName.get(normalizeCreatureNodeName(sourceNode.parentName))
      : undefined;
    (parent ?? skeletonModel).add(anchor);
  });

  const userData = {
    creatureSourceMdlAnchorSkeletonStatus: nodesByName.size > 0 ? "synthesized" : "empty",
    creatureSourceMdlAnchorSkeletonModelName: inspectionModel.modelName,
    creatureSourceMdlAnchorSkeletonNodeCount: nodesByName.size,
    creatureSourceMdlAnchorSkeletonOrientationCount: orientationCount
  };
  skeletonModel.userData = {
    ...skeletonModel.userData,
    ...userData
  };
  return userData;
}

function resolveCreatureFallbackSkeletonCandidate(
  payload: CreatureViewportRenderPayload | null | undefined,
  skeletonResolution: CreatureRenderSkeletonModelResolution | null
): CreatureSkeletonModelCandidate | null {
  const candidates = payload?.renderPackage?.skeletonModelCandidates ?? [];
  if (candidates.length === 0) {
    return null;
  }
  const resolutionResRef = normalizeCreatureNodeName(skeletonResolution?.resref ?? "");
  if (resolutionResRef) {
    return (
      candidates.find(
        (candidate) => normalizeCreatureNodeName(candidate.resref) === resolutionResRef
      ) ?? candidates[0] ?? null
    );
  }
  return (
    candidates.find((candidate) => !(candidate.glbUrl || candidate.modelUrl)) ??
    candidates[0] ??
    null
  );
}

function buildCreatureFallbackSkeletonResolution(
  payload: CreatureViewportRenderPayload,
  candidate: CreatureSkeletonModelCandidate,
  skeletonResolution: CreatureRenderSkeletonModelResolution | null
): CreatureRenderSkeletonModelResolution {
  if (skeletonResolution) {
    return skeletonResolution;
  }
  const assetKey =
    candidate.assetId?.trim() || candidate.resref.trim() || candidate.modelPrefix.trim() || "base";
  return {
    resref: candidate.resref,
    modelUrl: "",
    modelCacheKey: `creature:${payload.cacheKey}:skeleton-source:${assetKey}`,
    ...(candidate.assetId ? { assetId: candidate.assetId } : {}),
    ...(candidate.supermodelResRef ? { supermodelResRef: candidate.supermodelResRef } : {}),
    ...(candidate.supermodelAssetId ? { supermodelAssetId: candidate.supermodelAssetId } : {})
  };
}

function augmentCreatureSkeletonWithSyntheticPartTargetAnchors(
  skeletonModel: THREE.Object3D,
  loadedEntries: LoadedCreaturePartModelEntry[],
  skeletonResRef: string
): Record<string, unknown> {
  const targets = new Set(
    resolveCreaturePartAssemblyAttachmentTargets(loadedEntries)
      .map((target) => normalizeCreatureNodeName(target))
      .filter(Boolean)
  );
  if (targets.size === 0) {
    return {
      creatureSourceMdlAnchorSkeletonStatus: "missing",
      creatureSourceMdlAnchorSkeletonNodeCount: 0,
      creatureSyntheticPartTargetAnchorCount: 0
    };
  }

  const nodesByName = new Map<string, THREE.Object3D>();
  CREATURE_SYNTHETIC_HUMANOID_SKELETON_NODES.forEach((sourceNode) => {
    const anchor = new THREE.Group();
    anchor.name = sourceNode.name;
    anchor.position.copy(mapCreatureSourceMdlPositionToThree(sourceNode.sourcePosition));
    anchor.userData = {
      creatureSourceMdlAnchor: true,
      creatureSyntheticPartTargetAnchor: true,
      creatureSourceMdlAnchorModelName: skeletonResRef,
      creatureSourceMdlAnchorNodeType: "synthetic-dummy",
      creatureSourceMdlAnchorParentName: sourceNode.parentName ?? ""
    };
    nodesByName.set(normalizeCreatureNodeName(sourceNode.name), anchor);
  });

  CREATURE_SYNTHETIC_HUMANOID_SKELETON_NODES.forEach((sourceNode) => {
    const anchor = nodesByName.get(normalizeCreatureNodeName(sourceNode.name));
    if (!anchor) {
      return;
    }
    const parent = sourceNode.parentName
      ? nodesByName.get(normalizeCreatureNodeName(sourceNode.parentName))
      : undefined;
    (parent ?? skeletonModel).add(anchor);
  });

  let coveredCount = 0;
  targets.forEach((target) => {
    if (nodesByName.has(target)) {
      coveredCount += 1;
    }
  });
  const userData = {
    creatureSourceMdlAnchorSkeletonStatus: "synthetic-part-targets",
    creatureSourceMdlAnchorSkeletonModelName: skeletonResRef,
    creatureSourceMdlAnchorSkeletonNodeCount: nodesByName.size,
    creatureSourceMdlAnchorSkeletonOrientationCount: 0,
    creatureSyntheticPartTargetAnchorCount: nodesByName.size,
    creatureSyntheticPartTargetAnchorCoveredCount: coveredCount,
    creatureSyntheticPartTargetAnchorTargetCount: targets.size
  };
  skeletonModel.userData = {
    ...skeletonModel.userData,
    ...userData
  };
  return userData;
}

function createCreatureFallbackSkeletonFromSourceAnchors(input: {
  payload: CreatureViewportRenderPayload | null | undefined;
  loadedEntries: LoadedCreaturePartModelEntry[];
  skeletonResolution: CreatureRenderSkeletonModelResolution | null;
  overrideSkeletonResRef?: string;
}): {
  model: THREE.Object3D;
  resolution: CreatureRenderSkeletonModelResolution;
  userData: Record<string, unknown>;
} | null {
  const { payload, loadedEntries, skeletonResolution, overrideSkeletonResRef } = input;
  if (!payload) {
    return null;
  }
  const candidate = resolveCreatureFallbackSkeletonCandidate(payload, skeletonResolution);
  if (!candidate) {
    return null;
  }

  const resolution = buildCreatureFallbackSkeletonResolution(
    payload,
    overrideSkeletonResRef
      ? {
          ...candidate,
          resref: overrideSkeletonResRef,
          modelPrefix: `${overrideSkeletonResRef}_`
        }
      : candidate,
    overrideSkeletonResRef ? null : skeletonResolution
  );
  const skeletonModel = new THREE.Group();
  skeletonModel.name = `${resolution.resref}:source-anchor-skeleton`;
  const sourceMdlAnchorUserData = augmentCreatureSkeletonWithSourceMdlAnchors(
    skeletonModel,
    payload,
    resolution.resref
  );
  if (sourceMdlAnchorUserData.creatureSourceMdlAnchorSkeletonStatus === "synthesized") {
    return {
      model: skeletonModel,
      resolution,
      userData: sourceMdlAnchorUserData
    };
  }

  const syntheticPartTargetUserData = augmentCreatureSkeletonWithSyntheticPartTargetAnchors(
    skeletonModel,
    loadedEntries,
    resolution.resref
  );
  const coveredCount =
    typeof syntheticPartTargetUserData.creatureSyntheticPartTargetAnchorCoveredCount === "number"
      ? syntheticPartTargetUserData.creatureSyntheticPartTargetAnchorCoveredCount
      : 0;
  const targetCount =
    typeof syntheticPartTargetUserData.creatureSyntheticPartTargetAnchorTargetCount === "number"
      ? syntheticPartTargetUserData.creatureSyntheticPartTargetAnchorTargetCount
      : 0;
  if (
    syntheticPartTargetUserData.creatureSourceMdlAnchorSkeletonStatus ===
      "synthetic-part-targets" &&
    targetCount > 0 &&
    coveredCount === targetCount
  ) {
    return {
      model: skeletonModel,
      resolution,
      userData: syntheticPartTargetUserData
    };
  }

  return null;
}

function resolveCreatureEquipmentAttachmentTarget(
  candidate: CreatureEquipmentModelCandidate
): string {
  return (
    candidate.primaryAttachmentTarget?.trim() ||
    candidate.attachmentTargets.find((target) => target.trim().length > 0)?.trim() ||
    "rootdummy"
  );
}

function resolveCreatureEquipmentFallbackPosition(
  target: string,
  objectRadius: number,
  index: number
): THREE.Vector3 {
  const radius = Math.max(objectRadius, 0.12);
  const normalizedTarget = normalizeCreatureNodeName(target);
  const sideJitter = ((index % 3) - 1) * radius * 0.11;
  if (normalizedTarget.includes("rhand")) {
    return new THREE.Vector3(radius * 0.58, radius * 0.84 + sideJitter, 0);
  }
  if (normalizedTarget.includes("lhand")) {
    return new THREE.Vector3(-radius * 0.58, radius * 0.84 + sideJitter, 0);
  }
  if (normalizedTarget.includes("head")) {
    return new THREE.Vector3(0, radius * 1.42 + sideJitter, 0);
  }
  if (normalizedTarget.includes("foot")) {
    return new THREE.Vector3(
      normalizedTarget.includes("lfoot") ? -radius * 0.26 : radius * 0.26,
      radius * 0.16,
      sideJitter
    );
  }
  if (normalizedTarget.includes("forearm")) {
    return new THREE.Vector3(
      normalizedTarget.includes("lforearm") ? -radius * 0.46 : radius * 0.46,
      radius * 0.72 + sideJitter,
      0
    );
  }
  if (normalizedTarget.includes("belt")) {
    return new THREE.Vector3(0, radius * 0.54 + sideJitter, radius * 0.22);
  }
  if (normalizedTarget.includes("neck")) {
    return new THREE.Vector3(0, radius * 1.08 + sideJitter, 0);
  }
  if (normalizedTarget.includes("torso")) {
    return new THREE.Vector3(0, radius * 0.82 + sideJitter, radius * 0.18);
  }
  return new THREE.Vector3(0, radius * 0.74 + sideJitter, 0);
}

function resolveCreatureEquipmentAssemblyAnchor(
  anchors: Map<string, THREE.Object3D>,
  target: string,
  assembly: CreatureEquipmentModelPartAssembly
): THREE.Object3D | undefined {
  const normalizedTarget = normalizeCreatureNodeName(target);
  if (
    isCreatureHeldWeaponEquipmentAssembly(assembly) &&
    !isCreatureHandheldShieldEquipmentAssembly(assembly)
  ) {
    if (normalizedTarget === "lhand_g" || normalizedTarget === "lhand") {
      const leftHandHook = anchors.get("lhand");
      if (leftHandHook) {
        return leftHandHook;
      }
    }
    if (normalizedTarget === "rhand_g" || normalizedTarget === "rhand") {
      const rightHandHook = anchors.get("rhand");
      if (rightHandHook) {
        return rightHandHook;
      }
    }
  }
  return anchors.get(normalizedTarget);
}

function createCreatureEquipmentMarkerMesh(
  candidate: CreatureEquipmentModelCandidate,
  target: string,
  objectRadius: number,
  index: number
): THREE.Mesh {
  const markerWidth = Math.max(objectRadius * 0.16, 0.05);
  const markerHeight = Math.max(objectRadius * 0.5, 0.14);
  const markerDepth = Math.max(objectRadius * 0.08, 0.035);
  const marker = new THREE.Mesh(
    new THREE.BoxGeometry(markerWidth, markerHeight, markerDepth),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color("#f6c45f"),
      transparent: true,
      opacity: 0.86,
      depthWrite: false
    })
  );
  marker.name = `creature_equipment_marker_${candidate.resref}_${index}`;
  marker.renderOrder = 13;
  marker.raycast = () => undefined;
  marker.userData = {
    ...marker.userData,
    creatureEquipmentMarkerStatus: "source-equipment-marker",
    creatureEquipmentMarkerResRef: candidate.resref,
    creatureEquipmentMarkerItemName: candidate.itemName ?? "",
    creatureEquipmentMarkerSlotMask: candidate.slotMask ?? null,
    creatureEquipmentMarkerSlotLabels: candidate.slotLabels,
    creatureEquipmentMarkerAttachmentTarget: target,
    creatureEquipmentMarkerSource: candidate.source,
    creatureEquipmentMarkerSourceModelStatus: candidate.sourceModelStatus,
    creatureEquipmentMarkerModelType: candidate.itemModelType ?? "",
    creatureEquipmentMarkerModelParts: candidate.itemModelParts ?? [],
    creatureEquipmentMarkerModelPartRoles: candidate.itemModelPartRoles ?? [],
    creatureEquipmentMarkerModelPartResRefs: candidate.itemModelPartResRefs ?? [],
    creatureEquipmentMarkerModelPartUrls:
      candidate.itemModelPartCandidates
        ?.map((part) => part.glbUrl ?? part.modelUrl)
        .filter((value): value is string => Boolean(value)) ?? []
  };
  return marker;
}

function disposeCreatureEquipmentMarkerNode(node: THREE.Object3D): void {
  node.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      disposeMeshResources(child);
    }
  });
}

function removeCreatureEquipmentMarkers(root: THREE.Object3D): void {
  const markerNodes: THREE.Object3D[] = [];
  root.traverse((node) => {
    if (
      node !== root &&
      node.userData?.creatureEquipmentMarkerStatus === "source-equipment-marker"
    ) {
      markerNodes.push(node);
    }
  });
  markerNodes.forEach((node) => {
    node.parent?.remove(node);
    disposeCreatureEquipmentMarkerNode(node);
  });
  const emptyGroups: THREE.Object3D[] = [];
  root.traverse((node) => {
    if (
      node !== root &&
      node.userData?.creatureEquipmentMarkerGroupStatus === "source-equipment-markers" &&
      node.children.length === 0
    ) {
      emptyGroups.push(node);
    }
  });
  emptyGroups.forEach((node) => node.parent?.remove(node));
}

interface CreatureEquipmentMarkerOptions {
  showDiagnosticMarkers?: boolean;
}

function applyCreatureEquipmentMarkers(
  root: THREE.Object3D,
  payload: CreatureViewportRenderPayload | null | undefined,
  objectRadius: number,
  options: CreatureEquipmentMarkerOptions = {}
): Record<string, unknown> {
  removeCreatureEquipmentMarkers(root);
  const candidates = payload?.renderPackage?.equipmentModelCandidates ?? [];
  if (candidates.length === 0) {
    const emptyMarkerUserData = {
      creatureEquipmentMarkerStatus: "not-applicable",
      creatureEquipmentMarkerCount: 0,
      creatureEquipmentMarkerAnchoredCount: 0,
      creatureEquipmentMarkerFallbackCount: 0
    };
    root.userData = {
      ...root.userData,
      ...emptyMarkerUserData
    };
    return emptyMarkerUserData;
  }

  const targets = candidates.map(resolveCreatureEquipmentAttachmentTarget);
  const markerModelPartUrlReadyCount = candidates.reduce(
    (count, candidate) =>
      count +
      (candidate.itemModelPartCandidates?.filter((part) => part.glbUrl || part.modelUrl)
        .length ?? 0),
    0
  );
  const markerMetadata = {
    creatureEquipmentMarkerCount: candidates.length,
    creatureEquipmentMarkerResRefs: candidates.map((candidate) => candidate.resref),
    creatureEquipmentMarkerSlotLabels: candidates.map(
      (candidate) => candidate.slotLabels.join("/") || "unknown"
    ),
    creatureEquipmentMarkerAttachmentTargets: targets,
    creatureEquipmentMarkerModelParts: candidates.map((candidate) => candidate.itemModelParts ?? []),
    creatureEquipmentMarkerModelPartRoles: candidates.map(
      (candidate) => candidate.itemModelPartRoles ?? []
    ),
    creatureEquipmentMarkerModelPartResRefs: candidates.map(
      (candidate) => candidate.itemModelPartResRefs ?? []
    ),
    creatureEquipmentMarkerModelPartUrlReadyCount: markerModelPartUrlReadyCount
  };

  if (!options.showDiagnosticMarkers) {
    const suppressedMarkerUserData = {
      creatureEquipmentMarkerStatus: "suppressed",
      creatureEquipmentMarkerMode: "diagnostics-only",
      creatureEquipmentMarkerAnchoredCount: 0,
      creatureEquipmentMarkerFallbackCount: 0,
      ...markerMetadata
    };
    root.userData = {
      ...root.userData,
      ...suppressedMarkerUserData
    };
    return suppressedMarkerUserData;
  }

  const anchors = collectCreatureSkeletonAnchors(root);
  const fallbackGroup = new THREE.Group();
  fallbackGroup.name = "creature_equipment_markers";
  fallbackGroup.userData = {
    ...fallbackGroup.userData,
    creatureEquipmentMarkerGroupStatus: "source-equipment-markers"
  };

  let anchoredCount = 0;
  let fallbackCount = 0;
  candidates.forEach((candidate, index) => {
    const target = targets[index] ?? resolveCreatureEquipmentAttachmentTarget(candidate);
    const marker = createCreatureEquipmentMarkerMesh(candidate, target, objectRadius, index);
    const anchor = anchors.get(normalizeCreatureNodeName(target));
    if (anchor) {
      marker.position.set(0, 0, 0);
      marker.userData = {
        ...marker.userData,
        creatureEquipmentMarkerMode: "skeleton-anchor",
        creatureEquipmentMarkerSkeletonAnchorName: anchor.name
      };
      anchor.add(marker);
      anchoredCount += 1;
      return;
    }
    marker.position.copy(resolveCreatureEquipmentFallbackPosition(target, objectRadius, index));
    marker.userData = {
      ...marker.userData,
      creatureEquipmentMarkerMode: "fallback-offset"
    };
    fallbackGroup.add(marker);
    fallbackCount += 1;
  });

  if (fallbackGroup.children.length > 0) {
    root.add(fallbackGroup);
  }

  const markerMode =
    anchoredCount > 0 && fallbackCount === 0
      ? "skeleton-anchors"
      : anchoredCount > 0
        ? "mixed"
        : "fallback-offsets";
  const markerUserData = {
    creatureEquipmentMarkerStatus: "source-equipment-marker",
    creatureEquipmentMarkerMode: markerMode,
    creatureEquipmentMarkerAnchoredCount: anchoredCount,
    creatureEquipmentMarkerFallbackCount: fallbackCount,
    ...markerMetadata
  };
  root.userData = {
    ...root.userData,
    ...markerUserData
  };
  return markerUserData;
}

function removeCreatureEquipmentItemPropertyLights(root: THREE.Object3D): void {
  const lightNodes: THREE.Object3D[] = [];
  root.traverse((node) => {
    if (
      node !== root &&
      node.userData?.creatureEquipmentItemPropertyLightGroupStatus ===
        CREATURE_EQUIPMENT_ITEM_PROPERTY_LIGHT_GROUP_STATUS
    ) {
      lightNodes.push(node);
    }
  });
  const topLevelNodes = lightNodes.filter((node) => {
    let parent = node.parent;
    while (parent && parent !== root) {
      if (lightNodes.includes(parent)) {
        return false;
      }
      parent = parent.parent;
    }
    return true;
  });
  topLevelNodes.forEach((node) => {
    node.parent?.remove(node);
    node.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        disposeMeshResources(child);
      }
    });
  });
}

function createCreatureEquipmentItemPropertyLightGroup(
  candidate: CreatureEquipmentModelCandidate,
  target: string,
  index: number,
  objectRadius: number,
  metersToWorldScale: number,
  lightBudget: AuroraRuntimeLightBudgetSelection,
  lightBudgetRank: number,
  lightBudgetCandidateCount: number
): THREE.Group | null {
  const preview = resolveItemPropertyLightPreviewFromEntries(candidate.itemProperties);
  if (!preview) {
    return null;
  }
  const extraUserData = {
    creatureEquipmentItemPropertyLightGroupStatus:
      CREATURE_EQUIPMENT_ITEM_PROPERTY_LIGHT_GROUP_STATUS,
    creatureEquipmentItemPropertyLightStatus: "active",
    creatureEquipmentItemPropertyLightSource:
      "utc.Equip_ItemList.itemRuntime.itemProperties",
    creatureEquipmentItemPropertyLightResRef: candidate.resref,
    creatureEquipmentItemPropertyLightItemName: candidate.itemName ?? "",
    creatureEquipmentItemPropertyLightIndex: index,
    creatureEquipmentItemPropertyLightSlotLabels: candidate.slotLabels,
    creatureEquipmentItemPropertyLightAttachmentTarget: target,
    creatureEquipmentItemPropertyLightSourceModelStatus: candidate.sourceModelStatus,
    creatureEquipmentItemPropertyLightNotPlaceableLight: true,
    creatureEquipmentItemPropertyLightNotMdlLightNode: true
  };
  const group = createItemPropertyLightPreviewGroupFromPreview(
    preview,
    objectRadius,
    metersToWorldScale,
    {
      groupName: `creature_equipment_item_property_light_${candidate.resref}_${index}`,
      sourceRole: "creature-equipment-itemproperty-light-source",
      localYOffset: 0,
      extraUserData,
      lightBudget,
      lightBudgetRank,
      lightBudgetCandidateCount
    }
  );
  return group;
}

function applyCreatureEquipmentItemPropertyLights(
  root: THREE.Object3D,
  payload: CreatureViewportRenderPayload | null | undefined,
  objectRadius: number,
  metersToWorldScale: number,
  lightBudget: AuroraRuntimeLightBudgetSelection
): Record<string, unknown> {
  removeCreatureEquipmentItemPropertyLights(root);
  const candidates = payload?.renderPackage?.equipmentModelCandidates ?? [];
  const lightCandidates = candidates
    .map((candidate, index) => ({
      candidate,
      index,
      preview: resolveItemPropertyLightPreviewFromEntries(candidate.itemProperties)
    }))
    .filter(
      (entry): entry is {
        candidate: CreatureEquipmentModelCandidate;
        index: number;
        preview: ItemPropertyLightPreview;
      } => Boolean(entry.preview)
    );

  if (
    String(payload?.renderPackage?.appearanceProfile?.modelType ?? "")
      .trim()
      .toLowerCase() === "s"
  ) {
    const suppressedUserData = {
      creatureEquipmentItemPropertyLightStatus: "suppressed-special-direct-model",
      creatureEquipmentItemPropertyLightMode: "not-rendered-model-type-s",
      creatureEquipmentItemPropertyLightCount: 0,
      creatureEquipmentItemPropertyLightCandidateCount: lightCandidates.length,
      creatureEquipmentItemPropertyLightAcceptedCount: 0,
      creatureEquipmentItemPropertyLightDroppedCount: lightCandidates.length,
      creatureEquipmentItemPropertyLightAnchoredCount: 0,
      creatureEquipmentItemPropertyLightFallbackCount: 0,
      creatureEquipmentItemPropertyLightSource:
        "utc.Equip_ItemList.itemRuntime.itemProperties",
      creatureEquipmentItemPropertyLightProofStatus:
        "suppressed-for-special-direct-model-equipment-overlay"
    };
    root.userData = {
      ...root.userData,
      ...suppressedUserData
    };
    return suppressedUserData;
  }

  if (lightCandidates.length === 0) {
    const emptyUserData = {
      creatureEquipmentItemPropertyLightStatus: "not-applicable",
      creatureEquipmentItemPropertyLightCount: 0,
      creatureEquipmentItemPropertyLightAnchoredCount: 0,
      creatureEquipmentItemPropertyLightFallbackCount: 0
    };
    root.userData = {
      ...root.userData,
      ...emptyUserData
    };
    return emptyUserData;
  }

  const anchors = collectCreatureSkeletonAnchors(root);
  const fallbackGroup = new THREE.Group();
  fallbackGroup.name = "creature_equipment_item_property_lights";
  fallbackGroup.userData = {
    creatureEquipmentItemPropertyLightGroupStatus:
      CREATURE_EQUIPMENT_ITEM_PROPERTY_LIGHT_GROUP_STATUS,
    creatureEquipmentItemPropertyLightStatus: "active",
    creatureEquipmentItemPropertyLightMode: "fallback-offsets"
  };

  let anchoredCount = 0;
  let fallbackCount = 0;
  let droppedCount = 0;
  const brightnessLabels: string[] = [];
  const colorLabels: string[] = [];
  const resRefs: string[] = [];
  const attachmentTargets: string[] = [];

  lightCandidates.forEach(({ candidate, index, preview }, lightCandidateIndex) => {
    const target = resolveCreatureEquipmentAttachmentTarget(candidate);
    const group = createCreatureEquipmentItemPropertyLightGroup(
      candidate,
      target,
      index,
      objectRadius,
      metersToWorldScale,
      lightBudget,
      lightCandidateIndex + 1,
      lightCandidates.length
    );
    if (!group) {
      return;
    }
    const budgetAccepted = group.userData.itemPropertyLightBudgetAccepted !== false;
    brightnessLabels.push(preview.brightness.label);
    colorLabels.push(preview.color.label);
    resRefs.push(candidate.resref);
    attachmentTargets.push(target);

    if (!budgetAccepted) {
      group.position.copy(resolveCreatureEquipmentFallbackPosition(target, objectRadius, index));
      group.userData = {
        ...group.userData,
        creatureEquipmentItemPropertyLightMode: "dropped-by-light-budget"
      };
      fallbackGroup.add(group);
      droppedCount += 1;
      return;
    }

    const anchor = anchors.get(normalizeCreatureNodeName(target));
    if (anchor) {
      group.position.set(0, 0, 0);
      group.userData = {
        ...group.userData,
        creatureEquipmentItemPropertyLightMode: "skeleton-anchor",
        creatureEquipmentItemPropertyLightSkeletonAnchorName: anchor.name
      };
      anchor.add(group);
      anchoredCount += 1;
      return;
    }

    group.position.copy(resolveCreatureEquipmentFallbackPosition(target, objectRadius, index));
    group.userData = {
      ...group.userData,
      creatureEquipmentItemPropertyLightMode: "fallback-offset"
    };
    fallbackGroup.add(group);
    fallbackCount += 1;
  });

  if (fallbackGroup.children.length > 0) {
    root.add(fallbackGroup);
  }

  const mode =
    anchoredCount + fallbackCount === 0 && droppedCount > 0
      ? "dropped-by-light-budget"
      : anchoredCount > 0 && fallbackCount === 0
      ? "skeleton-anchors"
      : anchoredCount > 0
        ? "mixed"
        : "fallback-offsets";
  const userData = {
    creatureEquipmentItemPropertyLightStatus:
      anchoredCount + fallbackCount > 0 ? "active" : "dropped-by-light-budget",
    creatureEquipmentItemPropertyLightMode: mode,
    creatureEquipmentItemPropertyLightCount: anchoredCount + fallbackCount,
    creatureEquipmentItemPropertyLightCandidateCount: lightCandidates.length,
    creatureEquipmentItemPropertyLightAcceptedCount: anchoredCount + fallbackCount,
    creatureEquipmentItemPropertyLightDroppedCount: droppedCount,
    creatureEquipmentItemPropertyLightAnchoredCount: anchoredCount,
    creatureEquipmentItemPropertyLightFallbackCount: fallbackCount,
    creatureEquipmentItemPropertyLightResRefs: resRefs,
    creatureEquipmentItemPropertyLightAttachmentTargets: attachmentTargets,
    creatureEquipmentItemPropertyLightBrightnessLabels: brightnessLabels,
    creatureEquipmentItemPropertyLightColorLabels: colorLabels,
    creatureEquipmentItemPropertyLightSource:
      "utc.Equip_ItemList.itemRuntime.itemProperties",
    creatureEquipmentItemPropertyLightProofStatus:
      "source-backed-equipped-itemproperty-light-preview",
    creatureEquipmentItemPropertyLightBudgetCap: lightBudget.activeSlotCap,
    creatureEquipmentItemPropertyLightBudgetHardCap: AURORA_LIGHT_PREVIEW_ACTIVE_SLOT_CAP,
    creatureEquipmentItemPropertyLightConfiguredMaxLights:
      lightBudget.configuredMaxLights,
    creatureEquipmentItemPropertyLightBudgetCapSource:
      AURORA_LIGHT_PREVIEW_BUDGET_CAP_SOURCE,
    creatureEquipmentItemPropertyLightBudgetCapProofStatus:
      ITEM_PROPERTY_LIGHT_BUDGET_CAP_PROOF_STATUS
  };
  root.userData = {
    ...root.userData,
    ...userData
  };
  return userData;
}

function suppressCreatureAnchorSkeletonRenderGeometry(
  skeletonModel: THREE.Object3D
): Record<string, unknown> {
  let suppressedMeshCount = 0;
  const suppressedMeshNames: string[] = [];
  const suppressMaterial = (material: THREE.Material): THREE.Material => {
    const clone = material.clone();
    clone.visible = false;
    clone.userData = {
      ...clone.userData,
      auroraMdlRenderSuppressed: true,
      auroraMdlRenderSuppressedMaterialClone: true,
      creatureAnchorSkeletonRenderGeometrySuppressed: true
    };
    clone.needsUpdate = true;
    return clone;
  };

  skeletonModel.traverse((node) => {
    if (node instanceof THREE.Mesh) {
      node.visible = true;
      node.castShadow = false;
      node.receiveShadow = false;
      node.material = Array.isArray(node.material)
        ? node.material.map(suppressMaterial)
        : suppressMaterial(node.material);
      node.userData = {
        ...node.userData,
        auroraMdlRenderSuppressed: true,
        creatureAnchorSkeletonRenderGeometrySuppressed: true
      };
      suppressedMeshCount += 1;
      if (node.name) {
        suppressedMeshNames.push(node.name);
      }
    }
  });
  const userData = {
    creatureAnchorSkeletonRenderGeometryStatus:
      suppressedMeshCount > 0 ? "suppressed" : "none",
    creatureAnchorSkeletonRenderGeometrySuppressedCount: suppressedMeshCount,
    auroraMdlRenderSuppressedMeshCount: suppressedMeshCount,
    auroraMdlRenderSuppressedMeshNames: suppressedMeshNames
  };
  skeletonModel.userData = {
    ...skeletonModel.userData,
    ...userData
  };
  return userData;
}

function removeCreatureEquipmentModelPartGroups(root: THREE.Object3D): void {
  const nodes: THREE.Object3D[] = [];
  root.traverse((node) => {
    if (
      node !== root &&
      (node.userData?.creatureEquipmentModelPartGroupStatus === "source-equipment-model-parts" ||
        node.userData?.creatureEquipmentModelPartItemGroupStatus ===
          "source-equipment-item-model" ||
        node.userData?.creatureEquipmentModelPartStatus === "loaded")
    ) {
      nodes.push(node);
    }
  });
  const topLevelNodes = nodes.filter((node) => {
    let parent = node.parent;
    while (parent && parent !== root) {
      if (nodes.includes(parent)) {
        return false;
      }
      parent = parent.parent;
    }
    return true;
  });
  topLevelNodes.forEach((node) => {
    node.parent?.remove(node);
    node.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        disposeMeshResources(child);
      }
    });
  });
}

function removeCreaturePartModelGroups(root: THREE.Object3D): number {
  const nodes: THREE.Object3D[] = [];
  root.traverse((node) => {
    if (node === root) {
      return;
    }
    const status = node.userData?.creaturePartModelGroupStatus;
    const statusMatches =
      typeof status === "string" &&
      status.trim().length > 0 &&
      status !== "not-applicable";
    const nameMatches = /:creature-part-models$/iu.test(node.name);
    if (statusMatches || nameMatches) {
      nodes.push(node);
    }
  });
  const topLevelNodes = nodes.filter((node) => {
    let parent = node.parent;
    while (parent && parent !== root) {
      if (nodes.includes(parent)) {
        return false;
      }
      parent = parent.parent;
    }
    return true;
  });
  topLevelNodes.forEach((node) => {
    node.parent?.remove(node);
    node.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        disposeMeshResources(child);
      }
    });
  });
  return topLevelNodes.length;
}

function resolveCreatureEquipmentModelPartSortRank(
  entry: CreatureRenderEquipmentModelPartResolution
): number {
  const role = String(entry.role ?? "").trim().toLowerCase();
  if (role === "blade" || /_b_\d+$/iu.test(entry.partResref)) {
    return 0;
  }
  if (role === "middle" || /_m_\d+$/iu.test(entry.partResref)) {
    return 1;
  }
  if (role === "top" || /_t_\d+$/iu.test(entry.partResref)) {
    return 2;
  }
  return 10 + entry.partIndex;
}

function resolveCreatureEquipmentModelPartAssemblyKey(
  entry: CreatureRenderEquipmentModelPartResolution
): string {
  return [
    entry.equipmentIndex,
    entry.equipmentResref,
    entry.attachmentTarget || "rootdummy"
  ].join(":");
}

function buildCreatureEquipmentModelPartAssemblies(
  loadedEntries: LoadedCreatureEquipmentModelPartEntry[]
): CreatureEquipmentModelPartAssembly[] {
  const assembliesByKey = new Map<string, CreatureEquipmentModelPartAssembly>();
  loadedEntries.forEach((loadedEntry) => {
    const key = resolveCreatureEquipmentModelPartAssemblyKey(loadedEntry.entry);
    const existing = assembliesByKey.get(key);
    if (existing) {
      existing.entries.push(loadedEntry);
      return;
    }
    assembliesByKey.set(key, {
      equipmentKey: key,
      equipmentResref: loadedEntry.entry.equipmentResref,
      attachmentTarget: loadedEntry.entry.attachmentTarget || "rootdummy",
      entries: [loadedEntry]
    });
  });
  return Array.from(assembliesByKey.values()).map((assembly) => ({
    ...assembly,
    entries: [...assembly.entries].sort((left, right) => {
      const rankDelta =
        resolveCreatureEquipmentModelPartSortRank(left.entry) -
        resolveCreatureEquipmentModelPartSortRank(right.entry);
      return rankDelta !== 0 ? rankDelta : left.entry.partIndex - right.entry.partIndex;
    })
  }));
}

function createCreatureEquipmentModelPartItemGroup(
  assembly: CreatureEquipmentModelPartAssembly,
  index: number
): THREE.Group {
  const group = new THREE.Group();
  group.name = `creature_equipment_item_${assembly.equipmentResref}_${index}`;
  group.userData = {
    ...group.userData,
    creatureEquipmentModelPartItemGroupStatus: "source-equipment-item-model",
    creatureEquipmentModelPartItemGroupKey: assembly.equipmentKey,
    creatureEquipmentModelPartItemEquipmentResRef: assembly.equipmentResref,
    creatureEquipmentModelPartItemAttachmentTarget: assembly.attachmentTarget,
    creatureEquipmentModelPartItemPartCount: assembly.entries.length,
    creatureEquipmentModelPartItemPartResRefs: assembly.entries.map(
      ({ entry }) => entry.partResref
    ),
    creatureEquipmentModelPartItemPartRoles: assembly.entries.map(
      ({ entry }) => entry.role ?? ""
    )
  };
  return group;
}

function isCreatureHeldWeaponEquipmentAssembly(
  assembly: CreatureEquipmentModelPartAssembly
): boolean {
  const normalizedTarget = normalizeCreatureNodeName(assembly.attachmentTarget);
  if (
    normalizedTarget !== "rhand" &&
    normalizedTarget !== "lhand" &&
    normalizedTarget !== "rhand_g" &&
    normalizedTarget !== "lhand_g"
  ) {
    return false;
  }
  return assembly.entries.some(({ entry }) => {
    const normalizedModelType = entry.itemModelType?.trim().toLowerCase() ?? "";
    return (
      normalizedModelType.startsWith("w") ||
      CREATURE_HANDHELD_SHIELD_MODEL_TYPES.has(normalizedModelType) ||
      (typeof entry.weaponWield === "number" && entry.weaponWield === 7)
    );
  });
}

function resolveCreatureEquipmentAssemblyWeaponScale(
  assembly: CreatureEquipmentModelPartAssembly,
  appearanceProfile: CreatureRenderAppearanceProfile | undefined
): { scale: number; source: string } {
  if (!isCreatureHeldWeaponEquipmentAssembly(assembly)) {
    return { scale: 1, source: "not-held-weapon" };
  }
  const rawScale = appearanceProfile?.weaponScale;
  if (typeof rawScale !== "number" || !Number.isFinite(rawScale) || rawScale <= 0) {
    return { scale: 1, source: "appearance-weaponscale-missing-default-1" };
  }
  return {
    scale: Math.min(Math.max(rawScale, 0.01), 10),
    source: "appearance.2da.WEAPONSCALE"
  };
}

function isCreatureEquipmentAssemblyModelType(
  assembly: CreatureEquipmentModelPartAssembly,
  modelTypes: ReadonlySet<string>
): boolean {
  return assembly.entries.some(({ entry }) =>
    modelTypes.has(entry.itemModelType?.trim().toLowerCase() ?? "")
  );
}

function isCreatureEquipmentAssemblyWeaponWield(
  assembly: CreatureEquipmentModelPartAssembly,
  weaponWields: ReadonlySet<number>
): boolean {
  return assembly.entries.some(({ entry }) =>
    typeof entry.weaponWield === "number" && weaponWields.has(entry.weaponWield)
  );
}

function isCreatureRuntimeAmmunitionEquipmentAssembly(
  assembly: CreatureEquipmentModelPartAssembly
): boolean {
  return isCreatureEquipmentAssemblyModelType(assembly, CREATURE_AMMUNITION_MODEL_TYPES);
}

function isCreatureRuntimeAmmunitionModelPartResolution(
  entry: CreatureRenderEquipmentModelPartResolution
): boolean {
  return CREATURE_AMMUNITION_MODEL_TYPES.has(
    entry.itemModelType?.trim().toLowerCase() ?? ""
  );
}

function isCreatureHandheldBowEquipmentAssembly(
  assembly: CreatureEquipmentModelPartAssembly
): boolean {
  return (
    isCreatureEquipmentAssemblyWeaponWield(assembly, new Set([5])) ||
    isCreatureEquipmentAssemblyModelType(assembly, CREATURE_HANDHELD_BOW_MODEL_TYPES)
  );
}

function isCreatureHandheldCrossbowEquipmentAssembly(
  assembly: CreatureEquipmentModelPartAssembly
): boolean {
  return (
    isCreatureEquipmentAssemblyWeaponWield(assembly, new Set([6])) ||
    isCreatureEquipmentAssemblyModelType(assembly, CREATURE_HANDHELD_CROSSBOW_MODEL_TYPES)
  );
}

function isCreatureHandheldSlingEquipmentAssembly(
  assembly: CreatureEquipmentModelPartAssembly
): boolean {
  return (
    isCreatureEquipmentAssemblyWeaponWield(assembly, new Set([10])) ||
    isCreatureEquipmentAssemblyModelType(assembly, CREATURE_HANDHELD_SLING_MODEL_TYPES)
  );
}

function isCreatureHandheldShieldEquipmentAssembly(
  assembly: CreatureEquipmentModelPartAssembly
): boolean {
  return (
    isCreatureEquipmentAssemblyWeaponWield(assembly, new Set([7])) ||
    isCreatureEquipmentAssemblyModelType(assembly, CREATURE_HANDHELD_SHIELD_MODEL_TYPES)
  );
}

function isCreatureDoubleWeaponEquipmentAssembly(
  assembly: CreatureEquipmentModelPartAssembly
): boolean {
  return isCreatureEquipmentAssemblyWeaponWield(assembly, new Set([8]));
}

function isCreatureThrownWeaponEquipmentAssembly(
  assembly: CreatureEquipmentModelPartAssembly
): boolean {
  return isCreatureEquipmentAssemblyWeaponWield(assembly, new Set([11]));
}

function isCreatureHeldLongMeleeEquipmentAssembly(
  assembly: CreatureEquipmentModelPartAssembly
): boolean {
  return assembly.entries.some(({ entry }) => {
    const normalizedModelType = entry.itemModelType?.trim().toLowerCase() ?? "";
    return (
      CREATURE_HELD_LONG_MELEE_MODEL_TYPES.has(normalizedModelType) ||
      CREATURE_HELD_LONG_MELEE_MODEL_TYPE_PREFIXES.some((prefix) =>
        normalizedModelType.startsWith(prefix)
      )
    );
  });
}

function summarizeCreatureEquipmentModelSourceHierarchy(
  model: THREE.Object3D
): {
  nodeCount: number;
  dummyNodeNames: string[];
  synthesizedNodeCount: number;
  synthesizedNodeNames: string[];
  reparentedNodeCount: number;
  rebasedGeometryCount: number;
  rebasedGeometryNodeNames: string[];
  runtimeNodeCount: number;
  runtimeNodeNames: string[];
} {
  const dummyNodeNames = readUserDataStringArray(
    model.userData?.auroraMdlSourceHierarchyDummyNodeNames
  );
  const synthesizedNodeNames = readUserDataStringArray(
    model.userData?.auroraMdlSourceHierarchySynthesizedNodeNames
  );
  const rebasedGeometryNodeNames = readUserDataStringArray(
    model.userData?.auroraMdlSourceHierarchyRebasedGeometryNodeNames
  );
  const runtimeNodeNames: string[] = [];
  model.traverse((node) => {
    if (
      node.userData?.auroraSourceHierarchySynthesized === true ||
      typeof node.userData?.auroraSourceHierarchyNodeType === "string" ||
      typeof node.userData?.auroraSourceHierarchyParentName === "string"
    ) {
      runtimeNodeNames.push(node.name || "(unnamed)");
    }
  });
  return {
    nodeCount: Math.max(
      readUserDataNumber(model.userData?.auroraMdlSourceHierarchyNodeCount),
      dummyNodeNames.length,
      runtimeNodeNames.length
    ),
    dummyNodeNames,
    synthesizedNodeCount: Math.max(
      readUserDataNumber(model.userData?.auroraMdlSourceHierarchySynthesizedNodeCount),
      synthesizedNodeNames.length
    ),
    synthesizedNodeNames,
    reparentedNodeCount: readUserDataNumber(
      model.userData?.auroraMdlSourceHierarchyReparentedNodeCount
    ),
    rebasedGeometryCount: Math.max(
      readUserDataNumber(model.userData?.auroraMdlSourceHierarchyRebasedGeometryCount),
      rebasedGeometryNodeNames.length
    ),
    rebasedGeometryNodeNames,
    runtimeNodeCount: runtimeNodeNames.length,
    runtimeNodeNames
  };
}

function shouldPreserveCreatureEquipmentModelSourceHierarchy(
  model: THREE.Object3D,
  modelAnimationClips: readonly THREE.AnimationClip[]
): { preserve: boolean; reason: string } {
  if (modelAnimationClips.length > 0) {
    return { preserve: true, reason: "animation-clips" };
  }
  const sourceHierarchy = summarizeCreatureEquipmentModelSourceHierarchy(model);
  if (sourceHierarchy.nodeCount > 0) {
    return { preserve: true, reason: "source-hierarchy-metadata" };
  }
  return { preserve: false, reason: "flat-no-source-hierarchy" };
}

function applyCreatureEquipmentItemAttachmentTransform(
  itemGroup: THREE.Group,
  assembly: CreatureEquipmentModelPartAssembly,
  attachmentMode: "skeleton-anchor" | "fallback-offset"
): string {
  if (isCreatureRuntimeAmmunitionEquipmentAssembly(assembly)) {
    itemGroup.rotation.set(0, 0, 0);
    itemGroup.position.set(0, 0, 0);
    itemGroup.userData = {
      ...itemGroup.userData,
      creatureEquipmentModelPartItemAttachmentTransformStatus:
        "runtime-ammunition-launcher-draw-or-hand-proxy",
      creatureEquipmentModelPartItemAttachmentTransformSource:
        "aurora-ranged-ammunition-origin-from-launcher-draw-dummy-with-animated-hands-fallback",
      creatureEquipmentModelPartItemAttachmentTransformAxis: "dynamic",
      creatureEquipmentModelPartItemAttachmentTransformRadians: 0,
      creatureEquipmentModelPartItemAttachmentGripOffset:
        formatCreatureRuntimeVector(new THREE.Vector3(0, 0, 0))
    };
    return "runtime-ammunition-launcher-draw-or-hand-proxy";
  }
  if (!isCreatureHeldWeaponEquipmentAssembly(assembly)) {
    itemGroup.userData = {
      ...itemGroup.userData,
      creatureEquipmentModelPartItemAttachmentTransformStatus: "identity"
    };
    return "identity";
  }
  if (attachmentMode === "skeleton-anchor") {
    if (isCreatureHandheldShieldEquipmentAssembly(assembly)) {
      const transformStatus = "held-shield-source-axis-hand-node-anchor";
      itemGroup.rotation.set(0, 0, 0);
      itemGroup.position.set(0, 0, 0);
      itemGroup.userData = {
        ...itemGroup.userData,
        creatureEquipmentModelPartItemAttachmentTransformStatus: transformStatus,
        creatureEquipmentModelPartItemAttachmentTransformSource:
          "aurora-baseitems-weaponwield7-shield-source-mdl-root-mounted-to-capart-hand-node-origin",
        creatureEquipmentModelPartItemAttachmentTransformAxis: "source",
        creatureEquipmentModelPartItemAttachmentTransformRadians: 0,
        creatureEquipmentModelPartItemAttachmentGripOffset:
          formatCreatureRuntimeVector(new THREE.Vector3(0, 0, 0)),
        creatureEquipmentModelPartItemAttachmentResolvedOffset:
          formatCreatureRuntimeVector(new THREE.Vector3(0, 0, 0)),
        creatureEquipmentModelPartItemAttachmentAuroraBaseItemWeaponWield: "7"
      };
      return transformStatus;
    }
    if (isCreatureDoubleWeaponEquipmentAssembly(assembly)) {
      const transformStatus = "held-double-weapon-source-axis-hand-node-anchor";
      itemGroup.rotation.set(0, 0, 0);
      itemGroup.position.set(0, 0, 0);
      itemGroup.userData = {
        ...itemGroup.userData,
        creatureEquipmentModelPartItemAttachmentTransformStatus: transformStatus,
        creatureEquipmentModelPartItemAttachmentTransformSource:
          "aurora-baseitems-weaponwield8-double-weapon-source-mdl-root-mounted-to-capart-hand-node-origin",
        creatureEquipmentModelPartItemAttachmentTransformAxis: "source",
        creatureEquipmentModelPartItemAttachmentTransformRadians: 0,
        creatureEquipmentModelPartItemAttachmentGripOffset:
          formatCreatureRuntimeVector(new THREE.Vector3(0, 0, 0)),
        creatureEquipmentModelPartItemAttachmentResolvedOffset:
          formatCreatureRuntimeVector(new THREE.Vector3(0, 0, 0)),
        creatureEquipmentModelPartItemAttachmentAuroraBaseItemWeaponWield: "8"
      };
      return transformStatus;
    }
    if (isCreatureThrownWeaponEquipmentAssembly(assembly)) {
      const transformStatus = "held-throwing-source-axis-hand-node-anchor";
      itemGroup.rotation.set(0, 0, 0);
      itemGroup.position.set(0, 0, 0);
      itemGroup.userData = {
        ...itemGroup.userData,
        creatureEquipmentModelPartItemAttachmentTransformStatus: transformStatus,
        creatureEquipmentModelPartItemAttachmentTransformSource:
          "aurora-baseitems-weaponwield11-thrown-source-mdl-root-mounted-to-capart-hand-node-origin",
        creatureEquipmentModelPartItemAttachmentTransformAxis: "source",
        creatureEquipmentModelPartItemAttachmentTransformRadians: 0,
        creatureEquipmentModelPartItemAttachmentGripOffset:
          formatCreatureRuntimeVector(new THREE.Vector3(0, 0, 0)),
        creatureEquipmentModelPartItemAttachmentResolvedOffset:
          formatCreatureRuntimeVector(new THREE.Vector3(0, 0, 0)),
        creatureEquipmentModelPartItemAttachmentAuroraBaseItemWeaponWield: "11"
      };
      return transformStatus;
    }
    if (isCreatureHeldLongMeleeEquipmentAssembly(assembly)) {
      const transformStatus = "held-long-melee-source-axis-hand-node-anchor";
      itemGroup.rotation.set(0, 0, 0);
      itemGroup.position.set(0, 0, 0);
      itemGroup.userData = {
        ...itemGroup.userData,
        creatureEquipmentModelPartItemAttachmentTransformStatus: transformStatus,
        creatureEquipmentModelPartItemAttachmentTransformSource:
          "aurora-baseitems-modeltype2-source-mdl-root-mounted-to-capart-hand-node-origin",
        creatureEquipmentModelPartItemAttachmentTransformAxis: "source",
        creatureEquipmentModelPartItemAttachmentTransformRadians: 0,
        creatureEquipmentModelPartItemAttachmentGripOffset:
          formatCreatureRuntimeVector(new THREE.Vector3(0, 0, 0)),
        creatureEquipmentModelPartItemAttachmentResolvedOffset:
          formatCreatureRuntimeVector(new THREE.Vector3(0, 0, 0)),
        creatureEquipmentModelPartItemAttachmentAuroraModelType: "2"
      };
      return transformStatus;
    }
    if (isCreatureHandheldBowEquipmentAssembly(assembly)) {
      const transformStatus = "held-bow-source-axis-left-hand-node-anchor";
      itemGroup.rotation.set(0, 0, 0);
      itemGroup.position.set(0, 0, 0);
      itemGroup.userData = {
        ...itemGroup.userData,
        creatureEquipmentModelPartItemAttachmentTransformStatus: transformStatus,
        creatureEquipmentModelPartItemAttachmentTransformSource:
          "aurora-sourcehierarchy-modeltype2-weaponwield5-source-axis-attached-to-lhand-hand-hook-under-capart-node-rotateonground-is-preview-only",
        creatureEquipmentModelPartItemAttachmentTransformAxis: "source",
        creatureEquipmentModelPartItemAttachmentTransformRadians: 0,
        creatureEquipmentModelPartItemAttachmentGripOffset:
          formatCreatureRuntimeVector(new THREE.Vector3(0, 0, 0)),
        creatureEquipmentModelPartItemAttachmentResolvedOffset:
          formatCreatureRuntimeVector(new THREE.Vector3(0, 0, 0)),
        creatureEquipmentModelPartItemAttachmentAuroraModelType: "2",
        creatureEquipmentModelPartItemAttachmentAuroraBaseItemWeaponWield: "5",
        creatureEquipmentModelPartItemAttachmentAuroraRotateOnGround: "1"
      };
      return transformStatus;
    }
    if (isCreatureHandheldCrossbowEquipmentAssembly(assembly)) {
      const transformStatus = "held-crossbow-source-axis-right-hand-node-anchor";
      itemGroup.rotation.set(0, 0, 0);
      itemGroup.position.set(0, 0, 0);
      itemGroup.userData = {
        ...itemGroup.userData,
        creatureEquipmentModelPartItemAttachmentTransformStatus: transformStatus,
        creatureEquipmentModelPartItemAttachmentTransformSource:
          "aurora-sourcehierarchy-modeltype2-weaponwield6-source-axis-attached-to-rhand-hand-hook-under-capart-node-rotateonground-is-preview-only",
        creatureEquipmentModelPartItemAttachmentTransformAxis: "source",
        creatureEquipmentModelPartItemAttachmentTransformRadians: 0,
        creatureEquipmentModelPartItemAttachmentGripOffset:
          formatCreatureRuntimeVector(new THREE.Vector3(0, 0, 0)),
        creatureEquipmentModelPartItemAttachmentResolvedOffset:
          formatCreatureRuntimeVector(new THREE.Vector3(0, 0, 0)),
        creatureEquipmentModelPartItemAttachmentAuroraModelType: "2",
        creatureEquipmentModelPartItemAttachmentAuroraBaseItemWeaponWield: "6"
      };
      return transformStatus;
    }
    const transformStatus = isCreatureHandheldSlingEquipmentAssembly(assembly)
      ? "held-sling-source-axis-hand-node-anchor"
      : "held-weapon-source-axis-hand-node-anchor";
    itemGroup.rotation.set(0, 0, 0);
    itemGroup.position.set(0, 0, 0);
    itemGroup.userData = {
      ...itemGroup.userData,
      creatureEquipmentModelPartItemAttachmentTransformStatus: transformStatus,
      creatureEquipmentModelPartItemAttachmentTransformSource:
        "aurora-baseitems-modeltype2-source-mdl-root-mounted-to-capart-hand-node-no-runtime-preview-rotation",
      creatureEquipmentModelPartItemAttachmentTransformAxis: "source",
      creatureEquipmentModelPartItemAttachmentTransformRadians: 0,
      creatureEquipmentModelPartItemAttachmentGripOffset:
        formatCreatureRuntimeVector(new THREE.Vector3(0, 0, 0)),
      creatureEquipmentModelPartItemAttachmentResolvedOffset:
        formatCreatureRuntimeVector(new THREE.Vector3(0, 0, 0))
    };
    return transformStatus;
  }
  const isCrossbow = isCreatureHandheldCrossbowEquipmentAssembly(assembly);
  const isBow = isCreatureHandheldBowEquipmentAssembly(assembly);
  const isSling = isCreatureHandheldSlingEquipmentAssembly(assembly);
  const isShield = isCreatureHandheldShieldEquipmentAssembly(assembly);
  const isDoubleWeapon = isCreatureDoubleWeaponEquipmentAssembly(assembly);
  const isThrownWeapon = isCreatureThrownWeaponEquipmentAssembly(assembly);
  itemGroup.rotation.set(0, 0, 0);
  itemGroup.userData = {
    ...itemGroup.userData,
    creatureEquipmentModelPartItemAttachmentTransformStatus:
      isCrossbow
        ? "held-crossbow-source-axis"
        : isBow
          ? "held-bow-source-axis"
          : isSling
            ? "held-sling-source-axis"
            : isShield
              ? "held-shield-source-axis"
              : isDoubleWeapon
                ? "held-double-weapon-source-axis"
                : isThrownWeapon
                  ? "held-throwing-source-axis"
                  : "held-weapon-source-axis",
    creatureEquipmentModelPartItemAttachmentTransformSource:
      isCrossbow
        ? "decomp-backed-modeltype2-item-model-source-axis-rotateonground-preview-only-fallback"
        : isBow
          ? "decomp-backed-modeltype2-weaponwield5-item-model-source-axis-rotateonground-preview-only-fallback"
          : isShield
            ? "aurora-baseitems-weaponwield7-shield-source-mdl-root-fallback-position"
            : isDoubleWeapon
              ? "aurora-baseitems-weaponwield8-double-weapon-source-mdl-root-fallback-position"
              : isThrownWeapon
                ? "aurora-baseitems-weaponwield11-thrown-source-mdl-root-fallback-position"
                : "aurora-baseitems-source-mdl-root-fallback-position-no-runtime-preview-rotation",
    creatureEquipmentModelPartItemAttachmentTransformAxis: "source",
    creatureEquipmentModelPartItemAttachmentTransformRadians: 0
  };
  return isCrossbow
    ? "held-crossbow-source-axis"
    : isBow
      ? "held-bow-source-axis"
      : isSling
        ? "held-sling-source-axis"
        : isShield
          ? "held-shield-source-axis"
          : isDoubleWeapon
            ? "held-double-weapon-source-axis"
            : isThrownWeapon
              ? "held-throwing-source-axis"
              : "held-weapon-source-axis";
}

function createCreatureEquipmentModelPartFlatPartGroup(input: {
  entry: CreatureRenderEquipmentModelPartResolution;
  model: THREE.Object3D;
  assemblyKey: string;
  target: string;
  sourceAnimationClips?: readonly THREE.AnimationClip[];
}): THREE.Group {
  const { entry, model, assemblyKey, target, sourceAnimationClips = [] } = input;
  const partGroup = new THREE.Group();
  partGroup.name = `creature_equipment_model_part_${entry.partResref}_${entry.partIndex}`;
  const modelAnimationClips = deduplicateCreatureAnimationClips([
    ...collectCreatureLoadedModelAnimationClips(model),
    ...sourceAnimationClips
  ]);
  const sourceAnimationSupermodelStatus = readUserDataString(
    model.userData?.creatureEquipmentModelPartSourceAnimationSupermodelStatus
  );
  const sourceHierarchy = summarizeCreatureEquipmentModelSourceHierarchy(model);
  const sourceHierarchyPreserve = shouldPreserveCreatureEquipmentModelSourceHierarchy(
    model,
    modelAnimationClips
  );
  const shouldPreserveSourceHierarchy = sourceHierarchyPreserve.preserve;
  partGroup.userData = {
    ...partGroup.userData,
    creatureEquipmentModelPartStatus: "loaded",
    creatureEquipmentModelPartCompositionStatus: shouldPreserveSourceHierarchy
      ? "source-hierarchy-preserved"
      : "flat-composed",
    creatureEquipmentModelPartCompositionReason: sourceHierarchyPreserve.reason,
    creatureEquipmentModelPartSourceAnimationClipCount: modelAnimationClips.length,
    creatureEquipmentModelPartSourceAnimationClipNames: modelAnimationClips
      .map((clip) => clip.name)
      .filter(Boolean),
    creatureEquipmentModelPartSourceHierarchyNodeCount: sourceHierarchy.nodeCount,
    creatureEquipmentModelPartSourceHierarchyDummyNodeNames:
      sourceHierarchy.dummyNodeNames,
    creatureEquipmentModelPartSourceHierarchySynthesizedNodeCount:
      sourceHierarchy.synthesizedNodeCount,
    creatureEquipmentModelPartSourceHierarchySynthesizedNodeNames:
      sourceHierarchy.synthesizedNodeNames,
    creatureEquipmentModelPartSourceHierarchyReparentedNodeCount:
      sourceHierarchy.reparentedNodeCount,
    creatureEquipmentModelPartSourceHierarchyRebasedGeometryCount:
      sourceHierarchy.rebasedGeometryCount,
    creatureEquipmentModelPartSourceHierarchyRebasedGeometryNodeNames:
      sourceHierarchy.rebasedGeometryNodeNames,
    creatureEquipmentModelPartRuntimeSourceHierarchyNodeCount:
      sourceHierarchy.runtimeNodeCount,
    creatureEquipmentModelPartRuntimeSourceHierarchyNodeNames:
      sourceHierarchy.runtimeNodeNames,
    ...(sourceAnimationSupermodelStatus
      ? {
          creatureEquipmentModelPartSourceAnimationSupermodelStatus:
            sourceAnimationSupermodelStatus,
          creatureEquipmentModelPartSourceAnimationSupermodel:
            readUserDataString(
              model.userData?.creatureEquipmentModelPartSourceAnimationSupermodel
            ) ?? "",
          creatureEquipmentModelPartSourceAnimationSupermodelUrl:
            readUserDataString(
              model.userData?.creatureEquipmentModelPartSourceAnimationSupermodelUrl
            ) ?? "",
          creatureEquipmentModelPartSourceAnimationSupermodelClipNames:
            readUserDataStringArray(
              model.userData?.creatureEquipmentModelPartSourceAnimationSupermodelClipNames
            ),
          creatureEquipmentModelPartSourceAnimationSupermodelPositionTrackMode:
            readUserDataString(
              model.userData
                ?.creatureEquipmentModelPartSourceAnimationSupermodelPositionTrackMode
            ) ?? ""
        }
      : {}),
    creatureEquipmentModelPartResRef: entry.partResref,
    creatureEquipmentModelPartEquipmentResRef: entry.equipmentResref,
    creatureEquipmentModelPartRole: entry.role ?? "",
    creatureEquipmentModelPartId: entry.partId ?? null,
    creatureEquipmentModelPartAttachmentTarget: target,
    creatureEquipmentModelPartUrl: entry.modelUrl,
    creatureEquipmentModelPartCacheKey: entry.modelCacheKey,
    creatureEquipmentModelPartItemGroupKey: assemblyKey
  };

  model.updateMatrixWorld(true);
  if (shouldPreserveSourceHierarchy) {
    model.position.set(0, 0, 0);
    model.quaternion.identity();
    model.scale.set(1, 1, 1);
    model.userData = {
      ...model.userData,
      creatureEquipmentModelPartSourceHierarchyHost: true,
      creatureEquipmentModelPartMeshStatus: "source-hierarchy-preserved",
      creatureEquipmentModelPartCompositionReason: sourceHierarchyPreserve.reason,
      creatureEquipmentModelPartResRef: entry.partResref,
      creatureEquipmentModelPartEquipmentResRef: entry.equipmentResref,
      creatureEquipmentModelPartRole: entry.role ?? "",
      creatureEquipmentModelPartAttachmentTarget: target,
      creatureEquipmentModelPartItemGroupKey: assemblyKey
    };
    model.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) {
        return;
      }
      node.userData = {
        ...node.userData,
        creatureEquipmentModelPartMeshStatus: "source-hierarchy-preserved",
        creatureEquipmentModelPartResRef: entry.partResref,
        creatureEquipmentModelPartEquipmentResRef: entry.equipmentResref,
        creatureEquipmentModelPartRole: entry.role ?? "",
        creatureEquipmentModelPartAttachmentTarget: target,
        creatureEquipmentModelPartItemGroupKey: assemblyKey
      };
    });
    partGroup.add(model);
    return partGroup;
  }

  const renderMeshes: THREE.Mesh[] = [];
  model.traverse((node) => {
    if (node instanceof THREE.Mesh) {
      renderMeshes.push(node);
    }
  });
  renderMeshes.forEach((mesh, meshIndex) => {
    const meshLocalMatrix = mesh.matrixWorld.clone();
    if (!mesh.name) {
      mesh.name = `${entry.partResref}_mesh_${meshIndex}`;
    }
    mesh.userData = {
      ...mesh.userData,
      creatureEquipmentModelPartMeshStatus: "flat-composed",
      creatureEquipmentModelPartResRef: entry.partResref,
      creatureEquipmentModelPartEquipmentResRef: entry.equipmentResref,
      creatureEquipmentModelPartRole: entry.role ?? "",
      creatureEquipmentModelPartAttachmentTarget: target,
      creatureEquipmentModelPartItemGroupKey: assemblyKey
    };
    partGroup.add(mesh);
    mesh.matrix.copy(meshLocalMatrix);
    mesh.matrix.decompose(mesh.position, mesh.quaternion, mesh.scale);
    mesh.updateMatrixWorld(true);
  });

  return partGroup;
}

function resolveCreatureEquipmentRequestedAnimationName(
  explicitAnimationName: string | null | undefined,
  root: THREE.Object3D
): string | null {
  if (explicitAnimationName?.trim()) {
    return explicitAnimationName.trim();
  }
  const rootRequested = root.userData?.creatureAnimationRequestedClipName;
  return typeof rootRequested === "string" && rootRequested.trim().length > 0
    ? rootRequested.trim()
    : null;
}

async function resolveCreatureEquipmentModelPartSourceAnimationClips(
  runtime: CreatureEquipmentModelPartRuntime,
  entry: CreatureRenderEquipmentModelPartResolution,
  model: THREE.Object3D
): Promise<THREE.AnimationClip[]> {
  const directClips = collectCreatureLoadedModelAnimationClips(model);
  if (directClips.length > 0) {
    return directClips;
  }
  const declaredSupermodel =
    readUserDataString(model.userData?.auroraMdlSupermodel) ??
    readUserDataString(entry.supermodelResRef);
  const fallbackSupermodelUrl = declaredSupermodel
    ? resolveCreatureSiblingDerivedModelUrl(entry.modelUrl, declaredSupermodel)
    : null;
  const candidateEntries = [
    ...(entry.supermodelModelUrl
      ? [
          {
            url: entry.supermodelModelUrl,
            cacheKey:
              entry.supermodelModelCacheKey ??
              `${entry.modelCacheKey}:equipment-source-animation-supermodel:${entry.supermodelResRef ?? "direct"}`,
            resRef: entry.supermodelResRef ?? declaredSupermodel ?? ""
          }
        ]
      : []),
    ...(entry.supermodelChainModelUrls ?? []).map((url, index) => ({
      url,
      cacheKey:
        entry.supermodelChainModelCacheKeys?.[index] ??
        `${entry.modelCacheKey}:equipment-source-animation-supermodel-chain:${index}`,
      resRef:
        entry.supermodelChainResRefs?.[index] ??
        entry.supermodelChainAssetIds?.[index] ??
        `chain-${index}`
    })),
    ...(fallbackSupermodelUrl
      ? [
          {
            url: fallbackSupermodelUrl,
            cacheKey: `${entry.modelCacheKey}:equipment-source-animation-supermodel:${declaredSupermodel?.trim().toLowerCase() ?? "sibling"}`,
            resRef: declaredSupermodel ?? ""
          }
        ]
      : [])
  ].filter(
    (candidate, index, all) =>
      candidate.url.trim().length > 0 &&
      all.findIndex((entry) => entry.url === candidate.url) === index
  );
  if (candidateEntries.length === 0) {
    return [];
  }

  const attemptedUrls: string[] = [];
  const attemptedResRefs: string[] = [];
  const noClipResRefs: string[] = [];
  for (const candidate of candidateEntries) {
    attemptedUrls.push(candidate.url);
    if (candidate.resRef) {
      attemptedResRefs.push(candidate.resRef);
    }
    const supermodelModel = await ensurePlaceableModel(runtime, candidate.url, {
      cloneMaterials: false,
      cacheKey: candidate.cacheKey,
      timeoutMs: CREATURE_EQUIPMENT_MODEL_PART_LOAD_TIMEOUT_MS
    }).catch(() => null);
    if (!supermodelModel) {
      continue;
    }
    const supermodelClips = collectCreatureLoadedModelAnimationClips(supermodelModel);
    if (supermodelClips.length === 0) {
      noClipResRefs.push(candidate.resRef || candidate.url);
      continue;
    }
    const remappedSupermodelClips = buildAuroraSupermodelAnimationClips(
      model,
      supermodelModel,
      {
        positionTrackMode: "source"
      }
    );
    const sourceAnimationClips =
      remappedSupermodelClips.length > 0
        ? remappedSupermodelClips
        : supermodelClips.map((clip) => clip.clone());
    model.userData = {
      ...model.userData,
      creatureEquipmentModelPartSourceAnimationSupermodelStatus: "loaded",
      creatureEquipmentModelPartSourceAnimationSupermodel: candidate.resRef,
      creatureEquipmentModelPartSourceAnimationSupermodelUrl: candidate.url,
      creatureEquipmentModelPartSourceAnimationSupermodelPositionTrackMode:
        remappedSupermodelClips.length > 0 ? "source" : "raw-fallback",
      creatureEquipmentModelPartSourceAnimationSupermodelAttemptedUrls: attemptedUrls,
      creatureEquipmentModelPartSourceAnimationSupermodelAttemptedResRefs:
        attemptedResRefs,
      creatureEquipmentModelPartSourceAnimationSupermodelClipNames: sourceAnimationClips
        .map((clip) => clip.name)
        .filter(Boolean)
    };
    return sourceAnimationClips.map((clip) => clip.clone());
  }

  model.userData = {
    ...model.userData,
    creatureEquipmentModelPartSourceAnimationSupermodelStatus:
      noClipResRefs.length > 0 ? "no-clips" : "missing",
    creatureEquipmentModelPartSourceAnimationSupermodel: declaredSupermodel ?? "",
    creatureEquipmentModelPartSourceAnimationSupermodelAttemptedUrls: attemptedUrls,
    creatureEquipmentModelPartSourceAnimationSupermodelAttemptedResRefs:
      attemptedResRefs,
    creatureEquipmentModelPartSourceAnimationSupermodelNoClipResRefs: noClipResRefs
  };
  return [];
}

function clearCreatureEquipmentSourceAnimationPlaybacks(
  runtime: CreatureEquipmentModelPartRuntime,
  objectId: string
): void {
  const prefix = `${objectId}:equipment:`;
  Array.from(runtime.objectAnimationMixersById.keys())
    .filter((key) => key.startsWith(prefix))
    .forEach((key) => clearRuntimeObjectAnimationPlayback(runtime, key));
}

function applyCreatureEquipmentSourceAnimationPlayback(input: {
  runtime: CreatureEquipmentModelPartRuntime;
  objectId: string;
  root: THREE.Object3D;
  itemGroup: THREE.Group;
  assembly: CreatureEquipmentModelPartAssembly;
  requestedAnimationName: string | null;
}): Record<string, unknown> {
  const { runtime, objectId, root, itemGroup, assembly, requestedAnimationName } = input;
  const sourceClips = deduplicateCreatureAnimationClips([
    ...collectCreatureLoadedModelAnimationClips(itemGroup),
    ...assembly.entries.flatMap(({ sourceAnimationClips }) => sourceAnimationClips ?? [])
  ]);
  const sourceClipNames = sourceClips.map((clip) => clip.name).filter(Boolean);
  const requestedSourceAnimationName = resolveCreatureEquipmentSourceAnimationRequestName(
    requestedAnimationName,
    assembly
  );
  const normalizedRequested = requestedSourceAnimationName?.trim().toLowerCase() ?? "";
  const animationKey = `${objectId}:equipment:${assembly.equipmentKey}`;
  const baseUserData = {
    creatureEquipmentModelPartItemSourceAnimationClipCount: sourceClips.length,
    creatureEquipmentModelPartItemSourceAnimationClipNames: sourceClipNames,
    creatureEquipmentModelPartItemSourceAnimationRequestedName:
      requestedSourceAnimationName ?? "",
    creatureEquipmentModelPartItemSourceAnimationOriginalRequestedName:
      requestedAnimationName ?? "",
    creatureEquipmentModelPartItemSourceAnimationPlaybackObjectId: animationKey
  };
  if (sourceClips.length === 0) {
    clearRuntimeObjectAnimationPlayback(runtime, animationKey);
    return {
      ...baseUserData,
      creatureEquipmentModelPartItemSourceAnimationStatus: "not-applicable",
      creatureEquipmentModelPartItemSourceAnimationSelectedClipNames: []
    };
  }
  if (!normalizedRequested) {
    clearRuntimeObjectAnimationPlayback(runtime, animationKey);
    return {
      ...baseUserData,
      creatureEquipmentModelPartItemSourceAnimationStatus: "idle-no-request",
      creatureEquipmentModelPartItemSourceAnimationSelectedClipNames: []
    };
  }
  const playableSourceClips = sourceClips.map(normalizeCreatureAnimationClipForPlayback);
  const matchingClip = playableSourceClips.find(
    (clip) => normalizeCreatureAnimationClipName(clip) === normalizedRequested
  );
  if (!matchingClip) {
    clearRuntimeObjectAnimationPlayback(runtime, animationKey);
    return {
      ...baseUserData,
      creatureEquipmentModelPartItemSourceAnimationStatus: "missing-requested-clip",
      creatureEquipmentModelPartItemSourceAnimationSelectedClipNames: []
    };
  }

  const selectedClip = composeCreatureRequestedAnimationClipWithBasePose(
    matchingClip,
    playableSourceClips
  );
  const expandedSourceClip = expandCreatureEquipmentSourceAnimationDuplicateTargets(
    selectedClip,
    itemGroup
  );
  const playbackTrackFilter = filterCreatureAnimationClipsForExistingPlaybackNodes(
    [expandedSourceClip.clip],
    itemGroup
  );
  const playableClips = playbackTrackFilter.clips.filter((clip) => clip.tracks.length > 0);
  const suppressedTrackNames = playbackTrackFilter.suppressedTrackNames;
  if (playableClips.length === 0) {
    clearRuntimeObjectAnimationPlayback(runtime, animationKey);
    return {
      ...baseUserData,
      creatureEquipmentModelPartItemSourceAnimationStatus: "missing-target-nodes",
      creatureEquipmentModelPartItemSourceAnimationSelectedClipNames: [matchingClip.name],
      creatureEquipmentModelPartItemSourceAnimationSuppressedMissingTargetTrackCount:
        suppressedTrackNames.length,
      creatureEquipmentModelPartItemSourceAnimationSuppressedMissingTargetTrackNames:
        suppressedTrackNames,
      creatureEquipmentModelPartItemSourceAnimationDuplicateTargetExpandedTrackCount:
        expandedSourceClip.expandedTrackCount,
      creatureEquipmentModelPartItemSourceAnimationDuplicateTargetExpandedTargetCount:
        expandedSourceClip.expandedTargetCount,
      creatureEquipmentModelPartItemSourceAnimationDuplicateTargetNames:
        expandedSourceClip.duplicateTargetNames
    };
  }

  itemGroup.userData = {
    ...itemGroup.userData,
    creatureAnimationRequestedClipName: requestedSourceAnimationName ?? "",
    creatureAnimationAvailableClipCount: sourceClips.length,
    creatureAnimationAvailableClipNames: sourceClipNames,
    creatureAnimationSelectedClipNames: playableClips
      .map((clip) => clip.name)
      .filter(Boolean),
    creatureAnimationSelectedClipTrackCounts: playableClips.map(
      (clip) => clip.tracks.length
    ),
    creatureAnimationSelectedClipTargetCounts: playableClips.map(
      (clip) => collectCreatureAnimationClipTargetNames(clip).length
    ),
    creatureAnimationSelectedClipTargetNames: playableClips.map((clip) =>
      collectCreatureAnimationClipTargetNames(clip).join(",")
    ),
    creatureAnimationSelectedClipBasePoseNames: playableClips
      .map((clip) =>
        typeof clip.userData?.creatureAnimationCompositeBaseClipName === "string"
          ? clip.userData.creatureAnimationCompositeBaseClipName
          : ""
      )
      .filter(Boolean),
    creatureAnimationSelectedClipBasePoseSkippedReasons: playableClips
      .map((clip) =>
        typeof clip.userData?.creatureAnimationCompositeBasePoseSkippedReason === "string"
          ? clip.userData.creatureAnimationCompositeBasePoseSkippedReason
          : ""
      )
      .filter(Boolean),
    creatureAnimationSelectedClipBasePoseCandidateNames: playableClips
      .map((clip) =>
        typeof clip.userData?.creatureAnimationCompositeBaseClipNameCandidate === "string"
          ? clip.userData.creatureAnimationCompositeBaseClipNameCandidate
          : ""
      )
      .filter(Boolean),
    creatureAnimationSelectionMode: "equipment-source-clip",
    creatureAnimationPlaybackRootName: itemGroup.name,
    creatureAnimationPlaybackRootMode: "equipment-source-hierarchy",
    creatureAnimationPlaybackInitialPoseApplied: true,
    creatureEquipmentModelPartItemSourceAnimationDuplicateTargetExpandedTrackCount:
      expandedSourceClip.expandedTrackCount,
    creatureEquipmentModelPartItemSourceAnimationDuplicateTargetExpandedTargetCount:
      expandedSourceClip.expandedTargetCount,
    creatureEquipmentModelPartItemSourceAnimationDuplicateTargetNames:
      expandedSourceClip.duplicateTargetNames,
    ...(suppressedTrackNames.length > 0
      ? {
          creatureAnimationSuppressedMissingTargetTrackCount:
            suppressedTrackNames.length,
          creatureAnimationSuppressedMissingTargetTrackNames:
            suppressedTrackNames
        }
      : {})
  };
  const playback = registerRuntimeObjectAnimationPlayback(
    runtime,
    animationKey,
    itemGroup,
    playableClips,
    {
      autoplay: true,
      applyInitialPose: true
    }
  );
  if (!playback) {
    return {
      ...baseUserData,
      creatureEquipmentModelPartItemSourceAnimationStatus: "unavailable",
      creatureEquipmentModelPartItemSourceAnimationSelectedClipNames: [matchingClip.name],
      creatureEquipmentModelPartItemSourceAnimationSuppressedMissingTargetTrackCount:
        suppressedTrackNames.length,
      creatureEquipmentModelPartItemSourceAnimationSuppressedMissingTargetTrackNames:
        suppressedTrackNames,
      creatureEquipmentModelPartItemSourceAnimationDuplicateTargetExpandedTrackCount:
        expandedSourceClip.expandedTrackCount,
      creatureEquipmentModelPartItemSourceAnimationDuplicateTargetExpandedTargetCount:
        expandedSourceClip.expandedTargetCount,
      creatureEquipmentModelPartItemSourceAnimationDuplicateTargetNames:
        expandedSourceClip.duplicateTargetNames
    };
  }
  const playbackUserData = {
    creatureEquipmentModelPartItemSourceAnimationStatus: "playing",
    creatureEquipmentModelPartItemSourceAnimationSelectedClipNames: playback.actionNames,
    creatureEquipmentModelPartItemSourceAnimationSelectedClipTrackCounts:
      playableClips.map((clip) => clip.tracks.length),
    creatureEquipmentModelPartItemSourceAnimationSelectedClipTargetCounts:
      playableClips.map((clip) => collectCreatureAnimationClipTargetNames(clip).length),
    creatureEquipmentModelPartItemSourceAnimationSelectedClipTargetNames:
      playableClips.map((clip) => collectCreatureAnimationClipTargetNames(clip).join(",")),
    creatureEquipmentModelPartItemSourceAnimationSuppressedMissingTargetTrackCount:
      suppressedTrackNames.length,
    creatureEquipmentModelPartItemSourceAnimationSuppressedMissingTargetTrackNames:
      suppressedTrackNames,
    creatureEquipmentModelPartItemSourceAnimationDuplicateTargetExpandedTrackCount:
      expandedSourceClip.expandedTrackCount,
    creatureEquipmentModelPartItemSourceAnimationDuplicateTargetExpandedTargetCount:
      expandedSourceClip.expandedTargetCount,
    creatureEquipmentModelPartItemSourceAnimationDuplicateTargetNames:
      expandedSourceClip.duplicateTargetNames,
    creatureEquipmentModelPartItemSourceAnimationPlaybackClipCount: playback.clipCount,
    creatureEquipmentModelPartItemSourceAnimationPlaybackMode: "three-animation-mixer",
    ...buildRuntimeObjectAnimationRunUserData(playback)
  };
  root.userData = {
    ...root.userData,
    creatureEquipmentModelPartLastSourceAnimationStatus: "playing",
    creatureEquipmentModelPartLastSourceAnimationClipNames: playback.actionNames
  };
  return {
    ...baseUserData,
    ...playbackUserData
  };
}

function resolveCreatureEquipmentSourceAnimationRequestName(
  requestedAnimationName: string | null,
  assembly: CreatureEquipmentModelPartAssembly
): string | null {
  const normalized = requestedAnimationName?.trim().toLowerCase() ?? "";
  if (!normalized) {
    return null;
  }
  if (!isCreatureHandheldCrossbowEquipmentAssembly(assembly)) {
    return requestedAnimationName?.trim() ?? null;
  }
  if (normalized === "bowshot") {
    return "xbowshot";
  }
  if (normalized === "bowrdy") {
    return "xbowrdy";
  }
  return requestedAnimationName?.trim() ?? null;
}

function createCreatureRuntimeAmmunitionSourcePlaceholder(
  entry: CreatureRenderEquipmentModelPartResolution
): THREE.Object3D {
  const placeholder = new THREE.Group();
  placeholder.name = `creature_equipment_model_part_${entry.partResref}_runtime_ammunition_placeholder`;
  placeholder.userData = {
    ...placeholder.userData,
    creatureEquipmentModelPartStatus: "loaded",
    creatureEquipmentModelPartCompositionStatus: "runtime-ammunition-placeholder",
    creatureEquipmentModelPartResRef: entry.partResref,
    creatureEquipmentModelPartEquipmentResRef: entry.equipmentResref,
    creatureEquipmentModelPartAttachmentTarget: entry.attachmentTarget,
    creatureRuntimeAmmunitionSourceModelStatus: "replaced-by-runtime-proxy"
  };
  return placeholder;
}

type CreatureRuntimeAmmunitionProxyKind = "arrow" | "bolt" | "bullet";

function resolveCreatureRuntimeAmmunitionProxyKind(
  assembly: CreatureEquipmentModelPartAssembly
): CreatureRuntimeAmmunitionProxyKind {
  const modelType = assembly.entries[0]?.entry.itemModelType?.trim().toLowerCase() ?? "";
  if (modelType === "wambu") {
    return "bullet";
  }
  if (modelType === "wambo") {
    return "bolt";
  }
  return "arrow";
}

function createCreatureRuntimeAmmunitionProxy(
  assembly: CreatureEquipmentModelPartAssembly
): THREE.Group {
  const proxy = new THREE.Group();
  const proxyKind = resolveCreatureRuntimeAmmunitionProxyKind(assembly);
  const resref = assembly.entries[0]?.entry.partResref ?? proxyKind;
  proxy.name = `creature_equipment_model_part_${resref}_runtime_${proxyKind}_proxy`;
  proxy.userData = {
    ...proxy.userData,
    creatureEquipmentModelPartStatus: "loaded",
    creatureEquipmentModelPartCompositionStatus: `runtime-${proxyKind}-proxy`,
    creatureEquipmentModelPartResRef: resref,
    creatureEquipmentModelPartEquipmentResRef: assembly.equipmentResref,
    creatureEquipmentModelPartAttachmentTarget: assembly.attachmentTarget,
    creatureRuntimeAmmunitionProxy: true,
    creatureRuntimeAmmunitionProxyKind: proxyKind,
    creatureRuntimeAmmunitionProxyLength:
      proxyKind === "bolt" ? CREATURE_RUNTIME_BOLT_PROXY_SHAFT_LENGTH : CREATURE_RUNTIME_ARROW_PROXY_LENGTH
  };

  if (proxyKind === "bullet") {
    const bulletMaterial = new THREE.MeshStandardMaterial({
      color: 0x5f6062,
      roughness: 0.82,
      metalness: 0.18
    });
    const bullet = new THREE.Mesh(
      new THREE.SphereGeometry(CREATURE_RUNTIME_BULLET_PROXY_RADIUS, 16, 12),
      bulletMaterial
    );
    bullet.name = `${proxy.name}_bullet`;
    bullet.userData = {
      ...proxy.userData,
      creatureRuntimeAmmunitionProxyPart: "bullet"
    };
    proxy.add(bullet);
    return proxy;
  }

  const shaftLength =
    proxyKind === "bolt"
      ? CREATURE_RUNTIME_BOLT_PROXY_SHAFT_LENGTH
      : CREATURE_RUNTIME_ARROW_PROXY_SHAFT_LENGTH;
  const shaftRadius =
    proxyKind === "bolt"
      ? CREATURE_RUNTIME_BOLT_PROXY_SHAFT_RADIUS
      : CREATURE_RUNTIME_ARROW_PROXY_SHAFT_RADIUS;
  const headLength =
    proxyKind === "bolt"
      ? CREATURE_RUNTIME_BOLT_PROXY_HEAD_LENGTH
      : CREATURE_RUNTIME_ARROW_PROXY_HEAD_LENGTH;
  const headRadius =
    proxyKind === "bolt"
      ? CREATURE_RUNTIME_BOLT_PROXY_HEAD_RADIUS
      : CREATURE_RUNTIME_ARROW_PROXY_HEAD_RADIUS;
  const shaftMaterial = new THREE.MeshStandardMaterial({
    color: 0x7a4a22,
    roughness: 0.72,
    metalness: 0.05
  });
  const headMaterial = new THREE.MeshStandardMaterial({
    color: 0xc9c2ae,
    roughness: 0.58,
    metalness: 0.15
  });
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(
      shaftRadius,
      shaftRadius,
      shaftLength,
      8
    ),
    shaftMaterial
  );
  shaft.name = `${proxy.name}_shaft`;
  shaft.position.y = shaftLength / 2;
  shaft.userData = {
    ...proxy.userData,
    creatureRuntimeAmmunitionProxyPart: "shaft"
  };
  const head = new THREE.Mesh(
    new THREE.ConeGeometry(
      headRadius,
      headLength,
      8
    ),
    headMaterial
  );
  head.name = `${proxy.name}_head`;
  head.position.y =
    shaftLength +
    headLength / 2;
  head.userData = {
    ...proxy.userData,
    creatureRuntimeAmmunitionProxyPart: "head"
  };
  proxy.add(shaft, head);
  return proxy;
}

function suppressCreatureRuntimeAmmunitionSourceMeshes(
  itemGroup: THREE.Object3D
): void {
  itemGroup.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }
    node.visible = false;
    node.userData = {
      ...node.userData,
      creatureRuntimeAmmunitionSourceMeshVisibility: "hidden-by-runtime-ammunition-proxy"
    };
  });
}

const CREATURE_RUNTIME_CROSSBOW_REAR_NODE_NAMES = [
  "bottom_butt",
  "middle_stock",
  "middle_grip"
];
const CREATURE_RUNTIME_CROSSBOW_FRONT_NODE_NAMES = [
  "head",
  "top_shaft",
  "top_shaft01",
  "top_catch"
];

function resolveCreatureRuntimeNodeWorldCenter(
  node: THREE.Object3D | null
): THREE.Vector3 | null {
  if (!node) {
    return null;
  }
  const center = new THREE.Vector3();
  if (node instanceof THREE.Mesh) {
    const geometry = node.geometry;
    if (!geometry.boundingBox) {
      geometry.computeBoundingBox();
    }
    if (geometry.boundingBox && !geometry.boundingBox.isEmpty()) {
      const box = geometry.boundingBox.clone().applyMatrix4(node.matrixWorld);
      box.getCenter(center);
      return center;
    }
  }
  const box = new THREE.Box3().setFromObject(node);
  if (!box.isEmpty()) {
    box.getCenter(center);
    return center;
  }
  node.getWorldPosition(center);
  return center;
}

function resolveCreatureRuntimeCrossbowMeshAxis(
  itemGroup: THREE.Object3D
): THREE.Vector3 | null {
  const rearNode = findCreatureRuntimeNodeByNormalizedNames(
    itemGroup,
    CREATURE_RUNTIME_CROSSBOW_REAR_NODE_NAMES
  );
  const frontNode = findCreatureRuntimeNodeByNormalizedNames(
    itemGroup,
    CREATURE_RUNTIME_CROSSBOW_FRONT_NODE_NAMES
  );
  const rearCenter = resolveCreatureRuntimeNodeWorldCenter(rearNode);
  const frontCenter = resolveCreatureRuntimeNodeWorldCenter(frontNode);
  if (!rearCenter || !frontCenter) {
    return null;
  }
  const axis = frontCenter.sub(rearCenter);
  return axis.lengthSq() >= 0.000001 ? axis.normalize() : null;
}

function hasCreatureRuntimeBowLauncherItemGroup(
  itemGroups: readonly THREE.Group[],
  ammunitionItemGroups: readonly THREE.Group[]
): boolean {
  const ammunitionGroups = new Set<THREE.Object3D>(ammunitionItemGroups);
  return itemGroups.some((itemGroup) => {
    if (ammunitionGroups.has(itemGroup)) {
      return false;
    }
    const transformStatus =
      typeof itemGroup.userData?.creatureEquipmentModelPartItemAttachmentTransformStatus ===
      "string"
        ? itemGroup.userData.creatureEquipmentModelPartItemAttachmentTransformStatus
        : "";
    return transformStatus.includes("held-bow");
  });
}

function resolveCreatureRuntimeAmmunitionDrawNode(
  itemGroups: readonly THREE.Group[],
  ammunitionItemGroups: readonly THREE.Group[]
): {
  node: THREE.Object3D;
  itemGroup: THREE.Group;
  mode: "bow" | "crossbow" | "unknown";
} | null {
  const ammunitionGroups = new Set<THREE.Object3D>(ammunitionItemGroups);
  for (const itemGroup of itemGroups) {
    if (ammunitionGroups.has(itemGroup)) {
      continue;
    }
    const drawNode = findCreatureRuntimeNodeByNormalizedNames(
      itemGroup,
      CREATURE_RUNTIME_AMMUNITION_DRAW_NODE_NAMES
    );
    if (drawNode) {
      const transformStatus =
        typeof itemGroup.userData?.creatureEquipmentModelPartItemAttachmentTransformStatus ===
        "string"
          ? itemGroup.userData.creatureEquipmentModelPartItemAttachmentTransformStatus
          : "";
      return {
        node: drawNode,
        itemGroup,
        mode: transformStatus.includes("crossbow")
          ? "crossbow"
          : transformStatus.includes("bow")
            ? "bow"
            : "unknown"
      };
    }
  }
  return null;
}

function resolveCreatureRuntimeAmmunitionAim(
  root: THREE.Object3D,
  itemGroups: readonly THREE.Group[],
  ammunitionItemGroups: readonly THREE.Group[]
): CreatureRuntimeAmmunitionAim | null {
  root.updateMatrixWorld(true);
  const rightHand =
    findCreatureRuntimeNodeByNormalizedName(root, "rhand_g") ??
    findCreatureRuntimeNodeByNormalizedName(root, "rhand");
  const leftHand =
    findCreatureRuntimeNodeByNormalizedName(root, "lhand_g") ??
    findCreatureRuntimeNodeByNormalizedName(root, "lhand");
  if (!rightHand || !leftHand) {
    return null;
  }

  const rightWorld = new THREE.Vector3();
  const leftWorld = new THREE.Vector3();
  const rootWorldQuaternion = new THREE.Quaternion();
  const rootForwardDirection = new THREE.Vector3(0, 0, -1);
  rightHand.getWorldPosition(rightWorld);
  leftHand.getWorldPosition(leftWorld);
  root.getWorldQuaternion(rootWorldQuaternion);
  rootForwardDirection.applyQuaternion(rootWorldQuaternion).normalize();

  const drawNodeMatch = resolveCreatureRuntimeAmmunitionDrawNode(
    itemGroups,
    ammunitionItemGroups
  );
  if (drawNodeMatch) {
    const { node: drawNode, itemGroup: drawItemGroup, mode: drawMode } = drawNodeMatch;
    const drawWorld = new THREE.Vector3();
    const drawWorldQuaternion = new THREE.Quaternion();
    drawNode.getWorldPosition(drawWorld);
    drawNode.getWorldQuaternion(drawWorldQuaternion);
    const drawAxisDirection = new THREE.Vector3(0, 1, 0)
      .applyQuaternion(drawWorldQuaternion)
      .normalize();
    if (drawMode === "bow") {
      if (rootForwardDirection.lengthSq() >= 0.000001) {
        return {
          originWorld: drawWorld.clone(),
          directionWorld: rootForwardDirection.clone(),
          source: "launcher-draw-node",
          mode: "bow-root-forward-axis",
          nodeName: drawNode.name || "",
          nodeWorldPosition: drawWorld.clone()
        };
      }
    }
    const handToDrawDirection = drawWorld.clone().sub(rightWorld);
    let sourceAxisDirection = drawAxisDirection;
    let crossbowAxisInverted = false;
    let crossbowMeshAxis: THREE.Vector3 | null = null;
    let crossbowAxisDot: number | null = null;
    let crossbowAxisSelection = "";
    if (drawMode === "crossbow") {
      crossbowMeshAxis = resolveCreatureRuntimeCrossbowMeshAxis(drawItemGroup);
      crossbowAxisDot = crossbowMeshAxis
        ? drawAxisDirection.dot(crossbowMeshAxis)
        : null;
      crossbowAxisInverted =
        !crossbowMeshAxis || crossbowAxisDot === null || crossbowAxisDot < 0;
      crossbowAxisSelection = !crossbowMeshAxis
        ? "fallback-inverted-no-crossbow-mesh-axis"
        : crossbowAxisInverted
          ? "inverted-mesh-axis-dot-negative"
          : "direct-mesh-axis-dot-positive";
      sourceAxisDirection = drawAxisDirection.clone().multiplyScalar(
        crossbowAxisInverted ? -1 : 1
      );
    }
    const directionWorld =
      sourceAxisDirection.lengthSq() >= 0.000001
        ? sourceAxisDirection
        : handToDrawDirection.lengthSq() >= 0.000001
          ? handToDrawDirection.normalize()
          : leftWorld.clone().sub(rightWorld).normalize();
    if (directionWorld.lengthSq() >= 0.000001) {
      return {
        originWorld: drawWorld,
        directionWorld,
        source: "launcher-draw-node",
        mode:
          drawMode === "crossbow"
            ? crossbowAxisInverted
              ? "launcher-draw-axis-inverted-crossbow-source"
              : "launcher-draw-axis-crossbow-source"
            : "launcher-draw-axis",
        nodeName: drawNode.name || "",
        nodeWorldPosition: drawWorld.clone(),
        crossbowMeshAxis,
        crossbowAxisDot,
        crossbowAxisSelection
      };
    }
  }

  if (
    hasCreatureRuntimeBowLauncherItemGroup(itemGroups, ammunitionItemGroups) &&
    rootForwardDirection.lengthSq() >= 0.000001
  ) {
    return {
      originWorld: rightWorld.clone(),
      directionWorld: rootForwardDirection.clone(),
      source: "animated-hands",
      mode: "bow-root-forward-axis",
      nodeName: "",
      nodeWorldPosition: rightWorld.clone()
    };
  }

  const handDirection = leftWorld.clone().sub(rightWorld);
  if (handDirection.lengthSq() < 0.000001) {
    return null;
  }
  return {
    originWorld: rightWorld.clone(),
    directionWorld: handDirection.normalize(),
    source: "animated-hands",
    mode: "animated-hands",
    nodeName: "",
    nodeWorldPosition: null
  };
}

function updateCreatureRuntimeAmmunitionVisuals(
  root: THREE.Object3D,
  itemGroups: readonly THREE.Group[],
  equipmentItemGroups: readonly THREE.Group[],
  animationTimeSeconds?: number,
  animationCompleted = false
): void {
  if (itemGroups.length === 0) {
    return;
  }
  const aim = resolveCreatureRuntimeAmmunitionAim(
    root,
    equipmentItemGroups,
    itemGroups
  );
  if (!aim) {
    return;
  }
  const localDirection = new THREE.Vector3();
  const localOrigin = new THREE.Vector3();
  const parentWorldQuaternion = new THREE.Quaternion();
  const yAxis = new THREE.Vector3(0, 1, 0);
  const hasPlaybackTime =
    typeof animationTimeSeconds === "number" && Number.isFinite(animationTimeSeconds);
  const playbackPhase = hasPlaybackTime
    ? Math.max(0, Math.min(1, animationTimeSeconds))
    : 0;
  const shouldShowAmmunition =
    !animationCompleted &&
    hasPlaybackTime &&
    playbackPhase >= 0.14 &&
    playbackPhase <= 0.62;
  itemGroups.forEach((itemGroup) => {
    const parent = itemGroup.parent;
    if (!parent) {
      return;
    }
    itemGroup.visible = shouldShowAmmunition;
    parent.getWorldQuaternion(parentWorldQuaternion).invert();
    localDirection.copy(aim.directionWorld).applyQuaternion(parentWorldQuaternion).normalize();
    localOrigin.copy(aim.originWorld);
    parent.worldToLocal(localOrigin);
    itemGroup.position.copy(localOrigin);
    itemGroup.quaternion.setFromUnitVectors(yAxis, localDirection);
    itemGroup.userData = {
      ...itemGroup.userData,
      creatureRuntimeAmmunitionProxyGripOffset:
        formatCreatureRuntimeVector(localOrigin),
      creatureRuntimeAmmunitionProxyOrigin:
        formatCreatureRuntimeVector(aim.originWorld),
      creatureRuntimeAmmunitionProxyDirection:
        formatCreatureRuntimeVector(aim.directionWorld),
      creatureRuntimeAmmunitionProxyAimSource: aim.source,
      creatureRuntimeAmmunitionProxyAimMode: aim.mode,
      creatureRuntimeAmmunitionProxyAimNodeName: aim.nodeName,
      creatureRuntimeAmmunitionProxyAimNodeWorldPosition:
        aim.nodeWorldPosition
          ? formatCreatureRuntimeVector(aim.nodeWorldPosition)
          : "",
      creatureRuntimeAmmunitionProxyCrossbowMeshAxis:
        aim.crossbowMeshAxis
          ? formatCreatureRuntimeVector(aim.crossbowMeshAxis)
          : "",
      creatureRuntimeAmmunitionProxyCrossbowAxisDot:
        typeof aim.crossbowAxisDot === "number" && Number.isFinite(aim.crossbowAxisDot)
          ? aim.crossbowAxisDot.toFixed(4)
          : "",
      creatureRuntimeAmmunitionProxyCrossbowAxisSelection:
        aim.crossbowAxisSelection ?? "",
      creatureRuntimeAmmunitionProxyVisibility:
        shouldShowAmmunition ? "visible" : "hidden-during-ranged-recovery",
      creatureRuntimeAmmunitionProxyVisibilityPhase:
        playbackPhase.toFixed(3),
      creatureRuntimeAmmunitionProxyAnimationCompleted:
        animationCompleted ? "true" : "false"
    };
  });
}

function applyCreatureEquipmentModelParts(input: {
  runtime: CreatureEquipmentModelPartRuntime;
  objectId: string;
  root: THREE.Object3D;
  resolutions: CreatureRenderEquipmentModelPartResolution[];
  objectRadius: number;
  textureUrlsByReference: Map<string, string>;
  textureBindings?: NonNullable<CreatureViewportRenderPayload["renderPackage"]>["textureBindings"];
  auroraMaterial?: NonNullable<CreatureViewportRenderPayload["renderPackage"]>["auroraMaterial"];
  colors?: CreatureRenderColors;
  appearanceProfile?: CreatureRenderAppearanceProfile;
  wireframe: boolean;
  requestedAnimationName?: string | null;
}): void {
  const {
    runtime,
    objectId,
    root,
    resolutions,
    objectRadius,
    textureUrlsByReference,
    textureBindings,
    auroraMaterial,
    colors,
    appearanceProfile,
    wireframe,
    requestedAnimationName: explicitRequestedAnimationName
  } = input;
  const requestedAnimationName = resolveCreatureEquipmentRequestedAnimationName(
    explicitRequestedAnimationName,
    root
  );
  const requestToken = `equipment:${objectId}:${++creatureEquipmentModelPartRequestSequence}`;
  removeCreatureEquipmentModelPartGroups(root);
  clearCreatureEquipmentSourceAnimationPlaybacks(runtime, objectId);
  if (resolutions.length === 0) {
    root.userData = {
      ...root.userData,
      [CREATURE_EQUIPMENT_MODEL_PART_REQUEST_TOKEN_KEY]: requestToken,
      creatureEquipmentModelPartLoadStatus: "not-applicable",
      creatureEquipmentModelPartLoadedCount: 0,
      creatureEquipmentModelPartTotalCount: 0
    };
    return;
  }

  root.userData = {
    ...root.userData,
    ...buildCreatureEquipmentModelPartGroupUserData(resolutions),
    [CREATURE_EQUIPMENT_MODEL_PART_REQUEST_TOKEN_KEY]: requestToken,
    creatureEquipmentModelPartLoadStatus: "loading",
    creatureEquipmentModelPartLoadedCount: 0,
    creatureEquipmentModelPartTotalCount: resolutions.length
  };

  void Promise.all(
    resolutions.map(async (entry) => {
      if (isCreatureRuntimeAmmunitionModelPartResolution(entry)) {
        return {
          entry,
          model: createCreatureRuntimeAmmunitionSourcePlaceholder(entry),
          sourceAnimationClips: []
        };
      }
      const model = await ensurePlaceableModel(runtime, entry.modelUrl, {
        cloneMaterials: true,
        cacheKey: entry.modelCacheKey,
        timeoutMs: CREATURE_EQUIPMENT_MODEL_PART_LOAD_TIMEOUT_MS
      }).catch(() => null);
      return {
        entry,
        model,
        sourceAnimationClips: model
          ? await resolveCreatureEquipmentModelPartSourceAnimationClips(
              runtime,
              entry,
              model
            )
          : []
      };
    })
  ).then(async (resolvedEntries) => {
    const latestRoot = runtime.objectMeshById.get(objectId);
    if (
      !latestRoot ||
      latestRoot !== root ||
      latestRoot.userData?.[CREATURE_EQUIPMENT_MODEL_PART_REQUEST_TOKEN_KEY] !==
        requestToken
    ) {
      return;
    }
    const loadedEntries = resolvedEntries.flatMap(
      (resolvedEntry): LoadedCreatureEquipmentModelPartEntry[] =>
        resolvedEntry.model
          ? [
              {
                entry: resolvedEntry.entry,
                model: resolvedEntry.model,
                sourceAnimationClips: resolvedEntry.sourceAnimationClips
              }
            ]
          : []
    );
    if (loadedEntries.length === 0) {
      const missingModelPartUserData = {
        ...buildCreatureEquipmentModelPartGroupUserData(resolutions),
        creatureEquipmentModelPartLoadStatus: "missing",
        creatureEquipmentModelPartLoadedCount: 0,
        creatureEquipmentModelPartTotalCount: resolutions.length
      };
      latestRoot.userData = {
        ...latestRoot.userData,
        ...missingModelPartUserData
      };
      writePlaceableModelDebugStatus(runtime, "loaded", {
        objectId,
        loadPhase: "complete",
        creatureEquipmentModelPartLoadStatus: "missing",
        creatureEquipmentModelPartLoadedCount: 0,
        creatureEquipmentModelPartTotalCount: resolutions.length,
        creatureEquipmentModelPartResRefs: resolutions
          .map((entry) => entry.partResref)
          .join("|"),
        creatureEquipmentModelPartEquipmentResRefs: resolutions
          .map((entry) => entry.equipmentResref)
          .join("|")
      });
      return;
    }

    if (
      runtime.objectMeshById.get(objectId) !== latestRoot ||
      latestRoot.userData?.[CREATURE_EQUIPMENT_MODEL_PART_REQUEST_TOKEN_KEY] !==
        requestToken
    ) {
      return;
    }
    const equipmentTextureUrlsByReference = new Map<string, string>();
    loadedEntries.forEach(({ model }) => {
      resolvePlaceableModelMaterialMapTextureUrlsByReference(
        model,
        textureUrlsByReference,
        { auroraMaterial }
      ).forEach((textureDeliveryUrl, reference) => {
        equipmentTextureUrlsByReference.set(reference, textureDeliveryUrl);
      });
    });
    const textureUrlsForEquipment =
      equipmentTextureUrlsByReference.size > 0
        ? equipmentTextureUrlsByReference
        : textureUrlsByReference;
    const texturesByReference =
      textureUrlsForEquipment.size > 0 && !wireframe
        ? collectCachedPlaceableTexturesByReference(runtime, textureUrlsForEquipment)
        : new Map<string, THREE.Texture>();
    const applyEquipmentTexturesToModels = (
      textures: Map<string, THREE.Texture>,
      additionalTargets: THREE.Object3D[] = [],
      additionalForceTargets: THREE.Object3D[] = []
    ): {
      creaturePltTextureBridge: ReturnType<typeof buildCreaturePltTextureBridge>;
      textureAppliedModelCount: number;
      forcedPrimaryTextureMaterialCount: number;
    } => {
      textures.forEach((texture, reference) => {
        texture.userData = {
          ...texture.userData,
          auroraTextureReference: reference
        };
      });
      const creaturePltTextureBridge = buildCreaturePltTextureBridge(
        textures,
        colors
      );
      let textureAppliedModelCount = 0;
      let forcedPrimaryTextureMaterialCount = 0;
      if (creaturePltTextureBridge.texturesByReference.size > 0) {
        const textureTargets = [
          ...loadedEntries.map(({ model }) => model),
          ...additionalTargets
        ];
        const seenTargets = new Set<THREE.Object3D>();
        textureTargets.forEach((model) => {
          if (seenTargets.has(model)) {
            return;
          }
          seenTargets.add(model);
          applyPlaceableTexturesToModel(
            model,
            creaturePltTextureBridge.texturesByReference,
            undefined,
            {
              auroraMaterial,
              textureBindings
            }
          );
          forcedPrimaryTextureMaterialCount +=
            forceCreatureEquipmentPrimaryTexturesToModel(
              model,
              creaturePltTextureBridge.texturesByReference
            );
          textureAppliedModelCount += 1;
        });
        const forceTargets = [
          ...textureTargets,
          ...additionalForceTargets
        ];
        const seenForceTargets = new Set<THREE.Object3D>();
        forceTargets.forEach((model) => {
          if (seenForceTargets.has(model)) {
            return;
          }
          seenForceTargets.add(model);
          forcedPrimaryTextureMaterialCount +=
            forceCreatureEquipmentPrimaryTexturesToModel(
              model,
              creaturePltTextureBridge.texturesByReference
            );
        });
      }
      return {
        creaturePltTextureBridge,
        textureAppliedModelCount,
        forcedPrimaryTextureMaterialCount
      };
    };
    const initialEquipmentTextureApplication =
      applyEquipmentTexturesToModels(texturesByReference);
    let postAttachEquipmentTextureApplication = initialEquipmentTextureApplication;
    const creaturePltTextureBridge =
      initialEquipmentTextureApplication.creaturePltTextureBridge;
    const textureAppliedModelCount =
      initialEquipmentTextureApplication.textureAppliedModelCount;
    const equipmentTextureReferences = Array.from(textureUrlsForEquipment.keys()).sort(
      (left, right) => left.localeCompare(right)
    );
    const loadedEquipmentTextureReferences = Array.from(texturesByReference.keys()).sort(
      (left, right) => left.localeCompare(right)
    );
    const bridgedEquipmentTextureReferences = Array.from(
      creaturePltTextureBridge.texturesByReference.keys()
    ).sort((left, right) => left.localeCompare(right));
    const tintResults =
      !wireframe
        ? loadedEntries
            .map(({ model }) => applyCreatureMaterialTintToModel(model, colors))
            .filter((result): result is CreatureTintApplicationResult => Boolean(result))
        : [];

    const anchors = collectCreatureEquipmentAttachmentAnchors(latestRoot);
    const fallbackGroup = new THREE.Group();
    fallbackGroup.name = "creature_equipment_model_parts_fallback";
    fallbackGroup.userData = {
      creatureEquipmentModelPartFallbackGroup: true
    };
    const anchoredTargets: string[] = [];
    const fallbackTargets: string[] = [];
    const itemGroupTransformStatuses: string[] = [];
    const itemGroupSourceAnimationStatuses: string[] = [];
    const itemGroupSourceAnimationClipNames: string[] = [];
    const itemGroupSourceAnimationLoopModes: string[] = [];
    const itemGroupSourceAnimationRecoveryPoseClipNames: string[] = [];
    const itemGroupSourceAnimationRecoveryPoseCandidateNames: string[] = [];
    const itemGroupSourceAnimationRecoveryPoseFallbacks: string[] = [];
    const itemGroupSourceAnimationRecoveryPoseFallbackReasons: string[] = [];
    const itemGroupSourceAnimationRecoveryPoseSkippedReasons: string[] = [];
    const equipmentItemGroups: THREE.Group[] = [];
    const runtimeAmmunitionItemGroups: THREE.Group[] = [];

    const itemAssemblies = buildCreatureEquipmentModelPartAssemblies(loadedEntries);
    itemAssemblies.forEach((assembly, assemblyIndex) => {
      const target = assembly.attachmentTarget || "rootdummy";
      const itemGroup = createCreatureEquipmentModelPartItemGroup(
        assembly,
        assemblyIndex
      );
      equipmentItemGroups.push(itemGroup);
      const anchor = resolveCreatureEquipmentAssemblyAnchor(anchors, target, assembly);
      const runtimeAmmunitionAssembly =
        isCreatureRuntimeAmmunitionEquipmentAssembly(assembly);
      assembly.entries.forEach(({ entry, model, sourceAnimationClips }) => {
        const partGroup = createCreatureEquipmentModelPartFlatPartGroup({
          entry,
          model,
          assemblyKey: assembly.equipmentKey,
          target,
          sourceAnimationClips
        });
        itemGroup.add(partGroup);
      });
      if (runtimeAmmunitionAssembly) {
        suppressCreatureRuntimeAmmunitionSourceMeshes(itemGroup);
        itemGroup.add(createCreatureRuntimeAmmunitionProxy(assembly));
        runtimeAmmunitionItemGroups.push(itemGroup);
      }
      itemGroup.position.set(0, 0, 0);
      itemGroup.quaternion.identity();
      itemGroup.scale.set(1, 1, 1);
      const weaponScale = resolveCreatureEquipmentAssemblyWeaponScale(
        assembly,
        appearanceProfile
      );
      itemGroup.scale.setScalar(weaponScale.scale);
      itemGroup.userData = {
        ...itemGroup.userData,
        creatureEquipmentModelPartItemWeaponScale: weaponScale.scale,
        creatureEquipmentModelPartItemWeaponScaleSource: weaponScale.source,
        creatureEquipmentModelPartItemResolvedAnchorName: anchor?.name ?? "",
        creatureEquipmentModelPartItemResolvedAnchorSource:
          anchor && normalizeCreatureNodeName(anchor.name) !== normalizeCreatureNodeName(target)
            ? "hand-dummy-preferred"
            : anchor
              ? "attachment-target"
              : "fallback-offset"
      };
      itemGroupTransformStatuses.push(
        applyCreatureEquipmentItemAttachmentTransform(
          itemGroup,
          assembly,
          anchor ? "skeleton-anchor" : "fallback-offset"
        )
      );
      const sourceAnimationUserData = applyCreatureEquipmentSourceAnimationPlayback({
        runtime,
        objectId,
        root: latestRoot,
        itemGroup,
        assembly,
        requestedAnimationName
      });
      itemGroup.userData = {
        ...itemGroup.userData,
        ...sourceAnimationUserData
      };
      itemGroupSourceAnimationStatuses.push(
        String(
          sourceAnimationUserData.creatureEquipmentModelPartItemSourceAnimationStatus ??
            "unknown"
        )
      );
      itemGroupSourceAnimationClipNames.push(
        Array.isArray(
          sourceAnimationUserData.creatureEquipmentModelPartItemSourceAnimationSelectedClipNames
        )
          ? sourceAnimationUserData.creatureEquipmentModelPartItemSourceAnimationSelectedClipNames
              .join(",")
          : ""
      );
      itemGroupSourceAnimationLoopModes.push(
        readUserDataStringArray(
          sourceAnimationUserData.creatureAnimationPlaybackLoopModes
        ).join(",")
      );
      itemGroupSourceAnimationRecoveryPoseClipNames.push(
        readUserDataStringArray(
          sourceAnimationUserData.creatureAnimationPlaybackRecoveryPoseClipNames
        ).join(",")
      );
      itemGroupSourceAnimationRecoveryPoseCandidateNames.push(
        readUserDataStringArray(
          sourceAnimationUserData.creatureAnimationPlaybackRecoveryPoseCandidateNames
        ).join(",")
      );
      itemGroupSourceAnimationRecoveryPoseFallbacks.push(
        readUserDataStringArray(
          sourceAnimationUserData.creatureAnimationPlaybackRecoveryPoseFallbacks
        ).join(",")
      );
      itemGroupSourceAnimationRecoveryPoseFallbackReasons.push(
        readUserDataStringArray(
          sourceAnimationUserData.creatureAnimationPlaybackRecoveryPoseFallbackReasons
        ).join(",")
      );
      itemGroupSourceAnimationRecoveryPoseSkippedReasons.push(
        readUserDataStringArray(
          sourceAnimationUserData.creatureAnimationPlaybackRecoveryPoseSkippedReasons
        ).join(",")
      );
      if (anchor) {
        anchor.add(itemGroup);
        anchoredTargets.push(...assembly.entries.map(() => target));
        return;
      }
      itemGroup.position.copy(
        resolveCreatureEquipmentFallbackPosition(target, objectRadius, assemblyIndex)
      );
      fallbackGroup.add(itemGroup);
      fallbackTargets.push(...assembly.entries.map(() => target));
    });

    if (runtimeAmmunitionItemGroups.length > 0) {
      const writeRuntimeAmmunitionFrameDiagnostics = (): void => {
        const diagnostics = collectCreatureEquipmentModelPartRuntimeDiagnostics(latestRoot);
        writeCreaturePartModelRuntimeDetails(runtime, {
          equipmentVisibleMeshCount: diagnostics.visibleMeshCount,
          equipmentVisibleMeshNames: diagnostics.visibleMeshNames,
          equipmentVisibleMeshSlots: diagnostics.visibleMeshSlots,
          equipmentVisibleMeshCenters: diagnostics.visibleMeshCenters,
          equipmentVisibleMeshSizes: diagnostics.visibleMeshSizes,
          equipmentVisibleMeshParentPaths: diagnostics.visibleMeshParentPaths,
          equipmentRuntimeAmmunitionProxyAimSources:
            diagnostics.runtimeAmmunitionProxyAimSources,
          equipmentRuntimeAmmunitionProxyAimModes:
            diagnostics.runtimeAmmunitionProxyAimModes,
          equipmentRuntimeAmmunitionProxyAimNodeNames:
            diagnostics.runtimeAmmunitionProxyAimNodeNames,
          equipmentRuntimeAmmunitionProxyOrigins:
            diagnostics.runtimeAmmunitionProxyOrigins,
          equipmentRuntimeAmmunitionProxyDirections:
            diagnostics.runtimeAmmunitionProxyDirections,
          equipmentRuntimeAmmunitionProxyCrossbowMeshAxes:
            diagnostics.runtimeAmmunitionProxyCrossbowMeshAxes,
          equipmentRuntimeAmmunitionProxyCrossbowAxisDots:
            diagnostics.runtimeAmmunitionProxyCrossbowAxisDots,
          equipmentRuntimeAmmunitionProxyCrossbowAxisSelections:
            diagnostics.runtimeAmmunitionProxyCrossbowAxisSelections
        });
      };
      latestRoot.userData = {
        ...latestRoot.userData,
        creatureRuntimeEquipmentVisualUpdate: (
          _deltaSeconds?: number,
          _elapsedSeconds?: number,
          animationTimeSeconds?: number,
          animationCompleted?: boolean
        ): void => {
          updateCreatureRuntimeAmmunitionVisuals(
            latestRoot,
            runtimeAmmunitionItemGroups,
            equipmentItemGroups,
            animationTimeSeconds,
            Boolean(animationCompleted)
          );
          writeRuntimeAmmunitionFrameDiagnostics();
        }
      };
      updateCreatureRuntimeAmmunitionVisuals(
        latestRoot,
        runtimeAmmunitionItemGroups,
        equipmentItemGroups,
        0
      );
      writeRuntimeAmmunitionFrameDiagnostics();
    }

    if (fallbackGroup.children.length > 0) {
      latestRoot.add(fallbackGroup);
    }

    const modelPartGroupUserData = {
      ...buildCreatureEquipmentModelPartGroupUserData(resolutions),
      creatureEquipmentModelPartLoadStatus:
        loadedEntries.length === resolutions.length ? "loaded" : "partial",
      creatureEquipmentModelPartLoadedCount: loadedEntries.length,
      creatureEquipmentModelPartTotalCount: resolutions.length,
      creatureEquipmentModelPartMode:
        anchoredTargets.length > 0 && fallbackTargets.length === 0
          ? "skeleton-anchors"
          : anchoredTargets.length > 0
            ? "mixed"
            : "fallback-offsets",
      creatureEquipmentModelPartAnchoredTargets: anchoredTargets,
      creatureEquipmentModelPartFallbackTargets: fallbackTargets,
      creatureEquipmentModelPartItemGroupCount: itemAssemblies.length,
      creatureEquipmentModelPartItemGroupResRefs: itemAssemblies.map(
        (assembly) => assembly.equipmentResref
      ),
      creatureEquipmentModelPartItemGroupTransformStatuses: itemGroupTransformStatuses,
      creatureEquipmentModelPartItemGroupSourceAnimationStatuses:
        itemGroupSourceAnimationStatuses,
      creatureEquipmentModelPartItemGroupSourceAnimationClipNames:
        itemGroupSourceAnimationClipNames,
      creatureEquipmentModelPartItemGroupSourceAnimationLoopModes:
        itemGroupSourceAnimationLoopModes,
      creatureEquipmentModelPartItemGroupSourceAnimationRecoveryPoseClipNames:
        itemGroupSourceAnimationRecoveryPoseClipNames,
      creatureEquipmentModelPartItemGroupSourceAnimationRecoveryPoseCandidateNames:
        itemGroupSourceAnimationRecoveryPoseCandidateNames,
      creatureEquipmentModelPartItemGroupSourceAnimationRecoveryPoseFallbacks:
        itemGroupSourceAnimationRecoveryPoseFallbacks,
      creatureEquipmentModelPartItemGroupSourceAnimationRecoveryPoseFallbackReasons:
        itemGroupSourceAnimationRecoveryPoseFallbackReasons,
      creatureEquipmentModelPartItemGroupSourceAnimationRecoveryPoseSkippedReasons:
        itemGroupSourceAnimationRecoveryPoseSkippedReasons,
      creatureEquipmentModelPartRequestedSourceAnimationName:
        requestedAnimationName ?? "",
      creatureEquipmentModelPartTextureStatus:
        textureUrlsForEquipment.size === 0
          ? "not-applicable"
          : wireframe
            ? "skipped"
            : texturesByReference.size > 0
              ? "applied"
              : "loading",
      creatureEquipmentModelPartTextureReferenceCount: textureUrlsForEquipment.size,
      creatureEquipmentModelPartTextureReferences: equipmentTextureReferences,
      creatureEquipmentModelPartTextureLoadedCount: texturesByReference.size,
      creatureEquipmentModelPartTextureLoadedReferences: loadedEquipmentTextureReferences,
      creatureEquipmentModelPartTextureBridgeReferences: bridgedEquipmentTextureReferences,
      creatureEquipmentModelPartTextureAppliedModelCount: textureAppliedModelCount,
      creatureEquipmentModelPartForcedPrimaryTextureMaterialCount:
        initialEquipmentTextureApplication.forcedPrimaryTextureMaterialCount,
      creatureEquipmentModelPartPltBridgeStatus:
        creaturePltTextureBridge.appliedCount > 0 ? "applied" : "not-applicable",
      creatureEquipmentModelPartPltBridgeCount: creaturePltTextureBridge.appliedCount,
      creatureEquipmentModelPartTintStatus:
        tintResults.length > 0 ? "applied" : "not-applicable",
      creatureEquipmentModelPartTintAppliedCount: tintResults.reduce(
        (sum, result) => sum + result.appliedCount,
        0
      )
    };
    const group = new THREE.Group();
    group.name = "creature_equipment_model_parts";
    group.userData = {
      ...modelPartGroupUserData,
      creatureEquipmentModelPartGroupStatus: "source-equipment-model-parts"
    };
    if (fallbackGroup.parent === latestRoot) {
      latestRoot.remove(fallbackGroup);
      group.add(fallbackGroup);
    }
    latestRoot.add(group);
    latestRoot.userData = {
      ...latestRoot.userData,
      ...modelPartGroupUserData
    };
    if (texturesByReference.size > 0) {
      postAttachEquipmentTextureApplication = applyEquipmentTexturesToModels(
        texturesByReference,
        [group],
        [latestRoot]
      );
      const postAttachTextureUserData = {
        creatureEquipmentModelPartForcedPrimaryTextureMaterialCount:
          postAttachEquipmentTextureApplication.forcedPrimaryTextureMaterialCount
      };
      latestRoot.userData = {
        ...latestRoot.userData,
        ...postAttachTextureUserData
      };
      group.userData = {
        ...group.userData,
        ...postAttachTextureUserData
      };
    }
    if (
      textureUrlsForEquipment.size > 0 &&
      !wireframe &&
      texturesByReference.size < textureUrlsForEquipment.size
    ) {
      void ensurePlaceableTexturesByReferenceProgressive(
        runtime,
        textureUrlsForEquipment,
        ({ texturesByReference: progressiveTexturesByReference }) => {
          const currentRoot = runtime.objectMeshById.get(objectId);
          if (
            !currentRoot ||
            currentRoot !== latestRoot ||
            currentRoot.userData?.[CREATURE_EQUIPMENT_MODEL_PART_REQUEST_TOKEN_KEY] !==
              requestToken
          ) {
            return;
          }
          const textureApplication = applyEquipmentTexturesToModels(
            progressiveTexturesByReference,
            [group],
            [currentRoot]
          );
          const textureUserData = {
            creatureEquipmentModelPartTextureStatus: "loading",
            creatureEquipmentModelPartTextureReferences: equipmentTextureReferences,
            creatureEquipmentModelPartTextureLoadedCount:
              progressiveTexturesByReference.size,
            creatureEquipmentModelPartTextureLoadedReferences: Array.from(
              progressiveTexturesByReference.keys()
            ).sort((left, right) => left.localeCompare(right)),
            creatureEquipmentModelPartTextureBridgeReferences: Array.from(
              textureApplication.creaturePltTextureBridge.texturesByReference.keys()
            ).sort((left, right) => left.localeCompare(right)),
            creatureEquipmentModelPartTextureAppliedModelCount:
              textureApplication.textureAppliedModelCount,
            creatureEquipmentModelPartForcedPrimaryTextureMaterialCount:
              textureApplication.forcedPrimaryTextureMaterialCount,
            creatureEquipmentModelPartPltBridgeStatus:
              textureApplication.creaturePltTextureBridge.appliedCount > 0
                ? "applied"
                : "not-applicable",
            creatureEquipmentModelPartPltBridgeCount:
              textureApplication.creaturePltTextureBridge.appliedCount
          };
          currentRoot.userData = {
            ...currentRoot.userData,
            ...textureUserData
          };
          group.userData = {
            ...group.userData,
            ...textureUserData
          };
          writePlaceableModelDebugStatus(runtime, "loading", {
            objectId,
            loadPhase: "creature-equipment-textures",
            textureStatus: "loading",
            textureCount: textureUrlsForEquipment.size,
            textureLoaded: progressiveTexturesByReference.size,
            textureSource: summarizePlaceableTextureSourceFormats(
              progressiveTexturesByReference.values()
            ),
            creatureMaterialTextureEvidence:
              summarizeCreatureMaterialTextureEvidence(currentRoot),
            creatureEquipmentModelPartTextureStatus: "loading",
            creatureEquipmentModelPartTextureReferenceCount:
              textureUrlsForEquipment.size,
            creatureEquipmentModelPartTextureReferences:
              equipmentTextureReferences.join("|"),
            creatureEquipmentModelPartTextureLoadedCount:
              progressiveTexturesByReference.size,
            creatureEquipmentModelPartTextureLoadedReferences: Array.from(
              progressiveTexturesByReference.keys()
            )
              .sort((left, right) => left.localeCompare(right))
              .join("|"),
            creatureEquipmentModelPartTextureBridgeReferences: Array.from(
              textureApplication.creaturePltTextureBridge.texturesByReference.keys()
            )
              .sort((left, right) => left.localeCompare(right))
              .join("|"),
            creatureEquipmentModelPartTextureAppliedModelCount:
              textureApplication.textureAppliedModelCount,
            creatureEquipmentModelPartForcedPrimaryTextureMaterialCount:
              textureApplication.forcedPrimaryTextureMaterialCount
          });
        }
      ).then((loadedTexturesByReference) => {
        const currentRoot = runtime.objectMeshById.get(objectId);
        if (
          !currentRoot ||
          currentRoot !== latestRoot ||
          currentRoot.userData?.[CREATURE_EQUIPMENT_MODEL_PART_REQUEST_TOKEN_KEY] !==
            requestToken
        ) {
          return;
        }
        const textureApplication = applyEquipmentTexturesToModels(
          loadedTexturesByReference,
          [group],
          [currentRoot]
        );
        const textureStatus =
          loadedTexturesByReference.size >= textureUrlsForEquipment.size
            ? "applied"
            : loadedTexturesByReference.size > 0
              ? "partial"
              : "missing";
        const textureUserData = {
          creatureEquipmentModelPartTextureStatus: textureStatus,
          creatureEquipmentModelPartTextureReferences: equipmentTextureReferences,
          creatureEquipmentModelPartTextureLoadedCount:
            loadedTexturesByReference.size,
          creatureEquipmentModelPartTextureLoadedReferences: Array.from(
            loadedTexturesByReference.keys()
          ).sort((left, right) => left.localeCompare(right)),
          creatureEquipmentModelPartTextureBridgeReferences: Array.from(
            textureApplication.creaturePltTextureBridge.texturesByReference.keys()
          ).sort((left, right) => left.localeCompare(right)),
          creatureEquipmentModelPartTextureAppliedModelCount:
            textureApplication.textureAppliedModelCount,
          creatureEquipmentModelPartForcedPrimaryTextureMaterialCount:
            textureApplication.forcedPrimaryTextureMaterialCount,
          creatureEquipmentModelPartPltBridgeStatus:
            textureApplication.creaturePltTextureBridge.appliedCount > 0
              ? "applied"
              : "not-applicable",
          creatureEquipmentModelPartPltBridgeCount:
            textureApplication.creaturePltTextureBridge.appliedCount
        };
        currentRoot.userData = {
          ...currentRoot.userData,
          ...textureUserData
        };
        group.userData = {
          ...group.userData,
          ...textureUserData
        };
        writePlaceableModelDebugStatus(runtime, "loaded", {
          objectId,
          loadPhase: "creature-equipment-textures",
          textureStatus,
          textureCount: textureUrlsForEquipment.size,
          textureLoaded: loadedTexturesByReference.size,
          textureSource: summarizePlaceableTextureSourceFormats(
            loadedTexturesByReference.values()
          ),
          creatureMaterialTextureEvidence:
            summarizeCreatureMaterialTextureEvidence(currentRoot),
          creatureEquipmentModelPartTextureStatus: textureStatus,
          creatureEquipmentModelPartTextureReferenceCount:
            textureUrlsForEquipment.size,
          creatureEquipmentModelPartTextureReferences:
            equipmentTextureReferences.join("|"),
          creatureEquipmentModelPartTextureLoadedCount:
            loadedTexturesByReference.size,
          creatureEquipmentModelPartTextureLoadedReferences: Array.from(
            loadedTexturesByReference.keys()
          )
            .sort((left, right) => left.localeCompare(right))
            .join("|"),
          creatureEquipmentModelPartTextureBridgeReferences: Array.from(
            textureApplication.creaturePltTextureBridge.texturesByReference.keys()
          )
            .sort((left, right) => left.localeCompare(right))
            .join("|"),
          creatureEquipmentModelPartTextureAppliedModelCount:
            textureApplication.textureAppliedModelCount,
          creatureEquipmentModelPartForcedPrimaryTextureMaterialCount:
            textureApplication.forcedPrimaryTextureMaterialCount
        });
      });
    }
    const visibleMeshRuntimeDiagnostics =
      collectCreatureEquipmentModelPartRuntimeDiagnostics(latestRoot);
    writeCreaturePartModelRuntimeStatus(runtime, "equipment-attached", {
      objectId,
      loadCompleted:
        typeof latestRoot.userData?.creaturePartModelGroupLoadedCount === "number"
          ? latestRoot.userData.creaturePartModelGroupLoadedCount
          : null,
      loadTotal:
        typeof latestRoot.userData?.creaturePartModelGroupTotalCount === "number"
          ? latestRoot.userData.creaturePartModelGroupTotalCount
          : null,
      sourceHierarchyMode:
        typeof latestRoot.userData?.creaturePartModelGroupSourceHierarchyMode === "string"
          ? latestRoot.userData.creaturePartModelGroupSourceHierarchyMode
          : null,
      rootChildCount: latestRoot.children.length,
      equipmentLoadCompleted: loadedEntries.length,
      equipmentLoadTotal: resolutions.length,
      equipmentVisibleMeshCount: visibleMeshRuntimeDiagnostics.visibleMeshCount,
      equipmentVisibleMeshNames: visibleMeshRuntimeDiagnostics.visibleMeshNames,
      equipmentVisibleMeshSlots: visibleMeshRuntimeDiagnostics.visibleMeshSlots,
      equipmentVisibleMeshCenters: visibleMeshRuntimeDiagnostics.visibleMeshCenters,
      equipmentVisibleMeshSizes: visibleMeshRuntimeDiagnostics.visibleMeshSizes,
      equipmentVisibleMeshParentPaths:
        visibleMeshRuntimeDiagnostics.visibleMeshParentPaths,
      equipmentItemGroupCount: visibleMeshRuntimeDiagnostics.itemGroupCount,
      equipmentItemGroupBounds: visibleMeshRuntimeDiagnostics.itemGroupBounds,
      equipmentItemGroupWeaponScales:
        visibleMeshRuntimeDiagnostics.itemGroupWeaponScales,
      equipmentItemGroupWeaponScaleSources:
        visibleMeshRuntimeDiagnostics.itemGroupWeaponScaleSources,
      equipmentItemGroupAttachmentTargets:
        visibleMeshRuntimeDiagnostics.itemGroupAttachmentTargets,
      equipmentItemGroupResolvedAnchors:
        visibleMeshRuntimeDiagnostics.itemGroupResolvedAnchors,
      equipmentItemGroupResolvedAnchorSources:
        visibleMeshRuntimeDiagnostics.itemGroupResolvedAnchorSources,
      equipmentItemGroupParentPaths:
        visibleMeshRuntimeDiagnostics.itemGroupParentPaths,
      equipmentPartCompositionStatuses:
        visibleMeshRuntimeDiagnostics.partCompositionStatuses,
      equipmentPartCompositionReasons:
        visibleMeshRuntimeDiagnostics.partCompositionReasons,
      equipmentPartSourceHierarchyStats:
        visibleMeshRuntimeDiagnostics.partSourceHierarchyStats,
      equipmentPartRuntimeSourceHierarchyNodeNames:
        visibleMeshRuntimeDiagnostics.partRuntimeSourceHierarchyNodeNames,
      equipmentRuntimeAmmunitionProxyAimSources:
        visibleMeshRuntimeDiagnostics.runtimeAmmunitionProxyAimSources,
      equipmentRuntimeAmmunitionProxyAimModes:
        visibleMeshRuntimeDiagnostics.runtimeAmmunitionProxyAimModes,
      equipmentRuntimeAmmunitionProxyAimNodeNames:
        visibleMeshRuntimeDiagnostics.runtimeAmmunitionProxyAimNodeNames,
      equipmentRuntimeAmmunitionProxyOrigins:
        visibleMeshRuntimeDiagnostics.runtimeAmmunitionProxyOrigins,
      equipmentRuntimeAmmunitionProxyDirections:
        visibleMeshRuntimeDiagnostics.runtimeAmmunitionProxyDirections,
      equipmentRuntimeAmmunitionProxyCrossbowMeshAxes:
        visibleMeshRuntimeDiagnostics.runtimeAmmunitionProxyCrossbowMeshAxes,
      equipmentRuntimeAmmunitionProxyCrossbowAxisDots:
        visibleMeshRuntimeDiagnostics.runtimeAmmunitionProxyCrossbowAxisDots,
      equipmentRuntimeAmmunitionProxyCrossbowAxisSelections:
        visibleMeshRuntimeDiagnostics.runtimeAmmunitionProxyCrossbowAxisSelections,
      equipmentItemGroupSourceAnimationStatuses: itemGroupSourceAnimationStatuses.join("|"),
      equipmentItemGroupSourceAnimationClipNames: itemGroupSourceAnimationClipNames.join("|"),
      equipmentItemGroupSourceAnimationLoopModes:
        visibleMeshRuntimeDiagnostics.itemGroupSourceAnimationLoopModes,
      equipmentItemGroupSourceAnimationRecoveryPoseClipNames:
        visibleMeshRuntimeDiagnostics.itemGroupSourceAnimationRecoveryPoseClipNames,
      equipmentItemGroupSourceAnimationRecoveryPoseCandidateNames:
        visibleMeshRuntimeDiagnostics.itemGroupSourceAnimationRecoveryPoseCandidateNames,
      equipmentItemGroupSourceAnimationRecoveryPoseFallbacks:
        visibleMeshRuntimeDiagnostics.itemGroupSourceAnimationRecoveryPoseFallbacks,
      equipmentItemGroupSourceAnimationRecoveryPoseFallbackReasons:
        visibleMeshRuntimeDiagnostics.itemGroupSourceAnimationRecoveryPoseFallbackReasons,
      equipmentItemGroupSourceAnimationRecoveryPoseSkippedReasons:
        visibleMeshRuntimeDiagnostics.itemGroupSourceAnimationRecoveryPoseSkippedReasons,
      equipmentLoosePartRootCount: visibleMeshRuntimeDiagnostics.loosePartRootCount,
      equipmentLoosePartRootNames: visibleMeshRuntimeDiagnostics.loosePartRootNames
    });
    const initialEquipmentTextureStatus = String(
      modelPartGroupUserData.creatureEquipmentModelPartTextureStatus
    );
    writePlaceableModelDebugStatus(
      runtime,
      initialEquipmentTextureStatus === "loading" ? "loading" : "loaded",
      {
      objectId,
      loadPhase: "complete",
      creatureEquipmentModelPartLoadPhase: "creature-equipment-model-parts",
      loadCompleted: loadedEntries.length,
      loadTotal: resolutions.length,
      creatureEquipmentModelPartLoadStatus: String(
        modelPartGroupUserData.creatureEquipmentModelPartLoadStatus
      ),
      creatureEquipmentModelPartLoadedCount: loadedEntries.length,
      creatureEquipmentModelPartTotalCount: resolutions.length,
      creatureEquipmentModelPartMode: String(
        modelPartGroupUserData.creatureEquipmentModelPartMode
      ),
      creatureEquipmentModelPartItemGroupCount: itemAssemblies.length,
      creatureEquipmentModelPartItemGroupTransformStatuses: itemGroupTransformStatuses.join("|"),
      creatureEquipmentModelPartItemGroupSourceAnimationStatuses:
        itemGroupSourceAnimationStatuses.join("|"),
      creatureEquipmentModelPartItemGroupSourceAnimationClipNames:
        itemGroupSourceAnimationClipNames.join("|"),
      creatureEquipmentModelPartItemGroupSourceAnimationLoopModes:
        visibleMeshRuntimeDiagnostics.itemGroupSourceAnimationLoopModes,
      creatureEquipmentModelPartItemGroupSourceAnimationRecoveryPoseClipNames:
        visibleMeshRuntimeDiagnostics.itemGroupSourceAnimationRecoveryPoseClipNames,
      creatureEquipmentModelPartItemGroupSourceAnimationRecoveryPoseCandidateNames:
        visibleMeshRuntimeDiagnostics.itemGroupSourceAnimationRecoveryPoseCandidateNames,
      creatureEquipmentModelPartItemGroupSourceAnimationRecoveryPoseFallbacks:
        visibleMeshRuntimeDiagnostics.itemGroupSourceAnimationRecoveryPoseFallbacks,
      creatureEquipmentModelPartItemGroupSourceAnimationRecoveryPoseFallbackReasons:
        visibleMeshRuntimeDiagnostics.itemGroupSourceAnimationRecoveryPoseFallbackReasons,
      creatureEquipmentModelPartItemGroupSourceAnimationRecoveryPoseSkippedReasons:
        visibleMeshRuntimeDiagnostics.itemGroupSourceAnimationRecoveryPoseSkippedReasons,
      creatureEquipmentModelPartItemGroupWeaponScales:
        visibleMeshRuntimeDiagnostics.itemGroupWeaponScales,
      creatureEquipmentModelPartItemGroupWeaponScaleSources:
        visibleMeshRuntimeDiagnostics.itemGroupWeaponScaleSources,
      creatureEquipmentModelPartVisibleMeshParentPaths:
        visibleMeshRuntimeDiagnostics.visibleMeshParentPaths,
      creatureEquipmentModelPartItemGroupAttachmentTargets:
        visibleMeshRuntimeDiagnostics.itemGroupAttachmentTargets,
      creatureEquipmentModelPartItemGroupResolvedAnchors:
        visibleMeshRuntimeDiagnostics.itemGroupResolvedAnchors,
      creatureEquipmentModelPartItemGroupResolvedAnchorSources:
        visibleMeshRuntimeDiagnostics.itemGroupResolvedAnchorSources,
      creatureEquipmentModelPartItemGroupParentPaths:
        visibleMeshRuntimeDiagnostics.itemGroupParentPaths,
      creatureEquipmentModelPartCompositionStatuses:
        visibleMeshRuntimeDiagnostics.partCompositionStatuses,
      creatureEquipmentModelPartCompositionReasons:
        visibleMeshRuntimeDiagnostics.partCompositionReasons,
      creatureEquipmentModelPartSourceHierarchyStats:
        visibleMeshRuntimeDiagnostics.partSourceHierarchyStats,
      creatureEquipmentModelPartRuntimeSourceHierarchyNodeNames:
        visibleMeshRuntimeDiagnostics.partRuntimeSourceHierarchyNodeNames,
      creatureEquipmentModelPartRequestedSourceAnimationName:
        requestedAnimationName ?? "",
      creatureEquipmentModelPartResRefs: resolutions
        .map((entry) => entry.partResref)
        .join("|"),
      creatureEquipmentModelPartEquipmentResRefs: resolutions
        .map((entry) => entry.equipmentResref)
        .join("|"),
      creatureEquipmentModelPartAttachmentTargets: resolutions
        .map((entry) => entry.attachmentTarget)
        .join("|"),
      creatureEquipmentModelPartTextureStatus: initialEquipmentTextureStatus,
      creatureEquipmentModelPartTextureReferenceCount: textureUrlsForEquipment.size,
      creatureEquipmentModelPartTextureReferences: equipmentTextureReferences.join("|"),
      creatureEquipmentModelPartTextureLoadedCount: texturesByReference.size,
      creatureEquipmentModelPartTextureLoadedReferences:
        loadedEquipmentTextureReferences.join("|"),
      creatureEquipmentModelPartTextureBridgeReferences:
        bridgedEquipmentTextureReferences.join("|"),
      creatureEquipmentModelPartTextureAppliedModelCount:
        textureAppliedModelCount,
      creatureEquipmentModelPartForcedPrimaryTextureMaterialCount:
        postAttachEquipmentTextureApplication.forcedPrimaryTextureMaterialCount,
      ...(textureUrlsForEquipment.size > 0 && !wireframe
        ? {
            textureStatus: initialEquipmentTextureStatus,
            textureCount: textureUrlsForEquipment.size,
            textureLoaded: texturesByReference.size,
            textureSource: summarizePlaceableTextureSourceFormats(
              texturesByReference.values()
            ),
            creatureMaterialTextureEvidence:
              summarizeCreatureMaterialTextureEvidence(latestRoot)
          }
        : {})
      }
    );
  });
}

function removeItemModelPartGroups(root: THREE.Object3D): void {
  const nodes: THREE.Object3D[] = [];
  root.traverse((node) => {
    if (
      node !== root &&
      (node.userData?.itemModelPartGroupStatus === "source-item-model-parts" ||
        node.userData?.itemModelPartStatus === "loaded" ||
        node.userData?.itemArmorPartGroupStatus === "source-item-armor-parts" ||
        node.userData?.itemArmorPartStatus === "loaded" ||
        node.userData?.itemIconFallbackStatus === "loading" ||
        node.userData?.itemIconFallbackStatus === "applied" ||
        node.userData?.itemIconFallbackStatus === "missing")
    ) {
      nodes.push(node);
    }
  });
  const topLevelNodes = nodes.filter((node) => {
    let parent = node.parent;
    while (parent && parent !== root) {
      if (nodes.includes(parent)) {
        return false;
      }
      parent = parent.parent;
    }
    return true;
  });
  topLevelNodes.forEach((node) => {
    node.parent?.remove(node);
    node.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        disposeMeshResources(child);
      }
    });
  });
}

interface ItemIconFallbackRender {
  readonly group: THREE.Group;
  readonly composition: ItemIconComposition;
  readonly userData: Record<string, unknown>;
}

function createItemIconFallbackPlaceholderTexture(): THREE.Texture {
  if (typeof document === "undefined") {
    const data = new Uint8Array([0, 0, 0, 0]);
    const texture = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
    texture.needsUpdate = true;
    return texture;
  }
  const canvas = document.createElement("canvas");
  canvas.width = 192;
  canvas.height = 192;
  const context = canvas.getContext("2d");
  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "rgba(0, 0, 0, 0)";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createItemIconFallbackRender(
  object: SceneObject,
  objectRadius: number
): ItemIconFallbackRender | null {
  const composition = composeItemIconPreview(object);
  if (!composition) {
    return null;
  }
  const planeSize = Math.max(0.42, Math.min(0.95, objectRadius * 1.35));
  const group = new THREE.Group();
  group.name = `item-icon-fallback:${object.id}`;
  const placeholderTexture = createItemIconFallbackPlaceholderTexture();
  const material = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#ffffff"),
    map: placeholderTexture,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(planeSize, planeSize), material);
  mesh.name = `item-icon-fallback-plane:${object.id}`;
  mesh.position.set(0, Math.max(0.26, planeSize * 0.62), 0);
  mesh.rotation.x = -Math.PI / 10;
  mesh.renderOrder = 12;
  mesh.userData = {
    itemIconFallbackMesh: true,
    itemIconFallbackStatus: "loading",
    itemIconFallbackIconResRef: composition.iconResRef,
    itemIconFallbackSource: composition.source,
    itemIconFallbackAssetId: composition.assetId ?? "",
    itemIconFallbackAssetExtension: composition.assetExtension ?? ""
  };
  group.add(mesh);
  const userData = {
    itemIconFallbackStatus: "loading",
    itemIconFallbackIconResRef: composition.iconResRef,
    itemIconFallbackSource: composition.source,
    itemIconFallbackAssetId: composition.assetId ?? "",
    itemIconFallbackAssetExtension: composition.assetExtension ?? "",
    itemIconFallbackModelPartCount: composition.modelPartCount
  };
  group.userData = {
    ...group.userData,
    ...userData
  };
  return {
    group,
    composition,
    userData
  };
}

function resolveItemIconFallbackDeliveryUrl(url: string): string {
  if (/^data:/iu.test(url)) {
    return url;
  }
  try {
    return resolvePlaceableAssetDeliveryUrl(url);
  } catch {
    return url;
  }
}

function scheduleItemIconFallbackTextureLoad(input: {
  runtime: RuntimeState;
  objectId: string;
  root: THREE.Object3D;
  fallback: ItemIconFallbackRender;
}): void {
  const { runtime, objectId, root, fallback } = input;
  const mesh = fallback.group.children.find(
    (child): child is THREE.Mesh => child instanceof THREE.Mesh
  );
  const material =
    mesh?.material instanceof THREE.MeshBasicMaterial ? mesh.material : null;
  if (!mesh || !material) {
    return;
  }
  const scheduledUserData = {
    itemIconFallbackStatus: "scheduled"
  };
  root.userData = { ...root.userData, ...scheduledUserData };
  fallback.group.userData = { ...fallback.group.userData, ...scheduledUserData };
  mesh.userData = { ...mesh.userData, ...scheduledUserData };
  const resolveCurrentFallbackTargets = (textureToDispose?: THREE.Texture) => {
    const latestRoot = runtime.objectMeshById.get(objectId);
    if (!latestRoot) {
      textureToDispose?.dispose();
      return null;
    }
    const latestGroup =
      latestRoot === root && fallback.group.parent === root
        ? fallback.group
        : latestRoot.children.find((child): child is THREE.Group => child.name === fallback.group.name);
    const latestMesh = latestGroup?.children.find(
      (child): child is THREE.Mesh => child instanceof THREE.Mesh
    );
    const latestMaterial =
      latestMesh?.material instanceof THREE.MeshBasicMaterial ? latestMesh.material : null;
    if (!latestGroup || !latestMesh || !latestMaterial) {
      textureToDispose?.dispose();
      return null;
    }
    return {
      root: latestRoot,
      group: latestGroup,
      mesh: latestMesh,
      material: latestMaterial
    };
  };
  const markMissing = () => {
    const targets = resolveCurrentFallbackTargets();
    if (!targets) {
      return;
    }
    const statusUserData = {
      itemIconFallbackStatus: "missing"
    };
    targets.root.userData = { ...targets.root.userData, ...statusUserData };
    targets.group.userData = { ...targets.group.userData, ...statusUserData };
    targets.mesh.userData = { ...targets.mesh.userData, ...statusUserData };
    markAreaObjectSharedRendererTextureRuntimeEvidence(targets.root, "missing", {
      textureCount: 1,
      textureLoaded: 0,
      textureSource: fallback.composition.source
    });
  };
  const markFallbackStatus = (status: string) => {
    const targets = resolveCurrentFallbackTargets();
    if (!targets) {
      return;
    }
    const statusUserData = {
      itemIconFallbackStatus: status
    };
    targets.root.userData = { ...targets.root.userData, ...statusUserData };
    targets.group.userData = { ...targets.group.userData, ...statusUserData };
    targets.mesh.userData = { ...targets.mesh.userData, ...statusUserData };
  };
  void (async () => {
    const fetchIconAsset: typeof fetch = async (resource, init) => {
      const requestHeaders: Record<string, string> = {};
      new Headers(init?.headers).forEach((value, key) => {
        requestHeaders[key] = value;
      });
      Object.assign(requestHeaders, runtime.placeableTextureRequestHeader ?? {});
      const url =
        typeof resource === "string"
          ? resource
          : resource instanceof URL
            ? resource.toString()
            : resource.url;
      const deliveryUrl = resolveItemIconFallbackDeliveryUrl(url);
      if (runtime.placeableTextureFetch) {
        return (await runtime.placeableTextureFetch(deliveryUrl, {
          headers: requestHeaders,
          ...(init?.signal ? { signal: init.signal } : {})
        })) as Response;
      }
      return fetch(deliveryUrl, {
        ...init,
        headers: requestHeaders
      });
    };
    const applyLoadedTexture = (
      texture: THREE.Texture,
      loadedComposition: ItemIconComposition,
      textureUrl: string
    ) => {
      const targets = resolveCurrentFallbackTargets(texture);
      if (!targets) {
        return;
      }
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
      const previousMap = targets.material.map;
      targets.material.map = texture;
      targets.material.color.set("#ffffff");
      targets.material.opacity = 0.98;
      targets.material.needsUpdate = true;
      if (previousMap && previousMap !== texture) {
        previousMap.dispose();
      }
      const statusUserData = {
        itemIconFallbackStatus: "applied",
        itemIconFallbackPreviewImageReady: true
      };
      targets.root.userData = { ...targets.root.userData, ...statusUserData };
      targets.group.userData = { ...targets.group.userData, ...statusUserData };
      targets.mesh.userData = { ...targets.mesh.userData, ...statusUserData };
      markAreaObjectSharedRendererTextureRuntimeEvidence(targets.root, "applied", {
        textureCount: 1,
        textureLoaded: 1,
        textureSource: loadedComposition.source,
        loadedTextureReferences: [loadedComposition.iconResRef],
        requestedTextureReferences: [loadedComposition.iconResRef]
      });
      writePlaceableModelDebugStatus(runtime, "loaded", {
        objectId,
        url: textureUrl,
        loadPhase: "item-icon-fallback",
        loadCompleted: 1,
        loadTotal: 1,
        textureStatus: "applied",
        textureCount: 1,
        textureLoaded: 1,
        textureSource: loadedComposition.source
      });
    };
    let composition: ItemIconComposition | null = null;
    try {
      markFallbackStatus(
        `icon-source-${fallback.composition.source}-${fallback.composition.rawAssetExtension ?? "none"}-${fallback.composition.rawAssetUrl ? "url" : "no-url"}`
      );
      if (
        fallback.composition.source === "raw-texture" &&
        fallback.composition.rawAssetUrl &&
        fallback.composition.rawAssetExtension
      ) {
        markFallbackStatus(
          `raw-branch-${fallback.composition.rawAssetExtension.trim().toLowerCase()}`
        );
        markFallbackStatus("raw-fetch-started");
        const response = await fetchIconAsset(fallback.composition.rawAssetUrl);
        markFallbackStatus(`raw-fetch-response-${response.status}`);
        if (!response.ok) {
          markMissing();
          return;
        }
        markFallbackStatus("raw-decode-started");
        const decoded = decodeRawTextureToRgba(
          await response.arrayBuffer(),
          fallback.composition.rawAssetExtension
        );
        markFallbackStatus("raw-decode-complete");
        const texture = new THREE.DataTexture(
          new Uint8Array(decoded.rgba),
          decoded.width,
          decoded.height,
          THREE.RGBAFormat
        );
        texture.flipY = false;
        applyLoadedTexture(
          texture,
          {
            ...fallback.composition,
            source: "decoded-texture",
            previewImageUrl: fallback.composition.rawAssetUrl
          },
          fallback.composition.rawAssetUrl
        );
        return;
      }
      composition = fallback.composition.previewImageUrl
        ? fallback.composition
        : await resolveDecodedItemIconPreview(fallback.composition, fetchIconAsset);
    } catch {
      composition = null;
    }
    if (!composition?.previewImageUrl) {
      markMissing();
      return;
    }
    const textureUrl = resolveItemIconFallbackDeliveryUrl(composition.previewImageUrl);
    const loadedComposition = composition;
    runtime.placeableTextureLoader.load(
      textureUrl,
      (texture) => applyLoadedTexture(texture, loadedComposition, textureUrl),
      undefined,
      markMissing
    );
  })();
}

function buildItemModelPartGroupUserData(
  object: SceneObject,
  resolutions: ItemRenderModelPartResolution[]
): Record<string, unknown> {
  const candidates = object.itemProperties?.modelPartCandidates ?? [];
  const candidateResRefs = candidates.map((candidate) => candidate.resRef);
  const deliverableResRefs = resolutions.map((entry) => entry.partResRef);
  const deliverableResRefSet = new Set(
    deliverableResRefs.map((resref) => resref.toLowerCase())
  );
  const missingResRefs = candidateResRefs.filter(
    (resref) => !deliverableResRefSet.has(resref.toLowerCase())
  );
  return {
    itemModelPartLoadStatus:
      resolutions.length > 0
        ? "model-part-urls-ready"
        : candidates.length > 0
          ? "missing-assets"
          : "not-applicable",
    itemModelPartReady: resolutions.length > 0,
    itemModelPartCandidateCount: candidates.length,
    itemModelPartCount: resolutions.length,
    itemModelPartResRefs: candidateResRefs,
    itemModelPartDeliverableResRefs: deliverableResRefs,
    itemModelPartMissingResRefs: missingResRefs,
    itemModelPartUrls: resolutions.map((entry) => entry.modelUrl),
    itemModelPartCacheKeys: resolutions.map((entry) => entry.modelCacheKey)
  };
}

function buildItemArmorPartGroupUserData(
  object: SceneObject,
  resolutions: ItemRenderArmorPartModelResolution[]
): Record<string, unknown> {
  const candidates = object.itemProperties?.armorPartModelCandidates ?? [];
  const candidateResRefs = candidates.map((candidate) => candidate.modelResRef);
  const deliverableResRefs = resolutions
    .map((entry) => entry.modelResRef)
    .filter((resref): resref is string => Boolean(resref));
  const deliverableResRefSet = new Set(
    deliverableResRefs.map((resref) => resref.toLowerCase())
  );
  const missingResRefs = candidateResRefs.filter(
    (resref) => !deliverableResRefSet.has(resref.toLowerCase())
  );
  return {
    itemArmorPartLoadStatus:
      resolutions.length > 0
        ? "armor-part-urls-ready"
        : candidates.length > 0
          ? "missing-assets"
          : "not-applicable",
    itemArmorPartReady: resolutions.length > 0,
    itemArmorPartCandidateCount: candidates.length,
    itemArmorPartCount: resolutions.length,
    itemArmorPartResRefs: candidateResRefs,
    itemArmorPartDeliverableResRefs: deliverableResRefs,
    itemArmorPartMissingResRefs: missingResRefs,
    itemArmorPartSlots: resolutions.map((entry) => entry.slot),
    itemArmorPartUrls: resolutions.map((entry) => entry.modelUrl),
    itemArmorPartCacheKeys: resolutions.map((entry) => entry.modelCacheKey)
  };
}

function coerceItemArmorEntriesToCreaturePartEntries(
  entries: LoadedItemArmorPartModelEntry[]
): LoadedCreaturePartModelEntry[] {
  return entries.map(({ entry, model }) => ({
    entry: {
      slot: entry.slot,
      partId: entry.partId,
      modelUrl: entry.modelUrl,
      modelCacheKey: entry.modelCacheKey,
      ...(entry.modelResRef ? { modelResRef: entry.modelResRef } : {}),
      ...(entry.nodeName ? { nodeName: entry.nodeName } : {})
    },
    model
  }));
}

function resolveItemModelPartPreviewTransform(
  object: SceneObject,
  resolutions: ItemRenderModelPartResolution[]
): ItemModelPartPreviewTransform {
  const modelType = object.itemProperties?.baseItemModelType?.trim().toLowerCase() ?? "";
  const label = object.itemProperties?.baseItemLabel?.trim().toLowerCase() ?? "";
  const hasShieldResRef = resolutions.some((entry) =>
    entry.partResRef.trim().toLowerCase().startsWith("ash")
  );
  const isShield =
    modelType.startsWith("ash") || label.includes("shield") || hasShieldResRef;

  if (isShield) {
    return {
      mode: "shield-showcase",
      targetMaxAxisFactor: 1.85,
      rotation: new THREE.Euler(0, 0, 0, "XYZ")
    };
  }

  const usesDefaultModel = resolutions.some(
    (entry) => entry.role?.trim().toLowerCase() === "default"
  );
  if (usesDefaultModel) {
    return {
      mode: "default-model-upright",
      targetMaxAxisFactor: PLACEABLE_PREVIEW_MODEL_TARGET_MAX_AXIS_FACTOR,
      rotation: new THREE.Euler(
        ITEM_DEFAULT_MODEL_PREVIEW_ROTATION_X_RADIANS,
        0,
        0,
        "XYZ"
      )
    };
  }

  return {
    mode: "default",
    targetMaxAxisFactor: PLACEABLE_PREVIEW_MODEL_TARGET_MAX_AXIS_FACTOR,
    rotation: null
  };
}

function formatItemModelPartPreviewRotation(
  transform: ItemModelPartPreviewTransform
): string {
  const rotation = transform.rotation;
  return [
    rotation?.x ?? 0,
    rotation?.y ?? 0,
    rotation?.z ?? 0
  ]
    .map((value) => value.toFixed(4))
    .join(",");
}

function applyItemModelPartPreviewTransform(
  group: THREE.Group,
  transform: ItemModelPartPreviewTransform
): void {
  if (transform.rotation) {
    group.rotation.copy(transform.rotation);
  }
  group.userData = {
    ...group.userData,
    itemModelPartPreviewTransformMode: transform.mode,
    itemModelPartPreviewTargetMaxAxisFactor: transform.targetMaxAxisFactor,
    itemModelPartPreviewRotation: formatItemModelPartPreviewRotation(transform)
  };
}

interface ItemArmorPreviewLayoutBox {
  model: THREE.Object3D;
  box: THREE.Box3;
  center: THREE.Vector3;
  size: THREE.Vector3;
  halfSize: THREE.Vector3;
}

const ITEM_ARMOR_PREVIEW_LAYOUT_BODY_CENTER_Y = 0.34;
const ITEM_ARMOR_PREVIEW_LAYOUT_BODY_Z = 0;
const ITEM_ARMOR_PREVIEW_LAYOUT_OVERLAP = 0.025;
const ITEM_ARMOR_PREVIEW_LAYOUT_FOOT_FRONT_Z = 0.11;
const ITEM_ARMOR_PREVIEW_LAYOUT_ARM_Z = 0.015;
const ITEM_ARMOR_WAIST_SEAM_PELVIS_OVERLAP_Y = 0.026;
const ITEM_DEFAULT_MODEL_PREVIEW_ROTATION_X_RADIANS = -Math.PI / 2;

const ITEM_ARMOR_PREVIEW_FALLBACK_SLOT_TARGETS: Record<string, [number, number, number]> = {
  rFoot: [0.12, -1.18, 0.08],
  lFoot: [-0.12, -1.18, 0.08],
  rShin: [0.11, -0.88, 0],
  lShin: [-0.11, -0.88, 0],
  rThigh: [0.12, -0.42, 0],
  lThigh: [-0.12, -0.42, 0],
  pelvis: [0, -0.08, 0],
  belt: [0, 0.1, 0],
  torso: [0, 0.38, 0],
  robe: [0, 0.12, 0],
  neck: [0, 0.72, 0],
  rShoul: [0.3, 0.58, 0],
  lShoul: [-0.3, 0.58, 0],
  rBicep: [0.38, 0.34, 0],
  lBicep: [-0.38, 0.34, 0],
  rFArm: [0.44, 0.05, 0],
  lFArm: [-0.44, 0.05, 0],
  rHand: [0.46, -0.18, 0],
  lHand: [-0.46, -0.18, 0]
};

function collectItemArmorPreviewLayoutBoxes(
  partGroup: THREE.Group,
  loadedEntries: LoadedCreaturePartModelEntry[]
): Map<string, ItemArmorPreviewLayoutBox> {
  const boxesBySlot = new Map<string, ItemArmorPreviewLayoutBox>();
  partGroup.updateMatrixWorld(true);
  loadedEntries.forEach(({ entry, model }) => {
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    if (box.isEmpty()) {
      return;
    }
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);
    boxesBySlot.set(entry.slot, {
      model,
      box,
      center,
      size,
      halfSize: size.clone().multiplyScalar(0.5)
    });
  });
  return boxesBySlot;
}

function resolveItemArmorPreviewLayoutTargets(
  boxesBySlot: Map<string, ItemArmorPreviewLayoutBox>
): Map<string, THREE.Vector3> {
  const targets = new Map<string, THREE.Vector3>();
  const setTarget = (slot: string, center: THREE.Vector3): void => {
    if (boxesBySlot.has(slot)) {
      targets.set(slot, center);
    }
  };
  const setFallbackTargets = (): void => {
    boxesBySlot.forEach((_box, slot) => {
      const target = ITEM_ARMOR_PREVIEW_FALLBACK_SLOT_TARGETS[slot];
      if (target) {
        targets.set(slot, new THREE.Vector3(target[0], target[1], target[2]));
      }
    });
  };

  const centralSlot = boxesBySlot.has("torso")
    ? "torso"
    : boxesBySlot.has("robe")
      ? "robe"
      : boxesBySlot.has("pelvis")
        ? "pelvis"
        : null;
  const centralBox = centralSlot ? boxesBySlot.get(centralSlot) : null;
  if (!centralSlot || !centralBox) {
    setFallbackTargets();
    return targets;
  }

  const bodyTarget = new THREE.Vector3(
    0,
    centralSlot === "pelvis" ? 0.05 : ITEM_ARMOR_PREVIEW_LAYOUT_BODY_CENTER_Y,
    ITEM_ARMOR_PREVIEW_LAYOUT_BODY_Z
  );
  setTarget(centralSlot, bodyTarget);

  const torsoBox = boxesBySlot.get("torso") ?? centralBox;
  const torsoTarget = targets.get("torso") ?? bodyTarget;
  const torsoTopY = torsoTarget.y + torsoBox.halfSize.y;
  const torsoBottomY = torsoTarget.y - torsoBox.halfSize.y;
  const torsoHalfX = Math.max(torsoBox.halfSize.x, 0.18);

  const pelvisBox = boxesBySlot.get("pelvis");
  if (pelvisBox && centralSlot !== "pelvis") {
    setTarget(
      "pelvis",
      new THREE.Vector3(
        0,
        torsoBottomY - pelvisBox.halfSize.y + ITEM_ARMOR_PREVIEW_LAYOUT_OVERLAP,
        ITEM_ARMOR_PREVIEW_LAYOUT_BODY_Z
      )
    );
  }

  const beltBox = boxesBySlot.get("belt");
  if (beltBox) {
    const pelvisTarget = targets.get("pelvis");
    const beltY = pelvisTarget
      ? pelvisTarget.y + (pelvisBox?.halfSize.y ?? 0) - beltBox.halfSize.y * 0.45
      : torsoBottomY + beltBox.halfSize.y * 0.35;
    setTarget("belt", new THREE.Vector3(0, beltY, ITEM_ARMOR_PREVIEW_LAYOUT_BODY_Z + 0.015));
  }

  const neckBox = boxesBySlot.get("neck");
  if (neckBox) {
    setTarget(
      "neck",
      new THREE.Vector3(
        0,
        torsoTopY + neckBox.halfSize.y - ITEM_ARMOR_PREVIEW_LAYOUT_OVERLAP,
        ITEM_ARMOR_PREVIEW_LAYOUT_BODY_Z
      )
    );
  }

  const placeLegChain = (
    side: "l" | "r",
    thighSlot: string,
    shinSlot: string,
    footSlot: string
  ): void => {
    const sign = side === "l" ? -1 : 1;
    const thighBox = boxesBySlot.get(thighSlot);
    const shinBox = boxesBySlot.get(shinSlot);
    const footBox = boxesBySlot.get(footSlot);
    const pelvisTarget = targets.get("pelvis") ?? bodyTarget;
    const pelvisBottomY =
      pelvisTarget.y - (pelvisBox?.halfSize.y ?? Math.max(centralBox.halfSize.y * 0.45, 0.12));
    const legX = sign * Math.max(0.12, (pelvisBox?.halfSize.x ?? torsoHalfX) * 0.58);
    if (thighBox) {
      setTarget(
        thighSlot,
        new THREE.Vector3(
          legX,
          pelvisBottomY - thighBox.halfSize.y + ITEM_ARMOR_PREVIEW_LAYOUT_OVERLAP,
          ITEM_ARMOR_PREVIEW_LAYOUT_BODY_Z
        )
      );
    }
    const thighTarget = targets.get(thighSlot);
    if (shinBox && thighBox && thighTarget) {
      setTarget(
        shinSlot,
        new THREE.Vector3(
          legX,
          thighTarget.y - thighBox.halfSize.y - shinBox.halfSize.y + ITEM_ARMOR_PREVIEW_LAYOUT_OVERLAP,
          ITEM_ARMOR_PREVIEW_LAYOUT_BODY_Z
        )
      );
    }
    const shinTarget = targets.get(shinSlot);
    if (footBox && shinBox && shinTarget) {
      setTarget(
        footSlot,
        new THREE.Vector3(
          legX,
          shinTarget.y - shinBox.halfSize.y - footBox.halfSize.y + ITEM_ARMOR_PREVIEW_LAYOUT_OVERLAP,
          ITEM_ARMOR_PREVIEW_LAYOUT_FOOT_FRONT_Z
        )
      );
    }
  };

  const placeArmChain = (
    side: "l" | "r",
    shoulderSlot: string,
    bicepSlot: string,
    forearmSlot: string,
    handSlot: string
  ): void => {
    const sign = side === "l" ? -1 : 1;
    const shoulderBox = boxesBySlot.get(shoulderSlot);
    const bicepBox = boxesBySlot.get(bicepSlot);
    const forearmBox = boxesBySlot.get(forearmSlot);
    const handBox = boxesBySlot.get(handSlot);
    if (shoulderBox) {
      const shoulderX =
        sign * (torsoHalfX + shoulderBox.halfSize.x - ITEM_ARMOR_PREVIEW_LAYOUT_OVERLAP);
      setTarget(
        shoulderSlot,
        new THREE.Vector3(
          shoulderX,
          torsoTopY - shoulderBox.halfSize.y * 0.42,
          ITEM_ARMOR_PREVIEW_LAYOUT_ARM_Z
        )
      );
    }
    const shoulderTarget = targets.get(shoulderSlot);
    if (bicepBox && shoulderBox && shoulderTarget) {
      setTarget(
        bicepSlot,
        new THREE.Vector3(
          shoulderTarget.x + sign * Math.max(0.015, shoulderBox.halfSize.x * 0.14),
          shoulderTarget.y - shoulderBox.halfSize.y - bicepBox.halfSize.y + ITEM_ARMOR_PREVIEW_LAYOUT_OVERLAP,
          ITEM_ARMOR_PREVIEW_LAYOUT_ARM_Z
        )
      );
    }
    const bicepTarget = targets.get(bicepSlot);
    if (forearmBox && bicepBox && bicepTarget) {
      setTarget(
        forearmSlot,
        new THREE.Vector3(
          bicepTarget.x + sign * Math.max(0.012, bicepBox.halfSize.x * 0.12),
          bicepTarget.y - bicepBox.halfSize.y - forearmBox.halfSize.y + ITEM_ARMOR_PREVIEW_LAYOUT_OVERLAP,
          ITEM_ARMOR_PREVIEW_LAYOUT_ARM_Z
        )
      );
    }
    const forearmTarget = targets.get(forearmSlot);
    if (handBox && forearmBox && forearmTarget) {
      setTarget(
        handSlot,
        new THREE.Vector3(
          forearmTarget.x,
          forearmTarget.y - forearmBox.halfSize.y - handBox.halfSize.y + ITEM_ARMOR_PREVIEW_LAYOUT_OVERLAP,
          ITEM_ARMOR_PREVIEW_LAYOUT_ARM_Z
        )
      );
    }
  };

  placeLegChain("l", "lThigh", "lShin", "lFoot");
  placeLegChain("r", "rThigh", "rShin", "rFoot");
  placeArmChain("l", "lShoul", "lBicep", "lFArm", "lHand");
  placeArmChain("r", "rShoul", "rBicep", "rFArm", "rHand");

  boxesBySlot.forEach((_box, slot) => {
    if (targets.has(slot)) {
      return;
    }
    const target = ITEM_ARMOR_PREVIEW_FALLBACK_SLOT_TARGETS[slot];
    if (target) {
      targets.set(slot, new THREE.Vector3(target[0], target[1], target[2]));
    }
  });

  return targets;
}

function createItemArmorPreviewSyntheticSkeleton(
  loadedEntries: LoadedCreaturePartModelEntry[]
): { model: THREE.Object3D; userData: Record<string, unknown> } {
  const skeletonModel = new THREE.Group();
  skeletonModel.name = "item_armor_preview_synthetic_capart_skeleton";
  const userData = augmentCreatureSkeletonWithSyntheticPartTargetAnchors(
    skeletonModel,
    loadedEntries,
    "pmh0"
  );
  skeletonModel.userData = {
    ...skeletonModel.userData,
    itemArmorPartPreviewSkeleton: true,
    itemArmorPartPreviewSkeletonMode: ITEM_ARMOR_PREVIEW_SKELETON_MODE
  };
  return {
    model: skeletonModel,
    userData
  };
}

function applyItemArmorWaistSeamOverlap(input: {
  loadedEntries: LoadedCreaturePartModelEntry[];
}): Pick<
  CreaturePartAssemblyResult,
  "waistSeamCoverStatus" | "waistSeamCoverBounds" | "waistSeamCoverColor"
> {
  const slots = new Set(input.loadedEntries.map(({ entry }) => entry.slot));
  if (!slots.has("torso") || !slots.has("pelvis")) {
    return { waistSeamCoverStatus: "not-needed-missing-torso-or-pelvis" };
  }
  if (slots.has("belt")) {
    return { waistSeamCoverStatus: "not-needed-belt-part-loaded" };
  }
  const pelvisEntry = input.loadedEntries.find(({ entry }) => entry.slot === "pelvis");
  if (!pelvisEntry) {
    return { waistSeamCoverStatus: "not-needed-missing-pelvis" };
  }

  pelvisEntry.model.position.y += ITEM_ARMOR_WAIST_SEAM_PELVIS_OVERLAP_Y;
  pelvisEntry.model.userData = {
    ...pelvisEntry.model.userData,
    itemArmorWaistSeamOverlap: true,
    itemArmorWaistSeamOverlapY: ITEM_ARMOR_WAIST_SEAM_PELVIS_OVERLAP_Y
  };
  pelvisEntry.model.updateMatrixWorld(true);
  const pelvisBox = new THREE.Box3().setFromObject(pelvisEntry.model);
  const waistSeamCoverBounds = pelvisBox.isEmpty()
    ? "empty"
    : formatCreatureRuntimeBounds(pelvisBox);
  return {
    waistSeamCoverStatus: "applied-belt-zero-pelvis-overlap-no-cover",
    waistSeamCoverBounds,
    waistSeamCoverColor: ""
  };
}

function applyItemArmorPreviewHumanoidLayout(
  partGroup: THREE.Group,
  loadedEntries: LoadedCreaturePartModelEntry[]
): CreaturePartAssemblyResult {
  const attachmentTargets = resolveCreaturePartAssemblyAttachmentTargets(loadedEntries);
  if (loadedEntries.length < 2) {
    return {
      mode: "raw-origin",
      axis: "none",
      adjustedSlots: [],
      lateralAdjustedSlots: [],
      attachmentTargets
    };
  }

  const syntheticSkeleton = createItemArmorPreviewSyntheticSkeleton(loadedEntries);
  const skeletonAssembly = applyCreaturePartSkeletonAnchors(
    syntheticSkeleton.model,
    loadedEntries
  );
  if (skeletonAssembly) {
    const waistSeamCover = applyItemArmorWaistSeamOverlap({
      loadedEntries
    });
    partGroup.add(syntheticSkeleton.model);
    const adjustedMetrics = collectCreaturePartRuntimeMetrics(
      syntheticSkeleton.model,
      loadedEntries
    );
    partGroup.userData = {
      ...partGroup.userData,
      ...syntheticSkeleton.userData,
      itemArmorPartAssemblySkeletonModelStatus: ITEM_ARMOR_PREVIEW_SKELETON_MODE,
      itemArmorPartWaistSeamCoverStatus: waistSeamCover.waistSeamCoverStatus ?? "",
      itemArmorPartWaistSeamCoverBounds: waistSeamCover.waistSeamCoverBounds ?? "",
      itemArmorPartWaistSeamCoverColor: waistSeamCover.waistSeamCoverColor ?? ""
    };
    return {
      ...skeletonAssembly,
      partBounds: adjustedMetrics.partBounds,
      partCenters: adjustedMetrics.partCenters,
      partAnchorCenters: adjustedMetrics.partAnchorCenters,
      ...waistSeamCover
    };
  }

  const adjustedSlots: string[] = [];
  const lateralAdjustedSlots: string[] = [];
  const partBounds: Record<string, string> = {};
  const partCenters: Record<string, string> = {};
  const partAnchorCenters: Record<string, string> = {};
  const boxesBySlot = collectItemArmorPreviewLayoutBoxes(partGroup, loadedEntries);
  const targetsBySlot = resolveItemArmorPreviewLayoutTargets(boxesBySlot);

  loadedEntries.forEach(({ entry, model }) => {
    const targetCenter = targetsBySlot.get(entry.slot);
    const attachmentTarget = resolveCreaturePartAttachmentTarget(entry);
    if (attachmentTarget) {
      model.userData = {
        ...model.userData,
        creaturePartAttachmentTarget: attachmentTarget
      };
    }
    if (!targetCenter) {
      return;
    }
    const layoutBox = boxesBySlot.get(entry.slot);
    if (!layoutBox) {
      return;
    }
    const offset = targetCenter.clone().sub(layoutBox.center);
    model.position.add(offset);
    model.updateMatrixWorld(true);
    const adjustedBox = new THREE.Box3().setFromObject(model);
    const adjustedCenter = new THREE.Vector3();
    if (!adjustedBox.isEmpty()) {
      adjustedBox.getCenter(adjustedCenter);
      partBounds[entry.slot] = formatCreatureRuntimeBounds(adjustedBox);
      partCenters[entry.slot] = formatCreatureRuntimeVector(adjustedCenter);
    }
    partAnchorCenters[entry.slot] = formatCreatureRuntimeVector(targetCenter);
    model.userData = {
      ...model.userData,
      creaturePartAssemblyMode: "preview-layout",
      creaturePartPreviewLayoutTarget: formatCreatureRuntimeVector(targetCenter),
      creaturePartPreviewLayoutOffset: formatCreatureRuntimeVector(offset),
      ...(partBounds[entry.slot]
        ? { creaturePartPreviewLayoutBounds: partBounds[entry.slot] }
        : {}),
      ...(partCenters[entry.slot]
        ? { creaturePartPreviewLayoutCenter: partCenters[entry.slot] }
        : {})
    };
    adjustedSlots.push(entry.slot);
    if (Math.abs(targetCenter.x) > 0.0001) {
      lateralAdjustedSlots.push(entry.slot);
    }
  });

  return {
    mode: adjustedSlots.length > 0 ? "preview-layout" : "raw-origin",
    axis: adjustedSlots.length > 0 ? "three-x-y-z" : "none",
    adjustedSlots,
    lateralAdjustedSlots,
    attachmentTargets,
    partBounds,
    partCenters,
    partAnchorCenters
  };
}

function applyItemArmorPartModels(input: {
  runtime: ItemModelPartRuntime;
  objectId: string;
  root: THREE.Object3D;
  object: SceneObject;
  resolutions: ItemRenderArmorPartModelResolution[];
  textureUrlsByReference: Map<string, string>;
  objectRadius: number;
}): void {
  const {
    runtime,
    objectId,
    root,
    object,
    resolutions,
    textureUrlsByReference,
    objectRadius
  } = input;
  const baseUserData = buildItemArmorPartGroupUserData(object, resolutions);
  if (resolutions.length === 0) {
    root.userData = {
      ...root.userData,
      ...baseUserData,
      itemArmorPartLoadedCount: 0,
      itemArmorPartTotalCount: 0
    };
    return;
  }

  root.userData = {
    ...root.userData,
    ...baseUserData,
    itemArmorPartLoadStatus: "loading",
    itemArmorPartLoadedCount: 0,
    itemArmorPartTotalCount: resolutions.length
  };
  writePlaceableModelDebugStatus(runtime, "loading", {
    objectId,
    url: resolutions[0]?.modelUrl ?? null,
    loadPhase: "item-armor-parts",
    loadCompleted: 0,
    loadTotal: resolutions.length,
    itemArmorPartResRefs: resolutions.map((entry) => entry.modelResRef ?? "").join("|")
  });

  const textureRequest =
    textureUrlsByReference.size > 0
      ? ensurePlaceableTexturesByReference(runtime, textureUrlsByReference)
      : Promise.resolve(new Map<string, THREE.Texture>());
  const textureBindingsRequest = loadItemTextureBindings(runtime, object);

  void Promise.all([
    textureRequest,
    textureBindingsRequest,
    Promise.all(
      resolutions.map(async (entry) => ({
        entry,
        model: await ensurePlaceableModel(runtime, entry.modelUrl, {
          cloneMaterials: true,
          cacheKey: entry.modelCacheKey,
          priority: PLACEABLE_MODEL_LOAD_PRIORITY_HIGH
        })
      }))
    )
  ]).then(([texturesByReference, itemTextureBindings, resolvedEntries]) => {
    const latestRoot = runtime.objectMeshById.get(objectId);
    if (!latestRoot || latestRoot !== root) {
      return;
    }
    const loadedEntries = resolvedEntries.filter(
      (entry): entry is LoadedItemArmorPartModelEntry => Boolean(entry.model)
    );
    if (loadedEntries.length === 0) {
      const missingUserData = {
        ...baseUserData,
        itemArmorPartLoadStatus: "missing",
        itemArmorPartLoadedCount: 0,
        itemArmorPartTotalCount: resolutions.length
      };
      latestRoot.userData = {
        ...latestRoot.userData,
        ...missingUserData
      };
      writePlaceableModelDebugStatus(runtime, "missing", {
        objectId,
        url: resolutions[0]?.modelUrl ?? null,
        loadPhase: "item-armor-parts",
        loadCompleted: 0,
        loadTotal: resolutions.length,
        itemArmorPartResRefs: resolutions.map((entry) => entry.modelResRef ?? "").join("|")
      });
      return;
    }

    const itemRenderColors = resolveItemRenderColors(object);
    const itemPltTextureBridge = buildCreaturePltTextureBridge(
      texturesByReference,
      itemRenderColors
    );
    const itemTintResults: CreatureTintApplicationResult[] = [];
    const itemArmorPartTextureFallbackReferences: string[] = [];
    const itemArmorPartTextureApplicationReferences: string[] = [];
    const itemArmorPartTextureForcedReferences: string[] = [];
    let itemArmorPartTextureForcedMaterialCount = 0;
    const group = new THREE.Group();
    group.name = "item_armor_parts";
    loadedEntries.forEach(({ entry, model }, index) => {
      const fallbackTextureReferences = resolveItemModelFallbackTextureReferences(object, {
        slot: entry.slot,
        modelResRef: entry.modelResRef
      });
      const modelTexturesByReference = resolveItemModelTexturesForApplication(
        model,
        itemPltTextureBridge.texturesByReference,
        itemTextureBindings,
        fallbackTextureReferences
      );
      itemArmorPartTextureFallbackReferences.push(...fallbackTextureReferences);
      itemArmorPartTextureApplicationReferences.push(...modelTexturesByReference.keys());
      if (modelTexturesByReference.size > 0) {
        applyPlaceableTexturesToModel(model, modelTexturesByReference, undefined, {
          textureBindings: itemTextureBindings
        });
        const forcedTextureResult = forceItemFallbackTextureToUnmappedMaterials(
          model,
          modelTexturesByReference,
          fallbackTextureReferences
        );
        if (forcedTextureResult) {
          itemArmorPartTextureForcedReferences.push(forcedTextureResult.reference);
          itemArmorPartTextureForcedMaterialCount += forcedTextureResult.appliedCount;
        }
      }
      const tintResult = applyCreatureMaterialTintToModel(model, itemRenderColors);
      if (tintResult) {
        itemTintResults.push(tintResult);
      }
      model.name = `item_armor_part_${entry.modelResRef ?? entry.slot}_${index}`;
      model.userData = {
        ...model.userData,
        itemArmorPartStatus: "loaded",
        itemArmorPartSlot: entry.slot,
        itemArmorPartId: entry.partId,
        itemArmorPartModelResRef: entry.modelResRef ?? "",
        itemArmorPartNodeName: entry.nodeName ?? "",
        itemArmorPartUrl: entry.modelUrl,
        itemArmorPartCacheKey: entry.modelCacheKey,
        itemArmorPartTextureReferences: Array.from(modelTexturesByReference.keys())
      };
      group.add(model);
    });

    const creatureLikeEntries = coerceItemArmorEntriesToCreaturePartEntries(loadedEntries);
    const armorAssembly = applyItemArmorPreviewHumanoidLayout(
      group,
      creatureLikeEntries
    );
    normalizePlaceableModelToObjectRadius(objectRadius, group, {
      targetMaxAxisFactor: PLACEABLE_PREVIEW_MODEL_TARGET_MAX_AXIS_FACTOR
    });
    const loadedUserData = {
      ...baseUserData,
      itemArmorPartLoadStatus:
        loadedEntries.length === resolutions.length ? "loaded" : "partial",
      itemArmorPartLoadedCount: loadedEntries.length,
      itemArmorPartTotalCount: resolutions.length,
      itemArmorPartLoadedResRefs: loadedEntries
        .map((entry) => entry.entry.modelResRef)
        .filter((resref): resref is string => Boolean(resref)),
      itemArmorPartGroupStatus: "source-item-armor-parts",
      itemArmorPartAssemblyMode: armorAssembly.mode,
      itemArmorPartAssemblyAxis: armorAssembly.axis,
      itemArmorPartAssemblyAdjustedSlots: armorAssembly.adjustedSlots,
      itemArmorPartAssemblyLateralSlots: armorAssembly.lateralAdjustedSlots,
      itemArmorPartAssemblyAttachmentTargets: armorAssembly.attachmentTargets,
      itemArmorPartAssemblySkeletonModelStatus:
        armorAssembly.mode === "skeleton-anchors"
          ? ITEM_ARMOR_PREVIEW_SKELETON_MODE
          : "not-used-preview-layout",
      itemArmorPartAssemblySkeletonMatchedSlots:
        armorAssembly.skeletonMatchedSlots ?? [],
      itemArmorPartAssemblyMissingAttachmentTargets:
        armorAssembly.missingAttachmentTargets ?? [],
      itemArmorPartAssemblyPreviewBounds: armorAssembly.partBounds ?? {},
      itemArmorPartAssemblyPreviewCenters: armorAssembly.partCenters ?? {},
      itemArmorPartAssemblyPreviewTargets: armorAssembly.partAnchorCenters ?? {},
      itemArmorPartWaistSeamCoverStatus: armorAssembly.waistSeamCoverStatus ?? "not-checked",
      itemArmorPartWaistSeamCoverBounds: armorAssembly.waistSeamCoverBounds ?? "",
      itemArmorPartWaistSeamCoverColor: armorAssembly.waistSeamCoverColor ?? "",
      itemModelTextureReferenceCount: textureUrlsByReference.size,
      itemModelTextureReferences: Array.from(textureUrlsByReference.keys()),
      itemModelTextureLoadedCount: texturesByReference.size,
      itemModelTextureLoadedReferences: Array.from(texturesByReference.keys()),
      itemModelTextureBindingCount: itemTextureBindings.length,
      itemModelTextureBindingReferences: itemTextureBindings.map((binding) => binding.reference),
      itemArmorPartTextureFallbackReferences: Array.from(
        new Set(itemArmorPartTextureFallbackReferences)
      ),
      itemArmorPartTextureApplicationReferences: Array.from(
        new Set(itemArmorPartTextureApplicationReferences)
      ),
      itemArmorPartTextureForcedReferences: Array.from(
        new Set(itemArmorPartTextureForcedReferences)
      ),
      itemArmorPartTextureForcedMaterialCount,
      itemModelTextureLoadStatus:
        textureUrlsByReference.size === 0
          ? "not-applicable"
          : texturesByReference.size >= textureUrlsByReference.size
            ? "loaded"
            : texturesByReference.size > 0
              ? "partial"
              : "missing",
      itemMaterialColorStatus: itemRenderColors ? "configured" : "not-applicable",
      itemMaterialColorLayerRows: itemPltTextureBridge.layerRows,
      itemArmorPartPltBridgeStatus:
        itemPltTextureBridge.appliedCount > 0 ? "applied" : "not-applicable",
      itemArmorPartPltBridgeCount: itemPltTextureBridge.appliedCount,
      itemArmorPartPltBridgeReferences: itemPltTextureBridge.references,
      itemArmorPartPltBridgeMode: itemPltTextureBridge.mode,
      itemArmorPartTintStatus:
        itemTintResults.length > 0 ? "applied" : "not-applicable",
      itemArmorPartTintAppliedCount: itemTintResults.reduce(
        (sum, result) => sum + result.appliedCount,
        0
      ),
      itemArmorPartTintColor: itemTintResults[0]?.tintHex ?? "",
      itemArmorPartTintChannels: itemTintResults[0]?.channels ?? []
    };
    group.userData = {
      ...group.userData,
      ...loadedUserData
    };
    latestRoot.add(group);
    latestRoot.userData = {
      ...latestRoot.userData,
      ...loadedUserData
    };
    const itemRuntimeEffectUserData = applyItemSourceRuntimeEffectsToRoot(
      runtime,
      objectId,
      latestRoot
    );
    group.userData = {
      ...group.userData,
      ...itemRuntimeEffectUserData
    };
    latestRoot.userData = {
      ...latestRoot.userData,
      ...itemRuntimeEffectUserData
    };
    writePlaceableModelDebugStatus(runtime, "loaded", {
      objectId,
      url: resolutions[0]?.modelUrl ?? null,
      loadPhase: "item-armor-parts",
      loadCompleted: loadedEntries.length,
      loadTotal: resolutions.length,
      itemArmorPartLoadStatus: String(loadedUserData.itemArmorPartLoadStatus),
      itemArmorPartAssemblyMode: armorAssembly.mode,
      itemArmorPartAssemblySkeletonModelStatus: String(
        loadedUserData.itemArmorPartAssemblySkeletonModelStatus
      ),
      itemArmorPartWaistSeamCoverStatus: String(
        loadedUserData.itemArmorPartWaistSeamCoverStatus
      ),
      itemArmorPartWaistSeamCoverBounds: String(
        loadedUserData.itemArmorPartWaistSeamCoverBounds
      ),
      itemArmorPartWaistSeamCoverColor: String(
        loadedUserData.itemArmorPartWaistSeamCoverColor
      ),
      itemArmorPartTintStatus: String(loadedUserData.itemArmorPartTintStatus),
      itemRuntimeEffectStatus: String(itemRuntimeEffectUserData.itemRuntimeEffectStatus),
      itemDanglymeshStatus: String(itemRuntimeEffectUserData.itemDanglymeshStatus),
      itemDanglymeshMeshCount: String(itemRuntimeEffectUserData.itemDanglymeshMeshCount),
      itemArmorPartResRefs: resolutions.map((entry) => entry.modelResRef ?? "").join("|")
    });
  });
}

function applyItemModelParts(input: {
  runtime: ItemModelPartRuntime;
  objectId: string;
  root: THREE.Object3D;
  object: SceneObject;
  resolutions: ItemRenderModelPartResolution[];
  textureUrlsByReference: Map<string, string>;
  objectRadius: number;
}): void {
  const {
    runtime,
    objectId,
    root,
    object,
    resolutions,
    textureUrlsByReference,
    objectRadius
  } = input;
  const baseUserData = buildItemModelPartGroupUserData(object, resolutions);
  if (resolutions.length === 0) {
    root.userData = {
      ...root.userData,
      ...baseUserData,
      itemModelPartLoadedCount: 0,
      itemModelPartTotalCount: 0
    };
    return;
  }
  removeItemModelPartGroups(root);

  root.userData = {
    ...root.userData,
    ...baseUserData,
    itemModelPartLoadStatus: "loading",
    itemModelPartLoadedCount: 0,
    itemModelPartTotalCount: resolutions.length,
    itemModelTextureReferenceCount: textureUrlsByReference.size,
    itemModelTextureReferences: Array.from(textureUrlsByReference.keys())
  };
  writePlaceableModelDebugStatus(runtime, "loading", {
    objectId,
    url: resolutions[0]?.modelUrl ?? null,
    loadPhase: "item-model-parts",
    loadCompleted: 0,
    loadTotal: resolutions.length,
    itemModelPartResRefs: resolutions.map((entry) => entry.partResRef).join("|")
  });

  const textureRequest =
    textureUrlsByReference.size > 0
      ? ensurePlaceableTexturesByReference(runtime, textureUrlsByReference)
      : Promise.resolve(new Map<string, THREE.Texture>());
  const textureBindingsRequest = loadItemTextureBindings(runtime, object);

  void Promise.all([
    textureRequest,
    textureBindingsRequest,
    Promise.all(
      resolutions.map(async (entry) => ({
        entry,
        model: await ensurePlaceableModel(runtime, entry.modelUrl, {
          cloneMaterials: true,
          cacheKey: entry.modelCacheKey,
          priority: PLACEABLE_MODEL_LOAD_PRIORITY_HIGH
        })
      }))
    )
  ]).then(([texturesByReference, itemTextureBindings, resolvedEntries]) => {
    const latestRoot = runtime.objectMeshById.get(objectId);
    if (!latestRoot || latestRoot !== root) {
      return;
    }
    const loadedEntries = resolvedEntries.filter(
      (entry): entry is LoadedItemModelPartEntry => Boolean(entry.model)
    );
    if (loadedEntries.length === 0) {
      const missingUserData = {
        ...baseUserData,
        itemModelPartLoadStatus: "missing",
        itemModelPartLoadedCount: 0,
        itemModelPartTotalCount: resolutions.length
      };
      latestRoot.userData = {
        ...latestRoot.userData,
        ...missingUserData
      };
      writePlaceableModelDebugStatus(runtime, "missing", {
        objectId,
        url: resolutions[0]?.modelUrl ?? null,
        loadPhase: "item-model-parts",
        loadCompleted: 0,
        loadTotal: resolutions.length,
        itemModelPartResRefs: resolutions.map((entry) => entry.partResRef).join("|")
      });
      return;
    }

    const itemRenderColors = resolveItemRenderColors(object);
    const itemPltTextureBridge = buildCreaturePltTextureBridge(
      texturesByReference,
      itemRenderColors
    );
    const itemTintResults: CreatureTintApplicationResult[] = [];
    const itemModelPartTextureFallbackReferences: string[] = [];
    const itemModelPartTextureApplicationReferences: string[] = [];
    const itemModelPartTextureForcedReferences: string[] = [];
    let itemModelPartTextureForcedMaterialCount = 0;
    const group = new THREE.Group();
    group.name = "item_model_parts";
    loadedEntries.forEach(({ entry, model }, index) => {
      const fallbackTextureReferences = resolveItemModelFallbackTextureReferences(object, {
        role: entry.role,
        partResRef: entry.partResRef
      });
      const modelTexturesByReference = resolveItemModelTexturesForApplication(
        model,
        itemPltTextureBridge.texturesByReference,
        itemTextureBindings,
        fallbackTextureReferences
      );
      itemModelPartTextureFallbackReferences.push(...fallbackTextureReferences);
      itemModelPartTextureApplicationReferences.push(...modelTexturesByReference.keys());
      if (modelTexturesByReference.size > 0) {
        applyPlaceableTexturesToModel(model, modelTexturesByReference, undefined, {
          textureBindings: itemTextureBindings
        });
        const forcedTextureResult = forceItemFallbackTextureToUnmappedMaterials(
          model,
          modelTexturesByReference,
          fallbackTextureReferences
        );
        if (forcedTextureResult) {
          itemModelPartTextureForcedReferences.push(forcedTextureResult.reference);
          itemModelPartTextureForcedMaterialCount += forcedTextureResult.appliedCount;
        }
      }
      const tintResult = applyCreatureMaterialTintToModel(model, itemRenderColors);
      if (tintResult) {
        itemTintResults.push(tintResult);
      }
      model.name = `item_model_part_${entry.partResRef}_${index}`;
      model.userData = {
        ...model.userData,
        itemModelPartStatus: "loaded",
        itemModelPartResRef: entry.partResRef,
        itemModelPartRole: entry.role ?? "",
        itemModelPartId: entry.partId ?? null,
        itemModelPartUrl: entry.modelUrl,
        itemModelPartCacheKey: entry.modelCacheKey,
        itemModelPartTextureReferences: Array.from(modelTexturesByReference.keys())
      };
      group.add(model);
    });
    const previewTransform = resolveItemModelPartPreviewTransform(object, resolutions);
    applyItemModelPartPreviewTransform(group, previewTransform);
    normalizePlaceableModelToObjectRadius(objectRadius, group, {
      targetMaxAxisFactor: previewTransform.targetMaxAxisFactor
    });
    const modelMetrics = resolvePlaceableNormalizedModelPresentationMetrics(group);
    if (modelMetrics.boundsEmpty || modelMetrics.meshCount < 1) {
      const iconFallback = createItemIconFallbackRender(object, objectRadius);
      const emptyModelUserData = {
        ...baseUserData,
        ...(iconFallback?.userData ?? {}),
        itemPreviewMode: iconFallback
          ? "icon-fallback-empty-model"
          : "empty-model-missing-icon",
        itemModelPartLoadStatus: iconFallback
          ? "empty-model-icon-fallback"
          : "empty-model-missing-icon",
        itemModelPartLoadedCount: loadedEntries.length,
        itemModelPartTotalCount: resolutions.length,
        itemModelPartLoadedResRefs: loadedEntries.map((entry) => entry.entry.partResRef),
        itemModelPartEmptyMeshCount: modelMetrics.meshCount,
        itemModelPartEmptyBounds: modelMetrics.boundsEmpty ? "empty" : "invalid",
        itemModelPartPreviewTransformMode: previewTransform.mode,
        itemModelPartPreviewTargetMaxAxisFactor: previewTransform.targetMaxAxisFactor,
        itemModelPartPreviewRotation: formatItemModelPartPreviewRotation(previewTransform),
        itemModelTextureReferenceCount: textureUrlsByReference.size,
        itemModelTextureReferences: Array.from(textureUrlsByReference.keys()),
        itemModelTextureLoadedCount: texturesByReference.size,
        itemModelTextureLoadedReferences: Array.from(texturesByReference.keys())
      };
      group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          disposeMeshResources(child);
        }
      });
      latestRoot.userData = {
        ...latestRoot.userData,
        ...emptyModelUserData
      };
      if (iconFallback) {
        latestRoot.add(iconFallback.group);
        markAreaObjectSharedRendererTextureRuntimeEvidence(latestRoot, "loading", {
          textureCount: 1,
          textureLoaded: 0,
          textureSource: iconFallback.composition.source,
          requestedTextureReferences: [iconFallback.composition.iconResRef]
        });
        scheduleItemIconFallbackTextureLoad({
          runtime,
          objectId,
          root: latestRoot,
          fallback: iconFallback
        });
      } else {
        markAreaObjectSharedRendererTextureRuntimeEvidence(latestRoot, "missing", {
          textureCount: 0,
          textureLoaded: 0,
          textureSource: null,
          requestedTextureReferences: [object.itemProperties?.baseItemDefaultIcon ?? ""]
        });
      }
      writePlaceableModelDebugStatus(runtime, iconFallback ? "loading" : "missing", {
        objectId,
        url: resolutions[0]?.modelUrl ?? null,
        loadPhase: "item-model-parts",
        loadCompleted: loadedEntries.length,
        loadTotal: resolutions.length,
        itemModelPartLoadStatus: String(emptyModelUserData.itemModelPartLoadStatus),
        itemModelPartResRefs: resolutions.map((entry) => entry.partResRef).join("|"),
        itemModelPartEmptyMeshCount: modelMetrics.meshCount,
        itemModelPartEmptyBounds: modelMetrics.boundsEmpty ? "empty" : "invalid",
        itemIconFallbackStatus: iconFallback ? "loading" : "missing"
      });
      return;
    }
    const loadedUserData = {
      ...baseUserData,
      itemModelPartLoadStatus:
        loadedEntries.length === resolutions.length ? "loaded" : "partial",
      itemModelPartLoadedCount: loadedEntries.length,
      itemModelPartTotalCount: resolutions.length,
      itemModelPartLoadedResRefs: loadedEntries.map((entry) => entry.entry.partResRef),
      itemModelPartGroupStatus: "source-item-model-parts",
      itemModelPartPreviewTransformMode: previewTransform.mode,
      itemModelPartPreviewTargetMaxAxisFactor: previewTransform.targetMaxAxisFactor,
      itemModelPartPreviewRotation: formatItemModelPartPreviewRotation(previewTransform),
      itemModelTextureReferenceCount: textureUrlsByReference.size,
      itemModelTextureReferences: Array.from(textureUrlsByReference.keys()),
      itemModelTextureLoadedCount: texturesByReference.size,
      itemModelTextureLoadedReferences: Array.from(texturesByReference.keys()),
      itemModelTextureBindingCount: itemTextureBindings.length,
      itemModelTextureBindingReferences: itemTextureBindings.map((binding) => binding.reference),
      itemModelPartTextureFallbackReferences: Array.from(
        new Set(itemModelPartTextureFallbackReferences)
      ),
      itemModelPartTextureApplicationReferences: Array.from(
        new Set(itemModelPartTextureApplicationReferences)
      ),
      itemModelPartTextureForcedReferences: Array.from(
        new Set(itemModelPartTextureForcedReferences)
      ),
      itemModelPartTextureForcedMaterialCount,
      itemModelTextureLoadStatus:
        textureUrlsByReference.size === 0
          ? "not-applicable"
          : texturesByReference.size >= textureUrlsByReference.size
            ? "loaded"
            : texturesByReference.size > 0
              ? "partial"
              : "missing",
      itemMaterialColorStatus: itemRenderColors ? "configured" : "not-applicable",
      itemMaterialColorLayerRows: itemPltTextureBridge.layerRows,
      itemModelPartPltBridgeStatus:
        itemPltTextureBridge.appliedCount > 0 ? "applied" : "not-applicable",
      itemModelPartPltBridgeCount: itemPltTextureBridge.appliedCount,
      itemModelPartPltBridgeReferences: itemPltTextureBridge.references,
      itemModelPartPltBridgeMode: itemPltTextureBridge.mode,
      itemModelPartTintStatus:
        itemTintResults.length > 0 ? "applied" : "not-applicable",
      itemModelPartTintAppliedCount: itemTintResults.reduce(
        (sum, result) => sum + result.appliedCount,
        0
      ),
      itemModelPartTintColor: itemTintResults[0]?.tintHex ?? "",
      itemModelPartTintChannels: itemTintResults[0]?.channels ?? []
    };
    group.userData = {
      ...group.userData,
      ...loadedUserData
    };
    latestRoot.add(group);
    latestRoot.userData = {
      ...latestRoot.userData,
      ...loadedUserData
    };
    const itemRuntimeEffectUserData = applyItemSourceRuntimeEffectsToRoot(
      runtime,
      objectId,
      latestRoot
    );
    group.userData = {
      ...group.userData,
      ...itemRuntimeEffectUserData
    };
    latestRoot.userData = {
      ...latestRoot.userData,
      ...itemRuntimeEffectUserData
    };
    writePlaceableModelDebugStatus(runtime, "loaded", {
      objectId,
      url: resolutions[0]?.modelUrl ?? null,
      loadPhase: "item-model-parts",
      loadCompleted: loadedEntries.length,
      loadTotal: resolutions.length,
      itemModelPartLoadStatus: String(loadedUserData.itemModelPartLoadStatus),
      itemModelPartTintStatus: String(loadedUserData.itemModelPartTintStatus),
      itemRuntimeEffectStatus: String(itemRuntimeEffectUserData.itemRuntimeEffectStatus),
      itemDanglymeshStatus: String(itemRuntimeEffectUserData.itemDanglymeshStatus),
      itemDanglymeshMeshCount: String(itemRuntimeEffectUserData.itemDanglymeshMeshCount),
      itemModelPartResRefs: resolutions.map((entry) => entry.partResRef).join("|")
    });
  });
}

function applyCreaturePartSkeletonAnchors(
  skeletonModel: THREE.Object3D | null,
  loadedEntries: LoadedCreaturePartModelEntry[]
): CreaturePartAssemblyResult | null {
  if (!skeletonModel || loadedEntries.length === 0) {
    return null;
  }

  const anchors = collectCreatureSkeletonAnchors(skeletonModel);
  const attachableEntries = loadedEntries
    .map(({ entry, model }) => {
      const attachmentTarget = resolveCreaturePartAttachmentTarget(entry);
      const anchor = attachmentTarget
        ? anchors.get(normalizeCreatureNodeName(attachmentTarget))
        : undefined;
      return { entry, model, attachmentTarget, anchor };
    })
    .filter((entry) => entry.attachmentTarget.length > 0);
  if (attachableEntries.length === 0) {
    return null;
  }

  const missingAttachmentTargets = attachableEntries
    .filter((entry) => !entry.anchor)
    .map((entry) => entry.attachmentTarget);
  const matchedEntries = attachableEntries.filter((entry) => entry.anchor);
  if (matchedEntries.length === 0) {
    return null;
  }

  const matchedSlots: string[] = [];
  const partBounds: Record<string, string> = {};
  const partCenters: Record<string, string> = {};
  const partAnchorCenters: Record<string, string> = {};
  matchedEntries.forEach(({ entry, model, attachmentTarget, anchor }) => {
    if (!anchor) {
      return;
    }
    anchor.add(model);
    model.position.set(0, 0, 0);
    model.quaternion.identity();
    const attachmentCorrectionUserData = applyCreaturePartAttachmentCorrection(
      entry,
      model
    );
    model.updateMatrixWorld(true);
    anchor.updateMatrixWorld(true);
    const partBox = new THREE.Box3().setFromObject(model);
    const partCenter = new THREE.Vector3();
    const anchorCenter = new THREE.Vector3();
    if (!partBox.isEmpty()) {
      partBox.getCenter(partCenter);
      partBounds[entry.slot] = formatCreatureRuntimeBounds(partBox);
      partCenters[entry.slot] = formatCreatureRuntimeVector(partCenter);
    }
    anchor.getWorldPosition(anchorCenter);
    partAnchorCenters[entry.slot] = formatCreatureRuntimeVector(anchorCenter);
    model.userData = {
      ...model.userData,
      creaturePartAssemblyMode: "skeleton-anchors",
      creaturePartAttachmentTarget: attachmentTarget,
      creaturePartSkeletonAnchorName: anchor.name,
      creaturePartSkeletonAnchorMatched: true,
      ...attachmentCorrectionUserData,
      ...(partBounds[entry.slot]
        ? { creaturePartSkeletonBounds: partBounds[entry.slot] }
        : {}),
      ...(partCenters[entry.slot]
        ? { creaturePartSkeletonCenter: partCenters[entry.slot] }
        : {}),
      creaturePartSkeletonAnchorCenter: partAnchorCenters[entry.slot]
    };
    matchedSlots.push(entry.slot);
  });

  return {
    mode: "skeleton-anchors",
    axis: "skeleton-nodes",
    adjustedSlots: matchedSlots,
    lateralAdjustedSlots: [],
    attachmentTargets: attachableEntries.map((entry) => entry.attachmentTarget),
    skeletonMatchedSlots: matchedSlots,
    missingAttachmentTargets,
    partBounds,
    partCenters,
    partAnchorCenters
  };
}

function stabilizeCreaturePartEmbeddedAccessoryMeshes(
  root: THREE.Object3D,
  loadedEntries: LoadedCreaturePartModelEntry[]
): CreaturePartEmbeddedAccessoryStabilizationResult {
  const torsoEntry =
    loadedEntries.find(({ entry }) => entry.slot === "torso") ??
    loadedEntries.find(({ entry }) => entry.slot === "robe") ??
    null;
  if (!torsoEntry) {
    return {
      status: "not-applicable",
      adjustedMeshNames: [],
      adjustmentOffsets: []
    };
  }

  root.updateMatrixWorld(true);
  torsoEntry.model.updateMatrixWorld(true);
  const torsoBox = new THREE.Box3().setFromObject(torsoEntry.model);
  const rootBox = new THREE.Box3().setFromObject(root);
  if (torsoBox.isEmpty() || rootBox.isEmpty()) {
    return {
      status: "not-applicable",
      adjustedMeshNames: [],
      adjustmentOffsets: []
    };
  }

  const torsoCenter = new THREE.Vector3();
  const rootSize = new THREE.Vector3();
  torsoBox.getCenter(torsoCenter);
  rootBox.getSize(rootSize);
  const minimumDrop = Math.max(rootSize.y * 0.22, 0.12);
  const adjustedMeshNames: string[] = [];
  const adjustmentOffsets: string[] = [];

  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh) || !isCreatureEmbeddedWingMeshName(node.name)) {
      return;
    }
    node.updateMatrixWorld(true);
    const meshBox = new THREE.Box3().setFromObject(node);
    if (meshBox.isEmpty()) {
      return;
    }
    const meshCenter = new THREE.Vector3();
    meshBox.getCenter(meshCenter);
    const offsetY = torsoCenter.y - meshCenter.y;
    if (offsetY <= minimumDrop) {
      return;
    }
    moveObjectByWorldOffset(node, new THREE.Vector3(0, offsetY, 0));
    node.userData = {
      ...node.userData,
      creaturePartEmbeddedAccessoryStabilized: true,
      creaturePartEmbeddedAccessoryStabilizationMode: "wing-height-to-torso",
      creaturePartEmbeddedAccessoryStabilizationOffset: formatCreatureRuntimeVector(
        new THREE.Vector3(0, offsetY, 0)
      )
    };
    adjustedMeshNames.push(node.name || "unnamed-wing-mesh");
    adjustmentOffsets.push(formatCreatureRuntimeVector(new THREE.Vector3(0, offsetY, 0)));
    node.updateMatrixWorld(true);
  });

  if (adjustedMeshNames.length === 0) {
    return {
      status: "not-applicable",
      adjustedMeshNames,
      adjustmentOffsets
    };
  }
  root.updateMatrixWorld(true);
  return {
    status: "applied",
    adjustedMeshNames,
    adjustmentOffsets
  };
}

function isCreatureEmbeddedWingMeshName(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return (
    normalized.includes("wing") ||
    normalized.includes("rwing") ||
    normalized.includes("lwing")
  );
}

function moveObjectByWorldOffset(node: THREE.Object3D, offset: THREE.Vector3): void {
  if (!node.parent) {
    node.position.add(offset);
    return;
  }
  const worldPosition = new THREE.Vector3();
  node.getWorldPosition(worldPosition);
  const localBefore = node.parent.worldToLocal(worldPosition.clone());
  const localAfter = node.parent.worldToLocal(worldPosition.clone().add(offset));
  node.position.add(localAfter.sub(localBefore));
}

function applyCreaturePartBoundingBoxStacking(
  partGroup: THREE.Group,
  loadedEntries: LoadedCreaturePartModelEntry[]
): CreaturePartAssemblyResult {
  if (loadedEntries.length < 2) {
    return {
      mode: "raw-origin",
      axis: "none",
      adjustedSlots: [],
      lateralAdjustedSlots: [],
      attachmentTargets: resolveCreaturePartAssemblyAttachmentTargets(loadedEntries)
    };
  }

  loadedEntries.forEach(({ entry, model }) => {
    const attachmentTarget = resolveCreaturePartAttachmentTarget(entry);
    if (attachmentTarget) {
      model.userData = {
        ...model.userData,
        creaturePartAttachmentTarget: attachmentTarget
      };
    }
  });

  partGroup.updateMatrixWorld(true);
  const entriesBySlot = new Map<string, LoadedCreaturePartModelEntry>();
  const boxesBySlot = new Map<string, THREE.Box3>();
  loadedEntries.forEach((entry) => {
    entriesBySlot.set(entry.entry.slot, entry);
    const box = new THREE.Box3().setFromObject(entry.model);
    if (!box.isEmpty()) {
      boxesBySlot.set(entry.entry.slot, box);
    }
  });

  if (boxesBySlot.size < 2) {
    return {
      mode: "raw-origin",
      axis: "none",
      adjustedSlots: [],
      lateralAdjustedSlots: [],
      attachmentTargets: resolveCreaturePartAssemblyAttachmentTargets(loadedEntries)
    };
  }

  const adjustedSlots = new Set<string>();
  const lateralAdjustedSlots = new Set<string>();
  const moveSlotBy = (slot: string, offsetY: number, offsetX = 0) => {
    const entry = entriesBySlot.get(slot);
    if (!entry || (Math.abs(offsetY) < 0.0001 && Math.abs(offsetX) < 0.0001)) {
      return;
    }
    entry.model.position.x += offsetX;
    entry.model.position.y += offsetY;
    entry.model.userData = {
      ...entry.model.userData,
      ...(Math.abs(offsetX) >= 0.0001
        ? {
            creaturePartAssemblyOffsetX: offsetX,
            creaturePartAssemblyPositionX: entry.model.position.x
          }
        : {}),
      ...(Math.abs(offsetY) >= 0.0001 ? { creaturePartAssemblyOffsetY: offsetY } : {}),
      creaturePartAssemblyPositionY: entry.model.position.y
    };
    adjustedSlots.add(slot);
    if (Math.abs(offsetX) >= 0.0001) {
      lateralAdjustedSlots.add(slot);
    }
  };

  let stackFloorY = 0;
  let torsoTopY = 0;
  CREATURE_PART_SPINE_STACK_GROUPS.forEach((slots) => {
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    const presentSlots = slots.filter((slot) => boxesBySlot.has(slot));
    presentSlots.forEach((slot) => {
      const box = boxesBySlot.get(slot);
      if (!box) {
        return;
      }
      minY = Math.min(minY, box.min.y);
      maxY = Math.max(maxY, box.max.y);
    });
    if (presentSlots.length === 0 || !Number.isFinite(minY) || !Number.isFinite(maxY)) {
      return;
    }
    const offsetY = stackFloorY - minY;
    presentSlots.forEach((slot) => moveSlotBy(slot, offsetY));
    stackFloorY += Math.max(0, maxY - minY);
    if (slots.includes("torso") || slots.includes("robe")) {
      torsoTopY = stackFloorY;
    }
  });
  if (torsoTopY === 0) {
    torsoTopY = stackFloorY;
  }

  CREATURE_PART_ARM_STACK_CHAINS.forEach((chain) => {
    let armTopY = torsoTopY;
    chain.forEach((slot) => {
      const box = boxesBySlot.get(slot);
      if (!box) {
        return;
      }
      const offsetY = armTopY - box.max.y;
      moveSlotBy(slot, offsetY);
      armTopY = box.min.y + offsetY;
    });
  });

  const widestPartWidth = Math.max(
    ...Array.from(boxesBySlot.values()).map((box) => box.max.x - box.min.x),
    0
  );
  const lateralSpacing = Math.max(widestPartWidth * 0.58, 0.18);
  loadedEntries.forEach(({ entry }) => {
    const lane = resolveCreaturePartLateralLane(entry.slot);
    if (lane !== 0 && boxesBySlot.has(entry.slot)) {
      moveSlotBy(entry.slot, 0, lane * lateralSpacing);
    }
  });

  const adjustedSlotList = Array.from(adjustedSlots);
  const lateralSlotList = Array.from(lateralAdjustedSlots);
  const attachmentTargets = resolveCreaturePartAssemblyAttachmentTargets(loadedEntries);
  if (adjustedSlotList.length === 0) {
    return {
      mode: "raw-origin",
      axis: "none",
      adjustedSlots: [],
      lateralAdjustedSlots: [],
      attachmentTargets
    };
  }
  return {
    mode: "bbox-stack",
    axis: lateralSlotList.length > 0 ? "three-x-y" : "three-y",
    adjustedSlots: adjustedSlotList,
    lateralAdjustedSlots: lateralSlotList,
    attachmentTargets
  };
}

interface CreatureLoadedModelFeatureSummary {
  skinnedMeshCount: number;
  skinnedMeshNodeNames: string[];
  sourceSkinMeshCount: number;
  sourceSkinMeshNodeNames: string[];
  sourceSkinWeightVertexCount: number;
  sourceSkinInfluencingBoneNames: string[];
  sourceSkinMaxInfluencesPerVertex: number;
  sourceSkinRequiresWeightNormalization: boolean;
  boneCount: number;
  boneNodeNames: string[];
  animationCount: number;
  animationNames: string[];
  animationDurations: number[];
  sourceAnimationCount?: number;
  sourceAnimationNames: string[];
  sourceAnimationClipCount?: number;
  sourceAnimationClipNames: string[];
  sourceHierarchyNodeCount?: number;
  sourceHierarchyRootNodeNames: string[];
  sourceHierarchyNodeTypes: string[];
  sourceHierarchyDummyNodeNames: string[];
  sourceHierarchySynthesizedNodeCount?: number;
  sourceHierarchySynthesizedNodeNames: string[];
  sourceHierarchyReparentedNodeCount?: number;
  sourceHierarchyRebasedGeometryCount?: number;
  sourceHierarchyRebasedGeometryNodeNames: string[];
  renderSuppressedMeshCount?: number;
  renderSuppressedMeshNames: string[];
  declaredRenderSuppressedMeshNames: string[];
  sourceModel?: string;
  supermodel?: string;
  animationScale?: number;
}

function readUserDataStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0);
}

function readUserDataNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is number => typeof entry === "number" && Number.isFinite(entry));
}

function readUserDataNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

function readUserDataString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readUserDataFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readUnknownRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function summarizeCreatureLoadedModelFeatures(
  model: THREE.Object3D
): CreatureLoadedModelFeatureSummary {
  const skinnedMeshNodeNames = new Set<string>();
  const boneNodeNames = new Set<string>();
  const sourceSkinMeshNodeNames = new Set<string>();
  const sourceSkinInfluencingBoneNames = new Set<string>();
  const renderSuppressedMeshNodeNames = new Set<string>();
  let skinnedMeshCount = 0;
  let sourceSkinMeshCount = 0;
  let sourceSkinWeightVertexCount = 0;
  let sourceSkinMaxInfluencesPerVertex = 0;
  let sourceSkinRequiresWeightNormalization = false;
  model.traverse((node) => {
    const maybeSkinnedMesh = node as THREE.Object3D & {
      isSkinnedMesh?: boolean;
      skeleton?: { bones?: THREE.Bone[] };
    };
    if (maybeSkinnedMesh.isSkinnedMesh === true) {
      skinnedMeshCount += 1;
      if (node.name) {
        skinnedMeshNodeNames.add(node.name);
      }
      maybeSkinnedMesh.skeleton?.bones?.forEach((bone) => {
        if (bone.name) {
          boneNodeNames.add(bone.name);
        }
      });
    }
    const maybeBone = node as THREE.Object3D & { isBone?: boolean };
    if (maybeBone.isBone === true && node.name) {
      boneNodeNames.add(node.name);
    }
    if (
      node instanceof THREE.Mesh &&
      node.name &&
      (node.userData?.auroraMdlRenderSuppressed === true ||
        !isCreatureRuntimeNodeEffectivelyVisible(node))
    ) {
      renderSuppressedMeshNodeNames.add(node.name);
    }
    const auroraMetadata = readUnknownRecord(node.userData?.aurora);
    const skinWeights = readUnknownRecord(auroraMetadata?.skinWeights);
    if (skinWeights) {
      sourceSkinMeshCount += 1;
      if (node.name) {
        sourceSkinMeshNodeNames.add(node.name);
      }
      sourceSkinWeightVertexCount += readUserDataNumber(skinWeights.sourceWeightVertexCount);
      sourceSkinMaxInfluencesPerVertex = Math.max(
        sourceSkinMaxInfluencesPerVertex,
        readUserDataNumber(skinWeights.maxInfluencesPerVertex)
      );
      sourceSkinRequiresWeightNormalization =
        sourceSkinRequiresWeightNormalization ||
        skinWeights.requiresWeightNormalization === true;
      readUserDataStringArray(skinWeights.influencingBoneNames).forEach((boneName) =>
        sourceSkinInfluencingBoneNames.add(boneName)
      );
    }
  });

  const animationNames = readUserDataStringArray(model.userData?.auroraGltfAnimationNames);
  const sourceModel = readUserDataString(model.userData?.auroraMdlSourceModel);
  const supermodel = readUserDataString(model.userData?.auroraMdlSupermodel);
  const animationScale = readUserDataFiniteNumber(model.userData?.auroraMdlAnimationScale);
  const sourceAnimationNames = readUserDataStringArray(
    model.userData?.auroraMdlSourceAnimationNames
  );
  const sourceAnimationCount = Math.max(
    readUserDataNumber(model.userData?.auroraMdlSourceAnimationCount),
    sourceAnimationNames.length
  );
  const sourceAnimationClipNames = readUserDataStringArray(
    model.userData?.auroraMdlSourceAnimationClipNames
  );
  const sourceAnimationClipCount = Math.max(
    readUserDataNumber(model.userData?.auroraMdlSourceAnimationClipCount),
    sourceAnimationClipNames.length
  );
  const sourceHierarchyRootNodeNames = readUserDataStringArray(
    model.userData?.auroraMdlSourceHierarchyRootNodeNames
  );
  const sourceHierarchyNodeTypes = readUserDataStringArray(
    model.userData?.auroraMdlSourceHierarchyNodeTypes
  );
  const sourceHierarchyDummyNodeNames = readUserDataStringArray(
    model.userData?.auroraMdlSourceHierarchyDummyNodeNames
  );
  const sourceHierarchyNodeCount = Math.max(
    readUserDataNumber(model.userData?.auroraMdlSourceHierarchyNodeCount),
    sourceHierarchyDummyNodeNames.length
  );
  const sourceHierarchySynthesizedNodeNames = readUserDataStringArray(
    model.userData?.auroraMdlSourceHierarchySynthesizedNodeNames
  );
  const sourceHierarchySynthesizedNodeCount = Math.max(
    readUserDataNumber(model.userData?.auroraMdlSourceHierarchySynthesizedNodeCount),
    sourceHierarchySynthesizedNodeNames.length
  );
  const sourceHierarchyReparentedNodeCount = readUserDataNumber(
    model.userData?.auroraMdlSourceHierarchyReparentedNodeCount
  );
  const sourceHierarchyRebasedGeometryNodeNames = readUserDataStringArray(
    model.userData?.auroraMdlSourceHierarchyRebasedGeometryNodeNames
  );
  const sourceHierarchyRebasedGeometryCount = Math.max(
    readUserDataNumber(model.userData?.auroraMdlSourceHierarchyRebasedGeometryCount),
    sourceHierarchyRebasedGeometryNodeNames.length
  );
  const declaredRenderSuppressedMeshNames = readUserDataStringArray(
    model.userData?.auroraMdlRenderSuppressedMeshNames
  );
  const renderSuppressedMeshNames = declaredRenderSuppressedMeshNames.concat(
    Array.from(renderSuppressedMeshNodeNames)
  );
  const uniqueRenderSuppressedMeshNames = Array.from(new Set(renderSuppressedMeshNames));
  const renderSuppressedMeshCount = Math.max(
    readUserDataNumber(model.userData?.auroraMdlRenderSuppressedMeshCount),
    uniqueRenderSuppressedMeshNames.length
  );
  return {
    skinnedMeshCount,
    skinnedMeshNodeNames: Array.from(skinnedMeshNodeNames),
    sourceSkinMeshCount,
    sourceSkinMeshNodeNames: Array.from(sourceSkinMeshNodeNames),
    sourceSkinWeightVertexCount,
    sourceSkinInfluencingBoneNames: Array.from(sourceSkinInfluencingBoneNames),
    sourceSkinMaxInfluencesPerVertex,
    sourceSkinRequiresWeightNormalization,
    boneCount: boneNodeNames.size,
    boneNodeNames: Array.from(boneNodeNames),
    animationCount: Math.max(
      readUserDataNumber(model.userData?.auroraGltfAnimationCount),
      animationNames.length
    ),
    animationNames,
    animationDurations: readUserDataNumberArray(model.userData?.auroraGltfAnimationDurations),
    ...(sourceAnimationCount > 0 ? { sourceAnimationCount } : {}),
    sourceAnimationNames,
    ...(sourceAnimationClipCount > 0 ? { sourceAnimationClipCount } : {}),
    sourceAnimationClipNames,
    ...(sourceHierarchyNodeCount > 0 ? { sourceHierarchyNodeCount } : {}),
    sourceHierarchyRootNodeNames,
    sourceHierarchyNodeTypes,
    sourceHierarchyDummyNodeNames,
    ...(sourceHierarchySynthesizedNodeCount > 0 ? { sourceHierarchySynthesizedNodeCount } : {}),
    sourceHierarchySynthesizedNodeNames,
    ...(sourceHierarchyReparentedNodeCount > 0 ? { sourceHierarchyReparentedNodeCount } : {}),
    ...(sourceHierarchyRebasedGeometryCount > 0 ? { sourceHierarchyRebasedGeometryCount } : {}),
    sourceHierarchyRebasedGeometryNodeNames,
    ...(renderSuppressedMeshCount > 0 ? { renderSuppressedMeshCount } : {}),
    renderSuppressedMeshNames: uniqueRenderSuppressedMeshNames,
    declaredRenderSuppressedMeshNames,
    ...(sourceModel ? { sourceModel } : {}),
    ...(supermodel ? { supermodel } : {}),
    ...(typeof animationScale === "number" ? { animationScale } : {})
  };
}

function summarizeCreatureMaterialTextureEvidence(model: THREE.Object3D): string {
  const entries: string[] = [];
  model.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material) => {
      const materialWithMap = material as THREE.Material & {
        map?: THREE.Texture | null;
        alphaTest?: number;
      };
      const auroraMaterial = readUnknownRecord(material.userData?.aurora);
      const textureReference =
        readUserDataString(material.userData?.auroraPrimaryTextureReference) ??
        readUserDataString(auroraMaterial?.textureReference) ??
        readUserDataString(material.userData?.textureReference) ??
        "none";
      const texture = materialWithMap.map ?? null;
      const mappedReference =
        readUserDataString(texture?.userData?.auroraTextureReference) ??
        readUserDataString(texture?.userData?.auroraSourceUrl) ??
        "none";
      const sourceFormat = readUserDataString(texture?.userData?.auroraSourceFormat) ?? "none";
      const alphaMode = readUserDataString(material.userData?.auroraTextureAlphaMode) ?? "none";
      const alphaTest =
        typeof materialWithMap.alphaTest === "number" && Number.isFinite(materialWithMap.alphaTest)
          ? materialWithMap.alphaTest.toFixed(3)
          : "none";
      const uvFlip =
        node.userData?.auroraHeadDanglyUvVFlipped === true ||
        node.geometry.userData?.auroraHeadDanglyUvVFlipped === true
          ? "uvVFlip"
          : "uvBase";
      const applicationStatus =
        readUserDataString(material.userData?.auroraTextureApplicationStatus) ?? "not-seen";
      const applicationSelectedReference =
        readUserDataString(material.userData?.auroraTextureApplicationSelectedReference) ??
        "none";
      const applicationMaterialType =
        readUserDataString(material.userData?.auroraTextureApplicationMaterialType) ??
        (material.type ||
        material.constructor.name ||
        "Material");
      const applicationReferenceCandidates = readUserDataStringArray(
        material.userData?.auroraTextureApplicationReferenceCandidates
      ).join(",");
      const applicationSlotCandidates = readUserDataStringArray(
        material.userData?.auroraTextureApplicationSlotReferenceCandidates
      ).join(",");
      const applicationAvailableReferences = readUserDataStringArray(
        material.userData?.auroraTextureApplicationAvailableReferences
      ).join(",");
      const renderStatus =
        isCreatureRuntimeNodeTransformVisible(node) && material.visible !== false
          ? "rendered"
          : "suppressed";
      entries.push(
        [
          node.name || "(mesh)",
          renderStatus,
          `${textureReference}->${mappedReference}`,
          sourceFormat,
          alphaMode,
          alphaTest,
          uvFlip,
          applicationStatus,
          applicationSelectedReference,
          applicationMaterialType,
          applicationReferenceCandidates || "no-candidates",
          applicationSlotCandidates || "no-slots",
          applicationAvailableReferences || "no-available"
        ].join(":")
      );
    });
  });
  return entries.join("|");
}

function buildCreatureLoadedModelFeatureUserData(
  prefix: string,
  model: THREE.Object3D
): Record<string, unknown> {
  const summary = summarizeCreatureLoadedModelFeatures(model);
  return {
    [`${prefix}SkinnedMeshCount`]: summary.skinnedMeshCount,
    [`${prefix}SkinnedMeshNodeNames`]: summary.skinnedMeshNodeNames,
    ...(summary.sourceSkinMeshCount > 0
      ? {
          [`${prefix}SourceSkinMeshCount`]: summary.sourceSkinMeshCount,
          [`${prefix}SourceSkinMeshNodeNames`]: summary.sourceSkinMeshNodeNames,
          [`${prefix}SourceSkinWeightVertexCount`]: summary.sourceSkinWeightVertexCount,
          [`${prefix}SourceSkinInfluencingBoneNames`]: summary.sourceSkinInfluencingBoneNames,
          [`${prefix}SourceSkinMaxInfluencesPerVertex`]: summary.sourceSkinMaxInfluencesPerVertex,
          [`${prefix}SourceSkinRequiresWeightNormalization`]:
            summary.sourceSkinRequiresWeightNormalization
        }
      : {}),
    [`${prefix}BoneCount`]: summary.boneCount,
    [`${prefix}BoneNodeNames`]: summary.boneNodeNames,
    [`${prefix}AnimationCount`]: summary.animationCount,
    [`${prefix}AnimationNames`]: summary.animationNames,
    [`${prefix}AnimationDurations`]: summary.animationDurations,
    ...(typeof summary.sourceAnimationCount === "number"
      ? {
          [`${prefix}SourceAnimationCount`]: summary.sourceAnimationCount,
          [`${prefix}SourceAnimationNames`]: summary.sourceAnimationNames,
          ...(typeof summary.sourceAnimationClipCount === "number"
            ? {
                [`${prefix}SourceAnimationClipCount`]: summary.sourceAnimationClipCount,
                [`${prefix}SourceAnimationClipNames`]: summary.sourceAnimationClipNames
              }
            : {})
        }
      : {}),
    ...(typeof summary.sourceHierarchyNodeCount === "number"
      ? {
          [`${prefix}SourceHierarchyNodeCount`]: summary.sourceHierarchyNodeCount,
          [`${prefix}SourceHierarchyRootNodeNames`]: summary.sourceHierarchyRootNodeNames,
          [`${prefix}SourceHierarchyNodeTypes`]: summary.sourceHierarchyNodeTypes,
          [`${prefix}SourceHierarchyDummyNodeNames`]: summary.sourceHierarchyDummyNodeNames,
          ...(typeof summary.sourceHierarchySynthesizedNodeCount === "number"
            ? {
                [`${prefix}SourceHierarchySynthesizedNodeCount`]:
                  summary.sourceHierarchySynthesizedNodeCount,
                [`${prefix}SourceHierarchySynthesizedNodeNames`]:
                  summary.sourceHierarchySynthesizedNodeNames
              }
            : {})
        }
      : {}),
    ...(typeof summary.sourceHierarchyReparentedNodeCount === "number"
      ? {
          [`${prefix}SourceHierarchyReparentedNodeCount`]:
            summary.sourceHierarchyReparentedNodeCount
        }
      : {}),
    ...(typeof summary.sourceHierarchyRebasedGeometryCount === "number"
      ? {
          [`${prefix}SourceHierarchyRebasedGeometryCount`]:
            summary.sourceHierarchyRebasedGeometryCount,
          [`${prefix}SourceHierarchyRebasedGeometryNodeNames`]:
            summary.sourceHierarchyRebasedGeometryNodeNames
        }
      : {}),
    ...(typeof summary.renderSuppressedMeshCount === "number"
      ? {
          [`${prefix}RenderSuppressedMeshCount`]: summary.renderSuppressedMeshCount,
          [`${prefix}RenderSuppressedMeshNames`]: summary.renderSuppressedMeshNames
        }
      : {}),
    ...(summary.sourceModel ? { [`${prefix}SourceModel`]: summary.sourceModel } : {}),
    ...(summary.supermodel ? { [`${prefix}Supermodel`]: summary.supermodel } : {}),
    ...(typeof summary.animationScale === "number"
      ? { [`${prefix}AnimationScale`]: summary.animationScale }
      : {})
  };
}

function collectCreatureLoadedModelAnimationClips(
  model: THREE.Object3D
): THREE.AnimationClip[] {
  const clipsByName = new Map<string, THREE.AnimationClip>();
  const addClips = (node: THREE.Object3D): void => {
    readPlaceableModelAnimationClips(node).forEach((clip, index) => {
      const key = clip.name || `clip_${clipsByName.size + index}`;
      if (!clipsByName.has(key)) {
        clipsByName.set(key, clip);
      }
    });
  };
  addClips(model);
  model.traverse((node) => {
    if (node !== model) {
      addClips(node);
    }
  });
  return Array.from(clipsByName.values());
}

function applyItemSourceRuntimeEffectsToRoot(
  runtime: RuntimeState,
  objectId: string,
  root: THREE.Object3D
): Record<string, unknown> {
  const clips = collectCreatureLoadedModelAnimationClips(root);
  const sourceAnimmesh = createAuroraSourceAnimmeshRuntime(root, clips);
  const sourceDanglymesh = createAuroraSourceDanglymeshRuntime(root, clips);
  const sourceAlpha = createAuroraSourceAlphaRuntime(root, clips);
  const sourceSelfIllum = createAuroraSourceSelfIllumColorRuntime(root, clips);
  const textureCycle = registerRuntimeAuroraTextureCyclePlayback(
    runtime,
    objectId,
    root
  );
  const hasRuntimeEffects = Boolean(
    sourceAnimmesh || sourceDanglymesh || sourceAlpha || sourceSelfIllum || textureCycle
  );

  sourceAnimmesh?.apply(0, 0);
  sourceDanglymesh?.apply(0, 0);
  sourceAlpha?.apply(0, 0);
  sourceSelfIllum?.apply(0, 0);
  textureCycle?.apply(0, 0);

  const userData: Record<string, unknown> = {
    itemRuntimeEffectStatus: hasRuntimeEffects ? "active" : "not-applicable",
    itemRuntimeEffectMode: hasRuntimeEffects ? "source-mdl-runtime-effects" : "none",
    itemRuntimeEffectAnimationClipCount: clips.length,
    itemRuntimeEffectAnimationClipNames: clips.map((clip) => clip.name).filter(Boolean),
    itemAnimmeshStatus: sourceAnimmesh ? "active" : "not-applicable",
    itemAnimmeshMode: sourceAnimmesh
      ? sourceAnimmesh.vertexMeshCount > 0
        ? "webviewer-animmesh-frames"
        : "webviewer-uv-frames"
      : "none",
    itemAnimmeshMeshCount: sourceAnimmesh?.animmeshCount ?? 0,
    itemAnimmeshUvMeshCount: sourceAnimmesh?.uvMeshCount ?? 0,
    itemAnimmeshVertexMeshCount: sourceAnimmesh?.vertexMeshCount ?? 0,
    itemAnimmeshNodeNames: sourceAnimmesh?.nodeNames ?? [],
    itemAnimmeshAnimationClipNames: sourceAnimmesh?.animationClipNames ?? [],
    itemDanglymeshStatus: sourceDanglymesh ? "active" : "not-applicable",
    itemDanglymeshMode: sourceDanglymesh ? "webviewer-sine" : "none",
    itemDanglymeshMeshCount: sourceDanglymesh?.danglyMeshCount ?? 0,
    itemDanglymeshWeightedVertexCount: sourceDanglymesh?.weightedVertexCount ?? 0,
    itemDanglymeshNodeNames: sourceDanglymesh?.nodeNames ?? [],
    itemDanglymeshAnimationOverrideClipNames:
      sourceDanglymesh?.animationOverrideClipNames ?? [],
    itemDanglymeshAnimationOverrideNodeNames:
      sourceDanglymesh?.animationOverrideNodeNames ?? [],
    itemAlphaAnimationStatus: sourceAlpha ? "active" : "not-applicable",
    itemAlphaAnimationMode: sourceAlpha ? "webviewer-alphakey" : "none",
    itemAlphaAnimationMeshCount: sourceAlpha?.alphaMeshCount ?? 0,
    itemAlphaAnimationNodeNames: sourceAlpha?.nodeNames ?? [],
    itemAlphaAnimationClipNames: sourceAlpha?.animationClipNames ?? [],
    itemSelfIllumColorAnimationStatus: sourceSelfIllum ? "active" : "not-applicable",
    itemSelfIllumColorAnimationMode: sourceSelfIllum
      ? "webviewer-selfillumcolorkey"
      : "none",
    itemSelfIllumColorAnimationMeshCount: sourceSelfIllum?.selfIllumMeshCount ?? 0,
    itemSelfIllumColorAnimationNodeNames: sourceSelfIllum?.nodeNames ?? [],
    itemSelfIllumColorAnimationClipNames: sourceSelfIllum?.animationClipNames ?? [],
    itemTextureCycleStatus: textureCycle ? "active" : "not-applicable",
    itemTextureCycleMode: textureCycle ? "webviewer-txi-cycle" : "none",
    itemTextureCycleMaterialCount: textureCycle?.materialCount ?? 0,
    itemTextureCycleTextureCount: textureCycle?.textureCount ?? 0,
    itemTextureCycleReferences: textureCycle?.references ?? []
  };

  if (hasRuntimeEffects) {
    registerRuntimeObjectAnimationPlayback(runtime, objectId, root, [], {
      autoplay: true,
      applyInitialPose: true,
      afterUpdate: (
        deltaSeconds?: number,
        elapsedSeconds?: number,
        _animationTimeSeconds?: number,
        _animationCompleted?: boolean,
        _rendererFrameSerial?: number,
        _rendererDeltaSeconds?: number
      ): void => {
        sourceAnimmesh?.apply(deltaSeconds, elapsedSeconds);
        sourceDanglymesh?.apply(deltaSeconds, elapsedSeconds);
        sourceAlpha?.apply(deltaSeconds, elapsedSeconds);
        sourceSelfIllum?.apply(deltaSeconds, elapsedSeconds);
      }
    });
  }

  root.userData = {
    ...root.userData,
    ...userData
  };
  return userData;
}

const CREATURE_IDLE_ANIMATION_NAME_PRIORITY = [
  "pause",
  "idle",
  "stand",
  "ready"
] as const;

const CREATURE_NON_IDLE_ANIMATION_NAME_PATTERN =
  /(walk|run|attack|damage|dead|death|dodge|parry|cast|spell|taunt|talk|greet|turn|hit|kneel|slash|stab|appear|disappear|conjure|close|reach|spasm|get|knock|kdbck)/iu;

const CREATURE_NEUTRAL_PAUSE_ANIMATION_NAME_PATTERN =
  /^(?:[a-z]?pause\d+|plpause\d*)$/iu;
const CREATURE_READY_STANCE_ANIMATION_NAME_PATTERN =
  /^(?:(?:[12]h|2w|nw|pl)ready[lr]?|x?bowrdy)$/iu;

function normalizeCreatureAnimationClipName(clip: THREE.AnimationClip): string {
  return (clip.name || "").trim().toLowerCase();
}

function normalizeCreatureRequestedAnimationName(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

function resolveCreatureIdleAnimationPriority(clip: THREE.AnimationClip): number {
  const normalizedName = normalizeCreatureAnimationClipName(clip);
  if (!normalizedName) {
    return 1000;
  }
  const exactPriority = CREATURE_IDLE_ANIMATION_NAME_PRIORITY.indexOf(
    normalizedName as (typeof CREATURE_IDLE_ANIMATION_NAME_PRIORITY)[number]
  );
  if (exactPriority >= 0) {
    return exactPriority;
  }
  if (CREATURE_NON_IDLE_ANIMATION_NAME_PATTERN.test(normalizedName)) {
    return 900;
  }
  if (CREATURE_NEUTRAL_PAUSE_ANIMATION_NAME_PATTERN.test(normalizedName)) {
    return 10;
  }
  if (CREATURE_READY_STANCE_ANIMATION_NAME_PATTERN.test(normalizedName)) {
    return 30;
  }
  const prefixPriority = CREATURE_IDLE_ANIMATION_NAME_PRIORITY.findIndex((name) =>
    normalizedName.startsWith(name)
  );
  if (prefixPriority >= 0) {
    return 20 + prefixPriority;
  }
  return 200;
}

function isCreatureIdleAnimationClip(clip: THREE.AnimationClip): boolean {
  return resolveCreatureIdleAnimationPriority(clip) < 200;
}

function normalizeCreatureAnimationClipForPlayback(
  clip: THREE.AnimationClip
): THREE.AnimationClip {
  if (Number.isFinite(clip.duration) && clip.duration > 0) {
    return clip;
  }
  const inferredDuration = clip.tracks.reduce((duration, track) => {
    const times = track.times;
    const lastTime = times.length > 0 ? times[times.length - 1] : 0;
    return Number.isFinite(lastTime) && lastTime > duration ? lastTime : duration;
  }, 0);
  const normalizedClip = new THREE.AnimationClip(
    clip.name,
    inferredDuration > 0 ? inferredDuration : 1,
    [...clip.tracks],
    clip.blendMode
  );
  normalizedClip.userData = {
    ...clip.userData,
    creatureAnimationDurationNormalizedForPlayback: true,
    creatureAnimationOriginalDuration: clip.duration
  };
  return normalizedClip;
}

function cloneCreatureAnimationClipWithAdditionalUserData(
  clip: THREE.AnimationClip,
  userData: Record<string, unknown>
): THREE.AnimationClip {
  const clonedClip = clip.clone();
  clonedClip.name = clip.name;
  clonedClip.userData = {
    ...clip.userData,
    ...userData
  };
  return clonedClip;
}

function resolveCreatureAnimationClipCoverageScore(
  clip: THREE.AnimationClip
): number {
  const targetNames = new Set<string>();
  clip.tracks.forEach((track) => {
    const nodeName = resolveCreatureAnimationTrackBindingNodeName(track.name);
    if (nodeName) {
      targetNames.add(normalizeCreatureNodeName(nodeName));
    }
  });
  const validDuration = Number.isFinite(clip.duration) && clip.duration > 0
    ? clip.duration
    : 0;
  return targetNames.size * 10000 + clip.tracks.length * 100 + validDuration;
}

function deduplicateCreatureAnimationClips(
  clips: readonly THREE.AnimationClip[]
): THREE.AnimationClip[] {
  const selectedByName = new Map<string, THREE.AnimationClip>();
  const deduplicated: THREE.AnimationClip[] = [];
  clips.forEach((clip) => {
    const key = normalizeCreatureAnimationClipName(clip);
    if (!key) {
      return;
    }
    const existing = selectedByName.get(key);
    if (!existing) {
      selectedByName.set(key, clip);
      deduplicated.push(clip);
      return;
    }
    const existingScore = resolveCreatureAnimationClipCoverageScore(existing);
    const candidateScore = resolveCreatureAnimationClipCoverageScore(clip);
    if (candidateScore <= existingScore) {
      return;
    }
    selectedByName.set(key, clip);
    const existingIndex = deduplicated.indexOf(existing);
    if (existingIndex >= 0) {
      deduplicated[existingIndex] = clip;
    }
  });
  return deduplicated;
}

function resolveCreatureSiblingDerivedModelUrl(
  currentModelUrl: string | null | undefined,
  modelResRef: string
): string | null {
  const normalizedResRef = modelResRef.trim().toLowerCase();
  if (!currentModelUrl || !normalizedResRef) {
    return null;
  }
  try {
    const url = new URL(currentModelUrl, window.location.href);
    const pathSegments = url.pathname.split("/");
    if (pathSegments.length === 0 || !/\.glb$/iu.test(pathSegments[pathSegments.length - 1] ?? "")) {
      return null;
    }
    pathSegments[pathSegments.length - 1] = `${normalizedResRef}.glb`;
    url.pathname = pathSegments.join("/");
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

async function loadCreatureRuntimeSupermodelChainFromModel(
  runtime: RuntimeState,
  initialModel: THREE.Object3D | null,
  initialModelUrl: string | null | undefined,
  initialCacheKey: string | null | undefined
): Promise<THREE.Object3D[]> {
  const chainModels: THREE.Object3D[] = [];
  let currentModel = initialModel;
  let currentModelUrl = initialModelUrl ?? null;
  const visited = new Set<string>();
  const initialSourceModel = readUserDataString(currentModel?.userData?.auroraMdlSourceModel);
  if (initialSourceModel) {
    visited.add(initialSourceModel.toLowerCase());
  }

  for (let depth = 0; currentModel && depth < 8; depth += 1) {
    const nextSupermodel = readUserDataString(currentModel.userData?.auroraMdlSupermodel);
    const nextSupermodelKey = nextSupermodel?.toLowerCase();
    if (!nextSupermodel || !nextSupermodelKey || visited.has(nextSupermodelKey)) {
      break;
    }
    const nextModelUrl = resolveCreatureSiblingDerivedModelUrl(
      currentModelUrl,
      nextSupermodel
    );
    if (!nextModelUrl) {
      break;
    }
    const nextModel = await ensurePlaceableModel(runtime, nextModelUrl, {
      cloneMaterials: false,
      cacheKey: `${initialCacheKey ?? currentModelUrl ?? "runtime-supermodel-chain"}:${nextSupermodelKey}`
    }).catch(() => null);
    if (!nextModel) {
      break;
    }
    visited.add(nextSupermodelKey);
    chainModels.push(nextModel);
    currentModel = nextModel;
    currentModelUrl = nextModelUrl;
  }

  return chainModels;
}

function selectCreatureAnimationPlaybackClips(
  clips: readonly THREE.AnimationClip[],
  requestedAnimationName?: string | null,
  options: {
    autoIdleOnly?: boolean;
    allowNonIdleFallback?: boolean;
    loopModeOverride?: "loop" | "once";
  } = {}
): THREE.AnimationClip[] {
  const playableClips = clips
    .filter((clip) => clip instanceof THREE.AnimationClip)
    .map(normalizeCreatureAnimationClipForPlayback);
  const normalizedRequested = requestedAnimationName?.trim().toLowerCase();
  if (normalizedRequested) {
    const requestedClip = playableClips.find(
      (clip) => normalizeCreatureAnimationClipName(clip) === normalizedRequested
    );
    if (requestedClip) {
      return [
        composeCreatureRequestedAnimationClipWithBasePose(
          requestedClip,
          playableClips,
          options.loopModeOverride
        )
      ];
    }
  }
  const idleClips = options.autoIdleOnly
    ? playableClips.filter(isCreatureIdleAnimationClip)
    : [];
  const defaultClips =
    options.autoIdleOnly && idleClips.length > 0
      ? idleClips
      : options.autoIdleOnly && !options.allowNonIdleFallback
        ? []
        : playableClips;
  if (defaultClips.length <= 1) {
    return defaultClips;
  }
  const [selected] = [...defaultClips].sort((left, right) => {
    const priorityDelta =
      resolveCreatureIdleAnimationPriority(left) -
      resolveCreatureIdleAnimationPriority(right);
    if (priorityDelta !== 0) {
      return priorityDelta;
    }
    return left.duration - right.duration;
  });
  return selected ? [selected] : [];
}

function resolveCreatureAnimationBasePoseClipName(
  requestedAnimationName: string
): string | null {
  switch (requestedAnimationName) {
    case "bowshot":
      return "bowrdy";
    case "xbowshot":
      return "xbowrdy";
    default:
      return resolveCreatureSpecificCombatReadyClipName(requestedAnimationName);
  }
}

function resolveCreatureSpecificCombatReadyClipName(
  requestedAnimationName: string
): string | null {
  const creatureCombatMatch = requestedAnimationName.match(
    /^c(?:a\d+)?(?:slash|stab|close|reach|parry)([a-z])?$/iu
  );
  if (!creatureCombatMatch) {
    return null;
  }
  const sideToken = creatureCombatMatch[1]?.toLowerCase();
  const side = sideToken === "l" ? "l" : "r";
  return `cready${side}`;
}

function resolveCreatureAnimationRecoveryPoseClipName(
  requestedAnimationName: string
): string | null {
  switch (requestedAnimationName) {
    case "bowshot":
      return "bowrdy";
    case "xbowshot":
      return "xbowrdy";
    default:
      break;
  }
  const creatureSpecificReady =
    resolveCreatureSpecificCombatReadyClipName(requestedAnimationName);
  if (creatureSpecificReady) {
    return creatureSpecificReady;
  }
  const meleeMatch = requestedAnimationName.match(
    /^(1h|2h|2w|pl|nw)(?:slash|stab|close|reach|parry)([hlro])?$/iu
  );
  if (!meleeMatch) {
    return null;
  }
  const prefix = meleeMatch[1]?.toLowerCase();
  const sideToken = meleeMatch[2]?.toLowerCase();
  const side = sideToken === "l" ? "l" : "r";
  return prefix ? `${prefix}ready${side}` : null;
}

function normalizeCreatureAnimationTrackKey(track: THREE.KeyframeTrack): string {
  return track.name.trim().toLowerCase();
}

function readCreatureAnimationTrackValueAtTime(
  track: THREE.KeyframeTrack,
  timeSeconds: number
): number[] | null {
  const times = Array.from(track.times);
  const valueSize = track.getValueSize();
  if (times.length === 0 || valueSize <= 0) {
    return null;
  }
  const targetTime = Number.isFinite(timeSeconds) ? timeSeconds : 0;
  let selectedIndex = 0;
  for (let index = 0; index < times.length; index += 1) {
    const time = times[index];
    if (typeof time !== "number" || !Number.isFinite(time)) {
      continue;
    }
    if (time <= targetTime) {
      selectedIndex = index;
      continue;
    }
    break;
  }
  const offset = selectedIndex * valueSize;
  return Array.from(track.values.slice(offset, offset + valueSize));
}

function appendCreatureAnimationTrackRecoveryValueKey(
  requestedTrack: THREE.KeyframeTrack,
  recoveryValue: readonly number[],
  requestedDurationSeconds: number,
  recoveryDurationSeconds: number
): THREE.KeyframeTrack | null {
  const valueSize = requestedTrack.getValueSize();
  if (valueSize <= 0 || recoveryValue.length !== valueSize) {
    return null;
  }
  const requestedEndValue = readCreatureAnimationTrackValueAtTime(
    requestedTrack,
    requestedDurationSeconds
  );
  if (!requestedEndValue) {
    return null;
  }
  const recoveryEndSeconds = requestedDurationSeconds + recoveryDurationSeconds;
  const times = Array.from(requestedTrack.times);
  const values = Array.from(requestedTrack.values);
  const lastTime = times[times.length - 1];
  if (
    typeof lastTime !== "number" ||
    !Number.isFinite(lastTime) ||
    Math.abs(lastTime - requestedDurationSeconds) > 0.0001
  ) {
    times.push(requestedDurationSeconds);
    values.push(...requestedEndValue);
  }
  times.push(recoveryEndSeconds);
  values.push(...recoveryValue);
  const TrackConstructor = requestedTrack.constructor as new (
    name: string,
    times: ArrayLike<number>,
    values: ArrayLike<number>,
    interpolation?: THREE.InterpolationModes
  ) => THREE.KeyframeTrack;
  return new TrackConstructor(
    requestedTrack.name,
    times,
    values,
    requestedTrack.getInterpolation()
  );
}

function appendCreatureAnimationRecoveryPoseKey(
  requestedTrack: THREE.KeyframeTrack,
  recoveryTrack: THREE.KeyframeTrack,
  requestedDurationSeconds: number,
  recoveryDurationSeconds: number
): THREE.KeyframeTrack | null {
  const valueSize = requestedTrack.getValueSize();
  if (valueSize <= 0 || recoveryTrack.getValueSize() !== valueSize) {
    return null;
  }
  const recoveryValue = readCreatureAnimationTrackValueAtTime(recoveryTrack, 0);
  if (!recoveryValue) {
    return null;
  }
  return appendCreatureAnimationTrackRecoveryValueKey(
    requestedTrack,
    recoveryValue,
    requestedDurationSeconds,
    recoveryDurationSeconds
  );
}

function appendCreatureAnimationLastFrameRecoveryPoseKey(
  requestedTrack: THREE.KeyframeTrack,
  requestedDurationSeconds: number,
  recoveryDurationSeconds: number
): THREE.KeyframeTrack | null {
  const recoveryValue = readCreatureAnimationTrackValueAtTime(
    requestedTrack,
    requestedDurationSeconds
  );
  if (!recoveryValue) {
    return null;
  }
  return appendCreatureAnimationTrackRecoveryValueKey(
    requestedTrack,
    recoveryValue,
    requestedDurationSeconds,
    recoveryDurationSeconds
  );
}

function composeCreatureRequestedAnimationClipWithRecoveryPose(
  requestedClip: THREE.AnimationClip,
  playableClips: readonly THREE.AnimationClip[],
  loopModeOverride?: "loop" | "once"
): THREE.AnimationClip {
  const loopMode = loopModeOverride ?? "loop";
  const requestedClipName = normalizeCreatureAnimationClipName(requestedClip);
  const recoveryPoseClipName =
    resolveCreatureAnimationRecoveryPoseClipName(requestedClipName);
  if (!recoveryPoseClipName) {
    return loopModeOverride
      ? cloneCreatureAnimationClipWithAdditionalUserData(requestedClip, {
          auroraMdlSourceAnimationLoopMode: loopMode
        })
      : requestedClip;
  }
  const recoveryClip = playableClips.find(
    (clip) => normalizeCreatureAnimationClipName(clip) === recoveryPoseClipName
  );
  if (!Number.isFinite(requestedClip.duration) || requestedClip.duration <= 0) {
    return cloneCreatureAnimationClipWithAdditionalUserData(requestedClip, {
      auroraMdlSourceAnimationLoopMode: loopMode,
      ...(loopMode === "loop"
        ? {
            creatureAnimationPreviewLoop: true,
            creatureAnimationPreviewLoopSource: "creatures-mode-selected-attack"
          }
        : {}),
      creatureAnimationRecoveryPoseClipNameCandidate: recoveryPoseClipName,
      creatureAnimationRecoveryPoseSkippedReason: "invalid-requested-clip-duration"
    });
  }
  const recoveryDurationSeconds = Math.min(
    0.25,
    Math.max(0.12, requestedClip.duration * 0.18)
  );
  if (!recoveryClip) {
    let fallbackRecoveredTrackCount = 0;
    const fallbackRecoveredTracks = requestedClip.tracks.map((track) => {
      const recoveredTrack = appendCreatureAnimationLastFrameRecoveryPoseKey(
        track,
        requestedClip.duration,
        recoveryDurationSeconds
      );
      if (!recoveredTrack) {
        return track.clone();
      }
      fallbackRecoveredTrackCount += 1;
      return recoveredTrack;
    });
    if (fallbackRecoveredTrackCount === 0) {
      return cloneCreatureAnimationClipWithAdditionalUserData(requestedClip, {
        auroraMdlSourceAnimationLoopMode: loopMode,
        ...(loopMode === "loop"
          ? {
              creatureAnimationPreviewLoop: true,
              creatureAnimationPreviewLoopSource: "creatures-mode-selected-attack"
            }
          : {}),
        creatureAnimationRecoveryPoseClipNameCandidate: recoveryPoseClipName,
        creatureAnimationRecoveryPoseSkippedReason:
          "missing-recovery-pose-clip-no-compatible-tracks"
      });
    }
    const fallbackClip = new THREE.AnimationClip(
      requestedClip.name,
      requestedClip.duration + recoveryDurationSeconds,
      fallbackRecoveredTracks,
      requestedClip.blendMode
    );
    fallbackClip.userData = {
      ...requestedClip.userData,
      auroraMdlSourceAnimationLoopMode: loopMode,
      ...(loopMode === "loop"
        ? {
            creatureAnimationPreviewLoop: true,
            creatureAnimationPreviewLoopSource: "creatures-mode-selected-attack"
          }
        : {}),
      creatureAnimationRecoveryPose: true,
      creatureAnimationRecoveryPoseFallback: "last-frame-hold",
      creatureAnimationRecoveryPoseFallbackReason: "missing-recovery-pose-clip",
      creatureAnimationRecoveryPoseClipNameCandidate: recoveryPoseClipName,
      creatureAnimationRecoveryPoseDurationSeconds: recoveryDurationSeconds,
      creatureAnimationRecoveryPoseTrackCount: fallbackRecoveredTrackCount,
      creatureAnimationOriginalDurationSeconds: requestedClip.duration
    };
    return fallbackClip;
  }
  const recoveryTracksByKey = new Map(
    recoveryClip.tracks.map((track) => [
      normalizeCreatureAnimationTrackKey(track),
      track
    ])
  );
  let recoveredTrackCount = 0;
  const recoveredTracks = requestedClip.tracks.map((track) => {
    const recoveryTrack = recoveryTracksByKey.get(normalizeCreatureAnimationTrackKey(track));
    if (!recoveryTrack) {
      return track.clone();
    }
    const recoveredTrack = appendCreatureAnimationRecoveryPoseKey(
      track,
      recoveryTrack,
      requestedClip.duration,
      recoveryDurationSeconds
    );
    if (!recoveredTrack) {
      return track.clone();
    }
    recoveredTrackCount += 1;
    return recoveredTrack;
  });
  if (recoveredTrackCount === 0) {
    return cloneCreatureAnimationClipWithAdditionalUserData(requestedClip, {
      auroraMdlSourceAnimationLoopMode: loopMode,
      ...(loopMode === "loop"
        ? {
            creatureAnimationPreviewLoop: true,
            creatureAnimationPreviewLoopSource: "creatures-mode-selected-attack"
          }
        : {}),
      creatureAnimationRecoveryPoseClipNameCandidate: recoveryClip.name,
      creatureAnimationRecoveryPoseSkippedReason: "no-compatible-recovery-tracks"
    });
  }
  const compositeClip = new THREE.AnimationClip(
    requestedClip.name,
    requestedClip.duration + recoveryDurationSeconds,
    recoveredTracks,
    requestedClip.blendMode
  );
  compositeClip.userData = {
    ...requestedClip.userData,
    auroraMdlSourceAnimationLoopMode: loopMode,
    ...(loopMode === "loop"
      ? {
          creatureAnimationPreviewLoop: true,
          creatureAnimationPreviewLoopSource: "creatures-mode-selected-attack"
        }
      : {}),
    creatureAnimationRecoveryPose: true,
    creatureAnimationRecoveryPoseClipName: recoveryClip.name,
    creatureAnimationRecoveryPoseDurationSeconds: recoveryDurationSeconds,
    creatureAnimationRecoveryPoseTrackCount: recoveredTrackCount,
    creatureAnimationOriginalDurationSeconds: requestedClip.duration
  };
  return compositeClip;
}

function composeCreatureRequestedAnimationClipWithBasePose(
  requestedClip: THREE.AnimationClip,
  playableClips: readonly THREE.AnimationClip[],
  loopModeOverride?: "loop" | "once"
): THREE.AnimationClip {
  const requestedClipName = normalizeCreatureAnimationClipName(requestedClip);
  const basePoseClipName = resolveCreatureAnimationBasePoseClipName(requestedClipName);
  const requestedClipWithRecovery = composeCreatureRequestedAnimationClipWithRecoveryPose(
    requestedClip,
    playableClips,
    loopModeOverride
  );
  if (!basePoseClipName) {
    return requestedClipWithRecovery;
  }
  const basePoseClip = playableClips.find(
    (clip) => normalizeCreatureAnimationClipName(clip) === basePoseClipName
  );
  if (!basePoseClip) {
    return cloneCreatureAnimationClipWithAdditionalUserData(
      requestedClipWithRecovery,
      {
        creatureAnimationCompositeBasePoseSkippedReason: "missing-base-pose-clip",
        creatureAnimationCompositeBaseClipNameCandidate: basePoseClipName,
        creatureAnimationCompositeRequestedTrackCount:
          requestedClipWithRecovery.tracks.length
      }
    );
  }
  const requestedTrackKeys = new Set(
    requestedClipWithRecovery.tracks.map(normalizeCreatureAnimationTrackKey)
  );
  const baseTracks = basePoseClip.tracks
    .filter((track) => !requestedTrackKeys.has(normalizeCreatureAnimationTrackKey(track)))
    .map((track) => track.clone());
  if (baseTracks.length === 0) {
    return cloneCreatureAnimationClipWithAdditionalUserData(
      requestedClipWithRecovery,
      {
        creatureAnimationCompositeBasePoseSkippedReason: "base-tracks-already-covered",
        creatureAnimationCompositeBaseClipNameCandidate: basePoseClip.name,
        creatureAnimationCompositeBaseTrackCount: 0,
        creatureAnimationCompositeRequestedTrackCount:
          requestedClipWithRecovery.tracks.length
      }
    );
  }
  const compositeClip = new THREE.AnimationClip(
    requestedClipWithRecovery.name,
    requestedClipWithRecovery.duration,
    [...baseTracks, ...requestedClipWithRecovery.tracks.map((track) => track.clone())],
    requestedClipWithRecovery.blendMode
  );
  compositeClip.userData = {
    ...requestedClipWithRecovery.userData,
    creatureAnimationCompositeBasePose: true,
    creatureAnimationCompositeBaseClipName: basePoseClip.name,
    creatureAnimationCompositeBaseTrackCount: baseTracks.length,
    creatureAnimationCompositeRequestedTrackCount: requestedClipWithRecovery.tracks.length
  };
  return compositeClip;
}

function resolveCreatureAnimationTrackNodeName(trackName: string): string | null {
  const propertySeparatorIndex = trackName.lastIndexOf(".");
  if (propertySeparatorIndex <= 0) {
    return null;
  }
  const rawNodeName = trackName.slice(0, propertySeparatorIndex).trim();
  const normalizedNodeName = rawNodeName.replace(/^\./u, "").trim();
  return normalizedNodeName.length > 0 ? normalizedNodeName : null;
}

function resolveCreatureAnimationTrackBindingNodeName(
  trackName: string
): string | null {
  try {
    const parsed = THREE.PropertyBinding.parseTrackName(trackName) as {
      nodeName?: string;
    };
    const nodeName = parsed.nodeName?.trim();
    if (nodeName) {
      return nodeName;
    }
  } catch {
    // Fall back to the simpler source-MDL track parser below.
  }
  return resolveCreatureAnimationTrackNodeName(trackName);
}

function collectCreatureAnimationClipTargetNames(
  clip: THREE.AnimationClip
): string[] {
  const targetNames = new Set<string>();
  clip.tracks.forEach((track) => {
    const nodeName = resolveCreatureAnimationTrackBindingNodeName(track.name);
    if (nodeName) {
      targetNames.add(nodeName);
    }
  });
  return Array.from(targetNames).sort((left, right) => left.localeCompare(right));
}

interface CreatureEquipmentSourceAnimationDuplicateTargetExpansion {
  clip: THREE.AnimationClip;
  expandedTrackCount: number;
  expandedTargetCount: number;
  duplicateTargetNames: string[];
}

function cloneCreatureAnimationTrackWithName(
  track: THREE.KeyframeTrack,
  name: string
): THREE.KeyframeTrack {
  const clonedTrack = track.clone();
  clonedTrack.name = name;
  return clonedTrack;
}

function expandCreatureEquipmentSourceAnimationDuplicateTargets(
  clip: THREE.AnimationClip,
  playbackRoot: THREE.Object3D
): CreatureEquipmentSourceAnimationDuplicateTargetExpansion {
  let expandedTrackCount = 0;
  let expandedTargetCount = 0;
  const duplicateTargetNames = new Set<string>();
  const expandedTracks: THREE.KeyframeTrack[] = [];

  clip.tracks.forEach((track) => {
    const propertySeparatorIndex = track.name.indexOf(".");
    const targetNodeName = resolveCreatureAnimationTrackBindingNodeName(track.name);
    if (propertySeparatorIndex <= 0 || !targetNodeName) {
      expandedTracks.push(track);
      return;
    }

    const targetNodes = findCreatureRuntimeNodesByNormalizedName(
      playbackRoot,
      targetNodeName
    );
    if (targetNodes.length <= 1) {
      expandedTracks.push(track);
      return;
    }

    const propertyPath = track.name.slice(propertySeparatorIndex);
    targetNodes.forEach((targetNode) => {
      expandedTracks.push(
        cloneCreatureAnimationTrackWithName(track, `${targetNode.uuid}${propertyPath}`)
      );
    });
    expandedTrackCount += 1;
    expandedTargetCount += targetNodes.length;
    duplicateTargetNames.add(targetNodeName);
  });

  if (expandedTrackCount === 0) {
    return {
      clip,
      expandedTrackCount: 0,
      expandedTargetCount: 0,
      duplicateTargetNames: []
    };
  }

  const expandedClip = new THREE.AnimationClip(
    clip.name,
    clip.duration,
    expandedTracks,
    clip.blendMode
  );
  expandedClip.userData = {
    ...clip.userData,
    creatureEquipmentSourceAnimationDuplicateTargetExpansion: true,
    creatureEquipmentSourceAnimationDuplicateTargetExpandedTrackCount:
      expandedTrackCount,
    creatureEquipmentSourceAnimationDuplicateTargetExpandedTargetCount:
      expandedTargetCount,
    creatureEquipmentSourceAnimationDuplicateTargetNames:
      Array.from(duplicateTargetNames)
  };
  return {
    clip: expandedClip,
    expandedTrackCount,
    expandedTargetCount,
    duplicateTargetNames: Array.from(duplicateTargetNames)
  };
}

function filterCreatureAnimationClipsForExistingPlaybackNodes(
  clips: readonly THREE.AnimationClip[],
  playbackRoot: THREE.Object3D
): { clips: THREE.AnimationClip[]; suppressedTrackNames: string[] } {
  const suppressedTrackNames = new Set<string>();
  const filteredClips = clips.map((clip) => {
    const filteredTracks = clip.tracks.filter((track) => {
      const targetNodeName = resolveCreatureAnimationTrackBindingNodeName(track.name);
      if (!targetNodeName) {
        return true;
      }
      if (THREE.PropertyBinding.findNode(playbackRoot, targetNodeName)) {
        return true;
      }
      suppressedTrackNames.add(track.name);
      return false;
    });
    if (filteredTracks.length === clip.tracks.length) {
      return clip;
    }
    const filteredClip = new THREE.AnimationClip(
      clip.name,
      clip.duration,
      filteredTracks,
      clip.blendMode
    );
    filteredClip.userData = {
      ...clip.userData,
      creatureAnimationMissingTargetTracksSuppressed: true,
      creatureAnimationSuppressedMissingTargetTrackNames:
        clip.tracks.length === filteredTracks.length
          ? []
          : clip.tracks
              .filter((track) => !filteredTracks.includes(track))
              .map((track) => track.name)
    };
    return filteredClip;
  });
  return {
    clips: filteredClips,
    suppressedTrackNames: Array.from(suppressedTrackNames)
  };
}

function collectCreatureAnimationTracksTargetingNodes(
  clips: readonly THREE.AnimationClip[],
  nodeNames: readonly string[]
): string[] {
  if (clips.length === 0 || nodeNames.length === 0) {
    return [];
  }
  const targetNodeKeys = new Set(nodeNames.map((name) => name.toLowerCase()));
  const matchingTrackNames = new Set<string>();
  clips.forEach((clip) => {
    clip.tracks.forEach((track) => {
      const nodeName = resolveCreatureAnimationTrackNodeName(track.name);
      if (nodeName && targetNodeKeys.has(nodeName.toLowerCase())) {
        matchingTrackNames.add(track.name);
      }
    });
  });
  return Array.from(matchingTrackNames);
}

function collectCreatureAnimationTracksTargetingRenderableRebasedGeometry(
  clips: readonly THREE.AnimationClip[],
  summary: CreatureLoadedModelFeatureSummary
): string[] {
  if (
    clips.length === 0 ||
    summary.sourceHierarchyRebasedGeometryNodeNames.length === 0
  ) {
    return [];
  }
  const rebasedGeometryKeys = new Set(
    summary.sourceHierarchyRebasedGeometryNodeNames.map((name) => name.toLowerCase())
  );
  const suppressedMeshKeys = new Set(
    summary.renderSuppressedMeshNames.map((name) => name.toLowerCase())
  );
  const visibleTrackNames = new Set<string>();
  clips.forEach((clip) => {
    clip.tracks.forEach((track) => {
      const nodeName = resolveCreatureAnimationTrackNodeName(track.name);
      if (
        nodeName &&
        rebasedGeometryKeys.has(nodeName.toLowerCase()) &&
        !suppressedMeshKeys.has(nodeName.toLowerCase())
      ) {
        visibleTrackNames.add(track.name);
      }
    });
  });
  return Array.from(visibleTrackNames);
}

function canPlayRebasedDirectAnimationViaSourceSkinning(
  summary: CreatureLoadedModelFeatureSummary,
  trackNames: readonly string[]
): boolean {
  if (
    trackNames.length === 0 ||
    summary.sourceSkinMeshCount <= 0 ||
    summary.sourceSkinInfluencingBoneNames.length === 0
  ) {
    return false;
  }
  const influencingBoneKeys = new Set(
    summary.sourceSkinInfluencingBoneNames.map((name) => name.toLowerCase())
  );
  const suppressedMeshKeys = new Set(
    summary.renderSuppressedMeshNames.map((name) => name.toLowerCase())
  );
  return trackNames.every((trackName) => {
    const nodeName = resolveCreatureAnimationTrackNodeName(trackName)?.toLowerCase();
    return Boolean(
      nodeName &&
        (influencingBoneKeys.has(nodeName) || suppressedMeshKeys.has(nodeName))
    );
  });
}

function canPlayRetargetedSourceSkinningWithHiddenCompanionGeometry(
  summary: CreatureLoadedModelFeatureSummary,
  sourceSkinMeshTrackNames: readonly string[]
): boolean {
  if (sourceSkinMeshTrackNames.length > 0) {
    return false;
  }
  if (summary.sourceHierarchyRebasedGeometryNodeNames.length === 0) {
    return false;
  }
  const suppressedMeshKeys = new Set(
    summary.declaredRenderSuppressedMeshNames.map((name) => name.toLowerCase())
  );
  return summary.sourceHierarchyRebasedGeometryNodeNames.every((name) =>
    suppressedMeshKeys.has(name.toLowerCase())
  );
}

const CREATURE_VISIBLE_SOURCE_BODY_PART_NODE_NAMES = new Set([
  "head_g",
  "lfoot_g",
  "lhand_g",
  "rfoot_g",
  "rhand_g"
]);

function canPlayRetargetedSourceSkinningWithVisibleBodyPartGeometry(
  summary: CreatureLoadedModelFeatureSummary,
  sourceSkinMeshTrackNames: readonly string[]
): boolean {
  if (sourceSkinMeshTrackNames.length > 0) {
    return false;
  }
  if (summary.sourceHierarchyRebasedGeometryNodeNames.length === 0) {
    return false;
  }
  return summary.sourceHierarchyRebasedGeometryNodeNames.every((name) =>
    CREATURE_VISIBLE_SOURCE_BODY_PART_NODE_NAMES.has(name.toLowerCase())
  );
}

function canPlayRetargetedSourceSkinningWithPreservedSourceHierarchy(
  summary: CreatureLoadedModelFeatureSummary,
  sourceSkinMeshTrackNames: readonly string[],
  renderableRebasedGeometryTrackNames: readonly string[]
): boolean {
  if (sourceSkinMeshTrackNames.length > 0) {
    return false;
  }
  if ((summary.sourceHierarchyReparentedNodeCount ?? 0) <= 0) {
    return false;
  }
  return renderableRebasedGeometryTrackNames.length === 0;
}

const CREATURE_ROOT_MOTION_POSITION_SPAN_EPSILON = 0.001;

function resolveCreatureVectorTrackHorizontalSpan(track: THREE.KeyframeTrack): number {
  if (!(track instanceof THREE.VectorKeyframeTrack)) {
    return 0;
  }
  const values = track.values;
  if (values.length < 6) {
    return 0;
  }
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (let offset = 0; offset + 2 < values.length; offset += 3) {
    const x = Number(values[offset] ?? 0);
    const z = Number(values[offset + 2] ?? 0);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  }
  return Math.max(maxX - minX, maxZ - minZ);
}

function resolveCreatureSourceSkinningRootMotionNodeNames(
  summary: CreatureLoadedModelFeatureSummary,
  clips: readonly THREE.AnimationClip[]
): string[] {
  const trackNames = clips.flatMap((clip) => clip.tracks.map((track) => track.name));
  const positionTrackNodeKeys = new Set(
    trackNames
      .filter((trackName) => /\.position$/u.test(trackName))
      .map(resolveCreatureAnimationTrackNodeName)
      .filter((nodeName): nodeName is string => Boolean(nodeName))
      .map((nodeName) => nodeName.toLowerCase())
  );
  if (positionTrackNodeKeys.size === 0) {
    return [];
  }
  const influencingBoneKeys = new Set(
    summary.sourceSkinInfluencingBoneNames.map((name) => name.toLowerCase())
  );
  const rootMotionNodeName = summary.renderSuppressedMeshNames.find((name) => {
    const key = name.toLowerCase();
    return positionTrackNodeKeys.has(key) && influencingBoneKeys.has(key);
  });
  if (rootMotionNodeName) {
    return [rootMotionNodeName];
  }
  const dynamicInfluencingBoneTrack = clips
    .flatMap((clip) => clip.tracks)
    .filter((track) => /\.position$/u.test(track.name))
    .map((track) => {
      const nodeName = resolveCreatureAnimationTrackNodeName(track.name);
      return {
        nodeName,
        span: nodeName && influencingBoneKeys.has(nodeName.toLowerCase())
          ? resolveCreatureVectorTrackHorizontalSpan(track)
          : 0
      };
    })
    .filter((entry): entry is { nodeName: string; span: number } =>
      Boolean(entry.nodeName) && entry.span > CREATURE_ROOT_MOTION_POSITION_SPAN_EPSILON
    )
    .sort((left, right) => right.span - left.span)[0];
  return dynamicInfluencingBoneTrack ? [dynamicInfluencingBoneTrack.nodeName] : [];
}

function resolveCreatureRebasedGeometryRootMotionNodeNames(
  summary: CreatureLoadedModelFeatureSummary,
  trackNames: readonly string[]
): string[] {
  if (summary.sourceHierarchyRebasedGeometryNodeNames.length === 0) {
    return [];
  }
  const rebasedGeometryNodeKeys = new Set(
    summary.sourceHierarchyRebasedGeometryNodeNames.map((name) => name.toLowerCase())
  );
  const rootMotionNodeNames = new Set<string>();
  trackNames
    .filter((trackName) => /\.position$/u.test(trackName))
    .forEach((trackName) => {
      const nodeName = resolveCreatureAnimationTrackNodeName(trackName);
      if (nodeName && rebasedGeometryNodeKeys.has(nodeName.toLowerCase())) {
        rootMotionNodeNames.add(nodeName);
      }
    });
  return Array.from(rootMotionNodeNames);
}

function neutralizeCreatureSourceSkinningRootMotionTrack(
  track: THREE.KeyframeTrack
): THREE.KeyframeTrack {
  const cloned = track.clone();
  if (!(cloned instanceof THREE.VectorKeyframeTrack)) {
    return cloned;
  }
  const values = cloned.values;
  if (values.length < 3) {
    return cloned;
  }
  const anchorX = Number(values[0] ?? 0);
  const anchorZ = Number(values[2] ?? 0);
  for (let offset = 0; offset + 2 < values.length; offset += 3) {
    values[offset] = anchorX;
    values[offset + 2] = anchorZ;
  }
  return cloned;
}

function cloneCreatureAnimationClipWithSourceSkinningRootMotionNeutralized(
  clip: THREE.AnimationClip,
  rootMotionNodeNames: readonly string[]
): THREE.AnimationClip {
  if (rootMotionNodeNames.length === 0) {
    return clip;
  }
  const rootMotionNodeKeys = new Set(rootMotionNodeNames.map((name) => name.toLowerCase()));
  let neutralizedTrackCount = 0;
  const tracks = clip.tracks.map((track) => {
    const nodeName = resolveCreatureAnimationTrackNodeName(track.name)?.toLowerCase();
    if (
      nodeName &&
      rootMotionNodeKeys.has(nodeName) &&
      /\.position$/u.test(track.name)
    ) {
      neutralizedTrackCount += 1;
      return neutralizeCreatureSourceSkinningRootMotionTrack(track);
    }
    return track.clone();
  });
  if (neutralizedTrackCount === 0) {
    return clip;
  }
  const clonedClip = new THREE.AnimationClip(clip.name, clip.duration, tracks);
  clonedClip.blendMode = clip.blendMode;
  clonedClip.userData = {
    ...clip.userData,
    auroraSourceSkinningRootMotionNeutralized: true,
    auroraSourceSkinningRootMotionNeutralizedNodeNames: rootMotionNodeNames,
    auroraSourceSkinningRootMotionNeutralizedTrackCount: neutralizedTrackCount
  };
  return clonedClip;
}

function cloneCreatureAnimationClipsWithSourceSkinningRootMotionNeutralized(
  clips: readonly THREE.AnimationClip[],
  rootMotionNodeNames: readonly string[]
): THREE.AnimationClip[] {
  if (rootMotionNodeNames.length === 0) {
    return [...clips];
  }
  return clips.map((clip) =>
    cloneCreatureAnimationClipWithSourceSkinningRootMotionNeutralized(
      clip,
      rootMotionNodeNames
    )
  );
}

function resolveCreatureSelectedAnimationName(object: SceneObject): string | null {
  if (object.kind !== "creatures") {
    return null;
  }
  return normalizeCreatureRequestedAnimationName(
    object.creatureProperties?.advancedSettings?.animationName
  );
}

function shouldRenderCreatureRuntimeAmmunitionVisual(
  animationName: string | null
): boolean {
  return animationName === "bowshot" || animationName === "xbowshot";
}

function invokeCreatureRuntimeEquipmentVisualUpdate(
  target: THREE.Object3D,
  deltaSeconds?: number,
  elapsedSeconds?: number,
  animationTimeSeconds?: number,
  animationCompleted?: boolean
): void {
  const updater = target.userData?.creatureRuntimeEquipmentVisualUpdate;
  if (typeof updater === "function") {
    updater(deltaSeconds, elapsedSeconds, animationTimeSeconds, animationCompleted);
  }
}

function resolveCreatureRequestedAnimationState(object: SceneObject): number | null {
  if (object.kind !== "creatures") {
    return null;
  }
  const value = object.creatureProperties?.advancedSettings?.animationState;
  return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : null;
}

function buildCreatureAnimationStateMappingUserData(
  object: SceneObject,
  explicitAnimationName: string | null,
  stateResolution: CreatureAnimationStateClipResolution | null
): Record<string, unknown> {
  const animationState = resolveCreatureRequestedAnimationState(object);
  if (animationState === null) {
    return {
      creatureAnimationStateMappingStatus: "not-provided",
      creatureAnimationStateMappingSource: "scene-object"
    };
  }
  return {
    creatureAnimationState: animationState,
    creatureAnimationStateMappingSource: "scene-object",
    creatureAnimationStateMappingStatus: explicitAnimationName
      ? "overridden-by-animation-name"
      : stateResolution?.matchedClipName
        ? "state-mapped"
        : stateResolution?.candidateClipNames.length
          ? "state-clip-unavailable"
          : "unmapped",
    ...(explicitAnimationName
      ? { creatureAnimationStateMappingOverrideClipName: explicitAnimationName }
      : {}),
    ...(stateResolution?.label ? { creatureAnimationStateMappingLabel: stateResolution.label } : {}),
    ...(stateResolution?.candidateClipNames.length
      ? { creatureAnimationStateMappingCandidateClipNames: stateResolution.candidateClipNames }
      : {}),
    ...(stateResolution?.matchedClipName
      ? { creatureAnimationStateMappedClipName: stateResolution.matchedClipName }
      : {})
  };
}

function applyCreatureAnimationPlaybackToModel(
  runtime: RuntimeState,
  object: SceneObject,
  root: THREE.Object3D,
  preloadedClips?: readonly THREE.AnimationClip[],
  options: {
    autoSelectDefaultClip?: boolean;
    autoPlayExplicitClip?: boolean;
    autoPlayDefaultClip?: boolean;
    autoSelectIdleOnly?: boolean;
    allowNonIdleDefaultFallback?: boolean;
    playbackRoot?: THREE.Object3D | null;
    applyInitialPose?: boolean;
    defaultPlaybackClips?: readonly THREE.AnimationClip[];
    mirrorUserDataTargets?: readonly THREE.Object3D[];
    enableSourceGeometryRuntimeEffects?: boolean;
  } = {}
): Record<string, unknown> | null {
  if (object.kind !== "creatures") {
    return null;
  }
  const clips = preloadedClips ?? collectCreatureLoadedModelAnimationClips(root);
  const playbackRoot = options.playbackRoot ?? root;
  const enableSourceGeometryRuntimeEffects =
    options.enableSourceGeometryRuntimeEffects !== false;
  const sourceSkinning = enableSourceGeometryRuntimeEffects
    ? createAuroraSourceSkinningRuntime(root)
    : null;
  const sourceAnimmesh = enableSourceGeometryRuntimeEffects
    ? createAuroraSourceAnimmeshRuntime(root, clips)
    : null;
  const sourceDanglymesh = enableSourceGeometryRuntimeEffects
    ? createAuroraSourceDanglymeshRuntime(root, clips)
    : null;
  const sourceAlpha = createAuroraSourceAlphaRuntime(root, clips);
  const sourceSelfIllum = createAuroraSourceSelfIllumColorRuntime(root, clips);
  const textureCycle = registerRuntimeAuroraTextureCyclePlayback(
    runtime,
    object.id,
    root
  );
  const sourceLight = createCreatureAuroraSourceLightRuntime(root);
  const explicitAnimationName = resolveCreatureSelectedAnimationName(object);
  const animationState = resolveCreatureRequestedAnimationState(object);
  const stateResolution =
    animationState === null
      ? null
      : resolveCreatureAnimationStateClip(
          animationState,
          clips.map((clip) => clip.name)
        );
  const requestedAnimationName = explicitAnimationName ?? stateResolution?.matchedClipName ?? null;
  const isKnownAnimationStateClipUnavailable =
    !explicitAnimationName &&
    animationState !== null &&
    Boolean(stateResolution?.candidateClipNames.length) &&
    !stateResolution?.matchedClipName;
  const animationStateMappingUserData = buildCreatureAnimationStateMappingUserData(
    object,
    explicitAnimationName,
    stateResolution
  );
  const normalizedRequestedAnimationName = requestedAnimationName?.toLowerCase() ?? null;
  const requestedAnimationClip = normalizedRequestedAnimationName
    ? clips.find(
        (clip) => normalizeCreatureAnimationClipName(clip) === normalizedRequestedAnimationName
      )
    : undefined;
  const shouldAutoSelectDefaultClip = options.autoSelectDefaultClip !== false;
  const defaultPlaybackClips = options.defaultPlaybackClips ?? clips;
  const playbackSelectionClips = requestedAnimationName ? clips : defaultPlaybackClips;
  const playbackClips =
    requestedAnimationName ||
    (shouldAutoSelectDefaultClip && !isKnownAnimationStateClipUnavailable)
      ? selectCreatureAnimationPlaybackClips(playbackSelectionClips, requestedAnimationName, {
          autoIdleOnly: Boolean(options.autoSelectIdleOnly),
          allowNonIdleFallback: Boolean(options.allowNonIdleDefaultFallback),
          loopModeOverride: explicitAnimationName ? undefined : stateResolution?.loopMode
        })
      : [];
  const stateFollowUpCandidate =
    !explicitAnimationName && stateResolution?.loopMode === "once"
      ? selectCreatureAnimationPlaybackClips(defaultPlaybackClips, null, {
          autoIdleOnly: true,
          allowNonIdleFallback: false
        })[0] ?? null
      : null;
  const shouldAutoplayCreatureAnimation =
    (Boolean(requestedAnimationName) &&
      playbackClips.length > 0 &&
      options.autoPlayExplicitClip !== false) ||
    (!requestedAnimationName &&
      playbackClips.length > 0 &&
      options.autoPlayDefaultClip !== false);
  const playbackTrackFilter = filterCreatureAnimationClipsForExistingPlaybackNodes(
    playbackClips,
    playbackRoot
  );
  const stateFollowUpTrackFilter = stateFollowUpCandidate
    ? filterCreatureAnimationClipsForExistingPlaybackNodes(
        [stateFollowUpCandidate],
        playbackRoot
      )
    : null;
  const stateFollowUpClip = stateFollowUpTrackFilter?.clips[0] ?? null;
  const playbackTrackFilterUserData =
    playbackTrackFilter.suppressedTrackNames.length > 0
      ? {
          creatureAnimationSuppressedMissingTargetTrackCount:
            playbackTrackFilter.suppressedTrackNames.length,
          creatureAnimationSuppressedMissingTargetTrackNames:
            playbackTrackFilter.suppressedTrackNames
        }
      : {};
  const playbackSelectionUserData = {
    ...animationStateMappingUserData,
    creatureAnimationAvailableClipCount: clips.length,
    creatureAnimationAvailableClipNames: clips.map((clip) => clip.name).filter(Boolean),
    creatureAnimationSelectedClipNames: playbackClips
      .map((clip) => clip.name)
      .filter(Boolean),
    creatureAnimationSelectedClipTrackCounts: playbackClips.map(
      (clip) => clip.tracks.length
    ),
    creatureAnimationSelectedClipTargetCounts: playbackClips.map(
      (clip) => collectCreatureAnimationClipTargetNames(clip).length
    ),
    creatureAnimationSelectedClipTargetNames: playbackClips.map((clip) =>
      collectCreatureAnimationClipTargetNames(clip).join(",")
    ),
    creatureAnimationPlayableClipTrackCounts: playbackTrackFilter.clips.map(
      (clip) => clip.tracks.length
    ),
    creatureAnimationPlayableClipTargetCounts: playbackTrackFilter.clips.map(
      (clip) => collectCreatureAnimationClipTargetNames(clip).length
    ),
    creatureAnimationPlayableClipTargetNames: playbackTrackFilter.clips.map((clip) =>
      collectCreatureAnimationClipTargetNames(clip).join(",")
    ),
    ...(stateFollowUpClip
      ? {
          creatureAnimationFollowUpClipName: stateFollowUpClip.name,
          creatureAnimationFollowUpSource: "animation-state-fire-forget-idle"
        }
      : {}),
    creatureAnimationSelectedClipBasePoseNames: playbackClips
      .map((clip) =>
        typeof clip.userData?.creatureAnimationCompositeBaseClipName === "string"
          ? clip.userData.creatureAnimationCompositeBaseClipName
          : ""
      )
      .filter(Boolean),
    creatureAnimationSelectedClipBasePoseSkippedReasons: playbackClips
      .map((clip) =>
        typeof clip.userData?.creatureAnimationCompositeBasePoseSkippedReason === "string"
          ? clip.userData.creatureAnimationCompositeBasePoseSkippedReason
          : ""
      )
      .filter(Boolean),
    creatureAnimationSelectedClipBasePoseCandidateNames: playbackClips
      .map((clip) =>
        typeof clip.userData?.creatureAnimationCompositeBaseClipNameCandidate === "string"
          ? clip.userData.creatureAnimationCompositeBaseClipNameCandidate
          : ""
      )
      .filter(Boolean),
    creatureAnimationSelectedClipBasePoseTrackCounts: playbackClips
      .map((clip) =>
        typeof clip.userData?.creatureAnimationCompositeBaseTrackCount === "number"
          ? clip.userData.creatureAnimationCompositeBaseTrackCount
          : null
      )
      .filter((count): count is number => count !== null),
    creatureAnimationSelectedClipRequestedTrackCounts: playbackClips
      .map((clip) =>
        typeof clip.userData?.creatureAnimationCompositeRequestedTrackCount === "number"
          ? clip.userData.creatureAnimationCompositeRequestedTrackCount
          : null
      )
      .filter((count): count is number => count !== null),
    ...(requestedAnimationName
      ? {
          creatureAnimationRequestedClipName: requestedAnimationName,
          creatureAnimationRequestedClipMatched: Boolean(requestedAnimationClip)
        }
      : {}),
    creatureAnimationSelectionMode:
      explicitAnimationName && requestedAnimationClip
        ? "explicit-name"
        : explicitAnimationName
          ? "explicit-name-missing-fallback"
          : stateResolution?.matchedClipName
            ? "animation-state"
          : playbackClips.length === 0 && clips.length > 0
            ? "rest-pose"
            : clips.length > 1
              ? "single-idle-clip"
              : clips.length === 1
                ? "single-clip"
              : "none"
  };
  const playbackRootUserData = {
    creatureAnimationPlaybackRootName: playbackRoot.name || "",
    creatureAnimationPlaybackRootMode: playbackRoot === root ? "model-root" : "skeleton-root",
    creatureAnimationPlaybackInitialPoseApplied: options.applyInitialPose !== false
  };
  sourceSkinning?.apply();
  sourceAnimmesh?.apply(0, 0);
  sourceDanglymesh?.apply(0, 0);
  sourceAlpha?.apply(0, 0);
  sourceSelfIllum?.apply(0, 0);
  textureCycle?.apply(0, 0);
  sourceLight?.apply(0, 0);
  const sourceSkinningUserData = sourceSkinning
    ? {
        creatureSourceSkinningStatus: "active",
        creatureSourceSkinningMode: "cpu-linear-blend",
        creatureSourceSkinningMeshCount: sourceSkinning.skinMeshCount,
        creatureSourceSkinningMeshNames: sourceSkinning.meshNames,
        creatureSourceSkinningWeightedVertexCount: sourceSkinning.weightedVertexCount,
        creatureSourceSkinningInverseBindPoseCount: sourceSkinning.inverseBindPoseCount,
        creatureSourceSkinningBoneBindingCountsByMesh:
          sourceSkinning.boneBindingCountsByMesh,
        creatureSourceSkinningBindPoseSourcesByMesh:
          sourceSkinning.bindPoseSourcesByMesh,
        creatureSourceSkinningMeshBindPoseSourcesByMesh:
          sourceSkinning.meshBindPoseSourcesByMesh,
        creatureSourceSkinningRuntimeBoundsByMesh:
          sourceSkinning.runtimeBoundsByMesh,
        creatureSourceSkinningRuntimeCentersByMesh:
          sourceSkinning.runtimeCentersByMesh,
        creatureSourceSkinningRuntimeSizesByMesh:
          sourceSkinning.runtimeSizesByMesh,
        creatureSourceSkinningRuntimeVertexSignaturesByMesh:
          sourceSkinning.runtimeVertexSignaturesByMesh,
        creatureSourceSkinningInfluencingBoneNames: sourceSkinning.influencingBoneNames,
        creatureSourceSkinningMissingBoneNames: sourceSkinning.missingBoneNames
      }
    : {};
  const sourceAnimmeshUserData = sourceAnimmesh
    ? {
        creatureAnimmeshStatus: "active",
        creatureAnimmeshMode:
          sourceAnimmesh.vertexMeshCount > 0
            ? "webviewer-animmesh-frames"
            : "webviewer-uv-frames",
        creatureAnimmeshMeshCount: sourceAnimmesh.animmeshCount,
        creatureAnimmeshUvMeshCount: sourceAnimmesh.uvMeshCount,
        creatureAnimmeshVertexMeshCount: sourceAnimmesh.vertexMeshCount,
        creatureAnimmeshNodeNames: sourceAnimmesh.nodeNames,
        creatureAnimmeshAnimationClipNames: sourceAnimmesh.animationClipNames
      }
    : {};
  const sourceDanglymeshUserData = sourceDanglymesh
    ? {
        creatureDanglymeshStatus: "active",
        creatureDanglymeshMode: "webviewer-sine",
        creatureDanglymeshMeshCount: sourceDanglymesh.danglyMeshCount,
        creatureDanglymeshWeightedVertexCount: sourceDanglymesh.weightedVertexCount,
        creatureDanglymeshNodeNames: sourceDanglymesh.nodeNames,
        ...(sourceDanglymesh.animationOverrideClipNames.length > 0
          ? {
              creatureDanglymeshAnimationOverrideClipNames:
                sourceDanglymesh.animationOverrideClipNames,
              creatureDanglymeshAnimationOverrideNodeNames:
                sourceDanglymesh.animationOverrideNodeNames
            }
          : {})
      }
    : {};
  const textureCycleUserData = textureCycle
    ? {
        creatureTextureCycleStatus: "active",
        creatureTextureCycleMode: "webviewer-txi-cycle",
        creatureTextureCycleMaterialCount: textureCycle.materialCount,
        creatureTextureCycleTextureCount: textureCycle.textureCount,
        creatureTextureCycleReferences: textureCycle.references
      }
    : {};
  const sourceAlphaUserData = sourceAlpha
    ? {
        creatureAlphaAnimationStatus: "active",
        creatureAlphaAnimationMode: "webviewer-alphakey",
        creatureAlphaAnimationMeshCount: sourceAlpha.alphaMeshCount,
        creatureAlphaAnimationNodeNames: sourceAlpha.nodeNames,
        creatureAlphaAnimationClipNames: sourceAlpha.animationClipNames
      }
    : {};
  const sourceSelfIllumUserData = sourceSelfIllum
    ? {
        creatureSelfIllumColorAnimationStatus: "active",
        creatureSelfIllumColorAnimationMode: "webviewer-selfillumcolorkey",
        creatureSelfIllumColorAnimationMeshCount: sourceSelfIllum.selfIllumMeshCount,
        creatureSelfIllumColorAnimationNodeNames: sourceSelfIllum.nodeNames,
        creatureSelfIllumColorAnimationClipNames: sourceSelfIllum.animationClipNames
      }
    : {};
  const sourceLightUserData = sourceLight
    ? {
        creatureAuroraLightAnimationStatus: "active",
        creatureAuroraLightAnimationMode: "webviewer-light-keyframes",
        creatureAuroraLightAnimationCount: sourceLight.lightCount,
        creatureAuroraLightAnimatedCount: sourceLight.animatedLightCount,
        creatureAuroraLightAnimatedNodeNames: sourceLight.nodeNames,
        creatureAuroraLightSelectedAnimationNames: sourceLight.animationNames
      }
    : {};
  const sourceGeometryRuntimeEffectsUserData =
    enableSourceGeometryRuntimeEffects
      ? {}
      : {
          creatureSourceGeometryRuntimeEffectsStatus: "disabled",
          creatureSourceGeometryRuntimeEffectsReason: "anchored-part-skeleton-playback"
        };
  const afterUpdate = (
    deltaSeconds?: number,
    elapsedSeconds?: number,
    animationTimeSeconds?: number,
    animationCompleted?: boolean,
    _rendererFrameSerial?: number,
    _rendererDeltaSeconds?: number
  ): void => {
    sourceSkinning?.apply();
    if (sourceSkinning) {
      writeCreaturePartModelRuntimeDetails(
        runtime,
        collectCreatureVisibleMeshRuntimeDiagnostics(root, null)
      );
    }
    sourceAnimmesh?.apply(deltaSeconds, elapsedSeconds);
    sourceDanglymesh?.apply(deltaSeconds, elapsedSeconds);
    sourceAlpha?.apply(deltaSeconds, elapsedSeconds);
    sourceSelfIllum?.apply(deltaSeconds, elapsedSeconds);
    sourceLight?.apply(deltaSeconds, elapsedSeconds);
    invokeCreatureRuntimeEquipmentVisualUpdate(
      root,
      deltaSeconds,
      elapsedSeconds,
      animationTimeSeconds,
      animationCompleted
    );
    if (playbackRoot !== root) {
      invokeCreatureRuntimeEquipmentVisualUpdate(
        playbackRoot,
        deltaSeconds,
        elapsedSeconds,
        animationTimeSeconds,
        animationCompleted
      );
    }
    options.mirrorUserDataTargets?.forEach((target) =>
      invokeCreatureRuntimeEquipmentVisualUpdate(
        target,
        deltaSeconds,
        elapsedSeconds,
        animationTimeSeconds,
        animationCompleted
      )
    );
  };
  root.userData = {
    ...root.userData,
    ...playbackSelectionUserData,
    ...playbackTrackFilterUserData,
    ...playbackRootUserData
  };
  if (playbackRoot !== root) {
    playbackRoot.userData = {
      ...playbackRoot.userData,
      ...playbackSelectionUserData,
      ...playbackTrackFilterUserData,
      ...playbackRootUserData
    };
  }
  const playback = registerRuntimeObjectAnimationPlayback(
    runtime,
    object.id,
    playbackRoot,
    playbackTrackFilter.clips,
    {
      afterUpdate,
      autoplay: shouldAutoplayCreatureAnimation,
      applyInitialPose: options.applyInitialPose !== false,
      followUpClip: stateFollowUpClip,
      mirrorUserDataTargets: [
        ...(playbackRoot !== root ? [root] : []),
        ...(options.mirrorUserDataTargets ?? [])
      ]
    }
  );
  if (!playback) {
    const playbackStatus =
      playbackClips.length === 0 && clips.length > 0
        ? "rest-pose"
        : clips.length > 0
          ? "unavailable"
          : "no-clips";
    return {
      creatureAnimationPlaybackStatus: playbackStatus,
      creatureAnimationPlaybackClipCount: playbackClips.length,
      creatureAnimationPlaybackActionNames: [],
      ...playbackSelectionUserData,
      ...playbackTrackFilterUserData,
      ...playbackRootUserData,
      ...sourceGeometryRuntimeEffectsUserData,
      ...sourceSkinningUserData,
      ...sourceAnimmeshUserData,
      ...sourceDanglymeshUserData,
      ...sourceAlphaUserData,
      ...sourceSelfIllumUserData,
      ...textureCycleUserData,
      ...sourceLightUserData
    };
  }
  return {
    creatureAnimationPlaybackStatus:
      isKnownAnimationStateClipUnavailable
        ? "rest-pose"
        : playback.clipCount > 0
        ? playback.autoplay
          ? "playing"
          : "paused"
        : "runtime-effects",
    creatureAnimationPlaybackMode:
      playback.clipCount > 0 ? "three-animation-mixer" : "three-runtime-effects",
    creatureAnimationPlaybackClipCount: playback.clipCount,
    creatureAnimationPlaybackActionNames: playback.actionNames,
    ...buildRuntimeObjectAnimationRunUserData(playback),
    ...playbackSelectionUserData,
    ...playbackTrackFilterUserData,
    ...playbackRootUserData,
    ...sourceGeometryRuntimeEffectsUserData,
    ...sourceSkinningUserData,
    ...sourceAnimmeshUserData,
    ...sourceDanglymeshUserData,
    ...sourceAlphaUserData,
    ...sourceSelfIllumUserData,
    ...textureCycleUserData,
    ...sourceLightUserData
  };
}

function buildCreatureRenderModelUserData(
  resolution: CreatureRenderModelResolution | null
): Record<string, unknown> {
  if (!resolution) {
    return {
      creatureRenderModelStatus: "not-applicable",
      creatureRenderModelReady: false,
      creatureRenderModelUrl: "",
      creatureRenderModelCacheKey: "",
      creatureRenderModelFallbackReason: ""
    };
  }
  return {
    creatureRenderModelStatus: resolution.status ?? "",
    creatureRenderModelReady: resolution.ready,
    creatureRenderModelUrl: resolution.modelUrl ?? "",
    creatureRenderModelCacheKey: resolution.modelCacheKey ?? "",
    creatureRenderModelFallbackReason: resolution.fallbackReason ?? ""
  };
}

function buildCreaturePartModelGroupUserData(
  resolutions: CreatureRenderPartModelResolution[]
): Record<string, unknown> {
  return {
    creaturePartModelGroupStatus:
      resolutions.length > 0 ? "part-model-urls-ready" : "not-applicable",
    creaturePartModelGroupReady: resolutions.length > 0,
    creaturePartModelGroupCount: resolutions.length,
    creaturePartModelGroupSlots: resolutions.map((entry) => entry.slot),
    creaturePartModelGroupUrls: resolutions.map((entry) => entry.modelUrl),
    creaturePartModelGroupCacheKeys: resolutions.map((entry) => entry.modelCacheKey)
  };
}

function buildCreatureEquipmentModelPartGroupUserData(
  resolutions: CreatureRenderEquipmentModelPartResolution[]
): Record<string, unknown> {
  return {
    creatureEquipmentModelPartLoadStatus:
      resolutions.length > 0 ? "model-part-urls-ready" : "not-applicable",
    creatureEquipmentModelPartReady: resolutions.length > 0,
    creatureEquipmentModelPartCount: resolutions.length,
    creatureEquipmentModelPartResRefs: resolutions.map((entry) => entry.partResref),
    creatureEquipmentModelPartEquipmentResRefs: resolutions.map(
      (entry) => entry.equipmentResref
    ),
    creatureEquipmentModelPartAttachmentTargets: resolutions.map(
      (entry) => entry.attachmentTarget
    ),
    creatureEquipmentModelPartUrls: resolutions.map((entry) => entry.modelUrl),
    creatureEquipmentModelPartCacheKeys: resolutions.map((entry) => entry.modelCacheKey)
  };
}

function buildCreatureSkeletonModelUserData(
  resolution: CreatureRenderSkeletonModelResolution | null
): Record<string, unknown> {
  if (!resolution) {
    return {
      creatureSkeletonModelReady: false,
      creatureSkeletonModelStatus: "not-applicable",
      creatureSkeletonModelUrl: "",
      creatureSkeletonModelCacheKey: "",
      creatureSkeletonModelResRef: "",
      creatureSkeletonModelAssetId: ""
    };
  }
  return {
    creatureSkeletonModelReady: true,
    creatureSkeletonModelStatus: "url-ready",
    creatureSkeletonModelUrl: resolution.modelUrl,
    creatureSkeletonModelCacheKey: resolution.modelCacheKey,
    creatureSkeletonModelResRef: resolution.resref,
    creatureSkeletonModelAssetId: resolution.assetId ?? ""
  };
}

const VT_PHYSICAL_ANCHOR_COLOR = "#45f7a2";

const STATUS_COLOR: Record<ObjectRenderStatus, string> = {
  ok: "#4de083",
  warning: "#ffb347",
  error: "#ff5e73",
  non_render: "#0d131e"
};

export const AREA_PRIMITIVE_FALLBACK_RENDER_LIMIT = 256;
export const AREA_PRIMITIVE_FALLBACK_RENDER_SUPPRESSION_EVENT =
  "aurora:areas:primitive-fallback-render-suppression";
export const AREA_PRIMITIVE_FALLBACK_RENDER_SUPPRESSION_REASON =
  "area-mass-primitive-fallback-render-suppressed";
const AREA_OBJECT_SHARED_PLACEABLES_RENDERER_RUNTIME_MARKER: typeof SHARED_PLACEABLES_RENDERER_PATH =
  "shared-placeables-renderer";

const SOUND_RANDOM_RANGE_COLOR = "#dff0ff";
const SOUND_HEIGHT_COLOR = "#83c7ff";
const SOUND_DOME_COLOR = "#9fd5ff";
const OBJECT_INSTANCED_FALLBACK_PLACEABLE_ROLE = "instanced-fallback-placeable";
const OBJECT_INSTANCED_FALLBACK_PROXY_ROLE = "instanced-fallback-placeable-proxy";
const OBJECT_INSTANCED_SOURCE_FOOTPRINT_ROLE = "instanced-area-object-source-footprint";
const AREA_OBJECT_SOURCE_ID_LABEL_ROLE = "area-object-source-id-label";
const AREA_OBJECT_SOURCE_DEFAULT_OPACITY_KEY = "areaObjectSourceDefaultOpacity";
const AREA_OBJECT_SOURCE_SELECTED_OPACITY_KEY = "areaObjectSourceSelectedOpacity";
const AREA_OBJECT_BASE_SCALE_KEY = "auroraObjectBaseScale";
const AREA_OBJECT_SELECTED_SCALE_KEY = "auroraObjectSelectedScale";
const AREA_OBJECT_BASE_SCALE_VECTOR_KEY = "auroraObjectBaseScaleVector";
const AREA_OBJECT_SELECTED_SCALE_VECTOR_KEY = "auroraObjectSelectedScaleVector";
const AREA_OBJECT_INSTANCED_MESH_KEY = "auroraInstancedFallbackMesh";
const AREA_OBJECT_INSTANCED_INSTANCE_ID_KEY = "auroraInstancedFallbackInstanceId";
const AREA_OBJECT_SOURCE_FOOTPRINT_DEFAULT_MESH_KEY = "auroraSourceFootprintDefaultMesh";
const AREA_OBJECT_SOURCE_FOOTPRINT_SELECTED_MESH_KEY = "auroraSourceFootprintSelectedMesh";
const AREA_OBJECT_SOURCE_FOOTPRINT_DEFAULT_INSTANCE_ID_KEY =
  "auroraSourceFootprintDefaultInstanceId";
const AREA_OBJECT_SOURCE_FOOTPRINT_SELECTED_INSTANCE_ID_KEY =
  "auroraSourceFootprintSelectedInstanceId";
const AREA_OBJECT_SOURCE_FOOTPRINT_LOCAL_Y_KEY = "auroraSourceFootprintLocalY";
const AREA_OBJECT_TEXTURED_MODEL_MATERIAL_SIGNATURE_KEY =
  "auroraTexturedPlaceableMaterialSignature";
const AREA_FLOOR_TERRAIN_OVERLAY_OBJECT_RENDER_ORDER = 4;
const AREA_TERRAIN_OVERLAY_OBJECT_RENDER_ORDER = 5;
const AREA_SOLID_OBJECT_RENDER_ORDER = 6;
const AREA_TERRAIN_OVERLAY_MAX_THICKNESS = 0.075;
const AREA_TERRAIN_OVERLAY_MIN_FOOTPRINT = 0.14;
const AREA_TERRAIN_OVERLAY_SURFACE_EPSILON = 0.006;
const AREA_TERRAIN_OVERLAY_ROTATION_EPSILON = 1e-4;
const AREA_TERRAIN_OVERLAY_MATERIAL_LIGHTING_MODE = "unlit-texture-color";
const AREA_TERRAIN_OVERLAY_MATERIAL_LIGHTING_MODE_SOURCE =
  "Aurora terrain-overlay placeables such as rugs, stains and floor decals render as texture-color surfaces in the Toolset top-down oracle; keep them out of Three scene-light darkening while preserving texture alpha/depth policy";
const AREA_VISUAL_TRANSFORM_FLOOR_PLANE_TOOLSET_VISIBILITY_SOURCE =
  "Aurora Toolset top-down oracle keeps non-static visual-transform floor-plane placeables as editable source objects instead of rendering them as physical floor decal slabs in the area viewport";
const AREA_TERRAIN_TILE_MODEL_LAYER_NAME = "terrain-backend-tile-models";
const AREA_TERRAIN_SURFACE_RAYCAST_TOP_Y = 4;
const AREA_TERRAIN_SURFACE_RAYCAST_FAR = 12;
const AREA_TERRAIN_OVERLAY_TOKEN_PATTERN =
  /(^|[^a-z0-9])(floor|floorwood|floorwooden|rug|throwrug|carpet|dywan|dirt|bloodstain|waterstain|splat|stain|blood|puddle|plama|splotch|decal)(?=$|[^a-z0-9]|[0-9])/iu;
const AREA_RUG_TERRAIN_OVERLAY_TOKEN_PATTERN =
  /(^|[^a-z0-9])(rug|throwrug|carpet|dywan)(?=$|[^a-z0-9]|[0-9])/iu;
const AREA_FLOOR_TERRAIN_OVERLAY_TOKEN_PATTERN =
  /(^|[^a-z0-9])(floor|floorwood|floorwooden)(?=$|[^a-z0-9]|[0-9])/iu;
const AREA_DECAL_TERRAIN_OVERLAY_TOKEN_PATTERN =
  /(^|[^a-z0-9])(dirt|bloodstain|waterstain|splat|stain|blood|puddle|plama|splotch|decal)(?=$|[^a-z0-9]|[0-9])/iu;

interface ObjectPrimitiveGeometryRuntimeCache {
  objectPrimitiveGeometryCache?: Map<string, THREE.BufferGeometry>;
}

interface InstancedFallbackPlaceableEntry {
  objectId: string;
  proxy: THREE.Object3D;
  selected: boolean;
  colorHex: string;
}

interface InstancedFallbackPlaceableBatch {
  key: string;
  opacity: number;
  wireframe: boolean;
  entries: InstancedFallbackPlaceableEntry[];
}

interface InstancedAreaObjectSourceFootprintEntry {
  proxy: THREE.Object3D;
  selected: boolean;
  localY: number;
}

interface InstancedAreaObjectSourceFootprintBatch {
  status: AreaObjectSourceRenderStatus;
  entries: InstancedAreaObjectSourceFootprintEntry[];
}

const reusableObjectMatrixComposer = new THREE.Object3D();
const reusableInstanceColor = new THREE.Color();
const reusableFootprintLocalMatrixComposer = new THREE.Object3D();
const reusableFootprintInstanceMatrix = new THREE.Matrix4();
const hiddenInstanceMatrix = new THREE.Matrix4().makeScale(1e-6, 1e-6, 1e-6);
const OBJECT_VISUAL_ROTATION_Y_AXIS = new THREE.Vector3(0, 1, 0);
const EMPTY_TEXTURE_URLS_BY_REFERENCE = new Map<string, string>();
const EMPTY_CHUNK_MODEL_URLS_BY_ASSET_ID = new Map<string, string>();
let objectMeshLayerRenderRequestSequence = 0;

function getRuntimePrimitiveGeometryCache(
  runtime: ObjectPrimitiveGeometryRuntimeCache
): Map<string, THREE.BufferGeometry> {
  if (!runtime.objectPrimitiveGeometryCache) {
    runtime.objectPrimitiveGeometryCache = new Map<string, THREE.BufferGeometry>();
  }
  return runtime.objectPrimitiveGeometryCache;
}

function getSharedPrimitiveGeometry(
  runtime: ObjectPrimitiveGeometryRuntimeCache,
  key: string,
  factory: () => THREE.BufferGeometry
): THREE.BufferGeometry {
  const cache = getRuntimePrimitiveGeometryCache(runtime);
  const cached = cache.get(key);
  if (cached) {
    return cached;
  }
  const geometry = factory();
  geometry.userData = {
    ...geometry.userData,
    [PLACEABLE_SHARED_MODEL_GEOMETRY_FLAG]: true
  };
  cache.set(key, geometry);
  return geometry;
}

function getSharedPlaceableFallbackGeometry(
  runtime: ObjectPrimitiveGeometryRuntimeCache,
  objectRadius: number
): THREE.BufferGeometry {
  return getSharedPrimitiveGeometry(
    runtime,
    `placeable-fallback:${objectRadius.toFixed(6)}`,
    () => createPlaceableFallbackGeometry(objectRadius)
  );
}

function getSharedDoorPrimitiveGeometry(
  runtime: ObjectPrimitiveGeometryRuntimeCache,
  objectRadius: number
): THREE.BufferGeometry {
  return getSharedPrimitiveGeometry(
    runtime,
    `door-primitive:${objectRadius.toFixed(6)}`,
    () => createDoorPrimitiveGeometry(objectRadius)
  );
}

function getSharedSphereGeometry(
  runtime: ObjectPrimitiveGeometryRuntimeCache,
  key: string,
  radius: number,
  widthSegments: number,
  heightSegments: number
): THREE.BufferGeometry {
  return getSharedPrimitiveGeometry(
    runtime,
    `${key}:${radius.toFixed(6)}:${widthSegments}:${heightSegments}`,
    () => new THREE.SphereGeometry(radius, widthSegments, heightSegments)
  );
}

function readSceneObjectItemModelParts(object: SceneObject): number[] {
  const properties = object.itemProperties;
  if (properties?.modelParts?.length) {
    return properties.modelParts.filter((value) => Number.isFinite(value));
  }
  return [properties?.modelPart1, properties?.modelPart2, properties?.modelPart3].filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value)
  );
}

function getSharedAreaObjectSourceFootprintGeometry(
  runtime: ObjectPrimitiveGeometryRuntimeCache,
  objectRadius: number,
  status: AreaObjectSourceRenderStatus
): THREE.BufferGeometry {
  return getSharedPrimitiveGeometry(
    runtime,
    `area-object-source-footprint:${status}:${objectRadius.toFixed(6)}`,
    () =>
      new THREE.TorusGeometry(
        objectRadius * (status === "source-backed" ? 1.38 : 1.18),
        Math.max(0.008, objectRadius * 0.038),
        8,
        48
      )
  );
}

function resolveFallbackOpacity(renderStatus: ObjectRenderStatus, debugState: DebugState): number {
  return renderStatus === "non_render" && debugState.showNonRenderMeshes ? 0.45 : 1;
}

function resolveAreaObjectSourceFootprintColor(status: AreaObjectSourceRenderStatus): string {
  return status === "source-backed" ? "#69dfa6" : "#d39a55";
}

function resolveAreaObjectSourceFootprintOpacity(
  status: AreaObjectSourceRenderStatus,
  selected: boolean
): number {
  if (selected) {
    return 0.98;
  }
  return status === "source-backed" ? 0.72 : 0.56;
}

function composeObjectInstanceMatrix(root: THREE.Object3D): THREE.Matrix4 {
  reusableObjectMatrixComposer.position.copy(root.position);
  reusableObjectMatrixComposer.quaternion.copy(root.quaternion);
  reusableObjectMatrixComposer.scale.copy(root.scale);
  reusableObjectMatrixComposer.updateMatrix();
  return reusableObjectMatrixComposer.matrix;
}

function resolveInstancedFallbackSelectedColor(baseColorHex: string, selected: boolean): string {
  return selected ? "#ffd87f" : baseColorHex;
}

function applySourceMdlEmitterAreaModelSpaceScale(group: THREE.Object3D): void {
  applyAuroraAreaModelSpaceScale(
    group,
    PLACEABLE_AREA_MODEL_AURORA_UNITS_TO_TILE_SPACE
  );
  group.userData = {
    ...group.userData,
    sourceMdlEmitterAreaModelSpaceHost: true,
    sourceMdlEmitterAreaModelSpaceScale: PLACEABLE_AREA_MODEL_AURORA_UNITS_TO_TILE_SPACE,
    sourceMdlEmitterAreaModelSpaceScaleSource:
      "source-MDL emitter sibling uses the owning placeable area-model scale; emitter transform, spawn surface, particle size, and motion stay in one model-space host",
    sourceMdlEmitterAreaModelSpaceScalePreviewMode:
      "source-mdl-emitter-host-matches-placeable-area-model-scale"
  };
}

function createSourceMdlEmitterAreaModelSpaceRoot(group: THREE.Group): THREE.Group {
  applySourceMdlEmitterAreaModelSpaceScale(group);
  const root = new THREE.Group();
  root.add(group);
  root.userData = {
    ...group.userData,
    sourceMdlEmitterAreaModelSpaceRoot: true,
    sourceMdlEmitterAreaModelSpaceHostAttached: true
  };
  return root;
}

function toAuroraVfxCanonicalModelGraph(
  modelGraph: PlaceableRenderPackageAuroraModelGraph | undefined
): AuroraVfxCanonicalModelGraph | undefined {
  return Array.isArray(modelGraph?.nodes) ? { nodes: modelGraph.nodes } : undefined;
}

function syncCanonicalSourceMdlLightNodesFromLoadedModel(input: {
  model: THREE.Object3D;
  lightGroup: THREE.Object3D;
  modelGraph: PlaceableRenderPackageAuroraModelGraph | undefined;
}): { matchedNodeNames: string[]; unmatchedNodeNames: string[]; graphStatus: string } {
  const graphNodes = input.modelGraph?.nodes;
  if (!Array.isArray(graphNodes)) {
    return {
      matchedNodeNames: [],
      unmatchedNodeNames: [],
      graphStatus: "legacy-model-graph-nodes-unavailable"
    };
  }
  const graphLightNames = new Set(
    graphNodes
      .filter((node) => node.nodeKind === "light")
      .map((node) => normalizeAuroraMdlGraphNodeName(node.nodeName))
      .filter(Boolean)
  );
  if (graphLightNames.size === 0) {
    return {
      matchedNodeNames: [],
      unmatchedNodeNames: [],
      graphStatus: "source-mdl-graph-has-no-light-nodes"
    };
  }

  const modelNodesByName = new Map<string, THREE.Object3D>();
  input.model.traverse((node) => {
    const normalizedName = normalizeAuroraMdlGraphNodeName(node.name);
    if (normalizedName && !modelNodesByName.has(normalizedName)) {
      modelNodesByName.set(normalizedName, node);
    }
  });

  const matchedNodeNames: string[] = [];
  const unmatchedNodeNames: string[] = [];
  input.lightGroup.traverse((node) => {
    const isLegacyPreviewLight = node.userData?.vfxPreviewRole === "aurora-light-node";
    const isCanonicalSourceMdlLight = node.userData?.auroraVfxCanonicalSourceMdlLight === true;
    if (!isLegacyPreviewLight && !isCanonicalSourceMdlLight) {
      return;
    }
    const nodeName =
      typeof node.userData?.auroraLightNodeName === "string"
        ? node.userData.auroraLightNodeName
        : typeof node.userData?.auroraVfxCanonicalSourceMdlLightNodeName === "string"
          ? node.userData.auroraVfxCanonicalSourceMdlLightNodeName
        : "";
    const normalizedName = normalizeAuroraMdlGraphNodeName(nodeName);
    if (!normalizedName || !graphLightNames.has(normalizedName)) {
      return;
    }
    const sourceModelNode = modelNodesByName.get(normalizedName);
    if (!sourceModelNode) {
      unmatchedNodeNames.push(nodeName);
      node.userData = {
        ...node.userData,
        auroraVfxCanonicalLightGraphAttachment: "source-node-not-present-in-loaded-model",
        auroraVfxCanonicalLightGraphNodeName: nodeName,
        auroraVfxCanonicalLightGraphRetailProof: false
      };
      return;
    }
    input.model.updateWorldMatrix(true, true);
    sourceModelNode.updateWorldMatrix(true, false);
    const worldPosition = new THREE.Vector3();
    sourceModelNode.getWorldPosition(worldPosition);
    const localPosition = node.parent
      ? node.parent.worldToLocal(worldPosition.clone())
      : worldPosition.clone();
    node.position.copy(localPosition);
    node.userData = {
      ...node.userData,
      auroraLightSourceModelAttachmentNode: sourceModelNode,
      auroraVfxCanonicalLightGraphAttachment: "matched-loaded-model-node",
      auroraVfxCanonicalLightGraphNodeName: nodeName,
      auroraVfxCanonicalLightGraphWorldPosition: [
        worldPosition.x,
        worldPosition.y,
        worldPosition.z
      ],
      auroraVfxCanonicalLightGraphLocalPosition: [
        localPosition.x,
        localPosition.y,
        localPosition.z
      ],
      auroraVfxCanonicalLightGraphRetailProof: false
    };
    matchedNodeNames.push(nodeName);
  });
  return {
    matchedNodeNames,
    unmatchedNodeNames,
    graphStatus: "source-mdl-graph-light-nodes-checked"
  };
}

function normalizeAuroraMdlGraphNodeName(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9_]/gu, "");
}

function composeAreaObjectSourceFootprintInstanceMatrix(
  root: THREE.Object3D,
  localY: number
): THREE.Matrix4 {
  root.updateMatrix();
  reusableFootprintLocalMatrixComposer.position.set(0, localY, 0);
  reusableFootprintLocalMatrixComposer.rotation.set(Math.PI / 2, 0, 0);
  reusableFootprintLocalMatrixComposer.scale.setScalar(1);
  reusableFootprintLocalMatrixComposer.updateMatrix();
  return reusableFootprintInstanceMatrix.multiplyMatrices(
    root.matrix,
    reusableFootprintLocalMatrixComposer.matrix
  );
}

function setAreaObjectSourceFootprintInstanceVisibility(
  mesh: THREE.InstancedMesh | undefined,
  instanceId: number | undefined,
  root: THREE.Object3D,
  localY: number,
  visible: boolean
): void {
  if (!(mesh instanceof THREE.InstancedMesh) || typeof instanceId !== "number") {
    return;
  }
  mesh.setMatrixAt(
    instanceId,
    visible ? composeAreaObjectSourceFootprintInstanceMatrix(root, localY) : hiddenInstanceMatrix
  );
  mesh.instanceMatrix.needsUpdate = true;
}

type AreaObjectSourceRenderStatus = "source-backed" | "fallback";
type AreaObjectSharedRendererPayloadStatus =
  | "payload-bound"
  | "missing-payload"
  | "not-applicable";
type AreaObjectSharedRendererGeometryStatus =
  | "model-url-ready"
  | "still-loading"
  | "model-load-failed"
  | "primitive-fallback"
  | "missing-payload"
  | "not-applicable";

interface AreaObjectSharedRendererRuntimeEvidence {
  isAreaObjectSharedPlaceablesRendererTarget: boolean;
  auroraAreaObjectSharedRendererPath:
    | typeof AREA_OBJECT_SHARED_PLACEABLES_RENDERER_RUNTIME_MARKER
    | "not-applicable";
  auroraAreaObjectSharedRendererPayloadStatus: AreaObjectSharedRendererPayloadStatus;
  auroraAreaObjectSharedRendererGeometryStatus: AreaObjectSharedRendererGeometryStatus;
  auroraAreaObjectSharedRendererPlaceholderReason: AreaPlaceablePlaceholderReason;
  auroraAreaObjectSharedRendererModelUrl: string;
  auroraAreaObjectSharedRendererRuntimeMarker?: typeof AREA_OBJECT_SHARED_PLACEABLES_RENDERER_RUNTIME_MARKER;
}

type AreaObjectSharedRendererTextureStatus =
  | "not-applicable"
  | "loading"
  | "applied"
  | "partial"
  | "missing"
  | "fallback"
  | "skipped";

interface AreaPrimitiveFallbackRenderSuppressionSnapshot {
  version: "aurora-areas-primitive-fallback-render-suppression/v1";
  path: typeof AREA_OBJECT_SHARED_PLACEABLES_RENDERER_RUNTIME_MARKER;
  reason: typeof AREA_PRIMITIVE_FALLBACK_RENDER_SUPPRESSION_REASON;
  renderLimit: number;
  candidateCount: number;
  renderedCount: number;
  suppressedCount: number;
  selectedBypassCount: number;
  renderedIds: string[];
  suppressedIds: string[];
}

function createDoorPrimitiveGeometry(objectRadius: number): THREE.BufferGeometry {
  const geometry = new THREE.BoxGeometry(
    Math.max(0.1, objectRadius * 0.78),
    Math.max(0.28, objectRadius * 2.2),
    Math.max(0.05, objectRadius * 0.18)
  );
  return geometry;
}

function resolveAreaObjectSourceRenderStatus(object: SceneObject): AreaObjectSourceRenderStatus {
  return object.source?.type === "aurora_git" ? "source-backed" : "fallback";
}

export function isAreaObjectSharedPlaceablesRendererTarget(object: SceneObject): boolean {
  return isAreaSharedPlaceablesRendererSceneObject(object);
}

function buildAreaObjectSharedRendererRuntimeEvidence(input: {
  sharedRendererTarget: boolean;
  payloadStatus: AreaObjectSharedRendererPayloadStatus;
  geometryStatus: AreaObjectSharedRendererGeometryStatus;
  placeholderReason: AreaPlaceablePlaceholderReason;
  modelUrl: string | null | undefined;
}): AreaObjectSharedRendererRuntimeEvidence {
  return {
    isAreaObjectSharedPlaceablesRendererTarget: input.sharedRendererTarget,
    auroraAreaObjectSharedRendererPath: input.sharedRendererTarget
      ? AREA_OBJECT_SHARED_PLACEABLES_RENDERER_RUNTIME_MARKER
      : "not-applicable",
    auroraAreaObjectSharedRendererPayloadStatus: input.payloadStatus,
    auroraAreaObjectSharedRendererGeometryStatus: input.geometryStatus,
    auroraAreaObjectSharedRendererPlaceholderReason: input.placeholderReason,
    auroraAreaObjectSharedRendererModelUrl: input.modelUrl ?? "",
    ...(input.sharedRendererTarget
      ? {
          auroraAreaObjectSharedRendererRuntimeMarker:
            AREA_OBJECT_SHARED_PLACEABLES_RENDERER_RUNTIME_MARKER
        }
      : {})
  };
}

function markAreaObjectSharedRendererRuntimeEvidence(
  root: THREE.Object3D,
  evidence: AreaObjectSharedRendererRuntimeEvidence
): void {
  root.userData = {
    ...root.userData,
    ...evidence
  };
  if (!evidence.isAreaObjectSharedPlaceablesRendererTarget) {
    return;
  }
  root.traverse((node) => {
    node.userData = {
      ...node.userData,
      ...evidence
    };
  });
}

function markAreaObjectSharedRendererTextureRuntimeEvidence(
  root: THREE.Object3D,
  status: AreaObjectSharedRendererTextureStatus,
  details: {
    textureCount?: number;
    textureLoaded?: number;
    textureSource?: string | null;
    referencedMaterialCount?: number;
    mappedMaterialCount?: number;
    missingMapMaterialCount?: number;
    availableTextureReferences?: readonly string[];
    requestedTextureReferences?: readonly string[];
    loadedTextureReferences?: readonly string[];
    failedTextureReferences?: readonly string[];
  } = {}
): void {
  if (
    root.userData?.auroraAreaObjectSharedRendererRuntimeMarker !==
    AREA_OBJECT_SHARED_PLACEABLES_RENDERER_RUNTIME_MARKER
  ) {
    return;
  }
  const evidence = {
    auroraAreaObjectSharedRendererTextureStatus: status,
    auroraAreaObjectSharedRendererTextureCount: details.textureCount ?? 0,
    auroraAreaObjectSharedRendererTextureLoaded: details.textureLoaded ?? 0,
    auroraAreaObjectSharedRendererTextureSource: details.textureSource ?? "",
    auroraAreaObjectSharedRendererTextureReferencedMaterialCount:
      details.referencedMaterialCount ?? 0,
    auroraAreaObjectSharedRendererTextureMappedMaterialCount:
      details.mappedMaterialCount ?? 0,
    auroraAreaObjectSharedRendererTextureMissingMapMaterialCount:
      details.missingMapMaterialCount ?? 0,
    auroraAreaObjectSharedRendererTextureAvailableReferences:
      details.availableTextureReferences?.join("|") ?? "",
    auroraAreaObjectSharedRendererTextureRequestedReferences:
      details.requestedTextureReferences?.join("|") ?? "",
    auroraAreaObjectSharedRendererTextureLoadedReferences:
      details.loadedTextureReferences?.join("|") ?? "",
    auroraAreaObjectSharedRendererTextureFailedReferences:
      details.failedTextureReferences?.join("|") ?? ""
  };
  root.userData = {
    ...root.userData,
    ...evidence
  };
  root.traverse((node) => {
    node.userData = {
      ...node.userData,
      ...evidence
    };
  });
}

function markAreaObjectSharedRendererModelMetrics(
  root: THREE.Object3D,
  metrics: {
    readonly meshCount: number;
    readonly boundsLabel: string;
    readonly boundsSize: { readonly x: number; readonly y: number; readonly z: number };
  }
): void {
  if (
    root.userData?.auroraAreaObjectSharedRendererRuntimeMarker !==
    AREA_OBJECT_SHARED_PLACEABLES_RENDERER_RUNTIME_MARKER
  ) {
    return;
  }
  const maxAxis = Math.max(
    Math.abs(metrics.boundsSize.x),
    Math.abs(metrics.boundsSize.y),
    Math.abs(metrics.boundsSize.z)
  );
  const evidence = {
    auroraAreaObjectSharedRendererModelBounds: metrics.boundsLabel,
    auroraAreaObjectSharedRendererModelMaxAxis: maxAxis,
    auroraAreaObjectSharedRendererModelMeshCount: metrics.meshCount
  };
  root.userData = {
    ...root.userData,
    ...evidence
  };
}

function shouldRenderAreaObjectSourceAffordance(
  object: SceneObject,
  selected: boolean,
  debugState: DebugState
): boolean {
  if (object.kind !== "placeables" && object.kind !== "doors") {
    return false;
  }
  return selected || debugState.objectLabels || debugState.bounds || debugState.collisionOverlay;
}

function createAreaObjectSourceFootprint(
  objectRadius: number,
  status: AreaObjectSourceRenderStatus,
  selected: boolean
): THREE.Mesh {
  const defaultOpacity = status === "source-backed" ? 0.72 : 0.56;
  const selectedOpacity = 0.98;
  const geometry = new THREE.TorusGeometry(
    objectRadius * (status === "source-backed" ? 1.38 : 1.18),
    Math.max(0.008, objectRadius * 0.038),
    8,
    48
  );
  const material = new THREE.MeshBasicMaterial({
    color: new THREE.Color(status === "source-backed" ? "#69dfa6" : "#d39a55"),
    transparent: true,
    opacity: selected ? selectedOpacity : defaultOpacity,
    depthWrite: false
  });
  const footprint = new THREE.Mesh(geometry, material);
  footprint.rotation.x = Math.PI / 2;
  footprint.renderOrder = selected ? 16 : 11;
  footprint.raycast = () => undefined;
  footprint.userData = {
    areaObjectSourceAffordance: true,
    areaObjectSourceStatus: status,
    [AREA_OBJECT_SOURCE_DEFAULT_OPACITY_KEY]: defaultOpacity,
    [AREA_OBJECT_SOURCE_SELECTED_OPACITY_KEY]: selectedOpacity
  };
  return footprint;
}

function formatViewportSourceId(value: string | undefined): string {
  if (!value || value.trim().length === 0) {
    return "";
  }
  const normalized = value.trim();
  return normalized.length > 18 ? `${normalized.slice(0, 15)}...` : normalized;
}

function resolveTextureReferenceForDeliveryUrl(
  textureUrlsByReference: Map<string, string>,
  textureDeliveryUrl: string | null | undefined
): string | null {
  if (!textureDeliveryUrl) {
    return null;
  }
  for (const [reference, deliveryUrl] of textureUrlsByReference.entries()) {
    if (deliveryUrl === textureDeliveryUrl) {
      return reference;
    }
  }
  return null;
}

function resolveVfxAlphaCompanionTexture(
  particleTexturesByReference: Map<string, THREE.Texture>,
  textureReference: string | null | undefined
): THREE.Texture | null {
  const alphaReference = resolvePlaceableVfxAlphaCompanionTextureReference(textureReference);
  return alphaReference ? particleTexturesByReference.get(alphaReference) ?? null : null;
}

function collectCachedPlaceableTexturesByReference(
  runtime: RuntimeState,
  textureUrlsByReference: Map<string, string>,
  loadOptions: PlaceableTextureLoadOptions = {},
  blockPltWithoutTargetContext = false
): Map<string, THREE.Texture> {
  const texturesByReference = new Map<string, THREE.Texture>();
  textureUrlsByReference.forEach((textureDeliveryUrl, reference) => {
    if (blockPltWithoutTargetContext && isAuroraPltTextureDeliveryUrl(textureDeliveryUrl)) {
      return;
    }
    const cachedTexture = getCachedPlaceableTexture(runtime, textureDeliveryUrl, loadOptions);
    if (cachedTexture) {
      texturesByReference.set(reference, cachedTexture);
    }
  });
  return texturesByReference;
}

function isAuroraPltTextureDeliveryUrl(textureDeliveryUrl: string): boolean {
  return /\.plt(?:[?#]|$)/iu.test(textureDeliveryUrl);
}

function hasCanonicalSourceMdlLights(group: THREE.Object3D | null): boolean {
  let found = false;
  group?.traverse((node) => {
    if (node.userData?.auroraVfxCanonicalSourceMdlLight === true) {
      found = true;
    }
  });
  return found;
}

function applyCanonicalSourceMdlLightPolicyAfterRefresh(
  currentCanonicalGroup: THREE.Object3D,
  refreshedCanonicalGroup: THREE.Object3D,
  policy: CanonicalSourceMdlLightFallbackPolicy | null | undefined
): void {
  if (!policy) {
    return;
  }
  applyCanonicalSourceMdlLightFallbackPolicy(refreshedCanonicalGroup, policy);
  const fallbackChildren = currentCanonicalGroup.children.filter(
    (child) => child.userData?.auroraVfxSourceMdlLightFallbackActive === true
  );
  fallbackChildren.forEach((fallbackChild) => refreshedCanonicalGroup.add(fallbackChild));
}

function collectCanonicalVfxChunkModelDeliveryUrlsByResourceKey(
  payload: PlaceableViewportRenderPayload | null | undefined,
  canonicalPayload: AuroraVfxPayload | null | undefined
): Map<string, string> {
  if (!payload || !canonicalPayload) {
    return new Map();
  }
  const resourceKeys = collectCanonicalVfxChunkModelResourceKeys(canonicalPayload);
  if (resourceKeys.length === 0) {
    return new Map();
  }
  const resourceKeyByNormalizedName = new Map(
    resourceKeys.map((resourceKey) => [normalizeCanonicalVfxChunkModelResourceName(resourceKey), resourceKey])
  );
  const assetById = new Map(
    payload.placeable.assetManifest.assets.map((asset) => [String(asset.assetId ?? "").trim(), asset])
  );
  const urlsByResourceKey = new Map<string, string>();
  payload.assetContracts.assets.forEach((assetContract) => {
    const assetId = String(assetContract.assetId ?? "").trim();
    const asset = assetById.get(assetId);
    const normalizedNames = [
      normalizeCanonicalVfxChunkModelResourceName(asset?.fileName),
      normalizeCanonicalVfxChunkModelResourceName(asset?.objectKey),
      normalizeCanonicalVfxChunkModelResourceName(assetContract.deliveryUrl)
    ].filter((entry) => entry.length > 0);
    const matchedResourceKey = normalizedNames
      .map((name) => resourceKeyByNormalizedName.get(name))
      .find((entry): entry is string => Boolean(entry));
    const deliveryUrl =
      typeof assetContract.deliveryUrl === "string" ? assetContract.deliveryUrl.trim() : "";
    if (
      !matchedResourceKey ||
      deliveryUrl.length === 0 ||
      urlsByResourceKey.has(matchedResourceKey) ||
      resolveUnsupportedModelCandidateReason(deliveryUrl) !== null
    ) {
      return;
    }
    urlsByResourceKey.set(matchedResourceKey, resolveCanonicalVfxChunkModelDeliveryUrl(deliveryUrl));
  });
  return urlsByResourceKey;
}

function collectCachedCanonicalVfxChunkModelsByResourceKey(
  runtime: RuntimeState,
  urlsByResourceKey: Map<string, string>
): Map<string, THREE.Object3D> {
  const modelsByResourceKey = new Map<string, THREE.Object3D>();
  urlsByResourceKey.forEach((deliveryUrl, resourceKey) => {
    const cachedModel = runtime.placeableModelCacheByUrl.get(deliveryUrl);
    if (cachedModel) {
      modelsByResourceKey.set(resourceKey, cachedModel);
    }
  });
  return modelsByResourceKey;
}

function resolveCanonicalVfxChunkModelDeliveryUrl(url: string): string {
  try {
    return resolvePlaceableAssetDeliveryUrl(url);
  } catch {
    return url;
  }
}

function collectCanonicalVfxChunkModelResourceKeys(payload: AuroraVfxPayload): string[] {
  const contracts = [
    payload.contracts.renderContract,
    ...(Array.isArray(payload.contracts.runtimeEmitters)
      ? payload.contracts.runtimeEmitters.map((entry) =>
          typeof entry === "object" && entry !== null
            ? (entry as { renderContract?: unknown }).renderContract
            : undefined
        )
      : [])
  ];
  const resourceKeys: string[] = [];
  contracts.forEach((contract) => {
    collectCanonicalVfxChunkModelResourceKeysFromContract(contract).forEach((resourceKey) => {
      if (!resourceKeys.includes(resourceKey)) {
        resourceKeys.push(resourceKey);
      }
    });
  });
  return resourceKeys;
}

function collectCanonicalVfxChunkModelResourceKeysFromContract(contract: unknown): string[] {
  if (!contract || typeof contract !== "object") {
    return [];
  }
  const record = contract as {
    chunkLane?: unknown;
    chunkLanes?: unknown;
  };
  const lanes = [
    record.chunkLane,
    ...(Array.isArray(record.chunkLanes) ? record.chunkLanes : [])
  ];
  return lanes
    .map((lane) => {
      if (!lane || typeof lane !== "object") {
        return "";
      }
      const resolvedResource = (lane as { resolvedResource?: unknown }).resolvedResource;
      if (!resolvedResource || typeof resolvedResource !== "object") {
        return "";
      }
      const resourceKey = (resolvedResource as { resourceKey?: unknown }).resourceKey;
      return typeof resourceKey === "string" ? resourceKey.trim() : "";
    })
    .filter((resourceKey) => resourceKey.length > 0);
}

function normalizeCanonicalVfxChunkModelResourceName(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  const normalized = value.trim().replace(/\\/gu, "/").toLowerCase();
  const withoutQuery = normalized.split(/[?#]/u)[0] ?? "";
  const fileName = withoutQuery.split("/").filter(Boolean).pop() ?? "";
  return fileName.replace(/\.(mdl|mdb|glb|gltf)$/iu, "");
}

function resolveVfxModelFallbackTexture(
  runtime: RuntimeState,
  textureDeliveryUrl: string | null,
  texturesByReference: Map<string, THREE.Texture>
): THREE.Texture | undefined {
  return (
    (textureDeliveryUrl
      ? runtime.placeableTextureCacheByUrl.get(textureDeliveryUrl)
      : undefined) ??
    (texturesByReference.size === 1 ? Array.from(texturesByReference.values())[0] : undefined)
  );
}

function resolvePlaceableModelTextureSignature(
  textureUrlsByReference: Map<string, string>,
  textureDeliveryUrl: string | null | undefined,
  textureBindings?: NonNullable<PlaceableViewportRenderPayload["renderPackage"]>["textureBindings"],
  auroraMaterial?: PlaceableRenderPackageAuroraMaterial | null
): string | null {
  const fallbackUrl = textureDeliveryUrl?.trim() ?? "";
  const entries = [...textureUrlsByReference.entries()]
    .map(([reference, url]) => [reference.trim().toLowerCase(), url.trim()] as const)
    .filter(([reference, url]) => reference.length > 0 && url.length > 0)
    .sort(([left], [right]) => left.localeCompare(right));
  const txiEntries = (textureBindings ?? [])
    .map((binding) => {
      const txi = binding.txi;
      if (!txi) {
        return null;
      }
      const reference = (binding.reference || binding.fileName).trim().toLowerCase();
      if (!reference) {
        return null;
      }
      return [
        reference,
        `decal=${txi.decal ?? ""}`,
        `clamp=${txi.clamp ?? ""}`,
        `blending=${txi.blending ?? ""}`,
        `mipmap=${txi.mipmap ?? ""}`,
        `filter=${txi.filter ?? ""}`,
        `proceduretype=${txi.proceduretype ?? ""}`,
        `numx=${txi.numx ?? ""}`,
        `numy=${txi.numy ?? ""}`,
        `fps=${txi.fps ?? ""}`
      ].join(",");
    })
    .filter((entry): entry is string => Boolean(entry))
    .sort((left, right) => left.localeCompare(right));
  const materialEntries = (auroraMaterial?.materials ?? [])
    .map((material) => {
      const state = material.state;
      const textureSlots = (state.textureSlots ?? [])
        .map((slot) =>
          [
            `slot=${slot.slot}`,
            `role=${slot.role}`,
            `reference=${slot.reference.trim().toLowerCase()}`
          ].join(":")
        )
        .sort((left, right) => left.localeCompare(right))
        .join(",");
      return [
        (material.materialFileName || material.materialObjectKey).trim().toLowerCase(),
        `vs=${state.customShaderVS ?? ""}`,
        `fs=${state.customShaderFS ?? ""}`,
        `gs=${state.customShaderGS ?? ""}`,
        `roughness=${state.roughness ?? ""}`,
        `specularity=${state.specularity ?? ""}`,
        `transparency=${state.transparency ?? ""}`,
        `twoSided=${state.twoSided ?? ""}`,
        `blending=${state.blending ?? ""}`,
        `decal=${state.decal ?? ""}`,
        `renderHint=${state.renderHint ?? ""}`,
        `slots=${textureSlots}`
      ].join(",");
    })
    .filter((entry) => entry.trim().length > 0)
    .sort((left, right) => left.localeCompare(right));
  if (fallbackUrl.length === 0 && entries.length === 0 && materialEntries.length === 0) {
    return null;
  }
  return `fallback:${fallbackUrl}|refs:${entries
    .map(([reference, url]) => `${reference}=${url}`)
    .join(";")}|txi:${txiEntries.join(";")}|mtr:${materialEntries.join(";")}`;
}

function resolveTexturedModelMaterialSharingKey(
  modelUrl: string | null | undefined,
  modelCacheKey: string | null | undefined,
  modelPresentationKey: string
): string | null {
  const normalizedModelKey = (modelCacheKey ?? modelUrl)?.trim();
  if (!normalizedModelKey) {
    return null;
  }
  return `${normalizedModelKey}|${modelPresentationKey}`;
}

function collectShareableTexturedModelMaterialSignatures(
  objects: SceneObject[],
  placeableRenderPayloadByObjectId: Record<string, PlaceableViewportRenderPayload> | null,
  modelPresentationKey: string
): Map<string, string | null> {
  const signaturesByModelKey = new Map<string, string | null>();
  if (!placeableRenderPayloadByObjectId) {
    return signaturesByModelKey;
  }
  objects.forEach((object) => {
    if (object.kind !== "placeables" && object.kind !== "doors") {
      return;
    }
    const payload = placeableRenderPayloadByObjectId[object.id];
    if (!payload || (object.kind === "placeables" && isPlaceableVfxPayload(payload))) {
      return;
    }
    const renderState = resolvePlaceableRenderContractState(payload);
    if (!renderState.modelUrl || renderState.fallbackToPrimitive) {
      return;
    }
    const textureUrlsByReference = resolvePlaceableTextureDeliveryUrlsByReference(payload);
    const textureSignature = resolvePlaceableModelTextureSignature(
      textureUrlsByReference,
      renderState.textureDeliveryUrl,
      payload.renderPackage?.textureBindings,
      payload.renderPackage?.auroraMaterial
    );
    if (!textureSignature) {
      return;
    }
    const sharingKey = resolveTexturedModelMaterialSharingKey(
      renderState.modelUrl,
      renderState.modelCacheKey,
      modelPresentationKey
    );
    if (!sharingKey) {
      return;
    }
    const existingSignature = signaturesByModelKey.get(sharingKey);
    if (existingSignature === undefined) {
      signaturesByModelKey.set(sharingKey, textureSignature);
      return;
    }
    if (existingSignature !== textureSignature) {
      signaturesByModelKey.set(sharingKey, null);
    }
  });
  return signaturesByModelKey;
}

function isPlaceableMaterialTextureSignatureApplied(
  model: THREE.Object3D,
  textureSignature: string,
  expectedTextureReferences?: ReadonlySet<string>
): boolean {
  let textureMaterialCount = 0;
  let mismatchedCount = 0;
  let missingReferencedMapCount = 0;
  model.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material) => {
      if (!("map" in material)) {
        return;
      }
      textureMaterialCount += 1;
      if (material.userData?.[AREA_OBJECT_TEXTURED_MODEL_MATERIAL_SIGNATURE_KEY] !== textureSignature) {
        mismatchedCount += 1;
      }
      if (hasReferencedTextureWithoutMaterialMap(material, expectedTextureReferences)) {
        missingReferencedMapCount += 1;
      }
    });
  });
  return textureMaterialCount > 0 && mismatchedCount === 0 && missingReferencedMapCount === 0;
}

function markPlaceableMaterialTextureSignature(
  model: THREE.Object3D,
  textureSignature: string,
  expectedTextureReferences?: ReadonlySet<string>
): void {
  model.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material) => {
      if (!("map" in material)) {
        return;
      }
      if (hasReferencedTextureWithoutMaterialMap(material, expectedTextureReferences)) {
        return;
      }
      material.userData = {
        ...material.userData,
        [AREA_OBJECT_TEXTURED_MODEL_MATERIAL_SIGNATURE_KEY]: textureSignature
      };
    });
  });
}

function resolveSharedModelMaterialTextureReferences(material: THREE.Material): string[] {
  const userData = material.userData as Record<string, unknown>;
  const aurora = userData.aurora as Record<string, unknown> | undefined;
  const references: string[] = [];
  [
    userData.auroraPrimaryTextureReference,
    aurora?.textureReference,
    userData.textureReference
  ].forEach((reference) => {
    if (typeof reference === "string") {
      references.push(reference);
    }
  });
  [aurora?.textureReferences, userData.textureReferences].forEach((textureReferences) => {
    if (!Array.isArray(textureReferences)) {
      return;
    }
    textureReferences.forEach((reference) => {
      if (typeof reference === "string") {
        references.push(reference);
      }
    });
  });
  const materialNameMatch = material.name.match(/^Aurora material\s+(.+)$/iu);
  if (materialNameMatch?.[1]) {
    references.push(materialNameMatch[1]);
  }
  return references
    .map(normalizePlaceableTextureReference)
    .filter((reference, index, all) => reference.length > 0 && all.indexOf(reference) === index);
}

function resolveSharedModelPrimaryMaterialTextureReferences(material: THREE.Material): string[] {
  const userData = material.userData as Record<string, unknown>;
  const aurora = userData.aurora as Record<string, unknown> | undefined;
  const references: string[] = [];
  [
    userData.auroraPrimaryTextureReference,
    aurora?.textureReference,
    userData.textureReference
  ].forEach((reference) => {
    if (typeof reference === "string") {
      references.push(reference);
    }
  });
  const materialNameMatch = material.name.match(/^Aurora material\s+(.+)$/iu);
  if (materialNameMatch?.[1]) {
    references.push(materialNameMatch[1]);
  }
  return references
    .map(normalizePlaceableTextureReference)
    .filter((reference, index, all) => reference.length > 0 && all.indexOf(reference) === index);
}

function resolveSharedModelMapCandidateTextureReferences(
  material: THREE.Material,
  expectedTextureReferences?: ReadonlySet<string>
): string[] {
  const primaryReferences = resolveSharedModelPrimaryMaterialTextureReferences(material);
  if (primaryReferences.length > 0) {
    return expectedTextureReferences
      ? primaryReferences.filter((reference) => expectedTextureReferences.has(reference))
      : primaryReferences;
  }
  return [];
}

function hasReferencedTextureWithoutMaterialMap(
  material: THREE.Material & { map?: unknown },
  expectedTextureReferences?: ReadonlySet<string>
): boolean {
  const materialReferences = resolveSharedModelMapCandidateTextureReferences(
    material,
    expectedTextureReferences
  );
  if (materialReferences.length === 0) {
    return false;
  }
  return !(material.map instanceof THREE.Texture);
}

function summarizePlaceableModelMaterialTextureCoverage(
  model: THREE.Object3D,
  expectedTextureReferences?: ReadonlySet<string>
): {
  referencedMaterialCount: number;
  mappedMaterialCount: number;
  missingMapMaterialCount: number;
} {
  let referencedMaterialCount = 0;
  let mappedMaterialCount = 0;
  let missingMapMaterialCount = 0;
  model.traverse((node) => {
    if (!(node instanceof THREE.Mesh) || !isPlaceableRuntimeNodeEffectivelyVisible(node)) {
      return;
    }
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material) => {
      if (material.visible === false) {
        return;
      }
      if (!("map" in material)) {
        return;
      }
      const materialReferences = resolveSharedModelMapCandidateTextureReferences(
        material,
        expectedTextureReferences
      );
      if (materialReferences.length === 0) {
        return;
      }
      referencedMaterialCount += 1;
      if (material.map instanceof THREE.Texture) {
        mappedMaterialCount += 1;
      } else {
        missingMapMaterialCount += 1;
      }
    });
  });
  return {
    referencedMaterialCount,
    mappedMaterialCount,
    missingMapMaterialCount
  };
}

function isPlaceableRuntimeNodeEffectivelyVisible(node: THREE.Object3D): boolean {
  let current: THREE.Object3D | null = node;
  while (current) {
    if (!current.visible) {
      return false;
    }
    current = current.parent;
  }
  if (node instanceof THREE.Mesh) {
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    return materials.some((material) => material.visible !== false);
  }
  return true;
}

function resolveExpectedTextureReferenceSet(
  textureUrlsByReference: Map<string, string> | Map<string, THREE.Texture>
): Set<string> {
  return new Set(
    Array.from(textureUrlsByReference.keys())
      .map(normalizePlaceableTextureReference)
      .filter((reference) => reference.length > 0)
  );
}

function buildAuroraMaterialTextureReferencesByMaterialReference(
  auroraMaterial?: PlaceableRenderPackageAuroraMaterial | null,
  options: {
    visibleOnly?: boolean;
  } = {}
): Map<string, string[]> {
  const referencesByMaterial = new Map<string, string[]>();
  auroraMaterial?.materials.forEach((material) => {
    const textureReferences = (material.state.textureSlots ?? [])
      .filter((slot) => !options.visibleOnly || slot.role === "diffuse")
      .map((slot) => normalizePlaceableTextureReference(slot.reference))
      .filter((reference) => reference.length > 0);
    if (textureReferences.length === 0) {
      return;
    }
    [material.materialFileName, material.materialObjectKey].forEach((reference) => {
      const normalized = normalizePlaceableTextureReference(reference);
      if (normalized && !referencesByMaterial.has(normalized)) {
        referencesByMaterial.set(normalized, textureReferences);
      }
    });
  });
  return referencesByMaterial;
}

function resolveAvailableMaterialMapResourceReferences<T>(
  references: readonly string[],
  resourcesByReference: Map<string, T>
): string[] {
  return references.filter((reference) => resourcesByReference.has(reference));
}

function resolveAuroraMaterialTextureReferencesForMaterial(
  materialReferences: readonly string[],
  textureReferencesByMaterialReference: ReadonlyMap<string, string[]>
): string[] {
  const references: string[] = [];
  materialReferences.forEach((materialReference) => {
    textureReferencesByMaterialReference.get(materialReference)?.forEach((textureReference) => {
      if (!references.includes(textureReference)) {
        references.push(textureReference);
      }
    });
  });
  return references;
}

function resolveModelMaterialMapResourcesByReference<T>(
  model: THREE.Object3D,
  resourcesByReference: Map<string, T>,
  options: {
    auroraMaterial?: PlaceableRenderPackageAuroraMaterial | null;
    visibleOnly?: boolean;
  } = {}
): Map<string, T> {
  if (resourcesByReference.size <= 1) {
    return resourcesByReference;
  }

  const mtrTextureReferencesByMaterialReference =
    buildAuroraMaterialTextureReferencesByMaterialReference(options.auroraMaterial, {
      visibleOnly: options.visibleOnly
    });
  const materialMapReferences = new Set<string>();
  let sawMaterialTextureReference = false;
  model.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material) => {
      const primaryReferences = resolveSharedModelPrimaryMaterialTextureReferences(material);
      const secondaryReferences = resolveSharedModelMaterialTextureReferences(material);
      const primaryResourceReferences = resolveAvailableMaterialMapResourceReferences(
        primaryReferences,
        resourcesByReference
      );
      const mtrLookupReferences =
        primaryReferences.length > 0 ? primaryReferences : secondaryReferences;
      const mtrResourceReferences = resolveAvailableMaterialMapResourceReferences(
        resolveAuroraMaterialTextureReferencesForMaterial(
          mtrLookupReferences,
          mtrTextureReferencesByMaterialReference
        ),
        resourcesByReference
      );
      const references =
        mtrResourceReferences.length > 0
          ? mtrResourceReferences
          : primaryResourceReferences.length > 0
            ? primaryResourceReferences
            : primaryReferences.length === 0
              ? resolveAvailableMaterialMapResourceReferences(
                  secondaryReferences,
                  resourcesByReference
                )
              : [];
      if (primaryReferences.length > 0 || secondaryReferences.length > 0) {
        sawMaterialTextureReference = true;
      }
      references.forEach((reference) => {
        materialMapReferences.add(reference);
      });
    });
  });

  if (materialMapReferences.size === 0) {
    return sawMaterialTextureReference ? new Map() : resourcesByReference;
  }

  const materialMapResourcesByReference = new Map<string, T>();
  resourcesByReference.forEach((resource, reference) => {
    if (materialMapReferences.has(reference)) {
      materialMapResourcesByReference.set(reference, resource);
    }
  });
  return materialMapResourcesByReference.size > 0
    ? materialMapResourcesByReference
    : resourcesByReference;
}

function resolvePlaceableModelMaterialMapTextureUrlsByReference(
  model: THREE.Object3D,
  textureUrlsByReference: Map<string, string>,
  options: {
    auroraMaterial?: PlaceableRenderPackageAuroraMaterial | null;
  } = {}
): Map<string, string> {
  return resolveModelMaterialMapResourcesByReference(model, textureUrlsByReference, options);
}

function resolvePlaceableModelVisibleMaterialMapTextureUrlsByReference(
  model: THREE.Object3D,
  textureUrlsByReference: Map<string, string>,
  options: {
    auroraMaterial?: PlaceableRenderPackageAuroraMaterial | null;
  } = {}
): Map<string, string> {
  return resolveModelMaterialMapResourcesByReference(model, textureUrlsByReference, {
    ...options,
    visibleOnly: true
  });
}

function resolveModelMaterialMapTexturesByReference(
  model: THREE.Object3D,
  texturesByReference: Map<string, THREE.Texture>,
  options: {
    auroraMaterial?: PlaceableRenderPackageAuroraMaterial | null;
  } = {}
): Map<string, THREE.Texture> {
  return resolveModelMaterialMapResourcesByReference(model, texturesByReference, options);
}

export function isPlaceableMaterialTextureSignatureAppliedForTests(
  model: THREE.Object3D,
  textureSignature: string,
  expectedTextureReferences?: ReadonlySet<string>
): boolean {
  return isPlaceableMaterialTextureSignatureApplied(
    model,
    textureSignature,
    expectedTextureReferences
  );
}

export function markPlaceableMaterialTextureSignatureForTests(
  model: THREE.Object3D,
  textureSignature: string,
  expectedTextureReferences?: ReadonlySet<string>
): void {
  markPlaceableMaterialTextureSignature(model, textureSignature, expectedTextureReferences);
}

export function summarizePlaceableModelMaterialTextureCoverageForTests(
  model: THREE.Object3D,
  expectedTextureReferences?: ReadonlySet<string>
): ReturnType<typeof summarizePlaceableModelMaterialTextureCoverage> {
  return summarizePlaceableModelMaterialTextureCoverage(model, expectedTextureReferences);
}

export function resolvePlaceableModelMaterialMapTextureUrlsByReferenceForTests(
  model: THREE.Object3D,
  textureUrlsByReference: Map<string, string>,
  options: {
    auroraMaterial?: PlaceableRenderPackageAuroraMaterial | null;
  } = {}
): Map<string, string> {
  return resolvePlaceableModelMaterialMapTextureUrlsByReference(
    model,
    textureUrlsByReference,
    options
  );
}

export function resolvePlaceableModelVisibleMaterialMapTextureUrlsByReferenceForTests(
  model: THREE.Object3D,
  textureUrlsByReference: Map<string, string>,
  options: {
    auroraMaterial?: PlaceableRenderPackageAuroraMaterial | null;
  } = {}
): Map<string, string> {
  return resolvePlaceableModelVisibleMaterialMapTextureUrlsByReference(
    model,
    textureUrlsByReference,
    options
  );
}

export function resolvePlaceableModelTextureSignatureForTests(
  textureUrlsByReference: Map<string, string>,
  textureDeliveryUrl?: string | null,
  textureBindings?: NonNullable<PlaceableViewportRenderPayload["renderPackage"]>["textureBindings"],
  auroraMaterial?: PlaceableRenderPackageAuroraMaterial | null
): string | null {
  return resolvePlaceableModelTextureSignature(
    textureUrlsByReference,
    textureDeliveryUrl,
    textureBindings,
    auroraMaterial
  );
}

function applyPlaceableTexturesToVfxChunkModels(
  chunkModelsByAssetId: Map<string, THREE.Object3D>,
  texturesByReference: Map<string, THREE.Texture>,
  fallbackTexture: THREE.Texture | undefined
): void {
  if (texturesByReference.size === 0 && !fallbackTexture) {
    return;
  }
  chunkModelsByAssetId.forEach((chunkModel) => {
    applyPlaceableTexturesToModel(chunkModel, texturesByReference, fallbackTexture);
  });
}

function inferPlaceablePreviewVfxPayload(object: SceneObject) {
  if (object.kind !== "placeables" || !object.id.startsWith("preview:")) {
    return undefined;
  }

  return buildVfxPayloadFromPlaceablePreview({
    templateId: object.id.slice("preview:".length) || object.id,
    resref: object.resRef,
    name: object.name ?? object.tag,
    kind: "placeables"
  });
}

function hasRenderableAuroraVfxEmitter(payload: PlaceableViewportRenderPayload): boolean {
  const emitters = payload.renderPackage?.auroraEmitter?.emitters;
  if (!Array.isArray(emitters) || emitters.length === 0) {
    return false;
  }
  return emitters.some((emitter) =>
    Boolean(
      emitter.renderMode ||
        emitter.emitterType ||
        emitter.texture ||
        emitter.chunkName ||
        emitter.simulation ||
        emitter.animations?.length
    )
  );
}

function isSourceMdlAuroraEmitterPayload(payload: PlaceableViewportRenderPayload): boolean {
  return payload.renderPackage?.auroraEmitter?.source === "source-mdl";
}

function hasRenderableAuroraVfxLight(payload: PlaceableViewportRenderPayload): boolean {
  const lights = payload.renderPackage?.auroraLight?.lights;
  if (!Array.isArray(lights) || lights.length === 0) {
    return false;
  }
  return lights.some((light) =>
    Boolean(
      light.nodeName ||
        light.radius ||
        light.multiplier ||
        light.color ||
        light.animations?.length
    )
  );
}

function hasAuroraVfxChunkModelEmitter(payload: PlaceableViewportRenderPayload): boolean {
  const emitters = payload.renderPackage?.auroraEmitter?.emitters;
  if (!Array.isArray(emitters) || emitters.length === 0) {
    return false;
  }
  return emitters.some(
    (emitter) => typeof emitter.chunkName === "string" && emitter.chunkName.trim().length > 0
  );
}

function writeAreaPrimitiveFallbackRenderSuppressionDiagnostics(
  runtime: RuntimeState,
  snapshot: AreaPrimitiveFallbackRenderSuppressionSnapshot
): void {
  runtime.container.dataset.areaPrimitiveFallbackRenderSuppressionSnapshot =
    JSON.stringify(snapshot);
  runtime.container.dataset.areaPrimitiveFallbackRenderSuppressionReason =
    snapshot.reason;
  runtime.container.dataset.areaPrimitiveFallbackRenderLimit = String(snapshot.renderLimit);
  runtime.container.dataset.areaPrimitiveFallbackCandidateCount = String(
    snapshot.candidateCount
  );
  runtime.container.dataset.areaPrimitiveFallbackRenderedCount = String(
    snapshot.renderedCount
  );
  runtime.container.dataset.areaPrimitiveFallbackSuppressedCount = String(
    snapshot.suppressedCount
  );
  runtime.container.dataset.areaPrimitiveFallbackSuppressedIds =
    snapshot.suppressedIds.join("|");
  runtime.container.dispatchEvent(
    new CustomEvent<AreaPrimitiveFallbackRenderSuppressionSnapshot>(
      AREA_PRIMITIVE_FALLBACK_RENDER_SUPPRESSION_EVENT,
      {
        detail: snapshot
      }
    )
  );
}

function disposeMeshResources(mesh: THREE.Mesh): void {
  if (mesh.geometry.userData?.[PLACEABLE_SHARED_MODEL_GEOMETRY_FLAG] !== true) {
    mesh.geometry.dispose();
  }
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  materials.forEach((entry) => {
    if (entry.userData?.[PLACEABLE_SHARED_MODEL_MATERIAL_FLAG] === true) {
      return;
    }
    entry.dispose();
  });
}

function writeCreaturePartModelRuntimeStatus(
  runtime: RuntimeState,
  status: string,
  details: Record<string, string | number | null> = {}
): void {
  const dataset = runtime.container?.dataset;
  if (!dataset) {
    return;
  }
  dataset.creaturePartModelRuntimeStatus = status;
  Object.entries(details).forEach(([key, value]) => {
    const dataKey = `creaturePartModelRuntime${key.charAt(0).toUpperCase()}${key.slice(1)}`;
    if (value === null) {
      delete dataset[dataKey];
      return;
    }
    dataset[dataKey] = String(value);
  });
}

function writeCreaturePartModelRuntimeDetails(
  runtime: RuntimeState,
  details: Record<string, string | number | null>
): void {
  const dataset = runtime.container?.dataset;
  if (!dataset) {
    return;
  }
  Object.entries(details).forEach(([key, value]) => {
    const dataKey = `creaturePartModelRuntime${key.charAt(0).toUpperCase()}${key.slice(1)}`;
    if (value === null) {
      delete dataset[dataKey];
      return;
    }
    dataset[dataKey] = String(value);
  });
}

type AreaTerrainOverlayTextureMaterial = THREE.Material & {
  map?: THREE.Texture | null;
  alphaMap?: THREE.Texture | null;
  alphaTest?: number;
  color?: THREE.Color;
};

function isAreaTerrainOverlayTextureMaterial(
  material: THREE.Material
): material is AreaTerrainOverlayTextureMaterial {
  return "map" in material || "alphaMap" in material || "color" in material;
}

function resolveAreaTerrainOverlayUnlitMaterial(
  material: THREE.Material,
  convertedMaterials: WeakMap<THREE.Material, THREE.Material>
): THREE.Material {
  const existing = convertedMaterials.get(material);
  if (existing) {
    return existing;
  }
  if (material instanceof THREE.MeshBasicMaterial) {
    material.userData = {
      ...material.userData,
      auroraAreaObjectLayerMaterialLightingMode:
        AREA_TERRAIN_OVERLAY_MATERIAL_LIGHTING_MODE,
      auroraAreaObjectLayerMaterialLightingModeSource:
        AREA_TERRAIN_OVERLAY_MATERIAL_LIGHTING_MODE_SOURCE
    };
    return material;
  }

  const source = isAreaTerrainOverlayTextureMaterial(material) ? material : null;
  const materialWithAlpha = material as THREE.Material & { alphaTest?: number };
  const basicColor = source?.map
    ? new THREE.Color(0xffffff)
    : source?.color instanceof THREE.Color
      ? source.color.clone()
      : new THREE.Color(0xffffff);
  const basicMaterial = new THREE.MeshBasicMaterial({
    name: material.name,
    map: source?.map ?? null,
    alphaMap: source?.alphaMap ?? null,
    color: basicColor,
    transparent: material.transparent,
    opacity: material.opacity,
    alphaTest:
      typeof materialWithAlpha.alphaTest === "number" &&
      Number.isFinite(materialWithAlpha.alphaTest)
        ? materialWithAlpha.alphaTest
        : 0,
    side: material.side,
    depthTest: material.depthTest,
    depthWrite: material.depthWrite,
    blending: material.blending,
    polygonOffset: material.polygonOffset,
    polygonOffsetFactor: material.polygonOffsetFactor,
    polygonOffsetUnits: material.polygonOffsetUnits,
    toneMapped: material.toneMapped,
    visible: material.visible
  });
  basicMaterial.userData = {
    ...material.userData,
    auroraAreaObjectLayerMaterialLightingMode:
      AREA_TERRAIN_OVERLAY_MATERIAL_LIGHTING_MODE,
    auroraAreaObjectLayerMaterialLightingModeSource:
      AREA_TERRAIN_OVERLAY_MATERIAL_LIGHTING_MODE_SOURCE,
    auroraAreaObjectLayerMaterialLightingConvertedFrom:
      material.type || material.constructor.name || "Material"
  };
  basicMaterial.needsUpdate = true;
  convertedMaterials.set(material, basicMaterial);
  return basicMaterial;
}

function applyAreaObjectToolsetLayering(root: THREE.Object3D, object: SceneObject): void {
  const overlayEvidence = resolveAreaTerrainOverlayEvidence(root, object);
  const isTerrainOverlay = overlayEvidence.isOverlay;
  const renderOrder = isTerrainOverlay
    ? overlayEvidence.renderOrder
    : AREA_SOLID_OBJECT_RENDER_ORDER;
  const physicalVisibilityEvidence =
    resolveAreaObjectToolsetPhysicalVisibilityEvidence(overlayEvidence);
  const convertedOverlayMaterials = new WeakMap<THREE.Material, THREE.Material>();
  let inspectedOverlayMaterialCount = 0;
  let convertedOverlayMaterialCount = 0;
  root.userData = {
    ...root.userData,
    auroraAreaObjectLayering: isTerrainOverlay ? "terrain-overlay" : "solid",
    auroraAreaObjectLayerRenderOrder: renderOrder,
    auroraAreaObjectLayeringReason: overlayEvidence.reason,
    auroraAreaObjectLayeringFootprint: overlayEvidence.footprint,
    auroraAreaObjectLayeringThickness: overlayEvidence.thickness,
    auroraAreaObjectLayeringIdentity: overlayEvidence.identity,
    auroraAreaObjectToolsetPhysicalVisibility:
      physicalVisibilityEvidence.hidden ? "hidden" : "visible",
    auroraAreaObjectToolsetPhysicalVisibilityReason:
      physicalVisibilityEvidence.reason,
    auroraAreaObjectToolsetPhysicalVisibilitySource:
      physicalVisibilityEvidence.source
  };
  const suppressedDamageStateMeshNames: string[] = [];
  root.traverse((node) => {
    node.renderOrder = Math.max(node.renderOrder, renderOrder);
    if (!(node instanceof THREE.Mesh)) {
      return;
    }
    const damageStateSuppressionMode =
      resolveInactiveAreaPlaceableDamageStateMeshSuppressionMode(node, object);
    if (damageStateSuppressionMode !== "none") {
      if (damageStateSuppressionMode === "node") {
        node.visible = false;
      } else {
        suppressInactiveAreaPlaceableDamageStateMeshSurface(node);
      }
      node.userData = {
        ...node.userData,
        auroraAreaInactiveDamageStateMeshSuppressed: true,
        auroraAreaInactiveDamageStateMeshSuppressionMode: damageStateSuppressionMode,
        auroraAreaInactiveDamageStateMeshSource:
          "Toolset oracle static area viewport does not render inactive placeable damage-state geometry; untextured damageXX meshes are hidden in normal Areas render"
      };
      suppressedDamageStateMeshNames.push(node.name || "unnamed");
    }
    let materials = Array.isArray(node.material) ? node.material : [node.material];
    if (isTerrainOverlay) {
      const nextMaterials = materials.map((material) => {
        inspectedOverlayMaterialCount += 1;
        const nextMaterial = resolveAreaTerrainOverlayUnlitMaterial(
          material,
          convertedOverlayMaterials
        );
        if (nextMaterial !== material) {
          convertedOverlayMaterialCount += 1;
        }
        return nextMaterial;
      });
      node.material = Array.isArray(node.material) ? nextMaterials : nextMaterials[0];
      materials = nextMaterials;
    }
    materials.forEach((material) => {
      if (!material) {
        return;
      }
      if (isTerrainOverlay) {
        material.transparent = true;
        material.depthTest = true;
        material.depthWrite = false;
        material.polygonOffset = true;
        material.polygonOffsetFactor = -1;
        material.polygonOffsetUnits = -1;
        material.userData = {
          ...material.userData,
          auroraAreaObjectLayering: "terrain-overlay",
          auroraAreaObjectLayerDepthPolicy:
            "Aurora floor/rug/stain placeables are terrain overlays; keep depth test while disabling depth writes so co-planar decals do not poison later solid placeable depth"
        };
      }
    });
  });
  root.userData = {
    ...root.userData,
    auroraAreaInactiveDamageStateMeshSuppressionStatus:
      suppressedDamageStateMeshNames.length > 0 ? "applied" : "not-applicable",
    auroraAreaInactiveDamageStateMeshSuppressedCount:
      suppressedDamageStateMeshNames.length,
    auroraAreaInactiveDamageStateMeshSuppressedNames:
      suppressedDamageStateMeshNames.join("|"),
    auroraAreaObjectLayerMaterialLightingMode: isTerrainOverlay
      ? AREA_TERRAIN_OVERLAY_MATERIAL_LIGHTING_MODE
      : "scene-lit",
    auroraAreaObjectLayerMaterialLightingInspectedCount: inspectedOverlayMaterialCount,
    auroraAreaObjectLayerMaterialLightingConvertedCount: convertedOverlayMaterialCount,
    auroraAreaObjectLayerMaterialLightingModeSource: isTerrainOverlay
      ? AREA_TERRAIN_OVERLAY_MATERIAL_LIGHTING_MODE_SOURCE
      : ""
  };
  if (physicalVisibilityEvidence.hidden) {
    root.visible = false;
  }
}

export function applyAreaObjectToolsetLayeringForTests(
  root: THREE.Object3D,
  object: SceneObject
): void {
  applyAreaObjectToolsetLayering(root, object);
}

type InactiveAreaPlaceableDamageStateMeshSuppressionMode = "none" | "node" | "surface";

function resolveAreaObjectIdentity(object: SceneObject): string {
  return [
    object.id,
    object.name,
    object.resRef,
    object.tag,
    object.source?.sourceObjectId,
    object.source?.templateId,
    object.source?.sourceModelResRef
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ");
}

function isAreaVisualTransformFloorPlanePlaceableSolid(
  object: SceneObject,
  identity: string,
  footprint: number,
  thickness: number
): boolean {
  return (
    object.kind === "placeables" &&
    object.source?.type === "aurora_git" &&
    object.isStatic === false &&
    isVisualTransformAppliedToObject(object) &&
    AREA_FLOOR_TERRAIN_OVERLAY_TOKEN_PATTERN.test(identity) &&
    footprint >= AREA_TERRAIN_OVERLAY_MIN_FOOTPRINT &&
    thickness <= AREA_TERRAIN_OVERLAY_MAX_THICKNESS
  );
}

function resolveAreaObjectToolsetPhysicalVisibilityEvidence(overlayEvidence: {
  readonly reason: string;
}): {
  readonly hidden: boolean;
  readonly reason: string;
  readonly source: string;
} {
  const hidden =
    overlayEvidence.reason === "visual-transform-floor-plane-toolset-hidden";
  return {
    hidden,
    reason: hidden ? overlayEvidence.reason : "toolset-physical-model-visible",
    source: hidden ? AREA_VISUAL_TRANSFORM_FLOOR_PLANE_TOOLSET_VISIBILITY_SOURCE : ""
  };
}

function shouldSuppressInactiveAreaPlaceableDamageStateMesh(
  node: THREE.Mesh,
  object: SceneObject
): boolean {
  return resolveInactiveAreaPlaceableDamageStateMeshSuppressionMode(node, object) !== "none";
}

function resolveInactiveAreaPlaceableDamageStateMeshSuppressionMode(
  node: THREE.Mesh,
  object: SceneObject
): InactiveAreaPlaceableDamageStateMeshSuppressionMode {
  if (object.kind !== "placeables") {
    return "none";
  }
  if (!/^damage(?:25|50|75|100)?$/iu.test(node.name.trim())) {
    return "none";
  }
  const materials = Array.isArray(node.material) ? node.material : [node.material];
  const hasInactiveDamageStateDefaultMaterial = materials.some((material) =>
    isInactiveAreaPlaceableDamageStateDefaultMaterial(material)
  );
  if (!hasInactiveDamageStateDefaultMaterial) {
    return "none";
  }
  return hasRenderableAreaPlaceableDamageStateDescendant(node) ? "surface" : "node";
}

function isInactiveAreaPlaceableDamageStateDefaultMaterial(
  material: THREE.Material | undefined
): boolean {
  if (!material) {
    return false;
  }
  const aurora = material.userData?.aurora as Record<string, unknown> | undefined;
  const textureReference =
    typeof aurora?.textureReference === "string"
      ? aurora.textureReference
      : typeof material.userData?.textureReference === "string"
        ? material.userData.textureReference
        : "";
  const hasTextureReference = textureReference.trim().length > 0;
  const hasMap = "map" in material && material.map instanceof THREE.Texture;
  return !hasTextureReference && !hasMap && /aurora default material/iu.test(material.name);
}

function hasRenderableAreaPlaceableDamageStateDescendant(node: THREE.Mesh): boolean {
  let hasRenderableDescendant = false;
  node.children.forEach((child) => {
    child.traverse((descendant) => {
      if (hasRenderableDescendant || !(descendant instanceof THREE.Mesh)) {
        return;
      }
      if (!isPlaceableRuntimeNodeEffectivelyVisible(descendant)) {
        return;
      }
      const materials = Array.isArray(descendant.material)
        ? descendant.material
        : [descendant.material];
      hasRenderableDescendant = materials.some((material) =>
        isRenderableAreaPlaceableDamageStateDescendantMaterial(material)
      );
    });
  });
  return hasRenderableDescendant;
}

function isRenderableAreaPlaceableDamageStateDescendantMaterial(
  material: THREE.Material | undefined
): boolean {
  if (!material || material.visible === false) {
    return false;
  }
  if ("map" in material && material.map instanceof THREE.Texture) {
    return true;
  }
  return (
    resolveSharedModelMapCandidateTextureReferences(
      material as THREE.Material & { map?: unknown }
    ).length > 0
  );
}

function suppressInactiveAreaPlaceableDamageStateMeshSurface(node: THREE.Mesh): void {
  const materials = Array.isArray(node.material) ? node.material : [node.material];
  materials.forEach((material) => {
    if (isInactiveAreaPlaceableDamageStateDefaultMaterial(material)) {
      material.visible = false;
      material.userData = {
        ...material.userData,
        auroraAreaInactiveDamageStateMeshSurfaceSuppressed: true
      };
    }
  });
}

function resolveAreaTerrainOverlayRenderOrder(object: SceneObject): number {
  const identity = resolveAreaObjectIdentity(object);
  if (AREA_RUG_TERRAIN_OVERLAY_TOKEN_PATTERN.test(identity)) {
    return AREA_TERRAIN_OVERLAY_OBJECT_RENDER_ORDER;
  }
  if (AREA_FLOOR_TERRAIN_OVERLAY_TOKEN_PATTERN.test(identity)) {
    return AREA_FLOOR_TERRAIN_OVERLAY_OBJECT_RENDER_ORDER;
  }
  return AREA_TERRAIN_OVERLAY_OBJECT_RENDER_ORDER;
}

function formatAreaObjectRuntimeVector(value: THREE.Vector3): string {
  return `${value.x},${value.y},${value.z}`;
}

function formatAreaObjectRuntimeBounds(box: THREE.Box3): string {
  if (box.isEmpty()) {
    return "empty";
  }
  return `${formatAreaObjectRuntimeVector(box.min)} -> ${formatAreaObjectRuntimeVector(box.max)}`;
}

function resolveAreaTerrainOverlayEvidence(
  root: THREE.Object3D,
  object: SceneObject
): {
  readonly isOverlay: boolean;
  readonly reason: string;
  readonly footprint: number;
  readonly thickness: number;
  readonly renderOrder: number;
  readonly identity: string;
} {
  const identity = resolveAreaObjectIdentity(object);
  const renderOrder = resolveAreaTerrainOverlayRenderOrder(object);
  const hasOverlayToken = AREA_TERRAIN_OVERLAY_TOKEN_PATTERN.test(identity);
  const isVisualRotationTerrainAligned =
    isAreaTerrainOverlayVisualRotationTerrainAligned(object);
  if (object.kind !== "placeables") {
    return {
      isOverlay: false,
      reason: "not-placeable",
      footprint: 0,
      thickness: 0,
      renderOrder,
      identity
    };
  }
  const bounds = new THREE.Box3().setFromObject(root);
  if (bounds.isEmpty()) {
    return {
      isOverlay: false,
      reason: "empty-bounds",
      footprint: 0,
      thickness: 0,
      renderOrder,
      identity
    };
  }
  const size = new THREE.Vector3();
  bounds.getSize(size);
  const footprint = Math.max(Math.abs(size.x), Math.abs(size.z));
  const thickness = Math.abs(size.y);
  const hasOverlayBounds =
    footprint >= AREA_TERRAIN_OVERLAY_MIN_FOOTPRINT &&
    thickness <= AREA_TERRAIN_OVERLAY_MAX_THICKNESS;
  const isDecalToken = AREA_DECAL_TERRAIN_OVERLAY_TOKEN_PATTERN.test(identity);
  if (
    isAreaVisualTransformFloorPlanePlaceableSolid(
      object,
      identity,
      footprint,
      thickness
    )
  ) {
    return {
      isOverlay: false,
      reason: "visual-transform-floor-plane-placeable-solid",
      footprint,
      thickness,
      renderOrder,
      identity
    };
  }
  const isOverlay =
    hasOverlayToken &&
    isVisualRotationTerrainAligned &&
    (hasOverlayBounds || isDecalToken);
  return {
    isOverlay,
    reason: isOverlay
      ? hasOverlayBounds
        ? hasOverlayToken
          ? "token-pattern-flat-bounds"
          : "flat-large-bounds"
        : "decal-token-pattern"
      : hasOverlayToken && !isVisualRotationTerrainAligned
        ? "visual-transform-tilted-off-terrain-overlay"
        : hasOverlayToken
          ? "token-pattern-bounds-not-flat-or-too-small"
          : "no-overlay-token",
    footprint,
    thickness,
    renderOrder,
    identity
  };
}

function isAreaTerrainOverlayVisualRotationTerrainAligned(object: SceneObject): boolean {
  const transform = object.visualTransform;
  if (!transform) {
    return true;
  }
  return (
    Math.abs(Math.sin(transform.pitch)) <= AREA_TERRAIN_OVERLAY_ROTATION_EPSILON &&
    Math.abs(Math.sin(transform.roll)) <= AREA_TERRAIN_OVERLAY_ROTATION_EPSILON
  );
}

function resolveAreaTerrainOverlayPresentationScale(
  root: THREE.Object3D,
  object: SceneObject
): number {
  void root;
  void object;
  return 1;
}

function applyAreaTerrainOverlayPresentationScale(
  root: THREE.Object3D,
  object: SceneObject
): void {
  const scale = resolveAreaTerrainOverlayPresentationScale(root, object);
  if (scale === 1) {
    return;
  }
  root.scale.multiplyScalar(scale);
}

function resolveAreaObjectModelSurfaceOffset(
  root: THREE.Object3D,
  object: SceneObject,
  anchorY = 0,
  parentScaleY = 1,
  terrainSurfaceEvidence?: AreaObjectTerrainSurfaceEvidence
): number {
  return resolveAreaObjectModelSurfaceOffsetEvidence(
    root,
    object,
    anchorY,
    parentScaleY,
    terrainSurfaceEvidence
  )
    ?.offset ?? 0;
}

export type AreaObjectTerrainSurfaceStatus =
  | "not-area-render"
  | "scene-missing"
  | "layer-missing"
  | "no-ground-meshes"
  | "no-hit"
  | "hit";

export interface AreaObjectTerrainSurfaceEvidence {
  readonly status: AreaObjectTerrainSurfaceStatus;
  readonly surfaceY: number;
  readonly worldX: number;
  readonly worldZ: number;
  readonly rayOriginY: number;
  readonly rayFar: number;
  readonly hitCount: number;
  readonly candidateMeshCount: number;
  readonly meshName: string;
  readonly tileId: string;
  readonly modelResRef: string;
}

type AreaObjectTerrainSurfaceClipStatus =
  | "not-applicable"
  | "visible"
  | "clipped";

interface AreaObjectTerrainSurfaceClipEvidence {
  readonly status: AreaObjectTerrainSurfaceClipStatus;
  readonly applied: boolean;
  readonly reason: string;
  readonly terrainSurfaceStatus: AreaObjectTerrainSurfaceStatus | "";
  readonly footprint: number;
  readonly height: number;
  readonly maxFootprint: number;
  readonly minHeight: number;
  readonly source: string;
}

function createEmptyAreaObjectTerrainSurfaceEvidence(
  status: Exclude<AreaObjectTerrainSurfaceStatus, "hit">,
  worldX: number,
  worldZ: number,
  candidateMeshCount = 0
): AreaObjectTerrainSurfaceEvidence {
  return {
    status,
    surfaceY: 0,
    worldX,
    worldZ,
    rayOriginY: AREA_TERRAIN_SURFACE_RAYCAST_TOP_Y,
    rayFar: AREA_TERRAIN_SURFACE_RAYCAST_FAR,
    hitCount: 0,
    candidateMeshCount,
    meshName: "",
    tileId: "",
    modelResRef: ""
  };
}

function isEffectivelyVisible(node: THREE.Object3D): boolean {
  let current: THREE.Object3D | null = node;
  while (current) {
    if (!current.visible) {
      return false;
    }
    current = current.parent;
  }
  return true;
}

function isAreaTerrainSurfaceCandidateMesh(node: THREE.Object3D): node is THREE.Mesh {
  return (
    node instanceof THREE.Mesh &&
    isEffectivelyVisible(node) &&
    node.userData?.auroraTerrainGroundSurfaceDepthWrite === "disabled"
  );
}

function findAreaTerrainTileModelRoot(node: THREE.Object3D): THREE.Object3D | null {
  let current: THREE.Object3D | null = node;
  while (current) {
    if (typeof current.userData?.auroraTerrainTileId === "string") {
      return current;
    }
    current = current.parent;
  }
  return null;
}

function resolveAreaObjectTerrainSurfaceEvidence(
  runtime: RuntimeState,
  renderAreaGeometry: boolean,
  areaWidth: number,
  localAnchorX: number,
  localAnchorZ: number
): AreaObjectTerrainSurfaceEvidence {
  void areaWidth;
  const worldX = localAnchorX;
  const worldZ = localAnchorZ;
  if (!renderAreaGeometry) {
    return createEmptyAreaObjectTerrainSurfaceEvidence(
      "not-area-render",
      worldX,
      worldZ
    );
  }
  if (!runtime.scene) {
    return createEmptyAreaObjectTerrainSurfaceEvidence("scene-missing", worldX, worldZ);
  }
  const layer = runtime.scene.getObjectByName(AREA_TERRAIN_TILE_MODEL_LAYER_NAME);
  if (!layer) {
    return createEmptyAreaObjectTerrainSurfaceEvidence("layer-missing", worldX, worldZ);
  }
  layer.updateWorldMatrix(true, true);

  const candidates: THREE.Mesh[] = [];
  layer.traverse((node) => {
    if (isAreaTerrainSurfaceCandidateMesh(node)) {
      candidates.push(node);
    }
  });
  if (candidates.length === 0) {
    return createEmptyAreaObjectTerrainSurfaceEvidence(
      "no-ground-meshes",
      worldX,
      worldZ
    );
  }

  const raycaster = new THREE.Raycaster(
    new THREE.Vector3(worldX, AREA_TERRAIN_SURFACE_RAYCAST_TOP_Y, worldZ),
    new THREE.Vector3(0, -1, 0),
    0,
    AREA_TERRAIN_SURFACE_RAYCAST_FAR
  );
  const hits = raycaster.intersectObjects(candidates, false);
  if (hits.length === 0) {
    return createEmptyAreaObjectTerrainSurfaceEvidence(
      "no-hit",
      worldX,
      worldZ,
      candidates.length
    );
  }

  const hit = hits[0];
  const hitObject = hit.object;
  const tileRoot = findAreaTerrainTileModelRoot(hitObject);
  return {
    status: "hit",
    surfaceY: hit.point.y,
    worldX,
    worldZ,
    rayOriginY: AREA_TERRAIN_SURFACE_RAYCAST_TOP_Y,
    rayFar: AREA_TERRAIN_SURFACE_RAYCAST_FAR,
    hitCount: hits.length,
    candidateMeshCount: candidates.length,
    meshName: hitObject.name || "unnamed",
    tileId: String(tileRoot?.userData.auroraTerrainTileId ?? ""),
    modelResRef: String(tileRoot?.userData.auroraTerrainTileModelResRef ?? "")
  };
}

function resolveAreaObjectModelSurfaceOffsetEvidence(
  root: THREE.Object3D,
  object: SceneObject,
  anchorY = 0,
  parentScaleY = 1,
  terrainSurfaceEvidence?: AreaObjectTerrainSurfaceEvidence
): {
  readonly offset: number;
  readonly rawOffset: number;
  readonly targetMinY: number;
  readonly anchorY: number;
  readonly parentScaleY: number;
  readonly beforeBounds: string;
  readonly beforeSizeX: number;
  readonly beforeSizeY: number;
  readonly beforeSizeZ: number;
  readonly afterBounds: string;
  readonly afterSizeX: number;
  readonly afterSizeY: number;
  readonly afterSizeZ: number;
  readonly beforeMinY: number;
  readonly beforeMaxY: number;
  readonly afterMinY: number;
  readonly afterMaxY: number;
  readonly liftTarget: "source-anchor" | "terrain-overlay";
  readonly terrainSurfaceStatus: AreaObjectTerrainSurfaceStatus | "";
  readonly terrainSurfaceY: number;
  readonly terrainSurfaceWorldX: number;
  readonly terrainSurfaceWorldZ: number;
  readonly terrainSurfaceRayOriginY: number;
  readonly terrainSurfaceRayFar: number;
  readonly terrainSurfaceHitCount: number;
  readonly terrainSurfaceCandidateMeshCount: number;
  readonly terrainSurfaceMeshName: string;
  readonly terrainSurfaceTileId: string;
  readonly terrainSurfaceModelResRef: string;
  readonly overlayReason: string;
  readonly overlayFootprint: number;
  readonly overlayThickness: number;
  readonly overlayRenderOrder: number;
  readonly clamped: boolean;
} | null {
  if (object.kind !== "placeables" && object.kind !== "doors") {
    return null;
  }
  const bounds = new THREE.Box3().setFromObject(root);
  if (bounds.isEmpty()) {
    return null;
  }
  const overlayEvidence = resolveAreaTerrainOverlayEvidence(root, object);
  const liftTarget = overlayEvidence.isOverlay ? "terrain-overlay" : "source-anchor";
  const effectiveParentScaleY =
    Number.isFinite(parentScaleY) && Math.abs(parentScaleY) > 1e-6
      ? parentScaleY
      : 1;
  const currentTargetMinY = anchorY + bounds.min.y * effectiveParentScaleY;
  const terrainOverlayTargetMinY =
    liftTarget === "terrain-overlay" && terrainSurfaceEvidence?.status === "hit"
      ? Math.max(anchorY, terrainSurfaceEvidence.surfaceY) +
        AREA_TERRAIN_OVERLAY_SURFACE_EPSILON
      : null;
  const rawOffset =
    terrainOverlayTargetMinY !== null && currentTargetMinY < terrainOverlayTargetMinY
      ? (terrainOverlayTargetMinY - anchorY) / effectiveParentScaleY - bounds.min.y
      : 0;
  const offset = rawOffset;
  const targetMinY = anchorY + (bounds.min.y + offset) * effectiveParentScaleY;
  const beforeSize = new THREE.Vector3();
  bounds.getSize(beforeSize);
  const afterBounds = bounds.clone().translate(new THREE.Vector3(0, offset, 0));
  const afterSize = new THREE.Vector3();
  afterBounds.getSize(afterSize);
  return {
    offset,
    rawOffset,
    targetMinY,
    anchorY,
    parentScaleY: effectiveParentScaleY,
    beforeBounds: formatAreaObjectRuntimeBounds(bounds),
    beforeSizeX: beforeSize.x,
    beforeSizeY: beforeSize.y,
    beforeSizeZ: beforeSize.z,
    afterBounds: formatAreaObjectRuntimeBounds(afterBounds),
    afterSizeX: afterSize.x,
    afterSizeY: afterSize.y,
    afterSizeZ: afterSize.z,
    beforeMinY: bounds.min.y,
    beforeMaxY: bounds.max.y,
    afterMinY: bounds.min.y + offset,
    afterMaxY: bounds.max.y + offset,
    liftTarget,
    terrainSurfaceStatus: terrainSurfaceEvidence?.status ?? "",
    terrainSurfaceY: terrainSurfaceEvidence?.surfaceY ?? 0,
    terrainSurfaceWorldX: terrainSurfaceEvidence?.worldX ?? 0,
    terrainSurfaceWorldZ: terrainSurfaceEvidence?.worldZ ?? 0,
    terrainSurfaceRayOriginY: terrainSurfaceEvidence?.rayOriginY ?? 0,
    terrainSurfaceRayFar: terrainSurfaceEvidence?.rayFar ?? 0,
    terrainSurfaceHitCount: terrainSurfaceEvidence?.hitCount ?? 0,
    terrainSurfaceCandidateMeshCount: terrainSurfaceEvidence?.candidateMeshCount ?? 0,
    terrainSurfaceMeshName: terrainSurfaceEvidence?.meshName ?? "",
    terrainSurfaceTileId: terrainSurfaceEvidence?.tileId ?? "",
    terrainSurfaceModelResRef: terrainSurfaceEvidence?.modelResRef ?? "",
    overlayReason: overlayEvidence.reason,
    overlayFootprint: overlayEvidence.footprint,
    overlayThickness: overlayEvidence.thickness,
    overlayRenderOrder: overlayEvidence.renderOrder,
    clamped: Math.abs(offset - rawOffset) > 1e-6
  };
}

function isAuroraGitAreaPlaceableSourceAnchor(object: SceneObject): boolean {
  const sourceKind = String(object.source?.sourceKind ?? "");
  return (
    object.kind === "placeables" &&
    object.source?.type === "aurora_git" &&
    (sourceKind === "placeable" || sourceKind === "placeables")
  );
}

function normalizeAreaObjectSourceKey(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function isAuroraGitToolsetScaffoldHelper(object: SceneObject): boolean {
  if (!isAuroraGitAreaPlaceableSourceAnchor(object)) {
    return false;
  }

  const tag = normalizeAreaObjectSourceKey(object.tag);
  const resRef = normalizeAreaObjectSourceKey(object.resRef);
  const templateId = normalizeAreaObjectSourceKey(object.source?.templateId);
  const sourceModelResRef = normalizeAreaObjectSourceKey(
    object.source?.sourceModelResRef
  );
  return (
    tag === "scaffold_segment" &&
    (resRef === "other_001" || templateId === "plc_other_001") &&
    (sourceModelResRef === "zlc_fky_b15" ||
      object.source?.appearanceType === 8810)
  );
}

function resolveAreaObjectTerrainSurfaceClipEvidence(
  root: THREE.Object3D,
  object: SceneObject,
  terrainSurfaceEvidence?: AreaObjectTerrainSurfaceEvidence
): AreaObjectTerrainSurfaceClipEvidence {
  const evidenceSource =
    "Toolset oracle top-down screenshot treats area_enon_bakery scaffold_segment/other_001/zlc_fky_b15 placeables as helper markers rather than physical render geometry; runtime evidence showed this class as visible thin source anchors even when terrainSurface=hit";
  const baseEvidence = {
    maxFootprint: AREA_OBJECT_NO_TERRAIN_THIN_SOURCE_ANCHOR_MAX_FOOTPRINT,
    minHeight: AREA_OBJECT_NO_TERRAIN_THIN_SOURCE_ANCHOR_MIN_HEIGHT,
    source: evidenceSource
  };

  if (!isAuroraGitAreaPlaceableSourceAnchor(object)) {
    return {
      ...baseEvidence,
      status: "not-applicable",
      applied: false,
      reason: "not-aurora-git-placeable-source-anchor",
      terrainSurfaceStatus: terrainSurfaceEvidence?.status ?? "",
      footprint: 0,
      height: 0
    };
  }

  if (isAuroraGitToolsetScaffoldHelper(object)) {
    const bounds = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3();
    if (!bounds.isEmpty()) {
      bounds.getSize(size);
    }
    return {
      ...baseEvidence,
      status: "visible",
      applied: false,
      reason: "toolset-scaffold-helper-marker-visible",
      terrainSurfaceStatus: terrainSurfaceEvidence?.status ?? "",
      footprint: Math.max(size.x, size.z),
      height: size.y
    };
  }

  if (terrainSurfaceEvidence?.status !== "no-hit") {
    return {
      ...baseEvidence,
      status: "visible",
      applied: false,
      reason: terrainSurfaceEvidence?.status
        ? `terrain-surface-${terrainSurfaceEvidence.status}`
        : "terrain-surface-missing",
      terrainSurfaceStatus: terrainSurfaceEvidence?.status ?? "",
      footprint: 0,
      height: 0
    };
  }

  const bounds = new THREE.Box3().setFromObject(root);
  if (bounds.isEmpty()) {
    return {
      ...baseEvidence,
      status: "visible",
      applied: false,
      reason: "model-bounds-empty",
      terrainSurfaceStatus: terrainSurfaceEvidence.status,
      footprint: 0,
      height: 0
    };
  }

  const size = new THREE.Vector3();
  bounds.getSize(size);
  const footprint = Math.max(size.x, size.z);
  const isThinSourceAnchor =
    footprint <= AREA_OBJECT_NO_TERRAIN_THIN_SOURCE_ANCHOR_MAX_FOOTPRINT &&
    size.y >= AREA_OBJECT_NO_TERRAIN_THIN_SOURCE_ANCHOR_MIN_HEIGHT;

  return {
    ...baseEvidence,
    status: isThinSourceAnchor ? "clipped" : "visible",
    applied: isThinSourceAnchor,
    reason: isThinSourceAnchor
      ? "thin-source-anchor-no-terrain-surface"
      : "no-hit-model-not-thin-source-anchor",
    terrainSurfaceStatus: terrainSurfaceEvidence.status,
    footprint,
    height: size.y
  };
}

function writeAreaObjectTerrainSurfaceClipEvidence(
  target: THREE.Object3D,
  evidence: AreaObjectTerrainSurfaceClipEvidence
): void {
  target.userData = {
    ...target.userData,
    auroraAreaObjectTerrainSurfaceClipStatus: evidence.status,
    auroraAreaObjectTerrainSurfaceClipApplied: evidence.applied,
    auroraAreaObjectTerrainSurfaceClipReason: evidence.reason,
    auroraAreaObjectTerrainSurfaceClipTerrainSurfaceStatus:
      evidence.terrainSurfaceStatus,
    auroraAreaObjectTerrainSurfaceClipFootprint: evidence.footprint,
    auroraAreaObjectTerrainSurfaceClipHeight: evidence.height,
    auroraAreaObjectTerrainSurfaceClipMaxFootprint: evidence.maxFootprint,
    auroraAreaObjectTerrainSurfaceClipMinHeight: evidence.minHeight,
    auroraAreaObjectTerrainSurfaceClipSource: evidence.source
  };
}

function applyAreaObjectTerrainSurfaceClip(
  root: THREE.Object3D,
  model: THREE.Object3D,
  object: SceneObject,
  terrainSurfaceEvidence?: AreaObjectTerrainSurfaceEvidence
): AreaObjectTerrainSurfaceClipEvidence {
  const evidence = resolveAreaObjectTerrainSurfaceClipEvidence(
    model,
    object,
    terrainSurfaceEvidence
  );
  writeAreaObjectTerrainSurfaceClipEvidence(model, evidence);
  writeAreaObjectTerrainSurfaceClipEvidence(root, evidence);
  if (evidence.applied) {
    root.visible = false;
    model.visible = false;
  }
  return evidence;
}

function applyAreaObjectModelSurfaceOffset(
  root: THREE.Object3D,
  object: SceneObject,
  anchorY = 0,
  parentScaleY = 1,
  terrainSurfaceEvidence?: AreaObjectTerrainSurfaceEvidence
): void {
  const evidence = resolveAreaObjectModelSurfaceOffsetEvidence(
    root,
    object,
    anchorY,
    parentScaleY,
    terrainSurfaceEvidence
  );
  if (!evidence) {
    return;
  }
  if (Math.abs(evidence.offset) > 1e-6) {
    root.position.y += evidence.offset;
  }
  root.userData = {
    ...root.userData,
    auroraAreaObjectModelSurfaceOffset: evidence.offset,
    auroraAreaObjectModelSurfaceRawOffset: evidence.rawOffset,
    auroraAreaObjectModelSurfaceAnchorY: evidence.anchorY,
    auroraAreaObjectModelSurfaceParentScaleY: evidence.parentScaleY,
    auroraAreaObjectModelSurfaceTargetMinY: evidence.targetMinY,
    auroraAreaObjectModelSurfaceBeforeBounds: evidence.beforeBounds,
    auroraAreaObjectModelSurfaceBeforeSizeX: evidence.beforeSizeX,
    auroraAreaObjectModelSurfaceBeforeSizeY: evidence.beforeSizeY,
    auroraAreaObjectModelSurfaceBeforeSizeZ: evidence.beforeSizeZ,
    auroraAreaObjectModelSurfaceAfterBounds: evidence.afterBounds,
    auroraAreaObjectModelSurfaceAfterSizeX: evidence.afterSizeX,
    auroraAreaObjectModelSurfaceAfterSizeY: evidence.afterSizeY,
    auroraAreaObjectModelSurfaceAfterSizeZ: evidence.afterSizeZ,
    auroraAreaObjectModelSurfaceBeforeMinY: evidence.beforeMinY,
    auroraAreaObjectModelSurfaceBeforeMaxY: evidence.beforeMaxY,
    auroraAreaObjectModelSurfaceAfterMinY: evidence.afterMinY,
    auroraAreaObjectModelSurfaceAfterMaxY: evidence.afterMaxY,
    auroraAreaObjectModelSurfaceLiftTarget: evidence.liftTarget,
    auroraAreaObjectModelSurfaceTerrainSurfaceStatus:
      evidence.terrainSurfaceStatus,
    auroraAreaObjectModelSurfaceTerrainSurfaceY: evidence.terrainSurfaceY,
    auroraAreaObjectModelSurfaceTerrainSurfaceWorldX:
      evidence.terrainSurfaceWorldX,
    auroraAreaObjectModelSurfaceTerrainSurfaceWorldZ:
      evidence.terrainSurfaceWorldZ,
    auroraAreaObjectModelSurfaceTerrainSurfaceRayOriginY:
      evidence.terrainSurfaceRayOriginY,
    auroraAreaObjectModelSurfaceTerrainSurfaceRayFar:
      evidence.terrainSurfaceRayFar,
    auroraAreaObjectModelSurfaceTerrainSurfaceHitCount:
      evidence.terrainSurfaceHitCount,
    auroraAreaObjectModelSurfaceTerrainSurfaceCandidateMeshCount:
      evidence.terrainSurfaceCandidateMeshCount,
    auroraAreaObjectModelSurfaceTerrainSurfaceMeshName:
      evidence.terrainSurfaceMeshName,
    auroraAreaObjectModelSurfaceTerrainSurfaceTileId:
      evidence.terrainSurfaceTileId,
    auroraAreaObjectModelSurfaceTerrainSurfaceModelResRef:
      evidence.terrainSurfaceModelResRef,
    auroraAreaObjectModelSurfaceOverlayReason: evidence.overlayReason,
    auroraAreaObjectModelSurfaceOverlayFootprint: evidence.overlayFootprint,
    auroraAreaObjectModelSurfaceOverlayThickness: evidence.overlayThickness,
    auroraAreaObjectModelSurfaceOverlayRenderOrder: evidence.overlayRenderOrder,
    auroraAreaObjectModelSurfaceOffsetClamped: evidence.clamped
  };
}

const AREA_OBJECT_MODEL_SURFACE_EVIDENCE_KEYS = [
  "auroraAreaObjectModelSurfaceOffset",
  "auroraAreaObjectModelSurfaceRawOffset",
  "auroraAreaObjectModelSurfaceAnchorY",
  "auroraAreaObjectModelSurfaceParentScaleY",
  "auroraAreaObjectModelSurfaceTargetMinY",
  "auroraAreaObjectModelSurfaceBeforeBounds",
  "auroraAreaObjectModelSurfaceBeforeSizeX",
  "auroraAreaObjectModelSurfaceBeforeSizeY",
  "auroraAreaObjectModelSurfaceBeforeSizeZ",
  "auroraAreaObjectModelSurfaceAfterBounds",
  "auroraAreaObjectModelSurfaceAfterSizeX",
  "auroraAreaObjectModelSurfaceAfterSizeY",
  "auroraAreaObjectModelSurfaceAfterSizeZ",
  "auroraAreaObjectModelSurfaceBeforeMinY",
  "auroraAreaObjectModelSurfaceBeforeMaxY",
  "auroraAreaObjectModelSurfaceAfterMinY",
  "auroraAreaObjectModelSurfaceAfterMaxY",
  "auroraAreaObjectModelSurfaceLiftTarget",
  "auroraAreaObjectModelSurfaceTerrainSurfaceStatus",
  "auroraAreaObjectModelSurfaceTerrainSurfaceY",
  "auroraAreaObjectModelSurfaceTerrainSurfaceWorldX",
  "auroraAreaObjectModelSurfaceTerrainSurfaceWorldZ",
  "auroraAreaObjectModelSurfaceTerrainSurfaceRayOriginY",
  "auroraAreaObjectModelSurfaceTerrainSurfaceRayFar",
  "auroraAreaObjectModelSurfaceTerrainSurfaceHitCount",
  "auroraAreaObjectModelSurfaceTerrainSurfaceCandidateMeshCount",
  "auroraAreaObjectModelSurfaceTerrainSurfaceMeshName",
  "auroraAreaObjectModelSurfaceTerrainSurfaceTileId",
  "auroraAreaObjectModelSurfaceTerrainSurfaceModelResRef",
  "auroraAreaObjectModelSurfaceOverlayReason",
  "auroraAreaObjectModelSurfaceOverlayFootprint",
  "auroraAreaObjectModelSurfaceOverlayThickness",
  "auroraAreaObjectModelSurfaceOverlayRenderOrder",
  "auroraAreaObjectModelSurfaceOffsetClamped",
  "auroraAreaObjectTerrainSurfaceClipStatus",
  "auroraAreaObjectTerrainSurfaceClipApplied",
  "auroraAreaObjectTerrainSurfaceClipReason",
  "auroraAreaObjectTerrainSurfaceClipTerrainSurfaceStatus",
  "auroraAreaObjectTerrainSurfaceClipFootprint",
  "auroraAreaObjectTerrainSurfaceClipHeight",
  "auroraAreaObjectTerrainSurfaceClipMaxFootprint",
  "auroraAreaObjectTerrainSurfaceClipMinHeight",
  "auroraAreaObjectTerrainSurfaceClipSource"
] as const;

const AREA_OBJECT_MODEL_LAYERING_EVIDENCE_KEYS = [
  "auroraAreaObjectLayering",
  "auroraAreaObjectLayerRenderOrder",
  "auroraAreaObjectLayeringReason",
  "auroraAreaObjectLayeringFootprint",
  "auroraAreaObjectLayeringThickness",
  "auroraAreaObjectLayeringIdentity",
  "auroraAreaObjectToolsetPhysicalVisibility",
  "auroraAreaObjectToolsetPhysicalVisibilityReason",
  "auroraAreaObjectToolsetPhysicalVisibilitySource"
] as const;

const AREA_OBJECT_INACTIVE_DAMAGE_STATE_EVIDENCE_KEYS = [
  "auroraAreaInactiveDamageStateMeshSuppressionStatus",
  "auroraAreaInactiveDamageStateMeshSuppressedCount",
  "auroraAreaInactiveDamageStateMeshSuppressedNames"
] as const;

function copyAreaObjectModelSurfaceEvidence(
  target: THREE.Object3D,
  source: THREE.Object3D
): void {
  const evidence: Record<string, unknown> = {};
  [
    ...AREA_OBJECT_MODEL_SURFACE_EVIDENCE_KEYS,
    ...AREA_OBJECT_MODEL_LAYERING_EVIDENCE_KEYS,
    ...AREA_OBJECT_INACTIVE_DAMAGE_STATE_EVIDENCE_KEYS
  ].forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(source.userData, key)) {
      evidence[key] = source.userData[key];
    }
  });
  if (Object.keys(evidence).length === 0) {
    return;
  }
  target.userData = {
    ...target.userData,
    ...evidence
  };
}

export function resolveAreaTerrainOverlayPresentationScaleForTests(
  root: THREE.Object3D,
  object: SceneObject
): number {
  return resolveAreaTerrainOverlayPresentationScale(root, object);
}

export function resolveAreaObjectModelSurfaceLiftForTests(
  root: THREE.Object3D,
  object: SceneObject,
  anchorY = 0,
  parentScaleY = 1,
  terrainSurfaceEvidence?: AreaObjectTerrainSurfaceEvidence
): number {
  return resolveAreaObjectModelSurfaceOffset(
    root,
    object,
    anchorY,
    parentScaleY,
    terrainSurfaceEvidence
  );
}

export function resolveAreaObjectTerrainSurfaceEvidenceForTests(
  runtime: RuntimeState,
  renderAreaGeometry: boolean,
  areaWidth: number,
  localAnchorX: number,
  localAnchorZ: number
): AreaObjectTerrainSurfaceEvidence {
  return resolveAreaObjectTerrainSurfaceEvidence(
    runtime,
    renderAreaGeometry,
    areaWidth,
    localAnchorX,
    localAnchorZ
  );
}

export function resolveAreaObjectTerrainSurfaceClipForTests(
  root: THREE.Object3D,
  object: SceneObject,
  terrainSurfaceEvidence?: AreaObjectTerrainSurfaceEvidence
): AreaObjectTerrainSurfaceClipEvidence {
  return resolveAreaObjectTerrainSurfaceClipEvidence(
    root,
    object,
    terrainSurfaceEvidence
  );
}

export function resolveAreaTerrainOverlayRenderOrderForTests(object: SceneObject): number {
  return resolveAreaTerrainOverlayRenderOrder(object);
}

export function shouldSuppressInactiveAreaPlaceableDamageStateMeshForTests(
  node: THREE.Mesh,
  object: SceneObject
): boolean {
  return shouldSuppressInactiveAreaPlaceableDamageStateMesh(node, object);
}

export function resolveInactiveAreaPlaceableDamageStateMeshSuppressionModeForTests(
  node: THREE.Mesh,
  object: SceneObject
): InactiveAreaPlaceableDamageStateMeshSuppressionMode {
  return resolveInactiveAreaPlaceableDamageStateMeshSuppressionMode(node, object);
}

export function resolveSceneObjectRenderBaseY(
  isPrimitiveObject: boolean,
  objectRadius: number,
  geometry?: THREE.BufferGeometry | null
): number {
  if (!isPrimitiveObject) {
    return 0;
  }
  if (geometry) {
    geometry.computeBoundingBox();
    const minY = geometry.boundingBox?.min.y;
    if (typeof minY === "number" && Number.isFinite(minY)) {
      return -minY + 0.012;
    }
  }
  return objectRadius + 0.012;
}

const IDENTITY_VISUAL_TRANSFORM: SceneObject["visualTransform"] = {
  scale: 1,
  scaleX: 1,
  scaleY: 1,
  scaleZ: 1,
  offsetX: 0,
  offsetY: 0,
  offsetZ: 0,
  pitch: 0,
  roll: 0,
  yaw: 0
};

const AURORA_TO_THREE_VISUAL_BASIS = new THREE.Matrix4().set(
  1, 0, 0, 0,
  0, 0, 1, 0,
  0, 1, 0, 0,
  0, 0, 0, 1
);
const THREE_TO_AURORA_VISUAL_BASIS = AURORA_TO_THREE_VISUAL_BASIS.clone().invert();
const AURORA_VISUAL_AXIS_X = new THREE.Vector3(1, 0, 0);
const AURORA_VISUAL_AXIS_Y = new THREE.Vector3(0, 1, 0);
const AURORA_VISUAL_AXIS_Z = new THREE.Vector3(0, 0, 1);

function resolveObjectEffectiveVisualTransform(object: SceneObject): SceneObject["visualTransform"] {
  return isVisualTransformAppliedToObject(object)
    ? object.visualTransform
    : IDENTITY_VISUAL_TRANSFORM;
}

function applyAuroraAreaObjectLayerRenderFrame(
  runtime: RuntimeState,
  renderAreaGeometry: boolean,
  areaWidth: number
): void {
  if (!renderAreaGeometry) {
    runtime.objectLayer.position.x = 0;
    runtime.objectLayer.scale.x = 1;
    runtime.boundsLayer.position.x = 0;
    runtime.boundsLayer.scale.x = 1;
    delete runtime.objectLayer.userData.auroraAreaRenderFrameMirror;
    delete runtime.objectLayer.userData.auroraAreaRenderFrameMirrorWidth;
    delete runtime.boundsLayer.userData.auroraAreaRenderFrameMirror;
    delete runtime.boundsLayer.userData.auroraAreaRenderFrameMirrorWidth;
    return;
  }
  const mirrorWidth = Math.max(1, areaWidth);
  runtime.objectLayer.position.x = mirrorWidth;
  runtime.objectLayer.scale.x = -Math.abs(runtime.objectLayer.scale.x || 1);
  runtime.objectLayer.userData.auroraAreaRenderFrameMirror = "coordinate-x";
  runtime.objectLayer.userData.auroraAreaRenderFrameMirrorWidth = mirrorWidth;
  runtime.boundsLayer.position.x = mirrorWidth;
  runtime.boundsLayer.scale.x = -Math.abs(runtime.boundsLayer.scale.x || 1);
  runtime.boundsLayer.userData.auroraAreaRenderFrameMirror = "coordinate-x";
  runtime.boundsLayer.userData.auroraAreaRenderFrameMirrorWidth = mirrorWidth;
}

export function applyAuroraAreaObjectLayerRenderFrameForTests(
  runtime: RuntimeState,
  renderAreaGeometry: boolean,
  areaWidth: number
): void {
  applyAuroraAreaObjectLayerRenderFrame(runtime, renderAreaGeometry, areaWidth);
}

interface StoredObjectScaleVector {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

function toStoredObjectScaleVector(vector: THREE.Vector3): StoredObjectScaleVector {
  return {
    x: vector.x,
    y: vector.y,
    z: vector.z
  };
}

function readStoredObjectScaleVector(value: unknown): THREE.Vector3 | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const x = record.x;
  const y = record.y;
  const z = record.z;
  if (
    typeof x !== "number" ||
    typeof y !== "number" ||
    typeof z !== "number" ||
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(z)
  ) {
    return null;
  }
  return new THREE.Vector3(x, y, z);
}

function applyStoredObjectSelectionScale(
  root: THREE.Object3D,
  selected: boolean
): void {
  const vectorKey = selected
    ? AREA_OBJECT_SELECTED_SCALE_VECTOR_KEY
    : AREA_OBJECT_BASE_SCALE_VECTOR_KEY;
  const storedVector = readStoredObjectScaleVector(root.userData?.[vectorKey]);
  if (storedVector) {
    root.scale.copy(storedVector);
    return;
  }
  const baseScale = Number(root.userData?.[AREA_OBJECT_BASE_SCALE_KEY] ?? root.scale.x);
  const selectedScale = Number(
    root.userData?.[AREA_OBJECT_SELECTED_SCALE_KEY] ?? baseScale * 1.16
  );
  root.scale.setScalar(selected ? selectedScale : baseScale);
}

function resolveObjectVisualScaleVector(
  transform: SceneObject["visualTransform"],
  selectedScaleFactor = 1
): THREE.Vector3 {
  const scaleX = Math.max(0.01, transform.scaleX ?? transform.scale);
  const scaleY = Math.max(0.01, transform.scaleY ?? transform.scale);
  const scaleZ = Math.max(0.01, transform.scaleZ ?? transform.scale);
  return new THREE.Vector3(
    scaleX * selectedScaleFactor,
    scaleZ * selectedScaleFactor,
    scaleY * selectedScaleFactor
  );
}

function resolveObjectVisualRotationEuler(
  transform: SceneObject["visualTransform"],
  bearing: number,
  resolveRenderYaw: (yaw: number) => number,
  renderAreaGeometry: boolean,
  object?: SceneObject
): THREE.Euler {
  return new THREE.Euler().setFromQuaternion(
    resolveObjectVisualRotationQuaternion(
      transform,
      bearing,
      resolveRenderYaw,
      renderAreaGeometry,
      object
    )
  );
}

function applyObjectVisualTransformToRenderNode({
  node,
  position,
  transform,
  bearing,
  resolveRenderYaw,
  renderAreaGeometry,
  selectedScaleFactor = 1,
  object
}: {
  readonly node: THREE.Object3D;
  readonly position: THREE.Vector3;
  readonly transform: SceneObject["visualTransform"];
  readonly bearing: number;
  readonly resolveRenderYaw: (yaw: number) => number;
  readonly renderAreaGeometry: boolean;
  readonly selectedScaleFactor?: number;
  readonly object?: SceneObject;
}): void {
  if (renderAreaGeometry) {
    const transformMatrix = resolveAreaObjectFinalVisualTransformMatrix(
      position,
      transform,
      bearing,
      resolveRenderYaw,
      selectedScaleFactor
    );
    transformMatrix.decompose(node.position, node.quaternion, node.scale);
    node.updateMatrix();
    return;
  }

  node.position.copy(position);
  node.quaternion.copy(
    resolveObjectVisualRotationQuaternion(
      transform,
      bearing,
      resolveRenderYaw,
      renderAreaGeometry,
      object
    )
  );
  node.scale.copy(resolveObjectVisualScaleVector(transform, selectedScaleFactor));
  node.updateMatrix();
}

function resolveAreaObjectPlacementMatrix(
  position: THREE.Vector3,
  bearing: number,
  resolveRenderYaw: (yaw: number) => number
): THREE.Matrix4 {
  return new THREE.Matrix4().compose(
    position,
    new THREE.Quaternion().setFromAxisAngle(
      OBJECT_VISUAL_ROTATION_Y_AXIS,
      resolveRenderYaw(bearing)
    ),
    new THREE.Vector3(1, 1, 1)
  );
}

function resolveAreaObjectVisualTransformMatrix(
  transform: SceneObject["visualTransform"],
  selectedScaleFactor = 1
): THREE.Matrix4 {
  return new THREE.Matrix4().compose(
    resolveAuroraBasisConvertedVisualOffsetVector(transform),
    resolveAuroraBasisConvertedVisualRotationQuaternion(transform),
    resolveObjectVisualScaleVector(transform, selectedScaleFactor)
  );
}

function resolveAreaObjectFinalVisualTransformMatrix(
  position: THREE.Vector3,
  transform: SceneObject["visualTransform"],
  bearing: number,
  resolveRenderYaw: (yaw: number) => number,
  selectedScaleFactor = 1
): THREE.Matrix4 {
  return resolveAreaObjectPlacementMatrix(position, bearing, resolveRenderYaw)
    .multiply(resolveAreaObjectVisualTransformMatrix(transform, selectedScaleFactor));
}

function resolveObjectVisualRotationQuaternion(
  transform: SceneObject["visualTransform"],
  bearing: number,
  resolveRenderYaw: (yaw: number) => number,
  renderAreaGeometry: boolean,
  object?: SceneObject
): THREE.Quaternion {
  void object;
  const renderBearing = renderAreaGeometry ? resolveRenderYaw(bearing) : bearing;
  const bearingQuaternion = new THREE.Quaternion().setFromAxisAngle(
    OBJECT_VISUAL_ROTATION_Y_AXIS,
    renderBearing
  );
  const visualQuaternion = resolveAuroraBasisConvertedVisualRotationQuaternion(transform);

  if (!renderAreaGeometry) {
    return bearingQuaternion.multiply(visualQuaternion).normalize();
  }

  return bearingQuaternion.multiply(visualQuaternion).normalize();
}

function resolveAuroraBasisConvertedVisualRotationQuaternion(
  transform: SceneObject["visualTransform"]
): THREE.Quaternion {
  const auroraRotation = new THREE.Matrix4().makeRotationFromQuaternion(
    resolveAuroraRetailVisualRotationQuaternion(transform)
  );
  const renderRotation = AURORA_TO_THREE_VISUAL_BASIS
    .clone()
    .multiply(auroraRotation)
    .multiply(THREE_TO_AURORA_VISUAL_BASIS);
  return new THREE.Quaternion().setFromRotationMatrix(renderRotation).normalize();
}

function resolveAuroraRetailVisualRotationQuaternion(
  transform: SceneObject["visualTransform"]
): THREE.Quaternion {
  return new THREE.Quaternion()
    .setFromAxisAngle(AURORA_VISUAL_AXIS_Z, resolveAuroraVisualRotateX(transform))
    .multiply(
      new THREE.Quaternion().setFromAxisAngle(
        AURORA_VISUAL_AXIS_X,
        resolveAuroraVisualRotateY(transform)
      )
    )
    .multiply(
      new THREE.Quaternion().setFromAxisAngle(
        AURORA_VISUAL_AXIS_Y,
        resolveAuroraVisualRotateZ(transform)
      )
    )
    .normalize();
}

function resolveAuroraBasisConvertedVisualOffsetVector(
  transform: SceneObject["visualTransform"]
): THREE.Vector3 {
  return new THREE.Vector3(transform.offsetX, transform.offsetZ, transform.offsetY);
}

function resolveAuroraVisualRotateX(transform: SceneObject["visualTransform"]): number {
  return transform.pitch;
}

function resolveAuroraVisualRotateY(transform: SceneObject["visualTransform"]): number {
  return transform.roll;
}

function resolveAuroraVisualRotateZ(transform: SceneObject["visualTransform"]): number {
  return transform.yaw;
}

function resolveObjectVisualOffsetVector(
  transform: SceneObject["visualTransform"],
  bearing: number,
  resolveRenderYaw: (yaw: number) => number,
  renderAreaGeometry: boolean
): THREE.Vector3 {
  if (renderAreaGeometry) {
    return resolveAuroraBasisConvertedVisualOffsetVector(transform).applyMatrix4(
      new THREE.Matrix4().makeRotationFromQuaternion(
        new THREE.Quaternion().setFromAxisAngle(
          OBJECT_VISUAL_ROTATION_Y_AXIS,
          resolveRenderYaw(bearing)
        )
      )
    );
  }

  const offset = new THREE.Vector3(
    transform.offsetX,
    0,
    transform.offsetY
  );
  const renderBearing = renderAreaGeometry ? resolveRenderYaw(bearing) : bearing;
  offset.applyEuler(new THREE.Euler(0, renderBearing, 0));
  offset.y = transform.offsetZ;
  return offset;
}

function buildAreaObjectRenderTransformEvidence(
  transform: SceneObject["visualTransform"],
  bearing: number,
  resolveRenderYaw: (yaw: number) => number,
  renderAreaGeometry: boolean,
  basePosition: THREE.Vector3,
  object?: SceneObject
): Record<string, unknown> {
  const scaleVector = resolveObjectVisualScaleVector(transform, 1);
  const offsetVector = resolveObjectVisualOffsetVector(
    transform,
    bearing,
    resolveRenderYaw,
    renderAreaGeometry
  );
  const sourceRotateX = resolveAuroraVisualRotateX(transform);
  const sourceRotateY = resolveAuroraVisualRotateY(transform);
  const sourceRotateZ = resolveAuroraVisualRotateZ(transform);
  const sourceYaw = bearing + sourceRotateX;
  const placementMatrix = renderAreaGeometry
    ? resolveAreaObjectPlacementMatrix(basePosition, bearing, resolveRenderYaw)
    : new THREE.Matrix4().identity();
  const visualTransformMatrix = renderAreaGeometry
    ? resolveAreaObjectVisualTransformMatrix(transform, 1)
    : new THREE.Matrix4().compose(
        offsetVector,
        resolveObjectVisualRotationQuaternion(
          transform,
          bearing,
          resolveRenderYaw,
          renderAreaGeometry,
          object
        ),
        scaleVector
      );
  const transformMatrix = renderAreaGeometry
    ? placementMatrix.clone().multiply(visualTransformMatrix)
    : visualTransformMatrix;
  const evidencePosition = new THREE.Vector3();
  const rotationQuaternion = new THREE.Quaternion();
  const evidenceScale = new THREE.Vector3();
  transformMatrix.decompose(evidencePosition, rotationQuaternion, evidenceScale);
  const rotationEuler = new THREE.Euler().setFromQuaternion(rotationQuaternion);
  const renderYaw = rotationEuler.y;
  return {
    auroraAreaObjectRenderTransformSourceBearing: bearing,
    auroraAreaObjectRenderTransformSourceBearingDegrees:
      THREE.MathUtils.radToDeg(bearing),
    auroraAreaObjectRenderTransformSourceYaw: sourceYaw,
    auroraAreaObjectRenderTransformSourceYawDegrees:
      THREE.MathUtils.radToDeg(sourceYaw),
    auroraAreaObjectRenderTransformSourceRotateX: sourceRotateX,
    auroraAreaObjectRenderTransformSourceRotateXDegrees:
      THREE.MathUtils.radToDeg(sourceRotateX),
    auroraAreaObjectRenderTransformSourceRotateY: sourceRotateY,
    auroraAreaObjectRenderTransformSourceRotateYDegrees:
      THREE.MathUtils.radToDeg(sourceRotateY),
    auroraAreaObjectRenderTransformSourceRotateZ: sourceRotateZ,
    auroraAreaObjectRenderTransformSourceRotateZDegrees:
      THREE.MathUtils.radToDeg(sourceRotateZ),
    auroraAreaObjectRenderTransformRenderYaw: renderYaw,
    auroraAreaObjectRenderTransformRenderYawDegrees:
      THREE.MathUtils.radToDeg(renderYaw),
    auroraAreaObjectRenderTransformRotationX: rotationEuler.x,
    auroraAreaObjectRenderTransformRotationY: rotationEuler.y,
    auroraAreaObjectRenderTransformRotationZ: rotationEuler.z,
    auroraAreaObjectRenderTransformQuaternionX: rotationQuaternion.x,
    auroraAreaObjectRenderTransformQuaternionY: rotationQuaternion.y,
    auroraAreaObjectRenderTransformQuaternionZ: rotationQuaternion.z,
    auroraAreaObjectRenderTransformQuaternionW: rotationQuaternion.w,
    auroraAreaObjectRenderTransformPositionX: evidencePosition.x,
    auroraAreaObjectRenderTransformPositionY: evidencePosition.y,
    auroraAreaObjectRenderTransformPositionZ: evidencePosition.z,
    auroraAreaObjectRenderTransformPlacementMatrix: placementMatrix.elements.join(","),
    auroraAreaObjectRenderTransformVisualMatrix: visualTransformMatrix.elements.join(","),
    auroraAreaObjectRenderTransformMatrix: transformMatrix.elements.join(","),
    auroraAreaObjectRenderTransformOffsetX: offsetVector.x,
    auroraAreaObjectRenderTransformOffsetY: offsetVector.y,
    auroraAreaObjectRenderTransformOffsetZ: offsetVector.z,
    auroraAreaObjectRenderTransformScaleX: scaleVector.x,
    auroraAreaObjectRenderTransformScaleY: scaleVector.y,
    auroraAreaObjectRenderTransformScaleZ: scaleVector.z,
    auroraAreaObjectRenderTransformAxisMapping:
      "aurora-basis-matrix x/y/z -> three x/z/y; scale and offset use the same basis; rotation uses retail Gob YawPitchRoll mapping",
    auroraAreaObjectRenderTransformPitchPolicy:
      "retail_gob_yawpitchroll_rotatex_z_rotatey_x_rotatez_y",
    auroraAreaObjectRenderTransformRetailRotationOrder:
      "baseOrientation * (Z(RotateX) * X(RotateY) * Y(RotateZ))",
    auroraAreaObjectRenderTransformYawComposition: renderAreaGeometry
      ? "placementMatrix * visualTransformMatrix"
      : "bearingQuaternion * retailVisualQuaternion",
    auroraAreaObjectRenderTransformComposition: renderAreaGeometry
      ? "area-placement-matrix-times-aurora-visual-transform-matrix; GIT Bearing and VisualTransform axes are separate from ARE tile orientation"
      : "preview-bearing-quaternion-times-retail-visual-quaternion"
  };
}

function buildAreaObjectPlacementEvidence(
  object: SceneObject,
  renderObjectX: number,
  renderObjectZ: number,
  renderAnchorY: number
): Record<string, unknown> {
  return {
    auroraAreaObjectSourceX: object.x,
    auroraAreaObjectSourceY: object.y,
    auroraAreaObjectSourceZ: object.z,
    auroraAreaObjectSourceBearing: object.bearing,
    auroraAreaObjectSourceBearingDegrees: THREE.MathUtils.radToDeg(object.bearing),
    auroraAreaObjectRenderAnchorX: renderObjectX,
    auroraAreaObjectRenderAnchorY: renderAnchorY,
    auroraAreaObjectRenderAnchorZ: renderObjectZ
  };
}

function readPlaceablePayloadMetadataString(
  payload: PlaceableViewportRenderPayload | null | undefined,
  keys: readonly string[]
): string | undefined {
  const metadata = payload?.placeable.metadata;
  if (!metadata) {
    return undefined;
  }
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function readPlaceablePayloadMetadataNumber(
  payload: PlaceableViewportRenderPayload | null | undefined,
  keys: readonly string[]
): number | undefined {
  const metadata = payload?.placeable.metadata;
  if (!metadata) {
    return undefined;
  }
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }
  return undefined;
}

function buildAreaObjectPlaceablePayloadEvidence(
  object: SceneObject,
  payload: PlaceableViewportRenderPayload | null | undefined
): Record<string, unknown> {
  const payloadAppearanceType =
    payload?.placeable.placeableRuntime?.state?.appearanceType ??
    readPlaceablePayloadMetadataNumber(payload, [
      "areaInstanceAppearanceType",
      "appearanceId",
      "appearanceType",
      "source2daRow"
    ]);
  const payloadModelResRef = readPlaceablePayloadMetadataString(payload, [
    "lookupModelResRef",
    "modelResRef",
    "reservedModelResRef",
    "modelName",
    "ModelName"
  ]);
  return {
    auroraAreaObjectSourceAppearanceType: object.source?.appearanceType ?? "",
    auroraAreaObjectSourceGenericType: object.source?.genericType ?? "",
    auroraAreaObjectPayloadAppearanceType: payloadAppearanceType ?? "",
    auroraAreaObjectPayloadModelResRef: payloadModelResRef ?? "",
    auroraAreaObjectPayloadModelGlbUrl:
      payload?.renderPackage?.glbUrl ?? payload?.placeable.renderPackage?.glbUrl ?? "",
    auroraAreaObjectPayloadStatus:
      payload?.renderPackage?.status ?? payload?.placeable.renderPackage?.status ?? ""
  };
}

export function resolveObjectVisualRotationEulerForTests(
  transform: SceneObject["visualTransform"],
  bearing: number,
  resolveRenderYaw: (yaw: number) => number,
  renderAreaGeometry: boolean,
  object?: SceneObject
): THREE.Euler {
  return resolveObjectVisualRotationEuler(
    transform,
    bearing,
    resolveRenderYaw,
    renderAreaGeometry,
    object
  );
}

export function resolveObjectVisualOffsetVectorForTests(
  transform: SceneObject["visualTransform"],
  bearing: number,
  resolveRenderYaw: (yaw: number) => number,
  renderAreaGeometry: boolean
): THREE.Vector3 {
  return resolveObjectVisualOffsetVector(
    transform,
    bearing,
    resolveRenderYaw,
    renderAreaGeometry
  );
}

export function resolveObjectVisualScaleVectorForTests(
  transform: SceneObject["visualTransform"],
  selectedScaleFactor: number
): THREE.Vector3 {
  return resolveObjectVisualScaleVector(
    transform,
    selectedScaleFactor
  );
}

export function resolveAreaObjectFinalVisualTransformMatrixForTests(
  position: THREE.Vector3,
  transform: SceneObject["visualTransform"],
  bearing: number,
  resolveRenderYaw: (yaw: number) => number,
  selectedScaleFactor = 1
): THREE.Matrix4 {
  return resolveAreaObjectFinalVisualTransformMatrix(
    position,
    transform,
    bearing,
    resolveRenderYaw,
    selectedScaleFactor
  );
}

function formatAreaObjectVisualTransformEvidence(
  transform: SceneObject["visualTransform"]
): string {
  return [
    `scale=${transform.scale}`,
    `scaleX=${transform.scaleX ?? transform.scale}`,
    `scaleY=${transform.scaleY ?? transform.scale}`,
    `scaleZ=${transform.scaleZ ?? transform.scale}`,
    `offsetX=${transform.offsetX}`,
    `offsetY=${transform.offsetY}`,
    `offsetZ=${transform.offsetZ}`,
    `pitch=${transform.pitch}`,
    `yaw=${transform.yaw}`,
    `roll=${transform.roll}`
  ].join(",");
}

function findAreaObjectSourceIdLabel(root: THREE.Object3D): THREE.Sprite | null {
  let label: THREE.Sprite | null = null;
  root.traverse((node) => {
    if (label || !(node instanceof THREE.Sprite)) {
      return;
    }
    if (node.userData?.role === AREA_OBJECT_SOURCE_ID_LABEL_ROLE) {
      label = node;
    }
  });
  return label;
}

function syncAreaObjectSourceIdLabel(input: {
  root: THREE.Object3D;
  object: SceneObject;
  selected: boolean;
  markerScale: number;
  labelHeight: number;
}): void {
  const sourceIdLabel = formatViewportSourceId(input.object.source?.sourceObjectId);
  const existingLabel = findAreaObjectSourceIdLabel(input.root);
  if (!sourceIdLabel) {
    if (existingLabel) {
      existingLabel.visible = false;
    }
    return;
  }
  if (existingLabel) {
    existingLabel.visible = input.selected;
    return;
  }
  if (!input.selected) {
    return;
  }
  const sourceIdSprite = createTextSprite(sourceIdLabel, input.markerScale * 0.58, {
    fillColor: "#ecfff5",
    backgroundFill: "rgba(8, 44, 28, 0.94)",
    backgroundStroke: "rgba(105, 223, 166, 0.92)",
    autoWidth: true,
    minWidthPx: 130,
    maxWidthPx: 760,
    horizontalPaddingPx: 22
  });
  sourceIdSprite.position.set(0, input.labelHeight + input.markerScale * 0.6, 0);
  sourceIdSprite.userData = {
    ...sourceIdSprite.userData,
    role: AREA_OBJECT_SOURCE_ID_LABEL_ROLE
  };
  input.root.add(sourceIdSprite);
}

function setAreaObjectSourceIdLabelVisible(root: THREE.Object3D, visible: boolean): void {
  const existingLabel = findAreaObjectSourceIdLabel(root);
  if (existingLabel) {
    existingLabel.visible = visible;
  }
}

function updateAreaObjectSourceSelectionState(
  root: THREE.Object3D,
  object: SceneObject,
  selected: boolean,
  debugState: DebugState,
  markerScale: number,
  labelHeight: number
): void {
  const shouldShowAffordance = shouldRenderAreaObjectSourceAffordance(
    object,
    selected,
    debugState
  );
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh) || node.userData?.areaObjectSourceAffordance !== true) {
      return;
    }
    node.visible = shouldShowAffordance;
    const material = node.material;
    const materials = Array.isArray(material) ? material : [material];
    materials.forEach((entry) => {
      if (!("opacity" in entry)) {
        return;
      }
      const defaultOpacity = Number(
        node.userData?.[AREA_OBJECT_SOURCE_DEFAULT_OPACITY_KEY] ?? entry.opacity
      );
      const selectedOpacity = Number(
        node.userData?.[AREA_OBJECT_SOURCE_SELECTED_OPACITY_KEY] ?? entry.opacity
      );
      entry.opacity = selected ? selectedOpacity : defaultOpacity;
      entry.needsUpdate = true;
    });
  });
  if (shouldShowAffordance) {
    syncAreaObjectSourceIdLabel({ root, object, selected, markerScale, labelHeight });
  } else {
    setAreaObjectSourceIdLabelVisible(root, false);
  }
}

function setPrimitiveObjectSelectionEmissive(root: THREE.Object3D, selected: boolean): void {
  if (!(root instanceof THREE.Mesh)) {
    return;
  }
  const materials = Array.isArray(root.material) ? root.material : [root.material];
  materials.forEach((material) => {
    if (!("emissive" in material) || !(material.emissive instanceof THREE.Color)) {
      return;
    }
    const baseEmissive =
      typeof material.userData?.auroraObjectBaseEmissive === "string"
        ? material.userData.auroraObjectBaseEmissive
        : "#000000";
    material.emissive = selected ? new THREE.Color("#ffd87f") : new THREE.Color(baseEmissive);
    material.needsUpdate = true;
  });
}

function updateInstancedFallbackProxySelection(
  root: THREE.Object3D,
  selected: boolean,
  sourceAffordanceVisible: boolean
): void {
  const instancedMesh = root.userData?.[AREA_OBJECT_INSTANCED_MESH_KEY] as
    | THREE.InstancedMesh
    | undefined;
  const instanceId = root.userData?.[AREA_OBJECT_INSTANCED_INSTANCE_ID_KEY];
  if (!(instancedMesh instanceof THREE.InstancedMesh) || typeof instanceId !== "number") {
    return;
  }
  applyStoredObjectSelectionScale(root, selected);
  instancedMesh.setMatrixAt(instanceId, composeObjectInstanceMatrix(root));
  const baseColorHex =
    typeof root.userData?.auroraInstancedFallbackColor === "string"
      ? root.userData.auroraInstancedFallbackColor
      : OBJECT_COLORS.placeables;
  instancedMesh.setColorAt(
    instanceId,
    reusableInstanceColor.set(resolveInstancedFallbackSelectedColor(baseColorHex, selected))
  );
  instancedMesh.instanceMatrix.needsUpdate = true;
  if (instancedMesh.instanceColor) {
    instancedMesh.instanceColor.needsUpdate = true;
  }
  const localY = Number(root.userData?.[AREA_OBJECT_SOURCE_FOOTPRINT_LOCAL_Y_KEY] ?? 0);
  setAreaObjectSourceFootprintInstanceVisibility(
    root.userData?.[AREA_OBJECT_SOURCE_FOOTPRINT_DEFAULT_MESH_KEY] as
      | THREE.InstancedMesh
      | undefined,
    root.userData?.[AREA_OBJECT_SOURCE_FOOTPRINT_DEFAULT_INSTANCE_ID_KEY] as number | undefined,
    root,
    localY,
    sourceAffordanceVisible && !selected
  );
  setAreaObjectSourceFootprintInstanceVisibility(
    root.userData?.[AREA_OBJECT_SOURCE_FOOTPRINT_SELECTED_MESH_KEY] as
      | THREE.InstancedMesh
      | undefined,
    root.userData?.[AREA_OBJECT_SOURCE_FOOTPRINT_SELECTED_INSTANCE_ID_KEY] as number | undefined,
    root,
    localY,
    sourceAffordanceVisible && selected
  );
}

export const AREA_OBJECT_POLYGON_GUIDE_ROLE = "aurora-area-object-polygon-guide";

export function createAreaObjectPolygonGuide(
  object: SceneObject,
  worldAnchor: Readonly<{ x: number; y: number; z: number }>,
  selected: boolean,
): THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial> | null {
  const offsets = resolveAreaObjectPolygonRenderOffsets(object);
  if (!offsets) return null;
  const geometry = new THREE.BufferGeometry().setFromPoints(offsets.map((offset) =>
    new THREE.Vector3(
      worldAnchor.x + offset.x,
      worldAnchor.y + offset.y,
      worldAnchor.z + offset.z,
    )));
  const material = new THREE.LineBasicMaterial({
    color: new THREE.Color(object.kind === "triggers" ? "#f6b44d" : "#d875ff"),
    transparent: true,
    opacity: selected ? 1 : 0.82,
    depthWrite: false,
  });
  const guide = new THREE.Line(geometry, material);
  guide.renderOrder = 15;
  guide.raycast = () => undefined;
  guide.userData = {
    role: AREA_OBJECT_POLYGON_GUIDE_ROLE,
    objectId: object.id,
    objectKind: object.kind,
    coordinateSpace: "native_local",
    pointCount: offsets.length - 1,
  };
  return guide;
}

export function updateObjectMeshSelectionState(
  runtime: RuntimeState,
  objects: SceneObject[],
  selectedObjectIds: string[],
  debugState: DebugState,
  sceneScale: number,
  renderAreaGeometry: boolean
): void {
  const selectedSet = new Set(selectedObjectIds);
  const markerScale = resolveSceneObjectRenderScale(sceneScale, renderAreaGeometry);
  const objectRadius = 0.24 * markerScale;
  const labelHeight = objectRadius + 0.08 * markerScale;

  objects.forEach((object) => {
    const root = runtime.objectMeshById.get(object.id);
    if (!root) {
      return;
    }
    const selected = selectedSet.has(object.id);
    const sourceAffordanceVisible = shouldRenderAreaObjectSourceAffordance(
      object,
      selected,
      debugState
    );
    if (root.userData?.role === OBJECT_INSTANCED_FALLBACK_PROXY_ROLE) {
      updateInstancedFallbackProxySelection(root, selected, sourceAffordanceVisible);
    } else {
      applyStoredObjectSelectionScale(root, selected);
      if (root.userData?.auroraPrimitiveObject === true) {
        setPrimitiveObjectSelectionEmissive(root, selected);
      }
    }
    updateAreaObjectSourceSelectionState(root, object, selected, debugState, markerScale, labelHeight);
  });
}

interface CanonicalVfxAreaCollisionRefreshInput {
  runtime: RuntimeState;
  object: SceneObject;
  objectLabel: string;
  objectRadius: number;
  payload: AuroraVfxPayload;
  areaCollision: AuroraAreaVfxCollisionContract;
  renderAreaGeometry: boolean;
  sourceMdlPlaceableEmitter: boolean;
  particleTextureUrlsByReference: Map<string, string>;
  particleTextureLoadOptions: PlaceableTextureLoadOptions;
  blockPltWithoutTargetContext: boolean;
  chunkModelUrlsByResourceKey: Map<string, string>;
  chunkModelAuroraMaterial?: PlaceableRenderPackageAuroraMaterial | null;
  chunkModelTextureBindings?: PlaceableRenderPackageTextureBinding[] | null;
  modelGraph?: AuroraVfxCanonicalModelGraph;
  sourceMdlLightPolicy?: CanonicalSourceMdlLightFallbackPolicy | null;
}

async function refreshCanonicalVfxWithAreaCollision(
  input: CanonicalVfxAreaCollisionRefreshInput
): Promise<void> {
  const textureUrls = input.blockPltWithoutTargetContext
    ? []
    : [...new Set(input.particleTextureUrlsByReference.values())];
  const modelUrls = [...new Set(input.chunkModelUrlsByResourceKey.values())];
  await Promise.all([
    ...textureUrls.map((url) =>
      ensurePlaceableTexture(input.runtime, url, input.particleTextureLoadOptions)
    ),
    ...modelUrls.map((url) => ensurePlaceableModel(input.runtime, url))
  ]);

  const refreshedPayload = await resolveAuroraVfxSceneRuntimePayload({
    runtimeKey: input.runtime,
    fetchFn: input.runtime.placeableModelFetch as unknown as typeof fetch,
    requestHeaders: input.runtime.placeableModelRequestHeader,
    payload: input.payload,
    areaCollision: input.areaCollision,
    object: input.object
  });
  const latestRoot = input.runtime.objectMeshById.get(input.object.id);
  if (!latestRoot) {
    return;
  }
  if (!refreshedPayload) {
    latestRoot.userData = {
      ...latestRoot.userData,
      auroraVfxSceneCollisionStatus: "not-applied"
    };
    return;
  }

  const currentCanonicalGroup = findCurrentCanonicalVfxGroup(latestRoot);
  if (!currentCanonicalGroup) {
    return;
  }
  const refreshedGroup = createAuroraVfxCanonicalRenderGroup(refreshedPayload, {
    objectRadius: input.objectRadius,
    particleTexturesByReference: collectCachedPlaceableTexturesByReference(
      input.runtime,
      input.particleTextureUrlsByReference,
      input.particleTextureLoadOptions,
      input.blockPltWithoutTargetContext
    ),
    chunkModelsByResourceKey: collectCachedCanonicalVfxChunkModelsByResourceKey(
      input.runtime,
      input.chunkModelUrlsByResourceKey
    ),
    chunkModelDeliveryUrlsByResourceKey: input.chunkModelUrlsByResourceKey,
    chunkModelAuroraMaterial: input.chunkModelAuroraMaterial,
    chunkModelTextureBindings: input.chunkModelTextureBindings,
    modelGraph: input.modelGraph,
    referencedObjectContextKey: input.object.id,
    sourceCoordinateSpace: "aurora-z-up"
  });
  applyCanonicalSourceMdlLightPolicyAfterRefresh(
    currentCanonicalGroup,
    refreshedGroup,
    input.sourceMdlLightPolicy
  );
  if (
    input.renderAreaGeometry &&
    input.sourceMdlPlaceableEmitter
  ) {
    applySourceMdlEmitterAreaModelSpaceScale(refreshedGroup);
  }
  decoratePlaceableModelForObjectSelection(
    refreshedGroup,
    input.object.id,
    input.object.kind,
    input.objectLabel
  );
  refreshedGroup.position.copy(currentCanonicalGroup.position);
  refreshedGroup.quaternion.copy(currentCanonicalGroup.quaternion);
  refreshedGroup.scale.copy(currentCanonicalGroup.scale);
  refreshedGroup.userData = {
    ...currentCanonicalGroup.userData,
    ...refreshedGroup.userData,
    objectId: input.object.id,
    objectKind: input.object.kind,
    objectLabel: input.objectLabel,
    auroraVfxSceneCollisionStatus: "backend-area-wok-runtime-applied",
    auroraVfxSceneCollisionFingerprint: input.areaCollision.fingerprint
  };

  if (currentCanonicalGroup === latestRoot) {
    input.runtime.objectLayer.remove(latestRoot);
    input.runtime.objectLayer.add(refreshedGroup);
    input.runtime.objectMeshById.set(input.object.id, refreshedGroup);
    return;
  }
  const parent = currentCanonicalGroup.parent;
  if (!parent) {
    return;
  }
  parent.remove(currentCanonicalGroup);
  parent.add(refreshedGroup);
  latestRoot.userData = {
    ...latestRoot.userData,
    ...refreshedGroup.userData
  };
}

function findCurrentCanonicalVfxGroup(root: THREE.Object3D): THREE.Object3D | null {
  if (root.userData?.auroraVfxCanonicalRenderer === true) {
    return root;
  }
  return (
    root.children.find((child) => child.userData?.auroraVfxCanonicalRenderer === true) ??
    null
  );
}

export function rebuildObjectMeshes(
  runtime: RuntimeState,
  objects: SceneObject[],
  selectedObjectIds: string[],
  debugState: DebugState,
  areaWidth: number,
  areaHeight: number,
  sceneScale: number,
  renderAreaGeometry: boolean,
  soundUnitsPerTile: number,
  runtimeSoundNowPlayingBadges: readonly RuntimeSoundNowPlayingBadge[],
  showRuntimeSoundNowPlaying: boolean,
  placeableRenderPayloadByObjectId: Record<string, PlaceableViewportRenderPayload> | null,
  creatureRenderPayloadByObjectId: Record<string, CreatureViewportRenderPayload> | null = null,
  auroraVfxAreaCollision: AuroraAreaVfxCollisionContract | null = null,
  modelPresentation: {
    creatureModelPresentationMode?: "default" | "source-model-units";
  } = {}
): void {
  if (typeof (areaHeight as unknown) === "boolean") {
    const legacyRenderAreaGeometry = areaHeight as unknown as boolean;
    const legacySceneScale = areaWidth;
    const legacySoundUnitsPerTile = sceneScale;
    const legacySoundBadges = Array.isArray(renderAreaGeometry as unknown)
      ? (renderAreaGeometry as unknown as readonly RuntimeSoundNowPlayingBadge[])
      : [];
    const legacyShowSoundBadges =
      typeof (soundUnitsPerTile as unknown) === "boolean"
        ? (soundUnitsPerTile as unknown as boolean)
        : false;
    const legacyPlaceablePayload =
      runtimeSoundNowPlayingBadges as unknown as Record<string, PlaceableViewportRenderPayload> | null;

    areaWidth = 1;
    areaHeight = 1;
    sceneScale = legacySceneScale;
    renderAreaGeometry = legacyRenderAreaGeometry;
    soundUnitsPerTile = legacySoundUnitsPerTile;
    runtimeSoundNowPlayingBadges = legacySoundBadges;
    showRuntimeSoundNowPlaying = legacyShowSoundBadges;
    placeableRenderPayloadByObjectId = legacyPlaceablePayload;
  }

  runtimeSoundNowPlayingBadges = Array.isArray(runtimeSoundNowPlayingBadges)
    ? runtimeSoundNowPlayingBadges
    : [];

  const creatureModelPresentationMode =
    modelPresentation.creatureModelPresentationMode ?? "default";
  const preserveCreatureSourceModelUnits =
    creatureModelPresentationMode === "source-model-units";

  clearObjectLayer(runtime);
  applyAuroraAreaObjectLayerRenderFrame(runtime, renderAreaGeometry, areaWidth);
  writePlaceableModelDebugStatus(runtime, "idle", {
    objectCount: objects.length,
    meshCount: null,
    bounds: null,
    url: null
  });
  const selectedSet = new Set(selectedObjectIds);
  const nowPlayingLabelById = new Map<string, string>(
    runtimeSoundNowPlayingBadges.map((badge) => [badge.objectId, badge.label])
  );
  const markerScale = resolveSceneObjectRenderScale(sceneScale, renderAreaGeometry);
  const placeableModelTargetMaxAxisFactor = PLACEABLE_PREVIEW_MODEL_TARGET_MAX_AXIS_FACTOR;
  const placeableModelPresentationKey = preserveCreatureSourceModelUnits
    ? "creature-source-model-units"
    : renderAreaGeometry
      ? `area-aurora-unit-scale:${PLACEABLE_AREA_MODEL_AURORA_UNITS_TO_TILE_SPACE.toFixed(6)}`
      : `normalized:${PLACEABLE_PREVIEW_MODEL_TARGET_MAX_AXIS_FACTOR.toFixed(6)}`;
  const soundMetersToWorldScale = 1 / Math.max(1, soundUnitsPerTile);
  const auroraLightRuntimeBudget = resolveAuroraRuntimeLightBudgetSelection(runtime);
  const objectRadius = 0.24 * markerScale;
  const placeableTwoDaLightSourceUnitScale = renderAreaGeometry
    ? PLACEABLE_AREA_MODEL_AURORA_UNITS_TO_TILE_SPACE
    : Math.max(objectRadius, 0.5);
  const placeableTwoDaLightSourceUnitScaleSource = renderAreaGeometry
    ? `PLACEABLE_AREA_MODEL_AURORA_UNITS_TO_TILE_SPACE=${PLACEABLE_AREA_MODEL_AURORA_UNITS_TO_TILE_SPACE}`
    : "catalog/model preview normalized model scale max(objectRadius,0.5)";
  const collisionRadius = 0.33 * markerScale;
  const collisionThickness = Math.max(0.014, 0.04 * markerScale);
  const labelScale = markerScale;
  const labelHeight = objectRadius + 0.08 * markerScale;
  const objectBaseY = objectRadius + 0.012;
  let areaPrimitiveFallbackCandidateCount = 0;
  let areaPrimitiveFallbackRenderedCount = 0;
  let areaPrimitiveFallbackSuppressedCount = 0;
  let areaPrimitiveFallbackSelectedBypassCount = 0;
  const areaPrimitiveFallbackRenderedIds: string[] = [];
  const areaPrimitiveFallbackSuppressedIds: string[] = [];
  const instancedFallbackPlaceableBatches = new Map<string, InstancedFallbackPlaceableBatch>();
  const instancedAreaObjectSourceFootprintBatches = new Map<
    AreaObjectSourceRenderStatus,
    InstancedAreaObjectSourceFootprintBatch
  >();
  const shareableTexturedModelMaterialSignatures =
    collectShareableTexturedModelMaterialSignatures(
      objects,
      placeableRenderPayloadByObjectId,
      placeableModelPresentationKey
    );

  objects.forEach((object) => {
    const preserveCreatureSourceModelUnitsForObject =
      preserveCreatureSourceModelUnits && object.kind === "creatures";
    const renderObjectX = object.x;
    const renderObjectZ = renderAreaGeometry
      ? resolveAuroraAreaRenderZ(object.y, areaHeight)
      : object.y;
    const resolveRenderYaw = renderAreaGeometry
      ? resolveAuroraAreaRenderYaw
      : (yaw: number): number => yaw;
    const renderStatus = resolveObjectRenderStatus(object);
    const locked = isKindLocked(debugState, object.kind);
    const shouldHideNonRender =
      debugState.hiddenMeshes &&
      !debugState.showNonRenderMeshes &&
      renderStatus === "non_render";
    if (shouldHideNonRender) {
      return;
    }

    const placeableRenderPayload =
      object.kind === "placeables" || object.kind === "doors"
        ? placeableRenderPayloadByObjectId?.[object.id] ?? null
        : null;
    const creatureRenderPayload =
      object.kind === "creatures" ? creatureRenderPayloadByObjectId?.[object.id] ?? null : null;
    const creatureSelectedAnimationName =
      object.kind === "creatures" ? resolveCreatureSelectedAnimationName(object) : null;
    const placeableRenderContractState = placeableRenderPayload
      ? resolvePlaceableRenderContractState(placeableRenderPayload)
      : null;
    const creatureRenderModelResolution = creatureRenderPayload
      ? resolveCreatureModelResolution(creatureRenderPayload)
      : null;
    const creatureSkeletonModelResolution = creatureRenderPayload
      ? resolveCreatureSkeletonModelResolution(creatureRenderPayload)
      : null;
    const creaturePartModelResolutions = creatureRenderPayload
      ? resolveCreaturePartModelResolutions(creatureRenderPayload)
      : [];
    const creatureEquipmentModelPartResolutions = creatureRenderPayload
      ? resolveCreatureEquipmentModelPartResolutions(
          creatureRenderPayload,
          undefined,
          {
            includeAmmunitionVisual:
              shouldRenderCreatureRuntimeAmmunitionVisual(creatureSelectedAnimationName)
          }
        )
      : [];
    const itemModelPartResolutions =
      object.kind === "items" ? resolveItemModelPartResolutions(object) : [];
    const itemArmorPartModelResolutions =
      object.kind === "items" ? resolveItemArmorPartModelResolutions(object) : [];
    const itemTextureUrlsByReference =
      object.kind === "items"
        ? resolveItemTextureDeliveryUrlsByReference(object)
        : new Map<string, string>();
    const hasAreaPreviewOnlyVfxPayload =
      renderAreaGeometry && isAreaPreviewOnlyAuroraVfxPayload(placeableRenderPayload);
    const hasRenderableAreaPreviewOnlyVfxPayload =
      hasAreaPreviewOnlyVfxPayload &&
      placeableRenderContractState?.renderableWithoutModel === true &&
      !placeableRenderContractState.fallbackToPrimitive;
    const hasNoGeometryPlaceablePayload =
      hasPlaceableNoGeometryDiagnostic(placeableRenderPayload) ||
      (hasAreaPreviewOnlyVfxPayload && !hasRenderableAreaPreviewOnlyVfxPayload);
    const objectSelected = selectedSet.has(object.id);
    if (
      hasNoGeometryPlaceablePayload &&
      !debugState.showNonRenderMeshes &&
      !objectSelected
    ) {
      return;
    }
    const effectiveRenderStatus: ObjectRenderStatus = hasNoGeometryPlaceablePayload
      ? "non_render"
      : renderStatus;
    const sharedRendererTarget = isAreaObjectSharedPlaceablesRendererTarget(object);
    const sharedRendererPayloadStatus: AreaObjectSharedRendererPayloadStatus = sharedRendererTarget
      ? placeableRenderPayload
        ? "payload-bound"
        : "missing-payload"
      : "not-applicable";
    const isAreaSharedRendererPrimitiveFallback =
      renderAreaGeometry &&
      sharedRendererTarget &&
      !hasNoGeometryPlaceablePayload &&
      (!placeableRenderPayload ||
        (!placeableRenderContractState?.modelUrl &&
          !placeableRenderContractState?.renderableWithoutModel) ||
        placeableRenderContractState.fallbackToPrimitive);
    if (isAreaSharedRendererPrimitiveFallback) {
      areaPrimitiveFallbackCandidateCount += 1;
      const selected = selectedSet.has(object.id);
      if (!selected && areaPrimitiveFallbackRenderedCount >= AREA_PRIMITIVE_FALLBACK_RENDER_LIMIT) {
        areaPrimitiveFallbackSuppressedCount += 1;
        areaPrimitiveFallbackSuppressedIds.push(object.id);
        return;
      }
      if (selected && areaPrimitiveFallbackRenderedCount >= AREA_PRIMITIVE_FALLBACK_RENDER_LIMIT) {
        areaPrimitiveFallbackSelectedBypassCount += 1;
      }
      areaPrimitiveFallbackRenderedCount += 1;
      areaPrimitiveFallbackRenderedIds.push(object.id);
    }
    const placeableTextureUrlsByReference = placeableRenderPayload
      ? resolvePlaceableTextureDeliveryUrlsByReference(placeableRenderPayload)
      : EMPTY_TEXTURE_URLS_BY_REFERENCE;
    const creatureTextureUrlsByReference = creatureRenderPayload
      ? resolveCreatureTextureDeliveryUrlsByReference(creatureRenderPayload)
      : EMPTY_TEXTURE_URLS_BY_REFERENCE;
    const hasPlaceableSourceMdlChunkModelEmitter = placeableRenderPayload
      ? hasAuroraVfxChunkModelEmitter(placeableRenderPayload)
      : false;
    const placeableChunkModelUrlsByAssetId =
      placeableRenderPayload && hasPlaceableSourceMdlChunkModelEmitter
        ? resolvePlaceableVfxChunkModelDeliveryUrlsByAssetId(placeableRenderPayload)
        : EMPTY_CHUNK_MODEL_URLS_BY_ASSET_ID;
    let colorHex = OBJECT_COLORS[object.kind];
    const objectLabel = OBJECT_LABELS[object.kind];
    const isStatusMapped =
      debugState.statusMap !== "off" &&
      usesStatusMapForKind(debugState.statusMap, object.kind);
    const renderPayloadVfxPayload =
      object.kind === "placeables" && placeableRenderPayload
        ? buildVfxPayloadFromRenderPayload(placeableRenderPayload)
        : undefined;
    const isRenderPayloadVfxPlaceable =
      object.kind === "placeables" &&
      Boolean(
        placeableRenderPayload &&
          (
            isPlaceableVfxPayload(placeableRenderPayload) ||
            renderPayloadVfxPayload?.flags.backendCanonical === true
          )
      );
    const previewVfxPayload = object.kind === "placeables" ? object.vfxPayload : undefined;
    const inferredPreviewVfxPayload =
      !placeableRenderPayload && !previewVfxPayload
        ? inferPlaceablePreviewVfxPayload(object)
        : undefined;
    const isVfxPlaceable =
      isRenderPayloadVfxPlaceable ||
      Boolean(!placeableRenderPayload && (previewVfxPayload || inferredPreviewVfxPayload));
    const auroraVfxPayload =
      isRenderPayloadVfxPlaceable && placeableRenderPayload
        ? renderPayloadVfxPayload
        : previewVfxPayload ?? inferredPreviewVfxPayload;
    const canonicalAuroraVfxPayload = auroraVfxPayload?.auroraPayload;
    const shouldUseCanonicalVfxRenderer = isCanonicalAuroraVfxRenderablePayload(
      canonicalAuroraVfxPayload
    );
    const canonicalVfxPltPaletteResolution = canonicalAuroraVfxPayload
      ? resolveAuroraVfxCanonicalPltPaletteResolution(canonicalAuroraVfxPayload)
      : { status: "not-applicable" as const };
    const canonicalVfxPltPaletteRowsByLayer = canonicalAuroraVfxPayload
      ? resolveAuroraVfxCanonicalPltPaletteRows(canonicalAuroraVfxPayload)
      : undefined;
    const canonicalVfxTextureLoadOptions: PlaceableTextureLoadOptions =
      canonicalVfxPltPaletteRowsByLayer
        ? {
            paletteRowsByLayer: canonicalVfxPltPaletteRowsByLayer,
            label: "canonical-vfx-plt"
          }
        : {};
    const canonicalVfxBlocksPltWithoutTargetContext =
      canonicalVfxPltPaletteResolution.status === "missing-target-context" ||
      canonicalVfxPltPaletteResolution.status === "conflicting-context";
    if (isStatusMapped) {
      colorHex = STATUS_COLOR[effectiveRenderStatus];
    } else if (isVfxPlaceable && placeableRenderPayload) {
      colorHex = resolvePlaceableVfxColor(placeableRenderPayload);
    } else if (!debugState.textures) {
      colorHex = "#8ba0bc";
    }
    if (locked) {
      colorHex = "#566376";
    }

    const hasRenderableSourceMdlPlaceableEmitter = placeableRenderPayload
      ? hasRenderableAuroraVfxEmitter(placeableRenderPayload)
      : false;
    const isSourceMdlPlaceableEmitterPayload =
      placeableRenderPayload && hasRenderableSourceMdlPlaceableEmitter
        ? isSourceMdlAuroraEmitterPayload(placeableRenderPayload)
        : false;
    const hasRenderableVfxEmitter =
      isVfxPlaceable &&
      hasRenderableSourceMdlPlaceableEmitter &&
      !isSourceMdlPlaceableEmitterPayload;
    const hasRenderableSourceMdlPlaceableLight = placeableRenderPayload
      ? hasRenderableAuroraVfxLight(placeableRenderPayload)
      : false;
    const hasRenderableVfxLight = isVfxPlaceable && hasRenderableSourceMdlPlaceableLight;
    const hasVfxChunkModelEmitter =
      isVfxPlaceable && hasPlaceableSourceMdlChunkModelEmitter;
    const hasRenderableSourceMdlEmitterOverlay =
      hasRenderableSourceMdlPlaceableEmitter && isSourceMdlPlaceableEmitterPayload;
    const shouldRenderPlaceableEmitterPreview =
      hasRenderableVfxEmitter || hasRenderableSourceMdlEmitterOverlay;
    const hasSourceMdlStaticGeometry =
      (placeableRenderPayload?.renderPackage?.auroraModelGraph?.staticGeometryNodes.length ?? 0) >
      0;
    // Aurora attaches trimesh, emitter and light nodes to the same MDL tree.
    // A source-MDL emitter is therefore an overlay on source-proven static
    // geometry, but an arbitrary preview GLB is not enough to prove that it
    // belongs to the same model tree.
    const shouldRenderVfxAsStaticModel =
      isVfxPlaceable &&
      !shouldUseCanonicalVfxRenderer &&
      (hasSourceMdlStaticGeometry ||
        (!shouldRenderPlaceableEmitterPreview && !hasRenderableVfxLight)) &&
      Boolean(
        placeableRenderContractState?.modelUrl &&
          !placeableRenderContractState.fallbackToPrimitive
      );
    const canLoadPlaceableModel = Boolean(
      placeableRenderContractState?.modelUrl &&
        !placeableRenderContractState.fallbackToPrimitive
    );
    const shouldUseCanonicalSourceMdlComposition =
      shouldUseCanonicalVfxRenderer && hasSourceMdlStaticGeometry && canLoadPlaceableModel;
    const canonicalSourceMdlCompositionReason = shouldUseCanonicalSourceMdlComposition
      ? "ready"
      : !shouldUseCanonicalVfxRenderer
        ? "canonical-renderer-inactive"
        : !hasSourceMdlStaticGeometry
          ? "missing-source-mdl-static-geometry"
          : !canLoadPlaceableModel
            ? "missing-loadable-source-mdl-model"
            : "canonical-source-mdl-composition-unavailable";
    const shouldUsePlaceableModel =
      !shouldUseCanonicalVfxRenderer &&
      (!isVfxPlaceable || shouldRenderVfxAsStaticModel) &&
      canLoadPlaceableModel &&
      (object.kind === "placeables" || object.kind === "doors");
    const shouldLoadPlaceableModel =
      shouldUsePlaceableModel || shouldUseCanonicalSourceMdlComposition;
    const creatureDirectSourceModelResRef =
      object.kind === "creatures"
        ? (creatureRenderPayload?.renderPackage?.sourceModelCandidates?.find(
            (candidate) => candidate.confidence === "direct-model"
          )?.resref ??
          creatureRenderPayload?.renderPackage?.appearanceProfile?.raceModel ??
          null)
        : null;
    const shouldPreferCreaturePartModelsForEmptyDriver =
      object.kind === "creatures" &&
      creaturePartModelResolutions.length > 0 &&
      isCreatureEmptyDriverModelResRef(creatureDirectSourceModelResRef);
    const shouldUseCreatureModel =
      object.kind === "creatures" &&
      !shouldPreferCreaturePartModelsForEmptyDriver &&
      Boolean(
        creatureRenderModelResolution?.ready &&
          creatureRenderModelResolution.modelUrl
      );
    const shouldUseCreaturePartModels =
      object.kind === "creatures" &&
      (!shouldUseCreatureModel || shouldPreferCreaturePartModelsForEmptyDriver) &&
      creaturePartModelResolutions.length > 0;
    const shouldUseCreatureSkeletonModel =
      object.kind === "creatures" &&
      !shouldUseCreatureModel &&
      !shouldUseCreaturePartModels &&
      Boolean(creatureSkeletonModelResolution?.modelUrl);
    const shouldUseModelObject =
      shouldLoadPlaceableModel ||
      shouldUseCreatureModel ||
      shouldUseCreaturePartModels ||
      shouldUseCreatureSkeletonModel;
    const sharedRendererPlaceholderReason = resolveAreaPlaceablePlaceholderReason({
      sharedRendererTarget,
      payload: placeableRenderPayload,
      renderState: placeableRenderContractState,
      isPending: shouldLoadPlaceableModel
    });
    const sharedRendererGeometryStatus: AreaObjectSharedRendererGeometryStatus =
      !sharedRendererTarget
        ? "not-applicable"
        : sharedRendererPlaceholderReason === "missing-payload"
          ? "missing-payload"
          : sharedRendererPlaceholderReason === "none"
            ? "model-url-ready"
            : sharedRendererPlaceholderReason === "still-loading"
              ? "still-loading"
              : sharedRendererPlaceholderReason === "model-load-failed"
                ? "model-load-failed"
                : sharedRendererPlaceholderReason === "not-applicable"
                  ? "not-applicable"
                : "primitive-fallback";
    const sharedRendererRuntimeEvidence = buildAreaObjectSharedRendererRuntimeEvidence({
      sharedRendererTarget,
      payloadStatus: sharedRendererPayloadStatus,
      geometryStatus: sharedRendererGeometryStatus,
      placeholderReason: sharedRendererPlaceholderReason,
      modelUrl: placeableRenderContractState?.modelUrl
    });
    const sharedRendererModelReadyRuntimeEvidence = buildAreaObjectSharedRendererRuntimeEvidence({
      sharedRendererTarget,
      payloadStatus: sharedRendererPayloadStatus,
      geometryStatus: sharedRendererTarget ? "model-url-ready" : "not-applicable",
      placeholderReason: sharedRendererTarget ? "none" : "not-applicable",
      modelUrl: placeableRenderContractState?.modelUrl
    });
    const sharedRendererModelFailedRuntimeEvidence = buildAreaObjectSharedRendererRuntimeEvidence({
      sharedRendererTarget,
      payloadStatus: sharedRendererPayloadStatus,
      geometryStatus: sharedRendererTarget ? "model-load-failed" : "not-applicable",
      placeholderReason: sharedRendererTarget ? "model-load-failed" : "not-applicable",
      modelUrl: placeableRenderContractState?.modelUrl
    });
    const canUseInstancedFallbackPlaceable =
      object.kind === "placeables" &&
      !placeableRenderPayload &&
      !isVfxPlaceable &&
      !shouldUsePlaceableModel &&
      !debugState.collisionOverlay &&
      !debugState.bounds &&
      !debugState.objectLabels &&
      !(debugState.showVtPhysicalAnchor && isVisualTransformAppliedToObject(object));
    const effectiveVisualTransform = resolveObjectEffectiveVisualTransform(object);
    const visualOffset = resolveObjectVisualOffsetVector(
      effectiveVisualTransform,
      object.bearing,
      resolveRenderYaw,
      renderAreaGeometry
    );
    if (canUseInstancedFallbackPlaceable) {
      const fallbackGeometry = getSharedPlaceableFallbackGeometry(runtime, objectRadius);
      const renderBaseY = resolveSceneObjectRenderBaseY(true, objectRadius, fallbackGeometry);
      const visualScale = Math.max(0.01, effectiveVisualTransform.scale);
      const selected = selectedSet.has(object.id);
      const selectedScale = visualScale * 1.16;
      const baseVisualScaleVector = resolveObjectVisualScaleVector(
        effectiveVisualTransform,
        1
      );
      const selectedVisualScaleVector = resolveObjectVisualScaleVector(
        effectiveVisualTransform,
        1.16
      );
      const proxy = new THREE.Object3D();
      applyObjectVisualTransformToRenderNode({
        node: proxy,
        position: new THREE.Vector3(
          renderObjectX,
          renderBaseY + object.z,
          renderObjectZ
        ),
        transform: effectiveVisualTransform,
        bearing: object.bearing,
        resolveRenderYaw,
        renderAreaGeometry,
        selectedScaleFactor: selected ? 1.16 : 1,
        object
      });
      const sourceRenderStatus = resolveAreaObjectSourceRenderStatus(object);
      proxy.userData = {
        objectId: object.id,
        objectKind: object.kind,
        objectLabel,
        role: OBJECT_INSTANCED_FALLBACK_PROXY_ROLE,
        auroraPrimitiveObject: true,
        auroraInstancedFallbackColor: colorHex,
        auroraAreaObjectSourceStatus: sourceRenderStatus,
        auroraAreaObjectSourceType: object.source?.type ?? "",
        auroraAreaObjectSourceId: object.source?.sourceObjectId ?? "",
        auroraAreaObjectSourceKind: object.source?.sourceKind ?? "",
        auroraAreaObjectTemplateId: object.source?.templateId ?? object.resRef,
        auroraAreaObjectPosition: `${object.x},${object.y},${object.z}`,
        auroraAreaObjectBearing: String(object.bearing),
        auroraAreaObjectRenderAnchor: `${renderObjectX},${renderObjectZ},${renderBaseY + object.z}`,
        ...buildAreaObjectPlacementEvidence(
          object,
          renderObjectX,
          renderObjectZ,
          renderBaseY + object.z
        ),
        ...buildAreaObjectPlaceablePayloadEvidence(object, placeableRenderPayload),
        auroraAreaObjectVisualTransform:
          formatAreaObjectVisualTransformEvidence(object.visualTransform),
        auroraAreaObjectEffectiveVisualTransform:
          formatAreaObjectVisualTransformEvidence(effectiveVisualTransform),
        auroraAreaObjectVisualTransformApplied: isVisualTransformAppliedToObject(object),
        ...buildAreaObjectRenderTransformEvidence(
          effectiveVisualTransform,
          object.bearing,
          resolveRenderYaw,
          renderAreaGeometry,
          new THREE.Vector3(renderObjectX, renderBaseY + object.z, renderObjectZ),
          object
        ),
        [AREA_OBJECT_BASE_SCALE_KEY]: visualScale,
        [AREA_OBJECT_SELECTED_SCALE_KEY]: selectedScale,
        [AREA_OBJECT_BASE_SCALE_VECTOR_KEY]: toStoredObjectScaleVector(baseVisualScaleVector),
        [AREA_OBJECT_SELECTED_SCALE_VECTOR_KEY]:
          toStoredObjectScaleVector(selectedVisualScaleVector),
        ...sharedRendererRuntimeEvidence
      };
      markAreaObjectSharedRendererRuntimeEvidence(proxy, sharedRendererRuntimeEvidence);
      if (shouldRenderAreaObjectSourceAffordance(object, selected, debugState)) {
        const footprintLocalY = -renderBaseY + 0.026;
        proxy.userData = {
          ...proxy.userData,
          [AREA_OBJECT_SOURCE_FOOTPRINT_LOCAL_Y_KEY]: footprintLocalY
        };
        const footprintBatch =
          instancedAreaObjectSourceFootprintBatches.get(sourceRenderStatus) ??
          {
            status: sourceRenderStatus,
            entries: []
          };
        footprintBatch.entries.push({
          proxy,
          selected,
          localY: footprintLocalY
        });
        instancedAreaObjectSourceFootprintBatches.set(sourceRenderStatus, footprintBatch);
        syncAreaObjectSourceIdLabel({
          root: proxy,
          object,
          selected,
          markerScale,
          labelHeight
        });
      }
      runtime.objectLayer.add(proxy);
      runtime.objectMeshById.set(object.id, proxy);

      const opacity = resolveFallbackOpacity(effectiveRenderStatus, debugState);
      const batchKey = `${colorHex}|${opacity.toFixed(3)}|${debugState.wireframe ? "wire" : "solid"}`;
      const batch =
        instancedFallbackPlaceableBatches.get(batchKey) ??
        {
          key: batchKey,
          opacity,
          wireframe: debugState.wireframe,
          entries: []
        };
      batch.entries.push({
        objectId: object.id,
        proxy,
        selected,
        colorHex
      });
      instancedFallbackPlaceableBatches.set(batch.key, batch);
      return;
    }
    const material = new THREE.MeshLambertMaterial({
      color: new THREE.Color(colorHex),
      wireframe: debugState.wireframe
    });

    if (effectiveRenderStatus === "non_render" && debugState.showNonRenderMeshes) {
      material.opacity = 0.45;
      material.transparent = true;
    }

    if (isVfxPlaceable) {
      material.transparent = true;
      material.opacity = debugState.wireframe ? 1 : 0.62;
      material.emissive = new THREE.Color(colorHex);
      material.emissiveIntensity = 1.35;
      material.side = THREE.DoubleSide;
      material.depthWrite = false;
    }

    if (
      placeableRenderContractState?.fallbackToPrimitive &&
      !placeableRenderContractState.hasTextureContract
    ) {
      material.transparent = true;
      material.opacity = Math.min(material.opacity ?? 1, 0.88);
      material.emissive = new THREE.Color("#1a2138");
      material.emissiveIntensity = 0.55;
    }
    material.userData = {
      ...material.userData,
      auroraObjectBaseEmissive:
        "emissive" in material && material.emissive instanceof THREE.Color
          ? `#${material.emissive.getHexString()}`
          : "#000000"
    };

    if (placeableRenderContractState && !debugState.wireframe && !isVfxPlaceable) {
      const textureUrl = placeableRenderContractState.textureDeliveryUrl;
      if (textureUrl) {
        const textureFromCache = runtime.placeableTextureCacheByUrl.get(textureUrl);
        if (textureFromCache) {
          material.map = textureFromCache;
          material.transparent = true;
          material.alphaTest = 0.02;
          material.needsUpdate = true;
        } else {
          void ensurePlaceableTexture(runtime, textureUrl).then((resolvedTexture) => {
            if (!resolvedTexture) {
              return;
            }
            material.map = resolvedTexture;
            material.transparent = true;
            material.alphaTest = 0.02;
            material.needsUpdate = true;
          });
        }
      } else if (placeableRenderContractState.hasMetadataContract) {
        // Metadata-only contract: keep graceful primitive fallback without extra work.
      }
    }
    const geometry =
      object.kind === "sounds"
        ? getSharedSphereGeometry(runtime, "sound-marker", objectRadius * 0.82, 18, 18)
        : placeableRenderPayload
          ? createPlaceableGeometryFromPayload(placeableRenderPayload, objectRadius)
          : object.kind === "placeables"
            ? getSharedPlaceableFallbackGeometry(runtime, objectRadius)
            : object.kind === "doors"
              ? getSharedDoorPrimitiveGeometry(runtime, objectRadius)
              : object.kind === "items"
                ? getSharedSphereGeometry(runtime, "item-anchor", objectRadius * 0.12, 12, 8)
                : getSharedSphereGeometry(runtime, "object-marker", objectRadius, 22, 22);
    const primitiveFallbackMesh =
      object.kind === "sounds" || isVfxPlaceable || object.kind === "items"
        ? null
        : new THREE.Mesh(geometry, material);
    const vfxTextureReference =
      shouldRenderPlaceableEmitterPreview && placeableRenderPayload
        ? resolvePlaceableVfxTextureReference(placeableRenderPayload)
        : null;
    const hasVfxNullTextureReference = isPlaceableVfxNullTextureReference(vfxTextureReference);
    const normalizedVfxTextureReference = vfxTextureReference?.trim().toLowerCase() ?? null;
    const vfxTextureUrl =
      shouldRenderPlaceableEmitterPreview && !debugState.wireframe && !hasVfxNullTextureReference
        ? (normalizedVfxTextureReference
            ? placeableTextureUrlsByReference.get(normalizedVfxTextureReference) ?? null
            : null) ??
          placeableRenderContractState?.textureDeliveryUrl ??
          null
        : null;
    const vfxParticleTexture =
      vfxTextureUrl ? runtime.placeableTextureCacheByUrl.get(vfxTextureUrl) ?? null : null;
    const vfxParticleTexturesByReference = new Map<string, THREE.Texture>();
    if (shouldRenderPlaceableEmitterPreview && !debugState.wireframe) {
      collectCachedPlaceableTexturesByReference(
        runtime,
        placeableTextureUrlsByReference
      ).forEach((texture, reference) => vfxParticleTexturesByReference.set(reference, texture));
    }
    const vfxChunkModelsByAssetId = new Map<string, THREE.Object3D>();
    if (shouldRenderPlaceableEmitterPreview && !debugState.wireframe) {
      placeableChunkModelUrlsByAssetId.forEach((modelDeliveryUrl, assetId) => {
        const cachedModel = runtime.placeableModelCacheByUrl.get(modelDeliveryUrl);
        if (cachedModel) {
          vfxChunkModelsByAssetId.set(assetId, cachedModel);
        }
      });
      applyPlaceableTexturesToVfxChunkModels(
        vfxChunkModelsByAssetId,
        vfxParticleTexturesByReference,
        resolveVfxModelFallbackTexture(runtime, vfxTextureUrl, vfxParticleTexturesByReference)
      );
    }
    const vfxTextureUrlsForLoading =
      (shouldRenderPlaceableEmitterPreview || shouldUseCanonicalVfxRenderer) &&
      !hasVfxNullTextureReference
      ? Array.from(
          new Set([
            ...Array.from(placeableTextureUrlsByReference.values()),
            ...(vfxTextureUrl ? [vfxTextureUrl] : [])
          ])
        ).filter(
          (textureDeliveryUrl) =>
            !canonicalVfxBlocksPltWithoutTargetContext ||
            !isAuroraPltTextureDeliveryUrl(textureDeliveryUrl)
        )
      : [];
    const missingVfxTextureUrls = vfxTextureUrlsForLoading.filter(
      (textureDeliveryUrl) =>
        !getCachedPlaceableTexture(
          runtime,
          textureDeliveryUrl,
          shouldUseCanonicalVfxRenderer ? canonicalVfxTextureLoadOptions : {}
        )
    );
    const canonicalVfxParticleTexturesByReference =
      shouldUseCanonicalVfxRenderer && placeableRenderPayload
        ? collectCachedPlaceableTexturesByReference(
            runtime,
            placeableTextureUrlsByReference,
            canonicalVfxTextureLoadOptions,
            canonicalVfxBlocksPltWithoutTargetContext
          )
        : new Map<string, THREE.Texture>();
    const canonicalVfxChunkModelUrlsByResourceKey =
      shouldUseCanonicalVfxRenderer && placeableRenderPayload
        ? collectCanonicalVfxChunkModelDeliveryUrlsByResourceKey(
            placeableRenderPayload,
            canonicalAuroraVfxPayload
          )
        : new Map<string, string>();
    const canonicalVfxChunkModelsByResourceKey =
      shouldUseCanonicalVfxRenderer && canonicalVfxChunkModelUrlsByResourceKey.size > 0
        ? collectCachedCanonicalVfxChunkModelsByResourceKey(
            runtime,
            canonicalVfxChunkModelUrlsByResourceKey
          )
        : new Map<string, THREE.Object3D>();
    const canonicalVfxGroup =
      shouldUseCanonicalVfxRenderer && canonicalAuroraVfxPayload
        ? createAuroraVfxCanonicalRenderGroup(canonicalAuroraVfxPayload, {
            objectRadius,
            particleTexturesByReference: canonicalVfxParticleTexturesByReference,
            chunkModelsByResourceKey: canonicalVfxChunkModelsByResourceKey,
            chunkModelDeliveryUrlsByResourceKey: canonicalVfxChunkModelUrlsByResourceKey,
            chunkModelAuroraMaterial: placeableRenderPayload?.renderPackage?.auroraMaterial,
            chunkModelTextureBindings: placeableRenderPayload?.renderPackage?.textureBindings,
            sourceModel: shouldUseCanonicalSourceMdlComposition
              ? runtime.placeableModelCacheByUrl.get(
                  placeableRenderContractState?.modelUrl ?? ""
                )
              : undefined,
            sourceModelTexturesByReference: canonicalVfxParticleTexturesByReference,
            sourceModelTextureBindings:
              placeableRenderPayload?.renderPackage?.textureBindings,
            modelGraph: toAuroraVfxCanonicalModelGraph(
              placeableRenderPayload?.renderPackage?.auroraModelGraph
            ),
            referencedObjectContextKey: object.id,
            sourceCoordinateSpace: "aurora-z-up"
          })
        : null;
    if (canonicalVfxGroup && renderAreaGeometry && isSourceMdlPlaceableEmitterPayload) {
      applySourceMdlEmitterAreaModelSpaceScale(canonicalVfxGroup);
      canonicalVfxGroup.userData = {
        ...canonicalVfxGroup.userData,
        auroraVfxCanonicalAreaModelSpaceScale: PLACEABLE_AREA_MODEL_AURORA_UNITS_TO_TILE_SPACE,
        auroraVfxCanonicalAreaModelSpaceScaleSource:
          "source-MDL canonical emitter uses the same Aurora-unit-to-area-tile scale as its owning placeable model"
      };
    }
    const sourceMdlLights = placeableRenderPayload?.renderPackage?.auroraLight?.lights ?? [];
    const sourceMdlLightPolicy =
      shouldUseCanonicalVfxRenderer && sourceMdlLights.length > 0
        ? resolveCanonicalSourceMdlLightFallbackPolicy(
            canonicalAuroraVfxPayload?.contracts.sourceMdlLightFeatureManifest,
            sourceMdlLights,
            canonicalVfxGroup
          )
        : null;
    const suppressedCanonicalSourceMdlLightCount = sourceMdlLightPolicy
      ? applyCanonicalSourceMdlLightFallbackPolicy(canonicalVfxGroup, sourceMdlLightPolicy)
      : 0;
    const canonicalVfxCarriesSourceMdlLights = hasCanonicalSourceMdlLights(canonicalVfxGroup);
    const vfxPreviewGroup =
      isVfxPlaceable &&
      !hasRenderableSourceMdlEmitterOverlay &&
      !shouldUseCanonicalVfxRenderer &&
      placeableRenderPayload &&
      !debugState.wireframe
        ? createPlaceableVfxPreviewGroup(placeableRenderPayload, objectRadius, colorHex, {
            particleTexture: vfxParticleTexture,
            textureDeliveryUrl: vfxTextureUrl,
            particleTexturesByReference: vfxParticleTexturesByReference,
            textureDeliveryUrlsByReference: placeableTextureUrlsByReference,
            chunkModelsByAssetId: vfxChunkModelsByAssetId,
            chunkModelUrlsByAssetId: placeableChunkModelUrlsByAssetId,
            showLightDiagnosticGizmos: debugState.showNonRenderMeshes,
            lightPreviewActiveSlotCap: auroraLightRuntimeBudget.activeSlotCap,
            lightPreviewConfiguredMaxLights: auroraLightRuntimeBudget.configuredMaxLights
          })
        : null;
    const sourceMdlLightPreviewGroup =
      (!isVfxPlaceable ||
        hasRenderableSourceMdlEmitterOverlay ||
        sourceMdlLightPolicy?.requiresFallback === true) &&
      placeableRenderPayload &&
      hasRenderableSourceMdlPlaceableLight &&
      !canonicalVfxCarriesSourceMdlLights &&
      !debugState.wireframe
        ? createPlaceableVfxPreviewGroup(placeableRenderPayload, objectRadius, colorHex, {
            lightNodesOnly: true,
            showLightDiagnosticGizmos: debugState.showNonRenderMeshes,
            lightPreviewActiveSlotCap: auroraLightRuntimeBudget.activeSlotCap,
          lightPreviewConfiguredMaxLights: auroraLightRuntimeBudget.configuredMaxLights
        })
      : null;
    if (sourceMdlLightPreviewGroup && sourceMdlLightPolicy?.requiresFallback) {
      writeSourceMdlLightFallbackDiagnostics(
        sourceMdlLightPreviewGroup,
        sourceMdlLightPolicy,
        suppressedCanonicalSourceMdlLightCount
      );
    }
    const sourceMdlEmitterPreviewGroup =
      hasRenderableSourceMdlEmitterOverlay &&
      !shouldUseCanonicalVfxRenderer &&
      placeableRenderPayload &&
      !debugState.wireframe
        ? createPlaceableVfxPreviewGroup(placeableRenderPayload, objectRadius, colorHex, {
            particleTexture: vfxParticleTexture,
            textureDeliveryUrl: vfxTextureUrl,
            particleTexturesByReference: vfxParticleTexturesByReference,
            textureDeliveryUrlsByReference: placeableTextureUrlsByReference,
            chunkModelsByAssetId: vfxChunkModelsByAssetId,
            chunkModelUrlsByAssetId: placeableChunkModelUrlsByAssetId,
            showLightDiagnosticGizmos: debugState.showNonRenderMeshes,
            lightPreviewActiveSlotCap: auroraLightRuntimeBudget.activeSlotCap,
            lightPreviewConfiguredMaxLights: auroraLightRuntimeBudget.configuredMaxLights
          })
        : null;
    const sourceMdlEmitterPreviewRoot = sourceMdlEmitterPreviewGroup
      ? renderAreaGeometry
        ? createSourceMdlEmitterAreaModelSpaceRoot(sourceMdlEmitterPreviewGroup)
        : sourceMdlEmitterPreviewGroup
      : null;
    const buildSourceMdlEmitterPreviewUserData = (
      group: THREE.Object3D | null = sourceMdlEmitterPreviewGroup
    ): Record<string, unknown> =>
      group
        ? {
            ...group.userData,
            sourceMdlEmitterPreviewStatus: "active",
            sourceMdlEmitterPreviewMode: "placeable-source-mdl-emitter-overlay",
            sourceMdlEmitterPreviewVisibilityMode:
              group.userData?.sourceMdlEmitterPreviewVisibilityMode ??
              group.userData?.auroraSourceMdlEmitterVisibilityProofMode ??
              group.userData?.auroraEmitterPreviewBudgetMode ??
              "source-mdl-emitter-default-visibility",
            sourceMdlEmitterPreviewTextureStatus:
              group.userData?.vfxTextureStatus
          }
        : {};
    const pendingVfxRoot =
      isVfxPlaceable && !placeableRenderPayload && !canonicalVfxGroup ? new THREE.Group() : null;
    if (pendingVfxRoot) {
      pendingVfxRoot.userData = {
        ...pendingVfxRoot.userData,
        vfxPreviewRole: "pending-render-payload",
        vfxTextureStatus: "waiting-render-payload",
        vfxTextureDeliveryUrl: vfxTextureUrl,
        vfxTextureDeliveryUrls: vfxTextureUrlsForLoading
      };
    }
    if (vfxPreviewGroup && missingVfxTextureUrls.length > 0) {
      writePlaceableModelDebugStatus(runtime, "loading", {
        objectId: object.id,
        url: missingVfxTextureUrls[0] ?? null,
        loadPhase: "vfx-texture",
        loadCompleted: 0,
        loadTotal: missingVfxTextureUrls.length,
        textureStatus: "loading",
        textureCount: vfxTextureUrlsForLoading.length,
        textureLoaded: 0,
        textureSource: null
      });
      let resolvedVfxTextureRequests = 0;
      missingVfxTextureUrls.forEach((textureDeliveryUrl) => {
        void ensurePlaceableTexture(runtime, textureDeliveryUrl).then((resolvedTexture) => {
          resolvedVfxTextureRequests += 1;
          const latestRoot = runtime.objectMeshById.get(object.id);
          if (latestRoot !== vfxPreviewGroup) {
            return;
          }
          if (!resolvedTexture) {
            vfxPreviewGroup.userData = {
              ...vfxPreviewGroup.userData,
              vfxTextureStatus:
                resolvedVfxTextureRequests >= missingVfxTextureUrls.length ? "missing" : "loading"
            };
            writePlaceableModelDebugStatus(runtime, "missing", {
              objectId: object.id,
              url: textureDeliveryUrl,
              loadPhase: "vfx-texture",
              loadCompleted: resolvedVfxTextureRequests,
              loadTotal: missingVfxTextureUrls.length,
              textureStatus: "missing",
              textureCount: vfxTextureUrlsForLoading.length,
              textureLoaded: resolvedVfxTextureRequests,
              textureSource: null
            });
            return;
          }
          const textureReference = resolveTextureReferenceForDeliveryUrl(
            placeableTextureUrlsByReference,
            textureDeliveryUrl
          );
          applyPlaceableVfxParticleTexture(
            vfxPreviewGroup,
            resolvedTexture,
            textureDeliveryUrl,
            resolveVfxAlphaCompanionTexture(vfxParticleTexturesByReference, textureReference)
          );
          vfxPreviewGroup.userData = {
            ...vfxPreviewGroup.userData,
            vfxTextureStatus:
              resolvedVfxTextureRequests >= missingVfxTextureUrls.length ? "applied" : "loading"
          };
          if (
            hasVfxChunkModelEmitter &&
            placeableRenderPayload &&
            resolvedVfxTextureRequests >= missingVfxTextureUrls.length
          ) {
            const chunkModelsByAssetId = new Map<string, THREE.Object3D>();
            placeableChunkModelUrlsByAssetId.forEach((modelDeliveryUrl, assetId) => {
              const cachedModel = runtime.placeableModelCacheByUrl.get(modelDeliveryUrl);
              if (cachedModel) {
                chunkModelsByAssetId.set(assetId, cachedModel);
              }
            });
            if (chunkModelsByAssetId.size > 0) {
              const refreshedParticleTexturesByReference =
                collectCachedPlaceableTexturesByReference(
                  runtime,
                  placeableTextureUrlsByReference
                );
              const refreshedParticleTexture =
                vfxTextureUrl
                  ? runtime.placeableTextureCacheByUrl.get(vfxTextureUrl) ?? null
                  : null;
              applyPlaceableTexturesToVfxChunkModels(
                chunkModelsByAssetId,
                refreshedParticleTexturesByReference,
                resolveVfxModelFallbackTexture(
                  runtime,
                  vfxTextureUrl,
                  refreshedParticleTexturesByReference
                )
              );
              const refreshedGroup = createPlaceableVfxPreviewGroup(
                placeableRenderPayload,
                objectRadius,
                colorHex,
                {
                  particleTexture: refreshedParticleTexture,
                  textureDeliveryUrl: vfxTextureUrl,
                  particleTexturesByReference: refreshedParticleTexturesByReference,
                  textureDeliveryUrlsByReference: placeableTextureUrlsByReference,
                  chunkModelsByAssetId,
                  chunkModelUrlsByAssetId: placeableChunkModelUrlsByAssetId,
                  showLightDiagnosticGizmos: debugState.showNonRenderMeshes,
                  lightPreviewActiveSlotCap: auroraLightRuntimeBudget.activeSlotCap,
                  lightPreviewConfiguredMaxLights: auroraLightRuntimeBudget.configuredMaxLights
                }
              );
              decoratePlaceableModelForObjectSelection(
                refreshedGroup,
                object.id,
                object.kind,
                objectLabel
              );
              refreshedGroup.position.copy(vfxPreviewGroup.position);
              refreshedGroup.quaternion.copy(vfxPreviewGroup.quaternion);
              refreshedGroup.scale.copy(vfxPreviewGroup.scale);
              refreshedGroup.userData = {
                ...refreshedGroup.userData,
                objectId: object.id,
                objectKind: object.kind,
                objectLabel,
                ...(auroraVfxPayload
                  ? {
                      auroraVfxPayload,
                      auroraVfxCanonicalStatus: auroraVfxPayload.canonicalStatus,
                      auroraVfxPreviewMode: auroraVfxPayload.previewMode,
                      auroraVfxDiagnosticCodes: auroraVfxPayload.diagnostics.map(
                        (diagnostic) => diagnostic.code
                      )
                    }
                  : {})
              };
              markAreaObjectSharedRendererRuntimeEvidence(
                refreshedGroup,
                sharedRendererRuntimeEvidence
              );
              runtime.objectLayer.remove(vfxPreviewGroup);
              runtime.objectLayer.add(refreshedGroup);
              runtime.objectMeshById.set(object.id, refreshedGroup);
            }
          }
          writePlaceableModelDebugStatus(runtime, "loaded", {
            objectId: object.id,
            url: textureDeliveryUrl,
            loadPhase: "vfx-texture",
            loadCompleted: resolvedVfxTextureRequests,
            loadTotal: missingVfxTextureUrls.length,
            textureStatus:
              resolvedVfxTextureRequests >= missingVfxTextureUrls.length
                ? "applied"
                : "loading",
            textureCount: vfxTextureUrlsForLoading.length,
            textureLoaded: resolvedVfxTextureRequests,
            textureSource:
              typeof resolvedTexture.userData?.auroraSourceFormat === "string"
                ? resolvedTexture.userData.auroraSourceFormat
                : ""
          });
        });
      });
    }
    if (
      vfxPreviewGroup &&
      vfxTextureUrlsForLoading.length > 0 &&
      missingVfxTextureUrls.length === 0
    ) {
      const cachedVfxTextures = vfxTextureUrlsForLoading
        .map((textureDeliveryUrl) => runtime.placeableTextureCacheByUrl.get(textureDeliveryUrl))
        .filter((texture): texture is THREE.Texture => Boolean(texture));
      writePlaceableModelDebugStatus(runtime, "loaded", {
        objectId: object.id,
        url: vfxTextureUrl ?? vfxTextureUrlsForLoading[0] ?? null,
        loadPhase: "vfx-texture",
        loadCompleted: vfxTextureUrlsForLoading.length,
        loadTotal: vfxTextureUrlsForLoading.length,
        textureStatus: vfxPreviewGroup.userData?.vfxTextureStatus === "applied" ? "applied" : "missing",
        textureCount: vfxTextureUrlsForLoading.length,
        textureLoaded: cachedVfxTextures.length,
        textureSource: summarizePlaceableTextureSourceFormats(cachedVfxTextures)
      });
    }
    const missingVfxChunkModelEntries = isVfxPlaceable
      ? Array.from(placeableChunkModelUrlsByAssetId.entries()).filter(
          ([, modelDeliveryUrl]) => !runtime.placeableModelCacheByUrl.has(modelDeliveryUrl)
        )
      : [];
    if (vfxPreviewGroup && missingVfxChunkModelEntries.length > 0 && placeableRenderPayload) {
      writePlaceableModelDebugStatus(runtime, "loading", {
        objectId: object.id,
        url: missingVfxChunkModelEntries[0]?.[1] ?? null,
        loadPhase: "vfx-chunk-model",
        loadCompleted: 0,
        loadTotal: missingVfxChunkModelEntries.length,
        textureStatus: "chunk-model-loading",
        textureCount: 0,
        textureLoaded: 0,
        textureSource: null
      });
      void (async () => {
        const resolvedEntries = await Promise.all(
          missingVfxChunkModelEntries.map(async ([assetId, modelDeliveryUrl]) => {
            const resolvedModel = await ensurePlaceableModel(runtime, modelDeliveryUrl);
            return resolvedModel ? ([assetId, modelDeliveryUrl, resolvedModel] as const) : null;
          })
        );
        if (missingVfxTextureUrls.length > 0) {
          await ensurePlaceableTexturesWithConcurrency(
            runtime,
            missingVfxTextureUrls,
            canonicalVfxTextureLoadOptions
          );
        }
        return resolvedEntries;
      })().then((resolvedEntries) => {
        const latestRoot = runtime.objectMeshById.get(object.id);
        if (!latestRoot || latestRoot !== vfxPreviewGroup) {
          return;
        }
        const chunkModelsByAssetId = new Map<string, THREE.Object3D>();
        placeableChunkModelUrlsByAssetId.forEach((modelDeliveryUrl, assetId) => {
          const alreadyCached = runtime.placeableModelCacheByUrl.get(modelDeliveryUrl);
          if (alreadyCached) {
            chunkModelsByAssetId.set(assetId, alreadyCached);
          }
        });
        resolvedEntries.forEach((entry) => {
          if (!entry) {
            return;
          }
          chunkModelsByAssetId.set(entry[0], entry[2]);
        });
        const refreshedParticleTexturesByReference =
          collectCachedPlaceableTexturesByReference(runtime, placeableTextureUrlsByReference);
        applyPlaceableTexturesToVfxChunkModels(
          chunkModelsByAssetId,
          refreshedParticleTexturesByReference,
          resolveVfxModelFallbackTexture(runtime, vfxTextureUrl, refreshedParticleTexturesByReference)
        );
        if (chunkModelsByAssetId.size === 0) {
          vfxPreviewGroup.userData = {
            ...vfxPreviewGroup.userData,
            vfxChunkModelStatus: "missing",
            vfxTextureStatus: "chunk-model-missing"
          };
          writePlaceableModelDebugStatus(runtime, "missing", {
            objectId: object.id,
            url: missingVfxChunkModelEntries[0]?.[1] ?? null,
            loadPhase: "vfx-chunk-model",
            loadCompleted: missingVfxChunkModelEntries.length,
            loadTotal: missingVfxChunkModelEntries.length,
            textureStatus: "chunk-model-missing",
            textureCount: 0,
            textureLoaded: 0,
            textureSource: null
          });
          return;
        }
        const refreshedGroup = createPlaceableVfxPreviewGroup(
          placeableRenderPayload,
          objectRadius,
          colorHex,
          {
            particleTexture: vfxTextureUrl
              ? runtime.placeableTextureCacheByUrl.get(vfxTextureUrl) ?? vfxParticleTexture
              : vfxParticleTexture,
            textureDeliveryUrl: vfxTextureUrl,
            particleTexturesByReference:
              refreshedParticleTexturesByReference.size > 0
                ? refreshedParticleTexturesByReference
                : vfxParticleTexturesByReference,
            textureDeliveryUrlsByReference: placeableTextureUrlsByReference,
            chunkModelsByAssetId,
            chunkModelUrlsByAssetId: placeableChunkModelUrlsByAssetId,
            showLightDiagnosticGizmos: debugState.showNonRenderMeshes,
            lightPreviewActiveSlotCap: auroraLightRuntimeBudget.activeSlotCap,
            lightPreviewConfiguredMaxLights: auroraLightRuntimeBudget.configuredMaxLights
          }
        );
        decoratePlaceableModelForObjectSelection(
          refreshedGroup,
          object.id,
          object.kind,
          objectLabel
        );
        refreshedGroup.position.copy(latestRoot.position);
        refreshedGroup.quaternion.copy(latestRoot.quaternion);
        refreshedGroup.scale.copy(latestRoot.scale);
        refreshedGroup.userData = {
          ...refreshedGroup.userData,
          objectId: object.id,
          objectKind: object.kind,
          objectLabel,
          ...(auroraVfxPayload
            ? {
                auroraVfxPayload,
                auroraVfxCanonicalStatus: auroraVfxPayload.canonicalStatus,
                auroraVfxPreviewMode: auroraVfxPayload.previewMode,
                auroraVfxDiagnosticCodes: auroraVfxPayload.diagnostics.map(
                  (diagnostic) => diagnostic.code
                )
              }
            : {})
        };
        markAreaObjectSharedRendererRuntimeEvidence(
          refreshedGroup,
          sharedRendererRuntimeEvidence
        );
        runtime.objectLayer.remove(latestRoot);
        runtime.objectLayer.add(refreshedGroup);
        runtime.objectMeshById.set(object.id, refreshedGroup);
        writePlaceableModelDebugStatus(runtime, "loaded", {
          objectId: object.id,
          url: missingVfxChunkModelEntries[0]?.[1] ?? null,
          loadPhase: "vfx-chunk-model",
          loadCompleted: missingVfxChunkModelEntries.length,
          loadTotal: missingVfxChunkModelEntries.length,
          textureStatus: "chunk-model-applied",
          textureCount: 0,
          textureLoaded: 0,
          textureSource: null
        });
      });
    }
    const missingCanonicalVfxChunkModelEntries =
      canonicalVfxGroup && canonicalVfxChunkModelUrlsByResourceKey.size > 0
        ? Array.from(canonicalVfxChunkModelUrlsByResourceKey.entries()).filter(
            ([, modelDeliveryUrl]) => !runtime.placeableModelCacheByUrl.has(modelDeliveryUrl)
          )
        : [];
    if (
      canonicalVfxGroup &&
      canonicalAuroraVfxPayload &&
      missingCanonicalVfxChunkModelEntries.length > 0
    ) {
      writePlaceableModelDebugStatus(runtime, "loading", {
        objectId: object.id,
        url: missingCanonicalVfxChunkModelEntries[0]?.[1] ?? null,
        loadPhase: "canonical-vfx-chunk-model",
        loadCompleted: 0,
        loadTotal: missingCanonicalVfxChunkModelEntries.length,
        textureStatus: "chunk-model-loading",
        textureCount: 0,
        textureLoaded: 0,
        textureSource: null
      });
      void (async () => {
        const resolvedEntries = await Promise.all(
          missingCanonicalVfxChunkModelEntries.map(async ([resourceKey, modelDeliveryUrl]) => {
            const resolvedModel = await ensurePlaceableModel(runtime, modelDeliveryUrl);
            return resolvedModel ? ([resourceKey, modelDeliveryUrl, resolvedModel] as const) : null;
          })
        );
        if (missingVfxTextureUrls.length > 0) {
          await ensurePlaceableTexturesWithConcurrency(
            runtime,
            missingVfxTextureUrls,
            canonicalVfxTextureLoadOptions
          );
        }
        return resolvedEntries;
      })().then((resolvedEntries) => {
        const latestRoot = runtime.objectMeshById.get(object.id);
        const canonicalGroupIsLatestRoot = latestRoot === canonicalVfxGroup;
        const canonicalGroupIsAttachedToLatestRoot = canonicalVfxGroup.parent === latestRoot;
        if (!latestRoot || (!canonicalGroupIsLatestRoot && !canonicalGroupIsAttachedToLatestRoot)) {
          return;
        }
        const chunkModelsByResourceKey = collectCachedCanonicalVfxChunkModelsByResourceKey(
          runtime,
          canonicalVfxChunkModelUrlsByResourceKey
        );
        resolvedEntries.forEach((entry) => {
          if (!entry) {
            return;
          }
          chunkModelsByResourceKey.set(entry[0], entry[2]);
        });
        if (chunkModelsByResourceKey.size === 0) {
          canonicalVfxGroup.userData = {
            ...canonicalVfxGroup.userData,
            auroraVfxCanonicalChunkLaneModelPreviewStatus: "missing-model-delivery"
          };
          writePlaceableModelDebugStatus(runtime, "missing", {
            objectId: object.id,
            url: missingCanonicalVfxChunkModelEntries[0]?.[1] ?? null,
            loadPhase: "canonical-vfx-chunk-model",
            loadCompleted: missingCanonicalVfxChunkModelEntries.length,
            loadTotal: missingCanonicalVfxChunkModelEntries.length,
            textureStatus: "chunk-model-missing",
            textureCount: 0,
            textureLoaded: 0,
            textureSource: null
          });
          return;
        }
        const refreshedGroup = createAuroraVfxCanonicalRenderGroup(canonicalAuroraVfxPayload, {
          objectRadius,
          particleTexturesByReference: collectCachedPlaceableTexturesByReference(
            runtime,
            placeableTextureUrlsByReference,
            canonicalVfxTextureLoadOptions,
            canonicalVfxBlocksPltWithoutTargetContext
          ),
          chunkModelsByResourceKey,
          chunkModelDeliveryUrlsByResourceKey: canonicalVfxChunkModelUrlsByResourceKey,
          chunkModelAuroraMaterial: placeableRenderPayload?.renderPackage?.auroraMaterial,
          chunkModelTextureBindings: placeableRenderPayload?.renderPackage?.textureBindings,
          sourceModel: shouldUseCanonicalSourceMdlComposition
            ? runtime.placeableModelCacheByUrl.get(
                placeableRenderContractState?.modelUrl ?? ""
              )
            : undefined,
          sourceModelTexturesByReference: collectCachedPlaceableTexturesByReference(
            runtime,
            placeableTextureUrlsByReference,
            canonicalVfxTextureLoadOptions,
            canonicalVfxBlocksPltWithoutTargetContext
          ),
          sourceModelTextureBindings:
            placeableRenderPayload?.renderPackage?.textureBindings,
          modelGraph: toAuroraVfxCanonicalModelGraph(
            placeableRenderPayload?.renderPackage?.auroraModelGraph
          ),
          referencedObjectContextKey: object.id,
          sourceCoordinateSpace: "aurora-z-up"
        });
        applyCanonicalSourceMdlLightPolicyAfterRefresh(
          canonicalVfxGroup,
          refreshedGroup,
          sourceMdlLightPolicy
        );
        decoratePlaceableModelForObjectSelection(
          refreshedGroup,
          object.id,
          object.kind,
          objectLabel
        );
        refreshedGroup.position.copy(canonicalVfxGroup.position);
        refreshedGroup.quaternion.copy(canonicalVfxGroup.quaternion);
        refreshedGroup.scale.copy(canonicalVfxGroup.scale);
        refreshedGroup.userData = {
          ...refreshedGroup.userData,
          objectId: object.id,
          objectKind: object.kind,
          objectLabel,
          ...(auroraVfxPayload
            ? {
                auroraVfxPayload,
                auroraVfxCanonicalStatus: auroraVfxPayload.canonicalStatus,
                auroraVfxPreviewMode: auroraVfxPayload.previewMode,
                auroraVfxDiagnosticCodes: auroraVfxPayload.diagnostics.map(
                  (diagnostic) => diagnostic.code
                )
              }
            : {})
        };
        markAreaObjectSharedRendererRuntimeEvidence(
          refreshedGroup,
          sharedRendererRuntimeEvidence
        );
        if (canonicalGroupIsLatestRoot) {
          runtime.objectLayer.remove(latestRoot);
          runtime.objectLayer.add(refreshedGroup);
          runtime.objectMeshById.set(object.id, refreshedGroup);
        } else {
          latestRoot.remove(canonicalVfxGroup);
          latestRoot.add(refreshedGroup);
          latestRoot.userData = {
            ...latestRoot.userData,
            ...refreshedGroup.userData
          };
        }
        writePlaceableModelDebugStatus(runtime, "loaded", {
          objectId: object.id,
          url: missingCanonicalVfxChunkModelEntries[0]?.[1] ?? null,
          loadPhase: "canonical-vfx-chunk-model",
          loadCompleted: missingCanonicalVfxChunkModelEntries.length,
          loadTotal: missingCanonicalVfxChunkModelEntries.length,
          textureStatus: "chunk-model-applied",
          textureCount: 0,
          textureLoaded: 0,
          textureSource: null
        });
      });
    }
    if (
      canonicalVfxGroup &&
      canonicalAuroraVfxPayload &&
      missingVfxTextureUrls.length > 0 &&
      missingCanonicalVfxChunkModelEntries.length === 0
    ) {
      writePlaceableModelDebugStatus(runtime, "loading", {
        objectId: object.id,
        url: missingVfxTextureUrls[0] ?? null,
        loadPhase: "canonical-vfx-texture",
        loadCompleted: 0,
        loadTotal: missingVfxTextureUrls.length,
        textureStatus: "loading",
        textureCount: vfxTextureUrlsForLoading.length,
        textureLoaded: 0,
        textureSource: null
      });
      void ensurePlaceableTexturesWithConcurrency(
        runtime,
        missingVfxTextureUrls,
        canonicalVfxTextureLoadOptions
      ).then(() => {
        const latestRoot = runtime.objectMeshById.get(object.id);
        const canonicalGroupIsLatestRoot = latestRoot === canonicalVfxGroup;
        const canonicalGroupIsAttachedToLatestRoot = canonicalVfxGroup.parent === latestRoot;
        if (!latestRoot || (!canonicalGroupIsLatestRoot && !canonicalGroupIsAttachedToLatestRoot)) {
          return;
        }
        const refreshedTexturesByReference = collectCachedPlaceableTexturesByReference(
          runtime,
          placeableTextureUrlsByReference,
          canonicalVfxTextureLoadOptions,
          canonicalVfxBlocksPltWithoutTargetContext
        );
        const refreshedGroup = createAuroraVfxCanonicalRenderGroup(canonicalAuroraVfxPayload, {
          objectRadius,
          particleTexturesByReference: refreshedTexturesByReference,
          chunkModelsByResourceKey: canonicalVfxChunkModelsByResourceKey,
          chunkModelDeliveryUrlsByResourceKey: canonicalVfxChunkModelUrlsByResourceKey,
          chunkModelAuroraMaterial: placeableRenderPayload?.renderPackage?.auroraMaterial,
          chunkModelTextureBindings: placeableRenderPayload?.renderPackage?.textureBindings,
          sourceModel: shouldUseCanonicalSourceMdlComposition
            ? runtime.placeableModelCacheByUrl.get(
                placeableRenderContractState?.modelUrl ?? ""
              )
            : undefined,
          sourceModelTexturesByReference: refreshedTexturesByReference,
          sourceModelTextureBindings:
            placeableRenderPayload?.renderPackage?.textureBindings,
          modelGraph: toAuroraVfxCanonicalModelGraph(
            placeableRenderPayload?.renderPackage?.auroraModelGraph
          ),
          referencedObjectContextKey: object.id,
          sourceCoordinateSpace: "aurora-z-up"
        });
        applyCanonicalSourceMdlLightPolicyAfterRefresh(
          canonicalVfxGroup,
          refreshedGroup,
          sourceMdlLightPolicy
        );
        decoratePlaceableModelForObjectSelection(
          refreshedGroup,
          object.id,
          object.kind,
          objectLabel
        );
        refreshedGroup.position.copy(canonicalVfxGroup.position);
        refreshedGroup.quaternion.copy(canonicalVfxGroup.quaternion);
        refreshedGroup.scale.copy(canonicalVfxGroup.scale);
        refreshedGroup.userData = {
          ...refreshedGroup.userData,
          objectId: object.id,
          objectKind: object.kind,
          objectLabel,
          ...(auroraVfxPayload
            ? {
                auroraVfxPayload,
                auroraVfxCanonicalStatus: auroraVfxPayload.canonicalStatus,
                auroraVfxPreviewMode: auroraVfxPayload.previewMode,
                auroraVfxDiagnosticCodes: auroraVfxPayload.diagnostics.map(
                  (diagnostic) => diagnostic.code
                )
              }
            : {})
        };
        markAreaObjectSharedRendererRuntimeEvidence(
          refreshedGroup,
          sharedRendererRuntimeEvidence
        );
        if (canonicalGroupIsLatestRoot) {
          runtime.objectLayer.remove(latestRoot);
          runtime.objectLayer.add(refreshedGroup);
          runtime.objectMeshById.set(object.id, refreshedGroup);
        } else {
          latestRoot.remove(canonicalVfxGroup);
          latestRoot.add(refreshedGroup);
          latestRoot.userData = {
            ...latestRoot.userData,
            ...refreshedGroup.userData,
            ...(shouldUseCanonicalSourceMdlComposition
              ? {
                  auroraVfxCanonicalPlaceableComposition: true,
                  auroraVfxCanonicalPlaceableCompositionMode:
                    "source-mdl-static-emitter-light"
                }
              : {})
          };
        }
        const loadedTextures = vfxTextureUrlsForLoading
          .map((textureDeliveryUrl) =>
            getCachedPlaceableTexture(
              runtime,
              textureDeliveryUrl,
              canonicalVfxTextureLoadOptions
            )
          )
          .filter(
          (texture): texture is THREE.Texture => Boolean(texture)
          );
        const canonicalTexturesSettled =
          vfxTextureUrlsForLoading.length > 0 &&
          loadedTextures.length === vfxTextureUrlsForLoading.length;
        writePlaceableModelDebugStatus(runtime, "loaded", {
          objectId: object.id,
          url: missingVfxTextureUrls[0] ?? null,
          loadPhase: "canonical-vfx-texture",
          loadCompleted: missingVfxTextureUrls.length,
          loadTotal: missingVfxTextureUrls.length,
          textureStatus: canonicalTexturesSettled ? "applied" : "missing",
          textureCount: vfxTextureUrlsForLoading.length,
          textureLoaded: loadedTextures.length,
          textureSource: summarizePlaceableTextureSourceFormats(loadedTextures)
        });
      });
    }
    if (primitiveFallbackMesh) {
      if (shouldUseModelObject) {
        primitiveFallbackMesh.position.y = resolveSceneObjectRenderBaseY(
          true,
          objectRadius,
          geometry
        );
      }
      decoratePlaceableModelForObjectSelection(
        primitiveFallbackMesh,
        object.id,
        object.kind,
        objectLabel
      );
    }
    const itemModelRoot = object.kind === "items" ? new THREE.Group() : null;
    if (itemModelRoot) {
      decoratePlaceableModelForObjectSelection(
        itemModelRoot,
        object.id,
        object.kind,
        objectLabel
      );
    }
    const objectRoot = shouldUseModelObject
      ? new THREE.Object3D()
      : canonicalVfxGroup ??
        vfxPreviewGroup ??
        sourceMdlEmitterPreviewRoot ??
        itemModelRoot ??
        primitiveFallbackMesh ??
        pendingVfxRoot ??
        new THREE.Mesh(geometry, material);
    objectRoot.userData = {
      ...objectRoot.userData,
      auroraVfxCanonicalPlaceableCompositionReason: canonicalSourceMdlCompositionReason
    };
    const objectRenderRequestToken = ++objectMeshLayerRenderRequestSequence;
    if (vfxPreviewGroup && primitiveFallbackMesh && !shouldUsePlaceableModel) {
      primitiveFallbackMesh.material.transparent = true;
      primitiveFallbackMesh.material.opacity = Math.min(
        primitiveFallbackMesh.material.opacity ?? 1,
        0.08
      );
      primitiveFallbackMesh.material.depthWrite = false;
      primitiveFallbackMesh.renderOrder = 8;
      vfxPreviewGroup.add(primitiveFallbackMesh);
    }
    if (shouldUsePlaceableModel && vfxPreviewGroup) {
      decoratePlaceableModelForObjectSelection(
        vfxPreviewGroup,
        object.id,
        object.kind,
        objectLabel
      );
      objectRoot.add(vfxPreviewGroup);
    }
    if (shouldUseCanonicalSourceMdlComposition && canonicalVfxGroup) {
      decoratePlaceableModelForObjectSelection(
        canonicalVfxGroup,
        object.id,
        object.kind,
        objectLabel
      );
      objectRoot.add(canonicalVfxGroup);
      objectRoot.userData = {
        ...objectRoot.userData,
        ...canonicalVfxGroup.userData,
        auroraVfxCanonicalPlaceableComposition: true,
        auroraVfxCanonicalPlaceableCompositionMode: "source-mdl-static-emitter-light"
      };
    }
    if (sourceMdlEmitterPreviewGroup) {
      decoratePlaceableModelForObjectSelection(
        sourceMdlEmitterPreviewRoot!,
        object.id,
        object.kind,
        objectLabel
      );
      if (objectRoot !== sourceMdlEmitterPreviewRoot) {
        objectRoot.add(sourceMdlEmitterPreviewRoot!);
      }
      objectRoot.userData = {
        ...objectRoot.userData,
        ...buildSourceMdlEmitterPreviewUserData()
      };
      if (missingVfxTextureUrls.length > 0) {
        writePlaceableModelDebugStatus(runtime, "loading", {
          objectId: object.id,
          url: missingVfxTextureUrls[0] ?? null,
          loadPhase: "placeable-source-mdl-emitter-texture",
          loadCompleted: 0,
          loadTotal: missingVfxTextureUrls.length,
          textureStatus: "loading",
          textureCount: vfxTextureUrlsForLoading.length,
          textureLoaded: 0,
          textureSource: null
        });
        let resolvedSourceMdlEmitterTextureRequests = 0;
        missingVfxTextureUrls.forEach((textureDeliveryUrl) => {
          void ensurePlaceableTexture(runtime, textureDeliveryUrl).then((resolvedTexture) => {
            resolvedSourceMdlEmitterTextureRequests += 1;
            const latestRoot = runtime.objectMeshById.get(object.id);
            const sourceMdlGroupIsLatestRoot = latestRoot === sourceMdlEmitterPreviewRoot;
            if (
              !latestRoot ||
              (!sourceMdlGroupIsLatestRoot && sourceMdlEmitterPreviewRoot?.parent !== latestRoot)
            ) {
              return;
            }
            if (!resolvedTexture) {
              sourceMdlEmitterPreviewGroup.userData = {
                ...sourceMdlEmitterPreviewGroup.userData,
                vfxTextureStatus:
                  resolvedSourceMdlEmitterTextureRequests >= missingVfxTextureUrls.length
                    ? "missing"
                    : "loading"
              };
              latestRoot.userData = {
                ...latestRoot.userData,
                ...buildSourceMdlEmitterPreviewUserData()
              };
              writePlaceableModelDebugStatus(runtime, "missing", {
                objectId: object.id,
                url: textureDeliveryUrl,
                loadPhase: "placeable-source-mdl-emitter-texture",
                loadCompleted: resolvedSourceMdlEmitterTextureRequests,
                loadTotal: missingVfxTextureUrls.length,
                textureStatus: "missing",
                textureCount: vfxTextureUrlsForLoading.length,
                textureLoaded: resolvedSourceMdlEmitterTextureRequests,
                textureSource: null
              });
              return;
            }
            const textureReference = resolveTextureReferenceForDeliveryUrl(
              placeableTextureUrlsByReference,
              textureDeliveryUrl
            );
            const refreshedParticleTexturesByReference =
              collectCachedPlaceableTexturesByReference(runtime, placeableTextureUrlsByReference);
            applyPlaceableVfxParticleTexture(
              sourceMdlEmitterPreviewGroup,
              resolvedTexture,
              textureDeliveryUrl,
              resolveVfxAlphaCompanionTexture(
                refreshedParticleTexturesByReference,
                textureReference
              )
            );
            sourceMdlEmitterPreviewGroup.userData = {
              ...sourceMdlEmitterPreviewGroup.userData,
              vfxTextureStatus:
                resolvedSourceMdlEmitterTextureRequests >= missingVfxTextureUrls.length
                  ? "applied"
                  : "loading"
            };
            latestRoot.userData = {
              ...latestRoot.userData,
              ...buildSourceMdlEmitterPreviewUserData()
            };
            writePlaceableModelDebugStatus(runtime, "loaded", {
              objectId: object.id,
              url: textureDeliveryUrl,
              loadPhase: "placeable-source-mdl-emitter-texture",
              loadCompleted: resolvedSourceMdlEmitterTextureRequests,
              loadTotal: missingVfxTextureUrls.length,
              textureStatus:
                resolvedSourceMdlEmitterTextureRequests >= missingVfxTextureUrls.length
                  ? "applied"
                  : "loading",
              textureCount: vfxTextureUrlsForLoading.length,
              textureLoaded: resolvedSourceMdlEmitterTextureRequests,
              textureSource:
                typeof resolvedTexture.userData?.auroraSourceFormat === "string"
                  ? resolvedTexture.userData.auroraSourceFormat
                  : ""
            });
          });
        });
      } else if (vfxTextureUrlsForLoading.length > 0) {
        const cachedSourceMdlEmitterTextures = vfxTextureUrlsForLoading
          .map((textureDeliveryUrl) => runtime.placeableTextureCacheByUrl.get(textureDeliveryUrl))
          .filter((texture): texture is THREE.Texture => Boolean(texture));
        writePlaceableModelDebugStatus(runtime, "loaded", {
          objectId: object.id,
          url: vfxTextureUrl ?? vfxTextureUrlsForLoading[0] ?? null,
          loadPhase: "placeable-source-mdl-emitter-texture",
          loadCompleted: vfxTextureUrlsForLoading.length,
          loadTotal: vfxTextureUrlsForLoading.length,
          textureStatus:
            sourceMdlEmitterPreviewGroup.userData?.vfxTextureStatus === "applied"
              ? "applied"
              : "missing",
          textureCount: vfxTextureUrlsForLoading.length,
          textureLoaded: cachedSourceMdlEmitterTextures.length,
          textureSource: summarizePlaceableTextureSourceFormats(cachedSourceMdlEmitterTextures)
        });
      }
      const missingSourceMdlChunkModelEntries = Array.from(
        placeableChunkModelUrlsByAssetId.entries()
      ).filter(([, modelDeliveryUrl]) => !runtime.placeableModelCacheByUrl.has(modelDeliveryUrl));
      if (missingSourceMdlChunkModelEntries.length > 0 && placeableRenderPayload) {
        writePlaceableModelDebugStatus(runtime, "loading", {
          objectId: object.id,
          url: missingSourceMdlChunkModelEntries[0]?.[1] ?? null,
          loadPhase: "placeable-source-mdl-emitter-chunk-model",
          loadCompleted: 0,
          loadTotal: missingSourceMdlChunkModelEntries.length,
          textureStatus: "chunk-model-loading",
          textureCount: 0,
          textureLoaded: 0,
          textureSource: null
        });
        void (async () => {
          const resolvedEntries = await Promise.all(
            missingSourceMdlChunkModelEntries.map(async ([assetId, modelDeliveryUrl]) => {
              const resolvedModel = await ensurePlaceableModel(runtime, modelDeliveryUrl);
              return resolvedModel ? ([assetId, modelDeliveryUrl, resolvedModel] as const) : null;
            })
          );
          if (missingVfxTextureUrls.length > 0) {
            await Promise.all(
              missingVfxTextureUrls.map((textureDeliveryUrl) =>
                ensurePlaceableTexture(runtime, textureDeliveryUrl)
              )
            );
          }
          return resolvedEntries;
        })().then((resolvedEntries) => {
          const latestRoot = runtime.objectMeshById.get(object.id);
          const sourceMdlGroupIsLatestRoot = latestRoot === sourceMdlEmitterPreviewRoot;
          if (
            !latestRoot ||
            (!sourceMdlGroupIsLatestRoot && sourceMdlEmitterPreviewRoot?.parent !== latestRoot)
          ) {
            return;
          }
          const chunkModelsByAssetId = new Map<string, THREE.Object3D>();
          placeableChunkModelUrlsByAssetId.forEach((modelDeliveryUrl, assetId) => {
            const alreadyCached = runtime.placeableModelCacheByUrl.get(modelDeliveryUrl);
            if (alreadyCached) {
              chunkModelsByAssetId.set(assetId, alreadyCached);
            }
          });
          resolvedEntries.forEach((entry) => {
            if (!entry) {
              return;
            }
            chunkModelsByAssetId.set(entry[0], entry[2]);
          });
          const refreshedParticleTexturesByReference =
            collectCachedPlaceableTexturesByReference(runtime, placeableTextureUrlsByReference);
          applyPlaceableTexturesToVfxChunkModels(
            chunkModelsByAssetId,
            refreshedParticleTexturesByReference,
            resolveVfxModelFallbackTexture(
              runtime,
              vfxTextureUrl,
              refreshedParticleTexturesByReference
            )
          );
          if (chunkModelsByAssetId.size === 0) {
            sourceMdlEmitterPreviewGroup.userData = {
              ...sourceMdlEmitterPreviewGroup.userData,
              vfxChunkModelStatus: "missing",
              vfxTextureStatus: "chunk-model-missing"
            };
            latestRoot.userData = {
              ...latestRoot.userData,
              ...buildSourceMdlEmitterPreviewUserData()
            };
            writePlaceableModelDebugStatus(runtime, "missing", {
              objectId: object.id,
              url: missingSourceMdlChunkModelEntries[0]?.[1] ?? null,
              loadPhase: "placeable-source-mdl-emitter-chunk-model",
              loadCompleted: missingSourceMdlChunkModelEntries.length,
              loadTotal: missingSourceMdlChunkModelEntries.length,
              textureStatus: "chunk-model-missing",
              textureCount: 0,
              textureLoaded: 0,
              textureSource: null
            });
            return;
          }
          const refreshedGroup = createPlaceableVfxPreviewGroup(
            placeableRenderPayload,
            objectRadius,
            colorHex,
            {
              particleTexture: vfxTextureUrl
                ? runtime.placeableTextureCacheByUrl.get(vfxTextureUrl) ?? vfxParticleTexture
                : vfxParticleTexture,
              textureDeliveryUrl: vfxTextureUrl,
              particleTexturesByReference:
                refreshedParticleTexturesByReference.size > 0
                  ? refreshedParticleTexturesByReference
                  : vfxParticleTexturesByReference,
              textureDeliveryUrlsByReference: placeableTextureUrlsByReference,
              chunkModelsByAssetId,
              chunkModelUrlsByAssetId: placeableChunkModelUrlsByAssetId,
              showLightDiagnosticGizmos: debugState.showNonRenderMeshes,
              lightPreviewActiveSlotCap: auroraLightRuntimeBudget.activeSlotCap,
              lightPreviewConfiguredMaxLights: auroraLightRuntimeBudget.configuredMaxLights
            }
          );
          const refreshedRoot = renderAreaGeometry
            ? createSourceMdlEmitterAreaModelSpaceRoot(refreshedGroup)
            : refreshedGroup;
          decoratePlaceableModelForObjectSelection(
            refreshedRoot,
            object.id,
            object.kind,
            objectLabel
          );
          refreshedRoot.position.copy(sourceMdlEmitterPreviewRoot!.position);
          refreshedRoot.quaternion.copy(sourceMdlEmitterPreviewRoot!.quaternion);
          refreshedRoot.scale.copy(sourceMdlEmitterPreviewRoot!.scale);
          if (sourceMdlGroupIsLatestRoot) {
            runtime.objectLayer.remove(sourceMdlEmitterPreviewRoot!);
            runtime.objectLayer.add(refreshedRoot);
            runtime.objectMeshById.set(object.id, refreshedRoot);
            refreshedRoot.userData = {
              ...refreshedRoot.userData,
              ...buildSourceMdlEmitterPreviewUserData(refreshedGroup)
            };
          } else {
            latestRoot.remove(sourceMdlEmitterPreviewRoot!);
            latestRoot.add(refreshedRoot);
            latestRoot.userData = {
              ...latestRoot.userData,
              ...buildSourceMdlEmitterPreviewUserData(refreshedGroup)
            };
          }
          writePlaceableModelDebugStatus(runtime, "loaded", {
            objectId: object.id,
            url: missingSourceMdlChunkModelEntries[0]?.[1] ?? null,
            loadPhase: "placeable-source-mdl-emitter-chunk-model",
            loadCompleted: chunkModelsByAssetId.size,
            loadTotal: missingSourceMdlChunkModelEntries.length,
            textureStatus:
              refreshedGroup.userData?.vfxTextureStatus === "applied"
                ? "applied"
                : "chunk-model-applied",
            textureCount: vfxTextureUrlsForLoading.length,
            textureLoaded: refreshedParticleTexturesByReference.size,
            textureSource: summarizePlaceableTextureSourceFormats(
              Array.from(refreshedParticleTexturesByReference.values())
            )
          });
        });
      }
    }
    if (sourceMdlLightPreviewGroup) {
      if (shouldUseCanonicalVfxRenderer) {
        sourceMdlLightPreviewGroup.userData = {
          ...sourceMdlLightPreviewGroup.userData,
          auroraVfxCanonicalLightSibling: true,
          auroraVfxCanonicalLightSiblingMode: "source-mdl-light-thin-host-child",
          auroraVfxCanonicalLightSiblingRenderer: "placeable-source-mdl-light-preview",
          auroraVfxCanonicalLightSiblingRetailProof: false
        };
      }
      decoratePlaceableModelForObjectSelection(
        sourceMdlLightPreviewGroup,
        object.id,
        object.kind,
        objectLabel
      );
      objectRoot.add(sourceMdlLightPreviewGroup);
      objectRoot.userData = {
        ...objectRoot.userData,
        ...sourceMdlLightPreviewGroup.userData
      };
    }
    const shouldAttachPrimitiveFallbackDuringModelLoad =
      shouldUsePlaceableModel && !sharedRendererTarget;
    if (shouldAttachPrimitiveFallbackDuringModelLoad && primitiveFallbackMesh) {
      objectRoot.add(primitiveFallbackMesh);
    }
    const isPrimitiveObject =
      !shouldUseModelObject && !isVfxPlaceable && object.kind !== "items";
    const creatureFallbackSkeletonCandidate = resolveCreatureFallbackSkeletonCandidate(
      creatureRenderPayload,
      creatureSkeletonModelResolution
    );
    const creatureFallbackSkeletonSignature = creatureFallbackSkeletonCandidate
      ? `source-skeleton:${creatureFallbackSkeletonCandidate.assetId ?? creatureFallbackSkeletonCandidate.resref}`
      : "no-skeleton";
    const creaturePartModelGroupSignature =
      shouldUseCreaturePartModels
        ? `creature-parts:${creatureSkeletonModelResolution?.modelCacheKey ?? creatureFallbackSkeletonSignature}:${creaturePartModelResolutions
            .map((entry) => entry.modelCacheKey)
            .join("|")}`
        : null;
    const creatureAnimationRequestSignature =
      object.kind === "creatures"
        ? (resolveCreatureSelectedAnimationName(object) ?? "auto")
        : "";
    const objectRenderPackageModelUrl = shouldLoadPlaceableModel
      ? placeableRenderContractState?.modelUrl
      : shouldUseCreatureModel
        ? creatureRenderModelResolution?.modelUrl
        : shouldUseCreaturePartModels
          ? creaturePartModelGroupSignature
          : shouldUseCreatureSkeletonModel
            ? creatureSkeletonModelResolution?.modelUrl
            : null;
    const objectRenderPackageModelCacheKey = shouldLoadPlaceableModel
      ? (placeableRenderContractState?.modelCacheKey ?? objectRenderPackageModelUrl)
      : shouldUseCreatureModel
        ? (creatureRenderModelResolution?.modelCacheKey ?? objectRenderPackageModelUrl)
        : shouldUseCreaturePartModels
          ? creaturePartModelGroupSignature
          : shouldUseCreatureSkeletonModel
            ? (creatureSkeletonModelResolution?.modelCacheKey ?? objectRenderPackageModelUrl)
            : null;
    const objectRenderPackageModelRequestSignature =
      object.kind === "creatures" && objectRenderPackageModelUrl
        ? `${objectRenderPackageModelUrl}:animation:${creatureAnimationRequestSignature}`
        : objectRenderPackageModelUrl;
    if (shouldUseModelObject) {
      const modelTextureUrlsByReference = shouldLoadPlaceableModel
        ? placeableTextureUrlsByReference
        : object.kind === "creatures"
          ? creatureTextureUrlsByReference
          : EMPTY_TEXTURE_URLS_BY_REFERENCE;
      const modelTextureBindings = shouldLoadPlaceableModel
        ? placeableRenderPayload?.renderPackage?.textureBindings
        : object.kind === "creatures"
          ? creatureRenderPayload?.renderPackage?.textureBindings
          : undefined;
      const modelAuroraMaterial = shouldLoadPlaceableModel
        ? placeableRenderPayload?.renderPackage?.auroraMaterial
        : object.kind === "creatures"
          ? creatureRenderPayload?.renderPackage?.auroraMaterial
          : undefined;
      const modelFallbackTextureUrl = shouldLoadPlaceableModel
        ? placeableRenderContractState?.textureDeliveryUrl
        : null;
          const objectTextureSignature = resolvePlaceableModelTextureSignature(
            modelTextureUrlsByReference,
            modelFallbackTextureUrl,
            modelTextureBindings,
            modelAuroraMaterial
          );
          const expectedModelTextureReferences =
            resolveExpectedTextureReferenceSet(modelTextureUrlsByReference);
          const texturedModelMaterialSharingKey = resolveTexturedModelMaterialSharingKey(
            objectRenderPackageModelUrl,
            objectRenderPackageModelCacheKey,
        placeableModelPresentationKey
      );
      const canShareTexturedModelMaterials =
        shouldLoadPlaceableModel &&
        !debugState.wireframe &&
        Boolean(objectTextureSignature) &&
        Boolean(texturedModelMaterialSharingKey) &&
        shareableTexturedModelMaterialSignatures.get(texturedModelMaterialSharingKey!) ===
          objectTextureSignature;
      objectRoot.userData = {
        objectId: object.id,
        objectKind: object.kind,
        objectLabel: objectLabel,
        auroraVfxCanonicalPlaceableCompositionReason:
          canonicalSourceMdlCompositionReason,
        renderPackageModelUrl: objectRenderPackageModelUrl,
        renderPackageModelCacheKey: objectRenderPackageModelCacheKey,
        renderPackageModelRequestSignature: objectRenderPackageModelRequestSignature,
        renderPackageModelRequestToken: objectRenderRequestToken,
        ...buildSourceMdlEmitterPreviewUserData(),
        ...(canonicalVfxGroup?.userData ?? {}),
        ...(sourceMdlLightPreviewGroup?.userData ?? {}),
        ...(shouldUseCanonicalSourceMdlComposition
          ? {
              auroraVfxCanonicalPlaceableComposition: true,
              auroraVfxCanonicalPlaceableCompositionMode: "source-mdl-static-emitter-light"
            }
          : {}),
        ...(auroraVfxPayload
          ? {
              auroraVfxPayload,
              auroraVfxCanonicalStatus: auroraVfxPayload.canonicalStatus,
              auroraVfxPreviewMode: auroraVfxPayload.previewMode,
              auroraVfxDiagnosticCodes: auroraVfxPayload.diagnostics.map(
                (diagnostic) => diagnostic.code
              )
            }
          : {}),
        ...(object.kind === "creatures"
          ? {
            ...buildCreatureRenderPayloadUserData(creatureRenderPayload),
              ...buildCreatureRenderModelUserData(creatureRenderModelResolution),
              ...buildCreatureSkeletonModelUserData(creatureSkeletonModelResolution),
              ...buildCreaturePartModelGroupUserData(creaturePartModelResolutions),
              creatureViewportRenderMode: shouldUseCreatureModel
                ? "direct-model"
                : shouldUseCreaturePartModels
                  ? "part-model-group"
                  : shouldUseCreatureSkeletonModel
                    ? "skeleton-fallback"
                    : "primitive-fallback",
              creatureModelPresentationMode:
                preserveCreatureSourceModelUnitsForObject
                  ? "source-model-units"
                  : renderAreaGeometry
                    ? "area-aurora-unit-scale"
                    : "catalog-normalized",
              creatureRenderDirectModelBypassReason:
                shouldPreferCreaturePartModelsForEmptyDriver
                  ? "empty-driver-with-part-models"
                  : "",
              creatureRenderDirectModelBypassResRef:
                shouldPreferCreaturePartModelsForEmptyDriver
                  ? (creatureDirectSourceModelResRef ?? "")
                  : "",
              ...buildCreatureEquipmentModelPartGroupUserData(
                creatureEquipmentModelPartResolutions
              )
            }
          : {})
      };
      if (shouldUseCreaturePartModels && objectRenderPackageModelUrl) {
        const partModelSignature = objectRenderPackageModelUrl;
        const partModelRequestSignature =
          objectRenderPackageModelRequestSignature ?? partModelSignature;
        const partModelRequestToken = objectRenderRequestToken;
        const firstPartModelUrl =
          creaturePartModelResolutions[0]?.modelUrl ?? partModelSignature;
        writeCreaturePartModelRuntimeStatus(runtime, "loading", {
          objectId: object.id,
          loadTotal: creaturePartModelResolutions.length,
          signatureLength: partModelSignature.length,
          requestSignatureLength: partModelRequestSignature.length
        });
        writePlaceableModelDebugStatus(runtime, "loading", {
          objectId: object.id,
          url: firstPartModelUrl,
          loadPhase: "creature-part-models",
          loadCompleted: 0,
          loadTotal: creaturePartModelResolutions.length
        });
        const creaturePartModelsNeedMaterialClone =
          !debugState.wireframe &&
          (modelTextureUrlsByReference.size > 0 ||
            Boolean(resolveCreatureMaterialTintColor(creatureRenderPayload?.renderPackage?.colors)) ||
            creaturePartModelResolutions.some(
              (entry) => Object.keys(entry.materialColors ?? {}).length > 0
            ));
        const skeletonModelPromise = creatureSkeletonModelResolution
          ? ensurePlaceableModel(runtime, creatureSkeletonModelResolution.modelUrl, {
              cloneMaterials: creaturePartModelsNeedMaterialClone,
              cacheKey: creatureSkeletonModelResolution.modelCacheKey
            })
          : Promise.resolve(null);
        const supermodelModelPromise = creatureSkeletonModelResolution?.supermodelModelUrl
          ? ensurePlaceableModel(runtime, creatureSkeletonModelResolution.supermodelModelUrl, {
              cloneMaterials: false,
              cacheKey: creatureSkeletonModelResolution.supermodelModelCacheKey
            })
          : Promise.resolve(null);
        const supermodelChainModelPromise =
          creatureSkeletonModelResolution?.supermodelChainModelUrls?.length
            ? Promise.all(
                creatureSkeletonModelResolution.supermodelChainModelUrls.map((modelUrl, index) =>
                  ensurePlaceableModel(runtime, modelUrl, {
                    cloneMaterials: false,
                    cacheKey:
                      creatureSkeletonModelResolution.supermodelChainModelCacheKeys?.[index] ??
                      `${creatureSkeletonModelResolution.supermodelModelCacheKey ?? "skeleton-supermodel-chain"}:${index}`
                  }).catch(() => null)
                )
              )
            : Promise.resolve([]);
        void Promise.all([
          Promise.all(
            creaturePartModelResolutions.map(async (entry) => ({
              entry,
              model: await ensurePlaceableModel(runtime, entry.modelUrl, {
                cloneMaterials: creaturePartModelsNeedMaterialClone,
                cacheKey: entry.modelCacheKey,
                sourceHierarchyMode: "preserve-loaded"
              })
            }))
          ),
          skeletonModelPromise,
          supermodelModelPromise,
          supermodelChainModelPromise
        ]).then(async ([
          resolvedEntries,
          skeletonModel,
          supermodelModel,
          supermodelChainModels
        ]) => {
          const latestObjectRoot = runtime.objectMeshById.get(object.id);
          if (!latestObjectRoot) {
            writeCreaturePartModelRuntimeStatus(runtime, "stale-missing-root", {
              objectId: object.id,
              loadTotal: creaturePartModelResolutions.length
            });
            return;
          }
          if (
            latestObjectRoot.userData.renderPackageModelRequestSignature !==
            partModelRequestSignature
          ) {
            writeCreaturePartModelRuntimeStatus(runtime, "stale-signature", {
              objectId: object.id,
              loadTotal: creaturePartModelResolutions.length,
              currentSignatureLength:
                typeof latestObjectRoot.userData.renderPackageModelRequestSignature === "string"
                  ? latestObjectRoot.userData.renderPackageModelRequestSignature.length
                  : 0,
              expectedSignatureLength: partModelRequestSignature.length
            });
            return;
          }
          if (latestObjectRoot.userData.renderPackageModelRequestToken !== partModelRequestToken) {
            writeCreaturePartModelRuntimeStatus(runtime, "stale-token", {
              objectId: object.id,
              loadTotal: creaturePartModelResolutions.length,
              currentToken:
                typeof latestObjectRoot.userData.renderPackageModelRequestToken === "number"
                  ? latestObjectRoot.userData.renderPackageModelRequestToken
                  : 0,
              expectedToken: partModelRequestToken
            });
            return;
          }

          const loadedEntries = resolvedEntries.filter(
            (entry): entry is LoadedCreaturePartModelEntry =>
              Boolean(entry.model)
          );
          writeCreaturePartModelRuntimeStatus(runtime, "models-resolved", {
            objectId: object.id,
            loadCompleted: loadedEntries.length,
            loadTotal: creaturePartModelResolutions.length
          });
          if (loadedEntries.length === 0) {
            markAreaObjectSharedRendererRuntimeEvidence(
              latestObjectRoot,
              sharedRendererModelFailedRuntimeEvidence
            );
            writePlaceableModelDebugStatus(runtime, "missing", {
              objectId: object.id,
              url: firstPartModelUrl,
              loadPhase: "creature-part-models",
              loadCompleted: resolvedEntries.length,
              loadTotal: creaturePartModelResolutions.length
            });
            return;
          }
          const creatureRenderableTextureUrlsByReference =
            object.kind === "creatures"
              ? resolveCreatureRenderableTextureUrlsByReference(
                  modelTextureUrlsByReference,
                  loadedEntries
                )
              : modelTextureUrlsByReference;

          const sourceAnchorSkeleton = createCreatureFallbackSkeletonFromSourceAnchors({
            payload: creatureRenderPayload,
            loadedEntries,
            skeletonResolution: creatureSkeletonModelResolution
          });
          const dominantPartSkeletonPrefix =
            resolveDominantCreaturePartModelPrefix(loadedEntries);
          const loadedSkeletonCompatibility = resolveCreaturePartSkeletonCompatibility(
            skeletonModel ?? sourceAnchorSkeleton?.model ?? null,
            creatureSkeletonModelResolution ?? sourceAnchorSkeleton?.resolution ?? null,
            loadedEntries
          );
          const loadedSkeletonHasDifferentPartPrefix =
            Boolean(dominantPartSkeletonPrefix) &&
            loadedSkeletonCompatibility.skeletonPrefix.length > 0 &&
            loadedSkeletonCompatibility.skeletonPrefix !== dominantPartSkeletonPrefix;
          const loadedSkeletonAnchorCoveragePrefixStatus =
            loadedSkeletonHasDifferentPartPrefix
              ? resolveCreaturePartAnchorCoveragePrefixStatus(
                  loadedSkeletonCompatibility.skeletonPrefix,
                  loadedSkeletonCompatibility.dominantPartPrefix
                )
              : "rejected";
          const shouldUsePartPrefixSourceAnchorSkeleton =
            loadedSkeletonHasDifferentPartPrefix &&
            loadedSkeletonAnchorCoveragePrefixStatus === "same-family";
          const partPrefixSourceAnchorSkeleton =
            shouldUsePartPrefixSourceAnchorSkeleton && dominantPartSkeletonPrefix
              ? createCreatureFallbackSkeletonFromSourceAnchors({
                  payload: creatureRenderPayload,
                  loadedEntries,
                  skeletonResolution: creatureSkeletonModelResolution,
                  overrideSkeletonResRef: dominantPartSkeletonPrefix
                })
              : null;
          const shouldPreferPartPrefixSourceAnchorSkeleton =
            Boolean(partPrefixSourceAnchorSkeleton) &&
            shouldUsePartPrefixSourceAnchorSkeleton;
          const shouldPreferSourceAnchorSkeleton =
            Boolean(sourceAnchorSkeleton) &&
            !skeletonModel;
          const effectiveSkeletonModel = shouldPreferPartPrefixSourceAnchorSkeleton
            ? (partPrefixSourceAnchorSkeleton?.model ?? null)
            : shouldPreferSourceAnchorSkeleton
              ? (sourceAnchorSkeleton?.model ?? null)
              : (skeletonModel ?? null);
          const effectiveSkeletonResolution =
            (shouldPreferPartPrefixSourceAnchorSkeleton
              ? partPrefixSourceAnchorSkeleton?.resolution
              : shouldPreferSourceAnchorSkeleton
                ? sourceAnchorSkeleton?.resolution
                : creatureSkeletonModelResolution) ??
            creatureSkeletonModelResolution ??
            null;
          const sourceAnchorSkeletonUserData = shouldPreferPartPrefixSourceAnchorSkeleton
            ? {
                ...(partPrefixSourceAnchorSkeleton?.userData ?? {}),
                creatureSourceMdlAnchorSkeletonSelectionMode: "part-prefix-synthetic",
                creatureSourceMdlAnchorSkeletonReplacedResRef:
                  creatureSkeletonModelResolution?.resref ?? ""
              }
            : shouldPreferSourceAnchorSkeleton
              ? {
                  ...(sourceAnchorSkeleton?.userData ?? {}),
                  creatureSourceMdlAnchorSkeletonSelectionMode: "missing-model-fallback"
                }
              : {};
          const skeletonModelLoadStatus = skeletonModel
            ? shouldPreferPartPrefixSourceAnchorSkeleton
              ? "part-prefix-synthetic"
              : "loaded"
            : sourceAnchorSkeleton
              ? "source-mdl-synthetic"
              : creatureSkeletonModelResolution
                ? "missing"
                : creatureFallbackSkeletonCandidate
                  ? "source-mdl-unavailable"
                  : "not-applicable";
          const loadedBackendSupermodelChainModels = supermodelChainModels.filter(
            (model): model is THREE.Object3D => Boolean(model)
          );
          const runtimeSupermodelChainModels =
            loadedBackendSupermodelChainModels.length === 0
              ? await loadCreatureRuntimeSupermodelChainFromModel(
                  runtime,
                  supermodelModel,
                  creatureSkeletonModelResolution?.supermodelModelUrl,
                  creatureSkeletonModelResolution?.supermodelModelCacheKey
                )
              : [];
          const combinedSupermodelChainModels = [
            ...loadedBackendSupermodelChainModels,
            ...runtimeSupermodelChainModels
          ];
          const directSupermodelAnimationClips =
            effectiveSkeletonModel && supermodelModel
              ? buildAuroraSupermodelAnimationClips(effectiveSkeletonModel, supermodelModel)
              : [];
          const skeletonSupermodelChainAnimationClips = effectiveSkeletonModel
            ? combinedSupermodelChainModels.flatMap((supermodel) =>
                supermodel
                  ? buildAuroraSupermodelAnimationClips(effectiveSkeletonModel, supermodel)
                  : []
              )
            : [];
          const supermodelAnimationClips = deduplicateCreatureAnimationClips([
            ...directSupermodelAnimationClips,
            ...skeletonSupermodelChainAnimationClips
          ]);
          const loadedCreatureAnimationClips = [
            ...(effectiveSkeletonModel
              ? collectCreatureLoadedModelAnimationClips(effectiveSkeletonModel)
              : []),
            ...supermodelAnimationClips,
            ...loadedEntries.flatMap(({ model }) =>
              collectCreatureLoadedModelAnimationClips(model)
            )
          ];

          const partGroup = new THREE.Group();
          partGroup.name = `${object.id}:creature-part-models`;
          partGroup.userData = {
            ...partGroup.userData,
            objectId: object.id,
            objectKind: object.kind,
            objectLabel,
            creaturePartModelGroupStatus:
              loadedEntries.length === creaturePartModelResolutions.length
                ? "loaded"
                : "partial",
            creaturePartModelGroupSourceHierarchyMode: "preserve-loaded",
            creaturePartModelGroupLoadedCount: loadedEntries.length,
            creaturePartModelGroupTotalCount: creaturePartModelResolutions.length,
            creaturePartModelGroupSlots: loadedEntries.map(({ entry }) => entry.slot),
            creaturePartModelGroupUrls: loadedEntries.map(({ entry }) => entry.modelUrl),
            creatureSkeletonModelLoadStatus: skeletonModelLoadStatus,
            creatureSkeletonModelCacheKey:
              effectiveSkeletonResolution?.modelCacheKey ?? "",
            creatureSkeletonModelResRef: effectiveSkeletonResolution?.resref ?? "",
            creatureSkeletonSupermodelLoadStatus: supermodelModel
              ? "loaded"
              : creatureSkeletonModelResolution?.supermodelModelUrl
                ? "missing"
                : creatureSkeletonModelResolution?.supermodelResRef
                  ? "referenced"
                  : "not-applicable",
            creatureSkeletonSupermodelResRef:
              creatureSkeletonModelResolution?.supermodelResRef ?? "",
            creatureSkeletonSupermodelCacheKey:
              creatureSkeletonModelResolution?.supermodelModelCacheKey ?? "",
            creatureSkeletonSupermodelClipCount: supermodelAnimationClips.length,
            creatureSkeletonSupermodelClipNames: supermodelAnimationClips.map(
              (clip) => clip.name
            ),
            creatureSkeletonSupermodelChainLoadCount:
              combinedSupermodelChainModels.filter(Boolean).length,
            creatureSkeletonSupermodelRuntimeChainLoadCount:
              runtimeSupermodelChainModels.length,
            creatureSkeletonSupermodelChainResRefs:
              creatureSkeletonModelResolution?.supermodelChainResRefs ?? [],
            ...(supermodelModel
              ? buildCreatureLoadedModelFeatureUserData(
                  "creatureSkeletonSupermodelLoadedModel",
                  supermodelModel
                )
              : {})
          };
          const sourceMdlAnchorSkeletonUserData: Record<string, unknown> = skeletonModel
            ? shouldPreferPartPrefixSourceAnchorSkeleton
              ? sourceAnchorSkeletonUserData
              : shouldPreferSourceAnchorSkeleton
              ? sourceAnchorSkeletonUserData
              : augmentCreatureSkeletonWithSourceMdlAnchors(
                skeletonModel,
                creatureRenderPayload,
                creatureSkeletonModelResolution?.resref
              )
            : sourceAnchorSkeletonUserData;
          const anchorSkeletonRenderSuppressionUserData = effectiveSkeletonModel
            ? suppressCreatureAnchorSkeletonRenderGeometry(effectiveSkeletonModel)
            : {};
          const skeletonLoadedFeatureUserData = effectiveSkeletonModel
            ? buildCreatureLoadedModelFeatureUserData(
                "creatureSkeletonLoadedModel",
                effectiveSkeletonModel
              )
            : {};
          if (effectiveSkeletonModel) {
            effectiveSkeletonModel.userData = {
              ...effectiveSkeletonModel.userData,
              ...sourceMdlAnchorSkeletonUserData
            };
          }
          const skeletonCompatibility = resolveCreaturePartSkeletonCompatibility(
            effectiveSkeletonModel,
            effectiveSkeletonResolution,
            loadedEntries
          );
          const keepSkeletonForAnchorsOnly = shouldKeepCreatureSkeletonForAnchorsOnly(
            skeletonCompatibility
          );
          const skeletonCompatibilityUserData = {
            creaturePartAssemblySkeletonCompatibilityStatus: skeletonCompatibility.status,
            creaturePartAssemblySkeletonPrefix: skeletonCompatibility.skeletonPrefix,
            creaturePartAssemblyDominantPartPrefix: skeletonCompatibility.dominantPartPrefix,
            creaturePartAssemblySkeletonAnchorCoveredCount:
              skeletonCompatibility.anchorCoveredCount ?? null,
            creaturePartAssemblySkeletonAnchorTargetCount:
              skeletonCompatibility.anchorTargetCount ?? null
          };
          if (effectiveSkeletonModel) {
            effectiveSkeletonModel.name =
              effectiveSkeletonModel.name || `${object.id}:creature-base-skeleton`;
            effectiveSkeletonModel.userData = {
              ...effectiveSkeletonModel.userData,
              objectId: object.id,
              objectKind: object.kind,
              creatureSkeletonModelStatus: skeletonModelLoadStatus,
              creatureSkeletonModelCacheKey:
                effectiveSkeletonResolution?.modelCacheKey ?? "",
              creatureSkeletonModelResRef: effectiveSkeletonResolution?.resref ?? "",
              ...skeletonCompatibilityUserData,
              ...sourceMdlAnchorSkeletonUserData,
              ...skeletonLoadedFeatureUserData,
              ...anchorSkeletonRenderSuppressionUserData,
              ...(keepSkeletonForAnchorsOnly
                ? {
                    creaturePartAssemblySkeletonAnchorOnly: true,
                    creaturePartAssemblySkeletonAnchorOnlyReason:
                      "part-prefix-mismatch-retained-for-equipment"
                  }
                : {})
            };
            if (skeletonCompatibility.compatible || keepSkeletonForAnchorsOnly) {
              partGroup.add(effectiveSkeletonModel);
            }
          }
          for (const { entry, model } of loadedEntries) {
            model.userData = {
              ...model.userData,
              creaturePartSlot: entry.slot,
              creaturePartId: entry.partId,
              creaturePartModelResRef: entry.modelResRef ?? "",
              creaturePartNodeName: entry.nodeName ?? "",
              creaturePartAttachmentTarget: resolveCreaturePartAttachmentTarget(entry)
            };
            partGroup.add(model);
          }
          const skeletonAssembly = applyCreaturePartSkeletonAnchors(
            skeletonCompatibility.compatible ? effectiveSkeletonModel : null,
            loadedEntries
          );
          if (
            effectiveSkeletonModel &&
            !skeletonAssembly &&
            effectiveSkeletonModel.parent === partGroup &&
            !keepSkeletonForAnchorsOnly
          ) {
            partGroup.remove(effectiveSkeletonModel);
          }
          const creaturePartAssembly =
            skeletonAssembly ??
            applyCreaturePartBoundingBoxStacking(
              partGroup,
              loadedEntries
            );
          const embeddedAccessoryStabilization =
            stabilizeCreaturePartEmbeddedAccessoryMeshes(partGroup, loadedEntries);
          const partAssemblyAttachmentAnchors =
            creaturePartAssembly.mode === "skeleton-anchors"
              ? {
                  creaturePartAssemblyAttachmentAnchorStatus: "skeleton-anchors",
                  creaturePartAssemblyAttachmentAnchorCount: 0,
                  creaturePartAssemblyAttachmentAnchorTargets: []
                }
              : addCreaturePartAssemblyAttachmentAnchors(
                  partGroup,
                  loadedEntries,
                  creaturePartAssembly.mode
                );
          const creaturePartAssemblyUserData = {
            creaturePartAssemblyMode: creaturePartAssembly.mode,
            creaturePartAssemblyAxis: creaturePartAssembly.axis,
            creaturePartAssemblyAdjustedSlots: creaturePartAssembly.adjustedSlots,
            creaturePartAssemblyLateralSlots: creaturePartAssembly.lateralAdjustedSlots,
            creaturePartAssemblyAttachmentTargets: creaturePartAssembly.attachmentTargets,
            creaturePartAssemblyHeadBounds:
              creaturePartAssembly.partBounds?.head ?? "",
            creaturePartAssemblyHeadCenter:
              creaturePartAssembly.partCenters?.head ?? "",
            creaturePartAssemblyHeadAnchorCenter:
              creaturePartAssembly.partAnchorCenters?.head ?? "",
            creaturePartAssemblyNeckCenter:
              creaturePartAssembly.partCenters?.neck ?? "",
            creaturePartAssemblyTorsoCenter:
              creaturePartAssembly.partCenters?.torso ?? "",
            creaturePartAssemblySkeletonModelStatus: skeletonAssembly
              ? "anchored"
              : effectiveSkeletonModel
                ? skeletonCompatibility.compatible
                  ? "fallback"
                  : "incompatible"
                : effectiveSkeletonResolution
                  ? "missing"
                  : "not-applicable",
            creaturePartAssemblySkeletonModelCacheKey:
              effectiveSkeletonResolution?.modelCacheKey ?? "",
            creaturePartAssemblySkeletonMatchedSlots:
              creaturePartAssembly.skeletonMatchedSlots ?? [],
            creaturePartAssemblyMissingAttachmentTargets:
              creaturePartAssembly.missingAttachmentTargets ?? [],
            creaturePartEmbeddedAccessoryStabilizationStatus:
              embeddedAccessoryStabilization.status,
            creaturePartEmbeddedAccessoryStabilizedMeshNames:
              embeddedAccessoryStabilization.adjustedMeshNames,
            creaturePartEmbeddedAccessoryStabilizationOffsets:
              embeddedAccessoryStabilization.adjustmentOffsets,
            ...partAssemblyAttachmentAnchors
          };
          const creaturePartLoadedFeatureUserData = buildCreatureLoadedModelFeatureUserData(
            "creaturePartModelGroupLoaded",
            partGroup
          );
          if (!renderAreaGeometry && !preserveCreatureSourceModelUnitsForObject) {
            normalizePlaceableModelToObjectRadius(objectRadius, partGroup, {
              targetMaxAxisFactor: placeableModelTargetMaxAxisFactor
            });
          }
          const finalCreaturePartRuntimeMetrics = collectCreaturePartRuntimeMetrics(
            partGroup,
            loadedEntries
          );
          const creaturePartRuntimeMetricsUserData = {
            creaturePartAssemblyHeadBounds:
              finalCreaturePartRuntimeMetrics.partBounds.head ?? "",
            creaturePartAssemblyHeadCenter:
              finalCreaturePartRuntimeMetrics.partCenters.head ?? "",
            creaturePartAssemblyHeadAnchorCenter:
              finalCreaturePartRuntimeMetrics.partAnchorCenters.head ?? "",
            creaturePartAssemblyHeadLocalPosition:
              finalCreaturePartRuntimeMetrics.partLocalPositions.head ?? "",
            creaturePartAssemblyHeadAttachmentCorrection:
              finalCreaturePartRuntimeMetrics.partAttachmentCorrections.head ?? "",
            creaturePartAssemblyHeadModelResRef:
              finalCreaturePartRuntimeMetrics.partModelResRefs.head ?? "",
            creaturePartAssemblyNeckCenter:
              finalCreaturePartRuntimeMetrics.partCenters.neck ?? "",
            creaturePartAssemblyTorsoCenter:
              finalCreaturePartRuntimeMetrics.partCenters.torso ?? ""
          };
          const creaturePartModelGroupLoadUserData = {
            creaturePartModelGroupStatus:
              loadedEntries.length === creaturePartModelResolutions.length
                ? "loaded"
                : "partial",
            creaturePartModelGroupSourceHierarchyMode: "preserve-loaded",
            creaturePartModelGroupLoadedCount: loadedEntries.length,
            creaturePartModelGroupTotalCount: creaturePartModelResolutions.length,
            creatureSkeletonModelLoadStatus: skeletonModelLoadStatus
          };
          partGroup.userData = {
            ...partGroup.userData,
            ...creaturePartModelGroupLoadUserData,
            ...creaturePartAssemblyUserData,
            ...anchorSkeletonRenderSuppressionUserData,
            ...skeletonCompatibilityUserData,
            ...sourceMdlAnchorSkeletonUserData,
            ...skeletonLoadedFeatureUserData,
            ...creaturePartLoadedFeatureUserData,
            ...creaturePartRuntimeMetricsUserData
          };
          latestObjectRoot.userData = {
            ...latestObjectRoot.userData,
            ...creaturePartModelGroupLoadUserData,
            ...creaturePartAssemblyUserData,
            ...anchorSkeletonRenderSuppressionUserData,
            ...skeletonCompatibilityUserData,
            ...sourceMdlAnchorSkeletonUserData,
            ...skeletonLoadedFeatureUserData,
            ...creaturePartLoadedFeatureUserData,
            ...creaturePartRuntimeMetricsUserData
          };
          const creatureEmitterParticlePreviewGroup =
            createCreatureAuroraEmitterParticlePreviewGroup(
              runtime,
              creatureRenderPayload,
              objectRadius,
              colorHex,
              creatureTextureUrlsByReference,
              debugState.showNonRenderMeshes
            );
          if (creatureEmitterParticlePreviewGroup) {
            partGroup.add(creatureEmitterParticlePreviewGroup);
            partGroup.userData = {
              ...partGroup.userData,
              ...creatureEmitterParticlePreviewGroup.userData
            };
            latestObjectRoot.userData = {
              ...latestObjectRoot.userData,
              ...creatureEmitterParticlePreviewGroup.userData
            };
            const creatureEmitterTextureUrlsByReference =
              resolveCreatureAuroraEmitterTextureDeliveryUrlsForPayload(
                creatureRenderPayload,
                creatureTextureUrlsByReference
              );
            scheduleCreatureAuroraEmitterParticleTextureRefresh({
              runtime,
              objectId: object.id,
              root: latestObjectRoot,
              host: partGroup,
              particleGroup: creatureEmitterParticlePreviewGroup,
              textureUrlsByReference: creatureEmitterTextureUrlsByReference,
              writeModelDebugStatus: false
            });
          }
          const creatureEmitterPreviewGroup = createCreatureAuroraEmitterPreviewGroup(
            creatureRenderPayload,
            objectRadius,
            debugState.showNonRenderMeshes
          );
          if (creatureEmitterPreviewGroup) {
            partGroup.add(creatureEmitterPreviewGroup);
            partGroup.userData = {
              ...partGroup.userData,
              ...creatureEmitterPreviewGroup.userData
            };
            latestObjectRoot.userData = {
              ...latestObjectRoot.userData,
              ...creatureEmitterPreviewGroup.userData
            };
          }
          const creatureLightPreviewGroup = createCreatureAuroraLightPreviewGroup(
            creatureRenderPayload,
            objectRadius,
            debugState.showNonRenderMeshes,
            auroraLightRuntimeBudget
          );
          if (creatureLightPreviewGroup) {
            partGroup.add(creatureLightPreviewGroup);
            partGroup.userData = {
              ...partGroup.userData,
              ...creatureLightPreviewGroup.userData
            };
            latestObjectRoot.userData = {
              ...latestObjectRoot.userData,
              ...creatureLightPreviewGroup.userData
            };
          }
          const hasPendingCreatureTextureReferences =
            object.kind === "creatures" &&
            !debugState.wireframe &&
            creatureRenderableTextureUrlsByReference.size > 0;
          const preTextureCreatureTintResult =
            !hasPendingCreatureTextureReferences &&
            !debugState.wireframe && object.kind === "creatures"
              ? applyCreatureMaterialTintToModel(
                  partGroup,
                  creatureRenderPayload?.renderPackage?.colors
                )
              : null;
          const preTextureCreatureSkinFallbackTintResults =
            !hasPendingCreatureTextureReferences &&
            !debugState.wireframe && object.kind === "creatures"
              ? loadedEntries
                  .map(({ entry, model }) =>
                    applyCreatureSkinFallbackTintToPartModel(
                      entry,
                      model,
                      creatureRenderPayload?.renderPackage?.colors
                    )
                  )
                  .filter((result): result is CreatureTintApplicationResult => Boolean(result))
              : [];
          const preTextureCreatureSkinFallbackTintAppliedCount =
            preTextureCreatureSkinFallbackTintResults.length > 0
              ? preTextureCreatureSkinFallbackTintResults.reduce(
                  (sum, result) => sum + result.appliedCount,
                  0
                )
              : 0;
          const preTextureCreatureVisualTintApplied =
            Boolean(preTextureCreatureTintResult) ||
            preTextureCreatureSkinFallbackTintAppliedCount > 0;
          const preTextureCreatureVisualTintSource = preTextureCreatureTintResult
            ? "creature-material-tint"
            : preTextureCreatureSkinFallbackTintAppliedCount > 0
              ? "creature-skin-fallback-tint"
              : null;
          const preTextureCreatureTextureStatus: AreaObjectSharedRendererTextureStatus =
            hasPendingCreatureTextureReferences
              ? "loading"
              : preTextureCreatureVisualTintApplied
                ? "fallback"
                : "not-applicable";
          const preTextureCreatureTextureCount = Math.max(
            creatureRenderableTextureUrlsByReference.size,
            preTextureCreatureVisualTintApplied ? 1 : 0
          );
          const preTextureCreatureTextureLoaded =
            hasPendingCreatureTextureReferences || !preTextureCreatureVisualTintApplied ? 0 : 1;
          if (preTextureCreatureTintResult) {
            const preTextureTintUserData = {
              creatureMaterialTintStatus: "applied",
              creatureMaterialTintColor: preTextureCreatureTintResult.tintHex,
              creatureMaterialTintAppliedCount: preTextureCreatureTintResult.appliedCount,
              creatureMaterialTintChannels: preTextureCreatureTintResult.channels,
              creatureMaterialTintMode: "plt-layer-bridge",
              creatureMaterialTintLayerRows: preTextureCreatureTintResult.layerRows,
              creaturePltPaletteRowMax: CREATURE_PLT_PALETTE_ROW_MAX
            };
            partGroup.userData = {
              ...partGroup.userData,
              ...preTextureTintUserData
            };
            latestObjectRoot.userData = {
              ...latestObjectRoot.userData,
              ...preTextureTintUserData
            };
          }
          if (preTextureCreatureSkinFallbackTintResults.length > 0) {
            const preTextureSkinFallbackTintUserData = {
              creatureSkinFallbackTintStatus: "applied",
              creatureSkinFallbackTintAppliedCount:
                preTextureCreatureSkinFallbackTintAppliedCount,
              creatureSkinFallbackTintColor:
                preTextureCreatureSkinFallbackTintResults[0]?.tintHex ?? "",
              creatureSkinFallbackTintChannels: ["skin"],
              creatureSkinFallbackTintLayerRows:
                preTextureCreatureSkinFallbackTintResults[0]?.layerRows ?? {},
              creaturePltPaletteRowMax: CREATURE_PLT_PALETTE_ROW_MAX
            };
            partGroup.userData = {
              ...partGroup.userData,
              ...preTextureSkinFallbackTintUserData
            };
            latestObjectRoot.userData = {
              ...latestObjectRoot.userData,
              ...preTextureSkinFallbackTintUserData
            };
          }

          let creaturePartGroupScaledForArea = false;
          if (renderAreaGeometry && !preserveCreatureSourceModelUnitsForObject) {
            partGroup.scale.multiplyScalar(PLACEABLE_AREA_MODEL_AURORA_UNITS_TO_TILE_SPACE);
            creaturePartGroupScaledForArea = true;
          }
          const preTextureModelMetrics =
            resolvePlaceableNormalizedModelPresentationMetrics(partGroup);
          if (preTextureModelMetrics.boundsEmpty || preTextureModelMetrics.meshCount < 1) {
            markAreaObjectSharedRendererRuntimeEvidence(
              latestObjectRoot,
              sharedRendererModelFailedRuntimeEvidence
            );
            writePlaceableModelDebugStatus(runtime, "missing", {
              objectId: object.id,
              url: firstPartModelUrl,
              meshCount: preTextureModelMetrics.meshCount,
              bounds: preTextureModelMetrics.boundsEmpty ? "empty" : "invalid",
              loadPhase: "creature-part-models",
              loadCompleted: loadedEntries.length,
              loadTotal: creaturePartModelResolutions.length
            });
            return;
          }
          decoratePlaceableModelForObjectSelection(
            partGroup,
            object.id,
            object.kind,
            objectLabel
          );
          markAreaObjectSharedRendererRuntimeEvidence(
            latestObjectRoot,
            sharedRendererModelReadyRuntimeEvidence
          );
          markAreaObjectSharedRendererRuntimeEvidence(
            partGroup,
            sharedRendererModelReadyRuntimeEvidence
          );
          markAreaObjectSharedRendererModelMetrics(
            latestObjectRoot,
            preTextureModelMetrics
          );
          markAreaObjectSharedRendererTextureRuntimeEvidence(
            latestObjectRoot,
            preTextureCreatureTextureStatus,
            {
              textureCount: preTextureCreatureTextureCount,
              textureLoaded: preTextureCreatureTextureLoaded,
              textureSource: preTextureCreatureVisualTintSource
            }
          );
          writePlaceableModelDebugStatus(runtime, hasPendingCreatureTextureReferences ? "loading" : "loaded", {
            objectId: object.id,
            url: firstPartModelUrl,
            meshCount: preTextureModelMetrics.meshCount,
            bounds: preTextureModelMetrics.boundsLabel,
            loadPhase: "creature-part-models",
            loadCompleted: loadedEntries.length,
            loadTotal: creaturePartModelResolutions.length,
            creaturePartModelSourceHierarchyMode: "preserve-loaded",
            creaturePartAssemblyMode: creaturePartAssembly.mode,
            creaturePartAssemblyAxis: creaturePartAssembly.axis,
            creaturePartAssemblySkeletonMatchedCount:
              creaturePartAssembly.skeletonMatchedSlots?.length ?? 0,
            creaturePartAssemblySkeletonCompatibilityStatus: skeletonCompatibility.status,
            creaturePartAssemblySkeletonPrefix: skeletonCompatibility.skeletonPrefix,
            creaturePartAssemblyDominantPartPrefix: skeletonCompatibility.dominantPartPrefix,
            creaturePartAssemblySkeletonAnchorCoveredCount:
              skeletonCompatibility.anchorCoveredCount ?? null,
            creaturePartAssemblySkeletonAnchorTargetCount:
              skeletonCompatibility.anchorTargetCount ?? null,
            creaturePartEmbeddedAccessoryStabilizationStatus:
              embeddedAccessoryStabilization.status,
            creaturePartEmbeddedAccessoryStabilizedMeshNames:
              embeddedAccessoryStabilization.adjustedMeshNames.join("|"),
            creaturePartEmbeddedAccessoryStabilizationOffsets:
              embeddedAccessoryStabilization.adjustmentOffsets.join("|"),
            creatureSourceMdlAnchorSkeletonStatus:
              typeof sourceMdlAnchorSkeletonUserData.creatureSourceMdlAnchorSkeletonStatus ===
              "string"
                ? sourceMdlAnchorSkeletonUserData.creatureSourceMdlAnchorSkeletonStatus
                : null,
            creatureSourceMdlAnchorSkeletonOrientationCount:
              typeof sourceMdlAnchorSkeletonUserData.creatureSourceMdlAnchorSkeletonOrientationCount ===
              "number"
                ? sourceMdlAnchorSkeletonUserData.creatureSourceMdlAnchorSkeletonOrientationCount
                : null,
            textureStatus: preTextureCreatureTextureStatus,
            textureCount: preTextureCreatureTextureCount,
            textureLoaded: preTextureCreatureTextureLoaded,
            textureSource: preTextureCreatureVisualTintSource
          });
          if (primitiveFallbackMesh?.parent === latestObjectRoot) {
            latestObjectRoot.remove(primitiveFallbackMesh);
            disposeMeshResources(primitiveFallbackMesh);
          }
          const removedPreviousPartGroupCount =
            removeCreaturePartModelGroups(latestObjectRoot);
          if (partGroup.parent !== latestObjectRoot) {
            latestObjectRoot.add(partGroup);
          }
          const preTextureVisibleMeshRuntimeDiagnostics =
            collectCreatureVisibleMeshRuntimeDiagnostics(
              partGroup,
              effectiveSkeletonModel
            );
          const canPlayAnchoredCreaturePartAnimation =
            creaturePartAssembly.mode === "skeleton-anchors" &&
            Boolean(effectiveSkeletonModel);
          writeCreaturePartModelRuntimeStatus(runtime, "geometry-attached", {
            objectId: object.id,
            loadCompleted: loadedEntries.length,
            loadTotal: creaturePartModelResolutions.length,
            sourceHierarchyMode: "preserve-loaded",
            meshCount: preTextureModelMetrics.meshCount,
            bounds: preTextureModelMetrics.boundsLabel,
            headBounds: finalCreaturePartRuntimeMetrics.partBounds.head ?? null,
            headCenter: finalCreaturePartRuntimeMetrics.partCenters.head ?? null,
            headAnchorCenter:
              finalCreaturePartRuntimeMetrics.partAnchorCenters.head ?? null,
            headLocalPosition:
              finalCreaturePartRuntimeMetrics.partLocalPositions.head ?? null,
            headAttachmentCorrection:
              finalCreaturePartRuntimeMetrics.partAttachmentCorrections.head ?? null,
            headModelResRef: finalCreaturePartRuntimeMetrics.partModelResRefs.head ?? null,
            neckCenter: finalCreaturePartRuntimeMetrics.partCenters.neck ?? null,
            torsoCenter: finalCreaturePartRuntimeMetrics.partCenters.torso ?? null,
            embeddedAccessoryStabilizationStatus:
              embeddedAccessoryStabilization.status,
            embeddedAccessoryStabilizedMeshNames:
              embeddedAccessoryStabilization.adjustedMeshNames.join("|"),
            embeddedAccessoryStabilizationOffsets:
              embeddedAccessoryStabilization.adjustmentOffsets.join("|"),
            rootChildCount: latestObjectRoot.children.length,
            removedPreviousPartGroupCount,
            ...preTextureVisibleMeshRuntimeDiagnostics
          });
          const preTextureCreatureAnimationPlaybackUserData =
            applyCreatureAnimationPlaybackToModel(
              runtime,
              object,
              partGroup,
              loadedCreatureAnimationClips,
              {
                autoSelectDefaultClip: canPlayAnchoredCreaturePartAnimation,
                autoPlayDefaultClip: canPlayAnchoredCreaturePartAnimation,
                autoPlayExplicitClip: canPlayAnchoredCreaturePartAnimation,
                autoSelectIdleOnly: true,
                allowNonIdleDefaultFallback: true,
                playbackRoot:
                  creaturePartAssembly.mode === "skeleton-anchors"
                    ? partGroup
                    : null,
                applyInitialPose: true,
                enableSourceGeometryRuntimeEffects: true,
                mirrorUserDataTargets: [latestObjectRoot]
              }
            );
          if (preTextureCreatureAnimationPlaybackUserData) {
            partGroup.userData = {
              ...partGroup.userData,
              ...preTextureCreatureAnimationPlaybackUserData
            };
            latestObjectRoot.userData = {
              ...latestObjectRoot.userData,
              ...preTextureCreatureAnimationPlaybackUserData
            };
            writeRuntimeObjectAnimationDataset(runtime);
          }
          applyCreatureEquipmentMarkers(latestObjectRoot, creatureRenderPayload, objectRadius, {
            showDiagnosticMarkers: debugState.showNonRenderMeshes
          });
          applyCreatureEquipmentModelParts({
            runtime,
            objectId: object.id,
            root: latestObjectRoot,
            resolutions: creatureEquipmentModelPartResolutions,
            objectRadius,
            textureUrlsByReference: creatureRenderableTextureUrlsByReference,
            textureBindings: modelTextureBindings,
            auroraMaterial: modelAuroraMaterial,
            colors: creatureRenderPayload?.renderPackage?.colors,
            appearanceProfile: creatureRenderPayload?.renderPackage?.appearanceProfile,
            wireframe: debugState.wireframe,
            requestedAnimationName: resolveCreatureSelectedAnimationName(object)
          });

          const resolvedTextureEntries =
            creatureRenderableTextureUrlsByReference.size > 0 && !debugState.wireframe
              ? await Promise.all(
                  Array.from(creatureRenderableTextureUrlsByReference.entries()).map(
                    async ([reference, textureDeliveryUrl]) => {
                      const texture = await ensurePlaceableTextureReferenceWithTimeout(
                        runtime,
                        textureDeliveryUrl
                      );
                      return texture ? ([reference, texture] as const) : null;
                    }
                  )
                )
              : [];
          const texturesByReference = new Map<string, THREE.Texture>();
          resolvedTextureEntries.forEach((entry) => {
            if (entry) {
              texturesByReference.set(entry[0], entry[1]);
            }
          });
          if (object.kind === "creatures") {
            const cachedCreatureTexturesByReference = collectCachedPlaceableTexturesByReference(
              runtime,
              creatureTextureUrlsByReference
            );
            cachedCreatureTexturesByReference.forEach((texture, reference) => {
              if (!texturesByReference.has(reference) && isCreaturePltTexture(texture)) {
                texturesByReference.set(reference, texture);
              }
            });
          }
          await ensureCreatureRetailPltPaletteDataForTextures(
            texturesByReference,
            creatureRenderPayload?.renderPackage?.colors
          );
          if (
            runtime.objectMeshById.get(object.id) !== latestObjectRoot ||
            latestObjectRoot.userData.renderPackageModelRequestSignature !==
              partModelRequestSignature ||
            latestObjectRoot.userData.renderPackageModelRequestToken !==
              partModelRequestToken
          ) {
            return;
          }
          const creaturePltTextureBridge = buildCreaturePltTextureBridge(
            texturesByReference,
            creatureRenderPayload?.renderPackage?.colors
          );
          if (creaturePltTextureBridge.appliedCount > 0) {
            const creaturePltTextureBridgeUserData = {
              creaturePltTextureBridgeStatus: "applied",
              creaturePltTextureBridgeCount: creaturePltTextureBridge.appliedCount,
              creaturePltTextureBridgeReferences: creaturePltTextureBridge.references,
              creaturePltTextureBridgeMode: creaturePltTextureBridge.mode,
              creaturePltTextureBridgeLayerRows: creaturePltTextureBridge.layerRows,
              creaturePltPaletteRowMax: CREATURE_PLT_PALETTE_ROW_MAX
            };
            partGroup.userData = {
              ...partGroup.userData,
              ...creaturePltTextureBridgeUserData
            };
            latestObjectRoot.userData = {
              ...latestObjectRoot.userData,
              ...creaturePltTextureBridgeUserData
            };
          }
          if (creaturePltTextureBridge.texturesByReference.size > 0) {
            applyPlaceableTexturesToModel(
              partGroup,
              creaturePltTextureBridge.texturesByReference,
              undefined,
              {
                auroraMaterial: modelAuroraMaterial,
                textureBindings: modelTextureBindings,
                skipMesh: shouldSkipCreatureSourcePreviewTextureApplication
              }
            );
            clearCreatureAuroraEmitterNonEmitterTextureMaps(partGroup);
          }
          const creaturePartModelExactTextureResult =
            !debugState.wireframe && object.kind === "creatures"
              ? applyCreatureExactPartTexturesToLoadedModels(
                  loadedEntries,
                  texturesByReference,
                  {
                    auroraMaterial: modelAuroraMaterial,
                    textureBindings: modelTextureBindings
                  },
                  creatureRenderPayload?.renderPackage?.colors
                )
              : {
                  appliedCount: 0,
                  references: []
                };
          if (creaturePartModelExactTextureResult.appliedCount > 0) {
            const creaturePartModelExactTextureUserData = {
              creaturePartModelExactTextureStatus: "applied",
              creaturePartModelExactTextureAppliedCount:
                creaturePartModelExactTextureResult.appliedCount,
              creaturePartModelExactTextureReferences:
                creaturePartModelExactTextureResult.references
            };
            partGroup.userData = {
              ...partGroup.userData,
              ...creaturePartModelExactTextureUserData
            };
            latestObjectRoot.userData = {
              ...latestObjectRoot.userData,
              ...creaturePartModelExactTextureUserData
            };
          }
          const creatureTintResult =
            !debugState.wireframe && object.kind === "creatures"
              ? applyCreatureMaterialTintToModel(
                  partGroup,
                  creatureRenderPayload?.renderPackage?.colors
                )
              : null;
          const creatureSkinFallbackTintResults =
            !debugState.wireframe && object.kind === "creatures"
              ? loadedEntries
                  .map(({ entry, model }) =>
                    applyCreatureSkinFallbackTintToPartModel(
                      entry,
                      model,
                      creatureRenderPayload?.renderPackage?.colors
                    )
                  )
                  .filter((result): result is CreatureTintApplicationResult => Boolean(result))
              : [];
          const creatureSkinFallbackTintAppliedCount =
            creatureSkinFallbackTintResults.length > 0
              ? creatureSkinFallbackTintResults.reduce(
                  (sum, result) => sum + result.appliedCount,
                  0
                )
              : 0;
          const creatureSkinFallbackTintTextureAppliedCount =
            creatureSkinFallbackTintResults.length > 0
              ? creatureSkinFallbackTintResults.reduce(
                  (sum, result) => sum + (result.textureAppliedCount ?? 0),
                  0
                )
              : 0;
          const creatureSkinFallbackTintMaterialReplacementCount =
            creatureSkinFallbackTintResults.length > 0
              ? creatureSkinFallbackTintResults.reduce(
                  (sum, result) => sum + (result.materialReplacementCount ?? 0),
                  0
                )
              : 0;
          const creatureVisualTintApplied =
            Boolean(creatureTintResult) || creatureSkinFallbackTintAppliedCount > 0;
          const creatureLoadedTextureCount = texturesByReference.size;
          const creatureExpectedTextureCount = Math.max(
            creatureRenderableTextureUrlsByReference.size,
            creatureLoadedTextureCount
          );
          const creatureTextureApplicationStatus: AreaObjectSharedRendererTextureStatus =
            creatureLoadedTextureCount > 0
              ? creatureRenderableTextureUrlsByReference.size > 0 &&
                creatureLoadedTextureCount < creatureRenderableTextureUrlsByReference.size
                ? "partial"
                : "applied"
              : creatureRenderableTextureUrlsByReference.size > 0
                ? "missing"
                : creatureVisualTintApplied
                  ? "fallback"
                  : "not-applicable";
          const creatureTextureEvidenceCount =
            creatureExpectedTextureCount > 0
              ? creatureExpectedTextureCount
              : creatureVisualTintApplied
                ? 1
                : 0;
          const creatureTextureEvidenceLoaded =
            creatureExpectedTextureCount > 0
              ? Math.min(creatureLoadedTextureCount, creatureTextureEvidenceCount)
              : creatureVisualTintApplied
                ? 1
                : 0;
          const creatureTextureEvidenceSource =
            texturesByReference.size > 0
              ? summarizePlaceableTextureSourceFormats(texturesByReference.values())
              : creatureTintResult
                ? "creature-material-tint"
                : creatureSkinFallbackTintAppliedCount > 0
                  ? "creature-skin-fallback-tint"
                  : null;
          if (creatureTintResult) {
            partGroup.userData = {
              ...partGroup.userData,
              creatureMaterialTintStatus: "applied",
              creatureMaterialTintColor: creatureTintResult.tintHex,
              creatureMaterialTintAppliedCount: creatureTintResult.appliedCount,
              creatureMaterialTintChannels: creatureTintResult.channels,
              creatureMaterialTintMode: "plt-layer-bridge",
              creatureMaterialTintLayerRows: creatureTintResult.layerRows,
              creaturePltPaletteRowMax: CREATURE_PLT_PALETTE_ROW_MAX
            };
          }
          if (creatureSkinFallbackTintResults.length > 0) {
            partGroup.userData = {
              ...partGroup.userData,
              creatureSkinFallbackTintStatus: "applied",
              creatureSkinFallbackTintAppliedCount,
              creatureSkinFallbackTintTextureAppliedCount,
              creatureSkinFallbackTintMaterialReplacementCount,
              creatureSkinFallbackTintColor: creatureSkinFallbackTintResults[0]?.tintHex ?? "",
              creatureSkinFallbackTintChannels: ["skin"],
              creatureSkinFallbackTintLayerRows:
                creatureSkinFallbackTintResults[0]?.layerRows ?? {},
              creaturePltPaletteRowMax: CREATURE_PLT_PALETTE_ROW_MAX
            };
          }
          const creatureAnimationPlaybackUserData =
            applyCreatureAnimationPlaybackToModel(
              runtime,
              object,
              partGroup,
              loadedCreatureAnimationClips,
              {
                autoSelectDefaultClip: canPlayAnchoredCreaturePartAnimation,
                autoPlayDefaultClip: canPlayAnchoredCreaturePartAnimation,
                autoPlayExplicitClip: canPlayAnchoredCreaturePartAnimation,
                autoSelectIdleOnly: true,
                allowNonIdleDefaultFallback: true,
                playbackRoot:
                  creaturePartAssembly.mode === "skeleton-anchors"
                    ? partGroup
                    : null,
                applyInitialPose: true,
                enableSourceGeometryRuntimeEffects: true,
                mirrorUserDataTargets: [latestObjectRoot]
              }
            );
          if (creatureAnimationPlaybackUserData) {
            partGroup.userData = {
              ...partGroup.userData,
              ...creatureAnimationPlaybackUserData
            };
            latestObjectRoot.userData = {
              ...latestObjectRoot.userData,
              ...creatureAnimationPlaybackUserData
            };
            writeRuntimeObjectAnimationDataset(runtime);
          }

          if (renderAreaGeometry && !preserveCreatureSourceModelUnitsForObject) {
            if (!creaturePartGroupScaledForArea) {
              partGroup.scale.multiplyScalar(PLACEABLE_AREA_MODEL_AURORA_UNITS_TO_TILE_SPACE);
              creaturePartGroupScaledForArea = true;
            }
          }

          const modelMetrics =
            resolvePlaceableNormalizedModelPresentationMetrics(partGroup);
          if (modelMetrics.boundsEmpty || modelMetrics.meshCount < 1) {
            markAreaObjectSharedRendererRuntimeEvidence(
              latestObjectRoot,
              sharedRendererModelFailedRuntimeEvidence
            );
            writePlaceableModelDebugStatus(runtime, "missing", {
              objectId: object.id,
              url: firstPartModelUrl,
              meshCount: modelMetrics.meshCount,
              bounds: modelMetrics.boundsEmpty ? "empty" : "invalid",
              loadPhase: "creature-part-models",
              loadCompleted: loadedEntries.length,
              loadTotal: creaturePartModelResolutions.length
            });
            return;
          }

          decoratePlaceableModelForObjectSelection(
            partGroup,
            object.id,
            object.kind,
            objectLabel
          );
          markAreaObjectSharedRendererRuntimeEvidence(
            latestObjectRoot,
            sharedRendererModelReadyRuntimeEvidence
          );
          markAreaObjectSharedRendererRuntimeEvidence(
            partGroup,
            sharedRendererModelReadyRuntimeEvidence
          );
          markAreaObjectSharedRendererModelMetrics(latestObjectRoot, modelMetrics);
          markAreaObjectSharedRendererTextureRuntimeEvidence(
            latestObjectRoot,
            creatureTextureApplicationStatus,
            {
              textureCount: creatureTextureEvidenceCount,
              textureLoaded: creatureTextureEvidenceLoaded,
              textureSource: creatureTextureEvidenceSource
            }
          );
          if (creatureTintResult) {
            latestObjectRoot.userData = {
              ...latestObjectRoot.userData,
              creatureMaterialTintStatus: "applied",
              creatureMaterialTintColor: creatureTintResult.tintHex,
              creatureMaterialTintAppliedCount: creatureTintResult.appliedCount,
              creatureMaterialTintChannels: creatureTintResult.channels,
              creatureMaterialTintMode: "plt-layer-bridge",
              creatureMaterialTintLayerRows: creatureTintResult.layerRows,
              creaturePltPaletteRowMax: CREATURE_PLT_PALETTE_ROW_MAX
            };
          }
          if (creatureSkinFallbackTintResults.length > 0) {
            latestObjectRoot.userData = {
              ...latestObjectRoot.userData,
              creatureSkinFallbackTintStatus: "applied",
              creatureSkinFallbackTintAppliedCount,
              creatureSkinFallbackTintTextureAppliedCount,
              creatureSkinFallbackTintMaterialReplacementCount,
              creatureSkinFallbackTintColor: creatureSkinFallbackTintResults[0]?.tintHex ?? "",
              creatureSkinFallbackTintChannels: ["skin"],
              creatureSkinFallbackTintLayerRows:
                creatureSkinFallbackTintResults[0]?.layerRows ?? {},
              creaturePltPaletteRowMax: CREATURE_PLT_PALETTE_ROW_MAX
            };
          }
          writePlaceableModelDebugStatus(runtime, "loaded", {
            objectId: object.id,
            url: firstPartModelUrl,
            meshCount: modelMetrics.meshCount,
            bounds: modelMetrics.boundsLabel,
            loadPhase: "creature-part-models",
            loadCompleted: loadedEntries.length,
            loadTotal: creaturePartModelResolutions.length,
            creaturePartAssemblyMode: creaturePartAssembly.mode,
            creaturePartAssemblyAxis: creaturePartAssembly.axis,
            creaturePartAssemblySkeletonMatchedCount:
              creaturePartAssembly.skeletonMatchedSlots?.length ?? 0,
            creaturePartAssemblySkeletonCompatibilityStatus: skeletonCompatibility.status,
            creaturePartAssemblySkeletonPrefix: skeletonCompatibility.skeletonPrefix,
            creaturePartAssemblyDominantPartPrefix: skeletonCompatibility.dominantPartPrefix,
            creaturePartAssemblySkeletonAnchorCoveredCount:
              skeletonCompatibility.anchorCoveredCount ?? null,
            creaturePartAssemblySkeletonAnchorTargetCount:
              skeletonCompatibility.anchorTargetCount ?? null,
            creaturePartEmbeddedAccessoryStabilizationStatus:
              embeddedAccessoryStabilization.status,
            creaturePartEmbeddedAccessoryStabilizedMeshNames:
              embeddedAccessoryStabilization.adjustedMeshNames.join("|"),
            creaturePartEmbeddedAccessoryStabilizationOffsets:
              embeddedAccessoryStabilization.adjustmentOffsets.join("|"),
            creatureSourceMdlAnchorSkeletonStatus:
              typeof sourceMdlAnchorSkeletonUserData.creatureSourceMdlAnchorSkeletonStatus ===
              "string"
                ? sourceMdlAnchorSkeletonUserData.creatureSourceMdlAnchorSkeletonStatus
                : null,
            creatureSourceMdlAnchorSkeletonOrientationCount:
              typeof sourceMdlAnchorSkeletonUserData.creatureSourceMdlAnchorSkeletonOrientationCount ===
              "number"
                ? sourceMdlAnchorSkeletonUserData.creatureSourceMdlAnchorSkeletonOrientationCount
                : null,
            creatureSkinFallbackTintAppliedCount:
              creatureSkinFallbackTintAppliedCount > 0
                ? creatureSkinFallbackTintAppliedCount
                : null,
            creatureSkinFallbackTintTextureAppliedCount:
              creatureSkinFallbackTintTextureAppliedCount > 0
                ? creatureSkinFallbackTintTextureAppliedCount
                : null,
            creatureSkinFallbackTintMaterialReplacementCount:
              creatureSkinFallbackTintMaterialReplacementCount > 0
                ? creatureSkinFallbackTintMaterialReplacementCount
                : null,
            creaturePartModelExactTextureAppliedCount:
              creaturePartModelExactTextureResult.appliedCount > 0
                ? creaturePartModelExactTextureResult.appliedCount
                : null,
            creaturePartModelExactTextureReferences:
              creaturePartModelExactTextureResult.references.length > 0
                ? creaturePartModelExactTextureResult.references.join("|")
                : null,
            creaturePltTextureBridgeStatus:
              creaturePltTextureBridge.appliedCount > 0 ? "applied" : null,
            creaturePltTextureBridgeCount:
              creaturePltTextureBridge.appliedCount > 0
                ? creaturePltTextureBridge.appliedCount
                : null,
            creaturePltTextureBridgeMode:
              creaturePltTextureBridge.appliedCount > 0
                ? creaturePltTextureBridge.mode
                : null,
            creaturePltTextureBridgeReferences:
              creaturePltTextureBridge.references.length > 0
                ? creaturePltTextureBridge.references.join("|")
                : null,
            textureStatus: creatureTextureApplicationStatus,
            textureCount: creatureTextureEvidenceCount,
            textureLoaded: creatureTextureEvidenceLoaded,
            textureSource: creatureTextureEvidenceSource
          });
          if (primitiveFallbackMesh?.parent === latestObjectRoot) {
            latestObjectRoot.remove(primitiveFallbackMesh);
            disposeMeshResources(primitiveFallbackMesh);
          }
          if (partGroup.parent !== latestObjectRoot) {
            latestObjectRoot.add(partGroup);
          }
          applyCreatureEquipmentModelParts({
            runtime,
            objectId: object.id,
            root: latestObjectRoot,
            resolutions: creatureEquipmentModelPartResolutions,
            objectRadius,
            textureUrlsByReference: creatureRenderableTextureUrlsByReference,
            textureBindings: modelTextureBindings,
            auroraMaterial: modelAuroraMaterial,
            colors: creatureRenderPayload?.renderPackage?.colors,
            appearanceProfile: creatureRenderPayload?.renderPackage?.appearanceProfile,
            wireframe: debugState.wireframe,
            requestedAnimationName: resolveCreatureSelectedAnimationName(object)
          });
          const finalVisibleMeshRuntimeDiagnostics =
            collectCreatureVisibleMeshRuntimeDiagnostics(
              partGroup,
              effectiveSkeletonModel
            );
          const finalMaterialRuntimeDiagnostics =
            collectCreatureMaterialRuntimeDiagnostics(partGroup);
          writeCreaturePartModelRuntimeStatus(runtime, "textures-attached", {
            objectId: object.id,
            loadCompleted: loadedEntries.length,
            loadTotal: creaturePartModelResolutions.length,
            meshCount: modelMetrics.meshCount,
            bounds: modelMetrics.boundsLabel,
            headBounds: finalCreaturePartRuntimeMetrics.partBounds.head ?? null,
            headCenter: finalCreaturePartRuntimeMetrics.partCenters.head ?? null,
            headAnchorCenter:
              finalCreaturePartRuntimeMetrics.partAnchorCenters.head ?? null,
            headLocalPosition:
              finalCreaturePartRuntimeMetrics.partLocalPositions.head ?? null,
            headAttachmentCorrection:
              finalCreaturePartRuntimeMetrics.partAttachmentCorrections.head ?? null,
            headModelResRef: finalCreaturePartRuntimeMetrics.partModelResRefs.head ?? null,
            neckCenter: finalCreaturePartRuntimeMetrics.partCenters.neck ?? null,
            torsoCenter: finalCreaturePartRuntimeMetrics.partCenters.torso ?? null,
            embeddedAccessoryStabilizationStatus:
              embeddedAccessoryStabilization.status,
            embeddedAccessoryStabilizedMeshNames:
              embeddedAccessoryStabilization.adjustedMeshNames.join("|"),
            embeddedAccessoryStabilizationOffsets:
              embeddedAccessoryStabilization.adjustmentOffsets.join("|"),
            rootChildCount: latestObjectRoot.children.length,
            textureStatus: creatureTextureApplicationStatus,
            textureCount: creatureTextureEvidenceCount,
            textureLoaded: creatureTextureEvidenceLoaded,
            creaturePartModelExactTextureAppliedCount:
              creaturePartModelExactTextureResult.appliedCount > 0
                ? creaturePartModelExactTextureResult.appliedCount
                : null,
            creaturePartModelExactTextureReferences:
              creaturePartModelExactTextureResult.references.length > 0
                ? creaturePartModelExactTextureResult.references.join("|")
                : null,
            creaturePltTextureBridgeStatus:
              creaturePltTextureBridge.appliedCount > 0 ? "applied" : null,
            creaturePltTextureBridgeCount:
              creaturePltTextureBridge.appliedCount > 0
                ? creaturePltTextureBridge.appliedCount
                : null,
            creaturePltTextureBridgeMode:
              creaturePltTextureBridge.appliedCount > 0
                ? creaturePltTextureBridge.mode
                : null,
            creaturePltTextureBridgeReferences:
              creaturePltTextureBridge.references.length > 0
                ? creaturePltTextureBridge.references.join("|")
                : null,
            ...finalVisibleMeshRuntimeDiagnostics,
            ...finalMaterialRuntimeDiagnostics
          });
        }).catch((error) => {
          const message = error instanceof Error ? error.message : String(error);
          writeCreaturePartModelRuntimeStatus(runtime, "error", {
            objectId: object.id,
            loadTotal: creaturePartModelResolutions.length,
            error: message.slice(0, 240)
          });
          writePlaceableModelDebugStatus(runtime, "missing", {
            objectId: object.id,
            url: firstPartModelUrl,
            loadPhase: "creature-part-models",
            loadCompleted: 0,
            loadTotal: creaturePartModelResolutions.length
          });
        });
      } else if (objectRenderPackageModelUrl) {
        const shouldCloneModelMaterials =
          (shouldLoadPlaceableModel || object.kind === "creatures") &&
          !canShareTexturedModelMaterials &&
          !debugState.wireframe &&
          (modelTextureUrlsByReference.size > 0 || Boolean(modelFallbackTextureUrl));
        const directCreatureSourceHierarchyMode = undefined;
        writePlaceableModelDebugStatus(runtime, "loading", {
          objectId: object.id,
          url: objectRenderPackageModelUrl,
          loadPhase: "model",
          loadCompleted: 0,
          loadTotal: 1
        });
        const placeableModelRequest =
          renderAreaGeometry || preserveCreatureSourceModelUnitsForObject
          ? ensurePlaceableModel(runtime, objectRenderPackageModelUrl, {
              cloneMaterials: shouldCloneModelMaterials,
              cacheKey: objectRenderPackageModelCacheKey,
              sourceHierarchyMode: directCreatureSourceHierarchyMode
            })
          : ensureNormalizedPlaceableModel(
              runtime,
              objectRenderPackageModelUrl,
              objectRadius,
              {
                targetMaxAxisFactor: placeableModelTargetMaxAxisFactor,
                cloneMaterials: shouldCloneModelMaterials,
                cacheKey: objectRenderPackageModelCacheKey,
                sourceHierarchyMode: directCreatureSourceHierarchyMode
              }
            );
        const creatureDirectSupermodelModelRequest =
          object.kind === "creatures" && creatureRenderModelResolution?.supermodelModelUrl
            ? ensurePlaceableModel(
                runtime,
                creatureRenderModelResolution.supermodelModelUrl,
                {
                  cacheKey: creatureRenderModelResolution.supermodelModelCacheKey
                }
              )
            : Promise.resolve(null);
        const creatureDirectSupermodelChainModelRequest =
          object.kind === "creatures" &&
          creatureRenderModelResolution?.supermodelChainModelUrls?.length
            ? Promise.all(
                creatureRenderModelResolution.supermodelChainModelUrls.map((modelUrl, index) =>
                  ensurePlaceableModel(runtime, modelUrl, {
                    cacheKey:
                      creatureRenderModelResolution.supermodelChainModelCacheKeys?.[index] ??
                      `${creatureRenderModelResolution.supermodelModelCacheKey ?? "supermodel-chain"}:${index}`
                  }).catch(() => null)
                )
              )
            : Promise.resolve([]);
        void Promise.all([
          placeableModelRequest,
          creatureDirectSupermodelModelRequest,
          creatureDirectSupermodelChainModelRequest
        ]).then(([resolvedModel, creatureDirectSupermodelModel, creatureDirectSupermodelChainModels]) => {
          if (!resolvedModel) {
            const hasCreatureAlternateModelGeometry =
              object.kind === "creatures" &&
              (creaturePartModelResolutions.length > 0 ||
                creatureEquipmentModelPartResolutions.length > 0);
            const latestObjectRoot = runtime.objectMeshById.get(object.id);
            if (
              !hasCreatureAlternateModelGeometry &&
              latestObjectRoot &&
              latestObjectRoot.userData.renderPackageModelUrl === objectRenderPackageModelUrl
            ) {
              markAreaObjectSharedRendererRuntimeEvidence(
                latestObjectRoot,
                sharedRendererModelFailedRuntimeEvidence
              );
            }
            if (!hasCreatureAlternateModelGeometry) {
              writePlaceableModelDebugStatus(runtime, "missing", {
                objectId: object.id,
                url: objectRenderPackageModelUrl,
                loadPhase: "model",
                loadCompleted: 1,
                loadTotal: 1
              });
            }
            return;
          }
          const latestObjectRoot = runtime.objectMeshById.get(object.id);
          if (!latestObjectRoot) {
            return;
          }
          if (
            latestObjectRoot.userData.renderPackageModelUrl !== objectRenderPackageModelUrl ||
            latestObjectRoot.userData.renderPackageModelRequestToken !==
              objectRenderRequestToken
          ) {
            return;
          }

          const directModelAnimationClips =
            object.kind === "creatures"
              ? collectCreatureLoadedModelAnimationClips(resolvedModel)
              : [];
          const directSupermodelAnimationClips =
            object.kind === "creatures" && creatureDirectSupermodelModel
              ? buildAuroraSupermodelAnimationClips(
                  resolvedModel,
                  creatureDirectSupermodelModel,
                  {
                    duplicateTargetMode: "all-by-uuid",
                    suppressRootDummyPositionTracks: true,
                    suppressRootPositionTracks: true
                  }
                )
              : [];
          const directSupermodelChainAnimationClips =
            object.kind === "creatures"
              ? creatureDirectSupermodelChainModels.flatMap((supermodel) =>
                  supermodel
                    ? buildAuroraSupermodelAnimationClips(resolvedModel, supermodel, {
                        duplicateTargetMode: "all-by-uuid",
                        suppressRootDummyPositionTracks: true,
                        suppressRootPositionTracks: true
                      })
                    : []
                )
              : [];
          const combinedDirectSupermodelAnimationClips = deduplicateCreatureAnimationClips([
            ...directSupermodelAnimationClips,
            ...directSupermodelChainAnimationClips
          ]);
          const loadedCreatureAnimationClips =
            object.kind === "creatures"
              ? [
                  ...directModelAnimationClips,
                  ...combinedDirectSupermodelAnimationClips
                ]
              : [];
          const creatureDirectSupermodelUserData =
            object.kind === "creatures"
              ? {
                  creatureRenderDirectSupermodelLoadStatus:
                    creatureRenderModelResolution?.supermodelModelUrl
                      ? creatureDirectSupermodelModel
                        ? "loaded"
                        : "missing"
                      : "not-applicable",
                  creatureRenderDirectSupermodelResRef:
                    creatureRenderModelResolution?.supermodelResRef ?? "",
                  creatureRenderDirectSupermodelCacheKey:
                    creatureRenderModelResolution?.supermodelModelCacheKey ?? "",
                  creatureRenderDirectSupermodelClipCount:
                    combinedDirectSupermodelAnimationClips.length,
                  creatureRenderDirectSupermodelClipNames:
                    combinedDirectSupermodelAnimationClips.map((clip) => clip.name),
                  creatureRenderDirectSupermodelChainLoadCount:
                    creatureDirectSupermodelChainModels.filter(Boolean).length,
                  creatureRenderDirectSupermodelChainResRefs:
                    creatureRenderModelResolution?.supermodelChainResRefs ?? []
                }
              : {};
          if (renderAreaGeometry && !preserveCreatureSourceModelUnitsForObject) {
            resolvedModel.scale.multiplyScalar(
              PLACEABLE_AREA_MODEL_AURORA_UNITS_TO_TILE_SPACE
            );
            applyAreaTerrainOverlayPresentationScale(resolvedModel, object);
            const terrainSurfaceEvidence = resolveAreaObjectTerrainSurfaceEvidence(
              runtime,
              renderAreaGeometry,
              areaWidth,
              renderObjectX + visualOffset.x,
              renderObjectZ + visualOffset.z
            );
            applyAreaObjectModelSurfaceOffset(
              resolvedModel,
              object,
              object.z,
              resolveObjectVisualScaleVector(effectiveVisualTransform, 1).y,
              terrainSurfaceEvidence
            );
            applyAreaObjectTerrainSurfaceClip(
              latestObjectRoot,
              resolvedModel,
              object,
              terrainSurfaceEvidence
            );
            copyAreaObjectModelSurfaceEvidence(latestObjectRoot, resolvedModel);
          }
          const modelMetrics =
            resolvePlaceableNormalizedModelPresentationMetrics(resolvedModel);
          if (modelMetrics.boundsEmpty || modelMetrics.meshCount < 1) {
            const hasCreatureAlternateModelGeometry =
              object.kind === "creatures" &&
              (creaturePartModelResolutions.length > 0 ||
                creatureEquipmentModelPartResolutions.length > 0);
            if (!hasCreatureAlternateModelGeometry) {
              markAreaObjectSharedRendererRuntimeEvidence(
                latestObjectRoot,
                sharedRendererModelFailedRuntimeEvidence
              );
              writePlaceableModelDebugStatus(runtime, "missing", {
                objectId: object.id,
                url: objectRenderPackageModelUrl,
                meshCount: modelMetrics.meshCount,
                bounds: modelMetrics.boundsEmpty ? "empty" : "invalid",
                loadPhase: "model",
                loadCompleted: 1,
                loadTotal: 1
              });
            }
            return;
          }
          decoratePlaceableModelForObjectSelection(
            resolvedModel,
            object.id,
            object.kind,
            objectLabel
          );
          markAreaObjectSharedRendererRuntimeEvidence(
            resolvedModel,
            sharedRendererModelReadyRuntimeEvidence
          );
          if (object.kind === "creatures") {
            const creatureLoadedModelFeatureSummary =
              summarizeCreatureLoadedModelFeatures(resolvedModel);
            const creatureLoadedModelFeatureUserData =
              buildCreatureLoadedModelFeatureUserData(
                "creatureRenderLoadedModel",
                resolvedModel
              );
            const requestedCreatureAnimationName =
              resolveCreatureSelectedAnimationName(object);
            const directModelDefaultAnimationClips =
              !requestedCreatureAnimationName && directModelAnimationClips.length > 0
                ? selectCreatureAnimationPlaybackClips(
                    directModelAnimationClips,
                    null,
                    { autoIdleOnly: true }
                  )
                : [];
            const directDefaultAnimationClips =
              directModelDefaultAnimationClips.length > 0
                ? directModelAnimationClips
                : loadedCreatureAnimationClips;
            const directAnimationCandidateClips =
              requestedCreatureAnimationName || loadedCreatureAnimationClips.length > 0
                ? selectCreatureAnimationPlaybackClips(
                    requestedCreatureAnimationName
                      ? loadedCreatureAnimationClips
                      : directDefaultAnimationClips,
                    requestedCreatureAnimationName,
                    {
                      autoIdleOnly: !requestedCreatureAnimationName,
                      allowNonIdleFallback: !requestedCreatureAnimationName
                    }
                  )
                : [];
            const unsafeDirectAnimationTrackNames =
              collectCreatureAnimationTracksTargetingNodes(
                directAnimationCandidateClips,
                creatureLoadedModelFeatureSummary.sourceHierarchyRebasedGeometryNodeNames
              );
            const sourceSkinMeshAnimationTrackNames =
              collectCreatureAnimationTracksTargetingNodes(
                directAnimationCandidateClips,
                creatureLoadedModelFeatureSummary.sourceSkinMeshNodeNames
              );
            const sourceSkinBoneAnimationTrackNames =
              collectCreatureAnimationTracksTargetingNodes(
                directAnimationCandidateClips,
                creatureLoadedModelFeatureSummary.sourceSkinInfluencingBoneNames
              );
            const renderableRebasedGeometryAnimationTrackNames =
              collectCreatureAnimationTracksTargetingRenderableRebasedGeometry(
                directAnimationCandidateClips,
                creatureLoadedModelFeatureSummary
              );
            const sourceSkinningAnimationTrackNames = Array.from(
              new Set([
                ...unsafeDirectAnimationTrackNames,
                ...sourceSkinBoneAnimationTrackNames
              ])
            );
            const directModelType = String(
              creatureRenderPayload?.renderPackage?.appearanceProfile?.modelType ?? ""
            )
              .trim()
              .toUpperCase();
            const isSegmentedHumanoidDirectModel =
              directModelType === "F" || directModelType === "FW";
            const hasOwnSourceAnimationClips =
              (creatureLoadedModelFeatureSummary.sourceAnimationClipCount ?? 0) > 0;
            const directAnimationCandidateUsesRetargetedSupermodel =
              directAnimationCandidateClips.some(isAuroraSupermodelRetargetedAnimationClip);
            const directAnimationCandidateUsesOnlyRetargetedSupermodel =
              directAnimationCandidateClips.length > 0 &&
              directAnimationCandidateClips.every(isAuroraSupermodelRetargetedAnimationClip);
            const canUseRetargetedSupermodelDespiteOwnSourceClips =
              directAnimationCandidateUsesOnlyRetargetedSupermodel &&
              (creatureLoadedModelFeatureSummary.sourceSkinMeshCount ?? 0) > 0 &&
              sourceSkinBoneAnimationTrackNames.length > 0 &&
              sourceSkinMeshAnimationTrackNames.length === 0;
            const declaredDirectSupermodelName = normalizeCreatureNodeName(
              creatureLoadedModelFeatureSummary.supermodel ?? ""
            );
            const resolvedDirectSupermodelName = normalizeCreatureNodeName(
              creatureRenderModelResolution?.supermodelResRef ?? ""
            );
            const directModelDeclaresResolvedSupermodel =
              declaredDirectSupermodelName.length > 0 &&
              resolvedDirectSupermodelName.length > 0 &&
              declaredDirectSupermodelName === resolvedDirectSupermodelName;
            const canPlayRebasedSourceSkinningAnimationCandidate =
              canPlayRebasedDirectAnimationViaSourceSkinning(
                creatureLoadedModelFeatureSummary,
                sourceSkinningAnimationTrackNames
              );
            const canPlayRebasedHybridOwnSourceSkinningAnimation =
              hasOwnSourceAnimationClips &&
              !directAnimationCandidateUsesRetargetedSupermodel &&
              sourceSkinBoneAnimationTrackNames.length > 0 &&
              renderableRebasedGeometryAnimationTrackNames.length > 0 &&
              sourceSkinMeshAnimationTrackNames.length === 0 &&
              canPlayRebasedDirectAnimationViaSourceSkinning(
                creatureLoadedModelFeatureSummary,
                sourceSkinBoneAnimationTrackNames
              );
            const hasCreatureCompanionGeometry =
              creaturePartModelResolutions.length > 0 ||
              creatureEquipmentModelPartResolutions.length > 0;
            const canPlayRetargetedSourceSkinningHiddenCompanionAnimation =
              directAnimationCandidateUsesRetargetedSupermodel &&
              canPlayRebasedSourceSkinningAnimationCandidate &&
              hasCreatureCompanionGeometry &&
              canPlayRetargetedSourceSkinningWithHiddenCompanionGeometry(
                creatureLoadedModelFeatureSummary,
                sourceSkinMeshAnimationTrackNames
              );
            const canPlayRetargetedSourceSkinningVisibleBodyPartAnimation =
              directAnimationCandidateUsesRetargetedSupermodel &&
              canPlayRebasedSourceSkinningAnimationCandidate &&
              hasCreatureCompanionGeometry &&
              canPlayRetargetedSourceSkinningWithVisibleBodyPartGeometry(
                creatureLoadedModelFeatureSummary,
                sourceSkinMeshAnimationTrackNames
              );
            const canPlayRetargetedSourceSkinningPreservedSourceHierarchyAnimation =
              directAnimationCandidateUsesRetargetedSupermodel &&
              canPlayRebasedSourceSkinningAnimationCandidate &&
              hasCreatureCompanionGeometry &&
              canPlayRetargetedSourceSkinningWithPreservedSourceHierarchy(
                creatureLoadedModelFeatureSummary,
                sourceSkinMeshAnimationTrackNames,
                renderableRebasedGeometryAnimationTrackNames
              );
            const canPlayRetargetedSourceSkinningCompanionAnimation =
              canPlayRetargetedSourceSkinningHiddenCompanionAnimation ||
              canPlayRetargetedSourceSkinningVisibleBodyPartAnimation ||
              canPlayRetargetedSourceSkinningPreservedSourceHierarchyAnimation;
            const suppressRetargetedSourceSkinningCompanionAnimation =
              directAnimationCandidateUsesRetargetedSupermodel &&
              canPlayRebasedSourceSkinningAnimationCandidate &&
              hasCreatureCompanionGeometry &&
              !canPlayRetargetedSourceSkinningCompanionAnimation;
            const preservedLoadedSourceSkinBoneAnimationTrackNames =
              (directAnimationCandidateUsesRetargetedSupermodel ||
                directModelAnimationClips.length === 0) &&
              creatureLoadedModelFeatureSummary.sourceHierarchyRebasedGeometryNodeNames
                .length === 0 &&
              (creatureLoadedModelFeatureSummary.sourceHierarchyReparentedNodeCount ?? 0) ===
                0 &&
              (creatureLoadedModelFeatureSummary.sourceSkinMeshCount ?? 0) > 0 &&
              sourceSkinBoneAnimationTrackNames.length > 0 &&
              sourceSkinMeshAnimationTrackNames.length === 0
                ? sourceSkinBoneAnimationTrackNames
                : [];
            const suppressPreservedLoadedSourceSkinBoneAnimation =
              preservedLoadedSourceSkinBoneAnimationTrackNames.length > 0;
            const canPlayRebasedSourceSkinningAnimation =
              (canPlayRebasedSourceSkinningAnimationCandidate ||
                canPlayRebasedHybridOwnSourceSkinningAnimation) &&
              !suppressRetargetedSourceSkinningCompanionAnimation &&
              !suppressPreservedLoadedSourceSkinBoneAnimation;
            const creatureSourceSkinningSafetyReason =
              canPlayRebasedHybridOwnSourceSkinningAnimation
                ? "source-skinned-own-source-geometry-clips"
                : canPlayRetargetedSourceSkinningVisibleBodyPartAnimation
                ? "source-skinned-visible-body-part-clips"
                : (creatureLoadedModelFeatureSummary.sourceHierarchyReparentedNodeCount ?? 0) > 0
                ? "source-skinned-preserved-source-hierarchy-clips"
                : "source-skinned-hidden-driver-clips";
            const canPlayRebasedSegmentedAnimation =
              isSegmentedHumanoidDirectModel && hasOwnSourceAnimationClips;
            const canPlayRebasedDirectSourceAnimation =
              hasOwnSourceAnimationClips &&
              !canPlayRebasedSegmentedAnimation &&
              !directAnimationCandidateUsesRetargetedSupermodel &&
              ((creatureLoadedModelFeatureSummary.sourceSkinMeshCount ?? 0) <= 0 ||
                sourceSkinBoneAnimationTrackNames.length === 0);
            const canPlayRebasedDeclaredDirectSupermodelAnimation =
              directAnimationCandidateUsesOnlyRetargetedSupermodel &&
              directModelDeclaresResolvedSupermodel &&
              (creatureLoadedModelFeatureSummary.sourceSkinMeshCount ?? 0) === 0 &&
              sourceSkinMeshAnimationTrackNames.length === 0 &&
              sourceSkinBoneAnimationTrackNames.length === 0 &&
              renderableRebasedGeometryAnimationTrackNames.length > 0;
            const canPlayRebasedDirectSupermodelAnimation =
              combinedDirectSupermodelAnimationClips.length > 0 &&
              (directModelAnimationClips.length === 0 ||
                canUseRetargetedSupermodelDespiteOwnSourceClips) &&
              (!directAnimationCandidateUsesRetargetedSupermodel ||
                (sourceSkinMeshAnimationTrackNames.length === 0 &&
                  !suppressRetargetedSourceSkinningCompanionAnimation));
            const sourceSkinningRootMotionNodeNames =
              canPlayRebasedSourceSkinningAnimation
                ? resolveCreatureSourceSkinningRootMotionNodeNames(
                    creatureLoadedModelFeatureSummary,
                    directAnimationCandidateClips
                  )
                : [];
            const directSourceRootMotionNodeNames =
              canPlayRebasedDirectSourceAnimation ||
              canPlayRebasedDeclaredDirectSupermodelAnimation
                ? resolveCreatureRebasedGeometryRootMotionNodeNames(
                    creatureLoadedModelFeatureSummary,
                    unsafeDirectAnimationTrackNames
                  )
                : [];
            const creatureRootMotionNodeNames =
              sourceSkinningRootMotionNodeNames.length > 0
                ? sourceSkinningRootMotionNodeNames
                : directSourceRootMotionNodeNames;
            const creatureRootMotionNeutralizedMode =
              sourceSkinningRootMotionNodeNames.length > 0
                ? "source-skinning-xz-anchor"
                : directSourceRootMotionNodeNames.length > 0
                  ? "direct-source-xz-anchor"
                  : "";
            const allowRebasedDirectAnimation =
              canPlayRebasedSegmentedAnimation ||
              canPlayRebasedSourceSkinningAnimation ||
              canPlayRebasedDirectSourceAnimation ||
              canPlayRebasedDeclaredDirectSupermodelAnimation ||
              canPlayRebasedDirectSupermodelAnimation;
            const suppressExplicitSimpleDirectSourceAnimation =
              Boolean(requestedCreatureAnimationName) &&
              directModelType === "S" &&
              hasOwnSourceAnimationClips &&
              directAnimationCandidateClips.length > 0 &&
              !directAnimationCandidateUsesRetargetedSupermodel &&
              !canPlayRebasedSourceSkinningAnimation &&
              !canPlayRebasedDirectSourceAnimation;
            const suppressUnsafeDirectAnimation =
              (Boolean(creatureLoadedModelFeatureSummary.sourceModel) &&
                unsafeDirectAnimationTrackNames.length > 0 &&
                !allowRebasedDirectAnimation) ||
              suppressPreservedLoadedSourceSkinBoneAnimation ||
              suppressExplicitSimpleDirectSourceAnimation;
            const creatureDirectAnimationGuardUserData = {
              creatureDirectAutoAnimationCanPlaySourceSkinning:
                canPlayRebasedSourceSkinningAnimation,
              creatureDirectAutoAnimationCanPlayHybridSourceSkinning:
                canPlayRebasedHybridOwnSourceSkinningAnimation,
              creatureDirectAutoAnimationCanPlaySourceSkinningCompanion:
                canPlayRetargetedSourceSkinningCompanionAnimation,
              creatureDirectAutoAnimationCanPlaySegmented:
                canPlayRebasedSegmentedAnimation,
              creatureDirectAutoAnimationCanPlayDirectSource:
                canPlayRebasedDirectSourceAnimation,
              creatureDirectAutoAnimationCanPlayDeclaredDirectSupermodel:
                canPlayRebasedDeclaredDirectSupermodelAnimation,
              creatureDirectAutoAnimationDeclaredDirectSupermodelMatches:
                directModelDeclaresResolvedSupermodel,
              creatureDirectAutoAnimationCanPlayDirectSupermodel:
                canPlayRebasedDirectSupermodelAnimation,
              creatureDirectAutoAnimationAllowRebased: allowRebasedDirectAnimation,
              creatureDirectAutoAnimationUsesOnlyRetargetedSupermodelClip:
                directAnimationCandidateUsesOnlyRetargetedSupermodel,
              creatureDirectAutoAnimationCanUseRetargetedSupermodelWithOwnSourceClips:
                canUseRetargetedSupermodelDespiteOwnSourceClips,
              creatureDirectAutoAnimationHasCompanionGeometry:
                hasCreatureCompanionGeometry,
              creatureDirectAutoAnimationSourceSkinMeshCount:
                creatureLoadedModelFeatureSummary.sourceSkinMeshCount ?? 0,
              creatureDirectAutoAnimationSourceSkinMeshTrackCount:
                sourceSkinMeshAnimationTrackNames.length,
              creatureDirectAutoAnimationSourceSkinBoneTrackCount:
                sourceSkinBoneAnimationTrackNames.length,
              creatureDirectAutoAnimationPreservedSourceSkinBoneTrackCount:
                preservedLoadedSourceSkinBoneAnimationTrackNames.length,
              creatureDirectAutoAnimationSourceHierarchyReparentedNodeCount:
                creatureLoadedModelFeatureSummary.sourceHierarchyReparentedNodeCount ?? 0,
              creatureDirectAutoAnimationRenderableRebasedGeometryTrackCount:
                renderableRebasedGeometryAnimationTrackNames.length,
              creatureDirectAutoAnimationRenderSuppressedMeshCount:
                creatureLoadedModelFeatureSummary.renderSuppressedMeshCount ?? 0,
              creatureDirectAutoAnimationDirectModelClipCount:
                directModelAnimationClips.length,
              creatureDirectAutoAnimationDirectSupermodelClipCount:
                combinedDirectSupermodelAnimationClips.length
            };
            const creatureDirectAnimationSafetyUserData =
              suppressUnsafeDirectAnimation
                ? {
                    ...creatureDirectAnimationGuardUserData,
                    creatureDirectAutoAnimationSafetyStatus:
                      "suppressed-source-hierarchy-rebase",
                    creatureDirectAutoAnimationSafetyReason:
                      suppressExplicitSimpleDirectSourceAnimation &&
                      unsafeDirectAnimationTrackNames.length === 0
                        ? "direct-simple-source-clip-explicit"
                        : suppressPreservedLoadedSourceSkinBoneAnimation
                        ? "source-skinned-visible-baked-geometry"
                        : suppressRetargetedSourceSkinningCompanionAnimation
                        ? "source-skinned-retargeted-companion-geometry"
                        : requestedCreatureAnimationName
                        ? "source-hierarchy-rebased-geometry-explicit"
                        : "source-hierarchy-rebased-geometry",
                    creatureDirectAutoAnimationRebasedGeometryCount:
                      creatureLoadedModelFeatureSummary.sourceHierarchyRebasedGeometryCount ?? 0,
                    creatureDirectAutoAnimationRebasedGeometryNodeNames:
                      creatureLoadedModelFeatureSummary.sourceHierarchyRebasedGeometryNodeNames,
                    creatureDirectAutoAnimationSuppressedTrackNames:
                      [
                        ...unsafeDirectAnimationTrackNames,
                        ...preservedLoadedSourceSkinBoneAnimationTrackNames
                      ],
                    creatureDirectAutoAnimationRetargetedSupermodelClip:
                      directAnimationCandidateUsesRetargetedSupermodel
                  }
                : {
                    ...creatureDirectAnimationGuardUserData,
                    creatureDirectAutoAnimationSafetyStatus:
                      canPlayRebasedSourceSkinningAnimation
                        ? "playable-rebased-source-skinning"
                        : unsafeDirectAnimationTrackNames.length > 0
                        ? canPlayRebasedSegmentedAnimation
                            ? "playable-rebased-segmented-creature"
                            : canPlayRebasedDirectSourceAnimation
                              ? "playable-rebased-direct-source-clips"
                              : canPlayRebasedDeclaredDirectSupermodelAnimation
                                ? "playable-rebased-declared-supermodel-clips"
                                : "playable-rebased-direct-supermodel-clips"
                        : "playable",
                    ...(canPlayRebasedSourceSkinningAnimation ||
                    unsafeDirectAnimationTrackNames.length > 0
                      ? {
                          creatureDirectAutoAnimationSafetyReason:
                            canPlayRebasedSourceSkinningAnimation
                              ? creatureSourceSkinningSafetyReason
                              : canPlayRebasedSegmentedAnimation
                                ? "segmented-humanoid-own-source-clips"
                                : canPlayRebasedDirectSourceAnimation
                                  ? "direct-creature-own-source-clips"
                                  : canPlayRebasedDeclaredDirectSupermodelAnimation
                                    ? "direct-creature-declared-supermodel-clips"
                                    : "direct-creature-supermodel-clips",
                          creatureDirectAutoAnimationRebasedGeometryCount:
                            creatureLoadedModelFeatureSummary.sourceHierarchyRebasedGeometryCount ?? 0,
                          creatureDirectAutoAnimationRebasedGeometryNodeNames:
                            creatureLoadedModelFeatureSummary.sourceHierarchyRebasedGeometryNodeNames,
                          creatureDirectAutoAnimationSuppressedTrackNames: [],
                          creatureDirectAutoAnimationRetargetedSupermodelClip:
                            directAnimationCandidateUsesRetargetedSupermodel,
                        }
                      : {}),
                    ...(creatureRootMotionNodeNames.length > 0
                      ? {
                          creatureDirectAutoAnimationRootMotionNeutralized: true,
                          creatureDirectAutoAnimationRootMotionNeutralizedNodeNames:
                            creatureRootMotionNodeNames,
                          creatureDirectAutoAnimationRootMotionNeutralizedMode:
                            creatureRootMotionNeutralizedMode
                        }
                      : {})
                  };
            latestObjectRoot.userData = {
              ...latestObjectRoot.userData,
              ...creatureDirectSupermodelUserData,
              ...creatureLoadedModelFeatureUserData,
              ...creatureDirectAnimationSafetyUserData
            };
            resolvedModel.userData = {
              ...resolvedModel.userData,
              ...creatureDirectSupermodelUserData,
              ...creatureLoadedModelFeatureUserData,
              ...creatureDirectAnimationSafetyUserData
            };
            const creatureLightPreviewGroup = createCreatureAuroraLightPreviewGroup(
              creatureRenderPayload,
              objectRadius,
              debugState.showNonRenderMeshes,
              auroraLightRuntimeBudget
            );
            if (creatureLightPreviewGroup) {
              resolvedModel.add(creatureLightPreviewGroup);
              latestObjectRoot.userData = {
                ...latestObjectRoot.userData,
                ...creatureLightPreviewGroup.userData
              };
              resolvedModel.userData = {
                ...resolvedModel.userData,
                ...creatureLightPreviewGroup.userData
              };
            }
            const directLoadedCreatureAnimationPlaybackClips =
              creatureRootMotionNodeNames.length > 0
                ? cloneCreatureAnimationClipsWithSourceSkinningRootMotionNeutralized(
                    loadedCreatureAnimationClips,
                    creatureRootMotionNodeNames
                  )
                : loadedCreatureAnimationClips;
            const directRootMotionDefaultAnimationPlaybackClips =
              creatureRootMotionNodeNames.length > 0
                ? cloneCreatureAnimationClipsWithSourceSkinningRootMotionNeutralized(
                    directDefaultAnimationClips,
                    creatureRootMotionNodeNames
                  )
                : directDefaultAnimationClips;
            const directCreatureAnimationPlaybackUserData =
              applyCreatureAnimationPlaybackToModel(
                runtime,
                object,
                resolvedModel,
                directLoadedCreatureAnimationPlaybackClips,
                {
                  autoSelectDefaultClip: !suppressUnsafeDirectAnimation,
                  autoPlayExplicitClip: !suppressUnsafeDirectAnimation,
                  autoPlayDefaultClip: !suppressUnsafeDirectAnimation,
                  autoSelectIdleOnly: true,
                  allowNonIdleDefaultFallback: true,
                  applyInitialPose: !suppressUnsafeDirectAnimation,
                  defaultPlaybackClips: directRootMotionDefaultAnimationPlaybackClips,
                  mirrorUserDataTargets: [latestObjectRoot],
                  enableSourceGeometryRuntimeEffects: !suppressUnsafeDirectAnimation
                }
              );
            if (directCreatureAnimationPlaybackUserData) {
              latestObjectRoot.userData = {
                ...latestObjectRoot.userData,
                ...directCreatureAnimationPlaybackUserData
              };
              resolvedModel.userData = {
                ...resolvedModel.userData,
                ...directCreatureAnimationPlaybackUserData
              };
              writeRuntimeObjectAnimationDataset(runtime);
            }
            const creatureEmitterParticlePreviewGroup =
              createCreatureAuroraEmitterParticlePreviewGroup(
                runtime,
                creatureRenderPayload,
                objectRadius,
                colorHex,
                creatureTextureUrlsByReference,
                debugState.showNonRenderMeshes
              );
            if (creatureEmitterParticlePreviewGroup) {
              resolvedModel.add(creatureEmitterParticlePreviewGroup);
              clearCreatureAuroraEmitterNonEmitterTextureMaps(creatureEmitterParticlePreviewGroup);
              latestObjectRoot.userData = {
                ...latestObjectRoot.userData,
                ...creatureEmitterParticlePreviewGroup.userData
              };
              resolvedModel.userData = {
                ...resolvedModel.userData,
                ...creatureEmitterParticlePreviewGroup.userData
              };
              const creatureEmitterTextureUrlsByReference =
                resolveCreatureAuroraEmitterTextureDeliveryUrlsForPayload(
                  creatureRenderPayload,
                  creatureTextureUrlsByReference
                );
              scheduleCreatureAuroraEmitterParticleTextureRefresh({
                runtime,
                objectId: object.id,
                root: latestObjectRoot,
                host: resolvedModel,
                particleGroup: creatureEmitterParticlePreviewGroup,
                textureUrlsByReference: creatureEmitterTextureUrlsByReference,
                writeModelDebugStatus: false
              });
            }
            const creatureEmitterPreviewGroup = createCreatureAuroraEmitterPreviewGroup(
              creatureRenderPayload,
              objectRadius,
              debugState.showNonRenderMeshes
            );
            if (creatureEmitterPreviewGroup) {
              resolvedModel.add(creatureEmitterPreviewGroup);
              latestObjectRoot.userData = {
                ...latestObjectRoot.userData,
                ...creatureEmitterPreviewGroup.userData
              };
              resolvedModel.userData = {
                ...resolvedModel.userData,
                ...creatureEmitterPreviewGroup.userData
              };
            }
          }
          const creatureTintResult =
            object.kind === "creatures" && !debugState.wireframe
              ? applyCreatureMaterialTintToModel(
                  resolvedModel,
                  creatureRenderPayload?.renderPackage?.colors
                )
              : null;
          if (creatureTintResult) {
            const tintUserData = {
              creatureMaterialTintStatus: "applied",
              creatureMaterialTintColor: creatureTintResult.tintHex,
              creatureMaterialTintAppliedCount: creatureTintResult.appliedCount,
              creatureMaterialTintChannels: creatureTintResult.channels,
              creatureMaterialTintMode: "plt-layer-bridge",
              creatureMaterialTintLayerRows: creatureTintResult.layerRows,
              creaturePltPaletteRowMax: CREATURE_PLT_PALETTE_ROW_MAX
            };
            latestObjectRoot.userData = {
              ...latestObjectRoot.userData,
              ...tintUserData
            };
            resolvedModel.userData = {
              ...resolvedModel.userData,
              ...tintUserData
            };
          }
          writePlaceableModelDebugStatus(runtime, "loaded", {
            objectId: object.id,
            url: objectRenderPackageModelUrl,
            meshCount: modelMetrics.meshCount,
            bounds: modelMetrics.boundsLabel
          });
          const materialMapTextureUrlsByReference =
            resolvePlaceableModelMaterialMapTextureUrlsByReference(
              resolvedModel,
              modelTextureUrlsByReference,
              { auroraMaterial: modelAuroraMaterial }
            );
          const visibleMaterialMapTextureUrlsByReference = shouldLoadPlaceableModel
            ? resolvePlaceableModelVisibleMaterialMapTextureUrlsByReference(
                resolvedModel,
                modelTextureUrlsByReference,
                { auroraMaterial: modelAuroraMaterial }
              )
            : materialMapTextureUrlsByReference;
          const blockingMaterialMapTextureUrlsByReference =
            visibleMaterialMapTextureUrlsByReference.size > 0
              ? visibleMaterialMapTextureUrlsByReference
              : materialMapTextureUrlsByReference;
          const secondaryMaterialMapTextureUrlsByReference = new Map(
            Array.from(materialMapTextureUrlsByReference.entries()).filter(
              ([reference]) => !blockingMaterialMapTextureUrlsByReference.has(reference)
            )
          );
          const expectedMaterialMapTextureReferences = resolveExpectedTextureReferenceSet(
            blockingMaterialMapTextureUrlsByReference.size > 0
              ? blockingMaterialMapTextureUrlsByReference
              : modelTextureUrlsByReference
          );
          const availableTextureReferences = Array.from(modelTextureUrlsByReference.keys()).sort(
            (left, right) => left.localeCompare(right)
          );
          const requestedTextureReferences = Array.from(
            blockingMaterialMapTextureUrlsByReference.keys()
          ).sort((left, right) => left.localeCompare(right));
          const expectedTextureCount = Math.max(
            blockingMaterialMapTextureUrlsByReference.size,
            modelFallbackTextureUrl ? 1 : 0,
            creatureTintResult ? 1 : 0
          );
          const scheduleSecondaryMaterialTextureSlotLoad = (
            initialTexturesByReference: Map<string, THREE.Texture>
          ): void => {
            if (secondaryMaterialMapTextureUrlsByReference.size === 0 || debugState.wireframe) {
              return;
            }
            void ensurePlaceableTexturesByReference(
              runtime,
              secondaryMaterialMapTextureUrlsByReference
            ).then((secondaryTexturesByReference) => {
              if (secondaryTexturesByReference.size === 0) {
                return;
              }
              const latestRoot = runtime.objectMeshById.get(object.id);
              if (!latestRoot) {
                return;
              }
              if (
                latestRoot.userData.renderPackageModelUrl !== objectRenderPackageModelUrl
              ) {
                return;
              }
              const mergedTexturesByReference = new Map(initialTexturesByReference);
              secondaryTexturesByReference.forEach((texture, reference) => {
                mergedTexturesByReference.set(reference, texture);
              });
              applyPlaceableTexturesToModel(
                resolvedModel,
                mergedTexturesByReference,
                modelFallbackTextureUrl && mergedTexturesByReference.size <= 1
                  ? runtime.placeableTextureCacheByUrl.get(modelFallbackTextureUrl)
                  : undefined,
                {
                  auroraMaterial: modelAuroraMaterial,
                  textureBindings: modelTextureBindings,
                  skipMesh: shouldSkipCreatureSourcePreviewTextureApplication
                }
              );
              if (object.kind === "placeables" || object.kind === "doors") {
                registerRuntimeAuroraTextureCyclePlayback(
                  runtime,
                  object.id,
                  latestRoot
                );
              }
              if (object.kind === "creatures") {
                clearCreatureAuroraEmitterNonEmitterTextureMaps(resolvedModel);
              }
              if (objectTextureSignature) {
                markPlaceableMaterialTextureSignature(
                  resolvedModel,
                  objectTextureSignature,
                  expectedModelTextureReferences
                );
              }
              if (renderAreaGeometry) {
                applyAreaObjectToolsetLayering(resolvedModel, object);
              }
              const materialTextureCoverage =
                summarizePlaceableModelMaterialTextureCoverage(
                  resolvedModel,
                  expectedModelTextureReferences
                );
              const loadedUniqueTextureReferences = Array.from(
                mergedTexturesByReference.keys()
              ).sort((left, right) => left.localeCompare(right));
              const allRequestedTextureReferences = Array.from(
                materialMapTextureUrlsByReference.keys()
              ).sort((left, right) => left.localeCompare(right));
              const failedTextureReferences = allRequestedTextureReferences.filter(
                (reference) => !mergedTexturesByReference.has(reference)
              );
              const textureApplicationStatus: AreaObjectSharedRendererTextureStatus =
                materialTextureCoverage.missingMapMaterialCount > 0 ? "partial" : "applied";
              const textureSource = summarizePlaceableTextureSourceFormats(
                mergedTexturesByReference.values()
              );
              markAreaObjectSharedRendererTextureRuntimeEvidence(
                latestRoot,
                textureApplicationStatus,
                {
                  textureCount: mergedTexturesByReference.size,
                  textureLoaded: loadedUniqueTextureReferences.length,
                  textureSource,
                  availableTextureReferences,
                  requestedTextureReferences: allRequestedTextureReferences,
                  loadedTextureReferences: loadedUniqueTextureReferences,
                  failedTextureReferences,
                  ...materialTextureCoverage
                }
              );
              writePlaceableModelDebugStatus(runtime, "loaded", {
                objectId: object.id,
                url: objectRenderPackageModelUrl,
                loadPhase: "secondary-textures",
                loadCompleted: 1 + loadedUniqueTextureReferences.length,
                loadTotal: 1 + materialMapTextureUrlsByReference.size,
                textureStatus: textureApplicationStatus,
                textureCount: mergedTexturesByReference.size,
                textureLoaded: loadedUniqueTextureReferences.length,
                textureSource
              });
            });
          };
          const hasMissingTextureDiagnostic =
            shouldLoadPlaceableModel && hasPlaceableMissingTextureDiagnostic(placeableRenderPayload);
          const shouldApplyMissingTextureFallback =
            shouldLoadPlaceableModel &&
            hasMissingTextureDiagnostic &&
            !debugState.wireframe &&
            !sharedRendererTarget;
          const loadTotal = 1 + expectedTextureCount;
          markAreaObjectSharedRendererTextureRuntimeEvidence(
            latestObjectRoot,
            hasMissingTextureDiagnostic
              ? "missing"
              : materialMapTextureUrlsByReference.size > 0 || modelFallbackTextureUrl
                ? "loading"
                : creatureTintResult
                  ? "applied"
                  : "not-applicable",
            {
              textureCount: expectedTextureCount,
              textureLoaded: creatureTintResult ? 1 : 0,
              textureSource: creatureTintResult ? "creature-material-tint" : null,
              availableTextureReferences,
              requestedTextureReferences,
              loadedTextureReferences: creatureTintResult
                ? requestedTextureReferences
                : [],
              failedTextureReferences: []
            }
          );
          if (blockingMaterialMapTextureUrlsByReference.size > 0 && !debugState.wireframe) {
            writePlaceableModelDebugStatus(runtime, "loading", {
              objectId: object.id,
              url: objectRenderPackageModelUrl,
              meshCount: modelMetrics.meshCount,
              bounds: modelMetrics.boundsLabel,
              loadPhase: "textures",
              loadCompleted: 1,
              loadTotal,
              textureStatus: "loading",
              textureCount: expectedTextureCount,
              textureLoaded: 0,
              textureSource: null
            });
            const applyBlockingMaterialMapTextures = (
              latestRoot: THREE.Object3D,
              texturesByReference: Map<string, THREE.Texture>,
              options: {
                finalize: boolean;
                loadPhase: string;
              }
            ): void => {
              const loadedTextureReferences = Array.from(texturesByReference.keys()).sort(
                (left, right) => left.localeCompare(right)
              );
              texturesByReference.forEach((texture, reference) => {
                texture.userData = {
                  ...texture.userData,
                  auroraTextureReference: reference
                };
              });
              const failedTextureReferences = requestedTextureReferences.filter(
                (reference) => !texturesByReference.has(reference)
              );

              if (texturesByReference.size === 0) {
                if (!options.finalize) {
                  return;
                }
                markAreaObjectSharedRendererTextureRuntimeEvidence(
                  latestRoot,
                  "missing",
                  {
                    textureCount: expectedTextureCount,
                    textureLoaded: 0,
                    textureSource: null,
                    availableTextureReferences,
                    requestedTextureReferences,
                    loadedTextureReferences,
                    failedTextureReferences
                  }
                );
                writePlaceableModelDebugStatus(runtime, "loaded", {
                  objectId: object.id,
                  url: objectRenderPackageModelUrl,
                  loadPhase: "complete",
                  loadCompleted: loadTotal,
                  loadTotal,
                  textureStatus: "missing",
                  textureCount: 0,
                  textureLoaded: 0,
                  textureSource: null
                });
                return;
              }

              if (
                !objectTextureSignature ||
                !canShareTexturedModelMaterials ||
                !options.finalize ||
                !isPlaceableMaterialTextureSignatureApplied(
                  resolvedModel,
                  objectTextureSignature,
                  expectedMaterialMapTextureReferences
                )
              ) {
                const creaturePltTextureBridge =
                  object.kind === "creatures"
                    ? buildCreaturePltTextureBridge(
                        texturesByReference,
                        creatureRenderPayload?.renderPackage?.colors
                      )
                    : {
                        texturesByReference,
                        appliedCount: 0,
                        references: [],
                        layerRows: {},
                        mode: "hsl-layer-row" as CreaturePltTextureBridgeMode
                      };
                if (creaturePltTextureBridge.appliedCount > 0) {
                  const creaturePltTextureBridgeUserData = {
                    creaturePltTextureBridgeStatus: "applied",
                    creaturePltTextureBridgeCount: creaturePltTextureBridge.appliedCount,
                    creaturePltTextureBridgeReferences: creaturePltTextureBridge.references,
                    creaturePltTextureBridgeMode: creaturePltTextureBridge.mode,
                    creaturePltTextureBridgeLayerRows: creaturePltTextureBridge.layerRows,
                    creaturePltPaletteRowMax: CREATURE_PLT_PALETTE_ROW_MAX
                  };
                  latestRoot.userData = {
                    ...latestRoot.userData,
                    ...creaturePltTextureBridgeUserData
                  };
                  resolvedModel.userData = {
                    ...resolvedModel.userData,
                    ...creaturePltTextureBridgeUserData
                  };
                }
                const fallbackTexture = modelFallbackTextureUrl && texturesByReference.size <= 1
                  ? runtime.placeableTextureCacheByUrl.get(modelFallbackTextureUrl)
                  : undefined;
                applyPlaceableTexturesToModel(
                  resolvedModel,
                  creaturePltTextureBridge.texturesByReference,
                  fallbackTexture,
                  {
                    auroraMaterial: modelAuroraMaterial,
                    textureBindings: modelTextureBindings,
                    skipMesh: shouldSkipCreatureSourcePreviewTextureApplication
                  }
                );
                if (object.kind === "placeables" || object.kind === "doors") {
                  registerRuntimeAuroraTextureCyclePlayback(
                    runtime,
                    object.id,
                    latestRoot
                  );
                }
                clearCreatureAuroraEmitterNonEmitterTextureMaps(resolvedModel);
                if (object.kind === "creatures") {
                  const materialTextureEvidence = summarizeCreatureMaterialTextureEvidence(
                    resolvedModel
                  );
                  latestRoot.userData = {
                    ...latestRoot.userData,
                    creatureRenderLoadedModelMaterialTextureEvidence:
                      materialTextureEvidence
                  };
                  resolvedModel.userData = {
                    ...resolvedModel.userData,
                    creatureRenderLoadedModelMaterialTextureEvidence:
                      materialTextureEvidence
                  };
                }
                if (options.finalize && objectTextureSignature) {
                  markPlaceableMaterialTextureSignature(
                    resolvedModel,
                    objectTextureSignature,
                    expectedMaterialMapTextureReferences
                  );
                }
              }
              if (renderAreaGeometry) {
                applyAreaObjectToolsetLayering(resolvedModel, object);
              }
              const materialTextureCoverage =
                summarizePlaceableModelMaterialTextureCoverage(
                  resolvedModel,
                  expectedMaterialMapTextureReferences
                );
              const loadedUniqueTextureReferences = Array.from(texturesByReference.keys());
              const loadedUniqueTextureCount = loadedUniqueTextureReferences.length;
              const textureApplicationStatus: AreaObjectSharedRendererTextureStatus =
                materialTextureCoverage.missingMapMaterialCount > 0 ? "partial" : "applied";
              const textureSource = summarizePlaceableTextureSourceFormats(
                texturesByReference.values()
              );
              markAreaObjectSharedRendererTextureRuntimeEvidence(
                latestRoot,
                textureApplicationStatus,
                {
                  textureCount: texturesByReference.size,
                  textureLoaded: loadedUniqueTextureCount,
                  textureSource,
                  availableTextureReferences,
                  requestedTextureReferences,
                  loadedTextureReferences: loadedUniqueTextureReferences,
                  failedTextureReferences,
                  ...materialTextureCoverage
                }
              );
              writePlaceableModelDebugStatus(runtime, options.finalize ? "loaded" : "loading", {
                objectId: object.id,
                url: objectRenderPackageModelUrl,
                loadPhase: options.loadPhase,
                loadCompleted: options.finalize ? loadTotal : 1 + loadedUniqueTextureCount,
                loadTotal,
                textureStatus: textureApplicationStatus,
                textureCount: texturesByReference.size,
                textureLoaded: loadedUniqueTextureCount,
                textureSource,
                ...(object.kind === "creatures"
                  ? {
                      creatureMaterialTextureEvidence:
                        readUserDataString(
                          latestRoot.userData
                            .creatureRenderLoadedModelMaterialTextureEvidence
                        ) ?? ""
                    }
                  : {})
              });
              if (options.finalize) {
                scheduleSecondaryMaterialTextureSlotLoad(texturesByReference);
              }
            };
            void ensurePlaceableTexturesByReferenceProgressive(
              runtime,
              blockingMaterialMapTextureUrlsByReference,
              ({ texturesByReference }) => {
                const latestRoot = runtime.objectMeshById.get(object.id);
                if (!latestRoot) {
                  return;
                }
                if (
                  latestRoot.userData.renderPackageModelUrl !== objectRenderPackageModelUrl
                ) {
                  return;
                }
                applyBlockingMaterialMapTextures(latestRoot, texturesByReference, {
                  finalize: false,
                  loadPhase: "textures-progressive"
                });
              }
            ).then((texturesByReference) => {
              const latestRoot = runtime.objectMeshById.get(object.id);
              if (!latestRoot) {
                return;
              }
              if (
                latestRoot.userData.renderPackageModelUrl !== objectRenderPackageModelUrl
              ) {
                return;
              }
              applyBlockingMaterialMapTextures(latestRoot, texturesByReference, {
                finalize: true,
                loadPhase: "complete"
              });
            });
          } else if (modelFallbackTextureUrl && !debugState.wireframe) {
            const textureFromCache =
              runtime.placeableTextureCacheByUrl.get(modelFallbackTextureUrl);
            if (textureFromCache) {
              if (
                !objectTextureSignature ||
                !canShareTexturedModelMaterials ||
                !isPlaceableMaterialTextureSignatureApplied(
                  resolvedModel,
                  objectTextureSignature,
                  expectedModelTextureReferences
                )
              ) {
                applyPlaceableTextureToModel(
                  resolvedModel,
                  textureFromCache,
                  object.kind === "creatures"
                    ? { skipMesh: shouldSkipCreatureSourcePreviewTextureApplication }
                    : {}
                );
                if (object.kind === "creatures") {
                  clearCreatureAuroraEmitterNonEmitterTextureMaps(resolvedModel);
                }
                if (objectTextureSignature) {
                  markPlaceableMaterialTextureSignature(
                    resolvedModel,
                    objectTextureSignature,
                    expectedModelTextureReferences
                  );
                }
              }
              if (renderAreaGeometry) {
                applyAreaObjectToolsetLayering(resolvedModel, object);
              }
              const materialTextureCoverage =
                summarizePlaceableModelMaterialTextureCoverage(
                  resolvedModel,
                  expectedModelTextureReferences
                );
              const textureApplicationStatus: AreaObjectSharedRendererTextureStatus =
                materialTextureCoverage.missingMapMaterialCount > 0 ? "partial" : "applied";
              const textureSource =
                typeof textureFromCache.userData?.auroraSourceFormat === "string"
                  ? textureFromCache.userData.auroraSourceFormat
                  : "";
              markAreaObjectSharedRendererTextureRuntimeEvidence(
                latestObjectRoot,
                textureApplicationStatus,
                {
                  textureCount: 1,
                  textureLoaded: 1,
                  textureSource,
                  ...materialTextureCoverage
                }
              );
              writePlaceableModelDebugStatus(runtime, "loaded", {
                objectId: object.id,
                url: objectRenderPackageModelUrl,
                loadPhase: "complete",
                loadCompleted: loadTotal,
                loadTotal,
                textureStatus: textureApplicationStatus,
                textureCount: 1,
                textureLoaded: 1,
                textureSource
              });
            } else {
              writePlaceableModelDebugStatus(runtime, "loading", {
                objectId: object.id,
                url: objectRenderPackageModelUrl,
                loadPhase: "textures",
                loadCompleted: 1,
                loadTotal,
                textureStatus: "loading",
                textureCount: 1,
                textureLoaded: 0,
                textureSource: null
              });
              markAreaObjectSharedRendererTextureRuntimeEvidence(
                latestObjectRoot,
                "loading",
                {
                  textureCount: 1,
                  textureLoaded: 0,
                  textureSource: null
                }
              );
              void ensurePlaceableTextureReferenceWithTimeout(
                runtime,
                modelFallbackTextureUrl
              ).catch(() => null).then((resolvedTexture) => {
                const latestRoot = runtime.objectMeshById.get(object.id);
                if (!latestRoot) {
                  return;
                }
                if (
                  latestRoot.userData.renderPackageModelUrl !== objectRenderPackageModelUrl
                ) {
                  return;
                }

                if (!resolvedTexture) {
                  markAreaObjectSharedRendererTextureRuntimeEvidence(
                    latestRoot,
                    "missing",
                    {
                      textureCount: 1,
                      textureLoaded: 1,
                      textureSource: null
                    }
                  );
                  writePlaceableModelDebugStatus(runtime, "loaded", {
                    objectId: object.id,
                    url: objectRenderPackageModelUrl,
                    loadPhase: "complete",
                    loadCompleted: loadTotal,
                    loadTotal,
                    textureStatus: "missing",
                    textureCount: 0,
                    textureLoaded: 1,
                    textureSource: null
                  });
                  return;
                }
                if (
                  !objectTextureSignature ||
                  !canShareTexturedModelMaterials ||
                  !isPlaceableMaterialTextureSignatureApplied(
                    resolvedModel,
                    objectTextureSignature,
                    expectedModelTextureReferences
                  )
                ) {
                  applyPlaceableTextureToModel(
                    resolvedModel,
                    resolvedTexture,
                    object.kind === "creatures"
                      ? { skipMesh: shouldSkipCreatureSourcePreviewTextureApplication }
                      : {}
                  );
                  if (object.kind === "creatures") {
                    clearCreatureAuroraEmitterNonEmitterTextureMaps(resolvedModel);
                  }
                  if (objectTextureSignature) {
                    markPlaceableMaterialTextureSignature(
                      resolvedModel,
                      objectTextureSignature,
                      expectedModelTextureReferences
                    );
                  }
                }
                if (renderAreaGeometry) {
                  applyAreaObjectToolsetLayering(resolvedModel, object);
                }
                const materialTextureCoverage =
                  summarizePlaceableModelMaterialTextureCoverage(
                    resolvedModel,
                    expectedModelTextureReferences
                  );
                const textureApplicationStatus: AreaObjectSharedRendererTextureStatus =
                  materialTextureCoverage.missingMapMaterialCount > 0 ? "partial" : "applied";
                const textureSource =
                  typeof resolvedTexture.userData?.auroraSourceFormat === "string"
                    ? resolvedTexture.userData.auroraSourceFormat
                    : "";
                markAreaObjectSharedRendererTextureRuntimeEvidence(
                  latestRoot,
                  textureApplicationStatus,
                  {
                    textureCount: 1,
                    textureLoaded: 1,
                    textureSource,
                    ...materialTextureCoverage
                  }
                );
                writePlaceableModelDebugStatus(runtime, "loaded", {
                  objectId: object.id,
                  url: objectRenderPackageModelUrl,
                  loadPhase: "complete",
                  loadCompleted: loadTotal,
                  loadTotal,
                  textureStatus: textureApplicationStatus,
                  textureCount: 1,
                  textureLoaded: 1,
                  textureSource
                });
              });
            }
          } else if (shouldApplyMissingTextureFallback) {
            const fallbackTexture = getPlaceableMissingTextureFallbackTexture(runtime);
            applyPlaceableTextureToModel(
              resolvedModel,
              fallbackTexture,
              object.kind === "creatures"
                ? { skipMesh: shouldSkipCreatureSourcePreviewTextureApplication }
                : {}
            );
            if (object.kind === "creatures") {
              clearCreatureAuroraEmitterNonEmitterTextureMaps(resolvedModel);
            }
            if (renderAreaGeometry) {
              applyAreaObjectToolsetLayering(resolvedModel, object);
            }
            markAreaObjectSharedRendererTextureRuntimeEvidence(
              latestObjectRoot,
              "fallback",
              {
                textureCount: 1,
                textureLoaded: 1,
                textureSource: "missing-texture-fallback"
              }
            );
            writePlaceableModelDebugStatus(runtime, "loaded", {
              objectId: object.id,
              url: objectRenderPackageModelUrl,
              loadPhase: "complete",
              loadCompleted: loadTotal,
              loadTotal,
              textureStatus: "fallback",
              textureCount: 1,
              textureLoaded: 1,
              textureSource: "missing-texture-fallback"
            });
          } else {
            const textureStatus =
              hasMissingTextureDiagnostic
                ? "missing"
                : expectedTextureCount > 0
                  ? "skipped"
                  : "not-applicable";
            markAreaObjectSharedRendererTextureRuntimeEvidence(
              latestObjectRoot,
              textureStatus,
              {
                textureCount: expectedTextureCount,
                textureLoaded: 0,
                textureSource: null
              }
            );
            writePlaceableModelDebugStatus(runtime, "loaded", {
              objectId: object.id,
              url: objectRenderPackageModelUrl,
              loadPhase: "complete",
              loadCompleted: loadTotal,
              loadTotal,
              textureStatus,
              textureCount: 0,
              textureLoaded: 0,
              textureSource: null
            });
          }
          if (primitiveFallbackMesh?.parent === latestObjectRoot) {
            latestObjectRoot.remove(primitiveFallbackMesh);
            disposeMeshResources(primitiveFallbackMesh);
          }
          if (
            latestObjectRoot.userData.renderPackageModelRequestToken !==
            objectRenderRequestToken
          ) {
            return;
          }
          if (renderAreaGeometry) {
            applyAreaObjectToolsetLayering(resolvedModel, object);
            copyAreaObjectModelSurfaceEvidence(latestObjectRoot, resolvedModel);
          }
          let canonicalSourceModelComposed = false;
          if (
            shouldUseCanonicalSourceMdlComposition &&
            canonicalAuroraVfxPayload
          ) {
            const activeCanonicalGroup = latestObjectRoot.children.find(
              (child): child is THREE.Group =>
                child instanceof THREE.Group &&
                child.userData.auroraVfxCanonicalRenderer === true
            );
            if (activeCanonicalGroup) {
              const refreshedCanonicalGroup = createAuroraVfxCanonicalRenderGroup(
                canonicalAuroraVfxPayload,
                {
                  objectRadius,
                  particleTexturesByReference:
                    collectCachedPlaceableTexturesByReference(
                      runtime,
                      placeableTextureUrlsByReference,
                      canonicalVfxTextureLoadOptions,
                      canonicalVfxBlocksPltWithoutTargetContext
                    ),
                  chunkModelsByResourceKey:
                    collectCachedCanonicalVfxChunkModelsByResourceKey(
                      runtime,
                      canonicalVfxChunkModelUrlsByResourceKey
                    ),
                  chunkModelDeliveryUrlsByResourceKey:
                    canonicalVfxChunkModelUrlsByResourceKey,
                  chunkModelAuroraMaterial:
                    placeableRenderPayload?.renderPackage?.auroraMaterial,
                  chunkModelTextureBindings:
                    placeableRenderPayload?.renderPackage?.textureBindings,
                  sourceModel: resolvedModel,
                  sourceModelTexturesByReference:
                    collectCachedPlaceableTexturesByReference(
                      runtime,
                      placeableTextureUrlsByReference,
                      canonicalVfxTextureLoadOptions,
                      canonicalVfxBlocksPltWithoutTargetContext
                    ),
                  sourceModelTextureBindings:
                    placeableRenderPayload?.renderPackage?.textureBindings,
                  modelGraph: toAuroraVfxCanonicalModelGraph(
                    placeableRenderPayload?.renderPackage?.auroraModelGraph
                  ),
                  referencedObjectContextKey: object.id,
                  sourceCoordinateSpace: "aurora-z-up"
                }
              );
              applyCanonicalSourceMdlLightPolicyAfterRefresh(
                activeCanonicalGroup,
                refreshedCanonicalGroup,
                sourceMdlLightPolicy
              );
              const refreshedLightGroup = hasCanonicalSourceMdlLights(
                refreshedCanonicalGroup
              )
                ? refreshedCanonicalGroup
                : sourceMdlLightPreviewGroup;
              const lightGraphAttachment = refreshedLightGroup
                ? syncCanonicalSourceMdlLightNodesFromLoadedModel({
                    model: resolvedModel,
                    lightGroup: refreshedLightGroup,
                    modelGraph:
                      placeableRenderPayload?.renderPackage?.auroraModelGraph
                  })
                : {
                    matchedNodeNames: [],
                    unmatchedNodeNames: [],
                    graphStatus: "source-mdl-light-group-unavailable"
                  };
              decoratePlaceableModelForObjectSelection(
                refreshedCanonicalGroup,
                object.id,
                object.kind,
                objectLabel
              );
              refreshedCanonicalGroup.position.copy(activeCanonicalGroup.position);
              refreshedCanonicalGroup.quaternion.copy(activeCanonicalGroup.quaternion);
              refreshedCanonicalGroup.scale.copy(activeCanonicalGroup.scale);
              latestObjectRoot.remove(activeCanonicalGroup);
              latestObjectRoot.add(refreshedCanonicalGroup);
              latestObjectRoot.userData = {
                ...latestObjectRoot.userData,
                ...refreshedCanonicalGroup.userData,
                auroraVfxCanonicalPlaceableComposition: true,
                auroraVfxCanonicalPlaceableCompositionMode:
                  "source-mdl-static-emitter-light",
                auroraVfxCanonicalSourceModelDeliveryStatus:
                  "source-graph-bound",
                auroraVfxCanonicalLightGraphAttachmentStatus:
                  lightGraphAttachment.graphStatus,
                auroraVfxCanonicalLightGraphAttachmentMatchedNodeNames:
                  lightGraphAttachment.matchedNodeNames,
                auroraVfxCanonicalLightGraphAttachmentUnmatchedNodeNames:
                  lightGraphAttachment.unmatchedNodeNames,
                auroraVfxCanonicalLightGraphAttachmentMatchedCount:
                  lightGraphAttachment.matchedNodeNames.length,
                auroraVfxCanonicalLightGraphAttachmentUnmatchedCount:
                  lightGraphAttachment.unmatchedNodeNames.length
              };
              canonicalSourceModelComposed = true;
            }
          }
          if (!canonicalSourceModelComposed) {
            latestObjectRoot.add(resolvedModel);
          }
          if (
            !canonicalSourceModelComposed &&
            shouldUseCanonicalSourceMdlComposition &&
            (canonicalVfxCarriesSourceMdlLights
              ? canonicalVfxGroup
              : sourceMdlLightPreviewGroup) &&
            placeableRenderPayload
          ) {
            const lightGraphAttachment = syncCanonicalSourceMdlLightNodesFromLoadedModel({
              model: resolvedModel,
              lightGroup: canonicalVfxCarriesSourceMdlLights
                ? canonicalVfxGroup!
                : sourceMdlLightPreviewGroup!,
              modelGraph: placeableRenderPayload.renderPackage?.auroraModelGraph
            });
            latestObjectRoot.userData = {
              ...latestObjectRoot.userData,
              auroraVfxCanonicalLightGraphAttachmentStatus: lightGraphAttachment.graphStatus,
              auroraVfxCanonicalLightGraphAttachmentMatchedNodeNames:
                lightGraphAttachment.matchedNodeNames,
              auroraVfxCanonicalLightGraphAttachmentUnmatchedNodeNames:
                lightGraphAttachment.unmatchedNodeNames,
              auroraVfxCanonicalLightGraphAttachmentMatchedCount:
                lightGraphAttachment.matchedNodeNames.length,
              auroraVfxCanonicalLightGraphAttachmentUnmatchedCount:
                lightGraphAttachment.unmatchedNodeNames.length
            };
          }
          markAreaObjectSharedRendererRuntimeEvidence(
            latestObjectRoot,
            sharedRendererModelReadyRuntimeEvidence
          );
          markAreaObjectSharedRendererModelMetrics(latestObjectRoot, modelMetrics);
          writePlaceableModelDebugStatus(runtime, "loaded", {
            objectId: object.id,
            url: objectRenderPackageModelUrl,
            meshCount: modelMetrics.meshCount,
            bounds: modelMetrics.boundsLabel,
            loadPhase: "model-attached",
            loadCompleted: 1,
            loadTotal: 1
          });
          if (object.kind === "creatures") {
            applyCreatureEquipmentMarkers(latestObjectRoot, creatureRenderPayload, objectRadius);
            applyCreatureEquipmentModelParts({
              runtime,
              objectId: object.id,
              root: latestObjectRoot,
              resolutions: creatureEquipmentModelPartResolutions,
              objectRadius,
              textureUrlsByReference: modelTextureUrlsByReference,
              textureBindings: modelTextureBindings,
              auroraMaterial: modelAuroraMaterial,
              colors: creatureRenderPayload?.renderPackage?.colors,
              appearanceProfile: creatureRenderPayload?.renderPackage?.appearanceProfile,
              wireframe: debugState.wireframe,
              requestedAnimationName: resolveCreatureSelectedAnimationName(object)
            });
          }
        }).catch((error) => {
          const latestObjectRoot = runtime.objectMeshById.get(object.id);
          const message = error instanceof Error ? error.message : String(error);
          const hasCreatureAlternateModelGeometry =
            object.kind === "creatures" &&
            (creaturePartModelResolutions.length > 0 ||
              creatureEquipmentModelPartResolutions.length > 0);
          if (
            !hasCreatureAlternateModelGeometry &&
            latestObjectRoot &&
            latestObjectRoot.userData.renderPackageModelUrl === objectRenderPackageModelUrl
          ) {
            markAreaObjectSharedRendererRuntimeEvidence(
              latestObjectRoot,
              sharedRendererModelFailedRuntimeEvidence
            );
          }
          if (!hasCreatureAlternateModelGeometry) {
            writePlaceableModelDebugStatus(runtime, "missing", {
              objectId: object.id,
              url: objectRenderPackageModelUrl,
              loadPhase: "model",
              loadCompleted: 1,
              loadTotal: 1,
              error: message.slice(0, 240)
            });
          }
        });
      }
    } else {
      decoratePlaceableModelForObjectSelection(
        objectRoot,
        object.id,
        object.kind,
        objectLabel
      );
      objectRoot.userData = {
        ...objectRoot.userData,
        objectId: object.id,
        objectKind: object.kind,
        objectLabel,
        ...buildSourceMdlEmitterPreviewUserData(),
        ...(auroraVfxPayload
          ? {
              auroraVfxPayload,
              auroraVfxCanonicalStatus: auroraVfxPayload.canonicalStatus,
              auroraVfxPreviewMode: auroraVfxPayload.previewMode,
              auroraVfxDiagnosticCodes: auroraVfxPayload.diagnostics.map(
                (diagnostic) => diagnostic.code
              )
            }
          : {})
      };
    }

    const useAreaLightingForObjectLights = debugState.useAreaLighting !== false;
    const placeableTwoDaLightPreviewStatusUserData =
      placeableRenderPayload && !debugState.wireframe
        ? useAreaLightingForObjectLights
          ? resolvePlaceableTwoDaLightPreviewStatusUserData(placeableRenderPayload)
          : {
              ...(resolvePlaceableTwoDaLightPreviewSourceUserData(placeableRenderPayload) ??
                {}),
              placeableTwoDaLightPreviewStatus: "off-by-use-area-lighting",
              placeableTwoDaLightPreviewMode: "placeables-2da-lightcolor",
              placeableTwoDaLightDisabledReason: "Use Area Lighting=false",
              placeableTwoDaLightDisabledSource:
                "Workspace canvas Use Area Lighting toggle; decompiled Toolset option Use Area Lighting at C:/Projects/New Folder/export/decompiled_all.c:274221-274223",
              placeableTwoDaLightDisabledProofStatus:
                "source-backed-toolset-use-area-lighting-toggle"
            }
        : null;
    if (placeableTwoDaLightPreviewStatusUserData) {
      objectRoot.userData = {
        ...objectRoot.userData,
        ...placeableTwoDaLightPreviewStatusUserData
      };
    }

    const sceneUserData = runtime.scene?.userData ?? {};
    const areaShadowOpacity =
      typeof sceneUserData.auroraTerrainAreaGlobalShadowOpacity === "number" &&
      Number.isFinite(sceneUserData.auroraTerrainAreaGlobalShadowOpacity)
        ? sceneUserData.auroraTerrainAreaGlobalShadowOpacity
        : undefined;
    const areaShadowOpacitySource =
      typeof sceneUserData.auroraTerrainAreaGlobalShadowOpacitySource === "string" &&
      sceneUserData.auroraTerrainAreaGlobalShadowOpacitySource.length > 0
        ? sceneUserData.auroraTerrainAreaGlobalShadowOpacitySource
        : undefined;
    const areaShadowOpacityFactor =
      typeof sceneUserData.auroraTerrainAreaGlobalShadowOpacityFactor === "number" &&
      Number.isFinite(sceneUserData.auroraTerrainAreaGlobalShadowOpacityFactor)
        ? sceneUserData.auroraTerrainAreaGlobalShadowOpacityFactor
        : undefined;
    const areaShadowOpacityFactorSource =
      typeof sceneUserData.auroraTerrainAreaGlobalShadowOpacityFactorSource === "string" &&
      sceneUserData.auroraTerrainAreaGlobalShadowOpacityFactorSource.length > 0
        ? sceneUserData.auroraTerrainAreaGlobalShadowOpacityFactorSource
        : undefined;
    const placeableFastShadowTextureUrl =
      placeableTextureUrlsByReference.get(PLACEABLE_TWO_DA_FAST_SHADOW_TEXTURE_REFERENCE) ??
      null;
    const placeableFastShadowTexture = placeableFastShadowTextureUrl
      ? runtime.placeableTextureCacheByUrl.get(placeableFastShadowTextureUrl) ?? null
      : null;

    const placeableTwoDaLightPreviewGroup =
      placeableRenderPayload && !debugState.wireframe && useAreaLightingForObjectLights
        ? createPlaceableTwoDaLightPreviewGroup(placeableRenderPayload, objectRadius, {
            offsetScale: placeableTwoDaLightSourceUnitScale,
            sourceUnitScale: placeableTwoDaLightSourceUnitScale,
            sourceUnitScaleSource: placeableTwoDaLightSourceUnitScaleSource,
            displayShadows: debugState.displayShadows,
            showPreviewReceiver: !renderAreaGeometry,
            showPresentationHalo: !renderAreaGeometry,
            showDiagnosticGizmos: debugState.showNonRenderMeshes,
            areaShadowOpacity,
            areaShadowOpacitySource,
            areaShadowOpacityFactor,
            areaShadowOpacityFactorSource,
            fastShadowTexture: placeableFastShadowTexture,
            fastShadowTextureSource: placeableFastShadowTexture
              ? PLACEABLE_TWO_DA_FAST_SHADOW_TEXTURE_SOURCE
              : undefined,
            fastShadowTextureProofStatus: placeableFastShadowTexture
              ? PLACEABLE_TWO_DA_FAST_SHADOW_TEXTURE_PROOF_STATUS
              : undefined
          })
        : null;
    if (placeableTwoDaLightPreviewGroup) {
      decoratePlaceableModelForObjectSelection(
        placeableTwoDaLightPreviewGroup,
        object.id,
        object.kind,
        objectLabel
      );
      objectRoot.add(placeableTwoDaLightPreviewGroup);
      objectRoot.userData = {
        ...objectRoot.userData,
        ...placeableTwoDaLightPreviewGroup.userData
      };
      if (
        placeableFastShadowTextureUrl &&
        !placeableFastShadowTexture &&
        debugState.displayShadows !== false
      ) {
        void ensurePlaceableTexture(runtime, placeableFastShadowTextureUrl).then((texture) => {
          if (!texture) {
            return;
          }
          const latestObjectRoot = runtime.objectMeshById.get(object.id);
          if (!latestObjectRoot) {
            return;
          }
          const bound = bindPlaceableTwoDaFastShadowTexture(latestObjectRoot, texture, {
            source: PLACEABLE_TWO_DA_FAST_SHADOW_TEXTURE_SOURCE,
            proofStatus: PLACEABLE_TWO_DA_FAST_SHADOW_TEXTURE_PROOF_STATUS
          });
          if (!bound) {
            return;
          }
          writePlaceableFastShadowTextureDebugStatus(runtime, {
            status: "applied",
            url: placeableFastShadowTextureUrl,
            source: "fxpa_dot01-fast-shadow"
          });
        });
      }
    }

    const itemPropertyLightPreviewGroup =
      object.kind === "items" && !debugState.wireframe
        ? createItemPropertyLightPreviewGroup(
            object,
            objectRadius,
            soundMetersToWorldScale,
            auroraLightRuntimeBudget
          )
        : null;
    if (itemPropertyLightPreviewGroup) {
      decoratePlaceableModelForObjectSelection(
        itemPropertyLightPreviewGroup,
        object.id,
        object.kind,
        objectLabel
      );
      objectRoot.add(itemPropertyLightPreviewGroup);
      objectRoot.userData = {
        ...objectRoot.userData,
        ...itemPropertyLightPreviewGroup.userData
      };
    }

    const renderNode = objectRoot;
    const renderBaseY = resolveSceneObjectRenderBaseY(
      isPrimitiveObject,
      objectRadius,
      objectRoot instanceof THREE.Mesh ? objectRoot.geometry : null
    );
    const showPhysicalAnchor =
      object.kind !== "sounds" &&
      debugState.showVtPhysicalAnchor &&
      isVisualTransformAppliedToObject(object);
    if (showPhysicalAnchor) {
      const physicalAnchorGeometry = new THREE.SphereGeometry(objectRadius * 0.94, 16, 16);
      const physicalAnchorMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(VT_PHYSICAL_ANCHOR_COLOR),
        transparent: true,
        opacity: 0.72,
        wireframe: true,
        depthWrite: false,
        depthTest: false
      });
      const physicalAnchorMesh = new THREE.Mesh(physicalAnchorGeometry, physicalAnchorMaterial);
      physicalAnchorMesh.renderOrder = 20;
      physicalAnchorMesh.raycast = () => undefined;
      const physicalAnchorPosition = new THREE.Vector3(
        renderObjectX,
        objectBaseY + object.z,
        renderObjectZ
      );
      physicalAnchorMesh.position.set(
        physicalAnchorPosition.x,
        physicalAnchorPosition.y,
        physicalAnchorPosition.z
      );
      physicalAnchorMesh.rotation.set(0, resolveRenderYaw(object.bearing), 0);
      physicalAnchorMesh.userData = {
        visualTransformPhysicalAnchor: true
      };
      runtime.objectLayer.add(physicalAnchorMesh);

      const visualAnchorOffset = resolveObjectVisualOffsetVector(
        effectiveVisualTransform,
        object.bearing,
        resolveRenderYaw,
        renderAreaGeometry
      );
      const visualAnchorPosition = new THREE.Vector3(
        renderObjectX + visualAnchorOffset.x,
        objectBaseY + object.z + visualAnchorOffset.y,
        renderObjectZ + visualAnchorOffset.z
      );
      const displacement = visualAnchorPosition.clone().sub(physicalAnchorPosition);
      if (displacement.lengthSq() > 1e-6) {
        const connectorGeometry = new THREE.BufferGeometry().setFromPoints([
          physicalAnchorPosition,
          visualAnchorPosition
        ]);
        const connectorMaterial = new THREE.LineDashedMaterial({
          color: new THREE.Color("#45f7a2"),
          transparent: true,
          opacity: 0.95,
          dashSize: 0.08 * markerScale,
          gapSize: 0.04 * markerScale,
          depthTest: false,
          depthWrite: false
        });
        const connector = new THREE.Line(connectorGeometry, connectorMaterial);
        connector.computeLineDistances();
        connector.renderOrder = 19;
        connector.raycast = () => undefined;
        runtime.objectLayer.add(connector);
      }
    }

    const soundPositioning =
      object.kind === "sounds" ? normalizeSoundGuidePositioning(object.soundPositioning) : null;
    const soundGuideGeometry = soundPositioning
      ? resolveSoundGuideWorldGeometry(soundPositioning, soundUnitsPerTile)
      : null;
    const soundOverlayFlags =
      object.kind === "sounds"
        ? resolveEditorSoundGuideOverlayFlags(soundPositioning, {
            editorVisible: true,
            locked
          })
        : null;
    const visualScale = Math.max(0.01, effectiveVisualTransform.scale);
    const selectedVisualScale = visualScale * 1.16;
    const visualScaleVector = resolveObjectVisualScaleVector(
      effectiveVisualTransform,
      1
    );
    const selectedVisualScaleVector = resolveObjectVisualScaleVector(
      effectiveVisualTransform,
      1.16
    );
    const renderNodeBasePosition = new THREE.Vector3(
      renderObjectX,
      renderBaseY + object.z,
      renderObjectZ
    );
    if (renderAreaGeometry) {
      const polygonGuide = createAreaObjectPolygonGuide(
        object,
        { x: renderObjectX, y: object.z + 0.018, z: renderObjectZ },
        selectedSet.has(object.id),
      );
      if (polygonGuide) {
        runtime.objectLayer.add(polygonGuide);
      }
    }
    applyObjectVisualTransformToRenderNode({
      node: renderNode,
      position: renderNodeBasePosition,
      transform: effectiveVisualTransform,
      bearing: object.bearing,
      resolveRenderYaw,
      renderAreaGeometry,
      object
    });

    if (selectedSet.has(object.id)) {
      if (isPrimitiveObject && renderNode instanceof THREE.Mesh) {
        material.emissive = new THREE.Color("#ffd87f");
      }
      applyObjectVisualTransformToRenderNode({
        node: renderNode,
        position: renderNodeBasePosition,
        transform: effectiveVisualTransform,
        bearing: object.bearing,
        resolveRenderYaw,
        renderAreaGeometry,
        selectedScaleFactor: 1.16,
        object
      });
    }

    const sourceRenderStatus = resolveAreaObjectSourceRenderStatus(object);
    if (shouldRenderAreaObjectSourceAffordance(object, selectedSet.has(object.id), debugState)) {
      const footprint = createAreaObjectSourceFootprint(
        objectRadius,
        sourceRenderStatus,
        selectedSet.has(object.id)
      );
      footprint.position.set(0, -renderBaseY + 0.026, 0);
      renderNode.add(footprint);
      syncAreaObjectSourceIdLabel({
        root: renderNode,
        object,
        selected: selectedSet.has(object.id),
        markerScale,
        labelHeight
      });
    }

    const itemIconFallback =
      object.kind === "items" &&
      itemModelPartResolutions.length === 0 &&
      itemArmorPartModelResolutions.length === 0
        ? createItemIconFallbackRender(object, objectRadius)
        : null;
    let renderNodeSharedRendererRuntimeEvidence = sharedRendererRuntimeEvidence;
    if (itemIconFallback) {
      renderNode.add(itemIconFallback.group);
      renderNodeSharedRendererRuntimeEvidence = buildAreaObjectSharedRendererRuntimeEvidence({
        sharedRendererTarget: true,
        payloadStatus: "payload-bound",
        geometryStatus: "model-url-ready",
        placeholderReason: "none",
        modelUrl:
          itemIconFallback.composition.previewImageUrl ??
          itemIconFallback.composition.rawAssetUrl ??
          itemIconFallback.composition.iconResRef
      });
    }

    if (object.kind === "sounds") {
      const soundGuidePositioning =
        soundPositioning ?? normalizeSoundGuidePositioning(object.soundPositioning);
      const markerMode = soundGuidePositioning.mode;
      const soundModeMarker = createSoundModeMarkerGroup(markerMode, markerScale);
      soundModeMarker.position.set(0, labelHeight * 0.8, 0);
      renderNode.add(soundModeMarker);

      const physicalAnchorY = objectBaseY + object.z;
      const elevatedAnchorY =
        physicalAnchorY + (soundGuideGeometry?.elevationOffsetWorld ?? 0);
      if (soundOverlayFlags?.anchor) {
        const physicalAnchorMesh = new THREE.Mesh(
          new THREE.SphereGeometry(objectRadius * 0.32, 12, 12),
          new THREE.MeshBasicMaterial({
            color: new THREE.Color(SOUND_HEIGHT_COLOR),
            transparent: true,
            opacity: selectedSet.has(object.id) ? 1 : 0.9,
            depthWrite: false
          })
        );
        physicalAnchorMesh.position.set(renderObjectX, physicalAnchorY, renderObjectZ);
        physicalAnchorMesh.renderOrder = 14;
        physicalAnchorMesh.raycast = () => undefined;
        markSoundEditorGuide(physicalAnchorMesh, object.id, "anchor");
        runtime.objectLayer.add(physicalAnchorMesh);
        const visualAnchorPosition = new THREE.Vector3(
          renderNode.position.x,
          renderNode.position.y,
          renderNode.position.z
        );
        if (visualAnchorPosition.distanceToSquared(physicalAnchorMesh.position) > 1e-6) {
          const anchorConnector = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
              physicalAnchorMesh.position.clone(),
              visualAnchorPosition
            ]),
            new THREE.LineDashedMaterial({
              color: new THREE.Color(SOUND_HEIGHT_COLOR),
              transparent: true,
              opacity: selectedSet.has(object.id) ? 0.92 : 0.72,
              dashSize: Math.max(0.06, markerScale * 0.11),
              gapSize: Math.max(0.03, markerScale * 0.07),
              depthWrite: false
            })
          );
          anchorConnector.computeLineDistances();
          anchorConnector.raycast = () => undefined;
          markSoundEditorGuide(anchorConnector, object.id, "anchor-connector");
          runtime.objectLayer.add(anchorConnector);
        }
      }

      if (soundOverlayFlags?.range) {
        const maxRange = soundGuideGeometry?.maxVolumeRadiusWorld ?? 0;
        const cutoffRange = soundGuideGeometry?.cutoffRadiusWorld ?? maxRange;
        const rangeOpacity = selectedSet.has(object.id) ? 0.84 : 0.64;
        const createHorizontalRing = (
          radius: number,
          color: string,
          opacity: number,
          dashed: boolean
        ) => {
          const segments = 80;
          const ringPoints: THREE.Vector3[] = [];
          for (let segment = 0; segment <= segments; segment += 1) {
            const angle = (segment / segments) * Math.PI * 2;
            ringPoints.push(
              new THREE.Vector3(
                renderObjectX + Math.cos(angle) * radius,
                elevatedAnchorY,
                renderObjectZ + Math.sin(angle) * radius
              )
            );
          }
          const ringGeometry = new THREE.BufferGeometry().setFromPoints(ringPoints);
          const ringMaterial = dashed
            ? new THREE.LineDashedMaterial({
                color: new THREE.Color(color),
                transparent: true,
                opacity,
                dashSize: Math.max(0.06, markerScale * 0.14),
                gapSize: Math.max(0.03, markerScale * 0.09),
                depthWrite: false
              })
            : new THREE.LineBasicMaterial({
                color: new THREE.Color(color),
                transparent: true,
                opacity,
                depthWrite: false
              });
          const ring = new THREE.Line(ringGeometry, ringMaterial);
          if (dashed) {
            ring.computeLineDistances();
          }
          ring.raycast = () => undefined;
          markSoundEditorGuide(ring, object.id, dashed ? "max-range" : "cutoff-range");
          runtime.objectLayer.add(ring);
        };

        if (cutoffRange > 0.001) {
          createHorizontalRing(cutoffRange, "#8fd3ff", rangeOpacity + 0.05, false);
        }
        if (maxRange > 0.001) {
          createHorizontalRing(maxRange, "#5f80b8", Math.min(1, rangeOpacity + 0.12), true);
        }
        if (cutoffRange > 0.001) {
          const domeRange = cutoffRange;
          const domeOpacity = selectedSet.has(object.id) ? 0.44 : 0.31;
          const domeDashSize = Math.max(0.05, markerScale * 0.12);
          const domeGapSize = Math.max(0.02, markerScale * 0.08);

          const latitudeHeights = [-0.8, -0.45, -0.2, 0.2, 0.45, 0.8];
          latitudeHeights.forEach((normalizedHeight) => {
            const bandY = elevatedAnchorY + domeRange * normalizedHeight;
            const bandRadius = domeRange * Math.sqrt(Math.max(0, 1 - normalizedHeight ** 2));
            if (bandRadius <= 0.001) {
              return;
            }
            const bandPoints: THREE.Vector3[] = [];
            const segmentCount = 56;
            for (let segment = 0; segment <= segmentCount; segment += 1) {
              const angle = (segment / segmentCount) * Math.PI * 2;
              bandPoints.push(
                new THREE.Vector3(
                  renderObjectX + Math.cos(angle) * bandRadius,
                  bandY,
                  renderObjectZ + Math.sin(angle) * bandRadius
                )
              );
            }
            const bandLine = new THREE.Line(
              new THREE.BufferGeometry().setFromPoints(bandPoints),
              new THREE.LineDashedMaterial({
                color: new THREE.Color(SOUND_DOME_COLOR),
                transparent: true,
                opacity: domeOpacity,
                dashSize: domeDashSize,
                gapSize: domeGapSize,
                depthWrite: false
              })
            );
            bandLine.computeLineDistances();
            bandLine.raycast = () => undefined;
            markSoundEditorGuide(bandLine, object.id, "dome-latitude");
            runtime.objectLayer.add(bandLine);
          });

          const meridianCount = 12;
          for (let meridianIndex = 0; meridianIndex < meridianCount; meridianIndex += 1) {
            const azimuth = (meridianIndex / meridianCount) * Math.PI * 2;
            const meridianPoints: THREE.Vector3[] = [];
            const segmentCount = 48;
            for (let step = 0; step <= segmentCount; step += 1) {
              // Full 360deg meridian loop so both left and right hemispheres are visible.
              const angle = (step / segmentCount) * Math.PI * 2;
              const radial = domeRange * Math.cos(angle);
              meridianPoints.push(
                new THREE.Vector3(
                  renderObjectX + Math.cos(azimuth) * radial,
                  elevatedAnchorY + domeRange * Math.sin(angle),
                  renderObjectZ + Math.sin(azimuth) * radial
                )
              );
            }
            const meridianLine = new THREE.Line(
              new THREE.BufferGeometry().setFromPoints(meridianPoints),
              new THREE.LineDashedMaterial({
                color: new THREE.Color(SOUND_DOME_COLOR),
                transparent: true,
                opacity: domeOpacity,
                dashSize: domeDashSize,
                gapSize: domeGapSize,
                depthWrite: false
              })
            );
            meridianLine.computeLineDistances();
            meridianLine.raycast = () => undefined;
            markSoundEditorGuide(meridianLine, object.id, "dome-meridian");
            runtime.objectLayer.add(meridianLine);
          }
        }
      }

      if (
        soundOverlayFlags?.randBox &&
        soundGuidePositioning.randomRangeWestEast > 0 &&
        soundGuidePositioning.randomRangeNorthSouth > 0
      ) {
        const halfWidth = soundGuideGeometry?.randomRangeHalfWidthWorld ?? 0;
        const halfHeight = soundGuideGeometry?.randomRangeHalfDepthWorld ?? 0;
        const randomRangePoints = [
          new THREE.Vector3(renderObjectX - halfWidth, elevatedAnchorY, renderObjectZ - halfHeight),
          new THREE.Vector3(renderObjectX + halfWidth, elevatedAnchorY, renderObjectZ - halfHeight),
          new THREE.Vector3(renderObjectX + halfWidth, elevatedAnchorY, renderObjectZ + halfHeight),
          new THREE.Vector3(renderObjectX - halfWidth, elevatedAnchorY, renderObjectZ + halfHeight),
          new THREE.Vector3(renderObjectX - halfWidth, elevatedAnchorY, renderObjectZ - halfHeight)
        ];
        const randomRangeGeometry = new THREE.BufferGeometry().setFromPoints(randomRangePoints);
        const randomRangeMaterial = new THREE.LineBasicMaterial({
          color: new THREE.Color(SOUND_RANDOM_RANGE_COLOR),
          transparent: true,
          opacity: selectedSet.has(object.id) ? 0.92 : 0.75,
          depthWrite: false
        });
        const randomRangeRect = new THREE.Line(randomRangeGeometry, randomRangeMaterial);
        randomRangeRect.raycast = () => undefined;
        markSoundEditorGuide(randomRangeRect, object.id, "random-range");
        runtime.objectLayer.add(randomRangeRect);
      }

      if (soundOverlayFlags?.height && Math.abs(elevatedAnchorY - physicalAnchorY) > 1e-4) {
        const heightGeometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(renderObjectX, physicalAnchorY, renderObjectZ),
          new THREE.Vector3(renderObjectX, elevatedAnchorY, renderObjectZ)
        ]);
        const heightLine = new THREE.Line(
          heightGeometry,
          new THREE.LineBasicMaterial({
            color: new THREE.Color(SOUND_HEIGHT_COLOR),
            transparent: true,
            opacity: selectedSet.has(object.id) ? 0.96 : 0.82,
            depthWrite: false
          })
        );
        heightLine.raycast = () => undefined;
        markSoundEditorGuide(heightLine, object.id, "height");
        runtime.objectLayer.add(heightLine);
      }
    }

    renderNode.userData = {
      ...renderNode.userData,
      objectId: object.id,
      objectKind: object.kind,
      objectLabel: OBJECT_LABELS[object.kind],
      auroraAreaObjectSourceStatus: sourceRenderStatus,
      auroraAreaObjectSourceType: object.source?.type ?? "",
      auroraAreaObjectSourceId: object.source?.sourceObjectId ?? "",
      auroraAreaObjectSourceKind: object.source?.sourceKind ?? "",
      auroraAreaObjectTemplateId: object.source?.templateId ?? object.resRef,
      auroraAreaObjectPosition: `${object.x},${object.y},${object.z}`,
      auroraAreaObjectBearing: String(object.bearing),
      auroraAreaObjectRenderAnchor: `${renderObjectX},${renderObjectZ},${renderBaseY + object.z}`,
      ...buildAreaObjectPlacementEvidence(
        object,
        renderObjectX,
        renderObjectZ,
        renderBaseY + object.z
      ),
      ...buildAreaObjectPlaceablePayloadEvidence(object, placeableRenderPayload),
      auroraAreaObjectVisualTransform:
        formatAreaObjectVisualTransformEvidence(object.visualTransform),
      auroraAreaObjectEffectiveVisualTransform:
        formatAreaObjectVisualTransformEvidence(effectiveVisualTransform),
      auroraAreaObjectVisualTransformApplied: isVisualTransformAppliedToObject(object),
      ...buildAreaObjectRenderTransformEvidence(
        effectiveVisualTransform,
        object.bearing,
        resolveRenderYaw,
        renderAreaGeometry,
        renderNodeBasePosition,
        object
      ),
      auroraPrimitiveObject: isPrimitiveObject,
      [AREA_OBJECT_BASE_SCALE_KEY]: visualScale,
      [AREA_OBJECT_SELECTED_SCALE_KEY]: selectedVisualScale,
      [AREA_OBJECT_BASE_SCALE_VECTOR_KEY]: toStoredObjectScaleVector(visualScaleVector),
      [AREA_OBJECT_SELECTED_SCALE_VECTOR_KEY]:
        toStoredObjectScaleVector(selectedVisualScaleVector),
      ...renderNodeSharedRendererRuntimeEvidence,
      ...(object.kind === "creatures"
        ? {
            ...buildCreatureRenderPayloadUserData(creatureRenderPayload),
            ...buildCreatureRenderModelUserData(creatureRenderModelResolution),
            ...buildCreatureEquipmentModelPartGroupUserData(
              creatureEquipmentModelPartResolutions
            )
          }
        : {}),
      ...(object.kind === "sounds"
        ? {
            soundRenderDiagnosticRole: SOUND_MARKER_DIAGNOSTIC_ROLE,
            soundGuideGeometryRevision: SOUND_GUIDE_WORLD_GEOMETRY_REVISION,
            soundGuideMode: soundPositioning?.mode ?? "missing",
            soundGuideElevationMeters: soundPositioning?.elevation ?? null,
            soundGuideElevationOffsetWorld:
              soundGuideGeometry?.elevationOffsetWorld ?? null,
            soundGuideMaxVolumeRadiusWorld:
              soundGuideGeometry?.maxVolumeRadiusWorld ?? null,
            soundGuideCutoffRadiusWorld:
              soundGuideGeometry?.cutoffRadiusWorld ?? null,
            soundGuideRandomRangeHalfWidthWorld:
              soundGuideGeometry?.randomRangeHalfWidthWorld ?? null,
            soundGuideRandomRangeHalfDepthWorld:
              soundGuideGeometry?.randomRangeHalfDepthWorld ?? null
          }
        : {}),
      ...(object.kind === "items"
        ? {
            itemPreviewMode:
              itemArmorPartModelResolutions.length > 0
                ? "armor-part-assets"
                : itemModelPartResolutions.length > 0
                ? "model-part-assets"
                : itemIconFallback
                ? "icon-fallback"
                : (object.itemProperties?.armorPartModelCandidates?.length ?? 0) > 0
                  ? "armor-part-assets-missing"
                : (object.itemProperties?.modelPartCandidates?.length ?? 0) > 0
                  ? "model-part-assets-missing"
                  : "metadata-only",
            itemPreviewBaseItem: object.itemProperties?.baseItem ?? null,
            itemPreviewBaseItemLabel: object.itemProperties?.baseItemLabel ?? "",
            itemPreviewModelType: object.itemProperties?.baseItemModelType ?? "",
            itemPreviewModelParts: readSceneObjectItemModelParts(object).join("/"),
            itemPreviewModelPartResRefs:
              object.itemProperties?.modelPartResRefs?.join("|") ?? "",
            itemPreviewTextureReferenceCount: itemTextureUrlsByReference.size,
            itemPreviewTextureReferences: Array.from(itemTextureUrlsByReference.keys()),
            ...(itemIconFallback?.userData ?? {}),
            ...buildItemModelPartGroupUserData(object, itemModelPartResolutions),
            ...buildItemArmorPartGroupUserData(object, itemArmorPartModelResolutions)
          }
        : {})
    };
    if (object.kind === "items") {
      applyItemModelParts({
        runtime,
        objectId: object.id,
        root: renderNode,
        object,
        resolutions: itemModelPartResolutions,
        textureUrlsByReference: itemTextureUrlsByReference,
        objectRadius
      });
      applyItemArmorPartModels({
        runtime,
        objectId: object.id,
        root: renderNode,
        object,
        resolutions: itemArmorPartModelResolutions,
        textureUrlsByReference: itemTextureUrlsByReference,
        objectRadius
      });
    }
    if (object.kind === "creatures") {
      const creatureEquipmentMarkerUserData = applyCreatureEquipmentMarkers(
        renderNode,
        creatureRenderPayload,
        objectRadius,
        { showDiagnosticMarkers: debugState.showNonRenderMeshes }
      );
      const creatureEquipmentItemPropertyLightUserData =
        applyCreatureEquipmentItemPropertyLights(
          renderNode,
          creatureRenderPayload,
          objectRadius,
          soundMetersToWorldScale,
          auroraLightRuntimeBudget
        );
      if (!shouldUseCreaturePartModels) {
        applyCreatureEquipmentModelParts({
          runtime,
          objectId: object.id,
          root: renderNode,
          resolutions: creatureEquipmentModelPartResolutions,
          objectRadius,
          textureUrlsByReference: creatureTextureUrlsByReference,
          textureBindings: creatureRenderPayload?.renderPackage?.textureBindings,
          auroraMaterial: creatureRenderPayload?.renderPackage?.auroraMaterial,
          colors: creatureRenderPayload?.renderPackage?.colors,
          appearanceProfile: creatureRenderPayload?.renderPackage?.appearanceProfile,
          wireframe: debugState.wireframe,
          requestedAnimationName: resolveCreatureSelectedAnimationName(object)
        });
      }
      renderNode.userData = {
        ...renderNode.userData,
        ...creatureEquipmentMarkerUserData,
        ...creatureEquipmentItemPropertyLightUserData
      };
      if (!shouldUseModelObject) {
        const sourcePreviewUserData = attachCreatureAuroraSourcePreviewGroups({
          runtime,
          objectId: object.id,
          root: renderNode,
          host: renderNode,
          payload: creatureRenderPayload,
          objectRadius,
          colorHex,
          textureUrlsByReference: creatureTextureUrlsByReference,
          showDiagnosticGizmos: debugState.showNonRenderMeshes
        });
        if (Object.keys(sourcePreviewUserData).length > 0) {
          const sourcePreviewAnimationUserData = applyCreatureAnimationPlaybackToModel(
            runtime,
            object,
            renderNode,
            [],
            {
              autoSelectDefaultClip: false,
              autoPlayDefaultClip: false
            }
          );
          renderNode.userData = {
            ...renderNode.userData,
            creatureAuroraPrimitiveFallbackPreviewStatus: "active",
            creatureAuroraPrimitiveFallbackPreviewMode: "source-mdl-preview",
            ...sourcePreviewUserData,
            ...(sourcePreviewAnimationUserData ?? {})
          };
          writeRuntimeObjectAnimationDataset(runtime);
          if (renderNode instanceof THREE.Mesh) {
            const fallbackMaterials = Array.isArray(renderNode.material)
              ? renderNode.material
              : [renderNode.material];
            const hasParticlePreview =
              sourcePreviewUserData.creatureAuroraEmitterParticlePreviewStatus ===
              "active";
            const fallbackOpacityCeiling = hasParticlePreview
              ? debugState.showNonRenderMeshes
                ? 0.12
                : 0.035
              : 0.16;
            fallbackMaterials.forEach((fallbackMaterial) => {
              fallbackMaterial.transparent = true;
              fallbackMaterial.opacity = Math.min(
                fallbackMaterial.opacity ?? 1,
                fallbackOpacityCeiling
              );
              fallbackMaterial.depthWrite = false;
              fallbackMaterial.needsUpdate = true;
            });
            renderNode.renderOrder = Math.max(renderNode.renderOrder, 7);
          }
          const textureReferenceCount = Number(
            sourcePreviewUserData.creatureAuroraEmitterParticlePreviewTextureReferenceCount ??
              creatureTextureUrlsByReference.size
          );
          const textureLoadedCount = Number(
            sourcePreviewUserData.creatureAuroraEmitterParticlePreviewTextureLoadedCount ?? 0
          );
          const vfxTextureStatus =
            typeof sourcePreviewUserData.vfxTextureStatus === "string"
              ? sourcePreviewUserData.vfxTextureStatus
              : "";
          const textureStatus =
            vfxTextureStatus.length > 0
              ? vfxTextureStatus
              : textureReferenceCount > 0
                ? textureLoadedCount >= textureReferenceCount
                  ? "applied"
                  : "loading"
                : "not-applicable";
          writePlaceableModelDebugStatus(
            runtime,
            textureStatus === "loading" ? "loading" : "loaded",
            {
              objectId: object.id,
              url:
                Array.from(creatureTextureUrlsByReference.values())[0] ??
                objectRenderPackageModelUrl ??
                null,
              loadPhase: "creature-source-preview",
              loadCompleted: textureLoadedCount,
              loadTotal: textureReferenceCount,
              textureStatus,
              textureCount: textureReferenceCount,
              textureLoaded: textureLoadedCount,
              textureSource: "source-mdl-emitter-preview"
            }
          );
        }
      }
    }
    markAreaObjectSharedRendererRuntimeEvidence(
      renderNode,
      renderNodeSharedRendererRuntimeEvidence
    );
    if (itemIconFallback) {
      runtime.objectMeshById.set(object.id, renderNode);
      markAreaObjectSharedRendererTextureRuntimeEvidence(renderNode, "loading", {
        textureCount: 1,
        textureLoaded: 0,
        textureSource: itemIconFallback.composition.source,
        requestedTextureReferences: [itemIconFallback.composition.iconResRef]
      });
      scheduleItemIconFallbackTextureLoad({
        runtime,
        objectId: object.id,
        root: renderNode,
        fallback: itemIconFallback
      });
    }

    if (debugState.collisionOverlay) {
      const collisionGeometry = new THREE.TorusGeometry(collisionRadius, collisionThickness, 8, 24);
      const collisionMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color("#ff8c4d"),
        transparent: true,
        opacity: 0.85
      });
      const collisionRing = new THREE.Mesh(collisionGeometry, collisionMaterial);
      collisionRing.rotation.x = Math.PI / 2;
      collisionRing.position.set(0, 0.02, 0);
      renderNode.add(collisionRing);
    }

    runtime.objectLayer.add(renderNode);
    runtime.objectMeshById.set(object.id, renderNode);
    if (canonicalAuroraVfxPayload && auroraVfxAreaCollision && canonicalVfxGroup) {
      void refreshCanonicalVfxWithAreaCollision({
        runtime,
        object,
        objectLabel,
        objectRadius,
        payload: canonicalAuroraVfxPayload,
        areaCollision: auroraVfxAreaCollision,
        renderAreaGeometry,
        sourceMdlPlaceableEmitter: Boolean(isSourceMdlPlaceableEmitterPayload),
        particleTextureUrlsByReference: placeableTextureUrlsByReference,
        particleTextureLoadOptions: canonicalVfxTextureLoadOptions,
        blockPltWithoutTargetContext: canonicalVfxBlocksPltWithoutTargetContext,
        chunkModelUrlsByResourceKey: canonicalVfxChunkModelUrlsByResourceKey,
        chunkModelAuroraMaterial: placeableRenderPayload?.renderPackage?.auroraMaterial,
        chunkModelTextureBindings: placeableRenderPayload?.renderPackage?.textureBindings,
        modelGraph: toAuroraVfxCanonicalModelGraph(
          placeableRenderPayload?.renderPackage?.auroraModelGraph
        ),
        sourceMdlLightPolicy
      });
    }

    if (debugState.objectLabels) {
      const labelSprite = createTextSprite(OBJECT_LABELS[object.kind], labelScale);
      labelSprite.position.set(0, labelHeight, 0);
      renderNode.add(labelSprite);
    }
    if (
      showRuntimeSoundNowPlaying &&
      object.kind === "sounds" &&
      nowPlayingLabelById.has(object.id)
    ) {
      const nowPlayingSprite = createTextSprite(
        nowPlayingLabelById.get(object.id) ?? SOUND_NOW_PLAYING_BADGE_LABEL,
        markerScale * 0.74,
        {
          fillColor: "#d9ffe8",
          backgroundFill: "rgba(7, 35, 20, 0.92)",
          backgroundStroke: "rgba(74, 227, 153, 0.92)",
          autoWidth: true,
          minWidthPx: 180,
          maxWidthPx: 1800,
          horizontalPaddingPx: 30
        }
      );
      nowPlayingSprite.position.set(0, labelHeight + markerScale * 0.56, 0);
      renderNode.add(nowPlayingSprite);
    }

    if (debugState.bounds) {
      const helperColor = isStatusMapped ? STATUS_COLOR[effectiveRenderStatus] : "#8ab5ff";
      const boundsHelper = new THREE.BoxHelper(renderNode, helperColor);
      runtime.boundsLayer.add(boundsHelper);
      runtime.boundsHelpers.push(boundsHelper);
    }
  });

  instancedFallbackPlaceableBatches.forEach((batch) => {
    if (batch.entries.length === 0) {
      return;
    }
    const geometry = getSharedPlaceableFallbackGeometry(runtime, objectRadius);
    const material = new THREE.MeshLambertMaterial({
      color: new THREE.Color("#ffffff"),
      wireframe: batch.wireframe,
      vertexColors: true,
      transparent: batch.opacity < 1,
      opacity: batch.opacity
    });
    const instancedMesh = new THREE.InstancedMesh(geometry, material, batch.entries.length);
    instancedMesh.userData = {
      role: OBJECT_INSTANCED_FALLBACK_PLACEABLE_ROLE,
      objectKind: "placeables",
      objectIds: batch.entries.map((entry) => entry.objectId)
    };
    instancedMesh.renderOrder = 7;
    batch.entries.forEach((entry, instanceId) => {
      entry.proxy.userData = {
        ...entry.proxy.userData,
        [AREA_OBJECT_INSTANCED_MESH_KEY]: instancedMesh,
        [AREA_OBJECT_INSTANCED_INSTANCE_ID_KEY]: instanceId
      };
      instancedMesh.setMatrixAt(instanceId, composeObjectInstanceMatrix(entry.proxy));
      instancedMesh.setColorAt(
        instanceId,
        reusableInstanceColor.set(
          resolveInstancedFallbackSelectedColor(entry.colorHex, entry.selected)
        )
      );
    });
    instancedMesh.instanceMatrix.needsUpdate = true;
    if (instancedMesh.instanceColor) {
      instancedMesh.instanceColor.needsUpdate = true;
    }
    runtime.objectLayer.add(instancedMesh);
  });

  instancedAreaObjectSourceFootprintBatches.forEach((batch) => {
    if (batch.entries.length === 0) {
      return;
    }
    const geometry = getSharedAreaObjectSourceFootprintGeometry(
      runtime,
      objectRadius,
      batch.status
    );
    const defaultMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(resolveAreaObjectSourceFootprintColor(batch.status)),
      transparent: true,
      opacity: resolveAreaObjectSourceFootprintOpacity(batch.status, false),
      depthWrite: false
    });
    const selectedMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(resolveAreaObjectSourceFootprintColor(batch.status)),
      transparent: true,
      opacity: resolveAreaObjectSourceFootprintOpacity(batch.status, true),
      depthWrite: false
    });
    const defaultMesh = new THREE.InstancedMesh(geometry, defaultMaterial, batch.entries.length);
    const selectedMesh = new THREE.InstancedMesh(geometry, selectedMaterial, batch.entries.length);
    defaultMesh.renderOrder = 11;
    selectedMesh.renderOrder = 16;
    defaultMesh.raycast = () => undefined;
    selectedMesh.raycast = () => undefined;
    defaultMesh.userData = {
      role: OBJECT_INSTANCED_SOURCE_FOOTPRINT_ROLE,
      areaObjectSourceStatus: batch.status,
      selected: false
    };
    selectedMesh.userData = {
      role: OBJECT_INSTANCED_SOURCE_FOOTPRINT_ROLE,
      areaObjectSourceStatus: batch.status,
      selected: true
    };
    batch.entries.forEach((entry, instanceId) => {
      entry.proxy.userData = {
        ...entry.proxy.userData,
        [AREA_OBJECT_SOURCE_FOOTPRINT_DEFAULT_MESH_KEY]: defaultMesh,
        [AREA_OBJECT_SOURCE_FOOTPRINT_SELECTED_MESH_KEY]: selectedMesh,
        [AREA_OBJECT_SOURCE_FOOTPRINT_DEFAULT_INSTANCE_ID_KEY]: instanceId,
        [AREA_OBJECT_SOURCE_FOOTPRINT_SELECTED_INSTANCE_ID_KEY]: instanceId
      };
      defaultMesh.setMatrixAt(
        instanceId,
        entry.selected
          ? hiddenInstanceMatrix
          : composeAreaObjectSourceFootprintInstanceMatrix(entry.proxy, entry.localY)
      );
      selectedMesh.setMatrixAt(
        instanceId,
        entry.selected
          ? composeAreaObjectSourceFootprintInstanceMatrix(entry.proxy, entry.localY)
          : hiddenInstanceMatrix
      );
    });
    defaultMesh.instanceMatrix.needsUpdate = true;
    selectedMesh.instanceMatrix.needsUpdate = true;
    runtime.objectLayer.add(defaultMesh);
    runtime.objectLayer.add(selectedMesh);
  });

  writeAreaPrimitiveFallbackRenderSuppressionDiagnostics(runtime, {
    version: "aurora-areas-primitive-fallback-render-suppression/v1",
    path: AREA_OBJECT_SHARED_PLACEABLES_RENDERER_RUNTIME_MARKER,
    reason: AREA_PRIMITIVE_FALLBACK_RENDER_SUPPRESSION_REASON,
    renderLimit: AREA_PRIMITIVE_FALLBACK_RENDER_LIMIT,
    candidateCount: areaPrimitiveFallbackCandidateCount,
    renderedCount: areaPrimitiveFallbackRenderedCount,
    suppressedCount: areaPrimitiveFallbackSuppressedCount,
    selectedBypassCount: areaPrimitiveFallbackSelectedBypassCount,
    renderedIds: areaPrimitiveFallbackRenderedIds,
    suppressedIds: areaPrimitiveFallbackSuppressedIds
  });
}
