export interface ViewportMouseEventShape {
  button: number;
  ctrlKey: boolean;
}

export function isContextMenuGesture(event: ViewportMouseEventShape): boolean {
  return event.button === 2 && !event.ctrlKey;
}

export function isCtrlPanGesture(event: ViewportMouseEventShape): boolean {
  return event.button === 2 && event.ctrlKey;
}

