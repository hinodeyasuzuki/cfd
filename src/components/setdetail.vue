<script setup>
//  detail simuration setting
//
import { ref, watch, onMounted } from "vue"
import { Store } from "@/stores/store"
import { Scenario } from "@/assets/scenario.js"
import FileUpload from "@/components/FileUpload.vue"

const store = Store();
const scenario = new Scenario();

let detaildisp = ref(scenario.detaildisp);
let detaildisp2 = ref(scenario.detaildisp2);
let selects = ref(scenario.selects);

// meshtype が存在する場合のみ初期化
if (store.setval.meshtype && store.setval.meshtype.length > 0) {
  store.structure.init(store.setval);
  store.structure2.init(store.setval2);
}

onMounted(() => {
});

//file upload(read)=========================
const onFileLoad = (jsondata) => {
  store.paramstore(jsondata);
  store.structure.init(store.setval);
  store.page = 'setdetail';
}

//view update by input  =============================
watch(() => store.setval, () => {
  store.structure.init(store.setval);
  for (let name in store.setval) {
    if( detaildisp2.value[name] ) continue;
    store.setval2[name] = store.setval[name];
  }
  draw();
}, { deep: true }
);
watch(() => store.setval2, () => {
  // setval2が空の場合はスキップ
  if( !store.setval2.maxtime ) return;
  store.structure2.init(store.setval2);
  draw2();
}, { deep: true }
);

//view move =============================
var ctx, ctx2;
function move(x, y) {
  store.viewpoint_x += x;
  store.viewpoint_y += y;
  draw();
  if( store.graph.pararel == 2) draw2();
}

//draw structure mesh  
function draw() {
  ctx.clearRect(0, 0, 600, 600);
  store.structure.draw_mesh(ctx);
  store.structure.draw_wall(ctx);
}

function draw2() {
  ctx2.clearRect(0, 0, 600, 600);
  store.structure2.draw_mesh(ctx2);
  store.structure2.draw_wall(ctx2);
}

function goVoxelEditor() {
  store.saveToSessionStorage();
  store.page = 'voxel';
}



</script>

<template>
  <h1>{{ store.title }}</h1>
  <h2>パラメータ設定</h2>
  <p>
      <input type="button" value="3D設計" @click="goVoxelEditor">
      <input type="button" value="初期化" @click="store.page = 'setting'">
    <FileUpload @load="onFileLoad" />
  </p>
  <div class="wrapper">
    <div class="setting">

      <template v-for="(val, name) in detaildisp">
        <div class="title">
          <h3>{{ val }}</h3>
        </div>

        <div class="item">
          <input type="text" v-if="!selects[name]" v-model.number="store.setval[name]">
          <select v-if="selects[name]" v-model="store.setval[name]">
            <option v-for="item in selects[name]" :value="item.value">{{ item.title }}</option>
          </select>
        </div>
        <div class="item" v-if="store.graph.pararel == 2 && detaildisp2[name]">
          <input type="text" v-if="!selects[name]" v-model.number="store.setval2[name]">
          <select v-if="selects[name]" v-model="store.setval2[name]">
            <option v-for="item in selects[name]" :value="item.value">{{ item.title }}</option>
          </select>
        </div>
      </template>
      <p class="clear"></p>
      <p class="clear center mt20">
        <label>
          <input type="radio" name="pararel" :value="1" :checked="store.graph.pararel === 1" @change="() => { store.graph.pararel = 1 }">
          1画面
        </label>&nbsp;&nbsp;
        <label>
          <input type="radio" name="pararel" :value="2" :checked="store.graph.pararel === 2" @change="() => { store.graph.pararel = 2 }">
          2画面比較
        </label>&nbsp;&nbsp;
        <input type="button" value="シミュレーション実行" @click="store.page='graph'">
      </p>
    </div>
  </div>
</template>

<style scoped>
h2{
  color:#1f2937;
}
.center{
  text-align: center;
}
.mt20{
  margin-top: 20px;
}
</style>
