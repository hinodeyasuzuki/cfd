<script setup>
//  detail simuration setting
//
import { ref, watch, onMounted } from "vue"
import { Store } from "@/stores/store"
import { Scenario } from "@/assets/scenario.js"

const store = Store();
const scenario = new Scenario();

let detaildisp = ref(scenario.detaildisp);
let detaildisp2 = ref(scenario.detaildisp2);
let selects = ref(scenario.selects);

store.structure.init(store.setval);
store.structure2.init(store.setval2);

onMounted(() => {
  const canvas = document.getElementById("mesh");
  ctx = canvas.getContext("2d");
  const canvas2 = document.getElementById("mesh2");
  ctx2 = canvas2.getContext("2d");
  draw();
  draw2();
});

//view update by input  =============================
watch(() => store.setval, () => {
  store.structure.init(store.setval);
  for (let name in store.setval) {
    if( store.detaildisp2[name] ) continue;
    store.setval2[name] = store.setval[name];
  }
  draw();
}, { deep: true }
);
watch(() => store.setval2, () => {
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

</script>

<template>
  <h1>{{ store.title }}　詳細設定</h1>
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
      <input type="button" value="シミュレーション開始" @click="store.page = 'graph'">
      <input type="button" v-if="store.graph.pararel == 2" value="1画面化" @click="store.graph.pararel = 1">
      <input type="button" v-if="store.graph.pararel == 1" value="2画面化" @click="store.graph.pararel = 2">
      <input type="button" value="初期化" @click="store.page = 'setting'">
    </div>

    <canvas id="mesh" width="600" height="600"></canvas>
    <canvas id="mesh2" width="600" height="600"></canvas>

    <p>視点移動：
    <input type="button" value="左" @click="move(1, 0)">
    <input type="button" value="右" @click="move(-1, 0)">
    <input type="button" value="上" @click="move(0, -1)">
    <input type="button" value="下" @click="move(0, 1)"></p>

  </div>
</template>

<style scoped></style>
