/**
 * This file manages an offscreen canvas and transferring bitmaps to bitmap canvases.
 */
import { type Camera, type Mesh, type Scene, WebGLRenderer } from 'three';

const offscreenCanvas = new OffscreenCanvas(300, 300);
let renderer: WebGLRenderer;

export interface Updatable {
    update(deltaTime?: number | null): boolean;
}

export interface OffscreenRenderScene {
    scene: Scene;
    camera: Camera;
    updatables: Updatable[];
    dest: ImageBitmapRenderingContext;
    mesh: Mesh;
}

const offscreenRenderMap = new Map<OffscreenRenderScene, boolean>();

export function addScene(scene: OffscreenRenderScene) {
    offscreenRenderMap.set(scene, true);
    requestRender(scene);
}

export function removeScene(scene: OffscreenRenderScene) {
    const removed = offscreenRenderMap.delete(scene);
    if (!removed) {
        console.warn('Scene was not in offscreenRenderSet!', scene);
    }
}
// export function getOffscreenCanvasGlContext(): WebGLRenderingContext {
//     if (glContext === null || glContext.isContextLost()) {
//         glContext = offscreenCanvas.getContext('webgl');
//     }
//     if (glContext === null)
//         throw new Error('Failed to get webgl context for offscreen buffer!');
//     return glContext;
// }

export function initialize() {
    if (renderer === undefined) {
        renderer = new WebGLRenderer({
            antialias: true,
            alpha: true,
            canvas: offscreenCanvas,
        });
        renderer.autoClear = false;
    }
}

export function render() {
    // console.log('render called');
    renderRequested = false;

    offscreenRenderMap.entries().forEach(([obj, needsRender]) => {
        const { scene, camera, updatables, dest } = obj;
        if (needsRender) {
            offscreenRenderMap.set(obj, false);
            updatables.forEach((u) => u.update());
            renderer.render(scene, camera);

            const bitmap = offscreenCanvas.transferToImageBitmap();
            // console.log(obj, bitmap.width, bitmap.height);
            dest.transferFromImageBitmap(bitmap);
        }
    });
}

let renderRequested = false;

export function requestRender(obj: OffscreenRenderScene) {
    // console.log('requestRender called!', obj);
    if (renderRequested === false) {
        offscreenRenderMap.set(obj, true);
        renderRequested = true;
        requestAnimationFrame(render);
    }
}

initialize();
