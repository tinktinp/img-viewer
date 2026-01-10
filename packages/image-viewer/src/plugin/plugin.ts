/**
 * This is a simpler version of `PluginItem` that omits `EventTarget`
 * and `loadElements`.
 *
 * The idea is you might have a function that takes in just these props
 * and constructs a full PluginItem (or subclass thereof), and so having
 * these props by themselves is handy and avoids a lot of `Omit<>`.
 */
export interface PluginItemProps {
    id: string;
    label: string;
}

/**
 * This interface is meant to be extended.
 *
 * This interface represents a top level item returned from a plugin.
 * Usually that is a file, but it might be a logical subsection of a file
 * for things like ROMs.
 */
export interface PluginItem extends PluginItemProps, PluginItemEventHandlers {
    isPluginItem: true;

    /**
     * Requests that the "elements" by loaded.
     * The elements may be loaded asyncly.
     *
     * Before calling this method, be sure to add an event listener to the
     * `elements-loaded` and `elements-finished-loading` events.
     *
     * You'll usually receive one or more `elements-loaded` events, followed
     * by one `elements-finished-loading` event.
     *
     * This allows the plugin to deliver the elements in batches instead of waiting
     * for all elements to be loaded.
     *
     * Note that the elements themselves have `async` methods to call to actually
     * get their main data. This is mainly about getting the meta data. Uncompressing
     * and converting image formats, for example, may not happen until `.toPng()` is called.
     *
     * TODO: add error event.
     * TODO: add cancel method.
     */
    loadElements: () => void;
    // cancelLoadElements: (h: LoadElementsHandle) => void;
}

export class ElementsLoadedEvent extends Event {
    pluginElements: PluginElement[];

    constructor(pluginElements: PluginElement[]) {
        super('elements-loaded');
        this.pluginElements = pluginElements;
    }
}

export class ElementsFinishedLoading extends Event {
    constructor() {
        super('elements-finished-loading');
    }
}

export class BasePluginItem extends EventTarget {
    readonly isPluginItem: true = true;
    protected dispatchElementsLoaded(pluginElements: PluginElement[]) {
        this.dispatchEvent(new ElementsLoadedEvent(pluginElements));
    }

    protected dispatchElementsFinishedLoading() {
        this.dispatchEvent(new ElementsFinishedLoading());
    }
}

export interface PluginItemEventHandlersEventMap {
    'elements-loaded': ElementsLoadedEvent;
    'elements-finished-loading': ElementsFinishedLoading;
}

export interface PluginItemEventHandlers extends EventTarget {
    addEventListener<K extends keyof PluginItemEventHandlersEventMap>(
        type: K,
        listener: (
            this: GlobalEventHandlers,
            ev: PluginItemEventHandlersEventMap[K],
        ) => any,
        options?: boolean | AddEventListenerOptions,
    ): void;
    addEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions,
    ): void;
    removeEventListener<K extends keyof PluginItemEventHandlersEventMap>(
        type: K,
        listener: (
            this: GlobalEventHandlers,
            ev: PluginItemEventHandlersEventMap[K],
        ) => any,
        options?: boolean | EventListenerOptions,
    ): void;
    removeEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | EventListenerOptions,
    ): void;
}

// export class LoadElementsHandle {}

export interface PluginDetailsRow {
    key: string;
    header: string;
    data: string; // TODO: allow nested tables
}
/**
 * Details for the sidebar
 */
export interface PluginDetailsObj {
    caption: string;
    row: PluginDetailsRow[];
}

/**
 * This represents an individual displayable element.
 * For IMG files (which are collections of sprites), each
 * image, palette, and animation gets its own `PluginElement`.
 */
export type PluginElement =
    | PluginElementImage
    | PluginElementPalette
    | PluginElementAnimation
    | PluginElementSection;

export interface PluginElementBase {
    type: PluginElementType;
    /**
     * A unique id, to use for React `key`s or the `value` prop of checkboxes, etc.
     * 
     * This `id` is unique before applying any settings.
     * 
     * I may add a second `id` later on to express "a palette with xrgba format applied"
     * or "an image with palette xyz_p (in format xrgba)", where different settings should
     * have different ids. But for this one, they should be the same.
     */
    id: string;
    /**
     * The id of a section element to group this element under.
     * The special id `root` should be used for the top level elements (usually sections);
     */
    sectionId: string;
    name: string;
    name2?: string;
    noticeMessage?: string;
    details?: () => Promise<PluginDetailsObj>;
}
export type PluginElementType = 'image' | 'palette' | 'animation' | 'section';

/**
 * This is a way of grouping other elements together.
 */
export interface PluginElementSection extends PluginElementBase {
    type: 'section';
}

export interface PluginElementImage extends PluginElementBase {
    type: 'image';
    /** width, including any padding */
    width?: number;
    height?: number;
    /** the amount of padding included in the width. (We could offer to trim it.) */
    padding?: number;
    toPng?: (setting?: unknown) => Promise<ArrayBufferLike>;
}

export interface PluginElementPalette extends PluginElementBase {
    type: 'palette';
    paletteSize: number;
    rgba: (setting?: unknown) => Promise<number[][]>;
    //toAct
}

export interface PluginElementAnimation extends PluginElementBase {
    type: 'animation';
    toPng?: () => Promise<ArrayBufferLike>;
    toGif?: () => Promise<ArrayBufferLike>;
}

/**
 * An interface for a "Plugin", which is just a way to modularize
 * the supported file types.
 */
export interface Plugin<PI extends PluginItem = PluginItem> {
    /**
     * This is called with the array of files that were uploaded
     * by the user. It is expected to return an array of objects
     * that each extend the `PluginItem` interface.
     *
     * For many plugins, this is just a way of filtering or
     * claiming files, i.e. specifying which files are supported.
     *
     * For some plugins, a single uploaded file broken down
     * into multiple items. A plugin for a rom might break
     * it down by character or animation or background, etc.
     *
     * @param files A list of files uploaded by the user.
     * @returns A list of Items to show in the File Chooser.
     *          This may map 1 to 1 with the supported files,
     *          but it does not have to.
     */
    getItemsFromFiles: (files: File[]) => Promise<PI[]> | PI[];
}
