import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { scene } from './scene';

const loader = new GLTFLoader();
loader.load('./glb/demo-level.glb', (gltf) => {
    scene.add(gltf.scene);
});

export { loader };
