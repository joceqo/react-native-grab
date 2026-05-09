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
// screens/HomeScreen.tsx:42

<TouchableOpacity
  onPress={[Function]}
  style={"padding":16,"backgroundColor":"#fff"}
/>

Component stack:
  in HomeScreen (screens/HomeScreen.tsx:42)
  in RootStack.Navigator
  in App (App.tsx:10)
```

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

## Cycling overlapping elements

When multiple elements overlap at your tap point, the most specific (smallest area) element is selected first. Tap the same spot again to cycle through all matches — the panel updates with each selection.

## License

MIT
