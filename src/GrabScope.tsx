import React, { createContext, useContext, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import type { InspectionScope, ScopeRegistry } from './inspector/scopes';

export const GrabScopeRegistryContext = createContext<ScopeRegistry | null>(null);
const ScopeContext = createContext<InspectionScope | null>(null);
let nextScopeId = 1;

export interface GrabScopeProps {
  /** Whether this screen is focused. Use your navigator's useIsFocused(). */
  active: boolean;
  children: ReactNode;
}

/** Add through each navigator's screenLayout to exclude retained hidden screens. */
export function GrabScope({ active, children }: GrabScopeProps) {
  const registry = useContext(GrabScopeRegistryContext);
  const parent = useContext(ScopeContext);
  const view = useRef<View>(null);
  const [scope] = useState<InspectionScope>(() => ({
    id: `__react_native_grab_scope_${nextScopeId++}`,
    view: null, active, depth: (parent?.depth ?? 0) + 1, parent,
  }));

  useLayoutEffect(() => {
    if (!registry || !view.current) return;
    scope.view = view.current;
    return registry.register(scope);
  }, [registry, scope]);

  useLayoutEffect(() => { registry?.update(scope, active); }, [registry, scope, active]);

  // Disabled Grab (including production) adds no native wrapper.
  if (!registry) return <>{children}</>;
  return (
    <ScopeContext.Provider value={scope}>
      <View ref={view} testID={scope.id} collapsable={false} style={{ flex: 1 }}>
        {children}
      </View>
    </ScopeContext.Provider>
  );
}
