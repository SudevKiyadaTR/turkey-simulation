import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import { Vector3 } from 'three/src/Three.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';

import studio from '@theatre/studio';
import { getProject, types } from '@theatre/core';
import state from '/src/state2.json';
const config = { state };
var project = null, sheet = null;

var scene = new THREE.Scene();
// scene.fog = new THREE.FogExp2(0xcccccc, 0.01);
var renderer = new THREE.WebGLRenderer();
var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 2000);
const controls = new OrbitControls(camera, renderer.domElement);
var mesh = null, sampler = null;

var groundA, groundB, groundC;
var meshA, meshB, meshC;

const count = 105000;

const dummy = new THREE.Object3D();

const _position = new THREE.Vector3();
const _normal = new THREE.Vector3();
const _scale = new THREE.Vector3();

const matcapTexture = new THREE.TextureLoader().load('/matcap.png');

// basic stuff
function initThree() {
  camera.position.set(0, 50, 50);
  camera.lookAt(0, 0, 0);

  const light = new THREE.AmbientLight(0xffffff);
  scene.add(light);

  // const pLight = new THREE.PointLight(0xff0000, 30, 100);
  // pLight.position.set(0, 20, 0);
  // scene.add(pLight);

  scene.background = new THREE.Color(0xffffff);

  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.gammaFactor = 2.2;
  renderer.gammaOutput = true;
  renderer.physicallyCorrectLights = true;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.autoClear = false;
  renderer.setClearColor(0xff0000);
  document.body.appendChild(renderer.domElement);
}

window.onresize = () => {
  renderer.height = window.innerHeight;
  renderer.width = window.innerWidth;
  renderer.setSize(renderer.width, renderer.height);
  camera.aspect = renderer.width / renderer.height;
  camera.updateProjectionMatrix();
}

function addLights(m) {
  //Create a DirectionalLight and turn on shadows for the light
  const light = new THREE.DirectionalLight(0xffffff, 8);
  light.position.set(m * 50, 50, 100);
  light.castShadow = true; // default false
  scene.add(light);

  var d = 1000;
  light.shadow.camera.left = -d;
  light.shadow.camera.right = d;
  light.shadow.camera.top = d;
  light.shadow.camera.bottom = -d;

  //Set up shadow properties for the light
  light.shadow.mapSize.width = 2048; // default
  light.shadow.mapSize.height = 2048; // default
  light.shadow.camera.near = 0.1; // default
  light.shadow.camera.far = 500; // default
  light.shadow.radius = 8;
}

function addRectLight() {
  const width = 50;
  const height = 50;
  const intensity = 5;
  const rectLight = new THREE.RectAreaLight(0xffffff, intensity, width, height);
  rectLight.position.set(0, 25, 0);
  rectLight.lookAt(0, 0, 0);
  scene.add(rectLight)
}

function addModels() {
  // add plane as ground
  const planeGeometry = new THREE.PlaneGeometry(50, 50).toNonIndexed();
  const planeMaterial = new THREE.MeshPhysicalMaterial({ color: 'gray', roughness: 0.5, metalness: 0 });
  groundA = new THREE.Mesh(planeGeometry, planeMaterial);
  groundA.geometry.rotateX(-Math.PI / 2);
  groundA.position.set(-25, 0, -25);
  groundA.receiveShadow = true;
  // scene.add(groundA);

  console.log('groundA: ' + groundA.geometry.getAttribute('position'));

  groundB = new THREE.Mesh(planeGeometry.clone(), planeMaterial.clone());
  // groundB.geometry.rotateX(-Math.PI / 2);
  groundB.position.set(25, 0, -25);
  groundB.receiveShadow = true;
  groundB.material.color = new THREE.Color('orangered');
  // scene.add(groundB);

  console.log('groundB: ' + groundB.geometry.getAttribute('position'));

  groundC = new THREE.Mesh(planeGeometry.clone(), planeMaterial.clone());
  groundC.geometry.scale(8, 1, 20);
  groundC.position.set(0, 0, -500);
  groundC.receiveShadow = true;
  groundC.material.color = new THREE.Color('deeppink');
  scene.add(groundC);

  const geo = new THREE.BoxGeometry(1, 3, 1);
  // const material = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 1.0, reflectivity: 0.5, metalness: 0.0 });
  const material = new THREE.MeshPhysicalMaterial({ color: 0x444444, roughness: 1, metalness: 0, reflectivity: 0.5 });
  meshA = new THREE.InstancedMesh(geo, material, count);
  meshA.geometry.applyMatrix4(new THREE.Matrix4().makeTranslation(0, 1.5, 0));
  meshA.castShadow = true;
  meshA.receiveShadow = true;
  meshA.position.set(-25, 0, -25);
  // scene.add(meshA);

  meshB = meshA.clone();
  meshB.position.set(25, 0, -25);
  meshB.castShadow = true;
  meshB.receiveShadow = true;
  // scene.add(meshB);

  meshC = meshA.clone();
  meshC.position.set(0, 0, -500);
  meshC.castShadow = true;
  meshC.receiveShadow = true;
  scene.add(meshC);
}

function resample(grd, msh, cnt) {
  const vertexCount = grd.geometry.getAttribute('position').count;
  console.info('Sampling ' + cnt + ' points from a surface with ' + vertexCount + ' vertices...');
  console.time('.build()');
  sampler = new MeshSurfaceSampler(grd)
    .setWeightAttribute('weighted' === 'weighted' ? 'uv' : null)
    .build();
  console.timeEnd('.build()');

  console.time('.sample()');

  for (let i = 0; i < cnt; i++) {
    resampleParticle(i, msh);
  }

  console.timeEnd('.sample()');

  msh.instanceMatrix.needsUpdate = true;
}

function resampleParticle(i, msh) {

  sampler.sample(_position, _normal);
  _normal.add(_position);

  dummy.position.copy(_position);
  // dummy.scale.set(scales[i], scales[i], scales[i]);
  // dummy.lookAt(_normal);
  // dummy.rotateY(Math.random() * 0.3);
  // if (Math.random() < 0.5) {
  //   dummy.rotateX(Math.random() * (-0.05));
  // } else {
  //   dummy.rotateX(Math.random() * 0.05);
  // }
  if (msh == meshA) {
    dummy.scale.set(Math.random() * 1 + 0.2, Math.random() * 0.5 + 0.2, Math.random() * 1 + 0.2);
  } else if (msh == meshB) {
    dummy.scale.set(Math.random() * 1.5 + 0.2, Math.random() * 2 + 0.2, Math.random() * 1.5 + 0.2);
  } else if (msh == meshC) {
    dummy.scale.set(Math.random() * 1 + 0.2, Math.random() * 1 + 0.2, Math.random() * 1 + 0.2);
  }

  dummy.updateMatrix();

  msh.setMatrixAt(i, dummy.matrix);
}

function animate() {
  requestAnimationFrame(animate);

  controls.update();

  renderer.render(scene, camera);
}

function addBuildings() {

  const planeGeo = new THREE.PlaneGeometry(100, 100);
  const planeMat = new THREE.MeshLambertMaterial({ color: 0xffffff, metalness: 0.4, roughness: 0.8 });
  const plane = new THREE.Mesh(planeGeo, planeMat);
  plane.geometry.rotateX(-Math.PI / 2);
  plane.position.set(0, -3, 0);
  scene.add(plane);

  const loader = new GLTFLoader().setPath('/');
  loader.load('build4.glb', function (gltf) {

    scene.add(gltf.scene);

  });
}

function initTheatre() {
  // Initialize the studio
  studio.initialize();
  studio.ui.hide();

  // Create a project for the animation
  // const project = getProject('THREE.js x Theatre.js');
  project = getProject('THREE.js x Theatre.js', config);

  // Create a sheet
  sheet = project.sheet('Animated scene');

  const cameraObj = sheet.object('Camera', {
    position: types.compound({
      x: types.number(camera.position.x, { range: [-200, 200] }),
      y: types.number(camera.position.y, { range: [-200, 200] }),
      z: types.number(camera.position.z, { range: [-200, 200] }),
    }),
    fov: types.number(camera.fov, { range: [0, 100] }),
  });

  cameraObj.onValuesChange((values) => {
    const { x, y, z } = values.position;

    camera.position.set(x, y, z);
    camera.fov = values.fov;
    camera.updateProjectionMatrix();
  });

  [groundA, groundB, groundC].forEach((grd, i) => {
    const groundObj = sheet.object('Ground' + i, {
      // Note that the rotation is in radians
      // (full rotation: 2 * Math.PI)
      color: types.compound({
        r: types.number(grd.material.color.r, { range: [0, 1] }),
        g: types.number(grd.material.color.g, { range: [0, 1] }),
        b: types.number(grd.material.color.b, { range: [0, 1] }),
      }),
    });

    groundObj.onValuesChange((values) => {
      const { r, g, b } = values.color;

      grd.material.color = new THREE.Color(r, g, b);
    });
  });

  // project.ready.then(() => sheet.sequence.play({ iterationCount: Infinity }));
}

initThree();
addLights(1);
addLights(-1);
// addRectLight();
addModels();
resample(groundA, meshA, 1000);
resample(groundB, meshB, 500);
resample(groundC, meshC, 105000);
// addBuildings();
animate();
initTheatre();