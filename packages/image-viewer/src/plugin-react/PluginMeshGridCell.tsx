import { memo, useMemo } from 'react';
import CanvasMesh from '../common-react/CanvasMesh';
import { SelectableCell } from '../common-react/SelectableCell';
import type { PluginElementMesh } from '../plugin';
import { useLoadingTracker, WithPromise } from '../WithPromise';

const defaultWidth = 300;
const defaultHeight = 300;

export interface PluginMeshGridCellProps {
    pluginElement: PluginElementMesh;
    isSkipped: boolean;
}

export const PluginMeshGridCell = memo(function PluginMeshGridCell({
    pluginElement,
    isSkipped,
}: PluginMeshGridCellProps) {
    const width = defaultWidth;
    const height = defaultHeight;
    const { isSuspended: isLoading, onSuspend, onUnsuspend } = useLoadingTracker();

    // once we finish loading, don't un-render the mesh
    const omitMesh = isSkipped && isLoading;

    return (
        <SelectableCell
            name={pluginElement.name}
            name2={pluginElement.name2}
            value={pluginElement.id}
            width={width}
            height={height}
            isLoading={isLoading}
        >
            {!omitMesh && (
                <MeshLoaderComponent
                    pluginElement={pluginElement}
                    onSuspend={onSuspend}
                    onUnsuspend={onUnsuspend}
                    width={width}
                    height={height}
                />
            )}
            {pluginElement.noticeMessage && (
                <div style={{ backgroundColor: 'white' }}>
                    {pluginElement.noticeMessage}
                </div>
            )}
        </SelectableCell>
    );
});

interface MeshLoaderComponentProps {
    pluginElement: PluginElementMesh;
    width: number;
    height: number;
    onSuspend?: () => void;
    onUnsuspend?: () => void;
}

const MeshLoaderComponent = memo(function MeshLoaderComponent({
    pluginElement,
    width,
    height,
    onSuspend,
    onUnsuspend,
}: MeshLoaderComponentProps) {
    const mesh = useMemo(() => {
        try {
            return Promise.resolve(pluginElement.toMesh?.());
        } catch (e) {
            console.log('failed to create mesh!', pluginElement, e);
            return Promise.resolve(undefined);
        }
    }, [pluginElement]);

    return (
        <WithPromise
            promise={mesh}
            onSuspend={onSuspend}
            onUnsuspend={onUnsuspend}
        >
            <CanvasMesh mesh={mesh} width={width} height={height} />
        </WithPromise>
    );
});
