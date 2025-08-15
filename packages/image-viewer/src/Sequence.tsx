import { memo, useEffect, useMemo, useRef } from 'react';
import type { ImageLibrary } from './useImageLibrary';

import Img from './Img';

import styles from './Sequence.module.css';
import type { SequenceScript } from './parse-image-header';
import { useSettings } from './Settings';

export interface ImgProps {
    imageLibrary: ImageLibrary;
    sequenceIndex: number;
    zoom?: number;
}

function calculateDimsAndPadding(sequence: SequenceScript) {
    let paddingLeft = 0;
    let paddingTop = 0;
    let width = 0;
    let height = 0;

    sequence.entries.forEach((entry) => {
        const h = entry.image?.imageHeader;
        if (!h) return;

        const cumX = sequence.startX + entry.deltaX;
        const cumY = sequence.startY + entry.deltaY;

        const xOffset = -h.xOffset + cumX;
        const yOffset = -h.yOffset + cumY;

        if (-xOffset > paddingLeft) paddingLeft = -xOffset;
        if (-yOffset > paddingTop) paddingTop = -yOffset;

        // left: `${(-h.xOffset + startX + deltaX) * zoom}px`,
        // top:  `${(-h.yOffset + startY + deltaY) * zoom}px`,

        if (h.xSize + xOffset > width) width = h.xSize + xOffset;
        if (h.ySize + yOffset > height) height = h.ySize + yOffset;
    });

    return {
        paddingLeft,
        paddingTop,
        width,
        height,
    };
}

const Sequence = ({ imageLibrary, sequenceIndex, zoom = 1 }: ImgProps) => {
    const { animation } = useSettings();
    const ref = useRef<HTMLDivElement>(null);
    const sequence = imageLibrary.sequences[sequenceIndex];
    useEffect(() => {
        if (!ref.current) return;
        const el = ref.current;
        let cancelled = false;

        if (!animation) {
            // show all frames if animation is off
            Array.from(el.children).forEach((c) => {
                if (!(c instanceof HTMLElement)) return;
                c.style.display = 'block';
            });
        }

        let start: number;
        let lastFrame = -1;
        const tickToFrame: number[] = [];
        let totalTicks = 0;
        sequence.entries.forEach((entry, frameNo) => {
            totalTicks += entry.ticks;
            for (let i = 0; i < entry.ticks; i++) {
                tickToFrame.push(frameNo);
            }
        });
        //const fps = 54;
        const fps = 10;
        const msPerTick = Math.floor(1000 / fps);

        function step(timestamp: number) {
            if (cancelled || !animation) return;
            if (!el.isConnected) return;

            if (start === undefined) {
                start = timestamp;
            }
            const elapsed = timestamp - start;
            // const frames = el.children.length;
            const tick = Math.floor(elapsed / msPerTick) % totalTicks;
            const frame = tickToFrame[tick];
            if (frame !== lastFrame) {
                lastFrame = frame;
                Array.from(el.children).forEach((c, i) => {
                    if (!(c instanceof HTMLElement)) return;
                    if (i === frame) {
                        c.style.display = 'block';
                    } else {
                        c.style.display = 'none';
                    }
                });
            }
            requestAnimationFrame(step);
        }
        if (animation) requestAnimationFrame(step);
        return () => {
            cancelled = true;
        };
    }, [sequence, animation]);

    if (!sequence) return null;

    const dims2 = calculateDimsAndPadding(sequence);
    const containerStyle = {
        marginLeft: `${dims2.paddingLeft * zoom}px`,
        marginTop: `${dims2.paddingTop * zoom}px`,
        width: `${dims2.width * zoom}px`,
        height: `${dims2.height * zoom}px`,
    };

    const { startX, startY } = sequence;
    return (
        <div ref={ref} className={styles.container} style={containerStyle}>
            {sequence.entries.map((entry, i) => {
                const h = entry.image?.imageHeader;
                if (!h) return;

                const { deltaX, deltaY } = entry;
                const itemStyle = {
                    left: `${(-h.xOffset + startX + deltaX) * zoom}px`,
                    top: `${(-h.yOffset + startY + deltaY) * zoom}px`,
                };
                return (
                    <div
                        key={`${i.toString()}_${entry.itemIndex.toString}`}
                        className={styles.entry}
                        style={itemStyle}
                        data-start={`${sequence.startX},${sequence.startY}`}
                        data-delta={`${entry.deltaX},${entry.deltaY}`}
                        data-offset={`${h.xOffset},${h.yOffset}`}
                    >
                        <Img
                            imageLibrary={imageLibrary}
                            imageIndex={entry.itemIndex}
                            zoom={zoom}
                            type={'png'}
                        />
                    </div>
                );
            })}
        </div>
    );
};

export const MemoSequence = memo(Sequence);

export default MemoSequence;
