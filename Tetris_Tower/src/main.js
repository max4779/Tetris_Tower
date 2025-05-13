// src/main.js
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

let scene, camera, renderer;
let world;
let blocks = [];
let blockBodies = [];
let groundBody;
let nextBlockY = 5;

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
  let yposition=-5;
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

  // 스페이스바로 블록 추가
  window.addEventListener('keydown', handleKey);

  // 초기 테스트용 블록 자동 생성
  setTimeout(() => spawnBlock(), 500);
}

function handleKey(event) {
  if (event.code === 'Space') {
    spawnBlock();
  }
}

function spawnBlock() {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff });
  const cube = new THREE.Mesh(geometry, material);
  cube.position.set(0, nextBlockY, 0);
  scene.add(cube);
  blocks.push(cube);

  const shape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5));
  const body = new CANNON.Body({ mass: 1, shape: shape });
  body.position.set(0, nextBlockY, 0);
  world.addBody(body);
  blockBodies.push(body);

  nextBlockY += 1.2;
}

function animate() {
  requestAnimationFrame(animate);
  world.step(1 / 60);

  blocks.forEach((block, i) => {
    block.position.copy(blockBodies[i].position);
    block.quaternion.copy(blockBodies[i].quaternion);
  });

  renderer.render(scene, camera);
}
