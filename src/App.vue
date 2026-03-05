<script setup>
import { ref, onMounted } from "vue";
import { Store } from "@/stores/store";
import Setting from './components/setting.vue'
import SetDetail from './components/setdetail.vue'
import Graph from './components/graph.vue'
import Voxel from './components/Voxel.vue'
import { Structure } from "@/assets/structure"

//共通変数の構築
const store = Store();

store.structure = new Structure();
store.structure2 = new Structure();

//構造変数の初期化と、setval2へのコピー
for( let name in store.setval ){
  store.setval2[name] = store.setval[name];
}

// sessionStorageからVoxelデータを読み込む
onMounted(() => {
  const cfdVoxelData = sessionStorage.getItem('cfdVoxelData');
  if (cfdVoxelData) {
    try {
      const jsonData = JSON.parse(cfdVoxelData);
      store.paramstore(jsonData);
      // meshtype を setval2 にもコピー
      if (jsonData.setval && jsonData.setval.meshtype) {
        store.setval2.meshtype = jsonData.setval.meshtype;
      }
      // structureを初期化
      store.structure.init(store.setval);
      store.structure2.init(store.setval2);
      // 詳細設定画面に遷移（データを確認できるように）
      store.page = 'setdetail';
      // データの読み込み後、sessionStorageから削除
      sessionStorage.removeItem('cfdVoxelData');
    } catch (error) {
      console.error('Failed to parse CFD voxel data from sessionStorage:', error);
    }
  }
});

</script>

<template>
  <div class="wrapper">
    <Setting v-if="store.page=='setting'" />
    <SetDetail v-if="store.page=='setdetail'" />
    <Voxel v-if="store.page=='voxel'" />
    <div  v-if="store.page=='graph'" >
      <Graph/>
    </div>
  </div>
  <footer class="fixed-footer">
    <a href="./index.php">[CFD TOP]</a>　
    <a href="https://www.hinodeya-ecolife.com">Hinodeya Institute for Ecolife.Co.Ltd</a>
    　Ver.3.0 2026/3/5
  </footer>
</template>

<style>
.title{
    clear:both;
    margin-top:2px;
    width:40%;
    float:left;
}
.item{
    margin-top:2px;
    width:20%;
    float:left;
}
select{
    padding:3px;
    font-size:1.1em;
}
input[type="button"]{
    margin:5px;
    padding:5px;
    font-size:1.1em;
}
input[type="text"]{
    padding:3px;
    font-size:1.1em;
    text-align: right;
    width:100px;
}
input[type="file"]{
  padding:3px;
  font-size:1.1em;
}
.clear{
    clear:both;
}

.fixed-footer{
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background-color: #f5f5f5;
    text-align: right;
    padding: 10px;
    border-top: 1px solid #ddd;
    font-size: 0.9em;
}

</style>
