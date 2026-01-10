import { makeProcessors } from './worker-utils/processor';
import { workerExport } from './worker-export';

const processors = makeProcessors(workerExport);
type Processors = typeof processors;

interface Message<F extends keyof Processors> {
    msgId: number;
    request: {
        fnName: F;
        args: Parameters<Processors[F]>;
    };
}

self.onmessage = <F extends keyof Processors>(event: MessageEvent) => {
    const {
        msgId,
        request: { fnName, args },
    } = event.data as Message<F>;

    if (fnName in processors) {
        // @ts-expect-error
        processors[fnName](msgId, args);
    } else {
        console.warn('Received request for unknown method!', event);
    }
};
