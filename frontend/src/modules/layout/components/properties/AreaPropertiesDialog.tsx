import { useEffect, useRef, useState } from "react";
import type { AreaPropertiesDraft } from "../../../areas/application/areaPropertiesFacade";
import type {
  AreaEventScriptCatalogFacade,
} from "../../../areas/application/areaEventScriptCatalogFacade";
import type {
  AreaEventScriptPublicationFacade,
} from "../../../areas/application/areaEventScriptPublicationFacade";
import {
  acceptAreaEventScriptPublication,
  applyAreaEventScriptEditorChange,
  canPublishAreaEventScriptEditorSession,
  createAreaEventScriptEditorSession,
  recordAreaEventScriptValidation,
  type AreaEventScriptEditorSession,
} from "../../../areas/application/areaEventScriptEditorSession";
import type {
  AreaEventScriptCatalog,
  AreaEventScriptCatalogItem,
} from "../../../areas/domain/areaEventScriptCatalog";
import {
  AREA_EVENT_SCRIPT_SOURCE_MAX_BYTES,
  createAreaEventScriptSourceCommand,
} from "../../../areas/domain/areaEventScriptPublication";
import { isAreaCommentsValue } from "../../../areas/domain/areaComments";
import {
  AREA_EVENT_SCRIPT_FIELDS,
  isAreaEventScriptResRef,
  type AreaEventScriptSlot,
} from "../../../areas/domain/areaEventScripts";
import {
  MAX_EDITABLE_AREA_NAME_ENTRY_ASCII_BYTES,
  areaNameStorageProfileForEntries,
  isEditableAreaName,
  isEditableAreaTag,
  readEditableAreaNameEntries,
  type EditableAreaNameStorageEntry,
} from "../../../areas/domain/areaBasicIdentity";
import { AREA_NAME_LANGUAGE_CATALOG } from "../../../areas/domain/areaNameLanguageCatalog";
import type {
  AreaPlayerVsPlayerMode,
  AreaTerrainTypeFlags,
} from "../../../areas/domain/areaAdvancedFlags";
import {
  isAreaCheckModifier,
  isAreaLoadingScreenId,
} from "../../../areas/domain/areaAdvancedFlags";
import {
  areaModuleStartLocationsEqual,
  normalizeAreaModuleStartLocation,
  readModuleStartLocationTargets,
} from "../../../areas/domain/areaModuleStartLocation";
import {
  isAreaAudioEnvironment,
  type AreaAudioEnvironmentProperty,
} from "../../../areas/domain/areaAudioEnvironment";
import {
  isAreaVisualEnvironment,
  type AreaDayNightMode,
  type AreaVisualEnvironmentPhase,
} from "../../../areas/domain/areaVisualEnvironment";
import {
  AREA_FOG_CLIP_DISTANCE_MAXIMUM,
  AREA_FOG_CLIP_DISTANCE_MINIMUM,
  AREA_WIND_POWER_MAXIMUM,
  AREA_WIND_POWER_MINIMUM,
  isAreaVisualEnvironmentScalarControls,
} from "../../../areas/domain/areaVisualEnvironmentScalarControls";
import { isAreaVisualEnvironmentCatalogSelection } from "../../../areas/domain/areaVisualEnvironmentCatalogSelection";
import {
  resolveEffectiveAreaAudioRows,
  type AreaAudioCatalogBackedProperty,
} from "../../../areas/domain/effectiveAreaAudioCatalog";
import { resolveEffectiveAreaLoadingScreenOptions } from "../../../areas/domain/effectiveAreaLoadingScreenCatalog";
import {
  MAX_AURORA_VARIABLE_ENTRIES,
  readAuroraVariableTargetEntries,
  type AuroraVariableTargetEntry,
} from "../../../shared/domain/auroraVariableTable";
import { AuroraVariableTableEditor } from "./AuroraVariableTableEditor";

const TABS = ["Basic", "Visual", "Audio", "Events", "Advanced", "Comments"] as const;
type AreaPropertiesTab = (typeof TABS)[number];
const AUDIO_CATALOG_ID_FIELDS = [
  ["ambientSoundDayId", "Ambient Sound, Day"],
  ["ambientSoundNightId", "Ambient Sound, Night"],
  ["environmentAudioId", "Environment Audio"],
  ["musicBattleId", "Music, Battle"],
  ["musicDayId", "Music, Day"],
  ["musicNightId", "Music, Night"],
] as const satisfies readonly (readonly [AreaAudioCatalogBackedProperty, string])[];
const AUDIO_VOLUME_FIELDS = [
  ["ambientSoundDayVolume", "Ambient Sound, Day Volume"],
  ["ambientSoundNightVolume", "Ambient Sound, Night Volume"],
] as const satisfies readonly (readonly [AreaAudioEnvironmentProperty, string])[];
const VISUAL_PERCENT_FIELDS = [
  ["shadowOpacity", "shadow opacity"],
  ["chanceRain", "chance rain"],
  ["chanceSnow", "chance snow"],
  ["chanceLightning", "chance lightning"],
] as const;
const VISUAL_COLOR_FIELDS = [
  ["ambientColor", "ambient color"],
  ["diffuseColor", "diffuse color"],
  ["fogColor", "fog color"],
] as const satisfies readonly (readonly [keyof Pick<
  AreaVisualEnvironmentPhase,
  "ambientColor" | "diffuseColor" | "fogColor"
>, string])[];

interface AreaPropertiesDialogProps {
  readonly draft: AreaPropertiesDraft;
  readonly eventScriptCatalogFacade?: AreaEventScriptCatalogFacade;
  readonly eventScriptPublicationFacade?: AreaEventScriptPublicationFacade;
  readonly eventScriptCatalogAccessToken?: string | null;
  readonly onCommit: (draft: AreaPropertiesDraft, close: boolean) => void;
  readonly onCancel: () => void;
}

type EventScriptCatalogState =
  | Readonly<{ status: "idle" | "loading" }>
  | Readonly<{ status: "ready"; value: AreaEventScriptCatalog }>
  | Readonly<{ status: "error"; message: string }>;

type EventScriptEditorOperation =
  | "idle"
  | "loading_source"
  | "validating"
  | "publishing";

type EventScriptEditorError = Readonly<{
  code: string;
  message: string;
}>;

function moveExistingAreaNameEntry(
  entries: readonly EditableAreaNameStorageEntry[] | undefined,
  languageId: number,
  offset: -1 | 1,
): readonly EditableAreaNameStorageEntry[] | undefined {
  if (!entries) return entries;
  const sourceIndex = entries.findIndex((entry) => entry.languageId === languageId);
  const targetIndex = sourceIndex + offset;
  if (sourceIndex < 0 || targetIndex < 0 || targetIndex >= entries.length) return entries;
  const reordered = entries.map((entry) => ({ ...entry }));
  [reordered[sourceIndex], reordered[targetIndex]] = [
    reordered[targetIndex],
    reordered[sourceIndex],
  ];
  return reordered;
}

export function AreaPropertiesDialog({
  draft,
  eventScriptCatalogFacade,
  eventScriptPublicationFacade,
  eventScriptCatalogAccessToken,
  onCommit,
  onCancel,
}: AreaPropertiesDialogProps) {
  const [activeTab, setActiveTab] = useState<AreaPropertiesTab>("Basic");
  const [eventScriptCatalogSearch, setEventScriptCatalogSearch] = useState("");
  const [eventScriptCatalogState, setEventScriptCatalogState] =
    useState<EventScriptCatalogState>({ status: "idle" });
  const eventScriptCatalogRequest = useRef(0);
  const eventScriptEditorRequest = useRef(0);
  const [eventScriptEditorTarget, setEventScriptEditorTarget] = useState(() =>
    AREA_EVENT_SCRIPT_FIELDS
      .map(({ slot }) => draft.eventScripts?.[slot]?.value ?? "")
      .find((value) => isAreaEventScriptResRef(value) && value.length > 0) ?? "");
  const [eventScriptEditorRevision, setEventScriptEditorRevision] = useState("");
  const [eventScriptEditorSource, setEventScriptEditorSource] = useState("");
  const [eventScriptEditorIncludes, setEventScriptEditorIncludes] = useState("");
  const [eventScriptEditorOpen, setEventScriptEditorOpen] = useState(false);
  const [eventScriptEditorSession, setEventScriptEditorSession] =
    useState<AreaEventScriptEditorSession | null>(null);
  const [eventScriptEditorOperation, setEventScriptEditorOperation] =
    useState<EventScriptEditorOperation>("idle");
  const [eventScriptEditorError, setEventScriptEditorError] =
    useState<EventScriptEditorError | null>(null);
  const [eventScriptSourceMissing, setEventScriptSourceMissing] = useState(false);
  const [comments, setComments] = useState(draft.comments);
  const [eventScripts, setEventScripts] = useState(() => Object.fromEntries(
    AREA_EVENT_SCRIPT_FIELDS.map(({ slot }) => [
      slot,
      draft.eventScripts?.[slot] ?? { value: "", state: "preserve_only" as const },
    ]),
  ) as Record<AreaEventScriptSlot, { value: string; state: "editable" | "preserve_only" }>);
  const [basicIdentity, setBasicIdentity] = useState<
    NonNullable<AreaPropertiesDraft["basicIdentity"]>
  >(() => draft.basicIdentity ?? {
    name: { value: "", state: "preserve_only" as const },
    tag: { value: "", state: "preserve_only" as const },
  });
  const [newAreaNameEntryIdentifier, setNewAreaNameEntryIdentifier] = useState(() =>
    String(AREA_NAME_LANGUAGE_CATALOG.find((catalogEntry) =>
      !draft.basicIdentity?.name.entries?.some(
        (entry) => entry.languageId === catalogEntry.storageEntryIdentifier,
      ))?.storageEntryIdentifier ?? ""));
  const [newAreaNameEntryText, setNewAreaNameEntryText] = useState("");
  const [advancedFlags, setAdvancedFlags] = useState(() => draft.advancedFlags ?? {
    terrainType: {
      value: { interior: false, natural: false, subterranean: false },
      state: "preserve_only" as const,
    },
    playerVsPlayer: { value: 0 as AreaPlayerVsPlayerMode, state: "preserve_only" as const },
    noRest: { value: false, state: "preserve_only" as const },
    listenCheckModifier: { value: 0, state: "preserve_only" as const },
    spotCheckModifier: { value: 0, state: "preserve_only" as const },
    loadingScreenId: { value: 0, state: "preserve_only" as const },
  });
  const [moduleStartLocation, setModuleStartLocation] = useState(() =>
    draft.moduleStartLocation ?? {
      value: {
        areaResRef: "",
        x: 0,
        y: 0,
        z: 0,
        directionX: 0,
        directionY: 0,
      },
      state: "preserve_only" as const,
    });
  const [audioEnvironment, setAudioEnvironment] = useState<
    NonNullable<AreaPropertiesDraft["audioEnvironment"]>
  >(() =>
    draft.audioEnvironment ?? {
      value: {
        ambientSoundDayId: 0,
        ambientSoundNightId: 0,
        ambientSoundDayVolume: 0,
        ambientSoundNightVolume: 0,
        environmentAudioId: 0,
        musicBattleId: 0,
        musicDayId: 0,
        musicNightId: 0,
        musicDelayMilliseconds: 0,
      },
      state: "preserve_only" as const,
    });
  const [visualEnvironment, setVisualEnvironment] = useState<
    NonNullable<AreaPropertiesDraft["visualEnvironment"]>
  >(() => draft.visualEnvironment ?? {
    value: {
      dayNightMode: "cycle",
      shadowOpacity: 0,
      chanceRain: 0,
      chanceSnow: 0,
      chanceLightning: 0,
      sun: {
        ambientColor: 0,
        diffuseColor: 0,
        fogColor: 0,
        fogAmount: 0,
        shadows: false,
      },
      moon: {
        ambientColor: 0,
        diffuseColor: 0,
        fogColor: 0,
        fogAmount: 0,
        shadows: false,
      },
    },
    state: "preserve_only" as const,
  });
  const [visualEnvironmentScalarControls, setVisualEnvironmentScalarControls] = useState<
    NonNullable<AreaPropertiesDraft["visualEnvironmentScalarControls"]>
  >(() => draft.visualEnvironmentScalarControls ?? {
    value: { fogClipDistance: 45, windPower: 0 },
    state: "preserve_only" as const,
  });
  const [visualEnvironmentCatalogSelection, setVisualEnvironmentCatalogSelection] = useState<
    NonNullable<AreaPropertiesDraft["visualEnvironmentCatalogSelection"]>
  >(() => draft.visualEnvironmentCatalogSelection ?? {
    value: { lightingSchemeRowIndex: 0, skyBoxRowIndex: 0 },
    state: "preserve_only" as const,
  });
  const [variables, setVariables] = useState<NonNullable<AreaPropertiesDraft["variables"]>>(
    () => draft.variables ?? { value: [], state: "preserve_only" as const },
  );
  const loadEventScriptCatalog = async (search: string) => {
    if (!eventScriptCatalogFacade || !eventScriptCatalogAccessToken) return;
    const request = eventScriptCatalogRequest.current + 1;
    eventScriptCatalogRequest.current = request;
    setEventScriptCatalogState({ status: "loading" });
    const result = await eventScriptCatalogFacade.load(eventScriptCatalogAccessToken, {
      search,
      limit: 200,
      offset: 0,
    });
    if (eventScriptCatalogRequest.current !== request) return;
    if (!result.ok) {
      setEventScriptCatalogState({ status: "error", message: result.error.message });
      return;
    }
    setEventScriptCatalogState({ status: "ready", value: result.value });
    setEventScriptEditorRevision(result.value.moduleRevision);
    if (eventScriptEditorOpen) {
      const includeResRefs = parseAreaEventScriptIncludeResRefs(eventScriptEditorIncludes);
      const command = includeResRefs ? createAreaEventScriptSourceCommand({
        moduleId: result.value.moduleId,
        targetResRef: eventScriptEditorTarget,
        expectedModuleRevision: result.value.moduleRevision,
        sourceText: eventScriptEditorSource,
        includeResRefs,
      }) : null;
      setEventScriptEditorSession(
        command ? createAreaEventScriptEditorSession(command) : null,
      );
    }
  };
  useEffect(() => {
    if (
      activeTab === "Events"
      && eventScriptCatalogState.status === "idle"
      && eventScriptCatalogFacade
      && eventScriptCatalogAccessToken
    ) {
      void loadEventScriptCatalog("");
    }
  }, [activeTab, eventScriptCatalogAccessToken, eventScriptCatalogFacade]);
  const eventScriptCatalog = eventScriptCatalogState.status === "ready"
    ? eventScriptCatalogState.value
    : null;
  const rebuildEventScriptEditorSession = (
    sourceText: string,
    includeText: string,
    targetResRef = eventScriptEditorTarget,
    moduleRevision = eventScriptEditorRevision || eventScriptCatalog?.moduleRevision || "",
  ): AreaEventScriptEditorSession | null => {
    if (!eventScriptCatalog) return null;
    const includeResRefs = parseAreaEventScriptIncludeResRefs(includeText);
    if (!includeResRefs) return null;
    const command = createAreaEventScriptSourceCommand({
      moduleId: eventScriptCatalog.moduleId,
      targetResRef,
      expectedModuleRevision: moduleRevision,
      sourceText,
      includeResRefs,
    });
    if (!command) return null;
    if (eventScriptEditorSession) {
      return applyAreaEventScriptEditorChange(eventScriptEditorSession, {
        moduleId: command.moduleId,
        targetResRef: command.targetResRef,
        expectedModuleRevision: command.expectedModuleRevision,
        sourceText: command.sourceText,
        includeResRefs: command.includeResRefs,
      });
    }
    return createAreaEventScriptEditorSession(command);
  };
  const resetEventScriptEditorTarget = (targetResRef: string) => {
    eventScriptEditorRequest.current += 1;
    setEventScriptEditorTarget(targetResRef);
    setEventScriptEditorRevision((current) =>
      current || eventScriptCatalog?.moduleRevision || "");
    setEventScriptEditorSource("");
    setEventScriptEditorIncludes("");
    setEventScriptEditorOpen(false);
    setEventScriptEditorSession(null);
    setEventScriptEditorOperation("idle");
    setEventScriptEditorError(null);
    setEventScriptSourceMissing(false);
  };
  const loadEventScriptSource = async () => {
    if (
      !eventScriptPublicationFacade
      || !eventScriptCatalogAccessToken
      || !eventScriptCatalog
      || !isAreaEventScriptResRef(eventScriptEditorTarget)
      || eventScriptEditorTarget.length === 0
    ) return;
    const request = eventScriptEditorRequest.current + 1;
    eventScriptEditorRequest.current = request;
    setEventScriptEditorOperation("loading_source");
    setEventScriptEditorError(null);
    setEventScriptSourceMissing(false);
    const result = await eventScriptPublicationFacade.readSource(
      eventScriptCatalogAccessToken,
      {
        moduleId: eventScriptCatalog.moduleId,
        targetResRef: eventScriptEditorTarget,
        expectedModuleRevision:
          eventScriptEditorRevision || eventScriptCatalog.moduleRevision,
      },
    );
    if (eventScriptEditorRequest.current !== request) return;
    setEventScriptEditorOperation("idle");
    if (!result.ok) {
      setEventScriptEditorSession(null);
      setEventScriptEditorOpen(false);
      setEventScriptSourceMissing(result.error.code === "AREA_EVENT_SCRIPT_SOURCE_NOT_FOUND");
      setEventScriptEditorError({ code: result.error.code, message: result.error.message });
      return;
    }
    const command = createAreaEventScriptSourceCommand({
      moduleId: result.value.moduleId,
      targetResRef: result.value.targetResRef,
      expectedModuleRevision: result.value.moduleRevision,
      sourceText: result.value.sourceText,
      includeResRefs: [],
    });
    if (!command) {
      setEventScriptEditorError({
        code: "AREA_EVENT_SCRIPT_SOURCE_RESPONSE_INVALID",
        message: "The committed script source could not initialize a safe editor session.",
      });
      return;
    }
    setEventScriptEditorRevision(result.value.moduleRevision);
    setEventScriptEditorSource(result.value.sourceText);
    setEventScriptEditorIncludes("");
    setEventScriptEditorOpen(true);
    setEventScriptEditorSession(createAreaEventScriptEditorSession(command));
  };
  const startNewEventScript = () => {
    if (!eventScriptCatalog) return;
    const moduleRevision = eventScriptEditorRevision || eventScriptCatalog.moduleRevision;
    setEventScriptEditorRevision(moduleRevision);
    setEventScriptEditorSource("");
    setEventScriptEditorIncludes("");
    setEventScriptEditorOpen(true);
    setEventScriptSourceMissing(false);
    setEventScriptEditorError(null);
    const command = createAreaEventScriptSourceCommand({
      moduleId: eventScriptCatalog.moduleId,
      targetResRef: eventScriptEditorTarget,
      expectedModuleRevision: moduleRevision,
      sourceText: "",
      includeResRefs: [],
    });
    setEventScriptEditorSession(command ? createAreaEventScriptEditorSession(command) : null);
  };
  const validateEventScriptSource = async () => {
    if (!eventScriptPublicationFacade || !eventScriptCatalogAccessToken) return;
    const session = rebuildEventScriptEditorSession(
      eventScriptEditorSource,
      eventScriptEditorIncludes,
    );
    if (!session) {
      setEventScriptEditorSession(null);
      setEventScriptEditorError({
        code: "AREA_EVENT_SCRIPT_SOURCE_COMMAND_INVALID",
        message: "The target, UTF-8 source, revision, or include ResRefs are invalid.",
      });
      return;
    }
    const request = eventScriptEditorRequest.current + 1;
    eventScriptEditorRequest.current = request;
    setEventScriptEditorSession(session);
    setEventScriptEditorOperation("validating");
    setEventScriptEditorError(null);
    const result = await eventScriptPublicationFacade.validate(
      eventScriptCatalogAccessToken,
      session.command,
    );
    if (eventScriptEditorRequest.current !== request) return;
    setEventScriptEditorOperation("idle");
    if (!result.ok) {
      setEventScriptEditorError({ code: result.error.code, message: result.error.message });
      return;
    }
    const validated = recordAreaEventScriptValidation(session, result.value);
    if (!validated) {
      setEventScriptEditorSession(null);
      setEventScriptEditorError({
        code: "AREA_EVENT_SCRIPT_VALIDATION_IDENTITY_INVALID",
        message: "The validation result did not match the current editor session.",
      });
      return;
    }
    setEventScriptEditorSession(validated);
  };
  const publishEventScriptSource = async () => {
    if (
      !eventScriptPublicationFacade
      || !eventScriptCatalogAccessToken
      || !eventScriptEditorSession
      || !canPublishAreaEventScriptEditorSession(eventScriptEditorSession)
    ) return;
    const request = eventScriptEditorRequest.current + 1;
    eventScriptEditorRequest.current = request;
    setEventScriptEditorOperation("publishing");
    setEventScriptEditorError(null);
    const result = await eventScriptPublicationFacade.publish(
      eventScriptCatalogAccessToken,
      eventScriptEditorSession.command,
    );
    if (eventScriptEditorRequest.current !== request) return;
    setEventScriptEditorOperation("idle");
    if (!result.ok) {
      setEventScriptEditorError({ code: result.error.code, message: result.error.message });
      return;
    }
    const published = acceptAreaEventScriptPublication(eventScriptEditorSession, result.value);
    if (!published) {
      setEventScriptEditorSession(null);
      setEventScriptEditorError({
        code: "AREA_EVENT_SCRIPT_PUBLICATION_IDENTITY_INVALID",
        message: "The publication receipt did not match the validated editor session.",
      });
      return;
    }
    setEventScriptEditorRevision(published.command.expectedModuleRevision);
    setEventScriptEditorSession(published);
  };
  const editable = draft.commentsState === "editable";
  const missingAreaNameCatalogEntries = AREA_NAME_LANGUAGE_CATALOG.filter((catalogEntry) =>
    !basicIdentity.name.entries?.some(
      (entry) => entry.languageId === catalogEntry.storageEntryIdentifier,
    ));
  const selectedAreaNameCatalogEntry = missingAreaNameCatalogEntries.find(
    (entry) => String(entry.storageEntryIdentifier) === newAreaNameEntryIdentifier,
  );
  const newAreaNameEntryTextValid = newAreaNameEntryText.length >= 1
    && newAreaNameEntryText.length <= MAX_EDITABLE_AREA_NAME_ENTRY_ASCII_BYTES
    && /^[\x20-\x7e]+$/u.test(newAreaNameEntryText);
  const commentsValid = !editable || isAreaCommentsValue(comments);
  const eventScriptsValid = AREA_EVENT_SCRIPT_FIELDS.every(({ slot }) =>
    eventScripts[slot].state === "preserve_only"
      || isAreaEventScriptResRef(eventScripts[slot].value));
  const basicIdentityValid = (
    basicIdentity.name.state === "preserve_only" || isEditableAreaName(basicIdentity.name.value)
  ) && (
    basicIdentity.tag.state === "preserve_only" || isEditableAreaTag(basicIdentity.tag.value)
  ) && (
    basicIdentity.name.entries === undefined
    || readEditableAreaNameEntries(basicIdentity.name.entries)?.find(
      (entry) => entry.languageId === 0,
    )?.text === basicIdentity.name.value
  );
  const hasEditableField = editable
    || basicIdentity.name.state === "editable"
    || basicIdentity.tag.state === "editable"
    || AREA_EVENT_SCRIPT_FIELDS.some(
    ({ slot }) => eventScripts[slot].state === "editable",
  )
    || advancedFlags.terrainType.state === "editable"
    || advancedFlags.playerVsPlayer.state === "editable"
    || advancedFlags.noRest.state === "editable"
    || advancedFlags.listenCheckModifier.state === "editable"
    || advancedFlags.spotCheckModifier.state === "editable"
    || advancedFlags.loadingScreenId.state === "editable"
    || moduleStartLocation.state === "editable"
    || visualEnvironment.state === "editable"
    || visualEnvironmentScalarControls.state === "editable"
    || visualEnvironmentCatalogSelection.state === "editable"
    || audioEnvironment.state === "editable"
    || variables.state === "editable";
  const advancedFlagsValid = (
    advancedFlags.listenCheckModifier.state === "preserve_only"
    || isAreaCheckModifier(advancedFlags.listenCheckModifier.value)
  ) && (
    advancedFlags.spotCheckModifier.state === "preserve_only"
    || isAreaCheckModifier(advancedFlags.spotCheckModifier.value)
  ) && (
    advancedFlags.loadingScreenId.state === "preserve_only"
    || isAreaLoadingScreenId(advancedFlags.loadingScreenId.value)
  );
  const normalizedStartLocation = normalizeAreaModuleStartLocation(moduleStartLocation.value);
  const startLocationChanged = Boolean(
    normalizedStartLocation
    && moduleStartLocation.sourceValue
    && !areaModuleStartLocationsEqual(
      normalizedStartLocation,
      moduleStartLocation.sourceValue,
    ),
  );
  const startLocationTargets = readModuleStartLocationTargets(
    moduleStartLocation.targetAreaResRefs,
  ) ?? (moduleStartLocation.currentAreaResRef
    ? [moduleStartLocation.currentAreaResRef]
    : []);
  const startLocationValid = moduleStartLocation.state === "preserve_only" || Boolean(
    normalizedStartLocation
    && moduleStartLocation.sourceValue
    && (!startLocationChanged
      || startLocationTargets.includes(normalizedStartLocation.areaResRef)),
  );
  const audioEnvironmentValid = audioEnvironment.state === "preserve_only"
    || isAreaAudioEnvironment(audioEnvironment.value);
  const visualEnvironmentValid = visualEnvironment.state === "preserve_only"
    || isAreaVisualEnvironment(visualEnvironment.value);
  const visualEnvironmentScalarControlsValid =
    visualEnvironmentScalarControls.state === "preserve_only"
    || isAreaVisualEnvironmentScalarControls(visualEnvironmentScalarControls.value);
  const visualEnvironmentCatalogSelectionValid =
    visualEnvironmentCatalogSelection.state === "preserve_only"
    || (isAreaVisualEnvironmentCatalogSelection(
      visualEnvironmentCatalogSelection.value,
    ) && Boolean(draft.visualEnvironmentCatalogs?.lightingSchemes.rows.some(
      (row) => row.rowIndex ===
        visualEnvironmentCatalogSelection.value.lightingSchemeRowIndex,
    )) && Boolean(draft.visualEnvironmentCatalogs?.skyBoxes.rows.some(
      (row) => row.rowIndex === visualEnvironmentCatalogSelection.value.skyBoxRowIndex,
    )));
  const parsedVariables = readAuroraVariableTargetEntries(variables.value);
  const variablesValid = variables.state === "editable"
    ? parsedVariables !== null
    : parsedVariables !== null && parsedVariables.length === 0
      && variables.sourceValue === undefined;
  const loadingScreenOptions = draft.loadingScreenCatalog
    ? resolveEffectiveAreaLoadingScreenOptions(
        draft.loadingScreenCatalog,
        advancedFlags.loadingScreenId.value,
      )
    : undefined;
  const selectedLoadingScreenOption = loadingScreenOptions?.find(
    (option) => option.value === advancedFlags.loadingScreenId.value,
  );
  const valid = commentsValid && eventScriptsValid && basicIdentityValid
    && advancedFlagsValid && startLocationValid && visualEnvironmentValid
    && visualEnvironmentScalarControlsValid && visualEnvironmentCatalogSelectionValid
    && audioEnvironmentValid && variablesValid;
  const nextDraft: AreaPropertiesDraft = {
    ...draft,
    comments,
    eventScripts,
    basicIdentity,
    advancedFlags,
    moduleStartLocation,
    ...(draft.visualEnvironment ? { visualEnvironment } : {}),
    ...(draft.visualEnvironmentScalarControls
      ? { visualEnvironmentScalarControls }
      : {}),
    ...(draft.visualEnvironmentCatalogSelection
      ? { visualEnvironmentCatalogSelection }
      : {}),
    ...(draft.audioEnvironment ? { audioEnvironment } : {}),
    ...(draft.variables ? { variables } : {}),
  };
  const currentEventScriptValidation = eventScriptEditorSession?.validation?.result ?? null;
  const currentEventScriptPublication = eventScriptEditorSession?.publication ?? null;
  const currentEventScriptSourceBytes = new TextEncoder()
    .encode(eventScriptEditorSource).byteLength;

  const updateVariable = (index: number, entry: AuroraVariableTargetEntry) => {
    setVariables((current) => ({
      ...current,
      value: current.value.map((candidate, candidateIndex) =>
        candidateIndex === index ? entry : candidate),
    }));
  };
  const moveVariable = (index: number, direction: "up" | "down") => {
    setVariables((current) => {
      const destination = direction === "up" ? index - 1 : index + 1;
      if (destination < 0 || destination >= current.value.length) return current;
      const value = [...current.value];
      [value[index], value[destination]] = [value[destination]!, value[index]!];
      return { ...current, value };
    });
  };

  const applyLightingSchemeRow = (rowIndex: number) => {
    const catalogs = draft.visualEnvironmentCatalogs;
    const row = catalogs?.lightingSchemes.rows.find(
      (candidate) => candidate.rowIndex === rowIndex,
    );
    if (!catalogs || !row) return;
    const derivedSkyBoxRowIndex = catalogs.skyBoxes.rows.some(
      (candidate) => candidate.rowIndex === row.skyBoxRowIndex,
    )
      ? row.skyBoxRowIndex
      : visualEnvironmentCatalogSelection.value.skyBoxRowIndex;
    setVisualEnvironmentCatalogSelection((current) => ({
      ...current,
      value: {
        lightingSchemeRowIndex: row.rowIndex,
        skyBoxRowIndex: derivedSkyBoxRowIndex,
      },
    }));
    setVisualEnvironment((current) => ({
      ...current,
      value: {
        ...row.visualEnvironment,
        sun: { ...row.visualEnvironment.sun },
        moon: { ...row.visualEnvironment.moon },
      },
    }));
    setVisualEnvironmentScalarControls((current) => ({
      ...current,
      value: { ...row.visualEnvironmentScalarControls },
    }));
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Area Properties">
      <h3>Area Properties</h3>
      <div role="tablist" aria-label="Area property categories">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            aria-controls={`area-properties-${tab.toLowerCase()}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>
      <section
        id={`area-properties-${activeTab.toLowerCase()}`}
        role="tabpanel"
        aria-label={`${activeTab} Area properties`}
      >
        {activeTab === "Basic" ? (
          <>
            <label>
              Area Name
              <input
                aria-label="Area Name"
                value={basicIdentity.name.value}
                maxLength={256}
                disabled={basicIdentity.name.state !== "editable"}
                onChange={(event) => setBasicIdentity((current) => ({
                  ...current,
                  name: {
                    ...current.name,
                    value: event.target.value,
                    ...(current.name.entries
                      ? {
                          entries: current.name.entries.map((entry) =>
                            entry.languageId === 0
                              ? { ...entry, text: event.target.value }
                              : entry),
                        }
                      : {}),
                  },
                }))}
              />
            </label>
            {basicIdentity.name.state !== "editable" ? (
              <p role="note">
                The retained ARE Name is not admitted inline printable-ASCII storage;
                talk-table and non-ASCII layouts remain preserve-only.
              </p>
            ) : !isEditableAreaName(basicIdentity.name.value) ? (
              <p role="alert">
                Area Name must be 1-256 printable ASCII characters and not whitespace-only.
              </p>
            ) : basicIdentity.name.entries ? (
              <>
                <p role="note" aria-label="Area Name localization profile">
                  Existing numeric language/gender identifiers are source-bound;
                  their printable-ASCII text may be edited, reordered, and alternate entries removed.
                  Missing verified English, French, German, Italian, Spanish, and Polish
                  entries may be added or reinserted. TLK, non-ASCII, and four unresolved
                  native grid rows remain unavailable.
                </p>
                <fieldset aria-label="Area Name existing localized entries">
                  <legend>Existing localized Name entries</legend>
                  {basicIdentity.name.entries
                    ?.filter((entry) => entry.languageId !== 0)
                    .map((entry) => {
                      const storageIndex = basicIdentity.name.entries?.findIndex(
                        (candidate) => candidate.languageId === entry.languageId,
                      ) ?? -1;
                      const lastStorageIndex = (basicIdentity.name.entries?.length ?? 0) - 1;
                      return (
                        <label key={entry.languageId}>
                          {AREA_NAME_LANGUAGE_CATALOG.find(
                            (catalogEntry) =>
                              catalogEntry.storageEntryIdentifier === entry.languageId,
                          )?.displayName ?? "Unresolved source identifier"}
                          {` — Entry ${entry.languageId}`}
                          <input
                            aria-label={`Area Name entry ${entry.languageId}`}
                            value={entry.text}
                            maxLength={MAX_EDITABLE_AREA_NAME_ENTRY_ASCII_BYTES}
                            onChange={(event) => setBasicIdentity((current) => ({
                              ...current,
                              name: {
                                ...current.name,
                                entries: current.name.entries?.map((candidate) =>
                                  candidate.languageId === entry.languageId
                                    ? { ...candidate, text: event.target.value }
                                    : candidate),
                              },
                            }))}
                          />
                          <button
                            type="button"
                            aria-label={`Move Area Name entry ${entry.languageId} up`}
                            disabled={storageIndex <= 0}
                            onClick={() => setBasicIdentity((current) => ({
                              ...current,
                              name: {
                                ...current.name,
                                entries: moveExistingAreaNameEntry(
                                  current.name.entries,
                                  entry.languageId,
                                  -1,
                                ),
                              },
                            }))}
                          >
                            Move up
                          </button>
                          <button
                            type="button"
                            aria-label={`Move Area Name entry ${entry.languageId} down`}
                            disabled={storageIndex < 0 || storageIndex >= lastStorageIndex}
                            onClick={() => setBasicIdentity((current) => ({
                              ...current,
                              name: {
                                ...current.name,
                                entries: moveExistingAreaNameEntry(
                                  current.name.entries,
                                  entry.languageId,
                                  1,
                                ),
                              },
                            }))}
                          >
                            Move down
                          </button>
                          <button
                            type="button"
                            aria-label={`Remove Area Name entry ${entry.languageId}`}
                            onClick={() => setBasicIdentity((current) => {
                              const entries = current.name.entries?.filter(
                                (candidate) => candidate.languageId !== entry.languageId,
                              );
                              return {
                                ...current,
                                name: {
                                  ...current.name,
                                  ...(entries
                                    ? {
                                        entries,
                                        profile: areaNameStorageProfileForEntries(entries),
                                      }
                                    : {}),
                                },
                              };
                            })}
                          >
                            Remove
                          </button>
                        </label>
                      );
                    })}
                </fieldset>
                <fieldset aria-label="Add Area Name localized entry">
                  <legend>Add or reinsert a verified localized Name entry</legend>
                  <label>
                    Area Name entry to add
                    <select
                      aria-label="Area Name entry to add"
                      value={newAreaNameEntryIdentifier}
                      disabled={missingAreaNameCatalogEntries.length === 0}
                      onChange={(event) => setNewAreaNameEntryIdentifier(event.target.value)}
                    >
                      {missingAreaNameCatalogEntries.length === 0 ? (
                        <option value="">No verified entries available</option>
                      ) : missingAreaNameCatalogEntries.map((entry) => (
                        <option
                          key={entry.storageEntryIdentifier}
                          value={entry.storageEntryIdentifier}
                        >
                          {`${entry.displayName} — Entry ${entry.storageEntryIdentifier}`}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    New Area Name entry text
                    <input
                      aria-label="New Area Name entry text"
                      value={newAreaNameEntryText}
                      maxLength={MAX_EDITABLE_AREA_NAME_ENTRY_ASCII_BYTES}
                      onChange={(event) => setNewAreaNameEntryText(event.target.value)}
                    />
                  </label>
                  {newAreaNameEntryText.length > 0 && !newAreaNameEntryTextValid ? (
                    <p role="alert">
                      New Area Name entry text must be nonempty printable ASCII.
                    </p>
                  ) : null}
                  <button
                    type="button"
                    aria-label="Add Area Name entry"
                    disabled={!selectedAreaNameCatalogEntry || !newAreaNameEntryTextValid}
                    onClick={() => {
                      if (!selectedAreaNameCatalogEntry || !newAreaNameEntryTextValid) return;
                      const languageId = selectedAreaNameCatalogEntry.storageEntryIdentifier;
                      const entries = basicIdentity.name.entries;
                      if (!entries || entries.some((entry) => entry.languageId === languageId)) return;
                      const nextEntries = [
                        ...entries.map((entry) => ({ ...entry })),
                        { languageId, text: newAreaNameEntryText },
                      ];
                      setBasicIdentity((current) => ({
                        ...current,
                        name: {
                          ...current.name,
                          entries: nextEntries,
                          profile: areaNameStorageProfileForEntries(nextEntries),
                        },
                      }));
                      setNewAreaNameEntryText("");
                      setNewAreaNameEntryIdentifier(String(
                        missingAreaNameCatalogEntries.find(
                          (entry) => entry.storageEntryIdentifier !== languageId,
                        )?.storageEntryIdentifier ?? "",
                      ));
                    }}
                  >
                    Add
                  </button>
                </fieldset>
              </>
            ) : null}
            <label>
              Area Tag
              <input
                aria-label="Area Tag"
                value={basicIdentity.tag.value}
                maxLength={64}
                disabled={basicIdentity.tag.state !== "editable"}
                onChange={(event) => setBasicIdentity((current) => ({
                  ...current,
                  tag: { ...current.tag, value: event.target.value },
                }))}
              />
            </label>
            {basicIdentity.tag.state !== "editable" ? (
              <p role="note">
                The retained ARE does not contain one exact editable Tag : CExoString field.
              </p>
            ) : !isEditableAreaTag(basicIdentity.tag.value) ? (
              <p role="alert">
                Area Tag must contain at most 64 printable ASCII characters.
              </p>
            ) : null}
          </>
        ) : activeTab === "Comments" ? (
          <>
            <label>
              Area Comments
              <textarea
                aria-label="Area Comments"
                value={comments}
                maxLength={draft.maxCommentsCodeUnits}
                disabled={!editable}
                onChange={(event) => setComments(event.target.value)}
              />
            </label>
            <p role="status">
              {comments.length}/{draft.maxCommentsCodeUnits} code units
            </p>
            {!editable ? (
              <p role="note">
                The retained ARE does not contain one exact Comments : CExoString field;
                this property is preserve-only and will not be materialized.
              </p>
            ) : !valid ? (
              <p role="alert">
                Area Comments must contain at most 4096 code units and must not contain U+0000.
              </p>
            ) : null}
          </>
        ) : activeTab === "Events" ? (
          <>
            {eventScriptCatalogFacade && eventScriptCatalogAccessToken ? (
              <div role="group" aria-label="Area event-script catalog query">
                <label>
                  Script catalog search
                  <input
                    aria-label="Area event-script catalog search"
                    value={eventScriptCatalogSearch}
                    maxLength={16}
                    pattern="[a-z0-9_]{0,16}"
                    onChange={(event) => setEventScriptCatalogSearch(event.target.value)}
                  />
                </label>
                <button
                  type="button"
                  disabled={
                    eventScriptCatalogState.status === "loading"
                    || !/^[a-z0-9_]{0,16}$/u.test(eventScriptCatalogSearch)
                  }
                  onClick={() => void loadEventScriptCatalog(eventScriptCatalogSearch)}
                >
                  Search module scripts
                </button>
              </div>
            ) : (
              <p role="note">
                The committed-module script catalog is unavailable; exact manual ResRef editing remains available.
              </p>
            )}
            {eventScriptCatalogState.status === "loading" ? (
              <p role="status">Loading committed-module NSS/NCS presence…</p>
            ) : eventScriptCatalogState.status === "error" ? (
              <p role="alert" aria-label="Area event-script catalog unavailable">
                {eventScriptCatalogState.message} Manual ResRef editing remains available.
              </p>
            ) : eventScriptCatalogState.status === "ready" ? (
              <p role="note" aria-label="Area event-script catalog status">
                Committed module only: {eventScriptCatalogState.value.total} matching ResRefs.
                NSS + NCS means both artifacts are present; freshness is unverified and no compilation is claimed.
              </p>
            ) : null}
            {AREA_EVENT_SCRIPT_FIELDS.map(({ slot, label, field }) => {
              const state = eventScripts[slot];
              const fieldEditable = state.state === "editable";
              const fieldValid = !fieldEditable || isAreaEventScriptResRef(state.value);
              const catalogItems = eventScriptCatalogState.status === "ready"
                ? eventScriptCatalogState.value.items.filter(isNssBackedCatalogItem)
                : [];
              const retainedOutsidePage = Boolean(
                state.value && !catalogItems.some((item) => item.resRef === state.value),
              );
              return (
                <div key={slot}>
                  <label>
                    {label}
                    <input
                      aria-label={`Area ${label} script`}
                      value={state.value}
                      maxLength={16}
                      disabled={!fieldEditable}
                      onChange={(event) => setEventScripts((current) => ({
                        ...current,
                        [slot]: { ...current[slot], value: event.target.value },
                      }))}
                    />
                  </label>
                  {fieldEditable && eventScriptCatalogState.status === "ready" ? (
                    <label>
                      {label} catalog selection
                      <select
                        aria-label={`Area ${label} catalog selection`}
                        value={state.value}
                        onChange={(event) => setEventScripts((current) => ({
                          ...current,
                          [slot]: { ...current[slot], value: event.target.value },
                        }))}
                      >
                        <option value="">Unbind event</option>
                        {retainedOutsidePage ? (
                          <option value={state.value}>Retained/external: {state.value}</option>
                        ) : null}
                        {catalogItems.map((item) => (
                          <option key={item.resRef} value={item.resRef}>
                            {formatEventScriptCatalogOption(item)}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  {!fieldEditable ? (
                    <p role="note">
                      The retained ARE does not contain one exact {field} : ResRef field;
                      this event is preserve-only.
                    </p>
                  ) : !fieldValid ? (
                    <p role="alert">
                      Script ResRef must be empty or 1-16 lowercase ASCII letters, digits, or underscores.
                    </p>
                  ) : null}
                </div>
              );
            })}
            {eventScriptPublicationFacade
            && eventScriptCatalogAccessToken
            && eventScriptCatalog ? (
              <fieldset aria-label="Area script source editor">
                <legend>NWScript source editor</legend>
                <label>
                  Target ResRef
                  <input
                    aria-label="Area script editor target"
                    value={eventScriptEditorTarget}
                    maxLength={16}
                    pattern="[a-z0-9_]{1,16}"
                    onChange={(event) => resetEventScriptEditorTarget(event.target.value)}
                  />
                </label>
                <p role="note">
                  Committed module revision: {eventScriptEditorRevision
                    || eventScriptCatalog.moduleRevision}
                </p>
                <div role="group" aria-label="Area script source actions">
                  <button
                    type="button"
                    disabled={
                      eventScriptEditorOperation !== "idle"
                      || eventScriptEditorTarget.length === 0
                      || !isAreaEventScriptResRef(eventScriptEditorTarget)
                    }
                    onClick={() => void loadEventScriptSource()}
                  >
                    Load committed source
                  </button>
                  {eventScriptSourceMissing ? (
                    <button
                      type="button"
                      disabled={
                        eventScriptEditorOperation !== "idle"
                        || eventScriptEditorTarget.length === 0
                        || !isAreaEventScriptResRef(eventScriptEditorTarget)
                      }
                      onClick={startNewEventScript}
                    >
                      Start new script
                    </button>
                  ) : null}
                </div>
                {eventScriptEditorOperation === "loading_source" ? (
                  <p role="status">Loading exact committed NSS source…</p>
                ) : null}
                {eventScriptEditorError ? (
                  <p role="alert" aria-label="Area script source status">
                    {eventScriptEditorError.message} ({eventScriptEditorError.code})
                  </p>
                ) : null}
                {eventScriptEditorOpen ? (
                  <>
                    <label>
                      NSS source
                      <textarea
                        aria-label="Area script source"
                        value={eventScriptEditorSource}
                        maxLength={AREA_EVENT_SCRIPT_SOURCE_MAX_BYTES}
                        spellCheck={false}
                        onChange={(event) => {
                          const sourceText = event.target.value;
                          setEventScriptEditorSource(sourceText);
                          setEventScriptEditorError(null);
                          setEventScriptEditorSession(rebuildEventScriptEditorSession(
                            sourceText,
                            eventScriptEditorIncludes,
                          ));
                        }}
                      />
                    </label>
                    <p role="status">
                      {currentEventScriptSourceBytes}/{AREA_EVENT_SCRIPT_SOURCE_MAX_BYTES} UTF-8 bytes
                    </p>
                    <label>
                      Include ResRefs
                      <input
                        aria-label="Area script include ResRefs"
                        value={eventScriptEditorIncludes}
                        onChange={(event) => {
                          const includeText = event.target.value;
                          setEventScriptEditorIncludes(includeText);
                          setEventScriptEditorError(null);
                          setEventScriptEditorSession(rebuildEventScriptEditorSession(
                            eventScriptEditorSource,
                            includeText,
                          ));
                        }}
                      />
                    </label>
                    <p role="note">
                      Enter the complete committed include set separated by spaces or commas.
                      Include source bytes never leave the server.
                    </p>
                    {!eventScriptEditorSession ? (
                      <p role="alert">
                        The editor command is invalid or exceeds its source/include budget.
                      </p>
                    ) : null}
                    <div role="group" aria-label="Area script compiler actions">
                      <button
                        type="button"
                        disabled={
                          eventScriptEditorOperation !== "idle"
                          || !eventScriptEditorSession
                        }
                        onClick={() => void validateEventScriptSource()}
                      >
                        Validate script source
                      </button>
                      <button
                        type="button"
                        disabled={
                          eventScriptEditorOperation !== "idle"
                          || !eventScriptEditorSession
                          || !canPublishAreaEventScriptEditorSession(
                            eventScriptEditorSession,
                          )
                        }
                        onClick={() => void publishEventScriptSource()}
                      >
                        Publish script
                      </button>
                    </div>
                    {eventScriptEditorOperation === "validating" ? (
                      <p role="status">Validating source without module mutation…</p>
                    ) : eventScriptEditorOperation === "publishing" ? (
                      <p role="status">Publishing atomic NSS/NCS/NDB successor…</p>
                    ) : null}
                    {currentEventScriptValidation ? (
                      <div aria-label="Area script validation diagnostics">
                        <p role="status" aria-label="Area script validation status">
                          {currentEventScriptValidation.status === "compiled"
                            ? "Compiled — validation only; module unchanged."
                            : "Rejected — module unchanged."}
                        </p>
                        <p role="note">
                          Compiler: {currentEventScriptValidation.provider.versionMarker}; receipt
                          {" "}{currentEventScriptValidation.compilerReceiptSha256}
                        </p>
                        {currentEventScriptValidation.status === "compiled" ? (
                          <p role="note">
                            NCS: {currentEventScriptValidation.artifacts.ncs.size} bytes,
                            SHA-256 {currentEventScriptValidation.artifacts.ncs.sha256}; NDB:
                            {" "}{currentEventScriptValidation.artifacts.ndb.size} bytes,
                            SHA-256 {currentEventScriptValidation.artifacts.ndb.sha256}.
                          </p>
                        ) : null}
                        {currentEventScriptValidation.diagnostics.length > 0 ? (
                          <ul aria-label="Area script compiler diagnostics">
                            {currentEventScriptValidation.diagnostics.map((diagnostic, index) => (
                              <li key={`${diagnostic.code}:${diagnostic.line ?? 0}:${diagnostic.column ?? 0}:${index}`}>
                                {diagnostic.severity.toUpperCase()} {diagnostic.code}
                                {diagnostic.line ? ` at ${diagnostic.line}:${diagnostic.column ?? 1}` : ""}
                                {`: ${diagnostic.message}`}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ) : null}
                    {currentEventScriptPublication ? (
                      <p role="status" aria-label="Area script publication status">
                        {currentEventScriptPublication.idempotency === "replayed"
                          ? "Replayed verified publication"
                          : "Published"}
                        {" revision "}
                        {currentEventScriptPublication.receipt.newModuleRevision}; atomic
                        NSS/NCS/NDB readback verified.
                      </p>
                    ) : null}
                  </>
                ) : null}
              </fieldset>
            ) : (
              <p role="note">
                NWScript source editing requires the authenticated publication facade and one
                revision-bound committed-module catalog.
              </p>
            )}
          </>
        ) : activeTab === "Visual" ? (
          <>
            <fieldset disabled={visualEnvironment.state !== "editable"}>
              <legend>Area Visual Environment</legend>
              <label>
                Day/Night Mode
                <select
                  aria-label="Area day/night mode"
                  value={visualEnvironment.value.dayNightMode}
                  onChange={(event) => setVisualEnvironment((current) => ({
                    ...current,
                    value: {
                      ...current.value,
                      dayNightMode: event.target.value as AreaDayNightMode,
                    },
                  }))}
                >
                  <option value="cycle">Cycle</option>
                  <option value="always_day">Always Day</option>
                  <option value="always_night">Always Night</option>
                </select>
              </label>
              {VISUAL_PERCENT_FIELDS.map(([field, label]) => (
                <label key={field}>
                  {label.replace(/^./u, (value) => value.toUpperCase())} (%)
                  <input
                    aria-label={`Area ${label}`}
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={visualEnvironment.value[field]}
                    onChange={(event) => setVisualEnvironment((current) => ({
                      ...current,
                      value: {
                        ...current.value,
                        [field]: Number(event.target.value),
                      },
                    }))}
                  />
                </label>
              ))}
              {(["sun", "moon"] as const).map((phase) => (
                <fieldset key={phase}>
                  <legend>{phase === "sun" ? "Sun" : "Moon"}</legend>
                  {VISUAL_COLOR_FIELDS.map(([field, label]) => (
                    <label key={field}>
                      {label.replace(/^./u, (value) => value.toUpperCase())}
                      <input
                        aria-label={`Area ${phase === "sun" ? "Sun" : "Moon"} ${label}`}
                        type="color"
                        value={packedColorToCss(visualEnvironment.value[phase][field])}
                        onChange={(event) => setVisualEnvironment((current) => ({
                          ...current,
                          value: {
                            ...current.value,
                            [phase]: {
                              ...current.value[phase],
                              [field]: cssColorToPacked(event.target.value),
                            },
                          },
                        }))}
                      />
                    </label>
                  ))}
                  <label>
                    Fog Amount
                    <input
                      aria-label={`Area ${phase === "sun" ? "Sun" : "Moon"} fog amount`}
                      type="number"
                      min={0}
                      max={15}
                      step={1}
                      value={visualEnvironment.value[phase].fogAmount}
                      onChange={(event) => setVisualEnvironment((current) => ({
                        ...current,
                        value: {
                          ...current.value,
                          [phase]: {
                            ...current.value[phase],
                            fogAmount: Number(event.target.value),
                          },
                        },
                      }))}
                    />
                  </label>
                  <label>
                    <input
                      aria-label={`Area ${phase === "sun" ? "Sun" : "Moon"} shadows`}
                      type="checkbox"
                      checked={visualEnvironment.value[phase].shadows}
                      onChange={(event) => setVisualEnvironment((current) => ({
                        ...current,
                        value: {
                          ...current.value,
                          [phase]: {
                            ...current.value[phase],
                            shadows: event.target.checked,
                          },
                        },
                      }))}
                    />
                    Shadows
                  </label>
                </fieldset>
              ))}
            </fieldset>
            {visualEnvironment.state !== "editable" ? (
              <p role="note">
                The retained ARE does not contain one complete exact visual-environment
                tuple; Visual remains preserve-only.
              </p>
            ) : !visualEnvironmentValid ? (
              <p role="alert">
                Visual environment requires a proven day/night mode, integer percentages
                from 0 through 100, RGB colors, fog amounts from 0 through 15, and boolean shadows.
              </p>
            ) : (
              <p role="note">
                Applying these fields updates the retained ARE tuple and the active renderer
                incrementally without reloading the Area.
              </p>
            )}
            <fieldset
              disabled={visualEnvironmentCatalogSelection.state !== "editable"
                || !draft.visualEnvironmentCatalogs}
            >
              <legend>Catalog-backed Visual Fields</legend>
              <label>
                Lighting Scheme
                <select
                  aria-label="Area Lighting Scheme"
                  value={visualEnvironmentCatalogSelection.value.lightingSchemeRowIndex}
                  onChange={(event) => applyLightingSchemeRow(Number(event.target.value))}
                >
                  {(draft.visualEnvironmentCatalogs?.lightingSchemes.rows ?? []).map((row) => (
                    <option key={row.rowIndex} value={row.rowIndex}>
                      {row.displayName} ({row.rowIndex})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Sky Box
                <select
                  aria-label="Area Sky Box"
                  value={visualEnvironmentCatalogSelection.value.skyBoxRowIndex}
                  onChange={(event) => setVisualEnvironmentCatalogSelection((current) => ({
                    ...current,
                    value: {
                      ...current.value,
                      skyBoxRowIndex: Number(event.target.value),
                    },
                  }))}
                >
                  {(draft.visualEnvironmentCatalogs?.skyBoxes.rows ?? []).map((row) => (
                    <option key={row.rowIndex} value={row.rowIndex}>
                      {row.displayName} ({row.rowIndex})
                    </option>
                  ))}
                </select>
              </label>
            </fieldset>
            {visualEnvironmentCatalogSelection.state !== "editable"
                || !draft.visualEnvironmentCatalogs ? (
              <p role="note">
                Lighting Scheme and Sky Box remain preserve-only because complete effective
                environment.2da and skyboxes.2da provenance is unavailable.
              </p>
            ) : !visualEnvironmentCatalogSelectionValid ? (
              <p role="alert">
                Lighting Scheme and Sky Box must reference rows present in the effective catalogs.
              </p>
            ) : (
              <p role="note">
                Selecting a Lighting Scheme applies its complete native visual and scalar row;
                Sky Box may then be selected independently.
              </p>
            )}
            <fieldset disabled={visualEnvironmentScalarControls.state !== "editable"}>
              <legend>Source-closed Scalar Controls</legend>
              <label>
                Wind Power
                <input
                  aria-label="Area Wind Power"
                  type="number"
                  min={AREA_WIND_POWER_MINIMUM}
                  max={AREA_WIND_POWER_MAXIMUM}
                  step={1}
                  value={visualEnvironmentScalarControls.value.windPower}
                  onChange={(event) => setVisualEnvironmentScalarControls((current) => ({
                    ...current,
                    value: { ...current.value, windPower: Number(event.target.value) },
                  }))}
                />
              </label>
              <label>
                Fog Clip Distance
                <input
                  aria-label="Area Fog Clip Distance"
                  type="number"
                  min={AREA_FOG_CLIP_DISTANCE_MINIMUM}
                  max={AREA_FOG_CLIP_DISTANCE_MAXIMUM}
                  step={1}
                  value={visualEnvironmentScalarControls.value.fogClipDistance}
                  onChange={(event) => setVisualEnvironmentScalarControls((current) => ({
                    ...current,
                    value: { ...current.value, fogClipDistance: Number(event.target.value) },
                  }))}
                />
              </label>
            </fieldset>
            {visualEnvironmentScalarControls.state !== "editable" ? (
              <p role="note">
                The retained ARE does not contain one exact FogClipDist/WindPower pair;
                these scalar controls remain preserve-only.
              </p>
            ) : !visualEnvironmentScalarControlsValid ? (
              <p role="alert">
                Fog Clip Distance must be an integer from 30 through 9999 and Wind Power
                an integer from 0 through 2.
              </p>
            ) : (
              <p role="note">
                Applying these scalar controls updates the retained ARE and active renderer
                incrementally; manual values after a Lighting Scheme selection are saved as
                complete native-reachable overrides.
              </p>
            )}
          </>
        ) : activeTab === "Audio" ? (
          <>
            <fieldset disabled={audioEnvironment.state !== "editable"}>
              <legend>Area Audio Environment</legend>
              {AUDIO_CATALOG_ID_FIELDS.map(([field, label]) => {
                const rows = audioEnvironment.catalogs
                  ? resolveEffectiveAreaAudioRows(audioEnvironment.catalogs, field)
                  : undefined;
                const currentValue = audioEnvironment.value[field];
                const currentResolved = rows?.some((row) => row.rowIndex === currentValue) ?? false;
                return (
                  <label key={field}>
                    {label}
                    {rows ? (
                      <select
                        aria-label={`Area ${label}`}
                        value={currentValue}
                        onChange={(event) => setAudioEnvironment((current) => ({
                          ...current,
                          value: { ...current.value, [field]: Number(event.target.value) },
                        }))}
                      >
                        {!currentResolved ? (
                          <option value={currentValue}>Unresolved row {currentValue}</option>
                        ) : null}
                        {rows.map((row) => (
                          <option key={row.rowIndex} value={row.rowIndex}>
                            {row.displayName} (row {row.rowIndex})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        aria-label={`Area ${label}`}
                        type="number"
                        min={0}
                        max={0x7fff_ffff}
                        step={1}
                        value={currentValue}
                        onChange={(event) => setAudioEnvironment((current) => ({
                          ...current,
                          value: { ...current.value, [field]: Number(event.target.value) },
                        }))}
                      />
                    )}
                  </label>
                );
              })}
              {AUDIO_VOLUME_FIELDS.map(([field, label]) => (
                <label key={field}>
                  {label}
                  <input
                    aria-label={`Area ${label}`}
                    type="number"
                    min={0}
                    max={127}
                    step={1}
                    value={audioEnvironment.value[field]}
                    onChange={(event) => setAudioEnvironment((current) => ({
                      ...current,
                      value: { ...current.value, [field]: Number(event.target.value) },
                    }))}
                  />
                </label>
              ))}
              <label>
                Music, Playing Delay (s)
                <input
                  aria-label="Area Music, Playing Delay (s)"
                  type="number"
                  min={-99}
                  max={99}
                  step={1}
                  value={audioEnvironment.value.musicDelayMilliseconds / 1000}
                  onChange={(event) => setAudioEnvironment((current) => ({
                    ...current,
                    value: {
                      ...current.value,
                      musicDelayMilliseconds: Number(event.target.value) * 1000,
                    },
                  }))}
                />
              </label>
            </fieldset>
            {audioEnvironment.state !== "editable" ? (
              <p role="note">
                The retained GIT does not contain one complete exact type-100
                AreaProperties audio tuple; Audio remains preserve-only.
              </p>
            ) : !audioEnvironmentValid ? (
              <p role="alert">
                Audio IDs must be non-negative integers, volumes must be 0-127,
                and playing delay must be a whole number from -99 through 99 seconds.
              </p>
            ) : (
              <p role="note">
                {audioEnvironment.catalogs
                  ? "Effective 2DA display labels are bound; numeric Aurora row IDs remain storage truth."
                  : "Numeric Aurora row IDs are preserved exactly. Display-name resolution is unavailable until effective audio 2DA catalogs are bound."}
              </p>
            )}
          </>
        ) : activeTab === "Advanced" ? (
          <>
            <fieldset disabled={advancedFlags.terrainType.state !== "editable"}>
              <legend>Terrain Type</legend>
              <label>
                Interior or Exterior
                <select
                  aria-label="Area terrain interior"
                  value={advancedFlags.terrainType.value.interior ? "interior" : "exterior"}
                  onChange={(event) => setAdvancedFlags((current) => ({
                    ...current,
                    terrainType: {
                      ...current.terrainType,
                      value: {
                        ...current.terrainType.value,
                        interior: event.target.value === "interior",
                      } satisfies AreaTerrainTypeFlags,
                    },
                  }))}
                >
                  <option value="exterior">Exterior</option>
                  <option value="interior">Interior</option>
                </select>
              </label>
              <label>
                Natural or Artificial
                <select
                  aria-label="Area terrain natural"
                  value={advancedFlags.terrainType.value.natural ? "natural" : "artificial"}
                  onChange={(event) => setAdvancedFlags((current) => ({
                    ...current,
                    terrainType: {
                      ...current.terrainType,
                      value: {
                        ...current.terrainType.value,
                        natural: event.target.value === "natural",
                      } satisfies AreaTerrainTypeFlags,
                    },
                  }))}
                >
                  <option value="natural">Natural</option>
                  <option value="artificial">Artificial</option>
                </select>
              </label>
              <label>
                Underground or Above ground
                <select
                  aria-label="Area terrain underground"
                  value={advancedFlags.terrainType.value.subterranean ? "underground" : "above_ground"}
                  onChange={(event) => setAdvancedFlags((current) => ({
                    ...current,
                    terrainType: {
                      ...current.terrainType,
                      value: {
                        ...current.terrainType.value,
                        subterranean: event.target.value === "underground",
                      } satisfies AreaTerrainTypeFlags,
                    },
                  }))}
                >
                  <option value="above_ground">Above ground</option>
                  <option value="underground">Underground</option>
                </select>
              </label>
            </fieldset>
            {advancedFlags.terrainType.state !== "editable" ? (
              <p role="note">Terrain Type is preserve-only for this retained ARE.</p>
            ) : null}
            <label>
              Player versus Player
              <select
                aria-label="Area Player versus Player"
                disabled={advancedFlags.playerVsPlayer.state !== "editable"}
                value={String(advancedFlags.playerVsPlayer.value)}
                onChange={(event) => setAdvancedFlags((current) => ({
                  ...current,
                  playerVsPlayer: {
                    ...current.playerVsPlayer,
                    value: Number(event.target.value) as AreaPlayerVsPlayerMode,
                  },
                }))}
              >
                <option value="0">None</option>
                <option value="1">Party</option>
                <option value="2">Full</option>
                <option value="3">Default</option>
              </select>
            </label>
            {advancedFlags.playerVsPlayer.state !== "editable" ? (
              <p role="note">Player versus Player is preserve-only for this retained ARE.</p>
            ) : null}
            <label>
              <input
                aria-label="Area No Rest"
                type="checkbox"
                disabled={advancedFlags.noRest.state !== "editable"}
                checked={advancedFlags.noRest.value}
                onChange={(event) => setAdvancedFlags((current) => ({
                  ...current,
                  noRest: { ...current.noRest, value: event.target.checked },
                }))}
              />
              No Rest
            </label>
            {advancedFlags.noRest.state !== "editable" ? (
              <p role="note">No Rest is preserve-only for this retained ARE.</p>
            ) : null}
            {([
              ["listenCheckModifier", "Listen"],
              ["spotCheckModifier", "Spot"],
            ] as const).map(([field, label]) => {
              const state = advancedFlags[field];
              const fieldValid = state.state === "preserve_only"
                || isAreaCheckModifier(state.value);
              return (
                <div key={field}>
                  <label>
                    {label} check modifier
                    <input
                      aria-label={`Area ${label} check modifier`}
                      type="number"
                      min={-99}
                      max={99}
                      step={1}
                      disabled={state.state !== "editable"}
                      value={state.value}
                      onChange={(event) => setAdvancedFlags((current) => ({
                        ...current,
                        [field]: { ...current[field], value: Number(event.target.value) },
                      }))}
                    />
                  </label>
                  {state.state !== "editable" ? (
                    <p role="note">
                      {label} check modifier is preserve-only for this retained ARE.
                    </p>
                  ) : !fieldValid ? (
                    <p role="alert">
                      {label} check modifier must be an integer from -99 through 99.
                    </p>
                  ) : null}
                </div>
              );
            })}
            <div>
              <label>
                Loading screen ID
                {loadingScreenOptions ? (
                  <select
                    aria-label="Area loading screen ID"
                    disabled={advancedFlags.loadingScreenId.state !== "editable"}
                    value={advancedFlags.loadingScreenId.value}
                    onChange={(event) => setAdvancedFlags((current) => ({
                      ...current,
                      loadingScreenId: {
                        ...current.loadingScreenId,
                        value: Number(event.target.value),
                      },
                    }))}
                  >
                    {loadingScreenOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.value} — {option.displayName}
                        {option.state === "retained" ? " (retained; image unavailable)" : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    aria-label="Area loading screen ID"
                    type="number"
                    min={0}
                    max={0xffff}
                    step={1}
                    disabled={advancedFlags.loadingScreenId.state !== "editable"}
                    value={advancedFlags.loadingScreenId.value}
                    onChange={(event) => setAdvancedFlags((current) => ({
                      ...current,
                      loadingScreenId: {
                        ...current.loadingScreenId,
                        value: Number(event.target.value),
                      },
                    }))}
                  />
                )}
              </label>
              {advancedFlags.loadingScreenId.state !== "editable" ? (
                <p role="note">Loading screen ID is preserve-only for this retained ARE.</p>
              ) : !isAreaLoadingScreenId(advancedFlags.loadingScreenId.value) ? (
                <p role="alert">Loading screen ID must be an integer from 0 through 65535.</p>
              ) : !loadingScreenOptions ? (
                <p role="note">
                  The exact native Word row is editable; loadscreens.2da label resolution is unavailable.
                </p>
              ) : (
                <>
                  <p role="note">
                    loadscreens.2da from {draft.loadingScreenCatalog?.descriptor.sourceObjectKey}
                    {" "}({draft.loadingScreenCatalog?.descriptor.sourceLayer}, SHA-256
                    {" "}{draft.loadingScreenCatalog?.descriptor.sha256}).
                  </p>
                  {selectedLoadingScreenOption?.row?.imageAsset ? (
                    <p role="note">
                      Selected row {advancedFlags.loadingScreenId.value}: image
                      {" "}{selectedLoadingScreenOption.row.imageAsset.resourceName} from
                      {" "}{selectedLoadingScreenOption.row.imageAsset.sourceObjectKey}.
                    </p>
                  ) : (
                    <p role="note">
                      Selected row {advancedFlags.loadingScreenId.value}: image asset is unavailable;
                      the current Word remains retained without inventing a fallback.
                    </p>
                  )}
                </>
              )}
            </div>
            <fieldset disabled={moduleStartLocation.state !== "editable"}>
              <legend>Module Start Location</legend>
              <label>
                Entry Area
                <select
                  aria-label="Module start Area"
                  value={moduleStartLocation.value.areaResRef}
                  onChange={(event) => setModuleStartLocation((current) => ({
                    ...current,
                    value: { ...current.value, areaResRef: event.target.value },
                  }))}
                >
                  {moduleStartLocation.sourceValue
                    && !startLocationTargets.includes(
                      moduleStartLocation.sourceValue.areaResRef,
                    ) ? (
                    <option value={moduleStartLocation.sourceValue.areaResRef}>
                      {moduleStartLocation.sourceValue.areaResRef} (retained)
                    </option>
                  ) : null}
                  {startLocationTargets.map((areaResRef) => (
                    <option key={areaResRef} value={areaResRef}>
                      {areaResRef}
                      {areaResRef === moduleStartLocation.currentAreaResRef
                        ? " (current Area)"
                        : ""}
                    </option>
                  ))}
                </select>
              </label>
              {([
                ["x", "X"],
                ["y", "Y"],
                ["z", "Z"],
                ["directionX", "Direction X"],
                ["directionY", "Direction Y"],
              ] as const).map(([field, label]) => (
                <label key={field}>
                  {label}
                  <input
                    aria-label={`Module start ${label}`}
                    type="number"
                    step="any"
                    value={moduleStartLocation.value[field]}
                    onChange={(event) => setModuleStartLocation((current) => ({
                      ...current,
                      value: { ...current.value, [field]: Number(event.target.value) },
                    }))}
                  />
                </label>
              ))}
            </fieldset>
            {moduleStartLocation.state !== "editable" ? (
              <p role="note">
                The retained module.ifo start tuple is unavailable or ambiguous;
                Start Location remains preserve-only.
              </p>
            ) : !startLocationValid ? (
              <p role="alert">
                Start Location requires five finite float32 values and any changed tuple
                must target one admitted module Area.
              </p>
            ) : (
              <p role="note">
                Storage readback is supported. Walkmesh accessibility and NWN spawn behavior
                remain pending native proof.
              </p>
            )}
            <AuroraVariableTableEditor
              entries={variables.value}
              editable={variables.state === "editable"}
              ariaLabelPrefix="Area variable"
              addButtonAriaLabel="Add Area variable"
              onAdd={() => setVariables((current) => current.value.length >= MAX_AURORA_VARIABLE_ENTRIES
                ? current
                : {
                    ...current,
                    value: [...current.value, { name: "", type: "int", value: 0 }],
                  })}
              onUpdate={updateVariable}
              onMove={moveVariable}
              onRemove={(index) => setVariables((current) => ({
                ...current,
                value: current.value.filter((_entry, candidateIndex) => candidateIndex !== index),
              }))}
            />
            {variables.state !== "editable" ? (
              <p role="note">
                The retained GIT does not have one exact editable Area VarTable profile;
                Variables remain preserve-only.
              </p>
            ) : !variablesValid ? (
              <p role="alert">
                Variables must use exact Int, Float, or String entries within the native budgets.
              </p>
            ) : (
              <p role="note">
                Entry order and duplicate names are preserved exactly; an empty list removes VarTable.
              </p>
            )}
            <p role="note">
              Other unverified Advanced fields remain preserve-only.
            </p>
          </>
        ) : (
          <p role="note">
            {activeTab} Area properties are visible but preserve-only in this implementation slice.
          </p>
        )}
      </section>
      <div role="group" aria-label="Area Properties actions">
        <button
          type="button"
          disabled={!valid || !hasEditableField}
          onClick={() => onCommit(nextDraft, false)}
        >
          Apply
        </button>
        <button
          type="button"
          disabled={!valid || !hasEditableField}
          onClick={() => onCommit(nextDraft, true)}
        >
          OK
        </button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function isNssBackedCatalogItem(
  item: AreaEventScriptCatalogItem,
): item is Extract<AreaEventScriptCatalogItem, { artifactStatus: "source_and_bytecode" | "source_only" }> {
  return item.artifactStatus !== "bytecode_only";
}

function parseAreaEventScriptIncludeResRefs(value: string): readonly string[] | null {
  const entries = value.trim().length === 0
    ? []
    : value.trim().split(/[\s,]+/u);
  if (
    entries.some((entry) => !/^[a-z0-9_]{1,16}$/u.test(entry) || entry === "nwscript")
    || new Set(entries).size !== entries.length
  ) return null;
  return entries;
}

function formatEventScriptCatalogOption(
  item: Extract<AreaEventScriptCatalogItem, {
    artifactStatus: "source_and_bytecode" | "source_only";
  }>,
): string {
  return item.artifactStatus === "source_and_bytecode"
    ? `${item.resRef} — NSS + NCS; freshness unverified`
    : `${item.resRef} — NSS only; NCS absent`;
}

function packedColorToCss(value: number): string {
  const packed = Math.trunc(value) >>> 0;
  const red = packed & 0xff;
  const green = (packed >>> 8) & 0xff;
  const blue = (packed >>> 16) & 0xff;
  return `#${[red, green, blue]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}

function cssColorToPacked(value: string): number {
  const css = Number.parseInt(value.slice(1), 16);
  const red = (css >>> 16) & 0xff;
  const green = (css >>> 8) & 0xff;
  const blue = css & 0xff;
  return red | (green << 8) | (blue << 16);
}
