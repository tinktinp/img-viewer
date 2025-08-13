import React, {
    useMemo,
    type ClassAttributes,
    type HTMLAttributes,
    type HTMLElementType,
    type ReactNode,
} from 'react';
import type { JSX } from 'react/jsx-runtime';

export interface WithChildren {
    children?: ReactNode;
}

export interface WithClassOptions<TagNameType = string> {
    tagName?: TagNameType;
}

type ClassNames = string | string[];

export type WithClassReturnType<TagType = HTMLDivElement> = (
    props: JSX.IntrinsicAttributes &
        ClassAttributes<TagType> &
        HTMLAttributes<TagType>,
) => JSX.Element;

export function withClass<T extends HTMLElement>(
    className: ClassNames,
    options?: WithClassOptions<HTMLElementType>,
): WithClassReturnType<T>;

export function withClass<T extends Element>(
    className: ClassNames,
    options?: WithClassOptions<string>,
): WithClassReturnType<T>;

export function withClass<T extends Element = HTMLDivElement>(
    className: ClassNames,
    options: WithClassOptions<HTMLElementType | string> = {},
): WithClassReturnType<T> {
    const { tagName: HtmlTagName = 'div' } = options;

    return function WithClass({
        className: extraClassName,
        children,
        ...props
    }: JSX.IntrinsicAttributes & ClassAttributes<T> & HTMLAttributes<T>) {
        const classNames = useMemo(() => {
            let classNames = [className];
            if (Array.isArray(className)) {
                classNames = [...className];
            }
            if (extraClassName) {
                classNames.push(extraClassName);
            }
            return classNames;
        }, [className, extraClassName]);

        return React.createElement(
            HtmlTagName,
            {
                className: classNames.join(' '),
                ...props,
            },
            children,
        );
    };
}
