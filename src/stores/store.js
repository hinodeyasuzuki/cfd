import { defineStore } from 'pinia'

export const Store = defineStore('store', {
  state: () => ({
    //for view
    title: '3D室内空気の流れシミュレーション',

    page: 'setting',

    viewpoint_x: 0,
    viewpoint_y: 0,

    fgstop: false,

    //graph setting
    graph:{
      temperature: [5,20],
      colordelete: [false,false],
      arrowunit_multi: 0,
      startfix: false,
      onlytemp: false,
      showz: false,
      layerz: 2,
      pararel: 1,
    },

    //cfd simulation set
    setval : {    
      maxtime: 40000,
      maxtime_minute : 20,
      delta_t : 0.005,
      batch_sec : 20,
      realX : 3,
      realY : 3,
      realZ : 3,
      maxreal : 3,
      canvasfieldX : 400,
      canvasfieldY : 400,

      nMeshX : 12,
      nMeshY : 8,
      nMeshZ : 9,

      InsidePhi : 15,
      ObsPhi : 15,
      InletPhi : 5,
      FloorPhi : 15,

      ObsSet : 2,
      ObsX1r : 1,
      ObsX2r : 0.4,
      ObsYr : 0.4,
      ObsZwr : 1.5,
      ObsZ1r : 0.5,

      WindowYr : 1,
      WindowHr : 1,
      WindowZr : 1,
      WindowWr : 1,

      Window2Yr : 1,
      Window2Hr : 1,
      Window2Xr : 1,
      Window2Wr : 1,

      ACwall : 4,
      ACwind : 2,
      ACheat : true,
      ACdir : 1,
      CirculatorWind : 0,

      windowKset : 6,
      wallKset : 2.5,
      atrium: false,
   },

    setval2: {},

  }),

  actions: {
    //canvas position exchange 3D to 2D
    posxy : function(i,j,k){
      var layer = this.setval.nMeshZ*2/3 - k - 1;
      var scale = 1 + layer/this.setval.nMeshZ * 0.2;    //一番手間が1.2倍程度

      //Z軸方向の場合 初期値で最大100ドット分+拡大分
      var x = scale * i * this.setval.canvasfieldX / this.setval.nMeshX + 80 
        - layer*(100/this.setval.nMeshZ + this.viewpoint_x);
      var y = scale * ( this.setval.canvasfieldY - (j+1) * this.setval.canvasfieldY/this.setval.nMeshY) + 150 
        + layer*(100/this.setval.nMeshZ + this.viewpoint_y);

      return [x,y];
    },

    //保存
    savedata : function(){
      var data = {};
      data.setval = this.setval;
      data.setval2 = this.setval2;
      unset(data.setval['canvasfieldX']);
      unset(data.setval['canvasfieldY']);
      unset(data.setval2['canvasfieldX']);
      unset(data.setval2['canvasfieldY']);
      unset(data.setval['ObsSet']);
      unset(data.setval['ObsX1r']);
      unset(data.setval['ObsX2r']);
      unset(data.setval['ObsYr']);
      unset(data.setval['ObsZwr']);
      unset(data.setval['ObsZ1r']);
      unset(data.setval2['ObsSet']);
      unset(data.setval2['ObsX1r']);
      unset(data.setval2['ObsX2r']);
      unset(data.setval2['ObsYr']);
      unset(data.setval2['ObsZwr']);
      unset(data.setval2['ObsZ1r']);
      data.graph = this.graph;
      return JSON.stringify(data);
    },

  },
  getters: {
  },
})
