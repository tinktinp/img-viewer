import type { RecvMsg } from './requester';

const NotPresent = Symbol('NotPresent');
/**
 * This is used by the main thread to talk to the worker
 */

export class WorkerClient {
    worker: Worker;
    nextMsgId = 0;
    readonly promiseMap: Map<number, PromiseWithResolvers<unknown>> = new Map();

    constructor(worker: Worker) {
        this.worker = worker;
        this.enableEventHandling();
    }

    /**
     * Low level api for sending requests to worker.
     * Returns a promise that resolves or rejects when a reply is received.
     */
    sendMessage(request: unknown, transfer: Transferable[] = []) {
        const msgId = this.nextMsgId++;
        const promiseWithResolvers = Promise.withResolvers();

        this.promiseMap.set(msgId, promiseWithResolvers);

        this.worker.postMessage({ request, msgId }, transfer);

        return promiseWithResolvers.promise;
    }

    enableEventHandling() {
        this.worker.onmessage = (event) => {
            // console.log('The results from Workers:', event.data);
            const {
                msgId,
                response = NotPresent,
                err = NotPresent,
            } = event.data as RecvMsg;

            // find the msgId in our queue
            const promiseWithResolvers = this.promiseMap.get(msgId);
            if (!promiseWithResolvers) {
                console.warn(
                    'cannot find promise for msgId %s from event: %o',
                    msgId,
                    event,
                );
                return;
            }

            // delete from the queue since we got a reply
            this.promiseMap.delete(msgId);

            // either reject or resolve the promise
            if (err !== NotPresent) {
                promiseWithResolvers.reject(err);
            } else if (response !== NotPresent) {
                promiseWithResolvers.resolve(response);
            }
        };
    }
}
