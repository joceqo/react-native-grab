# react-native-grab

Tap any element in your React Native app and copy it for your AI coding agent.

Inspired by [react-grab](https://github.com/aidenybai/react-grab). Built on top of the fiber-walking approach from [react-native-element-inspector](https://github.com/mabdinasira/react-native-element-inspector).

## What it does

1. Tap the **grab** button (bottom-right corner)
2. Tap any element in your app — it highlights in blue
3. A panel slides up showing the component name, file path, props, and component stack
4. Press **Copy** — the full context is on your clipboard, ready to paste into Claude, Cursor, etc.

**Copied output looks like:**

```
Element selected in the app via react-native-grab (paste to your AI):

<View  @ (77, 342) 249×49
  accessible
  onPress={[Function]}
  style={{"minWidth":200,"alignItems":"center","borderRadius":...}}
  accessibilityState={{"disabled":true}}
/>

text: "Connexion via SSO"

Component stack:
  in View
  in Pressable
  in LoginScreen
  in Login(./(auth)/login.tsx)
  in RootLayout(./_layout.tsx)
```

The output carries whatever identifies the element best: its on-screen rect, props,
**visible text**, and a component stack (with file paths for your own components). On
React ≤ 18 a `// file:line` comment is emitted too — see the React 19 note below.

## Install

```bash
npm install react-native-grab
```

You also need a clipboard package (pick one):

```bash
# Expo managed
npx expo install expo-clipboard

# Bare React Native
npm install @react-native-clipboard/clipboard
```

## Usage

Wrap your root component:

```tsx
import { Grab } from 'react-native-grab';

export default function App() {
  return (
    <Grab enabled={__DEV__}>
      <RootNavigator />
    </Grab>
  );
}
```

That's it. The **grab** button only appears when `enabled` is true, so passing `__DEV__` means zero overhead in production.

## Requirements

- React ≥ 18.0.0
- React Native ≥ 0.72.0
- Supports Old Architecture and Fabric (New Architecture)
- Works with Expo managed and bare workflow

### New Architecture + native-stack navigation (iOS)

On iOS the New Architecture renders each native-stack screen (React Navigation /
Expo Router, via `react-native-screens`) in its own native container that a plain
JS-root overlay can't capture touches over. When `react-native-screens` is installed,
grab automatically hosts its tap layer, highlighter and panel inside a
`FullWindowOverlay` so they sit above every screen. Nothing to configure — if you use
React Navigation or Expo Router you already have `react-native-screens`. On Android and
the Old Architecture grab falls back to a JS-root overlay.

### React 19 note

React 19 removed `fiber._debugSource`, so an exact `// file:line` comment can no longer
be attached to the tapped element on React 19 (grab still reads it on React ≤ 18). This
is why the copied output leans on the on-screen rect, visible text, props, and the
**component stack** — which still lists your own components with their file paths
(`in Login(./(auth)/login.tsx)`), enough for an agent to locate the code. Exact-line
recovery on React 19 would need a build-time Babel plugin (not shipped yet).

## Picking overlapping elements

When several elements overlap at your tap point, the most specific (smallest area) one is
selected. Close the panel (**×**) to tap and pick another.

## License

MIT
