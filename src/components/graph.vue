<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from "vue"
import { Store } from "@/stores/store"
import { CFD } from "@/assets/cfd"
import VueSlider from "vue-3-slider-component";
import { saveAs } from "file-saver"
import { Config } from "@/assets/config.js"
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const store = Store();
const conf = new Config();

//表示に関する変数
let disp = ref({});
let disp2 = ref({});
disp.value.floor = {};
disp2.value.floor = {};

//画面設定
store.graph.layerz = Math.floor(store.setval.nMeshZ / 2);
var arrowunit = 20;

//計算用変数
var timer;
var timerclose = ref(false);
var ctx3;

const canvasRef = ref(null);
const canvasRef2 = ref(null);
const colorCanvasRef = ref(null);
let graphView = null;
let graphView2 = null;
let animationId = null;
let isSyncingView = false;

//流れ表示のための経過ステップ
var steptime = 0;

//構造メッシュの生成
const cfd = new CFD();
const cfd2 = new CFD();

onMounted(() => {
  const canvas = canvasRef.value;
  const canvas2 = canvasRef2.value;
  const canvas3 = colorCanvasRef.value;
  if (!canvas || !canvas3) return;

  graphView = createGraphView(canvas);
  if (canvas2) {
    graphView2 = createGraphView(canvas2);
  }
  ctx3 = canvas3.getContext('2d');
  window.addEventListener('resize', resizeAllGraphViews);

  structureInit();
  colordisp();
  draw();
  animateGraph();
  calcStart();
});

onBeforeUnmount(() => {
  calcStop();
  if (animationId) cancelAnimationFrame(animationId);
  window.removeEventListener('resize', resizeAllGraphViews);
  disposeGraphView(graphView);
  disposeGraphView(graphView2);
  graphView = null;
  graphView2 = null;
});

const structureInit = function() {
  store.setval.batch_sec = store.setval.batch_sec_org;
  store.setval2.batch_sec = store.setval2.batch_sec_org;
  store.structure.init(store.setval);
  store.structure2.init(store.setval2);
  store.fgstop = false;
}


// start calculation =======================================
const calcStart = function () {  
  timerclose.value = false;
  //field set
  cfd.init(store.setval, store.structure.meshtype);
  cfd2.init(store.setval2, store.structure2.meshtype);

  var starttime = new Date();
  var nowtime = starttime;
  steptime = 0;
  disp.value.ackwh = 0;
  disp2.value.ackwh = 0;

  //timer loop
  timer = setInterval(function () {
    if (store.fgstop) return;

    //両方の計算ステップが完了している場合に、2つあわせて実行
    var restart = cfd.batch_end;
    if (store.graph.pararel == 2) restart &= cfd2.batch_end;

    if (restart) {
      //display span adjust, between 600 to 1000 ms
      nowtime = new Date();
      if (nowtime.getTime() - starttime.getTime() > 2000) {
        store.setval.batch_sec /= 1.5;
        store.setval2.batch_sec /= 1.5;
      }
      if (nowtime.getTime() - starttime.getTime() < 1000) {
        store.setval.batch_sec *= 1.5;
        store.setval2.batch_sec *= 1.5;
      }
      starttime = nowtime;
      draw();
    }

    //start calculation( skip in case of not restart)
    var endcalc = cfd.calc(restart);
    if (store.graph.pararel == 2) endcalc &= cfd2.calc(restart);

    steptime++;

    //時間上限に達したら終了
    if (endcalc) {
      calcStop();
    }

    //html update
    disp.value.sec = cfd.totaltime;
    disp.value.count = cfd.count;
    disp.value.leftin = cfd.heatin.heatleftin;
    disp.value.frontin = cfd.heatin.heatfrontin;
    disp.value.acheat = cfd.acheat;
    disp.value.ackwh += cfd.acheat * store.setval.batch_sec / 60 / 60 / 1000;
    if (store.graph.pararel == 2) {
      disp2.value.sec = cfd2.totaltime;
      disp2.value.count = cfd2.count;
      disp2.value.leftin = cfd2.heatin.heatleftin;
      disp2.value.frontin = cfd2.heatin.heatfrontin;
      disp2.value.acheat = cfd2.acheat;
      disp2.value.ackwh += cfd2.acheat * store.setval2.batch_sec / 60 / 60 / 1000;
    }
  }, 300);		//check by 300ms
};

//end and back to setting
const back = function (clear) {
  if( clear ) calcStop();
  store.page = 'setdetail';
};

//3D設計に戻る
const backTo3DDesign = function () {
  calcStop();
  // 現在の設定をsessionStorageに保存
  store.saveToSessionStorage();
  store.page = 'voxel';
};

//stop calculation
const calcStop = function () {
  store.fgstop = true;
  timerclose.value = true;
  clearInterval(timer);
};


//max min value in full field ================================
var nMeshX = store.setval.nMeshX;
var nMeshY = store.setval.nMeshY;
var nMeshZ = store.setval.nMeshZ;
var vmax = 0;         //verocity max

const calc_maxmin = function(cfd, meshtype) {
  var tmax = -100;    //temperature max
  var tmin = 100;     //temperature min
  var tav = 0;        //temperature average
  var tcount = 0; 
  vmax = 0;           //verocity max

  for (var i=1; i < nMeshX; i++) {
    for (var j=1; j < nMeshY; j++) {
      for (var k=1; k < nMeshZ; k++) {
        if( meshtype[i][j][k] != conf.val.INSIDE ) continue;
        if (cfd.Phi[i][j][k] > tmax) {
          tmax = cfd.Phi[i][j][k];
        }
        if (cfd.Phi[i][j][k] < tmin) {
          tmin = cfd.Phi[i][j][k];
        }
        var tmp = Math.sqrt(cfd.Vel[0][i][j][k] * cfd.Vel[0][i][j][k] + cfd.Vel[1][i][j][k] * cfd.Vel[1][i][j][k] + cfd.Vel[2][i][j][k] * cfd.Vel[2][i][j][k]);
        if (tmp > vmax) {
          vmax = tmp;
        }
        tav += cfd.Phi[i][j][k];
        tcount++;
      }
    }
  }
  if (vmax == 0) vmax = 0.01;
  return [ Math.round(vmax * 10) / 10,  Math.round(tmax * 10) / 10, Math.round(tmin * 10) / 10, Math.round(tav/tcount * 10) / 10];
}

// floor max/min
const calc_maxmin_floor = function(cfd, meshtype) {
  var tmax = -100;    //temperature max
  var tmin = 100;     //temperature min
  var tav = 0;        //temperature average
  var tcount = 0; 
  var vmax = 0;           //verocity max
  
  var j=2;  //floor

  for (var i=1; i < nMeshX; i++) {
    for (var k=1; k < nMeshZ; k++) {
      if( meshtype[i][j][k] != conf.val.INSIDE ) continue;
      if (cfd.Phi[i][j][k] > tmax) {
        tmax = cfd.Phi[i][j][k];
      }
      if (cfd.Phi[i][j][k] < tmin) {
        tmin = cfd.Phi[i][j][k];
      }
      var tmp = Math.sqrt(cfd.Vel[0][i][j][k] * cfd.Vel[0][i][j][k] + cfd.Vel[1][i][j][k] * cfd.Vel[1][i][j][k] + cfd.Vel[2][i][j][k] * cfd.Vel[2][i][j][k]);
      if (tmp > vmax) {
        vmax = tmp;
      }
      tav += cfd.Phi[i][j][k];
      tcount++;
    }
  }
  if (vmax == 0) vmax = 0.01;
  return [ Math.round(vmax * 10) / 10,  Math.round(tmax * 10) / 10, Math.round(tmin * 10) / 10, Math.round(tav/tcount * 10) / 10];
}


//display style update by setting change =========================
watch(() => store.graph, () => {
  arrowunit = 20 * Math.pow(2, store.graph.arrowunit_multi);
  colordisp();
  draw();
}, { deep: true }
);


//color tempelature =================================
const colordisp = function(){
  if (!ctx3) return;
  var colors = [];
  if( store.graph.temperature[1] - store.graph.temperature[0] > 20 ) {
    for (var i = store.graph.temperature[0]; i <= store.graph.temperature[1]; i+=2) {
      colors.push(i);
    }
  } else {
    for (var i = store.graph.temperature[0]; i <= store.graph.temperature[1]; i++) {
      colors.push(i);
    }
  }

  ctx3.clearRect(0, 0, 600, 40);
  ctx3.beginPath();
  for (var i = 0; i <= colors.length; i++) {
    ctx3.fillStyle = getColor(colors[i], 1);
    ctx3.fillRect(600 - (colors.length - i) * 20, 20, 20, 20);
    ctx3.fillStyle = "black";
    ctx3.fillText(colors[i], 600 - (colors.length - i) * 20 + 5, 10);
  }
  ctx3.stroke();
}

function createGraphView(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio || 1);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf3f8ff);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = false;

  const light = new THREE.DirectionalLight(0xffffff, 0.9);
  light.position.set(10, 15, 5);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));

  const staticGroup = new THREE.Group();
  const flowGroup = new THREE.Group();
  scene.add(staticGroup, flowGroup);

  const view = { renderer, scene, camera, controls, staticGroup, flowGroup };
  controls.addEventListener('change', () => {
    syncOtherView(view);
  });
  fitGraphCamera(view);
  resizeGraphView(view);
  return view;
}

function copyViewState(source, target) {
  if (!source || !target) return;
  target.camera.position.copy(source.camera.position);
  target.camera.quaternion.copy(source.camera.quaternion);
  target.camera.zoom = source.camera.zoom;
  target.camera.updateProjectionMatrix();
  target.controls.target.copy(source.controls.target);
  target.controls.update();
}

function syncOtherView(source) {
  if (isSyncingView) return;
  const target = source === graphView ? graphView2 : graphView;
  if (!target) return;
  isSyncingView = true;
  copyViewState(source, target);
  isSyncingView = false;
}

function disposeGroup(group) {
  while (group.children.length) {
    const child = group.children.pop();
    group.remove(child);
    if (child.geometry) {
      child.geometry.dispose();
    }
    if (child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => m.dispose());
      } else {
        child.material.dispose();
      }
    }
  }
}

function disposeGraphView(view) {
  if (!view) return;
  disposeGroup(view.staticGroup);
  disposeGroup(view.flowGroup);
  view.controls?.dispose();
  view.renderer?.dispose();
}

function fitGraphCamera(view) {
  if (!view) return;
  const center = new THREE.Vector3(nMeshX / 2, nMeshY / 2, nMeshZ / 2);
  const maxDim = Math.max(nMeshX, nMeshY, nMeshZ);
  const fov = THREE.MathUtils.degToRad(view.camera.fov);
  let distance = maxDim / (2 * Math.tan(fov / 2));
  distance *= 1.4;

  const direction = new THREE.Vector3(1, 0.7, 1).normalize();
  view.camera.position.copy(center).add(direction.multiplyScalar(distance));
  view.camera.near = Math.max(0.1, distance / 100);
  view.camera.far = distance * 10;
  view.camera.lookAt(center);
  view.camera.updateProjectionMatrix();

  view.controls.target.copy(center);
  view.controls.update();
}

function resizeGraphView(view) {
  if (!view) return;
  const canvas = view.renderer.domElement;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (!width || !height) return;
  view.renderer.setSize(width, height, false);
  view.camera.aspect = width / height;
  view.camera.updateProjectionMatrix();
}

function resizeAllGraphViews() {
  resizeGraphView(graphView);
  resizeGraphView(graphView2);
}

function animateGraph() {
  animationId = requestAnimationFrame(animateGraph);
  if (graphView) {
    graphView.controls.update();
    graphView.renderer.render(graphView.scene, graphView.camera);
  }
  if (graphView2) {
    graphView2.controls.update();
    graphView2.renderer.render(graphView2.scene, graphView2.camera);
  }
}

//color
const getColor = function(temp, a) {
  if (temp < store.graph.temperature[0]) {
    if (store.graph.colordelete[0]) {
      return "rgba(255,255,255,0)";
    } else {
      return "rgba(0,0,0," + a + ")";
    }
  }
  if (temp >= store.graph.temperature[1]) {
    if (store.graph.colordelete[1]) {
      return "rgba(255,255,255,0)";
    } else {
      return "rgba(255,0,0," + a + ")";
    }
  }
  var pos = (temp - store.graph.temperature[0]) / (store.graph.temperature[1] - store.graph.temperature[0]);
  var r = Math.floor(Math.max(255 - (1 - pos) * 400, 0));
  var g = Math.floor(Math.max(255 - Math.abs(1 - pos - 0.5) * 400, 0));
  var b = Math.floor(Math.max(255 - pos * 400, 0));

  return "rgba(" + r + "," + g + "," + b + "," + a + ")";
}

function shouldHideByTemperatureRange(temp) {
  const minTemp = store.graph.temperature[0];
  const maxTemp = store.graph.temperature[1];
  return (store.graph.colordelete[0] && temp < minTemp) ||
    (store.graph.colordelete[1] && temp >= maxTemp);
}


//graph draw ============================
function draw(){
  arrowunit = 20 * Math.pow(2, store.graph.arrowunit_multi);
  if (cfd.Phi == undefined) return;
  [disp.value.vmax_show, disp.value.tmax_show, disp.value.tmin_show, disp.value.tave ] = calc_maxmin(cfd, store.structure.meshtype);
  disp.value.floor = calc_maxmin_floor(cfd, store.structure.meshtype);

  if (store.graph.pararel == 2) {
    //pararel view
    [disp2.value.vmax_show, disp2.value.tmax_show, disp2.value.tmin_show, disp2.value.tave ] = calc_maxmin(cfd2, store.structure2.meshtype);
    disp2.value.floor = calc_maxmin_floor(cfd2, store.structure2.meshtype);
    // 両方の最大風速を比較して、大きい方をvmaxとして使用
    vmax = Math.max(disp.value.vmax_show, disp2.value.vmax_show);
  } else {
    vmax = disp.value.vmax_show;
  }
  
  drawone(graphView,cfd);
  if (store.graph.pararel == 2) {
    drawone(graphView2,cfd2);
  }
}

//one graph draw
function drawone(view,cfd) {
  if (!view || cfd.Phi == undefined) return;

  resizeGraphView(view);
  disposeGroup(view.staticGroup);
  disposeGroup(view.flowGroup);

  const box = new THREE.Box3(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(nMeshX, nMeshY, nMeshZ)
  );
  const boxHelper = new THREE.Box3Helper(box, 0x8aa2c5);
  view.staticGroup.add(boxHelper);

  var dt;
  var i, j, k;
  var vx, vy, vz;

  for (i = 1; i <= nMeshX; i++) {
    for (j = 1; j <= nMeshY; j++) {
      for (k = 1; k <= nMeshZ; k++) {

        //Z方向の間引き
        if (k % 2 == 0 && k != store.graph.layerz && store.graph.showz) continue;

        //set color and line width
        const isActiveLayer = store.graph.layerz == k || !store.graph.showz;
        const alpha = isActiveLayer ? 1 : 0.2;
        if (shouldHideByTemperatureRange(cfd.Phi[i][j][k])) continue;
        const colorValue = getColor(cfd.Phi[i][j][k], alpha);

        vx = cfd.Vel[0][i][j][k];
        vy = cfd.Vel[1][i][j][k];
        vz = cfd.Vel[2][i][j][k];

        //flow move
        //-0.5 to 0.5, 10step
        dt = store.graph.startfix ? 0 : (steptime % 10) / 10 - 0.5;

        const center = new THREE.Vector3(i - 0.5, j - 0.5, k - 0.5);
        const start = new THREE.Vector3(
          center.x + vx / vmax * dt,
          center.y + vy / vmax * dt,
          center.z + vz / vmax * dt,
        );

        const vec = new THREE.Vector3(
          vx / vmax * arrowunit * nMeshX / 400,
          vy / vmax * arrowunit * nMeshY / 400,
          vz / vmax * arrowunit * nMeshZ / 400,
        );
        const len = vec.length();

        if (store.graph.onlytemp) {
          //circle graph
          const sphereGeo = new THREE.SphereGeometry(0.16, 12, 12);
          const sphereMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(getColor(cfd.Phi[i][j][k], 1)),
            transparent: true,
            opacity: isActiveLayer ? 0.7 : 0.25,
            metalness: 0.05,
            roughness: 0.5,
          });
          const sphere = new THREE.Mesh(sphereGeo, sphereMat);
          sphere.position.copy(center);
          view.flowGroup.add(sphere);

        } else {
          //arrow graph
          if (Math.abs(vx / vmax) * arrowunit / 20 < 0.2 && Math.abs(vy / vmax) * arrowunit / 20 < 0.2 && Math.abs(vz / vmax) * arrowunit / 20 < 0.2) {
            const dotGeo = new THREE.SphereGeometry(0.06, 8, 8);
            const dotMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(colorValue), transparent: true, opacity: alpha });
            const dot = new THREE.Mesh(dotGeo, dotMat);
            dot.position.copy(center);
            view.flowGroup.add(dot);
          } else {
            const dir = vec.clone().normalize();
            const arrow = new THREE.ArrowHelper(
              dir,
              start,
              len,
              new THREE.Color(colorValue),
              Math.max(0.06, Math.min(0.25, len * 0.35)),
              Math.max(0.04, Math.min(0.18, len * 0.2)),
            );
            arrow.line.material.transparent = true;
            arrow.line.material.opacity = alpha;
            arrow.cone.material.transparent = true;
            arrow.cone.material.opacity = alpha;
            view.flowGroup.add(arrow);
          }
        }
      }
    }
  }
}


//save setting ===========================
const savedata = function(){
  var data = store.savedata();

  const blob = new Blob([data], {
      type: "application/json"
  })
  saveAs(blob, "homesimulation.json")
}
</script>

<template>
  <h1>{{ store.title }}</h1>
  <h2>シミュレーション</h2>
  <p>
    <input type="button" :disabled="!store.fgstop" value="◀▶再度計算" @click="structureInit();calcStart();">
    <input type="button" :disabled="timerclose" :value="store.fgstop ? (disp.sec==0 ? '▶計算開始' : '▶計算再開') : '□一時停止'" @click="store.fgstop = !store.fgstop">
    <input type="button" :disabled="store.fgstop" value="■停止" @click="calcStop();">
    <input type="button" value="◀パラメータ設定" @click="back(true);">
    <input type="button" value="◀3D設計" @click="backTo3DDesign();">
    <input v-if="store.fgstop" type="button" value="●保存" @click="savedata();">
  </p>

  <div class="graph" id="g1">
    <template v-if="disp.sec">
      <p>{{ parseInt(disp.sec / 60) }}分{{ parseInt(disp.sec % 60) }}秒　計算：{{ disp.count }}回</p>
      <p>全体：最大風速 {{ disp.vmax_show }} m/s 最高温度 {{ disp.tmax_show }}℃ 最低温度 {{ disp.tmin_show }}℃　平均{{ disp.tave }}℃</p>
      <p>床面：最大風速 {{ disp.floor[0] }} m/s 最高温度 {{ disp.floor[1] }}℃ 最低温度 {{ disp.floor[2] }}℃　平均{{ disp.floor[3] }}℃</p>
      <p>熱流入出　左：{{ Math.round(disp.leftin) }} W / 奥：{{ Math.round(disp.frontin) }} W </p>
      <p v-if="store.setval.ACwall">エアコン：累積：{{ Math.round(disp.ackwh*1000)}}Wh　{{ Math.round(disp.acheat) }} W</p>
  </template>
    <canvas ref="canvasRef" id="myCanvas" width="600" height="600"></canvas>
  </div>

  <div class="graph" id="g2" v-show="store.graph.pararel == 2">
    <template v-if="disp2.sec">
      <p>{{ parseInt(disp2.sec / 60) }}分{{ parseInt(disp2.sec % 60) }}秒　計算：{{ disp2.count }}回</p>
      <p>全体：最大風速 {{ disp2.vmax_show }} m/s 最高温度 {{ disp2.tmax_show }}℃ 最低温度 {{ disp2.tmin_show }}℃　平均{{ disp2.tave }}℃</p>
      <p>床面：最大風速 {{ disp2.floor[0] }} m/s 最高温度 {{ disp2.floor[1] }}℃ 最低温度 {{ disp2.floor[2] }}℃　平均{{ disp2.floor[3] }}℃</p>
      <p>熱流入出　左：{{ Math.round(disp2.leftin) }} W / 奥：{{ Math.round(disp2.frontin) }} W </p>
      <p v-if="store.setval.ACwall">エアコン：累積{{ Math.round(disp2.ackwh*1000) }}Wh　{{ Math.round(disp2.acheat) }} W</p>
    </template>
    <canvas ref="canvasRef2" id="myCanvas2" width="600" height="600"></canvas>
  </div>

  <div class="clear control">
    <canvas ref="colorCanvasRef" id="colors" width="600" height="40"></canvas>

    <p>温度色範囲：
      <VueSlider v-model="store.graph.temperature" :min="0" :max="35" />
    </p>
    <p class="center">
      <input type="checkbox" id="del0" v-model="store.graph.colordelete[0]">
      <label for="del0">最小({{ store.graph.temperature[0]}}℃)以下を消す</label>　/　
      <input type="checkbox" id="del1" v-model="store.graph.colordelete[1]">
      <label for="del1">最大({{ store.graph.temperature[1]}}℃)以上を消す</label>
    </p>

    <p>矢印の大きさ：
      <VueSlider v-model="store.graph.arrowunit_multi" :min="-5" :max="5" />
    </p>

    <p>
      <input type="checkbox" v-model="store.graph.onlytemp">温度表示　/　
      <input type="checkbox" v-model="store.graph.startfix">流れ固定
    </p>
    
    <input type="checkbox" v-model="store.graph.showz">切断面表示
    <p v-if="store.graph.showz">表示レイヤー
      <VueSlider v-model="store.graph.layerz" :min="2" :max="store.setval.nMeshZ" />
    </p>
  </div>


</template>

<style scoped>
.graph {
  float: left;
  width:600px;
}
.control {
  width:600px;
  max-width:100%;
}
#colors{
  position:relative;
  top:20px;
}
td{
  width:40px;
  text-align: center;
}
h2{
  color:#1f2937;
}

canvas {
  background: #f3f8ff;
  border: 1px solid #d4e0f0;
}
</style>
