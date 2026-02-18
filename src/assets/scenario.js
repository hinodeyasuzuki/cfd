// sceanario.js　設定値（シナリオ、選択肢）
//    simulation scnenario selet define, use in setting.vue,setdetail.vue

export class Scenario {

  constructor() {
    //selected value
    this.sel ={
      roomsize : 1,
      meshsize : 0,
      windowsize : 0,
      windowfrontsize : 2,
      AC : 3,
      outtemp : 1,
      Circulator : 2,
      windowKset : 0,
      wallKset : 0,
      windbreak : 1
    };

    //scenario menu and values
    this.def = {
      roomsize:{	
        group: "部屋サイズ",
        data : [
          { 
            title:"４畳半",
            realX:2.7,
            realY:2.4,
            realZ:2.7,
            nMeshX:9,
            nMeshY:8,
            nMeshZ:9,
            floor:1,
            ObsX1r:0.8,
            ObsX2r:0.4,
            ObsYr:0.4,
            ObsZwr:2.2,
            ObsZ1r:0.4,
          },
          { 
            title:"６畳",
            realX:3.6,
            realY:2.4,
            realZ:2.7,
            nMeshX:12,
            nMeshY:8,
            nMeshZ:9,
            floor:1,
            ObsX1r:0.8,
            ObsX2r:0.4,
            ObsYr:0.4,
            ObsZwr:2.2,
            ObsZ1r:0.4,
          },
          { 
            title:"８畳",
            realX:3.6,
            realY:2.4,
            realZ:3.6,
            nMeshX:12,
            nMeshY:8,
            nMeshZ:12,
            floor:1,
            ObsX1r:0.8,
            ObsX2r:0.4,
            ObsYr:0.4,
            ObsZwr:2.8,
            ObsZ1r:0.4,
          },
          { 
            title:"１２畳",
            realX:5.4,
            realY:2.4,
            realZ:3.6,
            nMeshX:13,
            nMeshY:8,
            nMeshZ:9,
            floor:1,
            ObsX1r:1.2,
            ObsX2r:0.4,
            ObsYr:0.4,
            ObsZwr:2.8,
            ObsZ1r:0.4,
          },
          { 
            title:"１５畳",
            realX:5.4,
            realY:2.4,
            realZ:4.5,
            nMeshX:13,
            nMeshY:8,
            nMeshZ:11,
            floor:1,
            ObsX1r:1.2,
            ObsX2r:0.4,
            ObsYr:0.4,
            ObsZwr:2.8,
            ObsZ1r:0.4,
          },
          { 
            title:"吹き抜け８畳",
            realX:3.6,
            realY:4.8,
            realZ:3.6,
            nMeshX:12,
            nMeshY:16,
            nMeshZ:12,
            floor:2,
            atrium:true,
            ObsX1r:0.8,
            ObsX2r:0.4,
            ObsYr:0.4,
            ObsZwr:2.8,
            ObsZ1r:0.4,
          },
          { 
            title:"吹き抜け１５畳",
            realX:5.4,
            realY:4.8,
            realZ:4.5,
            nMeshX:13,
            nMeshY:16,
            nMeshZ:11,
            floor:2,
            atrium:true,
            ObsX1r:0.8,
            ObsX2r:0.4,
            ObsYr:0.4,
            ObsZwr:2.8,
            ObsZ1r:0.4,
          }
        ]  
      },
      
      meshsize:{
        group: "計算の細かさ",
        data : [
          { 
            title:"高速",
            batch_sec:20,
          },
          { 
            title:"詳細",
            batch_sec:5,
          }
        ]
      },
      
      windowsize:{
        group: "窓（左面）サイズ(cm)",
        name: "windowsize",
        data : [
          { 
            title:"90×90",
            WindowYr:0.9,   //from floor m
            WindowHr:0.9,   //Height m
            WindowZr:0.9,   //from wall m
            WindowWr:0.9,   //Width m
          },
          { 
            title:"200×90",
            WindowYr:0.9,
            WindowHr:0.9,
            WindowZr:0.2,
            WindowWr:2,
          },
          { 
            title:"200×200",
            WindowYr:0.2,
            WindowHr:1.8,
            WindowZr:0.5,
            WindowWr:2,
          }
        ]
      },

      windowfrontsize:{
        group: "窓（正面）サイズ(cm)",
        name : "windowfrontsize",
        data : [
          { 
            title:"なし",
            Window2Yr:0,
            Window2Hr:0,
            Window2Xr:0,
            Window2Wr:0,
          },
          { 
            title:"90×90",
            Window2Yr:0.9,
            Window2Hr:0.9,
            Window2Xr:0.9,
            Window2Wr:0.9,
          },
          { 
            title:"200×90",
            Window2Yr:0.9,
            Window2Hr:0.9,
            Window2Xr:0.5,
            Window2Wr:2,
          },
          { 
            title:"200×200",
            Window2Yr:0.2,
            Window2Hr:1.8,
            Window2Xr:0.5,
            Window2Wr:2,
          }
        ]
      },
      
      AC:{
        group: "エアコン",
        data : [
          {
            title:"暖房強風",
            ACwall:3,
            ACwind:3,
            ACheat:true,
            ACdir:1,
            InsidePhi:10,
            InletPhi:5,
            ObsPhi:10,
            FloorPhi:10,
            maxtime_minute:20,
            batch_sec:5,
          },
          {
            title:"暖房弱風",
            ACwall:3,
            ACwind:1,
            ACheat:true,
            ACdir:1,
            InletPhi:5,
            InsidePhi:10,
            ObsPhi:10,
            FloorPhi:10,
            maxtime_minute:20,
            batch_sec:10,
          },
          {
            title:"暖房自動送風",
            ACwall:3,
            ACwind:-1,
            ACheat:true,
            ACdir:1,
            InletPhi:5,
            InsidePhi:10,
            ObsPhi:10,
            FloorPhi:10,
            maxtime_minute:20,
            batch_sec:5,
          },
          {
            title:"暖房なし（室温18℃）",
            ObsSet:2,
            ACwall:4,
            ACwind:0,
            ACheat:true,
            ACdir:1,
            InletPhi:5,
            InsidePhi:18,
            ObsPhi:18,
            FloorPhi:18,
            maxtime_minute:60,
            batch_sec:20,
          },
          {
            title:"冷房強風",
            ACwall:3,
            ACwind:3,
            ACheat:false,
            ACdir:2,
            InletPhi:35,
            InsidePhi:30,
            ObsPhi:30,
            FloorPhi:30,
            maxtime_minute:20,
            batch_sec:5,
          },
          {
            title:"冷房弱風",
            ACwall:3,
            ACwind:1,
            ACheat:false,
            ACdir:2,
            InletPhi:35,
            InsidePhi:30,
            ObsPhi:30,
            FloorPhi:30,
            maxtime_minute:20,
            batch_sec:10,
          },

        ]
      },

      outtemp:{
        group: "室外気温",
        data : [
        {
            title:"0℃",
            InletPhi:0,
          },
          {
            title:"5℃",
            InletPhi:5,
          },
          {
            title:"10℃",
            InletPhi:10,
          },
          {
            title:"15℃",
            InletPhi:15,
          },
          {
            title:"20℃",
            InletPhi:20,
          },
          {
            title:"25℃",
            InletPhi:25,
          },
          {
            title:"30℃",
            InletPhi:30,
          },
          {
            title:"35℃",
            InletPhi:35,
          },
        ]
      },
      
      Circulator:{
        group: "サーキュレータ（左床）",
        data : [
          {
            title:"強風",
            CirculatorWind:1.2,
            maxtime_minute:20,
          },
          {
            title:"弱風",
            CirculatorWind:0.8,
            maxtime_minute:20,
          },
          {
            title:"なし",
            CirculatorWind:0,
          }
        ]
      },
        
      windowKset:{	
        group: "窓の断熱設定",
        data : [
          {
            title:"シングルガラス",
            windowKset:6,
          },
          {
            title:"複層ガラス",
            windowKset:3,
          },
          {
            title:"low-eガラス",
            windowKset:1.5,
          }
        ]
      },
      
      wallKset:{
        group : "壁の断熱（グラスウール換算）",
        name:"wallKset",
        data : [
          {
            title:"無断熱",
            wallKset:2.5,
          },
          {
            title:"30mm",
            wallKset:1.0,
          },
          {
            title:"50mm",
            wallKset:0.6,
          },
          {
            title:"100mm",
            wallKset:0.3,
          }
        ]
      },
      
      windbreak:{
        group: "風よけの効果",
        name:"windbreak",
        data : [
          {
            title:"あり",
            ObsSet:1,
            ObsPhi:18,
          },
          {
            title:"なし",
            ObsSet:2,
          },
          {
            title:"パネルヒーター設置",
            ObsSet:1,
            ObsPhi:35,
          }
        ]
      }
    };

    // detail =================================
    this.selects = { 
      ACwall: [
        { title: "なし", value: 4 },
        { title: "左", value: 1 },
        { title: "奥", value: 2 },
        { title: "右", value: 3 },
      ],  
      ACdir: [
        { title: "下", value: 1 },
        { title: "横", value: 2 },
      ],
      atrium: [
        { title: "なし", value: false },
        { title: "あり", value: true },
      ],
      windowKset: [
        { title: "シングルガラス", value: 6 },
        { title: "複層ガラス", value: 3 },
        { title: "low-eガラス", value: 1.5 },
      ],
      wallKset: [
        { title: "無断熱", value: 2.5 },
        { title: "30mm", value: 1 },
        { title: "50mm", value: 0.6 },
        { title: "100mm", value: 0.3 },
      ],
    },

    this.detaildisp = {
      maxtime_minute : "最大計算時間（分）",
      realX : "部屋の大きさ（m:X左右方向）",
      realY : "部屋の大きさ（m:Y高さ方向）",
      realZ : "部屋の大きさ（m:Z奥行方向）",
      nMeshX : "メッシュ数（X方向）",
      nMeshY : "メッシュ数（Y方向）",
      nMeshZ : "メッシュ数（Z方向）",

      InsidePhi : "室内温度（℃）",
      InletPhi : "外気温度（℃）",
      FloorPhi : "床温度（℃）",
      windowKset: "窓の断熱性",
      wallKset: "壁の断熱性",

      ACwall : "壁面エアコンの位置",
      ACwind : "エアコン風速(m/s)自動は-1",
      ACdir : "風向 1下、2横",
      CirculatorWind : "サーキュレーター風速(1～2m/s)",
      atrium : "吹き抜け",
    },

    this.detaildisp2 = {
      InsidePhi : "室内温度（℃）",
      InletPhi : "外気温度（℃）",
      FloorPhi : "床温度（℃）",
      windowKset: "窓の断熱性",
      wallKset: "壁の断熱性",

      ACwall : "壁面エアコンの位置",
      ACwind : "エアコン風速(m/s)自動は-1",
      ACdir : "風向 1下、2横",
      CirculatorWind : "サーキュレーター風速(1～2m/s)",
      atrium : "吹き抜け",
    }

  }
}
