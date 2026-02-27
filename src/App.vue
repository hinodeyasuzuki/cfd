<script setup>
import { ref, onMounted } from "vue";
import { Store } from "@/stores/store";
import Setting from './components/setting.vue'
import SetDetail from './components/setdetail.vue'
import Graph from './components/graph.vue'
import Voxel from './components/Voxel.vue'
import { Structure } from "@/assets/structure"

const store = Store();

store.structure = new Structure();
store.structure2 = new Structure();

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

</style>
