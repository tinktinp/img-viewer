import {
    type ReactNode,
    Suspense,
    use,
    useCallback,
    useEffect,
    useState,
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

export type ImgLoadingState = 'not-started' | 'loading' | 'complete' | 'error';
/**
 * Hook to track loading.
 */
export function useLoadingTracker() {
    const [imgLoadingState, setImgLoadingState] =
        useState<ImgLoadingState>('not-started');

    const [isSuspended, setIsSuspended] = useState(false);

    const onSuspend = useCallback(() => {
        setIsSuspended(true);
    }, []);
    const onUnsuspend = useCallback(() => {
        setIsSuspended(false);
    }, []);

    const imgRefFn = useCallback((imgEl: HTMLImageElement) => {
        const onImgLoadComplete = () => {
            setImgLoadingState('complete');
        };
        const onImgLoadError = () => {
            setImgLoadingState('error');
            console.log('img error');
        };

        if (imgEl) {
            imgEl.addEventListener('load', onImgLoadComplete);
            imgEl.addEventListener('error', onImgLoadError);

            if (imgEl.complete) {
                setImgLoadingState('complete');
            }
            return function cleanup() {
                imgEl.removeEventListener('load', onImgLoadComplete);
                imgEl.removeEventListener('error', onImgLoadError);
            };
        } else {
            setImgLoadingState('not-started');
        }
    }, []);

    return {
        isLoading:
            isSuspended ||
            imgLoadingState === 'not-started' ||
            imgLoadingState === 'loading',
        isSuspended,
        onSuspend,
        onUnsuspend,
        imgRef: imgRefFn,
        imgLoadingState,
    };
}
