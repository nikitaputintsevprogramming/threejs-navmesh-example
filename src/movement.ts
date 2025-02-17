import { agentGroup } from './agent';
import { navpath, SPEED } from './pathfinding';

function move(delta: number) {
    if (!navpath || navpath.length <= 0) return;

    let targetPosition = navpath[0];
    const distance = targetPosition.clone().sub(agentGroup.position);

    if (distance.lengthSq() > 0.05 * 0.05) {
        distance.normalize();
        agentGroup.position.add(distance.multiplyScalar(delta * SPEED));
    } else {
        navpath.shift();
    }
}

export { move };
