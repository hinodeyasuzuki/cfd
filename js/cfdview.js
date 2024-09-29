/*
 有限体積法による室内温熱環境分析 20151219
　画面IO機能

copyright(C) 2015-2018 Yasufumi Suzuki, Hinodeya Insititute for Ecolife co.ltd.
					鈴木靖文, 有限会社ひのでやエコライフ研究所										
Released under the MIT license
http://www.hinodeya-ecolife.com

//    nMeshY        TOP
//   |
//   y   WINDOW                 OUTSIDE
//   |
//   0             BOTTOM
//     0 -----------  x  ------   nMeshX

*/


var val = {};	//保存設定値

//計算を別に行う：メイン側で描画・操作のみ

//形式定義
var INSIDE = 1;		//室内空気
var BOTTOM = 2;		//床
var TOP = 3;		//天井
var WINDOW = 4;		//窓
var OUTSIDE = 5;	//外壁
var SIDE = 6;		//屋内壁
var OBSTACLE = 7;	//障害物
var AC = 8;			//エアコン（下面から送風、上面から吸収）
var CL = 9;			//サーキュレータ（Xプラスから吸収、上面Yから送風）

var x = 0;
var y = 1;
var z = 2;

//計算フィールド
var meshtype;		//構造
var Phi;			//温度
var Prs;			//圧力
var Vel;			//速度ベクトル
var D;				//

//結果グラフ
var vmax = 1;
var tmax = 0;
var tmin = 0;

//メッシュ
var dotx = 400;
var doty = 400;
var dotz = 400;
var nMeshX = 8;			//メッシュ数(入力値で変更)
var nMeshY = 8;
var nMeshZ = 8;
var size_x = 3;			//物理スケール （m）
var size_y = 3;
var size_z = 3;

//canvas 関連設定
var canvas = [];

//ctxサイズ
var cx = 400;
var cy = 400;

//計算メッシュユニットの画面上のドット数
var mesux, mesuy, mesuz;

//表示レイヤー
var nowz = parseInt( nMeshZ / 2 );
var nowy = 1;
var nowx = 1;

//累積計算
var sumwatt = 0;
var totaltime = 0;

//arrowsize　比率
var arrowsize = 1;

var mesh_result = {};
var precalc = 0;
var calc_interval = null;

var cfd1 = new CFD();



// 計算開始
//
function calcStart() {
	$("#step").html("");
	$("#res").html("");
	$("#layerz").html("");
	$("#layery").html("");
	$(".setting").hide();
	
	tabChange(3);
	$("#v_result").prop("checked",true);
	$("#v_settei").prop("checked",false);
	$(".vresult").show();
	$(".vresult").css("opacity", 0.9);

	sumwatt = 0;
	totaltime = 0;
	init_mesh();

	//計算初期設定
	cfd1.meshset({ "val": val , "meshtype":meshtype });

	//時間ループ(単位：分)
	calc_interval = setInterval( function() {
		mesh_result = cfd1.meshcalc();		//単時間計算
		if( mesh_result.count != precalc ){
			//更新されていた場合
			precalc = mesh_result.count;
			createview();

			if( mesh_result.totaltime/60 > val.maxtime_minute ){
				clearInterval( calc_interval );
			}
			if( mesh_result.count > val.maxtime ){
				clearInterval( calc_interval );
			}
		}
	},20 );
};

// 結果表示処理（1分ごと）
function createview() {
	data = mesh_result;
	var count = data.count;
	var totaltime = data.totaltime;
	var acheat = data.acheat;
	var heatleftin = data.heatin.heatleftin;
	var heatfrontin = data.heatin.heatfrontin;
	Vel = data.Vel;
	Phi = data.Phi;
	Prs = data.Prs;

	var temp = getTempMaxMin();
	var cop = 5.0;
	sumwatt += 60/3600/cop * acheat;	
	var disp = Math.floor(totaltime / 60) +  "分後" + "　　計算回数:" + count + "回 <br>"
			+ "エアコン出力:" + parseInt(acheat) + "W　 <br>" 
			+ "エアコン消費電力量" + parseInt(sumwatt)/1000 + "kWh　 <br>" 
			+ "供給熱量" + parseInt(sumwatt*cop)/1000 + "kWh　 <br>" 
			+ "左面　熱移動:" + parseInt(heatleftin) + "W　 <br>" 
			+ "正面　熱移動:" + parseInt(heatfrontin) + "W　 <br>" 
			+ "床面最大風速:" + parseInt(temp["floormaxvf"]*100)/100 + "(m/s)<br>" 
			+ "床面最低温度" + parseInt(temp["floormin"]*10)/10 + "℃　<br>" 
			+ "床面最高温度" + parseInt(temp["floormax"]*10)/10 +"℃　<br>"
			+ "床面 平均温度" + parseInt(temp["floorav"]*10)/10 +"℃　<br>"
			+ "左面 平均温度" + parseInt(temp["leftav"]*10)/10 +"℃　<br>"
			+ "正面 平均温度" + parseInt(temp["frontav"]*10)/10 +"℃　<br>"
			+ "部屋 平均温度" + parseInt(temp["totalav"]*10)/10 +"℃";
	$("#step").html( disp );
	$("#res").html( dump() );
	graph1();
	graph2();
	graph3();
}



//初期設定================================================
$( function() {
	canvasinit(canvas);
	setInputsDefault();
	dispSenarioButton();

	init_mesh();

	$(".vresult").hide();
	$(".vresult").css("opacity", 0.6);

	//画面サイズの変更は firefoxが正面壁が自動的に移動して動かない
	//$(".field").css("transform", "scale(0.8)");
	//$(".field").css("-moz-transform", "scale(0.8)");

});


//画面canvas初期設定
function canvasinit(canvas){
	$("#wall").height(cy).width(cx);
	$("#wall_base").height(cy).width(cx);
	$("#wall2").height(cy).width(cx);
	$("#wall2_base").height(cy).width(cx);
	$("#floor").height(cy).width(cx);
	$("#floor_base").height(cy).width(cx);
	$("#graphbase").height(cy).width(cx);

	for( var i=0 ; i<3 ; i++ ){
		canvas[i] = [];
		canvas[i].graph = document.getElementById('graph'+i);
		canvas[i].base = document.getElementById('graph'+i+'base');
		canvas[i].layout = document.getElementById('layout'+i);
		if (typeof G_vmlCanvasManager != 'undefined') {
			canvas[i].graph = G_vmlCanvasManager.initElement(canvas[i].graph);
			canvas[i].base = G_vmlCanvasManager.initElement(canvas[i].base);
			canvas[i].layout = G_vmlCanvasManager.initElement(canvas[i].layout);
		}
		canvas[i].ctxgraph = canvas[i].graph.getContext('2d');
		canvas[i].ctxbase = canvas[i].base.getContext('2d');
		canvas[i].ctxlayout = canvas[i].layout.getContext('2d');
	}

	//legend
	canvas[3] = [];
	canvas[3].camvas = document.getElementById('legend');
	if (typeof G_vmlCanvasManager != 'undefined') {
		canvas[3].camvas = G_vmlCanvasManager.initElement(canvas[3].camvas);
	}
	canvas[3].ctx = canvas[3].camvas.getContext('2d');
};


//initialize 3D array
init_3d = function() {
	var d = [];
	//フィールドサイズ
	var NUM_MAX_X = this.nMeshX+1;
	var NUM_MAX_Y = this.nMeshY+1;
	var NUM_MAX_Z = this.nMeshZ+1;
	d = Array( NUM_MAX_X );
	for( var i=0 ; i<=NUM_MAX_X; i++ ){
		d[i] = Array( NUM_MAX_Y );
		for ( var j=0 ; j<=NUM_MAX_Y; j++ ) {
			d[i][j] = Array( NUM_MAX_Z );
			d[i][j].fill(0);
		}
	}
	return d;	//3D array
}

//フィールド初期設定　meshtype[][][] を設定
function init_mesh(){
	getInputs();

	meshtype = init_3d();
	console.log(meshtype);
	Phi = init_3d();
	Prs = init_3d();
	Vel = Array( 3 );
	Vel[0] = init_3d();
	Vel[1] = init_3d();
	Vel[2] = init_3d();

	ObsX1 = parseInt(val.ObsX1r*nMeshX/size_x+0.49);		//障害物X=0(WINDOW)からの距離
	ObsX2 = parseInt(val.ObsX2r*nMeshX/size_x+0.49);		//障害物の厚さ
	ObsZr = parseInt(val.ObsZ1r*nMeshZ/size_z+0.49);		//障害物のZ開始位置
	ObsZw = parseInt(val.ObsZwr*nMeshZ/size_z);				//障害物の幅
	ObsY = parseInt(val.ObsYr*nMeshY/size_y+0.49);			//障害物の高さ

	WindowY = parseInt(val.WindowYr*nMeshY/size_y+0.49);
	WindowH = parseInt(val.WindowHr*nMeshY/size_y+0.49);
	WindowZ = parseInt(val.WindowZr*nMeshZ/size_z+0.49);
	WindowW = parseInt(val.WindowWr*nMeshZ/size_z+0.49);

	Window2Y = parseInt(val.Window2Yr*nMeshY/size_y+0.49);
	Window2H = parseInt(val.Window2Hr*nMeshY/size_y+0.49);
	Window2X= parseInt(val.Window2Xr*nMeshX/size_x+0.49);
	Window2W = parseInt(val.Window2Wr*nMeshZ/size_x+0.49);

	//格子点のタイプ・Phi初期値
	InsidePhi = parseFloat( $("#InsidePhi").val());
	for( var i=0 ; i<=nMeshX+1 ; i++ ) {
		for( var j=0 ; j<=nMeshY+1 ; j++ ) {
			for( var k=0 ; k<=nMeshZ+1 ; k++ ) {
				//標準は内点とする
				meshtype[i][j][k] = INSIDE;		//内点
				Phi[i][j][k] = InsidePhi;
				
				//壁面の確認
				if ( j == 0 )
					meshtype[i][j][k] = BOTTOM;	//下側壁面
				if ( j == nMeshY+1 )
					meshtype[i][j][k] = TOP;		//上側壁面
				if ( k == 0 ) 
					meshtype[i][j][k] = SIDE;	//側面
				if ( k == nMeshZ+1 ) 
					if ( j>=Window2Y && j<= Window2Y + Window2H
						&& i >= Window2X && i<= Window2X + Window2W 
					) {
						meshtype[i][j][k] = WINDOW;	//正面窓
					} else {
						meshtype[i][j][k] = OUTSIDE;	//正面外壁
					}
				if ( i == 0 )
					if ( j>=WindowY && j<= WindowY + WindowH
						&& k >= WindowZ && k<= WindowZ + WindowW 
					) {
						meshtype[i][j][k] = WINDOW;	//左端窓
					} else {
						meshtype[i][j][k] = OUTSIDE;	//左端壁
					}
				if ( i == nMeshX+1 )
					meshtype[i][j][k] = SIDE;	//（右端）

				//障害物
				if ( i >= ObsX1 && i <= ObsX1 + ObsX2-1 
					&& k >= ObsZr + 0.5 && k <= ObsZr + ObsZw + 0.5
					&& j >0 && j <= ObsY && val.ObsSet == 1)
						meshtype[i][j][k] = OBSTACLE;	//障害物内部

				//エアコンの設定（設置壁面と位置の設定）
				if ( ACwall == 3 ){
					if ( j == nMeshY-2			//天井から2つ下
						&& ( k >= 0.5*nMeshZ/size_z && k<= 1.5*nMeshZ/size_z ) 	//幅
					) {
						if ( i == nMeshX-1) {					//右壁側
							meshtype[i][j][k] = AC;
						} else if ( i == nMeshX ){
							//meshtype[i][j][k] = OUTSIDE;
						}
					}

				} else if ( ACwall == 2 ){
					if ( j == nMeshY-2			//天井から2つ下
						&& ( i >= 0.5*nMeshX/size_x  && i<= 1.5*nMeshX/size_x ) 	//幅
					) {
						if ( k == nMeshZ-1) {					//正面壁
							meshtype[i][j][k] = AC;
						} else if ( k == nMeshZ ){
							//meshtype[i][j][k] = OUTSIDE;
						}
					}

				} else if ( ACwall == 1 ){
					if ( j == nMeshY-2			//天井から2つ下
						&& ( k >= 0.5*nMeshZ/size_z && k<= 1.5*nMeshZ/size_z  ) 	//幅
					) {
						if ( i == 2 ) {				//左壁（外壁）側
							meshtype[i][j][k] = AC;
						} else if ( i==1 ){
							//meshtype[i][j][k] = OUTSIDE;
						}
					}
				}
				
				//サーキュレータ設置
				if ( val.CirculatorWind > 0 ){
					if ( j == 1 
						&& k == parseInt(nMeshZ/2)
						&& i == 1 
					) {
						//床面・左面、中央
						meshtype[i][j][k] = CL;
					}
				}
			}
		}
	}
	meshUnitCalc();
	
	showlayout();
	graph1();
	graph2();
	graph3();
};


//=======結果表示================================================

//マップ定義ダンプ
function dumpmap() {
	ret = "MAP\n";
	for( k=0 ; k<=nMeshZ ; k++ ) {
		ret += k + "\n";
		for( j=0 ; j<=nMeshY ; j++ ) {
			for( i=0 ; i<=nMeshX ; i++ ) {
				ret += meshtype[i][nMeshY-j][k] + " ";
			}
			ret += "\n";
		}
	}
	return ret;
};


//結果一括ダンプ表示
function dump() {
	var ret = "";
	var max = 0;
	var min = 100;
	var k=5;
	var Phic = 0;
	var Phisum = 0;

	ret += "meshtype\n";
	for( j=0 ; j<=nMeshY+1 ; j++ ) {
		for( i=0 ; i<=nMeshX+1 ; i++ ) {
			ret += meshtype[i][nMeshY+1-j][k] + " ";
		}
		ret += "\n";
	}

	ret += "Phi-templature\n";
	for( i=1 ; i<=nMeshX ; i++ ) {
		for( j=1 ; j<=nMeshY ; j++ ) {
			for( k=1 ; k<=nMeshZ ; k++ ) {
				if ( Phi[i][j][k] > max )
					max = Phi[i][j][k];
				if ( Phi[i][j][k] < min )
					min = Phi[i][j][k];
				Phisum += Phi[i][j][k];
				Phic++;
			}
		}
	}

	ret += "max:" + Math.floor(max*10)/10 + "  avg:" + Math.floor(Phisum/Phic*10)/10 +"\n";
	tmax = max;
	tmin = min;

	k=Math.floor(nMeshZ/2,1)

	if ( max==0 )
		max=1;
	for( j=0 ; j<=nMeshY+1 ; j++ ) {
		for( i=0 ; i<=nMeshX+1 ; i++ ) {
			ret += Phi[i][nMeshY+1-j][k].toFixed(1) + " ";
		}
		ret += "\n";
	}

	ret += "Vel[x]\n";
	max = 0;
	for( i=1 ; i<=nMeshX ; i++ ) {
		for( j=1 ; j<=nMeshY ; j++ ) {
			if ( Vel[x][i][j][k] > max )
				max = Vel[x][i][j][k];
			if ( -Vel[x][i][j][k] > max )
				max = -Vel[x][i][j][k];
		}
	}

	ret += max +"\n";
	vxmax = max;
	if ( max==0 )
		max=1;
	for( j=0 ; j<=nMeshY+1 ; j++ ) {
		for( i=0 ; i<=nMeshX+1 ; i++ ) {
			ret += (Vel[x][i][nMeshY+1-j][k]>=0 ? " " : "" ) +Math.floor(Vel[x][i][nMeshY+1-j][k]/max*9,1) + " ";
		}
		ret += "\n";
	}

	ret += "Vel[y]\n";
	for( i=1 ; i<=nMeshX ; i++ ) {
		for( j=1 ; j<=nMeshY ; j++ ) {
			if ( Vel[y][i][j][k] > max )
				max = Vel[y][i][j][k];
			if ( -Vel[y][i][j][k] > max )
				max = -Vel[y][i][j][k];
		}
	}

	ret += max +"\n";
	vymax = max;
	if ( max==0 )
		max=1;
	for( j=0 ; j<=nMeshY+1 ; j++ ) {
		for( i=0 ; i<=nMeshX+1 ; i++ ) {
			ret += (Vel[y][i][nMeshY+1-j][k]>=0 ? " " : "" ) + Math.floor(Vel[y][i][nMeshY+1-j][k]/max*9,1) + " ";
		}
		ret += "\n";
	}


	ret += "Vel[z]\n";
	for( i=1 ; i<=nMeshX ; i++ ) {
		for( j=1 ; j<=nMeshY ; j++ ) {
			if ( Vel[z][i][j][k] > max )
				max = Vel[y][i][j][k];
			if ( -Vel[z][i][j][k] > max )
				max = -Vel[y][i][j][k];
		}
	}

	ret += max +"\n";
	vzmax = max;
	if ( max==0 )
		max=1;
	for( j=0 ; j<=nMeshY+1 ; j++ ) {
		for( i=0 ; i<=nMeshX+1 ; i++ ) {
			ret += (Vel[z][i][nMeshY+1-j][k]>=0 ? " " : "" ) + Math.floor(Vel[z][i][nMeshY+1-j][k]/max*9,1) + " ";
		}
		ret += "\n";
	}

	ret += "Prs\n";
	max = 0;
	for( i=1 ; i<=nMeshX ; i++ ) {
		for( j=1 ; j<=nMeshY ; j++ ) {
			if ( Prs[i][j][k] > max )
				max = Prs[i][j][k];
			if ( -Prs[i][j][k] > max )
				max = -Prs[i][j][k];
		}
	}

	ret += max + "\n"
	if ( max==0 )
		max=1;
	for( j=1 ; j<=nMeshY ; j++ ) {
		for( i=1 ; i<=nMeshX ; i++ ) {
			ret += (Prs[i][nMeshY+1-j][k]>=0 ? " " : "" ) +Math.floor(Prs[i][nMeshY+1-j][k]/max*9,1) + " ";
		}
		ret +=  "\n";
	}
	vmax = Math.sqrt(vymax*vymax+vxmax*vxmax+vzmax*vzmax);

	return ret;
};



//矢印の描画------------------------------
function arrow(ctx, x1, y1, x2, y2, col ){
	var wing = 0.15;
	ctx.beginPath();
	ctx.strokeStyle = col;
	ctx.fillStyle = col;
	var len = Math.sqrt( (x1 - x2)^2 +( y1 - y2 )^2);
	var dx = x2 - x1;
	var dy = y2 - y1;

	if ( len / ( cx/nMeshX ) > 0.5 ) {
		ctx.lineWidth = 3;
	} else if ( len / ( cx/nMeshX ) > 0.2 ) {
		ctx.lineWidth = 2;
	} else {
		ctx.lineWidth = 1;
	}

	ctx.fillRect( x1-1, y1-1, 3, 3 );
	ctx.moveTo( x1, y1 );
	ctx.lineTo( x2, y2 );
	ctx.lineTo( x1 + dx*(1-wing)-dy*wing, y1 + dy*(1-wing)+dx*wing );
	ctx.lineTo( x1 + dx*(1-wing)+dy*wing, y1 + dy*(1-wing)-dx*wing );
	ctx.lineTo( x2, y2 );
	
	ctx.stroke();
};

//色変換-------------------------------------
function colorTemp( temp ) {
	var rangemax = 25;
	var rangemin = 10;
	var col =  Math.max(Math.min((temp - rangemin)/(rangemax - rangemin),1),0);
	return "rgb( " + parseInt(Math.min(Math.max(col*1.4,0),1)*255) + "," 
					+ parseInt( Math.sqrt((1-Math.abs(col*2-1)))*255) +"," 
					+ parseInt( Math.min(Math.max( (1-col)*1.4,0 ),1)*255) + ")";
};

//メッシュユニットサイズ計算-------------------
function meshUnitCalc(){
	var mdx = size_x, mdy = size_y, mdz = size_z;
	if ( size_x < size_y ) {
		if ( size_z > size_y ) {
			maxMesh = nMeshZ;
			mdx /= size_z;
			mdy /= size_z;
			mdz /= size_z;
		} else {
			maxMesh = nMeshY;
			mdx /= size_y;
			mdy /= size_y;
			mdz /= size_y;
		}
	} else {
		maxMesh = nMeshX;
		mdx /= size_x;
		mdy /= size_x;
		mdz /= size_x;
	}
	
	mesux = cx / (nMeshX / mdx );
	mesuy = cy / (nMeshY / mdy );
	mesuz = cy / (nMeshZ / mdz );
};




//速度グラフ描画-------------------------------
//	ctx:対象canvas  xyz:1-3   layer:layer id
function vgraph(ctx, xyz, layer) {
	var x1, y1, x2, y2;
	var maxMesh;

	maxMesh = Math.max( nMeshX, nMeshY, nMeshZ);
	//矢印長さの段階設定
	var vmaxfix = 1;
	if ( vmax >= 1 ) {
		vmaxfix = 1;
	} else if ( vmax >= 0.6 ) {
		vmaxfix = 0.6;
	} else if ( vmax >= 0.35 ) {
		vmaxfix = 0.35;
	} else {
		vmaxfix = 0.2;
	}
	var len = cx/maxMesh/vmaxfix * arrowsize;

	ctx.clearRect(0, 0, cx, cy);
	//ctx.beginPath();
	//ctx.fillStyle = "white";
	//ctx.fillRect(0, 0, cx, cy);
	//ctx.stroke();

	if ( xyz == 2 ) {	//xy軸（正面）
		var k = layer;
		for ( i =1 ; i<= nMeshX ; i++ ) {
			for ( j =1 ; j<= nMeshY ; j++ ) {
				x1 = (i -1/2 )* mesux;
				y1 = (j -1/2 )* mesuy;	//y軸はメッシュと表示が逆のためcyから引く
				x2 = x1 + len * Vel[x][i][j][k];
				y2 = y1 + len * Vel[y][i][j][k];

				ctx.beginPath();
				ctx.fillStyle = colorTemp(Phi[i][j][k]);
				ctx.fillRect(x1-mesux/2, cy-(y1+mesuy/2), mesux, mesuy);
				ctx.stroke();
			}
		}
		for ( i =1 ; i<= nMeshX ; i++ ) {
			for ( j =1 ; j<= nMeshY ; j++ ) {
				x1 = (i -1/2 )* mesux;
				y1 = (j -1/2 )* mesuy;	//y軸はメッシュと表示が逆のためcyから引く
				x2 = x1 + len * Vel[x][i][j][k];
				y2 = y1 + len * Vel[y][i][j][k];

				 //矢印（ベクトル）
				if ( meshtype[i][j][k] == INSIDE ) {
					arrow( ctx, x1, cy-y1 , x2, cy-y2 , "black" );
				}
			}
		}
	} else if ( xyz == 1 ) {	//XZ軸（水平）
		j=layer;
		var base;
		for ( i =1 ; i<= nMeshX ; i++ ) {
			for ( k =1 ; k<= nMeshZ ; k++ ) {
				x1 = (i -1/2 ) * mesux;
				y1 = (k -1/2 ) * mesuz;
				x2 = x1 + len * Vel[x][i][j][k];
				y2 = y1 + len * Vel[z][i][j][k];
				base =  cy - (nMeshZ)*mesuz;
				ctx.beginPath();
				ctx.fillStyle = colorTemp(Phi[i][j][k]);
				ctx.fillRect(x1 - mesux/2, cy-( y1+mesuz/2) -base, mesux, mesuz);
				ctx.stroke();
			}
		}
		for ( i =1 ; i<= nMeshX ; i++ ) {
			for ( k =1 ; k<= nMeshZ ; k++ ) {
				x1 = (i -1/2 ) * mesux;
				y1 = (k -1/2 ) * mesuz;
				x2 = x1 + len * Vel[x][i][j][k];
				y2 = y1 + len * Vel[z][i][j][k];
				base =  cy - (nMeshZ)*mesuz;
				 //矢印（ベクトル）
				if ( meshtype[i][j][k] == INSIDE ) {
					arrow( ctx, x1, cy - y1 - base, x2, cy - y2 - base , "black");
				}
			}
		}
	} else if ( xyz == 3 ) {	//YZ軸（左）
		i=layer;
		var base;
		for ( j =1 ; j<= nMeshY ; j++ ) {
			for ( k =1 ; k<= nMeshZ ; k++ ) {
				x1 = (k -1/2 ) * mesuz;
				y1 = (j -1/2 ) * mesuy;
				x2 = x1 + len * Vel[z][i][j][k];
				y2 = y1 + len * Vel[y][i][j][k];
				base =  cx - (nMeshZ)*mesuz;
				ctx.beginPath();
				ctx.fillStyle = colorTemp(Phi[i][j][k]);
				ctx.fillRect(x1 - mesuz/2 + base, cy-( y1+mesuy/2), mesuz, mesuy);
				ctx.stroke();
			}
		}
		for ( j =1 ; j<= nMeshY ; j++ ) {
			for ( k =1 ; k<= nMeshZ ; k++ ) {
				x1 = (k -1/2 ) * mesuz;
				y1 = (j -1/2 ) * mesuy;
				x2 = x1 + len * Vel[z][i][j][k];
				y2 = y1 + len * Vel[y][i][j][k];
				base =  cx - (nMeshZ)*mesuz;
				 //矢印（ベクトル）
				if ( meshtype[i][j][k] == INSIDE ) {
					arrow( ctx, x1 + base, cy - y1 , x2 + base, cy - y2 , "black");
				}
			}
		}
	}
	 hanrei(len);
	 
	 //枠を描画
	ctx.beginPath();
	ctx.fillStyle = colorTemp(Phi[i][j][k]);
	ctx.rect(0,0, cx-1, cy-1);
	ctx.stroke();
	 
};

//底面--------------------------------------
function graph1(){
	var ctx = canvas[1].ctxgraph;
	vgraph(ctx,1,nowy);
	vgraph(canvas[1].ctxbase,1,1);

	$("#layery").html(nowy + "層目(1-" + nMeshY +  ")" );

	//レイヤー名記載
	ctx.fillStyle = "black";
    ctx.font = "24px 'ＭＳ Ｐゴシック'";
    ctx.fillText("Y床面 " + nowy + "層目", 10, 380, 300);
	ctx.stroke();
	$(".floor").css( "top", parseInt( 380 - (nowy-1) * mesuy ) );
};

//正面-------------------------------------
function graph2(){
	var ctx = canvas[2].ctxgraph;
	vgraph(ctx,2,nowz);
	vgraph(canvas[2].ctxbase,2,nMeshZ);

	$("#layerz").html( nowz + "層目(1-" + nMeshZ +  ")" );

	//レイヤー名記載
	ctx.fillStyle = "black";
    ctx.font = "20px 'ＭＳ Ｐゴシック'";
    ctx.fillText("Z奥外壁面  " + nowz + "層目", 10, 40, 300);
	$(".wall2").css( "left", parseInt( 220 - (nMeshZ - nowz) * mesuz/2 ) );
	$(".wall2").css( "top", parseInt( 80 + (nMeshZ - nowz) * mesuz/2 ) );
	ctx.stroke();
};

//左面-------------------------------------
function graph3(){
	var ctx = canvas[0].ctxgraph;
	vgraph(ctx,3,nowx);
	vgraph(canvas[0].ctxbase,3,1);

	$("#layerx").html( nowx + "層目(1-" + nMeshX +  ")" );

	//レイヤー名記載
	ctx.fillStyle = "black";
    ctx.font = "24px 'ＭＳ Ｐゴシック'";
    ctx.fillText("X窓面     " + nowx + "層目", 10, 40, 300);
	ctx.stroke();
	$(".wall").css( "left", parseInt( -80 + (nowx-1) * mesux ) );
};

function graphresize(r){
	arrowsize /= r;
	graph1();
	graph2();
	graph3();
};

//色凡例表示-------------------------
function hanrei(len){
	var ctx = canvas[3].ctx;
	ctx.clearRect(0, 0, 800, 40);
	var st = 10;
	var ed = 25;
	var wid = 300/(ed-st);
	for ( var i=st ; i<=ed ; i++ ) {
		ctx.beginPath();
		ctx.fillStyle = colorTemp(i);
		ctx.fillRect((i-st)*wid, 10, wid, 20);
		ctx.stroke();
	}
	arrow( ctx, 350, 20, 350 + len , 20 , colorTemp(0) );
};

//最大速度・温度算出-------------
function getTempMaxMin(){
	var maxvf =0;
	var maxtmp =-100;
	var mintmp =100;
	var v;
	var ret = [];
	var floorsum=0, totalsum=0, leftsum=0, frontsum=0;
	var floorn = 0, totaln = 0, leftn = 0, frontn = 0;
	var j;
	var psi;

	for ( i =1 ; i<= nMeshX-1 ; i++ ) {
		for ( j =1 ; j<= nMeshY-1 ; j++ ) {
			for ( k =1 ; k<= nMeshZ-1 ; k++ ) {
				psi = Phi[i][1][k];
				if (
					j == 1 
					&& i != 1 
					&& k != 1 
					&& meshtype[i][1][k] == INSIDE 
					&& meshtype[i-1][1][k] != CL 
				) {
					//床：サーキュレータ吸い込み口を除く床面（壁面に接する部分も除く）
					v = Math.sqrt(Vel[x][i][1][k]*Vel[x][i][1][k]+ Vel[z][i][1][k]*Vel[z][i][1][k] );
					if( maxvf < v ) maxvf= v;
					if( mintmp > psi ) mintmp= psi;
					if( maxtmp < psi ) maxtmp= psi;
					floorsum += psi;
					floorn++;
				}
				if ( 
					meshtype[i][j][k] == INSIDE 
				) {
					//全体
					totalsum += psi;
					totaln++;
				}
				if ( 
					i==1
					&& meshtype[i][j][k] == INSIDE 
				) {
					//左
					leftsum += psi;
					leftn++;
				}
				if ( 
					k==nMeshZ-1
					&& meshtype[i][j][k] == INSIDE 
				) {
					//正面
					frontsum += psi;
					frontn++;
				}
			}
		}
	}
	ret["floormaxvf"] = maxvf;
	ret["floormin"] = mintmp;
	ret["floormax"] = maxtmp;
	ret["floorav"] = floorsum/floorn;
	
	ret["totalav"] = totalsum/totaln;
	ret["leftav"] = leftsum/leftn;
	ret["frontav"] = frontsum/frontn;
	return ret;
};


/*=============画面操作=====================================*/

//左下からの実距離mをcanvas座標(左上から）に変換する
function meter2canvas( x, y, xyz ) {
	var ret = [];
	var dpm = 1 / Math.max( size_x/dotx, size_y/doty, size_z/dotz);	// dot/meter

	if ( xyz == 2 ) {	//xy軸（正面）
		ret.x = x  * dpm;
		ret.y = doty - y * dpm;
	} else  if ( xyz == 1 ) {	//zx軸（平面）
		ret.x = x  * dpm;
		ret.y = ( size_z - y ) * dpm ;

//* ( ( 1 - y  / size_z * nMeshZ / maxMesh ) - ( maxMesh - nMeshZ ) /maxMesh );
	} else {	//yz軸（左面）
		ret.x = dotz - ( size_z - x ) * dpm;

//dotz *  ( x  / size_z * nMeshZ / maxMesh + ( maxMesh - nMeshZ ) /maxMesh );
		ret.y = doty - y * dpm;
//console.log( size_z, ret.x, size_y, ret.y );
	}
	return ret;
}

//レイアウトの描画
function showlayout(){
	var ret, ret2;
	var color_wall = 'rgb(250, 250, 200)'; //wall
	var color_window = 'rgb(150, 220, 255)'; //window

	//floor
	var ctx = canvas[1].ctxlayout;
	ctx.beginPath();
	ctx.clearRect(0,0,399,399);
	ctx.strokeStyle = "black";
	ctx.fillStyle = color_wall;
	ret = meter2canvas( 0, 0 , 1);
	ret2 = meter2canvas( size_x, size_z , 1);
	ctx.fillRect( Math.min(ret.x, ret2.x), Math.min(ret.y, ret2.y), Math.abs(ret2.x-ret.x), Math.abs(ret2.y-ret.y) );
	ctx.rect( Math.min(ret.x, ret2.x), Math.min(ret.y, ret2.y), Math.abs(ret2.x-ret.x), Math.abs(ret2.y-ret.y) );
	ctx.stroke();

	ctx.fillStyle = "black";
    ctx.font = "24px 'ＭＳ Ｐゴシック'";
    ctx.fillText("Y床面", 10, 380, 300);
	ctx.stroke();
	
	if( $("#ObsSet").val() == 1 ) {
		//obstacle
		ctx.beginPath();
		ctx.fillStyle = "orange";
		ret = meter2canvas( $("#ObsX1r").val(), $("#ObsZ1r").val() , 1);
		ret2 = meter2canvas( $("#ObsX1r").val() *1+$("#ObsX2r").val()*1 ,  $("#ObsZ1r").val()*1 + $("#ObsZwr").val()*1 , 1);
		ctx.fillRect( Math.min(ret.x, ret2.x), Math.min(ret.y, ret2.y), Math.abs(ret2.x-ret.x), Math.abs(ret2.y-ret.y) );
		ctx.stroke();
	}

	if( $("#CirculatorWind").val() > 0 ) {
		//circulator
		ctx.beginPath();
		ctx.strokeStyle = "orange";
		ctx.lineWidth = 4;
		ret = meter2canvas(0.3, 1.5, 1);
		ctx.arc(ret.x, ret.y, 20, 0, 6.3, 0 );
		ctx.stroke();
	}
	
	//front
	ctx = canvas[2].ctxlayout;
	ctx.beginPath();
	ctx.clearRect(0,0,399,399);
	ctx.rect(0,0,399,399);
	ctx.strokeStyle = "black";
	ctx.fillStyle = color_wall;
	ret = meter2canvas( 0, 0 , 2);
	ret2 = meter2canvas( size_x, size_y , 2);
	ctx.fillRect( Math.min(ret.x, ret2.x), Math.min(ret.y, ret2.y), Math.abs(ret2.x-ret.x), Math.abs(ret2.y-ret.y) );
	ctx.rect( Math.min(ret.x, ret2.x), Math.min(ret.y, ret2.y), Math.abs(ret2.x-ret.x), Math.abs(ret2.y-ret.y) );
	ctx.stroke();

	ctx.fillStyle = "black";
    ctx.font = "20px 'ＭＳ Ｐゴシック'";
    ctx.fillText("Z奥外壁面", 10, 40, 300);
	ctx.stroke();

	if ( $("#Window2Wr").val() > 0 ) {
		ctx.beginPath();
		ctx.fillStyle = color_window;
		ret = meter2canvas( $("#Window2Xr").val(), $("#Window2Yr").val() , 2);
		ret2 = meter2canvas( $("#Window2Xr").val()*1+$("#Window2Wr").val()*1 ,  $("#Window2Yr").val()*1 + $("#Window2Hr").val() *1, 2);
		ctx.fillRect( Math.min(ret.x, ret2.x), Math.min(ret.y, ret2.y), Math.abs(ret2.x-ret.x), Math.abs(ret2.y-ret.y) );
		ctx.stroke();
	}

	if ( $("#ACwall").val()== 2 ) {
		ctx.beginPath();
		ctx.fillStyle = "red";
		ret = meter2canvas( 1, 2 , 2);
		ret2 = meter2canvas( 2.2 , 2.3, 2);
		ctx.fillRect( Math.min(ret.x, ret2.x), Math.min(ret.y, ret2.y), Math.abs(ret2.x-ret.x), Math.abs(ret2.y-ret.y) );
		ctx.stroke();
	}
	if ( $("#ACwall").val()== 3) {
		ctx.beginPath();
		ctx.fillStyle = "red";
		ret = meter2canvas( 1, 2 , 3);
		ret2 = meter2canvas( 2.2 , 2.3, 3);
		ctx.moveTo(200+(Math.min(ret.x, ret2.x))/2, Math.min(ret.y, ret2.y)+(400-Math.min(ret.x, ret2.x))/2);
		ctx.lineTo(200+(Math.min(ret.x, ret2.x))/2, Math.min(ret.y, ret2.y)+(400-Math.min(ret.x, ret2.x))/2+40);
		ctx.lineTo(200+(Math.max(ret.x, ret2.x))/2, Math.min(ret.y, ret2.y)+(400-Math.max(ret.x, ret2.x))/2+40);
		ctx.lineTo(200+(Math.max(ret.x, ret2.x))/2, Math.min(ret.y, ret2.y)+(400-Math.max(ret.x, ret2.x))/2);
		ctx.fill();
		ctx.stroke();
	}

	// left
	ctx = canvas[0].ctxlayout;
	ctx.beginPath();
	ctx.clearRect(0,0,399,399);
	ctx.strokeStyle = "black";
	ctx.fillStyle = color_wall;
	ret = meter2canvas( 0, 0 , 3);
	ret2 = meter2canvas( size_z, size_y , 3);
	ctx.fillRect( Math.min(ret.x, ret2.x), Math.min(ret.y, ret2.y), Math.abs(ret2.x-ret.x), Math.abs(ret2.y-ret.y) );
	ctx.rect( Math.min(ret.x, ret2.x), Math.min(ret.y, ret2.y), Math.abs(ret2.x-ret.x), Math.abs(ret2.y-ret.y) );
	ctx.stroke();

	ctx.fillStyle = "black";
    ctx.font = "24px 'ＭＳ Ｐゴシック'";
    ctx.fillText("X窓面", 10, 40, 300);
	ctx.stroke();

	ctx.beginPath();
	ctx.fillStyle = color_window;
	ret = meter2canvas( $("#WindowZr").val(), $("#WindowYr").val() , 3);
	ret2 = meter2canvas( $("#WindowZr").val() *1+$("#WindowWr").val() *1,  $("#WindowYr").val()*1 + $("#WindowHr").val()*1 , 3);
	ctx.fillRect( Math.min(ret.x, ret2.x), Math.min(ret.y, ret2.y), Math.abs(ret2.x-ret.x), Math.abs(ret2.y-ret.y) );
	ctx.stroke();
	if ( $("#ACwall").val()== 1 ) {
		ctx.beginPath();
		ctx.fillStyle = "red";
		ret = meter2canvas( 1, 2, 3);
		ret2 = meter2canvas( 2.2 , 2.3, 3);
		ctx.fillRect( Math.min(ret.x, ret2.x), Math.min(ret.y, ret2.y), Math.abs(ret2.x-ret.x), Math.abs(ret2.y-ret.y) );
		ctx.stroke();
	}
}


//入力欄からの値の読込
function getInputs(){
	//パラメータを設定する
	for( var d in defInput ){
		val[d] = parseFloat( $("#" + d ).val() );
	}
	nMeshX = val.nMeshX;
	nMeshY = val.nMeshY;
	nMeshZ = val.nMeshZ;
	size_x = val.size_x;
	size_y = val.size_y;
	size_z = val.size_z;
	ACwall = val.ACwall;
};

//入力コンポーネントの値設定（保存値をもとに設定）
function setInputs(){
	//パラメータを設定する
	for( var d in defInput ){
		$("#" + d ).val(val[d]);
	}
};

//入力コンポーネントの初期設定
function setInputsDefault(){
	//パラメータを設定する
	for( var d in defInput ){
		val[d] = defInput[d].default;
		$("#" + d ).val(defInput[d].default);
	}
};

//タブの設定
function tabChange(id){
	$("div.tab span").removeClass( "selected" );
	$("span#tab" + id).addClass( "selected" );
	$("div.tabcontents").hide();
	$("div#tab" + id + "c").show();
	
};

//シナリオ設定ボタンの設置
function dispSenarioButton(){
	var disp = "";
	for( var d in defSenario ){
		disp += "<p>■" + defSenario[d].group + "</p><div style='padding-left:10px;'>";
		for ( var e in defSenario[d].data ) {
			disp += "<input type='button' class='d" + d + ( defSenario[d].data[e].default == 1 ? " select" : "" ) + "' value='" + defSenario[d].data[e].title + "' onclick='btnSenario(" + d + "," + e + ");$(this).addClass(\"select\");'>";
			if ( defSenario[d].data[e].default == 1 ) {
				btnSenario( d ,e );
			}
		}
		disp += "</div>";
	}

	$("div#senarioButtons").html( disp );
};

//簡易シナリオの設定（変数から一括設定）
function btnSenario(n, p){
	$(".d" + n ).removeClass( "select");
	
	var def = defSenario[n].data[p];
	for( var d in def ){
		if ( d == "title" ) continue;
		if ( d == "default" ) continue;
		$("#" + d ).val(def[d]);
	}
	init_mesh();
};


// 結果表示のレイヤーを変更する
//Yレイヤー（平面）を上下に変更------------
function layerup( dy ) {
	if ( dy > 0 ) {
		if ( nowy < nMeshY ) {
			nowy++;
			graph1();
		}
	} else {
		if ( nowy > 1 ) {
			nowy--;
			graph1();
		}
	}
	$("div#top").css("zIndex", "850");
	$("div#left").css("zIndex", "880");
	$("div#floor").css("zIndex", "920");
};


//Zレイヤーを手前・奥に変更-----------------
function layerz( dz ) {
	if ( dz > 0 ) {
		if ( nowz < nMeshZ ) {
			nowz++;
			graph2();
		}
	} else {
		if ( nowz > 1 ) {
			nowz--;
			graph2();
		}
	}
	$("div#top").css("zIndex", "920");
	$("div#left").css("zIndex", "880");
	$("div#floor").css("zIndex", "850");
};

//Xレイヤーを左右に変更-----------------------
function layerx( dx ) {
	if ( dx > 0 ) {
		if ( nowx < nMeshX ) {
			nowx++;
			graph3();
		}
	} else {
		if ( nowx > 1 ) {
			nowx--;
			graph3();
		}
	}
	$("div#top").css("zIndex", "850");
	$("div#left").css("zIndex", "920");
	$("div#floor").css("zIndex", "880");
};


/*
//窓の位置移動からパラメータ設定(画面上での動的設定)
function windowPosition( tname ) {
	var w = $("#top #" + tname ).width();
	var h = $("#top #" + tname ).height();
	var p = $("#top #" + tname ).position();
	$("#WindowYr").val( Math.round(( - (p.top + h) + (400-(p.left*2 + w)/2) )/(400/$("#size_y").val())*10)/10 );
	$("#WindowHr").val( Math.round( h / (400/$("#size_y").val())*10)/10 );
	$("#WindowZr").val( Math.round( p.left / (400/$("#size_z").val())*10)/10*2 );
	$("#WindowWr").val( Math.round(w / (400/$("#size_z").val())*10)/10 );
};


//屏風位置変更時のパラメータ設定(画面上での動的設定)
function byobuPosition( tname ) {
	var w = $("#top #" + tname ).width();
	var h = $("#top #" + tname ).height();
	var p = $("#top #" + tname ).position();
	$("#ObsX1r").val( 1.6 -Math.round((400 - (p.top + h) +( 400- (p.left*2 + w))/2  ) /(400/$("#size_y").val())*10)/10 );
	$("#ObsYr").val( Math.round(h / (400/$("#size_y").val())*10)/10 );
	$("#ObsZ1r").val( Math.round( ( (400 - (p.top + h))*1.4 - w/2 ) / (400/$("#size_z").val())*10)/10 );
	$("#ObsZwr").val( Math.round( w / (400/$("#size_z").val())*10)/10 );
};
*/

//tabによる変更
function gtabChange(id){
	if ( id == 1 ) {
		$(".setting").show();
		$(".vresult").hide();
		$("#gtab1").addClass("selected");
		$("#gtab2").removeClass("selected");
	} else {
		$(".setting").hide();
		$(".vresult").show();
		$("#gtab1").removeClass("selected");
		$("#gtab2").addClass("selected");
	}
};

//layout of this room
function setteiviewChange(){
	if( $("#v_settei").prop('checked') ) {
		$(".setting").show();
	} else {
		$(".setting").hide();
	}
};

//result map show
function resultviewChange(){
	if( $("#v_result").prop('checked') ) {
		$(".vresult").show();
	} else {
		$(".vresult").hide();
	}
};

function detailShow(){
	$('#detail').show();
	$('#showbutton').hide();
	$('#hidebutton').show();
};

function detailHide(){
	$('#detail').hide();
	$('#showbutton').show();
	$('#hidebutton').hide();
};

function detail2Show(){
	$('#res').show();
	$('#show2button').hide();
	$('#hide2button').show();
};

function detail2Hide(){
	$('#res').hide();
	$('#show2button').show();
	$('#hide2button').hide();
};



