import { DevSettings } from 'react-native';

type Handler = () => void;

/**
 * Neither `DevSettings.addMenuItem` nor `registerDevMenuItems` can remove an
 * entry, and both duplicate it when called twice. So register a given title
 * exactly once and route it through a mutable handler.
 */
const handlers = new Map<string, Handler | null>();

interface ExpoDevMenu {
  registerDevMenuItems?: (
    items: Array<{ name: string; callback: Handler; shouldCollapse?: boolean }>,
  ) => void;
  closeMenu?: () => void;
}

function loadExpoDevMenu(): ExpoDevMenu | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('expo-dev-menu') as ExpoDevMenu;
  } catch {
    return null;
  }
}

function registerNative(title: string): void {
  // expo-dev-menu, when present, owns the shake / ⌘D menu.
  const devMenu = loadExpoDevMenu();

  const invoke = () => {
    // The menu must get out of the way: you cannot inspect a screen it covers.
    // `shouldCollapse` asks for that, and this closes it even where the flag
    // is ignored — RN's own "Toggle element inspector" behaves the same way.
    try {
      devMenu?.closeMenu?.();
    } catch {}
    handlers.get(title)?.();
  };

  if (devMenu && typeof devMenu.registerDevMenuItems === 'function') {
    devMenu.registerDevMenuItems([{ name: title, callback: invoke, shouldCollapse: true }]);
    return;
  }

  if (typeof DevSettings?.addMenuItem === 'function') {
    DevSettings.addMenuItem(title, invoke);
  }
}

/**
 * Add an entry to the developer menu (⌘D on the iOS simulator, ⌘M on Android,
 * shake on device). Returns a function that detaches the handler — the menu
 * entry itself stays, since the platform offers no way to remove it.
 */
export function addDevMenuItem(title: string, handler: Handler): () => void {
  const known = handlers.has(title);
  handlers.set(title, handler);

  if (!known) registerNative(title);

  return () => {
    if (handlers.get(title) === handler) handlers.set(title, null);
  };
}
