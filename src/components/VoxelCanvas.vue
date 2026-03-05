<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { isACAllowedCell } from './voxelPlacementRules';

const props = defineProps({
  state: Object,
  VoxelType: Object,
  VoxelColors: Object,
});

const emit = defineEmits(['updateVoxel', 'updateState']);

const canvasRef = ref(null);

let renderer, scene, camera, controls, gridGroup, voxelGroup;
let pickMesh = null;
let highlight = null;
let animationId = null;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let pendingCell = null;
let pointerDownPos = null;
let pointerMoved = false;

// カメラ位置から見えている境界面インデックスと状態を計算する
function getFrontPlanes() {
  const { nMeshX, nMeshY, nMeshZ, unitSize } = props.state;
  const sizeX = nMeshX * unitSize;
  const sizeY = nMeshY * unitSize;
  const sizeZ = nMeshZ * unitSize;
  const centerX = sizeX / 2;
  const centerY = sizeY / 2;
  const centerZ = sizeZ / 2;

  const camPos = camera.position;
  const xActive = camPos.x < 0 || camPos.x > sizeX;
  const yActive = camPos.y < 0 || camPos.y > sizeY;
  const zActive = camPos.z < 0 || camPos.z > sizeZ;

  return {
    xIndex: camPos.x >= centerX ? nMeshX - 1 : 0,
    yIndex: camPos.y >= centerY ? nMeshY - 1 : 0,
    zIndex: camPos.z >= centerZ ? nMeshZ - 1 : 0,
    xActive,
    yActive,
    zActive,
  };
}

// 可視境界面の状態をハッシュキーに変換する
function getFrontKey(front) {
  return `${front.xActive ? front.xIndex : "x-"}|${front.yActive ? front.yIndex : "y-"}|${front.zActive ? front.zIndex : "z-"}`;
}

// レイキャスト結果からセル座標を取得する
function getPickCellFromRay() {
  if (!pickMesh) return null;
  const hit = raycaster.intersectObject(pickMesh);
  if (hit.length === 0) return null;
  const instanceId = hit[0].instanceId;
  return props.state.pickMap[instanceId] ?? null;
}

// 指定層の水平プレーンとの交点からセルを求める
function getPickCellFromLayer(layerOffset) {
  const { nMeshX, nMeshY, nMeshZ, unitSize } = props.state;
  const yIndex = Math.min(Math.max(layerOffset, 0), nMeshY - 1);
  const y = (yIndex + 0.5) * unitSize;
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -y);
  const point = new THREE.Vector3();
  if (!raycaster.ray.intersectPlane(plane, point)) return null;

  const xIndex = Math.floor(point.x / unitSize);
  const zIndex = Math.floor(point.z / unitSize);
  if (xIndex < 0 || xIndex >= nMeshX || zIndex < 0 || zIndex >= nMeshZ) return null;
  return { x: xIndex, y: yIndex, z: zIndex };
}

// 内壁面との交差位置からセルを探索する
function getPickCellFromInnerWall(offset = 1) {
  const { nMeshX, nMeshY, nMeshZ, unitSize } = props.state;
  const candidates = [];

  const planes = [];
  if (nMeshX >= offset + 2) {
    planes.push({ axis: "x", index: offset });
    planes.push({ axis: "x", index: nMeshX - 1 - offset });
  }
  if (nMeshZ >= offset + 2) {
    planes.push({ axis: "z", index: offset });
    planes.push({ axis: "z", index: nMeshZ - 1 - offset });
  }

  for (const planeDef of planes) {
    const coord = (planeDef.index + 0.5) * unitSize;
    const normal = planeDef.axis === "x" ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1);
    const plane = new THREE.Plane(normal, -coord);
    const point = new THREE.Vector3();
    if (!raycaster.ray.intersectPlane(plane, point)) continue;

    const xIndex = planeDef.axis === "x" ? planeDef.index : Math.floor(point.x / unitSize);
    const zIndex = planeDef.axis === "z" ? planeDef.index : Math.floor(point.z / unitSize);
    const yIndex = Math.floor(point.y / unitSize);
    if (xIndex < 0 || xIndex >= nMeshX || yIndex < 0 || yIndex >= nMeshY || zIndex < 0 || zIndex >= nMeshZ) {
      continue;
    }
    const distance = raycaster.ray.origin.distanceTo(point);
    candidates.push({ cell: { x: xIndex, y: yIndex, z: zIndex }, distance });
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.distance - b.distance);
  return candidates[0].cell;
}

// 選択中のピックモードに応じてセルを取得する
function getPickCell() {
  const mode = document.getElementById("pickLayer")?.value || 'ray';
  if (mode === "innerWall") {
    const wallOffset = props.state.selectedType === props.VoxelType.AC ? 2 : 1;
    return getPickCellFromInnerWall(wallOffset);
  }
  if (mode === "floor1") return getPickCellFromLayer(1);
  if (mode === "floor2") return getPickCellFromLayer(2);
  if (mode === "floor3") return getPickCellFromLayer(3);
  if (mode === "floor4") return getPickCellFromLayer(4);
  return getPickCellFromRay();
}

// 配置制約を考慮して配置可能なセルを返す
function getPickCellForType(type) {
  const cell = getPickCell();
  if (!cell) return null;
  return canPlaceVoxel(cell, type) ? cell : null;
}

// フィールド全体が収まるようカメラを調整する
function fitCameraToField() {
  const { nMeshX, nMeshY, nMeshZ, unitSize } = props.state;
  const sizeX = nMeshX * unitSize;
  const sizeY = nMeshY * unitSize;
  const sizeZ = nMeshZ * unitSize;

  const center = new THREE.Vector3(sizeX / 2, sizeY / 2, sizeZ / 2);
  const maxDim = Math.max(sizeX, sizeY, sizeZ);
  const fov = THREE.MathUtils.degToRad(camera.fov);
  let distance = maxDim / (2 * Math.tan(fov / 2));
  distance *= 1.4;

  const direction = new THREE.Vector3(1, 0.7, 1).normalize();
  camera.position.copy(center).add(direction.multiplyScalar(distance));
  camera.near = Math.max(0.1, distance / 100);
  camera.far = distance * 10;
  camera.lookAt(center);
  camera.updateProjectionMatrix();

  controls.target.copy(center);
  controls.update();
}

// キャンバスサイズ変更時にレンダラーとカメラを更新する
function resizeRenderer() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const { clientWidth, clientHeight } = canvas;
  renderer.setSize(clientWidth, clientHeight, false);
  camera.aspect = clientWidth / clientHeight;
  camera.updateProjectionMatrix();
}

// 初期メッシュ種別配列を生成し境界を設定する
function createMeshtype() {
  const { nMeshX, nMeshY, nMeshZ } = props.state;
  const data = Array.from({ length: nMeshX }, () =>
    Array.from({ length: nMeshY }, () => Array(nMeshZ).fill(props.VoxelType.INSIDE))
  );

  for (let x = 0; x < nMeshX; x += 1) {
    for (let y = 0; y < nMeshY; y += 1) {
      for (let z = 0; z < nMeshZ; z += 1) {
        const isEdge = x === 0 || x === nMeshX - 1 || z === 0 || z === nMeshZ - 1;
        if (isEdge) {
          if( z === 0 || x === 0 ) {
            data[x][y][z] = props.VoxelType.SIDE;
          } else {
            data[x][y][z] = props.VoxelType.OUTSIDE;
          }
        } else if (y === 0) {
          data[x][y][z] = props.VoxelType.BOTTOM;
        } else if (y === nMeshY - 1) {
          data[x][y][z] = isEdge ? props.VoxelType.SIDE : props.VoxelType.TOP;
        }
      }
    }
  }

  emit('updateState', { meshtype: data });
}

// レイピック用のインスタンス化メッシュを構築する
function buildPickMesh() {
  if (pickMesh) {
    scene.remove(pickMesh);
  }

  const { nMeshX, nMeshY, nMeshZ, unitSize } = props.state;
  const geometry = new THREE.BoxGeometry(unitSize, unitSize, unitSize);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });

  const count = nMeshX * nMeshY * nMeshZ;
  const instanced = new THREE.InstancedMesh(geometry, material, count);
  instanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const dummy = new THREE.Object3D();

  const pickMap = new Array(count);
  let index = 0;
  for (let x = 0; x < nMeshX; x += 1) {
    for (let y = 0; y < nMeshY; y += 1) {
      for (let z = 0; z < nMeshZ; z += 1) {
        const px = (x + 0.5) * unitSize;
        const py = (y + 0.5) * unitSize;
        const pz = (z + 0.5) * unitSize;
        dummy.position.set(px, py, pz);
        dummy.updateMatrix();
        instanced.setMatrixAt(index, dummy.matrix);
        pickMap[index] = { x, y, z };
        index += 1;
      }
    }
  }

  instanced.frustumCulled = false;
  emit('updateState', { pickMap });
  pickMesh = instanced;
  scene.add(pickMesh);
}

// グリッドと境界ボックスを描画する
function buildGridHelpers() {
  gridGroup.clear();
  const { nMeshX, nMeshY, nMeshZ, unitSize } = props.state;

  const sizeX = nMeshX * unitSize;
  const sizeZ = nMeshZ * unitSize;
  const grid = new THREE.GridHelper(Math.max(sizeX, sizeZ), Math.max(nMeshX, nMeshZ), 0x2d3748, 0x2d3748);
  grid.position.set(sizeX / 2, 0, sizeZ / 2);
  gridGroup.add(grid);

  const box = new THREE.Box3(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(nMeshX * unitSize, nMeshY * unitSize, nMeshZ * unitSize)
  );
  const boxHelper = new THREE.Box3Helper(box, 0x4a5568);
  gridGroup.add(boxHelper);
}

// 現在のメッシュ種別に基づきボクセル群を配置する
function buildVoxels() {
  voxelGroup.clear();
  const { nMeshX, nMeshY, nMeshZ, unitSize, meshtype } = props.state;

  const geometry = new THREE.BoxGeometry(unitSize, unitSize, unitSize);
  const front = getFrontPlanes();
  emit('updateState', { frontKey: getFrontKey(front) });

  for (let x = 0; x < nMeshX; x += 1) {
    for (let y = 0; y < nMeshY; y += 1) {
      for (let z = 0; z < nMeshZ; z += 1) {
        const type = meshtype[x][y][z];
        if (type === props.VoxelType.INSIDE) continue;

        const isWallType =
          type === props.VoxelType.OUTSIDE ||
          type === props.VoxelType.TOP ||
          type === props.VoxelType.BOTTOM ||
          type === props.VoxelType.SIDE;

        let isTransparentFace = false;
        if (front.xActive && x === front.xIndex) {
          const isEdge = y === 0 || y === nMeshY - 1 || z === 0 || z === nMeshZ - 1;
          if (!isEdge) isTransparentFace = true;
        }
        if (front.yActive && y === front.yIndex) {
          const isEdge = x === 0 || x === nMeshX - 1 || z === 0 || z === nMeshZ - 1;
          if (!isEdge) isTransparentFace = true;
        }
        if (front.zActive && z === front.zIndex) {
          const isEdge = x === 0 || x === nMeshX - 1 || y === 0 || y === nMeshY - 1;
          if (!isEdge) isTransparentFace = true;
        }

        const isFrontCorner =
          front.xActive &&
          front.yActive &&
          front.zActive &&
          x === front.xIndex &&
          y === front.yIndex &&
          z === front.zIndex;

        const isFrontEdgeX = front.yActive && front.zActive && y === front.yIndex && z === front.zIndex;
        const isFrontEdgeY = front.xActive && front.zActive && x === front.xIndex && z === front.zIndex;
        const isFrontEdgeZ = front.xActive && front.yActive && x === front.xIndex && y === front.yIndex;

        const isEdgeXEndpoint = isFrontEdgeX && (x === 0 || x === nMeshX - 1) && !isFrontCorner;
        const isEdgeYEndpoint = isFrontEdgeY && (y === 0 || y === nMeshY - 1) && !isFrontCorner;
        const isEdgeZEndpoint = isFrontEdgeZ && (z === 0 || z === nMeshZ - 1) && !isFrontCorner;

        const isCornerEdge =
          isFrontCorner ||
          (isFrontEdgeX && !isEdgeXEndpoint) ||
          (isFrontEdgeY && !isEdgeYEndpoint) ||
          (isFrontEdgeZ && !isEdgeZEndpoint);

        isTransparentFace = isWallType && (isTransparentFace || isCornerEdge);

        const color = props.VoxelColors[type] ?? 0xffffff;
        const baseOpacity = type === props.VoxelType.WINDOW || type === props.VoxelType.OBSTACLE ? 0.7 : 1;
        const opacity = isTransparentFace ? 0.1 : baseOpacity;
        const material = new THREE.MeshStandardMaterial({
          color,
          metalness: 0.1,
          roughness: 0.6,
          transparent: isTransparentFace || baseOpacity < 1,
          opacity,
          depthWrite: !isTransparentFace,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set((x + 0.5) * unitSize, (y + 0.5) * unitSize, (z + 0.5) * unitSize);
        voxelGroup.add(mesh);
      }
    }
  }
}

// 選択セルを示すハイライトメッシュを用意する
function buildHighlight() {
  if (highlight) {
    scene.remove(highlight);
  }
  const { unitSize } = props.state;
  const geo = new THREE.BoxGeometry(unitSize * 1.02, unitSize * 1.02, unitSize * 1.02);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffff00, wireframe: true });
  highlight = new THREE.Mesh(geo, mat);
  highlight.visible = false;
  scene.add(highlight);
}

// ハイライト位置と可視状態を更新する
function setHighlightCell(cell) {
  if (!highlight) return;
  if (!cell) {
    highlight.visible = false;
    return;
  }
  const { unitSize } = props.state;
  highlight.visible = true;
  highlight.position.set((cell.x + 0.5) * unitSize, (cell.y + 0.5) * unitSize, (cell.z + 0.5) * unitSize);
}

// シーン全体を再構築する
// resetCamera: true の場合、カメラを初期位置にリセット（フィールド作成時）
function rebuildScene(resetCamera = false) {
  if (!props.state.meshtype || props.state.meshtype.length === 0) {
    createMeshtype();
  }
  buildPickMesh();
  buildGridHelpers();
  buildVoxels();
  buildHighlight();
  
  // 常に回転中心をフィールドの中央に設定
  const { nMeshX, nMeshY, nMeshZ, unitSize } = props.state;
  const sizeX = nMeshX * unitSize;
  const sizeY = nMeshY * unitSize;
  const sizeZ = nMeshZ * unitSize;
  const center = new THREE.Vector3(sizeX / 2, sizeY / 2, sizeZ / 2);
  controls.target.copy(center);
  controls.update();
  
  if (resetCamera) {
    fitCameraToField();
  }
  resizeRenderer();
}

// 壁面セルかどうかを判定する
function isSideSurface(cell) {
  const { nMeshX, nMeshZ } = props.state;
  return cell.x === 0 || cell.x === nMeshX - 1 || cell.z === 0 || cell.z === nMeshZ - 1;
}

// 床タイプが配置可能か判定する
function isBottomAllowed(cell) {
  return cell.z === 0;
}

// 天井タイプが配置可能な領域か確認する
function isTopAllowed(cell) {
  const { nMeshX, nMeshY, nMeshZ } = props.state;
  return (
    cell.z === nMeshZ - 1 &&
    cell.x > 0 &&
    cell.x < nMeshX - 1 &&
    cell.y > 0 &&
    cell.y < nMeshY - 1
  );
}

// エアコンが配置可能な領域か確認する
function isACAllowed(cell) {
  return isACAllowedCell(cell, props.state);
}

// 隣接セルに指定タイプが存在するか判定する
function hasAdjacentType(cell, types) {
  const { nMeshX, nMeshY, nMeshZ, meshtype } = props.state;
  const deltas = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ];
  for (const [dx, dy, dz] of deltas) {
    const x = cell.x + dx;
    const y = cell.y + dy;
    const z = cell.z + dz;
    if (x < 0 || x >= nMeshX || y < 0 || y >= nMeshY || z < 0 || z >= nMeshZ) {
      continue;
    }
    if (types.includes(meshtype[x][y][z])) {
      return true;
    }
  }
  return false;
}

// セルとタイプの組み合わせが配置条件を満たすか確認する
function canPlaceVoxel(cell, type) {
  switch (type) {
    case props.VoxelType.OUTSIDE:
    case props.VoxelType.WINDOW:
      return isSideSurface(cell);
    case props.VoxelType.BOTTOM:
      return isBottomAllowed(cell);
    case props.VoxelType.TOP:
      return isTopAllowed(cell);
    case props.VoxelType.AC:
      return isACAllowed(cell);
    case props.VoxelType.OBSTACLE:
    case props.VoxelType.CL:
      return hasAdjacentType(cell, [props.VoxelType.BOTTOM, props.VoxelType.OBSTACLE]);
    default:
      return true;
  }
}

// ポインタ移動時の入力処理とハイライト更新
function onPointerMove(event) {
  if (pointerDownPos) {
    const dx = event.clientX - pointerDownPos.x;
    const dy = event.clientY - pointerDownPos.y;
    if (Math.hypot(dx, dy) > 4) {
      pointerMoved = true;
    }
  }
  const canvas = canvasRef.value;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const cell = getPickCellForType(props.state.selectedType);
  setHighlightCell(cell);
}

// ポインタ押下時にセル候補を保持する
function onPointerDown(event) {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const cell = getPickCellForType(props.state.selectedType);
  if (!cell) {
    pendingCell = null;
    return;
  }
  pendingCell = cell;
  pointerDownPos = { x: event.clientX, y: event.clientY };
  pointerMoved = false;
}

// ポインタ解放時にボクセル配置を確定する
function onPointerUp(event) {
  if (!pendingCell) return;
  if (pointerMoved) {
    pendingCell = null;
    pointerDownPos = null;
    return;
  }

  const canvas = canvasRef.value;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const cell = getPickCellForType(props.state.selectedType);
  if (!cell) {
    pendingCell = null;
    pointerDownPos = null;
    return;
  }
  emit('updateVoxel', { cell, type: props.state.selectedType });
  pendingCell = null;
  pointerDownPos = null;
}

// キーボード入力処理
function onKeyDown(event) {
  if (event.key === "Escape") {
    emit('updateState', { undoRequest: true });
    return;
  }
  const isUndo = (event.ctrlKey || event.metaKey) && (event.key === "z" || event.key === "Z");
  if (isUndo) {
    event.preventDefault();
    emit('updateState', { undoRequest: true });
  }
}

// 毎フレームのレンダリングループを回す
function animate() {
  animationId = requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

// 初期化
onMounted(() => {
  const canvas = canvasRef.value;
  if (!canvas) return;

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0f1115);

  camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000);
  camera.position.set(10, 8, 14);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.addEventListener("change", () => {
    const key = getFrontKey(getFrontPlanes());
    if (key !== props.state.frontKey) {
      buildVoxels();
    }
  });

  const light = new THREE.DirectionalLight(0xffffff, 0.9);
  light.position.set(10, 15, 5);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));

  gridGroup = new THREE.Group();
  voxelGroup = new THREE.Group();
  scene.add(gridGroup, voxelGroup);

  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointerup", onPointerUp);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("resize", resizeRenderer);

  rebuildScene(true);
  animate();
});

// クリーンアップ
onBeforeUnmount(() => {
  const canvas = canvasRef.value;
  if (canvas) {
    canvas.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("pointerdown", onPointerDown);
    canvas.removeEventListener("pointerup", onPointerUp);
  }
  window.removeEventListener("keydown", onKeyDown);
  window.removeEventListener("resize", resizeRenderer);
  
  if (animationId) {
    cancelAnimationFrame(animationId);
  }
  
  if (renderer) {
    renderer.dispose();
  }
});

defineExpose({
  rebuildScene,
});
</script>

<template>
  <main class="viewport">
    <canvas ref="canvasRef"></canvas>
  </main>
</template>

<style scoped>
.viewport {
  position: relative;
}

canvas {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
