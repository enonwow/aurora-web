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
}

interface SharedLongTextPropertySectionProps {
  sectionClassName?: string;
  legend?: ReactNode;
  label: string;
  labelClassName?: string;
  value: string;
  onChange: (nextValue: string) => void;
  rows?: number;
}

interface SharedObjectPreviewPaneProps {
  className?: string;
  previewClassName?: string;
  previewText: string;
  previewFallback?: string;
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
  belongsToFaction: string;
  factionOptions: readonly string[];
  onBelongsToFactionChange: (nextValue: string) => void;
  conversation: string;
  onConversationChange: (nextValue: string) => void;
  showConversationActions?: boolean;
  conversationBrowseDisabled?: boolean;
  conversationEditDisabled?: boolean;
  noInterrupt: boolean;
  onNoInterruptChange: (checked: boolean) => void;
  portraitResRef: string;
  portraitPreviewFallback?: string;
  onPortraitResRefChange: (nextValue: string) => void;
  showPortraitPreview?: boolean;
  showPortraitBrowseAction?: boolean;
  portraitBrowseDisabled?: boolean;
  initialState: string;
  initialStateOptions: readonly string[];
  onInitialStateChange: (nextValue: string) => void;
  treasureModel?: string;
  treasureModelOptions?: readonly string[];
  onTreasureModelChange?: (nextValue: string) => void;
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
  onCancel
}: SharedDialogActionsFooterProps) {
  return (
    <footer className={className}>
      <button type="button" onClick={onApply}>
        Apply
      </button>
      <button type="button" onClick={onOk}>
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
  rows
}: SharedLongTextPropertySectionProps) {
  return (
    <fieldset className={sectionClassName}>
      {legend ? <legend>{legend}</legend> : null}
      <label className={labelClassName}>
        <span>{label}</span>
        <textarea value={value} rows={rows} onChange={(event) => onChange(event.target.value)} />
      </label>
    </fieldset>
  );
}

export function SharedObjectPreviewPane({
  className,
  previewClassName,
  previewText,
  previewFallback = "Preview",
  actionClassName,
  actionLabel = "Inventory ...",
  actionDisabled = true,
  ariaHidden = true
}: SharedObjectPreviewPaneProps) {
  return (
    <aside className={className} aria-hidden={ariaHidden}>
      <div className={previewClassName}>
        <span>{previewText || previewFallback}</span>
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
  belongsToFaction,
  factionOptions,
  onBelongsToFactionChange,
  conversation,
  onConversationChange,
  showConversationActions = false,
  conversationBrowseDisabled = true,
  conversationEditDisabled = true,
  noInterrupt,
  onNoInterruptChange,
  portraitResRef,
  portraitPreviewFallback = "Portrait",
  onPortraitResRefChange,
  showPortraitPreview = true,
  showPortraitBrowseAction = false,
  portraitBrowseDisabled = true,
  initialState,
  initialStateOptions,
  onInitialStateChange,
  treasureModel,
  treasureModelOptions,
  onTreasureModelChange,
  showVariablesButton = true,
  variablesButtonDisabled = true,
  variablesButtonLabel = "Variables",
  children
}: SharedAdvancedSettingsSectionProps) {
  const renderFieldControl = (childrenToRender: ReactNode) => (
    <div className={fieldControlClassName}>{childrenToRender}</div>
  );

  const shouldRenderTreasureModelField =
    treasureModel !== undefined &&
    treasureModelOptions !== undefined &&
    onTreasureModelChange !== undefined;

  return (
    <fieldset className={sectionClassName}>
      {legend ? <legend>{legend}</legend> : null}
      <label className={fieldRowClassName}>
        <span>Blueprint ResRef</span>
        {renderFieldControl(
          <input
            type="text"
            value={blueprintResRef}
            onChange={(event) => onBlueprintResRefChange(event.target.value)}
          />
        )}
      </label>
      <label className={fieldRowClassName}>
        <span>Belongs To Faction</span>
        {renderFieldControl(
          <select
            value={belongsToFaction}
            onChange={(event) => onBelongsToFactionChange(event.target.value)}
          >
            {factionOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        )}
      </label>
      <label className={fieldRowClassName}>
        <span>Conversation</span>
        {renderFieldControl(
          <>
            <input
              type="text"
              value={conversation}
              onChange={(event) => onConversationChange(event.target.value)}
            />
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
          type="checkbox"
          checked={noInterrupt}
          onChange={(event) => onNoInterruptChange(event.target.checked)}
        />
        No Interrupt
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
              <input
                type="text"
                value={portraitResRef}
                onChange={(event) => onPortraitResRefChange(event.target.value)}
              />
              {showPortraitBrowseAction ? (
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
          <select value={initialState} onChange={(event) => onInitialStateChange(event.target.value)}>
            {initialStateOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        )}
      </label>
      {shouldRenderTreasureModelField ? (
        <label className={fieldRowClassName}>
          <span>Treasure Model</span>
          {renderFieldControl(
            <select
              value={treasureModel}
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
              type="text"
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
              {labels[slot]}
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
