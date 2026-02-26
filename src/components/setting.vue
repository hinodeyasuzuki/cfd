<script setup>
// データ読み込み（ファイル/パラメータ)
// シナリオ設定
import { ref, watch, onMounted, nextTick } from "vue"
import { Store } from "@/stores/store"
import { Scenario } from "@/assets/scenario.js"
import FileUpload from "@/components/FileUpload.vue"

const store = Store();
const scenario = new Scenario();
let scenariosel = ref(scenario.sel);

store.graph.pararel = 1;

//scenarioset input value set ========================
// name: scenario name
// fgMesh: update mesh
const scenarioset = (name, fgMesh) => {
  if (name == "meshsize") {
    let def = scenario.def.roomsize.data[scenariosel.roomsize];
    if (scenariosel.meshsize == 0) {
      store.setval.nMeshX = def.nMeshX;
      store.setval.nMeshY = def.nMeshY;
      store.setval.nMeshZ = def.nMeshZ;
    } else if (scenariosel.meshsize == 1) {
      store.setval.nMeshX = def.nMeshX * 2;
      store.setval.nMeshY = def.nMeshY * 2;
      store.setval.nMeshZ = def.nMeshZ * 2;
    }
    store.setval2.nMeshX = store.setval.nMeshX;
    store.setval2.nMeshY = store.setval.nMeshY;
    store.setval2.nMeshZ = store.setval.nMeshZ;

  } else {
    let data = scenario.def[name].data[scenariosel[name]];
    for (let k in data) {
      if (data[k] == "title") continue;
      store.setval[k] = data[k];
      store.setval2[k] = data[k];
    }
  }
  if (fgMesh) {
    store.structure.init(store.setval); //display only structure 1
    draw();
  }
}

//initialize =========================
for (let name in scenario.def) {
  scenarioset(name, false);
}
store.structure.init(store.setval);

onMounted(() => {
  const canvas = document.getElementById("mesh");
  ctx = canvas.getContext("2d");
  draw();
});

//view move =============================
var ctx;
function move(x, y) {
  store.viewpoint_x += x;
  store.viewpoint_y += y;
  draw();
}

//draw structure mesh  
const draw = () => {
  ctx.clearRect(0, 0, 600, 600);
  store.structure.draw_mesh(ctx);
  store.structure.draw_wall(ctx);
}

//file upload(read)=========================
const onFileLoad = (jsondata) => {
  store.paramstore(jsondata);
  store.structure.init(store.setval);
  store.page = 'setdetail';
}

//Direct set by GET parameters ==============================
const url = new URL(window.location.href);
const param = url.searchParams.get('param');
if (param) {
  const jsondata = JSON.parse(decodeURIComponent(param));
  store.paramstore(jsondata);

  // delete query parameters   
  const url = new URL(window.location.href)
  history.replaceState(null, '', url.pathname) 

  store.structure.init(store.setval);

  store.page = 'setdetail';
}


</script>

<template>
  <h1>{{ store.title }}</h1>
  <h2>簡易設定</h2>
  <div class="wrapper">
    <div class="setting">

      <p><FileUpload @load="onFileLoad" /></p>
      <br />
      
      <template v-for="(item, name) in scenario.def">
        <div class="title">
          <h3>{{ item.group }}</h3>
        </div>
        <div class="item">
          <select v-model="scenariosel[name]" @change="scenarioset(name, true)">
            <option v-for="(data, index) in item.data" :value="index" :selected="index == scenariosel[name]">
              {{ data.title }}</option>
          </select>
        </div>
      </template>
      
      <p class="clear"></p>
      <input type="button" value="シミュレーション実行" @click="store.page='graph'">
      <input type="button" value="詳細計算設定" @click="store.page='setdetail'">
      <input type="button" value="2画面比較" @click="store.graph.pararel=2;store.page = 'setdetail'">
      <input type="button" value="3Dボクセルエディタ" @click="store.page='voxel'">
    </div>

    <canvas id="mesh" width="600" height="600"></canvas>

    <p>視点移動：
      <input type="button" value="◀" @click="move(1, 0)">
      <input type="button" value="▶" @click="move(-1, 0)">
      <input type="button" value="▲" @click="move(0, -1)">
      <input type="button" value="▼" @click="move(0, 1)">
    </p>

  </div>

</template>

<style scoped>
.title {
  margin: 5px;
}

.item {
  width: 50%;
}
</style>
