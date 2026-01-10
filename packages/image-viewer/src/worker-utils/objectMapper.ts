// type ProcessorTable<
//     F extends (...args: any) => any,
//     T extends Record<string, F>,
// > = {
//     [Property in keyof T]: ProcessorFn<T[Property]>;
// };
// type ProcessorTable2<
//     //F extends (...args: any) => any,
//     T,
// > = {
//     [Property in keyof T]: T[Property] extends (...args: any) => any
//         ? ProcessorFn<T[Property]>
//         : never;
// };
// a backup of a version where this function has type errors but users of it infer the right type!
//
// export function makeProcessors<T extends Record<string, (...args: any[]) => any>>(table: T): ProcessorTable<T[keyof T], T> {
//     const processorEntries = Object.fromEntries(Object.entries(table).map(([fnName, fn]) => {
//         return [fnName, makeProcessor(fn)];
//     }));
//     return processorEntries;
// }

export function objectMapper<
    K extends string,
    V,
    Obj extends Record<K, V>,
    Fn extends (value: any, property: K) => any,
>(
    obj: Obj,
    fn: Fn,
): {
    [Property in keyof Obj]: ReturnType<Fn>;
} {
    return Object.fromEntries(
        Object.entries(obj).map(([property, value]) => {
            return [property, fn(value, property as K)];
        }),
    ) as {
        [Property in keyof Obj]: ReturnType<Fn>;
    };
}
