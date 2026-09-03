import type {
  MouseEventHandler,
  PointerEventHandler,
  ReactNode,
  Ref
} from "react";

export interface SharedPropertyTabOption<TTab extends string> {
  id: TTab;
  label: string;
}

interface SharedPropertyTabsNavProps<TTab extends string> {
  className?: string;
  ariaLabel: string;
  tabs: readonly SharedPropertyTabOption<TTab>[];
  activeTab: TTab;
  onSelectTab: (tab: TTab) => void;
}

interface SharedDialogActionsFooterProps {
  className?: string;
  onApply: () => void;
  onOk: () => void;
  onCancel: () => void;
  applyDisabled?: boolean;
  okDisabled?: boolean;
}

interface SharedLongTextPropertySectionProps {
  sectionClassName?: string;
  legend?: ReactNode;
  label: string;
  labelClassName?: string;
  value: string;
  onChange: (nextValue: string) => void;
  rows?: number;
  disabled?: boolean;
  maxLength?: number;
}

interface SharedObjectPreviewPaneProps {
  className?: string;
  previewClassName?: string;
  previewText: string;
  previewFallback?: string;
  previewImageUrl?: string;
  previewImageAlt?: string;
  actionClassName?: string;
  actionLabel?: string;
  actionDisabled?: boolean;
  ariaHidden?: boolean;
}

interface SharedAdvancedSettingsSectionProps {
  sectionClassName?: string;
  legend?: ReactNode;
  fieldRowClassName?: string;
  fieldControlClassName?: string;
  toggleClassName?: string;
  portraitRowClassName?: string;
  portraitPreviewClassName?: string;
  variablesRowClassName?: string;
  blueprintResRef: string;
  onBlueprintResRefChange: (nextValue: string) => void;
  blueprintResRefDisabled?: boolean;
  blueprintResRefMaxLength?: number;
  belongsToFaction: string;
  factionOptions: readonly string[];
  onBelongsToFactionChange: (nextValue: string) => void;
  belongsToFactionDisabled?: boolean;
  factionId?: number;
  factionIdOptions?: readonly Readonly<{ value: number; label: string }>[];
  onFactionIdChange?: (nextValue: number) => void;
  conversation: string;
  onConversationChange: (nextValue: string) => void;
  conversationDisabled?: boolean;
  showConversationActions?: boolean;
  conversationBrowseDisabled?: boolean;
  conversationEditDisabled?: boolean;
  noInterrupt: boolean;
  onNoInterruptChange: (checked: boolean) => void;
  noInterruptDisabled?: boolean;
  portraitResRef: string;
  portraitPreviewFallback?: string;
  onPortraitResRefChange: (nextValue: string) => void;
  portraitResRefDisabled?: boolean;
  portraitId?: number;
  portraitIdOptions?: readonly Readonly<{ value: number; label: string }>[];
  onPortraitIdChange?: (nextValue: number) => void;
  portraitIdDisabled?: boolean;
  showPortraitPreview?: boolean;
  showPortraitBrowseAction?: boolean;
  portraitBrowseDisabled?: boolean;
  initialState: string;
  initialStateOptions: readonly string[];
  onInitialStateChange: (nextValue: string) => void;
  initialStateDisabled?: boolean;
  treasureModel?: string;
  treasureModelOptions?: readonly string[];
  onTreasureModelChange?: (nextValue: string) => void;
  treasureModelDisabled?: boolean;
  treasureModelRow?: number;
  treasureModelRowOptions?: readonly Readonly<{ value: number; label: string }>[];
  onTreasureModelRowChange?: (nextValue: number) => void;
  showVariablesButton?: boolean;
  variablesButtonDisabled?: boolean;
  variablesButtonLabel?: ReactNode;
  children?: ReactNode;
}

interface SharedScriptSlotSectionProps<TSlotKey extends string> {
  className?: string;
  rowClassName?: string;
  rowLabelClassName?: string;
  rowControlClassName?: string;
  legend?: ReactNode;
  slots: readonly TSlotKey[];
  labels: Record<TSlotKey, string>;
  values: Record<TSlotKey, string>;
  onChange: (slot: TSlotKey, nextValue: string) => void;
  inputIdPrefix: string;
  inputListId?: string;
  inputMaxLength?: number;
  inputPattern?: string;
  isSlotDisabled?: (slot: TSlotKey) => boolean;
  slotStatus?: (slot: TSlotKey) => ReactNode;
  slotStatusClassName?: string;
  hiddenLabelSuffix?: ReactNode;
  showInlineActionButtons?: boolean;
  inlineBrowseDisabled?: boolean;
  inlineEditDisabled?: boolean;
  showSaveLoadActions?: boolean;
  saveLoadActionsClassName?: string;
  saveDisabled?: boolean;
  loadDisabled?: boolean;
  enablePayloadToggle?: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    className?: string;
    label: ReactNode;
  };
}

interface SharedPropertyDialogChromeProps {
  articleRef?: Ref<HTMLElement>;
  articleClassName: string;
  ariaLabel: string;
  windowX: number;
  windowY: number;
  headerClassName: string;
  headerCopyClassName: string;
  headerActionsClassName: string;
  title: ReactNode;
  subtitle?: ReactNode;
  collapsed: boolean;
  collapseLabel: string;
  expandLabel: string;
  closeLabel: string;
  onToggleCollapsed: () => void;
  onClose: () => void;
  onArticleMouseDown?: MouseEventHandler<HTMLElement>;
  onArticleContextMenu?: MouseEventHandler<HTMLElement>;
  onHeaderPointerDown?: PointerEventHandler<HTMLElement>;
  onHeaderPointerMove?: PointerEventHandler<HTMLElement>;
  onHeaderPointerUp?: PointerEventHandler<HTMLElement>;
  onHeaderPointerCancel?: PointerEventHandler<HTMLElement>;
  children?: ReactNode;
}

export function SharedPropertyTabsNav<TTab extends string>({
  className,
  ariaLabel,
  tabs,
  activeTab,
  onSelectTab
}: SharedPropertyTabsNavProps<TTab>) {
  return (
    <nav className={className} aria-label={ariaLabel}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={activeTab === tab.id ? "is-active" : undefined}
          onClick={() => onSelectTab(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}

export function SharedDialogActionsFooter({
  className,
  onApply,
  onOk,
  onCancel,
  applyDisabled = false,
  okDisabled = false,
}: SharedDialogActionsFooterProps) {
  return (
    <footer className={className}>
      <button type="button" onClick={onApply} disabled={applyDisabled}>
        Apply
      </button>
      <button type="button" onClick={onOk} disabled={okDisabled}>
        OK
      </button>
      <button type="button" onClick={onCancel}>
        Cancel
      </button>
    </footer>
  );
}

export function SharedPropertyDialogChrome({
  articleRef,
  articleClassName,
  ariaLabel,
  windowX,
  windowY,
  headerClassName,
  headerCopyClassName,
  headerActionsClassName,
  title,
  subtitle,
  collapsed,
  collapseLabel,
  expandLabel,
  closeLabel,
  onToggleCollapsed,
  onClose,
  onArticleMouseDown,
  onArticleContextMenu,
  onHeaderPointerDown,
  onHeaderPointerMove,
  onHeaderPointerUp,
  onHeaderPointerCancel,
  children
}: SharedPropertyDialogChromeProps) {
  return (
    <article
      ref={articleRef}
      className={`canvas-property-dialog-chrome ${articleClassName} ${
        collapsed ? "is-collapsed" : ""
      }`.trim()}
      role="dialog"
      aria-label={ariaLabel}
      data-collapsed={collapsed ? "true" : "false"}
      style={{
        left: `${windowX}px`,
        top: `${windowY}px`
      }}
      onMouseDown={onArticleMouseDown}
      onContextMenu={onArticleContextMenu}
    >
      <header
        className={`canvas-property-dialog-titlebar ${headerClassName}`.trim()}
        onPointerDown={onHeaderPointerDown}
        onPointerMove={onHeaderPointerMove}
        onPointerUp={onHeaderPointerUp}
        onPointerCancel={onHeaderPointerCancel}
      >
        <div className={headerCopyClassName}>
          <h2>{title}</h2>
          {subtitle !== undefined && subtitle !== null ? <p>{subtitle}</p> : null}
        </div>
        <div className={headerActionsClassName}>
          <button
            type="button"
            className="canvas-property-dialog-titlebar-button"
            onClick={onToggleCollapsed}
            onPointerDown={(event) => event.stopPropagation()}
            aria-label={collapsed ? expandLabel : collapseLabel}
          >
            {collapsed ? "+" : "-"}
          </button>
          <button
            type="button"
            className="canvas-property-dialog-titlebar-button"
            onClick={onClose}
            onPointerDown={(event) => event.stopPropagation()}
            aria-label={closeLabel}
          >
            x
          </button>
        </div>
      </header>
      {!collapsed ? children : null}
    </article>
  );
}

export function SharedLongTextPropertySection({
  sectionClassName,
  legend,
  label,
  labelClassName,
  value,
  onChange,
  rows,
  disabled = false,
  maxLength
}: SharedLongTextPropertySectionProps) {
  return (
    <fieldset className={sectionClassName}>
      {legend ? <legend>{legend}</legend> : null}
      <label className={labelClassName}>
        <span>{label}</span>
        <textarea
          aria-label={label}
          value={value}
          rows={rows}
          disabled={disabled}
          maxLength={maxLength}
          onChange={(event) => onChange(event.target.value)}
        />
        <span className="canvas-accessibility-hidden">
          {disabled ? "PRESERVE_ONLY" : "ACTIVE_NOW"}
        </span>
      </label>
    </fieldset>
  );
}

export function SharedObjectPreviewPane({
  className,
  previewClassName,
  previewText,
  previewFallback = "Preview",
  previewImageUrl,
  previewImageAlt,
  actionClassName,
  actionLabel = "Inventory ...",
  actionDisabled = true,
  ariaHidden = true
}: SharedObjectPreviewPaneProps) {
  return (
    <aside className={className} aria-hidden={ariaHidden}>
      <div className={previewClassName}>
        {previewImageUrl ? (
          <img src={previewImageUrl} alt={previewImageAlt ?? (previewText || previewFallback)} />
        ) : (
          <span>{previewText || previewFallback}</span>
        )}
      </div>
      <button type="button" disabled={actionDisabled} className={actionClassName}>
        {actionLabel}
      </button>
    </aside>
  );
}

export function SharedAdvancedSettingsSection({
  sectionClassName,
  legend,
  fieldRowClassName,
  fieldControlClassName,
  toggleClassName,
  portraitRowClassName,
  portraitPreviewClassName,
  variablesRowClassName,
  blueprintResRef,
  onBlueprintResRefChange,
  blueprintResRefDisabled = false,
  blueprintResRefMaxLength,
  belongsToFaction,
  factionOptions,
  onBelongsToFactionChange,
  belongsToFactionDisabled = false,
  factionId,
  factionIdOptions,
  onFactionIdChange,
  conversation,
  onConversationChange,
  conversationDisabled = false,
  showConversationActions = false,
  conversationBrowseDisabled = true,
  conversationEditDisabled = true,
  noInterrupt,
  onNoInterruptChange,
  noInterruptDisabled = false,
  portraitResRef,
  portraitPreviewFallback = "Portrait",
  onPortraitResRefChange,
  portraitResRefDisabled = false,
  portraitId,
  portraitIdOptions,
  onPortraitIdChange,
  portraitIdDisabled = false,
  showPortraitPreview = true,
  showPortraitBrowseAction = false,
  portraitBrowseDisabled = true,
  initialState,
  initialStateOptions,
  onInitialStateChange,
  initialStateDisabled = false,
  treasureModel,
  treasureModelOptions,
  onTreasureModelChange,
  treasureModelDisabled = false,
  treasureModelRow,
  treasureModelRowOptions,
  onTreasureModelRowChange,
  showVariablesButton = true,
  variablesButtonDisabled = true,
  variablesButtonLabel = "Variables",
  children
}: SharedAdvancedSettingsSectionProps) {
  const renderFieldControl = (childrenToRender: ReactNode) => (
    <div className={fieldControlClassName}>{childrenToRender}</div>
  );

  const shouldRenderTreasureModelRowField =
    treasureModelRow !== undefined &&
    treasureModelRowOptions !== undefined &&
    onTreasureModelRowChange !== undefined;
  const shouldRenderTreasureModelField =
    !shouldRenderTreasureModelRowField &&
    treasureModel !== undefined &&
    treasureModelOptions !== undefined &&
    onTreasureModelChange !== undefined;
  const shouldRenderPortraitIdField = portraitId !== undefined &&
    portraitIdOptions !== undefined && onPortraitIdChange !== undefined;
  const shouldRenderFactionIdField = factionId !== undefined &&
    factionIdOptions !== undefined && onFactionIdChange !== undefined;

  return (
    <fieldset className={sectionClassName}>
      {legend ? <legend>{legend}</legend> : null}
      <label className={fieldRowClassName}>
        <span>Blueprint ResRef</span>
        {renderFieldControl(
          <>
            <input
              aria-label="Blueprint ResRef"
              type="text"
              maxLength={blueprintResRefMaxLength}
              pattern="[a-z0-9_]{1,16}"
              disabled={blueprintResRefDisabled}
              value={blueprintResRef}
              onChange={(event) => onBlueprintResRefChange(event.target.value)}
            />
            <span className="canvas-accessibility-hidden">
              {blueprintResRefDisabled ? "PRESERVE_ONLY" : "ACTIVE_NOW"}
            </span>
          </>
        )}
      </label>
      <label className={fieldRowClassName}>
        <span>Belongs To Faction</span>
        {renderFieldControl(
          <>
            {shouldRenderFactionIdField ? (
              <select
                aria-label="Belongs To Faction"
                value={factionId}
                disabled={belongsToFactionDisabled}
                onChange={(event) => onFactionIdChange(Number(event.target.value))}
              >
                {factionIdOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <select
                aria-label="Belongs To Faction"
                value={belongsToFaction}
                disabled={belongsToFactionDisabled}
                onChange={(event) => onBelongsToFactionChange(event.target.value)}
              >
                {factionOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            )}
            <span className="canvas-accessibility-hidden">
              {belongsToFactionDisabled ? "PRESERVE_ONLY" : "ACTIVE_NOW"}
            </span>
          </>
        )}
      </label>
      <label className={fieldRowClassName}>
        <span>Conversation</span>
        {renderFieldControl(
          <>
            <input
              aria-label="Conversation"
              type="text"
              maxLength={16}
              pattern="[A-Za-z0-9_]{0,16}"
              disabled={conversationDisabled}
              value={conversation}
              onChange={(event) => onConversationChange(event.target.value)}
            />
            <span className="canvas-accessibility-hidden">
              {conversationDisabled ? "PRESERVE_ONLY" : "ACTIVE_NOW"}
            </span>
            {showConversationActions ? (
              <>
                <button type="button" disabled={conversationBrowseDisabled} aria-label="Browse conversation">
                  ...
                </button>
                <button type="button" disabled={conversationEditDisabled} aria-label="Edit conversation">
                  Edit
                </button>
              </>
            ) : null}
          </>
        )}
      </label>
      <label className={toggleClassName}>
        <input
          aria-label="No Interrupt"
          type="checkbox"
          checked={noInterrupt}
          disabled={noInterruptDisabled}
          onChange={(event) => onNoInterruptChange(event.target.checked)}
        />
        No Interrupt
        <span className="canvas-accessibility-hidden">
          {noInterruptDisabled ? "PRESERVE_ONLY" : "ACTIVE_NOW"}
        </span>
      </label>
      <div className={portraitRowClassName}>
        {showPortraitPreview ? (
          <div className={portraitPreviewClassName} aria-hidden="true">
            <span>{portraitResRef || portraitPreviewFallback}</span>
          </div>
        ) : null}
        <label className={fieldRowClassName}>
          <span>Portrait</span>
          {renderFieldControl(
            <>
              {shouldRenderPortraitIdField ? (
                <select
                  aria-label="Portrait"
                  disabled={portraitIdDisabled}
                  value={portraitId}
                  onChange={(event) => onPortraitIdChange(Number(event.target.value))}
                >
                  {portraitIdOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  aria-label="Portrait ResRef"
                  type="text"
                  disabled={portraitResRefDisabled}
                  value={portraitResRef}
                  onChange={(event) => onPortraitResRefChange(event.target.value)}
                />
              )}
              <span className="canvas-accessibility-hidden">
                {(shouldRenderPortraitIdField ? portraitIdDisabled : portraitResRefDisabled)
                  ? "PRESERVE_ONLY"
                  : "ACTIVE_NOW"}
              </span>
              {showPortraitBrowseAction && !shouldRenderPortraitIdField ? (
                <button type="button" disabled={portraitBrowseDisabled} aria-label="Browse portrait">
                  ...
                </button>
              ) : null}
            </>
          )}
        </label>
      </div>
      <label className={fieldRowClassName}>
        <span>Initial State</span>
        {renderFieldControl(
          <select
            value={initialState}
            disabled={initialStateDisabled}
            onChange={(event) => onInitialStateChange(event.target.value)}
          >
            {initialStateOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        )}
      </label>
      {shouldRenderTreasureModelRowField ? (
        <label className={fieldRowClassName}>
          <span>Treasure Model</span>
          {renderFieldControl(
            <select
              value={treasureModelRow}
              disabled={treasureModelDisabled}
              onChange={(event) => onTreasureModelRowChange(Number(event.target.value))}
            >
              {treasureModelRowOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
        </label>
      ) : shouldRenderTreasureModelField ? (
        <label className={fieldRowClassName}>
          <span>Treasure Model</span>
          {renderFieldControl(
            <select
              value={treasureModel}
              disabled={treasureModelDisabled}
              onChange={(event) => onTreasureModelChange(event.target.value)}
            >
              {treasureModelOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          )}
        </label>
      ) : null}
      {showVariablesButton ? (
        <div className={variablesRowClassName}>
          <button type="button" disabled={variablesButtonDisabled}>
            {variablesButtonLabel}
          </button>
        </div>
      ) : null}
      {children}
    </fieldset>
  );
}

export function SharedScriptSlotSection<TSlotKey extends string>({
  className,
  rowClassName,
  rowLabelClassName,
  rowControlClassName,
  legend,
  slots,
  labels,
  values,
  onChange,
  inputIdPrefix,
  inputListId,
  inputMaxLength,
  inputPattern,
  isSlotDisabled,
  slotStatus,
  slotStatusClassName,
  hiddenLabelSuffix,
  showInlineActionButtons = false,
  inlineBrowseDisabled = false,
  inlineEditDisabled = false,
  showSaveLoadActions = false,
  saveLoadActionsClassName,
  saveDisabled = false,
  loadDisabled = false,
  enablePayloadToggle
}: SharedScriptSlotSectionProps<TSlotKey>) {
  return (
    <fieldset className={className}>
      {legend ? <legend>{legend}</legend> : null}
      {enablePayloadToggle ? (
        <label className={enablePayloadToggle.className}>
          <input
            type="checkbox"
            checked={enablePayloadToggle.checked}
            onChange={(event) => enablePayloadToggle.onChange(event.target.checked)}
          />
          {enablePayloadToggle.label}
        </label>
      ) : null}
      {slots.map((slot) => {
        const inputId = `${inputIdPrefix}-${slot}`;
        const rowControls = (
          <>
            <input
              id={inputId}
              aria-label={slotStatus ? labels[slot] : undefined}
              type="text"
              list={inputListId}
              maxLength={inputMaxLength}
              pattern={inputPattern}
              disabled={isSlotDisabled?.(slot) ?? false}
              value={values[slot]}
              onChange={(event) => onChange(slot, event.target.value)}
            />
            {showInlineActionButtons ? (
              <>
                <button type="button" disabled={inlineBrowseDisabled}>
                  ...
                </button>
                <button type="button" disabled={inlineEditDisabled}>
                  Edit
                </button>
              </>
            ) : null}
          </>
        );

        return (
          <div key={slot} className={rowClassName}>
            <label htmlFor={inputId} className={rowLabelClassName}>
              {slotStatus ? (
                <span className={slotStatusClassName}>
                  {labels[slot]}: {slotStatus(slot)}
                </span>
              ) : labels[slot]}
              {hiddenLabelSuffix}
            </label>
            {rowControlClassName ? <div className={rowControlClassName}>{rowControls}</div> : rowControls}
          </div>
        );
      })}
      {showSaveLoadActions ? (
        <div className={saveLoadActionsClassName}>
          <button type="button" disabled={saveDisabled}>
            Save Script Set
          </button>
          <button type="button" disabled={loadDisabled}>
            Load Script Set
          </button>
        </div>
      ) : null}
    </fieldset>
  );
}
