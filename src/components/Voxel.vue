<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { Store } from '@/stores/store';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const store = Store();

const VoxelType = {
  INSIDE: 1,
  BOTTOM: 2,
  TOP: 3,
  WINDOW: 4,
  OUTSIDE: 5,
  SIDE: 6,
  OBSTACLE: 7,
  AC: 8,
  CL: 9,
};

const VoxelColors = {
  [VoxelType.BOTTOM]: 0x8a5a44,
  [VoxelType.TOP]: 0x4a5568,
  [VoxelType.WINDOW]: 0xa7d8ff,
  [VoxelType.OUTSIDE]: 0xd1d5db,
  [VoxelType.SIDE]: 0xd1d5db,
  [VoxelType.OBSTACLE]: 0xff8acb,
  [VoxelType.AC]: 0xf59e0b,
  [VoxelType.CL]: 0xef4444,
};

const canvasRef = ref(null);

const state = ref({
  nMeshX: 14,
  nMeshY: 8,
  nMeshZ: 14,
  unitSize: 0.3,
  meshtype: [],
  pickMap: [],
  history: [],
  selectedType: VoxelType.WINDOW,
  loadedFromSession: false,
  
  maxtime: 40000,
  maxtime_minute: 20,
  delta_t: 0.005,
  batch_sec: 2,
  
  InsidePhi: 30,
  ObsPhi: 30,
  InletPhi: 35,
  FloorPhi: 30,
  
  WindowYr: 0.9,
  WindowHr: 0.9,
  WindowZr: 0.9,
  WindowWr: 0.9,
  Window2Yr: 0.9,
  Window2Hr: 0.9,
  Window2Xr: 0.5,
  Window2Wr: 2,
  
  ACtype: 2,
  ACwall: 3,
  ACwind: 1,
  ACheat: false,
  ACdir: 2,
  CirculatorWind: 0,
  
  windowKset: 6,
  wallKset: 2.5,
  atrium: false,
  title: "CFD設定",
  floor: 1,
  
  temperature: [17, 29],
  colordelete: [false, false],
  arrowunit_multi: 0,
  startfix: false,
  onlytemp: false,
  showz: false,
  layerz: 5,
  pararel: 0,
  
  frontKey: null,
});

let renderer, scene, camera, controls, gridGroup, voxelGroup;
let pickMesh = null;
let highlight = null;
let animationId = null;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let pendingCell = null;
let pointerDownPos = null;
let pointerMoved = false;
let controlsMoved = false;

// カメラ位置から見えている境界面インデックスと状態を計算する
function getFrontPlanes() {
  const { nMeshX, nMeshY, nMeshZ, unitSize } = state.value;
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
  return state.value.pickMap[instanceId] ?? null;
}

// 指定層の水平プレーンとの交点からセルを求める
function getPickCellFromLayer(layerOffset) {
  const { nMeshX, nMeshY, nMeshZ, unitSize } = state.value;
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
function getPickCellFromInnerWall() {
  const { nMeshX, nMeshY, nMeshZ, unitSize } = state.value;
  const candidates = [];

  const planes = [];
  if (nMeshX >= 3) {
    planes.push({ axis: "x", index: 1 });
    planes.push({ axis: "x", index: nMeshX - 2 });
  }
  if (nMeshZ >= 3) {
    planes.push({ axis: "z", index: 1 });
    planes.push({ axis: "z", index: nMeshZ - 2 });
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
  if (mode === "innerWall") return getPickCellFromInnerWall();
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
  const { nMeshX, nMeshY, nMeshZ, unitSize } = state.value;
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
  const { nMeshX, nMeshY, nMeshZ } = state.value;
  const data = Array.from({ length: nMeshX }, () =>
    Array.from({ length: nMeshY }, () => Array(nMeshZ).fill(VoxelType.INSIDE))
  );

  for (let x = 0; x < nMeshX; x += 1) {
    for (let y = 0; y < nMeshY; y += 1) {
      for (let z = 0; z < nMeshZ; z += 1) {
        const isEdge = x === 0 || x === nMeshX - 1 || z === 0 || z === nMeshZ - 1;
        if (isEdge) {
          if( z === 0 || x === 0 ) {
            data[x][y][z] = VoxelType.SIDE;
          } else {
            data[x][y][z] = VoxelType.OUTSIDE;
          }
        } else if (y === 0) {
          data[x][y][z] = VoxelType.BOTTOM;
        } else if (y === nMeshY - 1) {
          data[x][y][z] = isEdge ? VoxelType.SIDE : VoxelType.TOP;
        }
      }
    }
  }

  state.value.meshtype = data;
}

// レイピック用のインスタンス化メッシュを構築する
function buildPickMesh() {
  if (pickMesh) {
    scene.remove(pickMesh);
  }

  const { nMeshX, nMeshY, nMeshZ, unitSize } = state.value;
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
  state.value.pickMap = pickMap;
  pickMesh = instanced;
  scene.add(pickMesh);
}

// グリッドと境界ボックスを描画する
function buildGridHelpers() {
  gridGroup.clear();
  const { nMeshX, nMeshY, nMeshZ, unitSize } = state.value;

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
  const { nMeshX, nMeshY, nMeshZ, unitSize, meshtype } = state.value;

  const geometry = new THREE.BoxGeometry(unitSize, unitSize, unitSize);
  const front = getFrontPlanes();
  state.value.frontKey = getFrontKey(front);

  for (let x = 0; x < nMeshX; x += 1) {
    for (let y = 0; y < nMeshY; y += 1) {
      for (let z = 0; z < nMeshZ; z += 1) {
        const type = meshtype[x][y][z];
        if (type === VoxelType.INSIDE) continue;

        const isWallType =
          type === VoxelType.OUTSIDE ||
          type === VoxelType.TOP ||
          type === VoxelType.BOTTOM ||
          type === VoxelType.SIDE;

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

        const color = VoxelColors[type] ?? 0xffffff;
        const baseOpacity = type === VoxelType.WINDOW || type === VoxelType.OBSTACLE ? 0.7 : 1;
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
  const { unitSize } = state.value;
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
  const { unitSize } = state.value;
  highlight.visible = true;
  highlight.position.set((cell.x + 0.5) * unitSize, (cell.y + 0.5) * unitSize, (cell.z + 0.5) * unitSize);
}

// シーン全体を再構築して初期状態に戻す
function rebuildScene() {
  if (!state.value.loadedFromSession || !state.value.meshtype || state.value.meshtype.length === 0) {
    createMeshtype();
  }
  updateACheatByState();
  state.value.history = [];
  buildPickMesh();
  buildGridHelpers();
  buildVoxels();
  buildHighlight();
  fitCameraToField();
  resizeRenderer();
}

// 壁面セルかどうかを判定する
function isSideSurface(cell) {
  const { nMeshX, nMeshZ } = state.value;
  return cell.x === 0 || cell.x === nMeshX - 1 || cell.z === 0 || cell.z === nMeshZ - 1;
}

// 床タイプが配置可能か判定する
function isBottomAllowed(cell) {
  return cell.z === 0;
}

// 天井タイプが配置可能な領域か確認する
function isTopAllowed(cell) {
  const { nMeshX, nMeshY, nMeshZ } = state.value;
  return (
    cell.z === nMeshZ - 1 &&
    cell.x > 0 &&
    cell.x < nMeshX - 1 &&
    cell.y > 0 &&
    cell.y < nMeshY - 1
  );
}

// 隣接セルに指定タイプが存在するか判定する
function hasAdjacentType(cell, types) {
  const { nMeshX, nMeshY, nMeshZ, meshtype } = state.value;
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
    case VoxelType.OUTSIDE:
    case VoxelType.WINDOW:
      return isSideSurface(cell);
    case VoxelType.BOTTOM:
      return isBottomAllowed(cell);
    case VoxelType.TOP:
      return isTopAllowed(cell);
    case VoxelType.AC:
      return hasAdjacentType(cell, [VoxelType.OUTSIDE, VoxelType.SIDE, VoxelType.TOP]);
    case VoxelType.OBSTACLE:
    case VoxelType.CL:
      return hasAdjacentType(cell, [VoxelType.BOTTOM, VoxelType.OBSTACLE]);
    default:
      return true;
  }
}

// 履歴を残しつつセルの種別を更新する
function updateVoxel(cell, type) {
  if (!canPlaceVoxel(cell, type)) return;
  const prev = state.value.meshtype[cell.x][cell.y][cell.z];
  if (prev === type) return;
  state.value.history.push({ x: cell.x, y: cell.y, z: cell.z, prev });
  state.value.meshtype[cell.x][cell.y][cell.z] = type;
  updateACheatByState();
  buildVoxels();
}

// 直前の変更を取り消してボクセルを元に戻す
function undoVoxel() {
  const last = state.value.history.pop();
  if (!last) return;
  state.value.meshtype[last.x][last.y][last.z] = last.prev;
  updateACheatByState();
  buildVoxels();
}

// AC暖房は「冬」かつACボクセルがある場合のみ有効
function updateACheatByState() {
  const hasAC = state.value.meshtype?.some((plane) =>
    plane.some((row) => row.some((cell) => cell === VoxelType.AC))
  );
  state.value.ACheat = state.value.ACtype === 2 && !!hasAC;
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
  const cell = getPickCellForType(state.value.selectedType);
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
  const cell = getPickCellForType(state.value.selectedType);
  if (!cell) {
    pendingCell = null;
    return;
  }
  pendingCell = cell;
  pointerDownPos = { x: event.clientX, y: event.clientY };
  pointerMoved = false;
  controlsMoved = false;
}

// ポインタ解放時にボクセル配置を確定する
function onPointerUp(event) {
  if (!pendingCell) return;
  if (pointerMoved || controlsMoved) {
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
  const cell = getPickCellForType(state.value.selectedType);
  if (!cell) {
    pendingCell = null;
    pointerDownPos = null;
    return;
  }
  updateVoxel(cell, state.value.selectedType);
  pendingCell = null;
  pointerDownPos = null;
}

// JSONデータをファイルとして保存する
function saveFile() {
  const jsonData = generateJsonData();
  const jsonString = JSON.stringify(jsonData, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "cfd_voxel.json";
  a.click();
  URL.revokeObjectURL(url);
}

// シミュレーション画面をsessionStorage経由で開く
function openSimulation() {
  const jsonData = generateJsonData();
  const jsonString = JSON.stringify(jsonData);
  
  sessionStorage.setItem('cfdVoxelData', jsonString);
  
  // メインのシミュレーション画面に遷移
  store.page = 'setdetail';
  
  // storeにデータを設定
  store.paramstore(jsonData);
  store.structure.init(store.setval);
  store.structure2.init(store.setval2);
}

// JSON データを生成する共通関数
function generateJsonData() {
  const realX = (state.value.nMeshX-2) * state.value.unitSize;
  const realY = (state.value.nMeshY-2) * state.value.unitSize;
  const realZ = (state.value.nMeshZ-2) * state.value.unitSize;
  const maxreal = Math.max(realX, realY, realZ);
  const canvasfieldX = 400;
  const canvasfieldY = 400 * realY / realX;
  
  let setval = {
    maxtime: state.value.maxtime,
    maxtime_minute: state.value.maxtime_minute,
    delta_t: state.value.delta_t,
    batch_sec: state.value.batch_sec,
    realX: realX,
    realY: realY,
    realZ: realZ,
    maxreal: maxreal,
    canvasfieldX: canvasfieldX,
    canvasfieldY: canvasfieldY,
    nMeshX: state.value.nMeshX-2,
    nMeshY: state.value.nMeshY-2,
    nMeshZ: state.value.nMeshZ-2,
    InsidePhi: state.value.InsidePhi,
    ObsPhi: state.value.ObsPhi,
    InletPhi: state.value.InletPhi,
    FloorPhi: state.value.FloorPhi,
    WindowYr: state.value.WindowYr,
    WindowHr: state.value.WindowHr,
    WindowZr: state.value.WindowZr,
    WindowWr: state.value.WindowWr,
    Window2Yr: state.value.Window2Yr,
    Window2Hr: state.value.Window2Hr,
    Window2Xr: state.value.Window2Xr,
    Window2Wr: state.value.Window2Wr,
    ACtype: state.value.ACtype,
    ACwall: state.value.ACwall,
    ACwind: state.value.ACwind,
    ACheat: state.value.ACheat,
    ACdir: state.value.ACdir,
    CirculatorWind: state.value.CirculatorWind,
    windowKset: state.value.windowKset,
    wallKset: state.value.wallKset,
    atrium: state.value.atrium,
    title: state.value.title,
    floor: state.value.floor,
    meshtype: state.value.meshtype,
  };
  
  let graph = {
    temperature: state.value.temperature,
    colordelete: state.value.colordelete,
    arrowunit_multi: state.value.arrowunit_multi,
    startfix: state.value.startfix,
    onlytemp: state.value.onlytemp,
    showz: state.value.showz,
    layerz: state.value.layerz,
    pararel: state.value.pararel,
  };
  
  return {
    setval: setval,
    graph: graph,
  };
}

// 選択中のボクセルタイプとUI表示を更新する
function setSelectedType(type) {
  state.value.selectedType = type;
  const pickLayer = document.getElementById("pickLayer");
  if (pickLayer) {
    if (type === VoxelType.INSIDE) {
      return;
    }
    if (type === VoxelType.AC) {
      pickLayer.value = "innerWall";
    } else if (type === VoxelType.OBSTACLE || type === VoxelType.CL) {
      pickLayer.value = "floor1";
    } else {
      pickLayer.value = "ray";
    }
  }
}

// ACtype変更時に温度初期値を設定
function updateTemperatureByACtype(actype) {
  if (actype === 1) {
    // 夏（冷房）
    state.value.InsidePhi = 30;
    state.value.InletPhi = 35;
    state.value.FloorPhi = 30;
    state.value.ObsPhi = 30;
  } else if (actype === 2) {
    // 冬（暖房）
    state.value.InsidePhi = 15;
    state.value.InletPhi = 5;
    state.value.FloorPhi = 15;
    state.value.ObsPhi = 15;
  }
}

// フィールド作成
function createField() {
  rebuildScene();
}

// フィールド初期化
function resetField() {
  if (!confirm('フィールドを初期化しますか？')) return;
  
  state.value.nMeshX = 14;
  state.value.nMeshY = 8;
  state.value.nMeshZ = 14;
  state.value.unitSize = 0.3;
  state.value.history = [];
  state.value.selectedType = VoxelType.WINDOW;
  state.value.loadedFromSession = false;
  state.value.ACheat = false;
  
  rebuildScene();
}

// sessionStorageからシミュレーションデータを読み込む
function loadFromSessionStorage() {
  const cfdSimulationData = sessionStorage.getItem('cfdSimulationData');
  if (cfdSimulationData) {
    try {
      const jsonData = JSON.parse(cfdSimulationData);
      
      if (jsonData.setval) {
        const sv = jsonData.setval;
        state.value.nMeshX = (sv.nMeshX || 12) + 2;
        state.value.nMeshY = (sv.nMeshY || 8) + 2;
        state.value.nMeshZ = (sv.nMeshZ || 9) + 2;
        state.value.unitSize = sv.realX ? sv.realX / sv.nMeshX : 0.3;
        
        state.value.InsidePhi = sv.InsidePhi || 15;
        state.value.ObsPhi = sv.ObsPhi || 15;
        state.value.InletPhi = sv.InletPhi || 5;
        state.value.FloorPhi = sv.FloorPhi || 15;
        
        state.value.ACwind = sv.ACwind || 1;
        state.value.ACheat = false;
        state.value.ACdir = sv.ACdir || 1;
        state.value.windowKset = sv.windowKset || 6;
        state.value.wallKset = sv.wallKset || 2.5;
        state.value.maxtime = sv.maxtime || 40000;
        state.value.maxtime_minute = sv.maxtime_minute || 20;
        state.value.delta_t = sv.delta_t || 0.005;
        state.value.batch_sec = sv.batch_sec || 2;
        
        if (sv.meshtype && Array.isArray(sv.meshtype)) {
          state.value.meshtype = sv.meshtype;
        }
        
        if (sv.InletPhi > 25) {
          state.value.ACtype = 1;
        } else {
          state.value.ACtype = 2;
        }
      }
      
      if (jsonData.graph) {
        state.value.temperature = jsonData.graph.temperature || [17, 29];
        state.value.colordelete = jsonData.graph.colordelete || [false, false];
        state.value.arrowunit_multi = jsonData.graph.arrowunit_multi || 0;
        state.value.startfix = jsonData.graph.startfix || false;
        state.value.onlytemp = jsonData.graph.onlytemp || false;
        state.value.showz = jsonData.graph.showz || false;
        state.value.layerz = jsonData.graph.layerz || 5;
        state.value.pararel = jsonData.graph.pararel || 0;
      }
      
      sessionStorage.removeItem('cfdSimulationData');
      state.value.loadedFromSession = true;
      updateACheatByState();
      
      console.log('Loaded voxel data from simulation');
    } catch (error) {
      console.error('Failed to parse simulation data:', error);
    }
  }
}

// キーボード入力処理
function onKeyDown(event) {
  if (event.key === "Escape") {
    undoVoxel();
    return;
  }
  const isUndo = (event.ctrlKey || event.metaKey) && (event.key === "z" || event.key === "Z");
  if (isUndo) {
    event.preventDefault();
    undoVoxel();
  }
}

// 毎フレームのレンダリングループを回す
function animate() {
  animationId = requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

// ACtype変更ハンドラ
function onACTypeChange() {
  updateTemperatureByACtype(state.value.ACtype);
  updateACheatByState();
}

// 初期化
onMounted(() => {
  const canvas = canvasRef.value;
  if (!canvas) return;

  // Three.js初期化
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0f1115);

  camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000);
  camera.position.set(10, 8, 14);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.addEventListener("start", () => {
    controlsMoved = true;
  });
  controls.addEventListener("change", () => {
    const key = getFrontKey(getFrontPlanes());
    if (key !== state.value.frontKey) {
      state.value.frontKey = key;
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

  // イベントリスナー
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointerup", onPointerUp);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("resize", resizeRenderer);

  // sessionStorageから読み込み
  loadFromSessionStorage();
  
  // 初期化してアニメーション開始
  if (!state.value.loadedFromSession) {
    updateTemperatureByACtype(state.value.ACtype);
  }
  rebuildScene();
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
</script>

<template>
  <div class="voxel-container">
    <aside class="panel">
      <div class="header-section">
        <h1>CFD Voxel Editor</h1>
        <button @click="store.page='setting'" class="back-button">← メインメニューに戻る</button>
      </div>
      
      <section>
        <h2>フィールド設定</h2>
        <div class="row">
          <label>X (横)
            <input v-model.number="state.nMeshX" type="number" min="10" max="60" />
          </label>
          <label>Y (高さ)
            <input v-model.number="state.nMeshY" type="number" min="8" max="60" />
          </label>
          <label>Z (奥行)
            <input v-model.number="state.nMeshZ" type="number" min="10" max="60" />
          </label>
        </div>
        <div class="row">
          <label>unitSize (m)
            <input v-model.number="state.unitSize" type="number" min="0.05" step="0.05" />
          </label>
          <button @click="createField">フィールド作成</button>
        </div>
      </section>

      <section>
        <h2>ボクセル種類</h2>
        <div class="voxel-buttons">
          <button 
            type="button" 
            class="voxel-button" 
            :class="{ selected: state.selectedType === VoxelType.INSIDE }"
            @click="setSelectedType(VoxelType.INSIDE)"
            :style="{ '--voxel-color': '#111827' }"
          >空気</button>
          <button 
            type="button" 
            class="voxel-button" 
            :class="{ selected: state.selectedType === VoxelType.BOTTOM }"
            @click="setSelectedType(VoxelType.BOTTOM)"
            :style="{ '--voxel-color': '#8a5a44' }"
          >床</button>
          <button 
            type="button" 
            class="voxel-button" 
            :class="{ selected: state.selectedType === VoxelType.TOP }"
            @click="setSelectedType(VoxelType.TOP)"
            :style="{ '--voxel-color': '#4a5568' }"
          >天井</button>
          <button 
            type="button" 
            class="voxel-button" 
            :class="{ selected: state.selectedType === VoxelType.OUTSIDE }"
            @click="setSelectedType(VoxelType.OUTSIDE)"
            :style="{ '--voxel-color': '#d1d5db' }"
          >壁</button>
          <button 
            type="button" 
            class="voxel-button" 
            :class="{ selected: state.selectedType === VoxelType.WINDOW }"
            @click="setSelectedType(VoxelType.WINDOW)"
            :style="{ '--voxel-color': '#a7d8ff' }"
          >窓</button>
          <button 
            type="button" 
            class="voxel-button" 
            :class="{ selected: state.selectedType === VoxelType.SIDE }"
            @click="setSelectedType(VoxelType.SIDE)"
            :style="{ '--voxel-color': '#d1d5db' }"
          >内壁</button>
          <button 
            type="button" 
            class="voxel-button" 
            :class="{ selected: state.selectedType === VoxelType.OBSTACLE }"
            @click="setSelectedType(VoxelType.OBSTACLE)"
            :style="{ '--voxel-color': '#ff8acb' }"
          >家具</button>
          <button 
            type="button" 
            class="voxel-button" 
            :class="{ selected: state.selectedType === VoxelType.AC }"
            @click="setSelectedType(VoxelType.AC)"
            :style="{ '--voxel-color': '#f59e0b' }"
          >エアコン</button>
          <button 
            type="button" 
            class="voxel-button" 
            :class="{ selected: state.selectedType === VoxelType.CL }"
            @click="setSelectedType(VoxelType.CL)"
            :style="{ '--voxel-color': '#ef4444' }"
          >暖房器具</button>
        </div>
        <label class="checkbox">
          面の選択
          <select id="pickLayer">
            <option value="ray">クリック面</option>
            <option value="innerWall">壁の内側</option>
            <option value="floor1">床+1</option>
            <option value="floor2">床+2</option>
            <option value="floor3">床+3</option>
            <option value="floor4">床+4</option>
          </select>
        </label>
        <p class="hint">クリックで配置。INSIDEは表示しません。</p>
      </section>

      <section>
        <h2>シミュレーション対象</h2>
        <select v-model.number="state.ACtype" @change="onACTypeChange">
          <option :value="1">夏（冷房）</option>
          <option :value="2">冬（暖房）</option>
        </select>

        <h2>温度設定 (℃)</h2>
        <div class="row">
          <label>室内温度
            <input v-model.number="state.InsidePhi" type="number" min="0" max="40" step="0.5" />
          </label>
          <label>室外温度
            <input v-model.number="state.InletPhi" type="number" min="0" max="40" step="0.5" />
          </label>
        </div>
        <div class="row">
          <label>床温度
            <input v-model.number="state.FloorPhi" type="number" min="0" max="40" step="0.5" />
          </label>
          <label>障害物温度
            <input v-model.number="state.ObsPhi" type="number" min="0" max="40" step="0.5" />
          </label>
        </div>
      </section>

      <section>
        <h2>断熱性設定</h2>
        <div class="row">
          <label>窓の断熱性
            <select v-model.number="state.windowKset">
              <option :value="6">シングルガラス</option>
              <option :value="3">複層ガラス</option>
              <option :value="1.5">low-eガラス</option>
            </select>
          </label>
          <label>壁の断熱性
            <select v-model.number="state.wallKset">
              <option :value="2.5">無断熱</option>
              <option :value="1.0">30mm</option>
              <option :value="0.6">50mm</option>
              <option :value="0.3">100mm</option>
            </select>
          </label>
        </div>
      </section>

      <section>
        <h2>エアコン設定</h2>
        <div class="row">
          <label>風速
            <input v-model.number="state.ACwind" type="number" min="0" max="10" step="0.5" />
          </label>
          <label>風向き
            <select v-model.number="state.ACdir">
              <option :value="1">下向き</option>
              <option :value="2">水平方向</option>
            </select>
          </label>
        </div>
      </section>

      <section>
        <h2>出力</h2>
        <div class="row">
          <button @click="saveFile">ファイル保存</button>
          <button @click="openSimulation" class="simulation-btn">シミュレーション起動</button>
        </div>
        <div class="row">
          <button @click="resetField" class="reset-btn">フィールド初期化</button>
        </div>
      </section>

      <section>
        <h2>操作</h2>
        <ul>
          <li>左ドラッグ: 視点回転</li>
          <li>右ドラッグ: 平行移動</li>
          <li>ホイール: ズーム</li>
          <li>セルクリック: 選択セルに配置</li>
        </ul>
      </section>
    </aside>

    <main class="viewport">
      <canvas ref="canvasRef"></canvas>
    </main>
  </div>
</template>

<style scoped>
* {
  box-sizing: border-box;
}

.voxel-container {
  display: grid;
  grid-template-columns: 320px 1fr;
  height: 100vh;
  background: #0f1115;
  color: #e6e7ea;
}

.panel {
  background: #171a21;
  padding: 16px;
  overflow-y: auto;
  border-right: 1px solid #2a2f3a;
}

.panel h1 {
  font-size: 20px;
  margin: 0 0 12px;
}

.header-section {
  margin-bottom: 16px;
}

.back-button {
  width: 100%;
  margin-top: 8px;
  background: #4a5568 !important;
}

.back-button:hover {
  background: #5a6578 !important;
}

.panel h2 {
  font-size: 14px;
  margin: 16px 0 8px;
  color: #b4b8c6;
}

.panel .row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.panel label {
  display: flex;
  flex-direction: column;
  font-size: 12px;
  gap: 4px;
  flex: 1;
}

.panel .checkbox {
  flex-direction: row;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  margin-top: 8px;
}

.panel .checkbox select {
  flex: 1;
}

.panel input,
.panel select,
.panel button,
.panel textarea {
  border-radius: 6px;
  border: 1px solid #2a2f3a;
  background: #0f1115;
  color: #e6e7ea;
  padding: 6px 8px;
  font-size: 12px;
}

.panel button {
  cursor: pointer;
  background: #2b6cb0;
  border: none;
}

.panel button:hover {
  background: #2f79c5;
}

.simulation-btn {
  background: #16a34a !important;
}

.simulation-btn:hover {
  background: #15803d !important;
}

.reset-btn {
  background: #ef4444 !important;
  color: white !important;
}

.reset-btn:hover {
  background: #dc2626 !important;
}

.panel textarea {
  width: 100%;
  margin-top: 8px;
  resize: vertical;
}

.voxel-buttons {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
  margin-bottom: 8px;
}

.voxel-button {
  border: 1px solid #2a2f3a;
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 12px;
  color: #e6e7ea;
  text-align: left;
  cursor: pointer;
  background: #0f1115;
  position: relative;
}

.voxel-button::before {
  content: "";
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 3px;
  margin-right: 6px;
  background: var(--voxel-color, #888);
  vertical-align: middle;
}

.voxel-button.selected {
  outline: 2px solid #63b3ed;
  border-color: transparent;
}

.hint {
  font-size: 12px;
  color: #8890a6;
}

.viewport {
  position: relative;
}

canvas {
  width: 100%;
  height: 100%;
  display: block;
}

ul {
  margin: 0;
  padding-left: 16px;
  font-size: 12px;
  color: #9aa3b8;
}
</style>
