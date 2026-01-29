/** biome-ignore-all lint/a11y/useMediaCaption: <explanation> */
import { memo, use, useEffect, useMemo, useState } from 'react';
import { SelectableCell } from '../common-react/SelectableCell';
import type { PluginElementAudio, Wav } from '../plugin';
import { useLoadingTracker, WithPromise } from '../WithPromise';

export interface PluginAudioCellProps {
    pluginElement: PluginElementAudio;
    isSkipped: boolean;
}

export const PluginAudioCell = memo(function PluginAudioCell({
    pluginElement,
    isSkipped,
}: PluginAudioCellProps) {
    const {
        isSuspended: isLoading,
        onSuspend,
        onUnsuspend,
    } = useLoadingTracker();

    // once we finish loading, don't un-render the Audio
    const omitAudio = isSkipped && isLoading;

    return (
        <SelectableCell
            name={pluginElement.name}
            name2={pluginElement.name2}
            value={pluginElement.id}
            isLoading={isLoading}
        >
            {!omitAudio && (
                <AudioLoaderComponent
                    pluginElement={pluginElement}
                    onSuspend={onSuspend}
                    onUnsuspend={onUnsuspend}
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

interface AudioLoaderComponentProps {
    pluginElement: PluginElementAudio;
    onSuspend?: () => void;
    onUnsuspend?: () => void;
}

const AudioLoaderComponent = memo(function AudioLoaderComponent({
    pluginElement,
    onSuspend,
    onUnsuspend,
}: AudioLoaderComponentProps) {
    const wav = useMemo(() => {
        try {
            return Promise.resolve(pluginElement.toWav?.());
        } catch (e) {
            console.log('failed to create Audio!', pluginElement, e);
            return Promise.resolve(undefined);
        }
    }, [pluginElement]);

    return (
        <WithPromise
            promise={wav}
            onSuspend={onSuspend}
            onUnsuspend={onUnsuspend}
        >
            <Audio wav={wav} />
        </WithPromise>
    );
});

function useUrl(
    buffer: ArrayBufferView<ArrayBuffer> | ArrayBuffer,
    options?: BlobPropertyBag,
): { url: string | undefined } {
    const [url, setUrl] = useState<string | undefined>(undefined);
    useEffect(() => {
        if (buffer) {
            const url = URL.createObjectURL(new Blob([buffer], options));
            setUrl(url);
            return function cleanup() {
                URL.revokeObjectURL(url);
            };
        }
    }, [buffer, options]);
    return { url };
}

const options = {
    type: 'audio/wave',
};
const Audio = memo(function Audio({
    wav: wavPromise,
}: {
    wav: Promise<Wav | undefined>;
}) {
    const wav = use(wavPromise);

    const { url } = useUrl(wav as ArrayBufferView<ArrayBuffer>, options);
    return <audio controls src={url} />;
});
