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
  The round-trip starts when you tap and the panel waits for it when you press
  the button, because the first one of a session can take Metro a while to
  answer. When it cannot answer at all, the block says so in a last line
  instead of handing you bundle URLs dressed as locations.
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
one, everything still works except the copy, which fails visibly — the button
reads `Failed` rather than claiming a clipboard it never wrote to.

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

### React Navigation / Expo Router: retained screens

Fabric's inspector hit test uses the layout tree. Native navigation can detach or
cover a screen while its layout nodes remain mounted, so querying the application
root can select a card from an inactive tab. Add a focused `GrabScope` through
**each** tab/stack navigator's `screenLayout`, including nested navigators:

```tsx
import { GrabScope } from '@jocelinqueau/react-native-grab';
import { Tabs, useIsFocused } from 'expo-router';
// With React Navigation, import useIsFocused from '@react-navigation/native'.

function FocusedScreen({ children }) {
  const focused = useIsFocused();
  return <GrabScope active={focused}>{children}</GrabScope>;
}

const screenLayout = ({ children }) => <FocusedScreen>{children}</FocusedScreen>;

export default function TabsLayout() {
  return <Tabs screenLayout={screenLayout} />;
}
// Apply the same screenLayout to <Stack> / <Stack.Navigator> as well.
```

Grab queries the deepest focused scope containing the touch, translating its
coordinates for Fabric. Inactive parent scopes also exclude frozen descendants.
Navigation invalidates pending selections. Outside screen bounds (for example
the tab bar), inspection falls back to the app wrapper. No navigation dependency
is added to Grab, and disabled Grab renders scopes without native wrappers.

Scopes describe navigation focus, not arbitrary visual occlusion. Register custom
retained views with the appropriate `active` value too. Native modals on separate
surfaces still need an inspector hosted inside their own surface.

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
  withRealSources,      // GrabSelection => the same one, located through Metro
  selectHierarchyIndex, // walk up and down the hierarchy
  isInspectorAvailable, // false outside a dev build
  serializeForLLM,      // GrabSelection => the block above
  copyToClipboard,
  useInspector,         // the hook Grab itself uses
} from '@jocelinqueau/react-native-grab';
```

`inspectAtPoint` needs the host instance wrapping your app — it scopes the hit
test, and Fabric dereferences it without a null check.

It returns straight away, with the stack still holding Metro bundle offsets:
asking Metro to turn those into files takes anything from milliseconds to most
of a minute on a cold source map, and no UI should wait on that before showing
anything. Pass the selection through `withRealSources` before serializing it,
or use `useInspector().ensureSources()`, which does it for the current
selection and caches the result on it. The outcome lands on
`selection.symbolication` — `{ server, requested, mapped, error }` — so you can
tell "no locations" apart from "locations not asked for yet".

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
