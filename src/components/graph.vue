<script setup>
import { ref, watch, onMounted } from "vue"
import { Store } from "@/stores/store"
import { CFD } from "@/assets/cfd"
import VueSlider from "vue-3-slider-component";
import { saveAs } from "file-saver"
import { Config } from "@/assets/config.js"

const store = Store();
const conf = new Config();

//表示に関する変数
let disp = ref({});
let disp2 = ref({});
disp.value.floor = {};
disp2.value.floor = {};

//画面設定
store.graph.layerz = Math.floor(store.setval.nMeshZ / 2);
var arrowheadsize = 3;
var arrowunit = 20;

//計算用変数
var timer;
var timerclose = ref(false);
var ctx, ctx2,ctx3;
var canvas, canvas2, canvas3;

//流れ表示のための経過ステップ
var steptime = 0;

//構造メッシュの生成
const cfd = new CFD();
const cfd2 = new CFD();

onMounted(() => {
  canvas = document.getElementById('myCanvas');
  ctx = canvas.getContext('2d');
  canvas2 = document.getElementById('myCanvas2');
  ctx2 = canvas2.getContext('2d');
  canvas3 = document.getElementById('colors');
  ctx3 = canvas3.getContext('2d');

  structureInit();
  colordisp();
  draw();
  calcStart();
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
      draw();

      //display span adjust, between 300 to 500 ms
      nowtime = new Date();
      if (nowtime.getTime() - starttime.getTime() > 500) {
        store.setval.batch_sec /= 1.5;
        store.setval2.batch_sec /= 1.5;
      }
      if (nowtime.getTime() - starttime.getTime() < 300) {
        store.setval.batch_sec *= 1.5;
        store.setval2.batch_sec *= 1.5;
      }
      starttime = nowtime;
      steptime++;
    }

    //start calculation( skip in case of not restart)
    var endcalc = cfd.calc(restart);
    if (store.graph.pararel == 2) endcalc &= cfd2.calc(restart);

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
  }, 100);		//check by 100ms
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
  window.location.href = './voxel/index.html';
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


//view move =============================
function move(x, y) {
  store.viewpoint_x += x;
  store.viewpoint_y += y;
  draw();
}

//graph draw ============================
function draw(){
  arrowunit = 20 * Math.pow(2, store.graph.arrowunit_multi);
  if (cfd.Phi == undefined) return;
  [disp.value.vmax_show, disp.value.tmax_show, disp.value.tmin_show, disp.value.tave ] = calc_maxmin(cfd, store.structure.meshtype);
  disp.value.floor = calc_maxmin_floor(cfd, store.structure.meshtype);
  drawone(ctx,cfd);

  if (store.graph.pararel == 2) {
    //pararel view
    [disp2.value.vmax_show, disp2.value.tmax_show, disp2.value.tmin_show, disp2.value.tave ] = calc_maxmin(cfd2, store.structure2.meshtype);
    disp2.value.floor = calc_maxmin_floor(cfd2, store.structure2.meshtype);
    if( disp.value.vmax_show > disp2.value.vmax_show ) vmax = disp.value.vmax_show;
    drawone(ctx2,cfd2);
  }
}

//one graph draw
function drawone(ctx,cfd) {
  var startX = 0, startY = 0, endX = 0, endY = 0, dt;
  var i, j, k;
  var vx, vy, angle;
  var centerX, centerY;

  if (cfd.Phi == undefined) return;

  ctx.clearRect(0, 0, 600, 600);

  //display structure
  store.structure.draw_mesh(ctx);
  store.structure.draw_wall(ctx);

  //display square cut
  if (store.graph.showz) {
    var [x1, y1] = store.posxy(0, 0, store.graph.layerz);
    var [x2, y2] = store.posxy(nMeshX + 0.5, nMeshY + 0.5, store.graph.layerz);
    ctx.beginPath();
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.rect(x1, y1, x2 - x1, y2 - y1);
    ctx.stroke();
  }

  for (i = 1; i <= nMeshX; i++) {
    for (j = 1; j <= nMeshY; j++) {
      for (k = 1; k <= nMeshZ; k++) {

        //Z方向の間引き
        if (k % 2 == 0 && k != store.graph.layerz && store.graph.showz) continue;

        ctx.beginPath();

        //set color and line width
        if (store.graph.layerz == k || !store.graph.showz) {
          ctx.strokeStyle = getColor(cfd.Phi[i][j][k], 1);
          ctx.lineWidth = store.graph.showz ? 2 : 1;
        } else {
          ctx.strokeStyle = getColor(cfd.Phi[i][j][k], 0.2);
          ctx.lineWidth = 1;
        }
        ctx.fillStyle = getColor(cfd.Phi[i][j][k], 0.5);

        vx = cfd.Vel[0][i][j][k];
        vy = cfd.Vel[1][i][j][k];

        //flow move
        //-0.5 to 0.5, 10step
        dt = store.graph.startfix ? 0 : (steptime % 10) / 10 - 0.5;

        //Canvas position
        [centerX, centerY] = store.posxy(i, j, k);
        startX = centerX + vx / vmax * dt * 400 / nMeshX;
        startY = centerY - vy / vmax * dt * 400 / nMeshY;  //座標が逆なので-1をかける
        endX = startX + vx / vmax * arrowunit;
        endY = startY - vy / vmax * arrowunit;

        if (store.graph.onlytemp) {
          //circle graph
          ctx.ellipse(centerX, centerY, 10, 10, 0, 0, 2 * Math.PI);
          ctx.fill();

        } else {
          //arrow graph
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);

          //arrow top
          if (Math.abs(vx / vmax) * arrowunit / 20 < 0.2 && Math.abs(vy / vmax) * arrowunit / 20 < 0.2) {
            ctx.fillRect(centerX - 1, centerY - 1, 3, 3);
          } else {
            angle = Math.atan2(vy, vx);
            ctx.moveTo(endX, endY);
            ctx.lineTo(endX + arrowheadsize * Math.cos(angle + 15), endY - arrowheadsize * Math.sin(angle + 15));
            ctx.moveTo(endX, endY)
            ctx.lineTo(endX + arrowheadsize * Math.cos(angle - 15), endY - arrowheadsize * Math.sin(angle - 15));
          }
          ctx.stroke();
        }
      }
    }
  }

  //arrow length of wind speed 1m/s
  ctx.font = "12px 'Arial'";
  ctx.fillStyle = "black";
  ctx.strokeStyle = "rgba(0,0,0,0.6)";
  ctx.fillText("1m/s", 10, 590);
  ctx.beginPath();
  ctx.moveTo(40, 590);
  ctx.lineTo(40 + arrowunit/ vmax, 590);
  ctx.lineTo(40 + arrowunit/ vmax -5, 595);
  ctx.moveTo(40 + arrowunit/ vmax, 590);
  ctx.lineTo(40 + arrowunit/ vmax -5, 585);
  ctx.stroke();
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
    <input type="button" value="▲計算設定" @click="back(true);">
    <input type="button" value="◀3D設計に戻る" @click="backTo3DDesign();">
    <input v-if="store.fgstop" type="button" value="▼設定保存" @click="savedata();">
  </p>

  <div class="graph" id="g1">
    <template v-if="disp.sec">
      <p>{{ parseInt(disp.sec / 60) }}分{{ parseInt(disp.sec % 60) }}秒　計算：{{ disp.count }}回</p>
      <p>全体：最大風速 {{ disp.vmax_show }} m/s 最高温度 {{ disp.tmax_show }}℃ 最低温度 {{ disp.tmin_show }}℃　平均{{ disp.tave }}℃</p>
      <p>床面：最大風速 {{ disp.floor[0] }} m/s 最高温度 {{ disp.floor[1] }}℃ 最低温度 {{ disp.floor[2] }}℃　平均{{ disp.floor[3] }}℃</p>
      <p>熱流入出　左：{{ Math.round(disp.leftin) }} W / 奥：{{ Math.round(disp.frontin) }} W </p>
      <p v-if="store.setval.ACwall">エアコン：累積：{{ Math.round(disp.ackwh*1000)}}Wh　{{ Math.round(disp.acheat) }} W</p>
  </template>
    <canvas id="myCanvas" width="600" height="600"></canvas>
  </div>

  <div class="graph" id="g2" v-show="store.graph.pararel == 2">
    <template v-if="disp2.sec">
      <p>{{ parseInt(disp2.sec / 60) }}分{{ parseInt(disp2.sec % 60) }}秒　計算：{{ disp2.count }}回</p>
      <p>全体：最大風速 {{ disp2.vmax_show }} m/s 最高温度 {{ disp2.tmax_show }}℃ 最低温度 {{ disp2.tmin_show }}℃　平均{{ disp2.tave }}℃</p>
      <p>床面：最大風速 {{ disp2.floor[0] }} m/s 最高温度 {{ disp2.floor[1] }}℃ 最低温度 {{ disp2.floor[2] }}℃　平均{{ disp2.floor[3] }}℃</p>
      <p>熱流入出　左：{{ Math.round(disp2.leftin) }} W / 奥：{{ Math.round(disp2.frontin) }} W </p>
      <p v-if="store.setval.ACwall">エアコン：累積{{ Math.round(disp2.ackwh*1000) }}Wh　{{ Math.round(disp2.acheat) }} W</p>
    </template>
    <canvas id="myCanvas2" width="600" height="600"></canvas>
  </div>

  <p>視点移動：
    <input type="button" value="◀" @click="move(-1, 0)">
    <input type="button" value="▶" @click="move(1, 0)">
    <input type="button" value="▲" @click="move(0, 1)">
    <input type="button" value="▼" @click="move(0, -1)">
  </p>

  <div class="clear control">
    <canvas id="colors" width="600" height="40"></canvas>

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
</style>
