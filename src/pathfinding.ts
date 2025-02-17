import { Pathfinding, PathfindingHelper } from 'three-pathfinding';
import { loader } from './level';
import { scene } from './scene';

const pathfinding = new Pathfinding();
const pathfindinghelper = new PathfindingHelper();
scene.add(pathfindinghelper);
const ZONE = 'level1';
const SPEED = 5;
let navmesh;
let groupID;
let navpath;

loader.load('./glb/demo-level-navmesh.glb', (gltf) => {
    gltf.scene.traverse((node) => {
        if (!navmesh && node.isObject3D && node.children && node.children.length > 0) {
            navmesh = node.children[0];
            pathfinding.setZoneData(ZONE, Pathfinding.createZone(navmesh.geometry));
        }
    });
});

export { pathfinding, pathfindinghelper, ZONE, SPEED, navpath, groupID };
