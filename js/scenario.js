//入力変数定義
var defInput = { 
	"maxtime" : { title:"最大計算回数", "default":40000 },
	"maxtime_minute" : { title:"最大計算時間(分)", "default":10 },
	"delta_t" : { title:"単位計算時間(秒)", "default":0.01 },
	"size_x" : { title:"部屋幅X(m)", "default":3 },
	"size_y" : { title:"部屋高さY(m)", "default":3 },
	"size_z" : { title:"部屋奥行Z(m)", "default":3 },
	"nMeshX" : { title:"計算分割数X", "default":8 },
	"nMeshY" : { title:"計算分割数X", "default":8 },
	"nMeshZ" : { title:"計算分割数X", "default":8 },
	
	"InsidePhi" : { title:"室内温度（℃）", "default":15 },
	"ObsPhi" : { title:"障害物/パネルヒータ温度", "default":15 },
	"InletPhi" : { title:"屋外気温", "default":5 },
	"FloorPhi" : { title:"床面温度", "default":15 },

	"ObsSet" : {title:"障害物/パネルヒータ設置", "default":2 },
	"ObsX1r" : { title:"障害物横位置(m)", "default":1 },
	"ObsX2r" : { title:"障害物横位置(m)", "default":0.4 },
	"ObsYr" : { title:"障害物高さ(m)", "default":0.4 },
	"ObsZwr" : { title:"障害物奥幅(m)", "default":1.5 },
	"ObsZ1r" : { title:"障害物奥位置(m)", "default":0.5 },

	"WindowYr" : { title:"窓腰位置(m)", "default":1 },
	"WindowHr" : { title:"窓高さ(m)", "default":1 },
	"WindowZr" : { title:"窓奥位置(m)", "default":1 },
	"WindowWr" : { title:"窓幅(m)", "default":1 },

	"Window2Yr" : { title:"窓腰位置(m)", "default":1 },
	"Window2Hr" : { title:"窓高さ(m)", "default":1 },
	"Window2Xr" : { title:"窓横位置(m)", "default":1 },
	"Window2Wr" : { title:"窓幅(m)", "default":1 },

	"ACwall" : { title:"エアコン設置", "default":4 },
	"ACwind" : { title:"エアコン風速", "default":2 },
	"CirculatorWind" : { title:"サーキュレータ風速", "default":0 },

	"windowKset" : { title:"窓の断熱性能", "default":6 },
	"wallKset" : { title:"外壁の断熱性能", "default":2.5 },
	
};

//推奨シナリオ
var defSenario = [
{	group: "部屋サイズ",
	data : [
	{ 
		title:"４畳半",
		size_x:2.7,
		size_y:2.4,
		size_z:2.7,
		nMeshX:8,
		nMeshZ:8,
		ObsX1r:0.8,
		ObsX2r:0.4,
		ObsYr:0.4,
		ObsZwr:2.2,
		ObsZ1r:0.4,
	},
	{ 
		title:"６畳",
		default:1,
		size_x:3.6,
		size_y:2.4,
		size_z:2.7,
		nMeshX:10,
		nMeshZ:8,
		ObsX1r:0.8,
		ObsX2r:0.4,
		ObsYr:0.4,
		ObsZwr:2.2,
		ObsZ1r:0.4,
	},
	{ 
		title:"８畳",
		size_x:3.6,
		size_y:2.4,
		size_z:3.6,
		nMeshX:10,
		nMeshZ:10,
		ObsX1r:0.8,
		ObsX2r:0.4,
		ObsYr:0.4,
		ObsZwr:2.8,
		ObsZ1r:0.4,
	},
	{ 
		title:"１２畳",
		size_x:5.4,
		size_y:2.4,
		size_z:3.6,
		nMeshX:15,
		nMeshZ:10,
		ObsX1r:1.2,
		ObsX2r:0.4,
		ObsYr:0.4,
		ObsZwr:2.8,
		ObsZ1r:0.4,
	},
	{ 
		title:"１５畳",
		size_x:5.4,
		size_y:2.4,
		size_z:4.5,
		nMeshX:15,
		nMeshZ:10,
		ObsX1r:1.2,
		ObsX2r:0.4,
		ObsYr:0.4,
		ObsZwr:2.8,
		ObsZ1r:0.4,
	}
	]
},

{	group: "窓（左面）サイズ(cm)",
	data : [
	{ 
		title:"90×90",
		default:1,
		WindowYr:0.9,
		WindowHr:0.9,
		WindowZr:0.9,
		WindowWr:0.9,
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

{	group: "窓（正面）サイズ(cm)",
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
		default:1,
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

{
	group: "エアコン暖房（初期室内10℃）",
	data : [
	{
		title:"強風",
		ACwall:3,
		ACwind:2,
		InsidePhi:10,
		ObsPhi:10,
		FloorPhi:10,
		maxtime_minute:20,
	},
	{
		title:"弱風",
		ACwall:3,
		ACwind:1,
		InsidePhi:10,
		ObsPhi:10,
		FloorPhi:10,
		maxtime_minute:20,
	},
	{
		title:"自動送風",
		ACwall:3,
		ACwind:-1,
		InsidePhi:10,
		ObsPhi:10,
		FloorPhi:10,
		maxtime_minute:20,
	},
	{
		title:"なし（室温18℃）",
		default:1,
		ObsSet:2,
		ACwall:4,
		ACwind:0,
		InsidePhi:18,
		ObsPhi:18,
		FloorPhi:18,
		maxtime_minute:60,
	}
	]
},
{
	group: "室外気温",
	data : [
	{
		title:"0℃",
		InletPhi:0,
	},
	{
		default:1,
		title:"5℃",
		InletPhi:5,
	},
	{
		title:"10℃",
		InletPhi:10,
	}
	]
},

{
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
		default:1,
		CirculatorWind:0,
	}
	]
},

{	
	group: "窓の断熱設定",
	data : [
	{
		title:"シングルガラス",
		default:1,
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
{
	group : "壁の断熱設定（グラスウール換算）",
	data : [
	{
		title:"無断熱",
		default:1,
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
{
	group: "風よけの効果",
	data : [
	{
		title:"あり",
		ObsSet:1,
		ObsPhi:18,
	},
	{
		title:"なし",
		default:1,
		ObsSet:2,
	},
	{
		title:"パネルヒーター設置",
		ObsSet:1,
		ObsPhi:35,
	}
	]
}

];
