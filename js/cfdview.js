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

//表示方法
// 現在（2次元面で切り出して速度と温度を表示）
// 設定（あり）；風速の変化
//
// 全地点のプロット、少し左右に表示できるように
//
// 設定：段階での色分け、表示有無の切り分け
// 設定：風速表示の有無
// 複数設定での同時計算


//共通設定
var paramsets = {};	//保存設定値
var paramsets_g2 = {};	//保存設定値

//結果グラフ
var tmax = 0;
var tmin = 0;

//表示レイヤー
var nowz = parseInt( nMeshZ / 2 );
var nowy = 1;
var nowx = 1;

//累積計算
var sumwatt = 0;
var totaltime = 0;

//arrowsize　比率
var arrowsize = 1;

var timer = null;

//canvas 関連設定
var canvas = [];

//計算インスタンス
var cfd = [];
var graph = [];

//IDタグの前置き文字の設定
var graph_id_prefix = [ "", "G2_" ];

//初期設定================================================
$( function() {
	for ( var i=0 ; i<pararel ; i++ ){
		cfd[i] = new CFD();				//計算インスタンス
		graph[i] = new Graph(cfd[i],graph_id_prefix[i]);	//結果表示インスタンス	
	}
	
	setInputsDefault();
	dispSenarioButton();
	graph_init_mesh();

	$(".vresult").hide();
	$(".vresult").css("opacity", 0.6);

});

//入力コンポーネントの初期設定
function setInputsDefault(){
	//パラメータを設定する
	for( var d in defInput ){
		paramsets[d] = defInput[d].default;
		paramsets_g2[d] = defInput[d].default;
		$("#" + d ).val(defInput[d].default);
		$("#G2_" + d ).val(defInput[d].default);
	}
};

//シナリオ設定ボタンの設置
function dispSenarioButton(){
	var disp = "";
	for( var d in defSenario ){
		disp += "<p>■" + defSenario[d].group + "</p><div style='padding-left:10px;'>";
		for ( var e in defSenario[d].data ) {
			disp += "<input type='button' class='d" + d + ( defSenario[d].data[e].default == 1 ? " select" : "" ) + "' value='" + defSenario[d].data[e].title + "' onclick='btnSenario(" + d + "," + e + ");$(this).addClass(\"select\");'>";
			if ( defSenario[d].data[e].default == 1 ) {
				btnSenario( d ,e, true );
			}
		}
		disp += "</div>";
	}
	$("div#senarioButtons").html( disp );
	$("div#G2_senarioButtons").html( disp );
};


// 計算開始=======================================
//
function calcStart() {
	$("#step").html("");
	$("#res").html("");
	$("#layerz").html("");
	$("#layery").html("");
	$(".setting").hide();
	
	tabChange(3);
	gtabChange(2);
	$("#v_result").prop("checked",true);
	$("#v_settei").prop("checked",false);
	$(".vresult").show();
	$(".vresult").css("opacity", 0.9);

	//正面を前に表示する
	this.layerz(0);

	this.graph_init_mesh();

	sumwatt = 0;
	totaltime = 0;

	//時間ループ(単位：分)
	timer = setInterval( function() {
		//グラフがすべて準備OKの場合再計算許可
		var restart = true;
		for( var i=0 ; i<pararel ; i++ ) {
			restart &= graph[i].batch_end;
		}

		//計算開始
		var endcalc = false;
		for( var i=0 ; i<pararel ; i++ ) {
			endcalc |= graph[i].calc(restart);		//単位時間の実行
		}

		//時間上限に達したら終了
		if (  endcalc ){
			clearInterval( timer );
		}
	},100 );		//check by 20ms
};

//結果表示cfdgraphの呼び出し（複数ある場合は並べる) ===========
function graph_init_mesh(){
	//設定パラメータの取得(共通)
	getInputs();
	graph[0].init(paramsets);
	if ( pararel == 2 ){
		graph[1].init(paramsets_g2);
	}
}

function graphupdate(xyz){
	for( var i=0 ; i<pararel ; i++ ) {
		graph[i].graphupdate(xyz);
	}
}



//画面操作での動作 ===============================================

//入力欄からの値の読込と反映
function getInputs(){
	//パラメータをHTMLから設定する
	for( var d in defInput ){
		paramsets[d] = parseFloat( $("#" + d ).val() );
		paramsets_g2[d] = parseFloat( $("#" + d ).val() );
	}
	//2画面の場合の読み込み
	for( var d in defInput ){
		if( $("#G2_" + d ).val() ){
			paramsets_g2[d] = parseFloat( $("#G2_" + d ).val() );
		}
	}
	console.log(paramsets);
	console.log(paramsets_g2);

	//global基準値の設定
	nMeshX = paramsets.nMeshX;
	nMeshY = paramsets.nMeshY;
	nMeshZ = paramsets.nMeshZ;
	size_x = paramsets.size_x;
	size_y = paramsets.size_y;
	size_z = paramsets.size_z;
	ACwall = paramsets.ACwall;
	meshUnitCalc();		//setting.js
};

//シナリオボタンでの設定と反映（変数から一括設定）
function btnSenario(n, p, onlyset){
	$(".d" + n ).removeClass( "select");
	
	var def = defSenario[n].data[p];
	for( var d in def ){
		if ( d == "title" ) continue;
		if ( d == "default" ) continue;
		$("#" + d ).val(def[d]);
		$("#G2_" + d ).val(def[d]);
	}
	if( !onlyset ){
		graph_init_mesh();
	}
};


// 結果表示のレイヤーの変更
//Yレイヤー（平面）を上下に変更------------
function layerup( dy ) {
	if ( dy > 0 ) {
		if ( nowy < nMeshY ) {
			nowy++;
			graphupdate(1);
		}
	} else if( dy < 0 ){
		if ( nowy > 1 ) {
			nowy--;
			graphupdate(1);
		}
	}
	$(".front_base").css("zIndex", "850");
	$(".wall_base").css("zIndex", "880");
	$(".floor_base").css("zIndex", "920");
};


//Zレイヤーを手前・奥に変更-----------------
function layerz( dz ) {
	if ( dz > 0 ) {
		if ( nowz < nMeshZ ) {
			nowz++;
			graphupdate(2);
		}
	} else if( dz < 0 ) {
		if ( nowz > 1 ) {
			nowz--;
			graphupdate(2);
		}
	}
	$(".front_base").css("zIndex", "920");
	$(".wall_base").css("zIndex", "880");
	$(".floor_base").css("zIndex", "850");
};

//Xレイヤーを左右に変更-----------------------
function layerx( dx ) {
	if ( dx > 0 ) {
		if ( nowx < nMeshX ) {
			nowx++;
			graphupdate(0);
		}
	} else if( dx < 0 ) {
		if ( nowx > 1 ) {
			nowx--;
			graphupdate(0);
		}
	}
	$(".front_base").css("zIndex", "850");
	$(".wall_base").css("zIndex", "920");
	$(".floor_base").css("zIndex", "880");
};


/*
//窓の位置移動からパラメータ設定(画面上での動的設定)
function windowPosition( tname ) {
	var w = $(".front #" + tname ).width();
	var h = $(".front #" + tname ).height();
	var p = $(".front #" + tname ).position();
	$("#WindowYr").val( Math.round(( - (p.top + h) + (400-(p.left*2 + w)/2) )/(400/$("#size_y").val())*10)/10 );
	$("#WindowHr").val( Math.round( h / (400/$("#size_y").val())*10)/10 );
	$("#WindowZr").val( Math.round( p.left / (400/$("#size_z").val())*10)/10*2 );
	$("#WindowWr").val( Math.round(w / (400/$("#size_z").val())*10)/10 );
};


//屏風位置変更時のパラメータ設定(画面上での動的設定)
function byobuPosition( tname ) {
	var w = $(".front #" + tname ).width();
	var h = $(".front #" + tname ).height();
	var p = $(".front #" + tname ).position();
	$("#ObsX1r").val( 1.6 -Math.round((400 - (p.top + h) +( 400- (p.left*2 + w))/2  ) /(400/$("#size_y").val())*10)/10 );
	$("#ObsYr").val( Math.round(h / (400/$("#size_y").val())*10)/10 );
	$("#ObsZ1r").val( Math.round( ( (400 - (p.top + h))*1.4 - w/2 ) / (400/$("#size_z").val())*10)/10 );
	$("#ObsZwr").val( Math.round( w / (400/$("#size_z").val())*10)/10 );
};
*/

//矢印の大きさの変更
function graphresize(r){
	arrowsize /= r;
	graphupdate(0);
	graphupdate(1);
	graphupdate(2);
};

//設定タブの変更
function tabChange(id){
	$("div.tab span").removeClass( "selected" );
	$("span#tab" + id).addClass( "selected" );
	$("div.tabcontents").hide();
	$("div#tab" + id + "c").show();
	
};

//グラフ・表示タブによる変更
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



