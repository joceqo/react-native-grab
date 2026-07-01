"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useLayoutSnapshot = useLayoutSnapshot;
const react_1 = require("react");
const FiberAdapter_1 = require("../fiber/FiberAdapter");
const buildLayoutSnapshot_1 = require("../utils/buildLayoutSnapshot");
const useDebouncedCallback_1 = require("./useDebouncedCallback");
function useLayoutSnapshot() {
    const [snapshot, setSnapshot] = (0, react_1.useState)([]);
    const [isBuilding, setIsBuilding] = (0, react_1.useState)(false);
    const snapshotRef = (0, react_1.useRef)([]);
    const buildSnapshot = (0, react_1.useCallback)(async () => {
        const root = FiberAdapter_1.FiberAdapter.getFiberRoot();
        if (!root)
            return 0;
        setIsBuilding(true);
        try {
            const elements = await (0, buildLayoutSnapshot_1.buildLayoutSnapshot)(root);
            snapshotRef.current = elements;
            setSnapshot(elements);
            return elements.length;
        }
        finally {
            setIsBuilding(false);
        }
    }, []);
    const invalidate = (0, useDebouncedCallback_1.useDebouncedCallback)(buildSnapshot, 300);
    return { snapshot, isBuilding, buildSnapshot, invalidate };
}
//# sourceMappingURL=useLayoutSnapshot.js.map