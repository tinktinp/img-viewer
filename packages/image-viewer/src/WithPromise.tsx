import {
    type ReactNode,
    use,
    Suspense,
    useEffect,
    useState,
    useCallback,
} from 'react';

export interface OnMountProps {
    onMount?: () => void;
    onUnmount?: () => void;
}

export function OnMount({ onMount, onUnmount }: OnMountProps) {
    useEffect(() => {
        onMount?.();
        return () => {
            onUnmount?.();
        };
    }, [onMount, onUnmount]);
    return null;
}

export interface WithPromiseProps {
    children?: ReactNode;
    promise?: Promise<unknown>;
    onSuspend?: () => void;
    onUnsuspend?: () => void;
}
function WithPromiseInner({
    children,
    promise,
    onUnsuspend,
}: WithPromiseProps) {
    if (promise !== undefined) {
        use(promise);
    }
    useEffect(() => {
        onUnsuspend?.();
    }, [onUnsuspend]);
    return <>{children}</>;
}
export function WithPromise(props: WithPromiseProps) {
    return (
        <Suspense fallback={<OnMount onMount={props.onSuspend} />}>
            <WithPromiseInner {...props} />
        </Suspense>
    );
}

/**
 * Hook to track loading. Uses a counter.
 * @param initialState What value to start counter at. Use 1 to start already loading.
 */
export function useLoadingTracker(initialState: number = 0) {
    const [loadingCounter, setLoadingCounter] = useState(initialState);

    const onLoadingStart = useCallback(() => {
        setLoadingCounter((c) => c + 1);
    }, []);
    const onLoadingComplete = useCallback(() => {
        setLoadingCounter((c) => c - 1);
    }, []);

    return {
        isLoading: loadingCounter > 0,
        loadingCounter,
        setLoadingCounter,
        onLoadingStart,
        onLoadingComplete,
    };
}
