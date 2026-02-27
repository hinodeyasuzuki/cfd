<script setup>
import { computed, ref, watch } from 'vue';
import { Store } from '@/stores/store';

const store = Store();

const props = defineProps({
  state: Object,
  VoxelType: Object,
});

const emit = defineEmits(['createField', 'setSelectedType', 'onACTypeChange', 'saveFile', 'openSimulation', 'resetField']);

const isVoxelSelected = (type) => props.state.selectedType === type;

const localMeshX = ref(props.state.nMeshX);
const localMeshY = ref(props.state.nMeshY);
const localMeshZ = ref(props.state.nMeshZ);
const localUnitSize = ref(props.state.unitSize);

watch(
  () => [props.state.nMeshX, props.state.nMeshY, props.state.nMeshZ, props.state.unitSize],
  ([nMeshX, nMeshY, nMeshZ, unitSize]) => {
    localMeshX.value = nMeshX;
    localMeshY.value = nMeshY;
    localMeshZ.value = nMeshZ;
    localUnitSize.value = unitSize;
  }
);
</script>

<template>
  <aside class="panel">
    <div class="header-section">
      <h1>CFD 3D設計</h1>
      <!-- <button @click="store.page='setdetail'" class="back-button">→ 詳細計算設定へ</button> -->
    </div>
    
    <section>
      <h2>フィールド設定</h2>
      <div class="row">
        <label>X (横)
          <input v-model.number="localMeshX" type="number" min="10" max="60" />
        </label>
        <label>Y (高さ)
          <input v-model.number="localMeshY" type="number" min="8" max="60" />
        </label>
        <label>Z (奥行)
          <input v-model.number="localMeshZ" type="number" min="10" max="60" />
        </label>
      </div>
      <div class="row">
        <label>セルのサイズ (m)
          <input v-model.number="localUnitSize" type="number" min="0.05" step="0.05" />
        </label>
        <button @click="emit('createField', { nMeshX: localMeshX, nMeshY: localMeshY, nMeshZ: localMeshZ, unitSize: localUnitSize })">フィールド作成（初期化）</button>
      </div>
    </section>

    <section>
      <h2>ボクセル種類</h2>
      <div class="voxel-buttons">
        <button 
          type="button" 
          class="voxel-button" 
          :class="{ selected: isVoxelSelected(VoxelType.INSIDE) }"
          @click="emit('setSelectedType', VoxelType.INSIDE)"
          :style="{ '--voxel-color': '#111827' }"
        >空気</button>
        <button 
          type="button" 
          class="voxel-button" 
          :class="{ selected: isVoxelSelected(VoxelType.BOTTOM) }"
          @click="emit('setSelectedType', VoxelType.BOTTOM)"
          :style="{ '--voxel-color': '#8a5a44' }"
        >床</button>
        <button 
          type="button" 
          class="voxel-button" 
          :class="{ selected: isVoxelSelected(VoxelType.TOP) }"
          @click="emit('setSelectedType', VoxelType.TOP)"
          :style="{ '--voxel-color': '#4a5568' }"
        >天井</button>
        <button 
          type="button" 
          class="voxel-button" 
          :class="{ selected: isVoxelSelected(VoxelType.OUTSIDE) }"
          @click="emit('setSelectedType', VoxelType.OUTSIDE)"
          :style="{ '--voxel-color': '#d1d5db' }"
        >壁</button>
        <button 
          type="button" 
          class="voxel-button" 
          :class="{ selected: isVoxelSelected(VoxelType.WINDOW) }"
          @click="emit('setSelectedType', VoxelType.WINDOW)"
          :style="{ '--voxel-color': '#a7d8ff' }"
        >窓</button>
        <button 
          type="button" 
          class="voxel-button" 
          :class="{ selected: isVoxelSelected(VoxelType.SIDE) }"
          @click="emit('setSelectedType', VoxelType.SIDE)"
          :style="{ '--voxel-color': '#d1d5db' }"
        >内壁</button>
        <button 
          type="button" 
          class="voxel-button" 
          :class="{ selected: isVoxelSelected(VoxelType.OBSTACLE) }"
          @click="emit('setSelectedType', VoxelType.OBSTACLE)"
          :style="{ '--voxel-color': '#ff8acb' }"
        >家具</button>
        <button 
          type="button" 
          class="voxel-button" 
          :class="{ selected: isVoxelSelected(VoxelType.AC) }"
          @click="emit('setSelectedType', VoxelType.AC)"
          :style="{ '--voxel-color': '#f59e0b' }"
        >エアコン</button>
        <button 
          type="button" 
          class="voxel-button" 
          :class="{ selected: isVoxelSelected(VoxelType.CL) }"
          @click="emit('setSelectedType', VoxelType.CL)"
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
      <select v-model.number="state.ACtype" @change="emit('onACTypeChange')">
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
        <label>風速(m/s)
          <input v-model.number="state.ACwind" type="number" min="0" max="10" step="0.5" />
        </label>
        <label>風向き
          <select v-model.number="state.ACdir">
            <option :value="1">下向き</option>
            <option :value="2">水平方向</option>
          </select>
        </label>
      </div>
      <div class="row">
        <label>冷暖房能力(W)
          <input v-model.number="state.ACpower" type="number" min="2200" max="5000" step="200" />
        </label>
      </div>
    </section>

    <section>
      <h2>出力</h2>
      <div class="row">
        <button @click="emit('saveFile')">ファイル保存</button>
        <button @click="emit('openSimulation')" class="simulation-btn">シミュレーション起動</button>
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
</template>

<style scoped>
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
  background: #4a5568;
  border: 1px solid #2a2f3a;
  border-radius: 6px;
  padding: 6px 8px;
  color: #e6e7ea;
  cursor: pointer;
  font-size: 12px;
}

.back-button:hover {
  background: #5a6578;
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
.panel button:not(.back-button),
.panel textarea {
  border-radius: 6px;
  border: 1px solid #2a2f3a;
  background: #0f1115;
  color: #e6e7ea;
  padding: 6px 8px;
  font-size: 12px;
}

.panel button:not(.back-button) {
  cursor: pointer;
  background: #2b6cb0;
  border: none;
}

.panel button:not(.back-button):hover {
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

ul {
  margin: 0;
  padding-left: 16px;
  font-size: 12px;
  color: #9aa3b8;
}
</style>
