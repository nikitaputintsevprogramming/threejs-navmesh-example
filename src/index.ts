import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Pathfinding, PathfindingHelper } from 'three-pathfinding';
import { MeshLine, MeshLineMaterial } from 'three.meshline';

// SCENE
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa8def0);

// CAMERA
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 2000); // Increased far clipping plane
camera.position.y = 10;
camera.position.z = 10;
camera.position.x = 33;

// RENDERER
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true

// ORBIT CAMERA CONTROLS
const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.mouseButtons = {
	MIDDLE: THREE.MOUSE.ROTATE,
	RIGHT: THREE.MOUSE.PAN
}
orbitControls.enableDamping = true
orbitControls.enablePan = true
orbitControls.minDistance = 5
orbitControls.maxDistance = 60
orbitControls.maxPolarAngle = Math.PI / 2 - 0.05 // prevent camera below ground
orbitControls.minPolarAngle = Math.PI / 4        // prevent top down view
orbitControls.update();

// LIGHTS
const dLight = new THREE.DirectionalLight('white', 0.8);
dLight.position.x = 20;
dLight.position.y = 30;
dLight.castShadow = true;
dLight.shadow.mapSize.width = 4096;
dLight.shadow.mapSize.height = 4096;
const d = 35;
dLight.shadow.camera.left = - d;
dLight.shadow.camera.right = d;
dLight.shadow.camera.top = d;
dLight.shadow.camera.bottom = - d;
scene.add(dLight);

const aLight = new THREE.AmbientLight('white', 0.5);
scene.add(aLight);

// ATTACH RENDERER
document.body.appendChild(renderer.domElement);

// RESIZE HANDLER
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onWindowResize);

// AGENT
const agentHeight = 1.0;
const agentRadius = 0.25;
const agent = new THREE.Mesh(new THREE.CylinderGeometry(agentRadius, agentRadius, agentHeight), new THREE.MeshPhongMaterial({ color: 'green'}));
agent.position.y = agentHeight / 2;
const agentGroup = new THREE.Group();
agentGroup.add(agent);
agentGroup.position.z = 0;
agentGroup.position.x = 20;
agentGroup.position.y = 1;
scene.add(agentGroup);

// LOAD LEVEL
const loader = new GLTFLoader();
loader.load('./glb/map-level.glb', (gltf: GLTF) => {
    scene.add(gltf.scene);
});

// INITIALIZE THREE-PATHFINDING
const pathfinding = new Pathfinding();
const pathfindinghelper = new PathfindingHelper();
scene.add(pathfindinghelper);
const ZONE = 'level1';
const SPEED = 5;
let navmesh;
let groupID;
let navpath;
loader.load('./glb/map-level-navmesh.glb', (gltf: GLTF) => {
    // scene.add(gltf.scene);
    gltf.scene.traverse((node) => {
        if (!navmesh && node.isObject3D && node.children && node.children.length > 0) {
            navmesh = node.children[0];
            pathfinding.setZoneData(ZONE, Pathfinding.createZone(navmesh.geometry));
        }
    });
});


// RAYCASTING
const raycaster = new THREE.Raycaster(); // create once
const clickMouse = new THREE.Vector2();  // create once

function intersect(pos: THREE.Vector2) {
    raycaster.setFromCamera(pos, camera);
    return raycaster.intersectObjects(scene.children);
}
window.addEventListener('click', event => {
    // THREE RAYCASTER
    clickMouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    clickMouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  
    const found = intersect(clickMouse);
    if (found.length > 0) {
        let target = found[0].point;
        const agentpos = agentGroup.position;
        // console.log(`agentpos: ${JSON.stringify(agentpos)}`);
        // console.log(`target: ${JSON.stringify(target)}`);

        groupID = pathfinding.getGroup(ZONE, agentGroup.position);
        // find closest node to agent, just in case agent is out of bounds
        const closest = pathfinding.getClosestNode(agentpos, ZONE, groupID);
        navpath = pathfinding.findPath(closest.centroid, target, ZONE, groupID);
        if (navpath) {
            // console.log(`navpath: ${JSON.stringify(navpath)}`);
            pathfindinghelper.reset();
            pathfindinghelper.setPlayerPosition(agentpos);
            pathfindinghelper.setTargetPosition(target);
            pathfindinghelper.setPath(navpath);
        }
    }
})

// MOVEMENT ALONG PATH
function move ( delta: number ) {
    if ( !navpath || navpath.length <= 0 ) return

    let targetPosition = navpath[ 0 ];
    const distance = targetPosition.clone().sub( agentGroup.position );

    if (distance.lengthSq() > 0.05 * 0.05) {
        distance.normalize();
        // Move player to target
        agentGroup.position.add( distance.multiplyScalar( delta * SPEED ) );
    } else {
        // Remove node from the path we calculated
        navpath.shift();
    }
}

// DRAW PATH LINE
const pathLineMaterial = new MeshLineMaterial({ color: 0xff0000, lineWidth: 0.5 });
let pathLineGeometry = new THREE.BufferGeometry();
let pathLine: THREE.Mesh | null = null;
let lineDrawSpeed = 1; // Speed control for line drawing
let lineDrawProgress = 0;

function drawPathLine(delta: number) {
    if (!navpath || navpath.length <= 0) return;

    lineDrawProgress += delta * lineDrawSpeed;
    const points = [agentGroup.position.clone()];
    let distanceCovered = 0;

    for (let i = 0; i < navpath.length; i++) {
        const segment = navpath[i].clone().sub(points[points.length - 1]);
        const segmentLength = segment.length();

        if (distanceCovered + segmentLength > lineDrawProgress) {
            const remainingDistance = lineDrawProgress - distanceCovered;
            const interpolatedPoint = points[points.length - 1].clone().add(segment.normalize().multiplyScalar(remainingDistance));
            points.push(interpolatedPoint);
            break;
        } else {
            points.push(navpath[i].clone());
            distanceCovered += segmentLength;
        }
    }

    const line = new MeshLine();
    line.setPoints(points.flatMap(p => [p.x, p.y, p.z]));

    if (pathLine) {
        scene.remove(pathLine);
    }

    pathLine = new THREE.Mesh(line, pathLineMaterial);
    scene.add(pathLine);
}


// UI BUTTONS
const uiContainer = document.createElement('div');
uiContainer.className = 'controls-container';
uiContainer.style.position = 'absolute';
uiContainer.style.top = '10px';
uiContainer.style.left = '10px';
uiContainer.style.zIndex = '100';
uiContainer.style.display = 'flex';
uiContainer.style.flexDirection = 'column'; // Добавляем, чтобы кнопки были в столбик
uiContainer.style.gap = '10px';

document.body.appendChild(uiContainer);

const createButton = (text, onClick) => {
    const button = document.createElement('button');
    button.innerText = text;
    button.style.margin = '5px';
    button.style.padding = '10px';
    button.style.cursor = 'pointer';
    button.onclick = onClick;
    uiContainer.appendChild(button);
};

let canSelectPoint = false;
let canStartPathDrawing = false;
let canMoveAgent = false;

// Флаги для управления движением и отрисовкой пути
let isMovingAgent = false;
let isDrawingPath = false;

// Изменяем кнопки, чтобы запускать соответствующие процессы
createButton('Выбор точки', () => {
    canSelectPoint = true;
    canStartPathDrawing = false;
    canMoveAgent = false;
    isMovingAgent = false;
    isDrawingPath = false;
});

createButton('Запуск анимации маршрута', () => {
    if (navpath && navpath.length > 0) {
        isDrawingPath = true;
        isMovingAgent = false;
        canStartPathDrawing = true;
        canSelectPoint = false;
        canMoveAgent = false;
        lineDrawProgress = 0;
    }
});

createButton('Движение агента', () => {
    if (navpath && navpath.length > 0) {
        isMovingAgent = true;
        isDrawingPath = false;
        canMoveAgent = true;
        canStartPathDrawing = false;
        canSelectPoint = false;
    }
});

// Вектор для хранения положения мыши
const mouse = new THREE.Vector2();

// Для хранения исходного материала, чтобы вернуть его обратно после окончания выделения
let originalMaterial = null;

// Create a sprite for the cursor
const spriteMap = new THREE.TextureLoader().load('./glb/cursor.png'); // Replace with your sprite path
const spriteMaterial = new THREE.SpriteMaterial({ map: spriteMap });
const sprite = new THREE.Sprite(spriteMaterial);
sprite.scale.set(0.5, 0.5, 1); // Adjust the scale as needed
scene.add(sprite);

// Слушатель события движения мыши
window.addEventListener('mousemove', (event) => {
    // Нормализуем координаты мыши
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Обновляем луч
    raycaster.setFromCamera(mouse, camera);

    // Проверяем пересечение с объектами в сцене
    const intersects = raycaster.intersectObjects(scene.children, true); // Используем true для глубокого поиска

    // Сбрасываем выделение, если ничего не найдено
    if (intersects.length > 0) {
        const intersectedObject = intersects[0].object;
        if (intersectedObject.name === 'Lift1' && originalMaterial === null) {
            // Запоминаем исходный материал
            originalMaterial = (intersectedObject as THREE.Mesh).material;

            // Меняем материал на выделенный
            (intersectedObject as THREE.Mesh).material = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Красный для выделения
        } else if (intersectedObject.name !== 'Lift1' && originalMaterial !== null) {
            // Если курсор переместился на другой объект, восстанавливаем исходный материал
            const lift1Object = scene.getObjectByName('Lift1');
            if (lift1Object) {
                (lift1Object as THREE.Mesh).material = originalMaterial;
                originalMaterial = null; // Сбрасываем
            }
        }
    } else {
        // Если ничего не найдено, восстанавливаем исходный материал
        if (originalMaterial) {
            const lift1Object = scene.getObjectByName('Lift1');
            if (lift1Object) {
                (lift1Object as THREE.Mesh).material = originalMaterial;
                originalMaterial = null; // Сбрасываем
            }
        }
    }

    // Update sprite position
    const intersectsSprite = raycaster.intersectObjects(scene.children, true);
    if (intersectsSprite.length > 0) {
        sprite.position.copy(intersectsSprite[0].point);
    }
});

// Слушатель события клика
window.addEventListener('click', (event) => {
    // Нормализуем координаты мыши
    clickMouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    clickMouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Обновляем луч
    raycaster.setFromCamera(clickMouse, camera);

    // Проверяем пересечение с объектами в сцене
    const intersects = raycaster.intersectObjects(scene.children, true); // Используем true для глубокого поиска

    if (intersects.length > 0) {
        const target = intersects[0].point;
        const agentpos = agentGroup.position;

        groupID = pathfinding.getGroup(ZONE, agentGroup.position);
        // find closest node to agent, just in case agent is out of bounds
        const closest = pathfinding.getClosestNode(agentpos, ZONE, groupID);
        navpath = pathfinding.findPath(closest.centroid, target, ZONE, groupID);
        if (navpath) {
            pathfindinghelper.reset();
            pathfindinghelper.setPlayerPosition(agentpos);
            pathfindinghelper.setTargetPosition(target);
            pathfindinghelper.setPath(navpath);
        }
    }
});

// Обновленный игровой цикл
const clock = new THREE.Clock();
const gameLoop = () => {
    const delta = clock.getDelta();
    if (isMovingAgent) move(delta);
    if (isDrawingPath) drawPathLine(delta);
    orbitControls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(gameLoop);
};

gameLoop();