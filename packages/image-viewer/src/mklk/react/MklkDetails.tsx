import styles from './MklkDetails.module.css';
import type {
    MklkFileHeader,
    MklkImage,
    MklkSelectionObj,
    SpriteHeader,
} from '../MklkTypes';
import {
    defineGenericDetailsRows,
    formatNumber,
    GenericDetails,
} from '../../GenericDetails';
import type { MklkRef } from './MklkImages';

export function MklkDetails({
    selectionObj,
}: {
    selectionObj: MklkSelectionObj;
}) {
    if (selectionObj.image) {
        return <MklkImageDetails image={selectionObj.image} />;
    } else if (selectionObj.sprite) {
        return <MklkSpriteDetails sprite={selectionObj.sprite} />;
    }
}

export function MklkImageDetails({ image }: { image: MklkImage }) {
    const rows = defineGenericDetailsRows<MklkImage>([
        {
            label: 'Name',
            field: 'name',
        },
        {
            label: 'Width',
            field: 'width',
        },
        {
            label: 'Height',
            field: 'height',
        },
        {
            label: 'Image Type',
            field: 'imageType',
        },
        {
            label: 'Data Type',
            field: 'dataType',
        },
        {
            label: 'Block Header',
            field: 'blockHeader',
        },
        {
            label: 'Block Size',
            field: 'blockSize',
            format: formatNumber,
        },
        {
            label: 'Data Header',
            field: 'dataHeader',
        },
        {
            label: 'Data Size',
            field: 'dataSize',
            format: formatNumber,
        },
    ]);

    return <GenericDetails title="Image Details" data={image} rows={rows} />;
}

export function MklkSpriteDetails({ sprite }: { sprite: SpriteHeader }) {
    const rows = defineGenericDetailsRows<SpriteHeader>([
        {
            label: 'Index',
            field: 'index',
        },
        {
            label: 'Xpos',
            field: 'xpos',
        },
        {
            label: 'Ypos',
            field: 'ypos',
        },
        {
            label: 'Width',
            field: 'width',
        },
        {
            label: 'Height',
            field: 'height',
        },

        {
            label: 'Width2',
            field: 'width2',
        },
        {
            label: 'Height2',
            field: 'height2',
        },
        {
            label: 'Unknown2',
            field: 'unknown2',
        },
        {
            label: 'Unknown3',
            field: 'unknown3',
        },
        {
            label: '0x803f',
            field: 'unk_803f',
            format: (d: number) => `0x${d.toString(16)}`,
        },
        {
            label: 'Unknown4',
            field: 'unknown4',
        },
        {
            label: 'Unknown5',
            field: 'unknown5',
        },
        {
            label: 'Sheet Index',
            field: 'sheetIndex',
        },
        {
            label: 'Unknown7',
            field: 'unknown7',
        },
        {
            label: 'Unknown8',
            field: 'unknown8',
        },
    ]);

    return <GenericDetails title="Sprite Details" data={sprite} rows={rows} />;
}

export function MklkFileDetails({
    fileHeader,
    filename,
    spriteSection: { spriteSectionHeader },
}: MklkRef) {
    const rows = defineGenericDetailsRows<MklkFileHeader>([
        {
            label: 'Name',
            // \u{200B} is a zero width breaking space, to let long path names word wrap on the slash
            component: () => (
                <>{filename.replaceAll(/\/|\\/g, '\u{200B}/\u{200B}')}</>
            ),
        },
        {
            label: 'Total Size',
            field: 'totalSize',
            format: formatNumber,
        },
        {
            label: 'Sprite Section Size',
            field: 'spriteSize',
            format: formatNumber,
        },
        {
            label: 'List Header',
            field: 'listHeader',
        },
        {
            label: 'List Size',
            field: 'listSize',
            format: formatNumber,
        },
        {
            label: 'List Type',
            field: 'listTypeHeader',
        },
        {
            label: 'Sprite Unknown0',
            component: () => <>{spriteSectionHeader.unknown0}</>,
        },
        {
            label: 'Sprite Unknown1',
            component: () => <>{spriteSectionHeader.unknown1}</>,
        },
        {
            label: 'Sprite Count',
            component: () => <>{spriteSectionHeader.spriteCount}</>,
        },
        {
            label: 'Sprite Padding',
            component: () => <>{spriteSectionHeader.padding0}</>,
        },
    ]);

    return <GenericDetails title="Sprite File" data={fileHeader} rows={rows} />;
}
