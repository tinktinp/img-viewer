import {
    type MouseEvent,
    memo,
    use,
    useCallback,
    useEffect,
    useRef,
} from 'react';
import * as three from 'three';
import { Box3, BoxHelper, type Object3D } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { useSettingsOpt } from '../Settings';
import {
    addScene,
    type OffscreenRenderScene,
    removeScene,
    requestRender,
} from './offscreenCanvas';

export interface MeshProps {
    mesh: Promise<three.Mesh | undefined>;
    width: number;
    height: number;
}

const Mesh = ({ mesh: meshPromise, width, height }: MeshProps) => {
    const mesh = use(meshPromise);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { zoom } = useSettingsOpt('zoom');

    // TODO Look into this: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas#scaling_for_high_resolution_displays
    const onRef = useCallback((canvas: HTMLCanvasElement) => {
        if (canvas && canvas !== canvasRef.current) {
            canvasRef.current = canvas;
        } else if (!canvas) {
            canvasRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (mesh !== undefined) {
            const canvas = canvasRef.current as HTMLCanvasElement;
            const dest = canvas.getContext('bitmaprenderer');
            if (!dest) {
                console.warn('unable to create bitmaprenderer context!');
                return;
            }
            // Get the DPR
            // const dpr = window.devicePixelRatio;
            const dpr = 1;

            // Set the "actual" size of the canvas
            canvas.width = zoom * width * dpr;
            canvas.height = zoom * height * dpr;
            // canvas.style.width = `${canvas.width * zoom}px`;
            // canvas.style.height = `${canvas.height * zoom}px`;
            // canvas.style.imageRendering = 'pixelated';

            const scene = createScene({
                mesh: mesh.clone(),
                width,
                height,
                domNode: canvas,
                dest,
            });
            addScene(scene);
            requestRender(scene);
            return function cleanup() {
                removeScene(scene);
            };
            // Scale the context to ensure correct drawing operations
            // ctx.scale(dpr, dpr);

            // Set the "drawn" size of the canvas
            // canvas.style.width = `${imageData.width}px`;
            // canvas.style.height = `${imageData.height}px`;
        }
    }, [zoom, height, width, mesh]);

    return <canvas ref={onRef} onClick={onClick} />;
};

export const MemoMesh = memo(Mesh);

export default MemoMesh;

function onClick(e: MouseEvent<HTMLCanvasElement>) {
    e.preventDefault();
}

interface CreateSceneProps {
    mesh: three.Mesh;
    width: number;
    height: number;
    domNode: HTMLElement;
    dest: ImageBitmapRenderingContext;
}
function createScene({
    mesh,
    width,
    height,
    domNode,
    dest,
}: CreateSceneProps): OffscreenRenderScene {
    const scene = new three.Scene();
    const camera = new three.PerspectiveCamera(75, width / height, 0.1, 1000);
    const controls = new OrbitControls(camera, domNode);

    const ambientLight = new three.AmbientLight(0xffffff, 20);
    scene.add(ambientLight);

    const spotLight = new three.SpotLight(0xffffff, 500);
    spotLight.angle = Math.PI / 8;
    spotLight.penumbra = 0.5;
    camera.add(spotLight);
    mesh.add(spotLight.target);
    spotLight.position.x = -3.5;
    spotLight.position.z = -2;

    const spotLight2 = spotLight.clone();
    spotLight2.position.x = 3.5;
    mesh.add(spotLight2.target);
    camera.add(spotLight2);

    scene.add(mesh);
    scene.add(camera);

    // make sure we don't modify the geometry here, but only the mesh
    // because the mesh is cloned, but the geometry is shared so anything
    // we do to it will get done multiple times!

    // mesh.geometry.computeBoundingBox();
    // const bb = mesh.geometry.boundingBox;
    const bb = new Box3().setFromObject(mesh, true);
    const s = new three.Vector3();
    bb.getSize(s);
    // console.log(mesh.name, s);

    if (s.z > 0.1) {
        // a lot of models look better if we rotate them
        // this makes umk3 iOS characters face the camera
        mesh.rotateX((-1 / 2) * Math.PI);
    } else {
        // else don't rotate the model
        // some models are really sprites
        // TODO: make this more sophisticated, check the normal direction, etc
    }

    bb.setFromObject(mesh, true);
    bb.getSize(s);

    const largerDim = Math.max(s.x, s.y);
    if (largerDim > 0) {
        const scalingFactor = 2 / largerDim; // scaling to be "1.5" seems to fill the camera
        mesh.scale.set(scalingFactor, scalingFactor, scalingFactor);
    }

    //mesh.geometry.center();

    centerObject(mesh);

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    camera.position.z = 1.5;

    // show bounding box
    // const boxForHelper = new Box3().setFromObject(mesh, true);
    scene.add(new BoxHelper(mesh, 0xffff00));

    // show vertices
    // const pointsMaterial = new PointsMaterial({
    //     color: 0x888888,
    //     size: 4,
    //     sizeAttenuation: false,
    // });
    // const points = new Points(mesh.geometry, pointsMaterial);
    //mesh.add(points);

    const obj = {
        scene,
        camera,
        updatables: [controls],
        dest,
        mesh,
    };
    controls.addEventListener('change', () => requestRender(obj));
    return obj;
}

/**
 * centers the object, except for in the z direction where
 * it puts its edge on the z axis.
 */
function centerObject(o: Object3D) {
    o.updateWorldMatrix(true, true);

    const bb = new Box3().setFromObject(o, true);

    const center = new three.Vector3();
    bb.getCenter(center);
    const zTranslate = bb.max.z;
    const xTranslate = center.x;
    const yTranslate = center.y;

    const translationVec = new three.Vector3(
        xTranslate,
        yTranslate,
        zTranslate,
    );
    if (o.parent) {
        o.parent.worldToLocal(translationVec);
    }

    o.position.sub(translationVec);
}
