/** biome-ignore-all lint/a11y/noLabelWithoutControl: <explanation> */

import {
    type UseComboboxGetItemPropsOptions,
    type UseComboboxGetItemPropsReturnValue,
    type UseComboboxGetMenuPropsReturnValue,
    type UseComboboxIsOpenChange,
    type UseComboboxProps,
    useCombobox,
} from 'downshift';
import {
    Fragment,
    type JSX,
    memo,
    type ReactNode,
    type ToggleEventHandler,
    useCallback,
    useEffect,
    useState,
    useTransition,
} from 'react';
import styles from './FancySelect.module.css';

export interface BasicItem {
    id: string;
    label: string;
    inputValue?: string;
}

function filterItems<ItemType extends BasicItem>(
    items: ItemType[],
    inputValue: string,
    isOpen: boolean,
) {
    if (!isOpen || !inputValue) return items;
    return items.filter((item) =>
        item.label.toLowerCase().includes(inputValue.toLowerCase()),
    );
}

function getFolderList<ItemType extends BasicItem>(
    items: ItemType[],
    index: number,
) {
    const curItem = items[index];
    const curPieces = curItem.label.split(/[/\\]/);
    const filename = curPieces.pop();
    const depth = curPieces.length;
    let prevPieces: string[] = [];
    if (index !== 0) {
        prevPieces = items[index - 1].label.split(/[/\\]/);
    }
    prevPieces.pop();
    const common = [];
    while (
        curPieces.length &&
        prevPieces.length &&
        curPieces[0] === prevPieces[0]
    ) {
        common.push(curPieces.shift());
        prevPieces.shift();
    }
    let prefix = common.join('/');
    const folderList = curPieces.map((p, i) => {
        prefix += `/${p}`;
        return (
            <li key={prefix} data-level={i + common.length} data-is-folder>
                {p}/
            </li>
        );
    });

    return { depth, filename, folderList };
}

interface DropdownPopoverProps<ItemType extends BasicItem> {
    getMenuProps: () => UseComboboxGetMenuPropsReturnValue;
    menuId: string;
    inputItems: ItemType[];
    highlightedIndex: number;
    selectedItem: ItemType | null;
    getItemProps: (
        props: UseComboboxGetItemPropsOptions<ItemType>,
    ) => UseComboboxGetItemPropsReturnValue;
}

const DropdownPopover = memo(function DropdownPopover<
    ItemType extends BasicItem,
>(props: DropdownPopoverProps<ItemType>) {
    const {
        getMenuProps,
        menuId,
        inputItems,
        highlightedIndex,
        selectedItem,
        getItemProps,
    } = props;

    const handleToggle: ToggleEventHandler<HTMLDivElement> = useCallback(
        (e) => {
            // console.log('handleToggle: %s→%s', e.oldState, e.newState);
            if (e.newState === 'open') {
                const selectedItemNode = document.querySelector(
                    `#${menuId} [data-is-selected-item="true"]`,
                );
                selectedItemNode?.scrollIntoView();
            }
        },
        [menuId],
    );

    return (
        <div
            popover="auto"
            {...getMenuProps()}
            className={styles.menu}
            onToggle={handleToggle}
        >
            <ul>
                {inputItems.map((item, index) => {
                    const { folderList, filename, depth } = getFolderList(
                        inputItems,
                        index,
                    );
                    return (
                        <Fragment key={`fragment-${item.id}`}>
                            {folderList}
                            <li
                                data-level={depth}
                                className={[
                                    item.id === 'PLACEHOLDER'
                                        ? styles.placeHolderItem
                                        : undefined,
                                    highlightedIndex === index
                                        ? styles.highlightedItem
                                        : undefined,
                                    selectedItem?.id === item.id
                                        ? styles.selectedItem
                                        : undefined,
                                ].join(' ')}
                                key={item.id}
                                data-is-selected-item={
                                    selectedItem?.id === item.id
                                }
                                title={item.label}
                                {...getItemProps({ item, index })}
                            >
                                {filename || item.label}
                            </li>
                        </Fragment>
                    );
                })}
            </ul>
        </div>
    );
});

const comboboxInputTypes = new Set(
    Object.entries(useCombobox.stateChangeTypes).flatMap(([key, value]) => {
        if (key.startsWith('Input')) return [value];
        return [];
    }),
);

export interface FancySelectProps<ItemType extends BasicItem = BasicItem> {
    items: ItemType[];
    placeholder?: string;
    label?: ReactNode;
    defaultSelectedItem?: ItemType;
    onSelectedItemChange: UseComboboxProps<ItemType>['onSelectedItemChange'];
    onIsOpenChange?: (changes: UseComboboxIsOpenChange<ItemType>) => void;
}
function DropdownCombobox<ItemType extends BasicItem>({
    items,
    placeholder,
    label,
    onSelectedItemChange,
    defaultSelectedItem,
    onIsOpenChange,
}: FancySelectProps<ItemType>) {
    if (!defaultSelectedItem) {
        defaultSelectedItem = items[0];
    }
    const [_isPending, startTransition] = useTransition();
    const [inputItems, setInputItems] = useState(items);
    const {
        isOpen,
        inputValue,
        getToggleButtonProps,
        getLabelProps,
        getMenuProps,
        getInputProps,
        highlightedIndex,
        getItemProps,
        selectedItem,
        setInputValue,
    } = useCombobox({
        onIsOpenChange: (changes) => {
            onIsOpenChange?.(changes);
            // console.log(changes);
            const { id: menuId } = getMenuProps();
            const { id: toggleButtonId } = getToggleButtonProps();

            if (changes.isOpen) {
                setInputValue('');
                if (changes.type === useCombobox.stateChangeTypes.InputChange) {
                }
                if (comboboxInputTypes.has(changes.type)) {
                    // useCombobox.stateChangeTypes.InputChange
                    // @ts-expect-error
                    document.getElementById(menuId)?.showPopover({
                        source: document.getElementById(toggleButtonId),
                    });
                    // console.log('opened it');
                }
            } else {
                const { selectedItem } = changes;
                setInputValue(
                    selectedItem?.inputValue || selectedItem?.label || '',
                );
                setTimeout(() => {
                    document.getElementById(menuId)?.hidePopover();
                    // console.log('closed it');
                }, 0);
            }
        },
        onSelectedItemChange: (changes) => {
            onSelectedItemChange?.(changes);
        },
        items: inputItems,
        onInputValueChange: ({ inputValue }) => {
            startTransition(() => {
                setInputItems(filterItems(items, inputValue, isOpen));
            });
        },
        itemToString(item) {
            return item ? item.label : '';
        },
        defaultSelectedItem: defaultSelectedItem,
        defaultInputValue: defaultSelectedItem?.label,
    });

    const { id: menuId } = getMenuProps();

    useEffect(() => {
        startTransition(() => {
            const filteredItems = filterItems(items, inputValue, isOpen);
            if (filteredItems.length !== inputItems.length) {
                setInputItems(filteredItems);
            }
        });
    }, [inputValue, items, inputItems, isOpen]);

    return (
        <div className={styles.container}>
            <label {...getLabelProps()}>{label}</label>
            <div className={styles.combobox}>
                <input
                    style={{
                        minWidth: `${selectedItem?.inputValue?.length || selectedItem?.label.length}ch`,
                    }}
                    placeholder={placeholder}
                    {...getInputProps()}
                />
                <button
                    type="button"
                    {...getToggleButtonProps()}
                    aria-label="toggle menu"
                    popoverTarget={menuId}
                >
                    {isOpen ? <>&#8593;</> : <>&#8595;</>}
                </button>
            </div>
            <DropdownPopover
                getMenuProps={
                    getMenuProps as DropdownPopoverProps<ItemType>['getMenuProps']
                }
                menuId={menuId}
                inputItems={inputItems}
                highlightedIndex={highlightedIndex}
                selectedItem={selectedItem}
                // @ts-expect-error
                getItemProps={
                    getItemProps as DropdownPopoverProps<ItemType>['getItemProps']
                }
            />
        </div>
    );
}

type FancySelectComponent = <ItemType extends BasicItem>(
    props: FancySelectProps<ItemType>,
) => JSX.Element;

export const FancySelect: FancySelectComponent = DropdownCombobox;
