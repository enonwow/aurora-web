import { useId } from "react";
import type { ReactNode } from "react";

export interface SharedLockSettings {
  locked: boolean;
  canRelock: boolean;
  autoRemoveKeyAfterUse: boolean;
  keyRequiredToUnlockOrLock: boolean;
  openLockDc: number;
  closeLockDc: number;
  keyTag: string;
}

export interface SharedTrapSettings {
  isTrapped: boolean;
  trapType: string;
  detectionDc: number;
  disarmDc: number;
  oneShot: boolean;
  detectable: boolean;
  disarmable: boolean;
  onDisarmScript: string;
  onTrapTriggeredScript: string;
  setDc: number;
  detectDcModWhenSetByRogue: number;
  disarmDcModWhenSetByRogue: number;
}

export type SharedLockFieldUpdater = <TField extends keyof SharedLockSettings>(
  field: TField,
  value: SharedLockSettings[TField]
) => void;

export type SharedTrapFieldUpdater = <TField extends keyof SharedTrapSettings>(
  field: TField,
  value: SharedTrapSettings[TField]
) => void;

export type SharedTrapScriptField = "onDisarmScript" | "onTrapTriggeredScript";

export interface SharedTrapScriptActionButton {
  label: string;
  onClick?: (field: SharedTrapScriptField) => void;
  disabled?: boolean;
  className?: string;
  title?: string;
  key?: string;
}

export interface SharedLockSectionClassNames {
  root?: string;
  toggle?: string;
  dualFields?: string;
  fieldRow?: string;
  fieldControl?: string;
  fieldControlNarrow?: string;
}

export interface SharedTrapSectionClassNames {
  root?: string;
  nested?: string;
  toggle?: string;
  toggleGrid?: string;
  dualFields?: string;
  fieldRow?: string;
  fieldControl?: string;
  fieldControlNarrow?: string;
  scriptRow?: string;
}

export interface SharedLockSectionProps {
  value: SharedLockSettings;
  onChange: SharedLockFieldUpdater;
  disabled?: boolean;
  legend?: ReactNode;
  classNames?: SharedLockSectionClassNames;
  behavior?: {
    disableLockDetailsWhenUnlocked?: boolean;
    disableAutoRemoveKeyUnlessLockedAndRelockable?: boolean;
  };
}

export interface SharedTrapSectionProps {
  value: SharedTrapSettings;
  onChange: SharedTrapFieldUpdater;
  trapTypeOptions: readonly string[];
  disabled?: boolean;
  legend?: ReactNode;
  trapSettingsLegend?: ReactNode;
  classNames?: SharedTrapSectionClassNames;
  behavior?: {
    disableTrapDetailsWhenUntrapped?: boolean;
  };
  scriptActionButtons?: Partial<Record<SharedTrapScriptField, SharedTrapScriptActionButton[]>>;
}

function joinClassNames(...classNames: Array<string | undefined>): string | undefined {
  const resolvedClassName = classNames.filter(Boolean).join(" ");
  return resolvedClassName.length > 0 ? resolvedClassName : undefined;
}

function parseNumericInputValue(rawValue: string): number {
  const parsedValue = Number.parseFloat(rawValue);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

export function SharedLockPropertySection({
  value,
  onChange,
  disabled = false,
  legend,
  classNames,
  behavior
}: SharedLockSectionProps) {
  const lockDetailsDisabled =
    disabled || Boolean(behavior?.disableLockDetailsWhenUnlocked && !value.locked);
  const autoRemoveKeyDisabled =
    disabled ||
    Boolean(
      behavior?.disableAutoRemoveKeyUnlessLockedAndRelockable &&
        (!value.locked || !value.canRelock)
    );

  return (
    <fieldset className={classNames?.root}>
      {legend ? <legend>{legend}</legend> : null}
      <label className={classNames?.toggle}>
        <input
          type="checkbox"
          checked={value.locked}
          disabled={disabled}
          onChange={(event) => onChange("locked", event.target.checked)}
        />
        Locked
      </label>
      <label className={classNames?.toggle}>
        <input
          type="checkbox"
          checked={value.canRelock}
          disabled={disabled}
          onChange={(event) => onChange("canRelock", event.target.checked)}
        />
        Can be relocked
      </label>
      <label className={classNames?.toggle}>
        <input
          type="checkbox"
          checked={value.autoRemoveKeyAfterUse}
          disabled={autoRemoveKeyDisabled}
          onChange={(event) => onChange("autoRemoveKeyAfterUse", event.target.checked)}
        />
        Automatically remove key after use
      </label>
      <label className={classNames?.toggle}>
        <input
          type="checkbox"
          checked={value.keyRequiredToUnlockOrLock}
          disabled={lockDetailsDisabled}
          onChange={(event) => onChange("keyRequiredToUnlockOrLock", event.target.checked)}
        />
        Key required to unlock or lock
      </label>
      <div className={classNames?.dualFields}>
        <label className={classNames?.fieldRow}>
          <span>Open Lock DC</span>
          <div className={joinClassNames(classNames?.fieldControl, classNames?.fieldControlNarrow)}>
            <input
              type="number"
              step="1"
              disabled={lockDetailsDisabled}
              value={value.openLockDc}
              onChange={(event) => onChange("openLockDc", parseNumericInputValue(event.target.value))}
            />
          </div>
        </label>
        <label className={classNames?.fieldRow}>
          <span>Close Lock DC</span>
          <div className={joinClassNames(classNames?.fieldControl, classNames?.fieldControlNarrow)}>
            <input
              type="number"
              step="1"
              disabled={lockDetailsDisabled}
              value={value.closeLockDc}
              onChange={(event) =>
                onChange("closeLockDc", parseNumericInputValue(event.target.value))
              }
            />
          </div>
        </label>
      </div>
      <label className={classNames?.fieldRow}>
        <span>Key Tag</span>
        <div className={classNames?.fieldControl}>
          <input
            type="text"
            disabled={lockDetailsDisabled}
            value={value.keyTag}
            onChange={(event) => onChange("keyTag", event.target.value)}
          />
        </div>
      </label>
    </fieldset>
  );
}

export function SharedTrapPropertySection({
  value,
  onChange,
  trapTypeOptions,
  disabled = false,
  legend,
  trapSettingsLegend = "Trap Settings",
  classNames,
  behavior,
  scriptActionButtons
}: SharedTrapSectionProps) {
  const generatedId = useId();
  const nestedSettingsDisabled =
    disabled || Boolean((behavior?.disableTrapDetailsWhenUntrapped ?? true) && !value.isTrapped);

  const renderScriptRow = (
    field: SharedTrapScriptField,
    label: string,
    inputValue: string,
    onInputChange: (nextValue: string) => void
  ) => {
    const inputId = `${generatedId}-${field}`;
    const actions = scriptActionButtons?.[field] ?? [];

    return (
      <div className={classNames?.scriptRow}>
        <label htmlFor={inputId}>{label}</label>
        <input
          id={inputId}
          type="text"
          value={inputValue}
          onChange={(event) => onInputChange(event.target.value)}
        />
        {actions.map((action, index) => (
          <button
            key={action.key ?? `${field}-${index}`}
            type="button"
            title={action.title}
            className={action.className}
            disabled={nestedSettingsDisabled || Boolean(action.disabled)}
            onClick={() => action.onClick?.(field)}
          >
            {action.label}
          </button>
        ))}
      </div>
    );
  };

  return (
    <fieldset className={classNames?.root}>
      {legend ? <legend>{legend}</legend> : null}
      <label className={classNames?.toggle}>
        <input
          type="checkbox"
          checked={value.isTrapped}
          disabled={disabled}
          onChange={(event) => onChange("isTrapped", event.target.checked)}
        />
        Is Trapped
      </label>
      <fieldset className={classNames?.nested} disabled={nestedSettingsDisabled}>
        <legend>{trapSettingsLegend}</legend>
        <label className={classNames?.fieldRow}>
          <span>Trap Type</span>
          <div className={classNames?.fieldControl}>
            <select
              value={value.trapType}
              onChange={(event) => onChange("trapType", event.target.value)}
            >
              {trapTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </label>
        <div className={classNames?.dualFields}>
          <label className={classNames?.fieldRow}>
            <span>Detection DC</span>
            <div className={joinClassNames(classNames?.fieldControl, classNames?.fieldControlNarrow)}>
              <input
                type="number"
                step="1"
                value={value.detectionDc}
                onChange={(event) =>
                  onChange("detectionDc", parseNumericInputValue(event.target.value))
                }
              />
            </div>
          </label>
          <label className={classNames?.fieldRow}>
            <span>Disarm DC</span>
            <div className={joinClassNames(classNames?.fieldControl, classNames?.fieldControlNarrow)}>
              <input
                type="number"
                step="1"
                value={value.disarmDc}
                onChange={(event) => onChange("disarmDc", parseNumericInputValue(event.target.value))}
              />
            </div>
          </label>
        </div>
        <div className={classNames?.toggleGrid}>
          <label className={classNames?.toggle}>
            <input
              type="checkbox"
              checked={value.oneShot}
              onChange={(event) => onChange("oneShot", event.target.checked)}
            />
            One Shot
          </label>
          <label className={classNames?.toggle}>
            <input
              type="checkbox"
              checked={value.detectable}
              onChange={(event) => onChange("detectable", event.target.checked)}
            />
            Detectable
          </label>
          <label className={classNames?.toggle}>
            <input
              type="checkbox"
              checked={value.disarmable}
              onChange={(event) => onChange("disarmable", event.target.checked)}
            />
            Disarmable
          </label>
        </div>
        {renderScriptRow("onDisarmScript", "OnDisarm", value.onDisarmScript, (nextValue) =>
          onChange("onDisarmScript", nextValue)
        )}
        {renderScriptRow(
          "onTrapTriggeredScript",
          "OnTrapTriggered",
          value.onTrapTriggeredScript,
          (nextValue) => onChange("onTrapTriggeredScript", nextValue)
        )}
        <div className={classNames?.dualFields}>
          <label className={classNames?.fieldRow}>
            <span>Set DC</span>
            <div className={joinClassNames(classNames?.fieldControl, classNames?.fieldControlNarrow)}>
              <input
                type="number"
                step="1"
                value={value.setDc}
                onChange={(event) => onChange("setDc", parseNumericInputValue(event.target.value))}
              />
            </div>
          </label>
        </div>
        <label className={classNames?.fieldRow}>
          <span>Detect DC Mod. when set by Rogue</span>
          <div className={joinClassNames(classNames?.fieldControl, classNames?.fieldControlNarrow)}>
            <input
              type="number"
              step="1"
              value={value.detectDcModWhenSetByRogue}
              onChange={(event) =>
                onChange("detectDcModWhenSetByRogue", parseNumericInputValue(event.target.value))
              }
            />
          </div>
        </label>
        <label className={classNames?.fieldRow}>
          <span>Disarm DC Mod. when set by Rogue</span>
          <div className={joinClassNames(classNames?.fieldControl, classNames?.fieldControlNarrow)}>
            <input
              type="number"
              step="1"
              value={value.disarmDcModWhenSetByRogue}
              onChange={(event) =>
                onChange("disarmDcModWhenSetByRogue", parseNumericInputValue(event.target.value))
              }
            />
          </div>
        </label>
      </fieldset>
    </fieldset>
  );
}
