import type { JSX, ReactNode } from 'react';
import styles from './GenericDetails.module.css';

export type GenericDetailsRow<T> =
    | GenericDetailsRowField<T>
    | GenericDetailsRowComponent<T>;

export interface GenericDetailsRowComponent<T> {
    label: string;
    field?: never;
    format?: never;
    component: (props: { data: T }) => JSX.Element;
}

export interface GenericDetailsRowField<T> {
    label: string;
    field: string & keyof T;
    format?: (value: any, data: T) => ReactNode;
    component?: never;
}

export interface GenericDetailsProps<T> {
    title: string;
    rows: GenericDetailsRow<T>[];
    data: T;
}

export function GenericDetails<T>({
    title,
    rows,
    data,
}: GenericDetailsProps<T>) {
    return (
        <table className={styles.imageDetails}>
            <caption>{title}</caption>
            <tbody>
                {rows.map((row, idx) => (
                    <tr key={(row.field ?? idx).toString()}>
                        <th scope="row">{row.label}</th>
                        {row.field && (
                            <td>
                                {row.format
                                    ? row.format(data[row.field], data)
                                    : (data[row.field] as ReactNode)}
                            </td>
                        )}
                        {row.component && (
                            <td>
                                <row.component data={data} />
                            </td>
                        )}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

export const numberFormatter = new Intl.NumberFormat();
export function formatNumber<T>(n: number, _data: T) {
    return numberFormatter.format(n);
}

export function defineGenericDetailsRows<T>(objs: GenericDetailsRow<T>[]): GenericDetailsRow<T>[] {
    return objs;
}

export function defineGenericDetailsRow<T>(objs: GenericDetailsRow<T>): GenericDetailsRow<T> {
    return objs;
}