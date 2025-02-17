import * as THREE from 'three';
import { scene } from './scene';

const agentHeight = 1.0;
const agentRadius = 0.25;
const agent = new THREE.Mesh(new THREE.CylinderGeometry(agentRadius, agentRadius, agentHeight), new THREE.MeshPhongMaterial({ color: 'green'}));
agent.position.y = agentHeight / 2;
const agentGroup = new THREE.Group();
agentGroup.add(agent);
agentGroup.position.z = 0;
agentGroup.position.x = 0;
agentGroup.position.y = 1;
scene.add(agentGroup);

export { agentGroup };
