import { objectMapper } from './objectMapper';
import type { WorkerClient } from './WorkerClient';

//exampleProcessorTable.decompress_image(2)
//exampleProcessorTable.helloWorld(1, [2]);
/////
// TODO: somehow combine with make processor, such that we can have a single table shared between consumer and worker
// function makeRequester<R, F extends (...args: any) => R>(
//     worker: Worker,
//     fnName: string,
//     fn: F,
// ) {
//     return (args: Parameters<F>) => {
//         return sendMessage({ fnName, args }, []);
//     };
// }
/////
export interface RecvMsg<T = unknown, E = unknown> {
    msgId: number;
    response?: T;
    err?: E;
}
type RequesterFn<F extends (...args: any) => any> = (
    ...params: Parameters<F>
) => Promise<ReturnType<F>>;
function makeRequester<V extends (...args: any) => any>(
    fnName: string,
    _f: V,
    workerClient: WorkerClient,
): RequesterFn<V> {
    return (...args: Parameters<V>): Promise<ReturnType<V>> => {
        return workerClient.sendMessage({ fnName, args}) as Promise<ReturnType<V>>;
    };
}

export class Requester<
    T extends Record<string, F>,
    F extends (...args: any[]) => any,
> {
    workerClient: WorkerClient;
    table: {
        [Property in keyof T]: RequesterFn<T[Property]>;
    };

    constructor(workerClient: WorkerClient, table: T) {
        this.workerClient = workerClient;
        this.table = objectMapper(table, (v, k) =>
            makeRequester(k, v, this.workerClient),
        );
    }
}
