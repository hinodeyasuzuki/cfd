<script setup>
import { ref, onMounted } from "vue";
import { Store } from "@/stores/store";
import Setting from './components/setting.vue'
import SetDetail from './components/setdetail.vue'
import Graph from './components/graph.vue'
import { Structure } from "@/assets/structure"

const store = Store();

store.structure = new Structure();
store.structure2 = new Structure();

for( let name in store.setval ){
  store.setval2[name] = store.setval[name];
}
</script>

<template>
  <div class="wrapper">
    <Setting v-if="store.page=='setting'" />
    <SetDetail v-if="store.page=='setdetail'" />
    <div  v-if="store.page=='graph'" >
      <Graph/>
    </div>
  </div>
  <footer class="fixed-footer">
    <a href="../">[CFD TOP]</a>　
    <a href="https://www.hinodeya-ecolife.com">Hinodeya Institute for Ecolife.Co.Ltd</a>
    　Ver.2.0 2026/2/18
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
