import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js";

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

const state = {
  nMeshX: 14,
  nMeshY: 8,
  nMeshZ: 14,
  unitSize: 0.3,
  meshtype: [],
  pickMap: [],
  history: [],
  selectedType: VoxelType.WINDOW,
  
  // CFD simulation parameters
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
  
  // Graph parameters
  temperature: [17, 29],
  colordelete: [false, false],
  arrowunit_multi: 0,
  startfix: false,
  onlytemp: false,
  showz: false,
  layerz: 5,
  pararel: 0,
};

const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0f1115);

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000);
camera.position.set(10, 8, 14);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.addEventListener("start", () => {
  controlsMoved = true;
});
controls.addEventListener("change", () => {
  const key = getFrontKey(getFrontPlanes());
  if (key !== state.frontKey) {
    state.frontKey = key;
    buildVoxels();
  }
});

const light = new THREE.DirectionalLight(0xffffff, 0.9);
light.position.set(10, 15, 5);
scene.add(light);
scene.add(new THREE.AmbientLight(0xffffff, 0.4));

const gridGroup = new THREE.Group();
const voxelGroup = new THREE.Group();
scene.add(gridGroup, voxelGroup);

let pickMesh = null;
let highlight = null;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let pendingCell = null;
let pointerDownPos = null;
let pointerMoved = false;
let controlsMoved = false;

// カメラ位置から見えている境界面インデックスと状態を計算する
function getFrontPlanes() {
  const { nMeshX, nMeshY, nMeshZ, unitSize } = state;
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
  return state.pickMap[instanceId] ?? null;
}

// 指定層の水平プレーンとの交点からセルを求める
function getPickCellFromLayer(layerOffset) {
  const { nMeshX, nMeshY, nMeshZ, unitSize } = state;
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
  const { nMeshX, nMeshY, nMeshZ, unitSize } = state;
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
  const mode = document.getElementById("pickLayer").value;
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
  const { nMeshX, nMeshY, nMeshZ, unitSize } = state;
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
  const { clientWidth, clientHeight } = canvas;
  renderer.setSize(clientWidth, clientHeight, false);
  camera.aspect = clientWidth / clientHeight;
  camera.updateProjectionMatrix();
}

window.addEventListener("resize", resizeRenderer);

// 初期メッシュ種別配列を生成し境界を設定する
function createMeshtype() {
  const { nMeshX, nMeshY, nMeshZ } = state;
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

  state.meshtype = data;
}

// レイピック用のインスタンス化メッシュを構築する
function buildPickMesh() {
  if (pickMesh) {
    scene.remove(pickMesh);
  }

  const { nMeshX, nMeshY, nMeshZ, unitSize } = state;
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
  state.pickMap = pickMap;
  pickMesh = instanced;
  scene.add(pickMesh);
}

// グリッドと境界ボックスを描画する
function buildGridHelpers() {
  gridGroup.clear();
  const { nMeshX, nMeshY, nMeshZ, unitSize } = state;

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
  const { nMeshX, nMeshY, nMeshZ, unitSize, meshtype } = state;

  const geometry = new THREE.BoxGeometry(unitSize, unitSize, unitSize);
  const front = getFrontPlanes();
  state.frontKey = getFrontKey(front);

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
  const { unitSize } = state;
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
  const { unitSize } = state;
  highlight.visible = true;
  highlight.position.set((cell.x + 0.5) * unitSize, (cell.y + 0.5) * unitSize, (cell.z + 0.5) * unitSize);
}

// シーン全体を再構築して初期状態に戻す
function rebuildScene() {
  createMeshtype();
  state.history = [];
  buildPickMesh();
  buildGridHelpers();
  buildVoxels();
  buildHighlight();
  fitCameraToField();
  resizeRenderer();
}

// 壁面セルかどうかを判定する
function isSideSurface(cell) {
  const { nMeshX, nMeshZ } = state;
  return cell.x === 0 || cell.x === nMeshX - 1 || cell.z === 0 || cell.z === nMeshZ - 1;
}

// 床タイプが配置可能か判定する
function isBottomAllowed(cell) {
  return cell.z === 0;
}

// 天井タイプが配置可能な領域か確認する
function isTopAllowed(cell) {
  const { nMeshX, nMeshY, nMeshZ } = state;
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
  const { nMeshX, nMeshY, nMeshZ, meshtype } = state;
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
  const prev = state.meshtype[cell.x][cell.y][cell.z];
  if (prev === type) return;
  state.history.push({ x: cell.x, y: cell.y, z: cell.z, prev });
  state.meshtype[cell.x][cell.y][cell.z] = type;
  buildVoxels();
}

// 直前の変更を取り消してボクセルを元に戻す
function undoVoxel() {
  const last = state.history.pop();
  if (!last) return;
  state.meshtype[last.x][last.y][last.z] = last.prev;
  buildVoxels();
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
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const cell = getPickCellForType(state.selectedType);
  setHighlightCell(cell);
}

// ポインタ押下時にセル候補を保持する
function onPointerDown(event) {
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const cell = getPickCellForType(state.selectedType);
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

  const rect = canvas.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const cell = getPickCellForType(state.selectedType);
  if (!cell) {
    pendingCell = null;
    pointerDownPos = null;
    return;
  }
  updateVoxel(cell, state.selectedType);
  pendingCell = null;
  pointerDownPos = null;
}

// メッシュ情報をJSON文字列として出力する (setting.vue互換形式)
function exportJson() {
  const output = document.getElementById("output");
  const jsonData = generateJsonData();
  output.value = JSON.stringify(jsonData);
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

// シミュレーション画面をGETパラメータ付きで開く
function openSimulation() {
  const jsonData = generateJsonData();
  const jsonString = JSON.stringify(jsonData);
  const encodedParam = encodeURIComponent(jsonString);
  
  // メインのシミュレーション画面のパス（相対パス）
  // const simulationUrl = `../index.html?param=${encodedParam}`;
  const simulationUrl = `../index.html`;
  
  // 新しいタブで開く
  window.open(simulationUrl, '_blank');
}

// JSON データを生成する共通関数
function generateJsonData() {
  const realX = (state.nMeshX-2) * state.unitSize;
  const realY = (state.nMeshY-2) * state.unitSize;
  const realZ = (state.nMeshZ-2) * state.unitSize;
  const maxreal = Math.max(realX, realY, realZ);
  const canvasfieldX = 400;
  const canvasfieldY = 400 * realY / realX;
  
  let setval = {
    maxtime: state.maxtime,
    maxtime_minute: state.maxtime_minute,
    delta_t: state.delta_t,
    batch_sec: state.batch_sec,
    realX: realX,
    realY: realY,
    realZ: realZ,
    maxreal: maxreal,
    canvasfieldX: canvasfieldX,
    canvasfieldY: canvasfieldY,
    nMeshX: state.nMeshX-2,
    nMeshY: state.nMeshY-2,
    nMeshZ: state.nMeshZ-2,
    InsidePhi: state.InsidePhi,
    ObsPhi: state.ObsPhi,
    InletPhi: state.InletPhi,
    FloorPhi: state.FloorPhi,
    WindowYr: state.WindowYr,
    WindowHr: state.WindowHr,
    WindowZr: state.WindowZr,
    WindowWr: state.WindowWr,
    Window2Yr: state.Window2Yr,
    Window2Hr: state.Window2Hr,
    Window2Xr: state.Window2Xr,
    Window2Wr: state.Window2Wr,
    ACtype: state.ACtype,
    ACwall: state.ACwall,
    ACwind: state.ACwind,
    ACheat: state.ACheat,
    ACdir: state.ACdir,
    CirculatorWind: state.CirculatorWind,
    windowKset: state.windowKset,
    wallKset: state.wallKset,
    atrium: state.atrium,
    title: state.title,
    floor: state.floor,
    meshtype: state.meshtype,
  };
  
  // setval2 is copy of setval (for 2-screen comparison)
  // let setval2 = {...setval};
  // if (state.ACdir === 2) {
  //   setval2.ACdir = 1;
  // }
  
  let graph = {
    temperature: state.temperature,
    colordelete: state.colordelete,
    arrowunit_multi: state.arrowunit_multi,
    startfix: state.startfix,
    onlytemp: state.onlytemp,
    showz: state.showz,
    layerz: state.layerz,
    pararel: state.pararel,
  };
  
  return {
    setval: setval,
    // setval2: setval2,
    graph: graph,
  };
}

// 選択中のボクセルタイプとUI表示を更新する
function setSelectedType(type) {
  state.selectedType = type;
  document.querySelectorAll(".voxel-button").forEach((button) => {
    const isSelected = Number(button.dataset.type) === type;
    button.classList.toggle("selected", isSelected);
  });
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

// ボタン群の初期化とクリックハンドラ登録
function initVoxelButtons() {
  const buttons = document.querySelectorAll(".voxel-button");
  buttons.forEach((button) => {
    const color = button.dataset.color || "#888";
    button.style.setProperty("--voxel-color", color);
    button.addEventListener("click", () => {
      setSelectedType(Number(button.dataset.type));
    });
  });
  if (buttons.length > 0) {
    setSelectedType(state.selectedType);
  }
}

// ACtype変更時に温度初期値を設定
function updateTemperatureByACtype(actype) {
  const InsidePhi = document.getElementById("InsidePhi");
  const InletPhi = document.getElementById("InletPhi");
  const FloorPhi = document.getElementById("FloorPhi");
  const ObsPhi = document.getElementById("ObsPhi");
  
  if (actype === 1) {
    // 夏（冷房）
    state.InsidePhi = 30;
    state.InletPhi = 35;
    state.FloorPhi = 30;
    state.ObsPhi = 30;
  } else if (actype === 2) {
    // 冬（暖房）
    state.InsidePhi = 15;
    state.InletPhi = 5;
    state.FloorPhi = 15;
    state.ObsPhi = 15;
  }
  
  // Update UI
  InsidePhi.value = state.InsidePhi;
  InletPhi.value = state.InletPhi;
  FloorPhi.value = state.FloorPhi;
  ObsPhi.value = state.ObsPhi;
}

// UI入力群のイベントを初期化する
function initUI() {
  const nMeshX = document.getElementById("nMeshX");
  const nMeshY = document.getElementById("nMeshY");
  const nMeshZ = document.getElementById("nMeshZ");
  const unitSize = document.getElementById("unitSize");
  
  // Set initial values from state
  nMeshX.value = state.nMeshX;
  nMeshY.value = state.nMeshY;
  nMeshZ.value = state.nMeshZ;
  unitSize.value = state.unitSize;

  document.getElementById("createField").addEventListener("click", () => {
    state.nMeshX = Number(nMeshX.value);
    state.nMeshY = Number(nMeshY.value);
    state.nMeshZ = Number(nMeshZ.value);
    state.unitSize = Number(unitSize.value);
    rebuildScene();
  });

  // ACtype settings
  const ACtype = document.getElementById("ACtype");
  ACtype.value = state.ACtype;
  
  ACtype.addEventListener("change", () => {
    state.ACtype = Number(ACtype.value);
    updateTemperatureByACtype(state.ACtype);
  });
  
  // Initialize temperature based on ACtype
  updateTemperatureByACtype(state.ACtype);

  // Temperature settings
  const InsidePhi = document.getElementById("InsidePhi");
  const InletPhi = document.getElementById("InletPhi");
  const FloorPhi = document.getElementById("FloorPhi");
  const ObsPhi = document.getElementById("ObsPhi");
  
  // Initial values are set by updateTemperatureByACtype above
  
  InsidePhi.addEventListener("input", () => {
    state.InsidePhi = Number(InsidePhi.value);
  });
  InletPhi.addEventListener("input", () => {
    state.InletPhi = Number(InletPhi.value);
  });
  FloorPhi.addEventListener("input", () => {
    state.FloorPhi = Number(FloorPhi.value);
  });
  ObsPhi.addEventListener("input", () => {
    state.ObsPhi = Number(ObsPhi.value);
  });
  
  // Insulation settings
  const windowKset = document.getElementById("windowKset");
  const wallKset = document.getElementById("wallKset");
  
  // Set initial values
  windowKset.value = state.windowKset;
  wallKset.value = state.wallKset;
  
  windowKset.addEventListener("change", () => {
    state.windowKset = Number(windowKset.value);
  });
  wallKset.addEventListener("change", () => {
    state.wallKset = Number(wallKset.value);
  });
  
  // AC settings
  const ACwind = document.getElementById("ACwind");
  const ACdir = document.getElementById("ACdir");
  const ACheat = document.getElementById("ACheat");
  
  // Set initial values
  ACwind.value = state.ACwind;
  ACdir.value = state.ACdir;
  ACheat.checked = state.ACheat;
  
  ACwind.addEventListener("input", () => {
    state.ACwind = Number(ACwind.value);
  });
  ACdir.addEventListener("change", () => {
    state.ACdir = Number(ACdir.value);
  });
  ACheat.addEventListener("change", () => {
    state.ACheat = ACheat.checked;
  });

  document.getElementById("exportJson").addEventListener("click", exportJson);
  document.getElementById("saveFile").addEventListener("click", saveFile);
  const openSimBtn = document.getElementById("openSimulation");
  if (openSimBtn) openSimBtn.addEventListener("click", openSimulation);
  initVoxelButtons();
}

// 毎フレームのレンダリングループを回す
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

canvas.addEventListener("pointermove", onPointerMove);
canvas.addEventListener("pointerdown", onPointerDown);
canvas.addEventListener("pointerup", onPointerUp);
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    undoVoxel();
    return;
  }
  const isUndo = (event.ctrlKey || event.metaKey) && (event.key === "z" || event.key === "Z");
  if (isUndo) {
    event.preventDefault();
    undoVoxel();
  }
});

initUI();
rebuildScene();
animate();
