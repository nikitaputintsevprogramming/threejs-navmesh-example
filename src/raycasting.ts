import * as THREE from 'three';
import { camera } from './camera';
import { scene } from './scene';
import { pathfinding, pathfindinghelper, ZONE } from './pathfinding';
import { agentGroup } from './agent';

const raycaster = new THREE.Raycaster();
const clickMouse = new THREE.Vector2();

function intersect(pos: THREE.Vector2) {
    raycaster.setFromCamera(pos, camera);
    return raycaster.intersectObjects(scene.children);
}

window.addEventListener('click', event => {
    clickMouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    clickMouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    const found = intersect(clickMouse);
    if (found.length > 0) {
        let target = found[0].point;
        const agentpos = agentGroup.position;

        const groupID = pathfinding.getGroup(ZONE, agentGroup.position);
        const closest = pathfinding.getClosestNode(agentpos, ZONE, groupID);
        const navpath = pathfinding.findPath(closest.centroid, target, ZONE, groupID);
        if (navpath) {
            pathfindinghelper.reset();
            pathfindinghelper.setPlayerPosition(agentpos);
            pathfindinghelper.setTargetPosition(target);
            pathfindinghelper.setPath(navpath);
        }
    }
});
