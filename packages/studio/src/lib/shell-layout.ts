/** Layout breakpoints for the Studio shell.
 *
 *  - below 1024: navigation is an off-canvas drawer (phones and narrow windows,
 *    including the 768px band)
 *  - 1024–1279: tablet landscape, navigation stays docked; the book panel is
 *    capped so the chat column keeps a readable width
 *  - 1280 and up: the previous desktop measurements (260px nav, book panel at
 *    40% of the viewport, clamped to 280–700)
 */

export const SHELL_NAV_WIDTH = 260;
export const SHELL_DOCK_MIN = 1024;
export const SHELL_DESKTOP_MIN = 1280;

const BOOK_PANEL_RATIO = 0.4;
const BOOK_PANEL_MIN = 280;
const BOOK_PANEL_MAX = 700;
const TABLET_CHAT_FLOOR = 420;
const TABLET_PANEL_RATIO = 0.34;

export type ShellMode = "drawer" | "dock";

export function shellMode(viewportWidth: number): ShellMode {
  return viewportWidth >= SHELL_DOCK_MIN ? "dock" : "drawer";
}

export interface BookPanelBounds {
  readonly min: number;
  readonly max: number;
  readonly initial: number;
}

export function bookPanelBounds(viewportWidth: number): BookPanelBounds {
  if (viewportWidth >= SHELL_DESKTOP_MIN) {
    const initial = Math.min(
      BOOK_PANEL_MAX,
      Math.max(BOOK_PANEL_MIN, Math.round(viewportWidth * BOOK_PANEL_RATIO)),
    );
    return { min: BOOK_PANEL_MIN, max: BOOK_PANEL_MAX, initial };
  }

  const available = Math.max(0, viewportWidth - SHELL_NAV_WIDTH);
  const max = Math.min(BOOK_PANEL_MAX, Math.max(240, available - TABLET_CHAT_FLOOR));
  const min = Math.min(BOOK_PANEL_MIN, max);
  const preferred = Math.round(available * TABLET_PANEL_RATIO);
  const initial = Math.min(max, Math.max(min, preferred));
  return { min, max, initial };
}
