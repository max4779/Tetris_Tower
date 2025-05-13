// src/main.js
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

let scene, camera, renderer;
let world;
let blocks = [];
let blockBodies = [];
let groundBody;
let nextBlockY = 5;
let pendingBlock = null;
let pendingBody = null;
const blockSize = 0.3;
const blockStartY = 3;
let wallDepth = blockSize + 0.2;  // 깊이를 블록 크기보다 0.05 크게 설정
let wallHeight = 8;             // 벽의 높이 (고정값)
let wallWidth = 8; // 화면 가로 크기에 맞는 벽의 가로 크기
let groundY = -5;               // 바닥의 y 위치
let yposition=-5;


const TETROMINOS = {
  I: [
    { x: -1.5, y: 0 }, { x: -0.5, y: 0 }, { x: 0.5, y: 0 }, { x: 1.5, y: 0 }
  ],
  O: [
    { x: -0.5, y: 0.5 }, { x: 0.5, y: 0.5 },
    { x: -0.5, y: -0.5 }, { x: 0.5, y: -0.5 }
  ],
  L: [
    { x: -0.5, y: 0.5 }, { x: -0.5, y: -0.5 }, { x: -0.5, y: -1.5 }, { x: 0.5, y: -1.5 }
  ],
  T: [
    { x: -0.5, y: 0 }, { x: 0.5, y: 0 }, { x: 1.5, y: 0 }, { x: 0.5, y: -1 }
  ]
};

init();
animate();

function init() {
  // Scene, Camera, Renderer
  scene = new THREE.Scene();

  const aspect = window.innerWidth / window.innerHeight;
  camera = new THREE.OrthographicCamera(-5 * aspect, 5 * aspect, 5, -5, 1, 100);
  camera.position.set(0, 0, 20);
  camera.lookAt(0, 0, 0);


  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Light
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(5, 10, 5);
  scene.add(light);

  // Cannon World
  world = new CANNON.World({
    gravity: new CANNON.Vec3(0, -9.82, 0),
  });

  // 바닥
  const groundColor = 0x888888;
  for (let i = 0; i < 4; i++) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(2, 0.5, 1),
      new THREE.MeshStandardMaterial({ color: groundColor })
    );
    mesh.position.set(-3 + i * 2, yposition, 0);
    scene.add(mesh);

    const shape = new CANNON.Box(new CANNON.Vec3(1, 0.25, 0.5));
    const body = new CANNON.Body({ mass: 0, shape });
    body.position.set(-3 + i * 2, yposition, 0);
    world.addBody(body);
  }



  // 물리 엔진에서 중력 설정 (y축 방향으로만 중력 적용)
  world.gravity.set(0, -9.8, 0); // y축 방향으로만 중력

  // 투명한 벽을 만들기 위한 코드
  createWall(-wallDepth / 2, 0);  // 앞쪽 벽
  createWall(wallDepth / 2, 0);   // 뒤쪽 벽
  // 블록 준비 및 이벤트 리스너
  prepareNextBlock();
  window.addEventListener('keydown', handleKey);
}

function createWall(positionZ) {
  const wallThickness = 0.1;        // 깊이 (z축 방향 두께)

  // Three.js 시각용 벽
  const geometry = new THREE.BoxGeometry(wallWidth, wallHeight, wallThickness);
  const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.2 });
  const wall = new THREE.Mesh(geometry, material);

  // 벽의 중심 위치를 바닥에서 시작하도록 맞춤
  wall.position.set(0, groundY + wallHeight / 2, positionZ);
  scene.add(wall);

  // 테두리 추가
  const edges = new THREE.EdgesGeometry(geometry);
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
  const edgeLines = new THREE.LineSegments(edges, lineMaterial);
  wall.add(edgeLines);

  // Cannon.js 물리 벽
  const wallShape = new CANNON.Box(new CANNON.Vec3(wallWidth / 2, wallHeight / 2, wallThickness / 2));
  const wallBody = new CANNON.Body({
    mass: 0,
    position: new CANNON.Vec3(0, groundY + wallHeight / 2, positionZ)
  });
  wallBody.addShape(wallShape);
  world.addBody(wallBody);
}


function prepareNextBlock() {
  const types = Object.keys(TETROMINOS);
  const type = types[Math.floor(Math.random() * types.length)];
  const shape = TETROMINOS[type];

  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff });
  const compoundBody = new CANNON.Body({ mass: 1 });

  shape.forEach(offset => {
    // THREE.js: 큐브 만들고 위치 지정
    const geometry = new THREE.BoxGeometry(blockSize, blockSize, blockSize);
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(offset.x * blockSize, offset.y * blockSize, 0);
    group.add(cube);

    // Cannon.js: 박스 쉐이프 만들고 위치 지정
    const boxShape = new CANNON.Box(new CANNON.Vec3(blockSize / 2, blockSize / 2, blockSize / 2));
    const localOffset = new CANNON.Vec3(offset.x * blockSize, offset.y * blockSize, 0);
    compoundBody.addShape(boxShape, localOffset);
  });

  group.position.set(0, blockStartY, 0);
  compoundBody.position.set(0, blockStartY, 0);

  scene.add(group);

  pendingBlock = group;
  pendingBody = compoundBody;
}

function handleKey(event) {
  if (!pendingBlock || !pendingBody) return;

  switch (event.code) {
    case 'ArrowLeft':
      pendingBlock.position.x -= 0.1;
      pendingBody.position.x -= 0.1;
      break;
    case 'ArrowRight':
      pendingBlock.position.x += 0.1;
      pendingBody.position.x += 0.1;
      break;
    case 'Space':
      // 블록 떨어뜨리기
      world.addBody(pendingBody);
      blocks.push(pendingBlock);
      blockBodies.push(pendingBody);

      pendingBlock = null;
      pendingBody = null;

      prepareNextBlock(); // 다음 블록 준비
      break;
  }
}


function animate() {
  requestAnimationFrame(animate);
  world.step(1 / 60);

  blocks.forEach((block, i) => {
    block.position.copy(blockBodies[i].position);
    block.quaternion.copy(blockBodies[i].quaternion);
  });

  // 준비 중인 블록도 위치 동기화
  if (pendingBlock && pendingBody) {
    pendingBlock.position.copy(pendingBody.position);
    pendingBlock.quaternion.copy(pendingBody.quaternion);
  }

  renderer.render(scene, camera);
}

