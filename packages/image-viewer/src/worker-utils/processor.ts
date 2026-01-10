/// <reference lib="webworker" />
declare const self: DedicatedWorkerGlobalScope;

// type Parameters<T extends (...args: any) => any> = T extends (...args: infer P) => any ? P : never;

import { objectMapper } from './objectMapper';


// type ReturnType<T extends (...args: any) => any> = T extends (...args: any) => infer R ? R : any;
type ProcessorFn<F extends (...args: any) => any> = (
    msgId: number,
    params: Parameters<F>,
) => void;
export function makeProcessor<F extends (...args: any) => any>(
    self: DedicatedWorkerGlobalScope,
    fn: F,
): ProcessorFn<F> {
    return (msgId: number, args: Parameters<F>) => {
        try {
            const response: ReturnType<F> = fn(...args);
            self.postMessage({ msgId, response });
        } catch (err) {
            self.postMessage({ msgId, err });
        }
    };
}
export function makeProcessors<
    T extends Record<string, F>,
    F extends (...args: any[]) => any,
>(table: T) {
    const processorEntries = objectMapper(table, (f) => makeProcessor<T[keyof T]>(self, f));

    return processorEntries;
}
