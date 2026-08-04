# react-native-grab

React Native's element inspector, plus the one thing it cannot do: **copy the selection for your AI coding agent.**

## What it does

1. Open the developer menu (⌘D on the iOS simulator, ⌘M on Android, shake on device)
2. Tap **Inspect element (custom)**
3. Touch anything on screen — you get React Native's own inspector: the content/padding/margin highlight, the component hierarchy, the box model, the styles
4. Press **Copy for LLM** — a paste-ready block lands on your clipboard

**Copied output:**

```
// /Users/you/proj/src/components/promo/pushes/index.tsx:52
// 370×152 at (16, 265)

<View
  style={{"backgroundColor":"#FFFFFF","borderRadius":20,"padding":20}}
/>

in Pushes (at /Users/you/proj/src/components/promo/pushes/index.tsx:52:22)
in Workouts (at /Users/you/proj/src/screens/home/components/workouts/index.tsx:108:43)
in HomeScreen (at /Users/you/proj/src/screens/home/index.tsx:65:23)
in HomeRoute (at /Users/you/proj/src/routes/(tabs)/index.tsx:4:18)
// … 189 library frames omitted
```

Three things make that block worth pasting:

- **Real file paths.** React reports component locations as offsets into the
  Metro bundle (`…hermes-stable:11134`). Grab resolves them through Metro's
  `/symbolicate` endpoint — the same one LogBox uses — so you get source files.
- **Your code only.** A real component stack runs past 200 frames, nearly all of
  them inside `node_modules`. Grab keeps your own and says how many it dropped.
- **Full paths, not shortened ones.** An agent can open them.

## Install

```bash
npm install @jocelinqueau/react-native-grab
```

Copying needs a clipboard module — pick the one that matches your setup:

```bash
npx expo install expo-clipboard                # Expo
npm install @react-native-clipboard/clipboard  # bare React Native
```

Both are optional peer dependencies, loaded through a guarded `require`. Without
one, everything still works except the copy, which warns instead.

> On Expo, adding `expo-clipboard` means a native rebuild (`npx expo run:ios`).
> React Native's core `Clipboard` export is not a substitute: its native module
> is no longer bundled, so it calls into nothing.

## Usage

Wrap your root component:

```tsx
import { Grab } from '@jocelinqueau/react-native-grab';

export default function App() {
  return (
    <Grab enabled={__DEV__}>
      <RootNavigator />
    </Grab>
  );
}
```

Pass `__DEV__` so the whole thing disappears in production — `Grab` then renders
its children and nothing else.

### Props

| Prop | Default | Description |
| --- | --- | --- |
| `enabled` | `false` | Turn the inspector on. Pass `__DEV__`. |
| `trigger` | `'devMenu'` | `'devMenu'`, `'button'` (a floating button), or `'both'`. |
| `devMenuLabel` | `'Inspect element (custom)'` | Label of the developer-menu entry. |

The default costs nothing when unused: no floating button over your UI, and
nothing mounted in your layout until you open the inspector.

### API

For building your own UI on top:

```ts
import {
  inspectAtPoint,       // (x, y, hostView) => Promise<GrabSelection | null>
  selectHierarchyIndex, // walk up and down the hierarchy
  isInspectorAvailable, // false outside a dev build
  serializeForLLM,      // GrabSelection => the block above
  copyToClipboard,
  useInspector,         // the hook Grab itself uses
} from '@jocelinqueau/react-native-grab';
```

`inspectAtPoint` needs the host instance wrapping your app — it scopes the hit
test, and Fabric dereferences it without a null check.

## Requirements

- React ≥ 18 (including 19)
- React Native ≥ 0.72
- Old Architecture and Fabric, Expo managed and bare

Inspection relies on React exposing `getInspectorDataForViewAtPoint` on its
renderer, which it does in every development build. It does **not** require the
React DevTools backend to be connected.

## Credits

The inspector UI and engine are ported from React Native itself
(`react-native/src/private/devsupport/devmenu/elementinspector`), MIT-licensed,
copyright Meta Platforms, Inc. Each ported file carries its attribution header.
They are copied rather than imported because that path is private and has moved
before.

Inspired by [react-grab](https://github.com/aidenybai/react-grab).

## License

MIT
