<script setup>
import { ref, onMounted, watch, nextTick } from 'vue';
import { Store } from '@/stores/store';
import VoxelPanel from './VoxelPanel.vue';
import VoxelCanvas from './VoxelCanvas.vue';
import { isACAllowedCell } from './voxelPlacementRules';

// state:ボクセル編集画面でのメッシュデータ作成

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

//初期値・voxel設定変数
const state = ref({
  nMeshX: 16,
  nMeshY: 10,
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
  ACwind: 2,
  ACpower:2800,
  ACheat: false,
  ACdir: 2,
  CirculatorWind: 0,
  
  windowKset: 6,
  wallKset: 2.5,
  atrium: false,
  title: "CFD設定",
  floor: 1,
  
  temperature: [10, 23],
  colordelete: [false, false],
  arrowunit_multi: 0,
  startfix: false,
  onlytemp: false,
  showz: false,
  layerz: 5,
  pararel: 0,
  
  frontKey: null,
});

// ファイル保存/store用：JSONデータ生成
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
    ACpower: state.value.ACpower,
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
  
  // setval2 も同じ内容で生成（比較用）
  let setval2 = { ...setval };
  
  return {
    setval: setval,
    setval2: setval2,
    graph: graph,
  };
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
async function openSimulation() {
  // VoxelCanvas がマウントされているか確認
  if (!canvasRef.value) {
    alert('3D設計画面が初期化されていません。しばらくお待ちください。');
    return;
  }
  
  // meshtype が初期化されていない場合は初期化
  if (!state.value.meshtype || state.value.meshtype.length === 0) {
    // rebuildScene を呼んで meshtype を初期化
    canvasRef.value.rebuildScene(true);
    // nextTick で更新を待つ
    await nextTick();
    
    // まだ meshtype がない場合はエラー
    if (!state.value.meshtype || state.value.meshtype.length === 0) {
      alert('ボクセルデータの初期化に失敗しました。');
      return;
    }
  }
  
  const jsonData = generateJsonData();
  const jsonString = JSON.stringify(jsonData);  
  sessionStorage.setItem('cfdVoxelData', jsonString);
  
  // storeにデータを設定（ページ遷移前に設定）
  store.paramstore(jsonData);
  
  // meshtype を明示的に store.setval と setval2 に設定
  if (!state.value.meshtype || state.value.meshtype.length === 0) {
    alert('meshtype が空です。');
    return;
  }
  
  // meshtype の構造を検証
  if (!state.value.meshtype[0] || !state.value.meshtype[0][0]) {
    alert('meshtype の構造が不正です。');
    return;
  }
  
  // meshtype のサイズが nMeshX/Y/Z と一致するか確認
  if (state.value.meshtype.length !== state.value.nMeshX ||
      state.value.meshtype[0].length !== state.value.nMeshY ||
      state.value.meshtype[0][0].length !== state.value.nMeshZ) {
    alert(`meshtype のサイズが不一致です。\n` +
          `meshtype: ${state.value.meshtype.length} x ${state.value.meshtype[0].length} x ${state.value.meshtype[0][0].length}\n` +
          `expected: ${state.value.nMeshX} x ${state.value.nMeshY} x ${state.value.nMeshZ}\n` +
          `「フィールド作成」ボタンをクリックしてください。`);
    return;
  }
  
  store.setval.meshtype = state.value.meshtype;
  store.setval2.meshtype = state.value.meshtype;
  
  // structure を初期化（ページ遷移前に初期化）
  try {
    store.structure.init(store.setval);
    store.structure2.init(store.setval2);
  } catch (error) {
    console.error('structure.init エラー:', error);
    alert('structure の初期化に失敗しました: ' + error.message);
    return;
  }
  
  // nextTick で更新を待つ
  await nextTick();
  
  // メインのシミュレーション画面に遷移
  store.page = 'setdetail';
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

// AC暖房は「冬」かつACボクセルがある場合のみ有効
function updateACheatByState() {
  const hasAC = state.value.meshtype?.some((plane) =>
    plane.some((row) => row.some((cell) => cell === VoxelType.AC))
  );
  state.value.ACheat = state.value.ACtype === 2 && !!hasAC;
}

// sessionStorageからシミュレーションデータを読み込む
function loadFromSessionStorage() {
  const cfdSimulationData = sessionStorage.getItem('cfdSimulationData');
  if (cfdSimulationData) {
    try {
      const jsonData = JSON.parse(cfdSimulationData);
      
      if (jsonData.setval) {
        const sv = jsonData.setval;
        state.value.nMeshX = (sv.nMeshX ?? 12) + 2;
        state.value.nMeshY = (sv.nMeshY ?? 8) + 2;
        state.value.nMeshZ = (sv.nMeshZ ?? 9) + 2;
        state.value.unitSize = sv.realX && sv.nMeshX ? sv.realX / sv.nMeshX : 0.3;
        
        state.value.InsidePhi = sv.InsidePhi ?? state.value.InsidePhi;
        state.value.ObsPhi = sv.ObsPhi ?? state.value.ObsPhi;
        state.value.InletPhi = sv.InletPhi ?? state.value.InletPhi;
        state.value.FloorPhi = sv.FloorPhi ?? state.value.FloorPhi;
        
        state.value.WindowYr = sv.WindowYr ?? state.value.WindowYr;
        state.value.WindowHr = sv.WindowHr ?? state.value.WindowHr;
        state.value.WindowZr = sv.WindowZr ?? state.value.WindowZr;
        state.value.WindowWr = sv.WindowWr ?? state.value.WindowWr;
        state.value.Window2Yr = sv.Window2Yr ?? state.value.Window2Yr;
        state.value.Window2Hr = sv.Window2Hr ?? state.value.Window2Hr;
        state.value.Window2Xr = sv.Window2Xr ?? state.value.Window2Xr;
        state.value.Window2Wr = sv.Window2Wr ?? state.value.Window2Wr;
        
        state.value.ACtype = sv.ACtype ?? state.value.ACtype;
        state.value.ACwall = sv.ACwall ?? state.value.ACwall;
        state.value.ACwind = sv.ACwind ?? state.value.ACwind;
        state.value.ACpower = sv.ACpower ?? state.value.ACpower;
        state.value.ACdir = sv.ACdir ?? state.value.ACdir;
        state.value.CirculatorWind = sv.CirculatorWind ?? state.value.CirculatorWind;
        state.value.ACheat = false;
        
        state.value.windowKset = sv.windowKset ?? state.value.windowKset;
        state.value.wallKset = sv.wallKset ?? state.value.wallKset;
        state.value.atrium = sv.atrium ?? state.value.atrium;
        state.value.title = sv.title ?? state.value.title;
        state.value.floor = sv.floor ?? state.value.floor;
        
        state.value.maxtime = sv.maxtime ?? state.value.maxtime;
        state.value.maxtime_minute = sv.maxtime_minute ?? state.value.maxtime_minute;
        state.value.delta_t = sv.delta_t ?? state.value.delta_t;
        state.value.batch_sec = sv.batch_sec ?? state.value.batch_sec;
        
        if (sv.meshtype && Array.isArray(sv.meshtype)) {
          state.value.meshtype = sv.meshtype;
        }
      }
      
      if (jsonData.graph) {
        state.value.temperature = jsonData.graph.temperature || [10, 23];
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
      
      // meshtype が復元されたので、3Dシーンを再レンダリング
      nextTick(() => {
        canvasRef.value?.rebuildScene();
      });
      
      console.log('Loaded voxel data from simulation');
    } catch (error) {
      console.error('Failed to parse simulation data:', error);
    }
  }
}

// パネルのハンドラ
function onCreateField(payload) {
  // 確認ダイアログを表示
  if (!confirm('フィールドを再作成すると、現在の設定がすべてクリアされます。\nよろしいですか？')) {
    return;
  }

  if (payload) {
    state.value.nMeshX = payload.nMeshX ?? state.value.nMeshX;
    state.value.nMeshY = payload.nMeshY ?? state.value.nMeshY;
    state.value.nMeshZ = payload.nMeshZ ?? state.value.nMeshZ;
    state.value.unitSize = payload.unitSize ?? state.value.unitSize;
  }
  
  // meshtype と履歴をクリアして初期化
  state.value.meshtype = [];
  state.value.history = [];
  state.value.pickMap = [];
  
  // フィールド作成時はカメラをリセット
  canvasRef.value?.rebuildScene(true);
}

function onSetSelectedType(type) {
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

function onACTypeChange() {
  updateTemperatureByACtype(state.value.ACtype);
  updateACheatByState();
}

// Canvasのハンドラ
function onUpdateVoxel({ cell, type }) {
  if (!canPlaceVoxel(cell, type)) {
    console.log('Cannot place voxel at', cell, 'type:', type);
    return;
  }
  if (!state.value.meshtype || state.value.meshtype.length === 0) {
    console.error('meshtype array not initialized');
    return;
  }
  const prev = state.value.meshtype?.[cell.x]?.[cell.y]?.[cell.z];
  if (prev === undefined) {
    console.error('Invalid cell coordinates:', cell);
    return;
  }
  if (prev === type) return;
  state.value.history.push({ x: cell.x, y: cell.y, z: cell.z, prev });
  state.value.meshtype[cell.x][cell.y][cell.z] = type;
  updateACheatByState();
  canvasRef.value?.rebuildScene();
}

// 複数セルを一括配置
function onUpdateVoxels({ cells, type }) {
  if (!state.value.meshtype || state.value.meshtype.length === 0) {
    console.error('meshtype array not initialized');
    return;
  }
  for (const cell of cells) {
    if (!canPlaceVoxel(cell, type)) {
      console.log('Cannot place voxel at', cell, 'type:', type);
      continue;
    }
    const prev = state.value.meshtype?.[cell.x]?.[cell.y]?.[cell.z];
    if (prev === undefined) {
      console.error('Invalid cell coordinates:', cell);
      continue;
    }
    if (prev !== type) {
      state.value.history.push({ x: cell.x, y: cell.y, z: cell.z, prev });
      state.value.meshtype[cell.x][cell.y][cell.z] = type;
    }
  }
  updateACheatByState();
  canvasRef.value?.rebuildScene();
}

// 複数セルをクリア
function onClearVoxels({ cells }) {
  if (!state.value.meshtype || state.value.meshtype.length === 0) {
    console.error('meshtype array not initialized');
    return;
  }
  for (const cell of cells) {
    const prev = state.value.meshtype?.[cell.x]?.[cell.y]?.[cell.z];
    if (prev === undefined) {
      console.error('Invalid cell coordinates:', cell);
      continue;
    }
    if (prev !== VoxelType.INSIDE) {
      state.value.history.push({ x: cell.x, y: cell.y, z: cell.z, prev });
      state.value.meshtype[cell.x][cell.y][cell.z] = VoxelType.INSIDE;
    }
  }
  updateACheatByState();
  canvasRef.value?.rebuildScene();
}

function onCanvasUpdateState(updates) {
  if (updates.meshtype) state.value.meshtype = updates.meshtype;
  if (updates.pickMap) state.value.pickMap = updates.pickMap;
  if (updates.frontKey) state.value.frontKey = updates.frontKey;
  if (updates.undoRequest) {
    undoVoxel();
  }
}

// Voxelロジック関数
function isSideSurface(cell) {
  const { nMeshX, nMeshZ } = state.value;
  return cell.x === 0 || cell.x === nMeshX - 1 || cell.z === 0 || cell.z === nMeshZ - 1;
}

function isBottomAllowed(cell) {
  return cell.z === 0;
}

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

function isACAllowed(cell) {
  return isACAllowedCell(cell, state.value);
}

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
      return isACAllowed(cell);
    case VoxelType.OBSTACLE:
    case VoxelType.CL:
      return hasAdjacentType(cell, [VoxelType.BOTTOM, VoxelType.OBSTACLE]);
    default:
      return true;
  }
}

// 直前の変更を取り消してボクセルを元に戻す
function undoVoxel() {
  const last = state.value.history.pop();
  if (!last) return;
  state.value.meshtype[last.x][last.y][last.z] = last.prev;
  updateACheatByState();
  canvasRef.value?.rebuildScene();
}

// 初期化
onMounted(() => {
  loadFromSessionStorage();
  
  if (!state.value.loadedFromSession) {
    updateTemperatureByACtype(state.value.ACtype);
  }
  
  // store.setval と meshtype を同期
  if (state.value.meshtype && state.value.meshtype.length > 0) {
    store.setval.meshtype = state.value.meshtype;
  }
});

// meshtype の変更を store に同期
watch(
  () => state.value.meshtype,
  (newMeshtype) => {
    if (newMeshtype && newMeshtype.length > 0) {
      store.setval.meshtype = newMeshtype;
    }
  },
  { deep: true }
);
</script>

<template>
  <div class="voxel-container">
    <VoxelPanel
      :state="state"
      :VoxelType="VoxelType"
      @createField="onCreateField"
      @setSelectedType="onSetSelectedType"
      @onACTypeChange="onACTypeChange"
      @saveFile="saveFile"
      @openSimulation="openSimulation"
    />
    <VoxelCanvas
      ref="canvasRef"
      :state="state"
      :VoxelType="VoxelType"
      :VoxelColors="VoxelColors"
      @updateVoxel="onUpdateVoxel"
      @updateVoxels="onUpdateVoxels"
      @clearVoxels="onClearVoxels"
      @updateState="onCanvasUpdateState"
    />
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
</style>
