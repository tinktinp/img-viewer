import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useImageData } from './useImageData';
import type { ImageLibrary } from './useImageLibrary';

export interface ImgProps {
    imageLibrary: ImageLibrary;
    imageIndex: number;
    zoom?: number;
}

const Img = ({ imageLibrary, imageIndex, zoom = 1 }: ImgProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
    const imageData = useImageData(imageLibrary, imageIndex);

    // TODO Look into this: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas#scaling_for_high_resolution_displays
    const onRef = useCallback((canvas: HTMLCanvasElement) => {
        if (canvas && canvas !== canvasRef.current) {
            canvasRef.current = canvas;
            const ctx = canvas.getContext('2d');
            setCtx(ctx);
        } else if (!canvas) {
            canvasRef.current = null;
            //setCtx(null);
        }
    }, []);

    useEffect(() => {
        if (ctx) {
            const canvas = canvasRef.current as HTMLCanvasElement;

            // Get the DPR
            // const dpr = window.devicePixelRatio;
            const dpr = 1;

            // Set the "actual" size of the canvas
            canvas.width = imageData.width * dpr;
            canvas.height = imageData.height * dpr;
            canvas.style.width = `${canvas.width * zoom}px`;
            canvas.style.height = `${canvas.height * zoom}px`;
            canvas.style.imageRendering = 'pixelated';

            // Scale the context to ensure correct drawing operations
            // ctx.scale(dpr, dpr);

            // Set the "drawn" size of the canvas
            // canvas.style.width = `${imageData.width}px`;
            // canvas.style.height = `${imageData.height}px`;

            // Draw our img data
            ctx.putImageData(imageData, 0, 0);
        }
    }, [ctx, imageData, zoom]);

    return <canvas ref={onRef} />;
};

export const MemoImg = memo(Img);

export default MemoImg;
