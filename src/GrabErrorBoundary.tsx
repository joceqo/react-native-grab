import React, { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback: ReactNode;
}

interface State {
  hasError: boolean;
}

export class GrabErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.warn(
      '[react-native-grab] inspector crashed; disabling overlay so the host app keeps running.',
      error,
    );
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
