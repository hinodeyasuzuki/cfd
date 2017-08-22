//CFD計算メインロジック
//本体からworkerとして呼び出す
// copyright(C) 2015-2017  Hinodeya Insititute for Ecolife co.ltd. Yausufumi Suzuki
//
//　とうとうあなたは見てしまいましたね。見たからには改善の協力をお願いします。
//
//　・3D　レギュラー格子、フラクショナルステップ、CIP使わず風上差分
//　・シミュレーション内時間で1秒ごとにデータを返し、最大時間で終了
//
//課題
// 　Prs圧力が極端に大きくなっていく->解決
// 　壁面と垂直方向の速度が生まれてしまう->強制的にゼロにする。エアコンは壁から離す
//
//
// packerでminにしてからロード
//

var fgAround = 2;				//1:浮力で周囲の温度を使う 2:平均温度を使う
var Re = 1000.0;				//レイノルズ数
var fgCalcTempAround = 2;		//温度計算　1:一次精度 2:風上差分での評価
var acv = 1;					//エアコン流速 m/s（仮設定）
var act = 5;					//エアコン 加温℃（流量で再計算）
var dir = 0.3;					//エアコン角度
var delta_t = 0.01;			//タイムステップ s  10℃なら0.5,20℃で0.1(自動変動）

var addair = true;				//エアコンによる加温 通常は true
var fix_coulant = true;		//coulant条件による自動タイムステップ変更 通常はtrue
var coulant_min = 0.7;			//　最小基準
var coulant_max = 0.8;			//  最大基準　1で発散


var iteration = 100;		//最大補正繰り返し回数
var tolerance = 0.001;		//許容誤差

var totaltime = 0;			//経過時間
var acheatsum = 0;			//エアコン出力(W)
var acheatcount = 0;		//エアコン出力(W)
var sumheatleft = 0;		// left window heat loss
var sumheatfront = 0;		// front window heat loss
var heatleftcount = 0;

var Riw = 0.11;				//室内側熱伝導抵抗　壁	㎡・K／W
var Rif = 0.15;				//室内側熱伝導抵抗　床
var Ric = 0.09;				//室内側熱伝導抵抗　天井

var sh_air = 1.006;				//比熱　空気J/gK
var sh_obs = 0;					//熱容量　障害物 J/m3K
var sh_wall = 783000;			//熱容量　壁 J/m3K
var sh_ceil = 783000;			//熱容量　天井 J/m3K
var sh_floor = 783000;			//熱容量　床 J/m3K
var sh_thick = 0.02;			//熱容量を考慮する厚さ m （2cm程度が適当）
var windowK = 6.0;				//熱貫流率　W/m2K
var wallK = 2.5;				//熱貫流率　W/m2K


//容積比熱　
//コンクリート　 　　　2013　KJ/m3k
//土壁　　　　　 　　　1327　KJ/m3k
//プラスターボード　　	854　KJ/m3k
//杉　　　　　　　　　	783　KJ/m3k
//グラスウール 			420　KJ/m3k


//不使用設定
var flagExecute = 1;		//未実行
var Dd = 0.001	;			//拡散係数　m2/s
var nu = 0.000155;			//空気の動粘性係数 m2/s
var rou = 1.293;			// kg/m3

//計算条件
var maxtime = 100;		//最大回数

var InsidePhi = 20;	//初期温度
var ObsPhi =20;		//障害物の温度
var InletPhi = 10;	//窓の外の温度
var FloorPhi = 18;	//床の温度

//メッシュ(値は初期値）
var nMeshX = 8;
var nMeshY = 8;
var nMeshZ = 8;
var size_x = 3;			//物理スケール m
var size_y = 3;
var size_z = 3;


//圧力（空気の周囲の温度との差）YUP方向が上とする
var g = 9.8;			// m/s2
var tz = 273.15;
var prsair = 0;	//101325;	//標準気圧 Pa N/m2

//形式定義
var INSIDE = 1;
var BOTTOM = 2;
var TOP = 3;
var WINDOW = 4;
var OUTSIDE = 5;
var SIDE = 6;
var OBSTACLE = 7;
var AC = 8;
var CL = 9;			//サーキュレータ（Xプラスから吸収、上面Yから送風）

var x = 0;
var y = 1;
var z = 2;


//計算フィールド
var meshtype;
var Phi;
var Prs;
var Vel;
var D;
var newF;
var tmp;

var delta_x ;
var delta_y ;
var delta_z ;

var delta_x2 ;
var delta_y2 ;
var delta_z2 ;

//結果グラフ
var vmax = 1;
var tmax = 0;
var tmin = 0;

var CirculatorWind = 0;


//worker呼び出し========================
onmessage = function (event) {
  
	//呼び出し時のパラメータの設定
	var ret = event.data.val;
	var totaltime = 0;
	maxtime = ret.maxtime;
	maxtime_sec = ret.maxtime_minute * 60;
	delta_t = ret.delta_t;
	size_x = ret.size_x;
	size_y = ret.size_y;
	size_z = ret.size_z;
	nMeshX = ret.nMeshX;
	nMeshY = ret.nMeshY;
	nMeshZ = ret.nMeshZ;
	InsidePhi = ret.InsidePhi;
	ACwind = ret.ACwind;
	CirculatorWind = ret.CirculatorWind;
	windowK = ret.windowKset;
	wallK = ret.wallKset;
	ObsPhi = ret.ObsPhi;
	InletPhi = ret.InletPhi;
	FloorPhi = ret.FloorPhi;
	meshtype = event.data.meshtype;

	init();							//初期化

	//時間ループ
	for( var i=0 ; i<=maxtime ; i++ ) {
		var ret = calculate();		//単時間計算
		var heatin = {};
		totaltime += delta_t;
		if ( ret>0 ) break;
		if ( Math.round(totaltime/60) !=  Math.round((totaltime-delta_t)/60) ) {
			heatin.heatleftin = ( heatleftcount ? sumheatleft / heatleftcount : 0 );
			heatin.heatfrontin = ( heatleftcount ? sumheatfront / heatleftcount : 0 );
			//シミュレーション内時間1分ごとに値を返す
			postMessage({ 
				"count": i,
				"totaltime": totaltime,
				"acheat": ( acheatcount ? acheatsum / acheatcount : 0 ),
				"heatin" : heatin,
				"Vel":Vel,
				"Phi":Phi,
				"Prs":Prs
			});
			sumheatleft = 0;
			sumheatfront = 0;
			acheatsum = 0;
			acheatcount = 0;
			heatleftcount = 0;
		}
		if ( maxtime_sec < totaltime ) break;
	}
	var count = i-1;

	//終了時に返す
	heatin.heatleftin = ( heatleftcount ? sumheatleft / heatleftcount : 0 );
	heatin.heatfrontin = ( heatleftcount ? sumheatfront / heatleftcount : 0 );
	postMessage({ 
				"count": count,
				"totaltime": totaltime,
				"heatin" : heatin,
				"acheat": ( acheatcount ? acheatsum / acheatcount : 0 ),
				"Vel":Vel,
				"Phi":Phi,
				"Prs":Prs
	});

};


//初期設定========================
function init(){
	//フィールドサイズ
	var NUM_MAX_X = nMeshX+1;
	var NUM_MAX_Y = nMeshY+1;
	var NUM_MAX_Z = nMeshZ+1;

	//フィールドの設定
	Phi = Array( NUM_MAX_X );
	Prs = Array( NUM_MAX_X );
	Vel = Array( 3 );
	tmp = Array( 3 );
	Vel[0] = Array( NUM_MAX_X );
	Vel[1] = Array( NUM_MAX_X );
	Vel[2] = Array( NUM_MAX_X );
	tmp[0] = Array( NUM_MAX_X );
	tmp[1] = Array( NUM_MAX_X );
	tmp[2] = Array( NUM_MAX_X );
	D = Array( NUM_MAX_X );
	newF = Array( NUM_MAX_X );
	for( var i=0 ; i<=NUM_MAX_X; i++ ){
		Phi[i] = Array( NUM_MAX_Y );
		Prs[i] = Array( NUM_MAX_Y );
		Vel[0][i] = Array( NUM_MAX_Y );
		Vel[1][i] = Array( NUM_MAX_Y );
		Vel[2][i] = Array( NUM_MAX_Y );
		tmp[0][i] = Array( NUM_MAX_Y );
		tmp[1][i] = Array( NUM_MAX_Y );
		tmp[2][i] = Array( NUM_MAX_Y );
		D[i] = Array( NUM_MAX_Y );
		newF[i] = Array( NUM_MAX_Y );
		for( var j=0 ; j<=NUM_MAX_Y; j++ ){
			Phi[i][j] = Array( NUM_MAX_Z );
			Prs[i][j] = Array( NUM_MAX_Z );
			Vel[0][i][j] = Array( NUM_MAX_Z );
			Vel[1][i][j] = Array( NUM_MAX_Z );
			Vel[2][i][j] = Array( NUM_MAX_Z );
			tmp[0][i][j] = Array( NUM_MAX_Z );
			tmp[1][i][j] = Array( NUM_MAX_Z );
			tmp[2][i][j] = Array( NUM_MAX_Z );
			D[i][j] = Array( NUM_MAX_Z );
			newF[i][j] = Array( NUM_MAX_Z );
		}
	}

	//共通使用変数
	delta_x = size_x / nMeshX;
	delta_y = size_y / nMeshY;
	delta_z = size_z / nMeshZ;

	delta_x2 = delta_x * delta_x;
	delta_y2 = delta_y * delta_y;
	delta_z2 = delta_z * delta_z;

	//温度設定
	for( i=0 ; i<=nMeshX+1 ; i++ ) {
		for( j=0 ; j<=nMeshY+1 ; j++ ) {
			for( k=0 ; k<=nMeshZ+1 ; k++ ) {
				Phi[i][j][k] = InsidePhi;			//初期温度
				Vel[x][i][j][k] = 0.0;
				Vel[y][i][j][k] = 0.0;
				Vel[z][i][j][k] = 0.0;
				Prs[i][j][k] = prsair;
				if ( meshtype[i][j][k] ==  BOTTOM )
					Phi[i][j][k] = FloorPhi;
				if ( meshtype[i][j][k] ==  OBSTACLE )
					Phi[i][j][k] = ObsPhi;
				if ( meshtype[i][j][k] ==  WINDOW || meshtype[i][j][k] ==  OUTSIDE )
					Phi[i][j][k] = InletPhi;
			}
		}
	}

/*
	//エアコン存在
	var ace =0;
	for( i=0 ; i<=nMeshX+1 ; i++ ) {
		for( j=0 ; j<=nMeshY+1 ; j++ ) {
			for( k=0 ; k<=nMeshZ+1 ; k++ ) {
				if ( meshtype[i][j][k] == AC ) {
					ace = 1;
					break;
				}
			}
		}
	}
	if ( ace == 1 ) {
		coulant_min = 0.6;
		coulant_max = 0.8;
	} else {
		coulant_min = 0.5;
		coulant_max = 0.6;
	}
*/
	acheatsum = 0;
	acheatcount = 0;

};




//計算ルーチン　フラクショナルステップ法========================
function calculate() {
	var cnt = 0;
	var perror = 0.0;
	var maxError = 0.0;
	var maxPrs0 = -1000.0;
	var minPrs0 = 1000.0;
	var maxPhi0 = -1000.0;
	var minPhi0 = 1000.0;
	var phiaverage = 0;
	var tmprature = 0;
	var dv = 0;


	//速度境界条件
	for( i=0 ; i<=nMeshX+1 ; i++ ) {
		for( j=0 ; j<=nMeshY+1 ; j++ ) {
			for( k=0 ; k<=nMeshZ+1 ; k++ ) {
				if ( meshtype[i][j][k] != INSIDE &&  meshtype[i][j][k] != CL ) {
					Vel[x][i][j][k] = 0.0;
					Vel[y][i][j][k] = 0.0;
					Vel[z][i][j][k] = 0.0;	//Vel[y][1][j];
				}
			}
		}
	}


	//温度からの浮力による速度更新---------------------------
	//平均温度
	var phisum = 0;
	var phicount = 0;
	for( i=1 ; i<=nMeshX ; i++ ) {
		for( j=1 ; j<=nMeshY ; j++ ) {
			for( k=1 ; k<=nMeshZ ; k++ ) {
				if ( meshtype[i][j][k] == INSIDE ) {
					phicount += 1;
					phisum += Phi[i][j][k];
				}
			}
		}
	}

	var phiaverage = phisum / phicount;
	var around = phiaverage+ tz;
	var tmax = 0;

	for( i=1 ; i<=nMeshX ; i++ ) {
		for( j=1 ; j<=nMeshY ; j++ ) {
			for( k=1 ; k<=nMeshZ ; k++ ) {
				if ( meshtype[i][j][k] == INSIDE ) {

				  if ( fgAround == 1 ) {
					//周囲の温度との差を使う場合（使わないときはフィールド平均）
					var neararound = 0;
					var neararoundc = 0;
					if ( meshtype[i-1][j][k] == INSIDE ) {
						neararound += Phi[i-1][j][k];
						neararoundc++;
					}
					if ( meshtype[i+1][j][k] == INSIDE ) {
						neararound += Phi[i+1][j][k];
						neararoundc++;
					}
					if ( meshtype[i][j-1][k] == INSIDE ) {
						neararound += Phi[i][j-1][k];
						neararoundc++;
					}
					if ( meshtype[i][j+1][k] == INSIDE ) {
						neararound += Phi[i][j+1][k];
						neararoundc++;
					}
					if ( meshtype[i][j][k-1] == INSIDE ) {
						neararound += Phi[i][j][k-1];
						neararoundc++;
					}
					if ( meshtype[i][j][k+1] == INSIDE ) {
						neararound += Phi[i][j][k+1];
						neararoundc++;
					}
					if ( neararoundc > 0 ){
						around = ( neararound / neararoundc + phiaverage ) /2 + tz;
					} else {
						around = phiaverage+ tz;
					}
				  }
					//温度差による浮力
					tmprature = Phi[i][j][k] + tz;
					dv = g  * ( tmprature - around ) / around * delta_t;
					//最大値
					if ( tmax < dv ) tmax = dv;
					//ぶれをいれる
					Vel[y][i][j][k] += dv * (Math.random() * 0.1*2 + 0.9) ;
				}
			}
		}
	}


	//エアコン（温度と風速の設定）--------------------------
	//下方向に温風 壁と反対方向で同じ風速で吸収
	//エアコンの方向の設定
	var acx = 0;
	var acz = 0;
	j=nMeshY-2;

	if ( ACwind > 0 ) {
		acv = ACwind;
	} else {
		acv = 2;	//強風
	}
	//暖房能力2.8kWと想定 act温度上昇 
	if ( addair ) {
		act = 2800 / ( sh_air * rou * 1000 * acv * 1 * delta_x );
		//幅1m×delta_xの吹き出し口
	} else {
		act = 0;
	}
	var adj = 1;
	
	for( i=1 ; i<=nMeshX ; i++ ) {
		for( k=1 ; k<=nMeshZ ; k++ ) {
			if ( meshtype[i][j][k] == AC ) {
				if ( Phi[i][j+1][k] < 22 ) {
					if ( ACwind > 0 ) {
						acheatsum += 2800;
						Phi[i][j][k] = Phi[i][j+1][k]+act;
						Phi[i][j-1][k] = Phi[i][j+1][k]+act;
						adj = 1;
					} else {
						//自動調整
						if ( Phi[i][j+1][k] < 20 && totaltime > 300 ) {
							//最初の5分はフル動作
							acheatsum += 1400;
							adj = 0.5;
						} else {
							acheatsum += 2800;
							adj = 1;
						}
						Phi[i][j][k] = Phi[i][j+1][k]+act;
						Phi[i][j-1][k] = Phi[i][j+1][k]+act;
					}
				} else {
					Phi[i][j][k] = Phi[i][j+1][k];
					Phi[i][j-1][k] = Phi[i][j+1][k];
					if ( ACwind > 0 ) {
						adj = 1;
					} else {
						adj = 0.5;
					}
				}

				if ( i == 2 ) {
					acx = 1;
					Vel[x][i][j-1][k] = acv * dir * adj;
					Vel[x][i][j+1][k] = -acv * dir * adj;
				}
				if ( i == nMeshX-1 ) {
					acx = -1;
					Vel[x][i][j-1][k] = -acv * dir * adj;
					Vel[x][i][j+1][k] = acv * dir * adj;
				}
				if ( k == 2 ) {
					acz = 1;
					Vel[z][i][j-1][k] = acv * dir * adj;
					Vel[z][i][j+1][k] = -acv * dir * adj;
				}
				if ( k == nMeshX-1 ) {
					acz = -1;
					Vel[z][i][j-1][k] = -acv * dir * adj;
					Vel[z][i][j+1][k] = acv * dir * adj;
				}
				Vel[y][i][j+1][k] = -acv * Math.sqrt( 1 - dir*dir) * adj;
				Vel[y][i][j][k] = -acv;
				Vel[y][i][j-1][k] = -acv* Math.sqrt( 1 - dir*dir) * adj;
				acheatcount++;
			}
		}
	}

	//サーキュレータ風速設定
	i=1;
	j=1;
	k=Math.round(nMeshZ/2);
	if ( meshtype[i][j][k] == CL ) {
		//一つ横を設定してたが、直接セルの設定をしたほうがいい結果が出る 161025
		//Vel[y][i][j][k] = CirculatorWind;		//1段目はあとで速度0にされてしまう　圧力がおかしくなる
		Vel[y][i][j+1][k] = CirculatorWind;
	}

	//内部壁面の速度境界条件（壁等への垂直方向の風はない）
	//これをなくすと、壁面での圧力がなくなり、方向転換がされない
	for( i=1 ; i<=nMeshX ; i++ ) {
		for( j=1 ; j<=nMeshY ; j++ ) {
			for( k=1 ; k<=nMeshZ ; k++ ) {
				if ( meshtype[i][j][k] == INSIDE || meshtype[i][j][k] == OBSTACLE ) {
					if( i==1 || i==nMeshX || meshtype[i-1][j][k] == OBSTACLE || meshtype[i+1][j][k] == OBSTACLE ) {
						Vel[x][i][j][k] = 0.0;
					}
					if( j==1 || j==nMeshY) {
						Vel[y][i][j][k] = 0.0;
					}
					if( k==1|| k== nMeshZ) {
						Vel[z][i][j][k] = 0.0;
					}
				}
			}
		}
	}
	

	//NS方程式による速度更新（風上差分）-----------
	methodSabun(x);
	methodSabun(y);
	methodSabun(z);


	//Poisson方程式（速度・圧力から、もう一度速度）----------------------
	//Poisson方程式の右辺（対流項）
	var maxD = 0;
	var a,b,c;
	for( i=1 ; i<=nMeshX ; i++ ) {
		for( j=1 ; j<=nMeshY ; j++ ) {
			for( k=1 ; k<=nMeshZ ; k++ ) {
				if ( meshtype[i][j][k] == INSIDE || meshtype[i][j][k] == CL ) {
					//1611 CL追加

				  if ( 1 ) {	
					// 160210 中心差分でないと値がでない
					//中心差分
					a = (Vel[x][i+1][j][k] - Vel[x][i-1][j][k]) /2 / delta_x;
					b = (Vel[y][i][j+1][k] - Vel[y][i][j-1][k]) /2 / delta_y;
					c = (Vel[z][i][j][k+1] - Vel[z][i][j][k-1]) /2 / delta_z;

				  } else {
					//前進差分
					if( Vel[x][i][j][k] > 0 ) {
						a = (Vel[x][i][j][k] - Vel[x][i-1][j][k]) / delta_x;
					} else {
						a = (Vel[x][i+1][j][k] - Vel[x][i][j][k]) / delta_x;
					}
					if( Vel[y][i][j][k] > 0 ) {
						b = (Vel[y][i][j][k] - Vel[y][i][j-1][k]) / delta_y;
					} else {
						b = (Vel[y][i][j+1][k] - Vel[y][i][j][k]) / delta_y;
					}
					if( Vel[z][i][j][k] > 0 ) {
						c = (Vel[z][i][j][k] - Vel[z][i][j][k-1]) / delta_z;
					} else {
						c = (Vel[z][i][j][k+1] - Vel[z][i][j][k]) / delta_z;
					}
				  }

				  //170630 rou追加
					D[i][j][k] = (a + b + c) * rou / delta_t;
					if ( D[i][j][k] > maxD )
						maxD = D[i][j][k];
				}
			}
		}
	}

	//Poissonの方程式を解く
	var cnt = 0;
	var A4 = 2 * ( 1 / delta_x2 + 1 / delta_y2 + 1 / delta_z2 );

	while ( cnt < iteration ) {
		maxError = 0.0;

		//圧力条件設定　計算中で空気以外を判定しているので不要

		//反復計算 GS法、SOR法、SIP法
		var pp;

		var xp,xm, yp,ym,zp,zm;
		for( i=1 ; i<=nMeshX ; i++ ) {
			for( j=1 ; j<=nMeshY ; j++ ) {
				for( k=1 ; k<=nMeshZ ; k++ ) {
					if ( meshtype[i][j][k] == INSIDE || meshtype[i][j][k] == CL ) {
						//1611 CL追加
						//Dをふくめてまとめて6で割る（式の展開より）
						xp = Prs[i+1][j][k];
						xm = Prs[i-1][j][k];
						yp = Prs[i][j+1][k];
						ym = Prs[i][j-1][k];
						zp = Prs[i][j][k+1];
						zm = Prs[i][j][k-1];
						tmp[0][i][j][k] = ( ( xp + xm ) / delta_x2 +  ( yp + ym ) / delta_y2 + ( zp + zm ) / delta_z2 - D[i][j][k] ) / A4;
						perror = Math.abs(tmp[0][i][j][k] -  Prs[i][j][k]);
						if ( perror > maxError ) {
							maxError = perror;
						}
					}
				}
			}
		}

		//圧力の設定
		for( i=0 ; i<=nMeshX+1 ; i++ ) {
			for( j=0 ; j<=nMeshY+1 ; j++ ) {
				for( k=0 ; k<=nMeshZ+1 ; k++ ) {
					if ( meshtype[i][j][k] == INSIDE || meshtype[i][j][k] == CL ) {
						// 1611CLも追加
						Prs[i][j][k] = tmp[0][i][j][k];
					}
				}
			}
		}
		for( i=0 ; i<=nMeshX+1 ; i++ ) {
			for( j=0 ; j<=nMeshY+1 ; j++ ) {
				for( k=0 ; k<=nMeshZ+1 ; k++ ) {
						//空気でない場合には、最も近い空気の圧力を設定
						if ( i==0 ) {
							Prs[i][j][k] = tmp[0][i+1][j][k];
						} else if ( i==nMeshX+1 ) {
							Prs[i][j][k] = tmp[0][i-1][j][k];
						} else if ( j==0 ) {
							Prs[i][j][k] = tmp[0][i][j+1][k];
						} else if ( j==nMeshY+1 ) {
							Prs[i][j][k] = tmp[0][i][j-1][k];
						} else if ( k==0 ) {
							Prs[i][j][k] = tmp[0][i][j][k+1];
						} else if ( k==nMeshZ+1 ) {
							Prs[i][j][k] = tmp[0][i][j][k-1];
						} else {
							//障害物など 170629　削除
							/*
							if ( meshtype[i-1][j][k] == INSIDE ) {
								Prs[i][j][k] = tmp[0][i-1][j][k];
							} else if ( meshtype[i+1][j][k] == INSIDE ) {
								Prs[i][j][k] = tmp[0][i+1][j][k];
							} else if ( meshtype[i][j-1][k] == INSIDE ) {
								Prs[i][j][k] = tmp[0][i][j-1][k];
							} else if ( meshtype[i][j+1][k] == INSIDE ) {
								Prs[i][j][k] = tmp[0][i][j+1][k];
							} else if ( meshtype[i][j][k-1] == INSIDE ) {
								Prs[i][j][k] = tmp[0][i][j][k-1];
							} else if ( meshtype[i][j][k+1] == INSIDE ) {
								Prs[i][j][k] = tmp[0][i][j][k+1];
							}
							*/
						}
					
				}
			}
		}
		
		if ( maxError < tolerance ) {
			break;
		} else {
			//return maxError;
		}
		cnt+=1;
	}
	
	function absolutemax( a, b ){
		return Math.abs(a) > Math.abs(b) ? a/3 : b/3;
	}


	//速度ベクトルの更新
	for( i=1 ; i<=nMeshX ; i++ ) {
		for( j=1 ; j<=nMeshY ; j++ ) {
			for( k=1 ; k<=nMeshZ ; k++ ) {
				if ( meshtype[i][j][k] == INSIDE || meshtype[i][j][k] == CL) {
					//170629 比重rou を掛け合わせる
					tmp[x][i][j][k] = Vel[x][i][j][k] - 0.5 * delta_t * (Prs[i+1][j][k] - Prs[i-1][j][k]) / (rou * delta_x);
					tmp[y][i][j][k] = Vel[y][i][j][k] - 0.5 * delta_t * (Prs[i][j+1][k] - Prs[i][j-1][k]) / ( rou  * delta_y);	
					tmp[z][i][j][k] = Vel[z][i][j][k] - 0.5 * delta_t * (Prs[i][j][k+1] - Prs[i][j][k-1]) / ( rou * delta_z);

				}
			}
		}
	}
	for( i=1 ; i<=nMeshX ; i++ ) {
		for( j=1 ; j<=nMeshY ; j++ ) {
			for( k=1 ; k<=nMeshZ ; k++ ) {
				if ( meshtype[i][j][k] == INSIDE ) {
					Vel[x][i][j][k] = tmp[x][i][j][k];
					Vel[y][i][j][k] = tmp[y][i][j][k];
					Vel[z][i][j][k] = tmp[z][i][j][k];
				}
			}
		}
	}

	//速度境界条件 再び設定することでサーキュレータが適切になる 170629なくしても変化なし
	/*
	for( i=0 ; i<=nMeshX+1 ; i++ ) {
		for( j=0 ; j<=nMeshY+1 ; j++ ) {
			for( k=0 ; k<=nMeshZ+1 ; k++ ) {
				if ( meshtype[i][j][k] != INSIDE &&  meshtype[i][j][k] != CL ) {
					Vel[x][i][j][k] = 0.0;
					Vel[y][i][j][k] = 0.0;
					Vel[z][i][j][k] = 0.0;	//Vel[y][1][j];
				}
			}
		}
	}
	*/


	//温度-----------------------------------------------
	var coulant;
	var maxcoulant;
	maxcoulant = 0;
	var vijk;
	var fixwall;

	var heatparm = delta_t / ( Riw * sh_air * rou * 1000 );
	var heatparm_f = delta_t / ( Rif * sh_air * rou * 1000 );
	var heatparm_c = delta_t / ( Ric * sh_air * rou * 1000 );
	var heatparm_w = delta_t / ( sh_air * rou * 1000 );

	//温度の移動
	for( i=0 ; i<=nMeshX+1 ; i++ ) {
		for( j=0 ; j<=nMeshY+1 ; j++ ) {
			for( k=0 ; k<=nMeshZ+1 ; k++ ) {
				var pphi =  Phi[i][j][k];
				tmp[0][i][j][k] = pphi;
				if ( meshtype[i][j][k] == INSIDE || meshtype[i][j][k] == CL ) {
					//空気の場合（+1、-1はありうる）
					xp = Phi[i+1][j][k];
					xm = Phi[i-1][j][k];
					yp = Phi[i][j+1][k];
					ym = Phi[i][j-1][k];
					zp = Phi[i][j][k+1];
					zm = Phi[i][j][k-1];
					
					//170630 NOT 風上差分で メッシュ違いではなく、メッシュの平均値を用いたが、 サーキュレータができない、エアコンの熱供給が遅い
					//170630 端の場合には、自分の速度を使う
					//一次精度　一次方向移流 X
					coulant = Vel[x][i][j][k] * delta_t / delta_x;
					//vijk = Vel[x][i][j][k];
					if ( fgCalcTempAround == 1 ) {
						//一次精度
						tmp[0][i][j][k] += 0.5 * (coulant * (xm - xp) + Math.abs(coulant) * (xp + xm - 2.0 * pphi));
					} else {
						//風上差分
						fixwall = ( i==2 ? 2 : i-1 );
						//fixwall = i-1;
						if ( Vel[x][fixwall][j][k] > 0 ) {
							coulant = Vel[x][fixwall][j][k] * delta_t / delta_x;
							tmp[0][i][j][k] += ( xm - pphi ) * coulant;
						}
						fixwall = ( i==nMeshX ? nMeshX : i+1 );
						//fixwall = i+1;
						if ( Vel[x][fixwall][j][k] < 0 ) {
							coulant = -Vel[x][fixwall][j][k] * delta_t / delta_x;
							tmp[0][i][j][k] += ( xp - pphi ) * coulant;
						}
					}
					if ( maxcoulant < coulant ) maxcoulant = coulant;

					//一次精度　一次方向移流 Y
					vijk = Vel[y][i][j][k];
					coulant = Vel[y][i][j][k] * delta_t / delta_y;
					if ( fgCalcTempAround == 1 ) {
						tmp[0][i][j][k] += 0.5 * (coulant * (ym - yp) + Math.abs(coulant) * (yp +ym - 2.0 * pphi));
					} else {
						fixwall = ( j==2 ? 2 : j-1 );
						//fixwall =j-1;
						if ( Vel[y][i][fixwall][k] > 0 ) {
							coulant = Vel[y][i][fixwall][k] * delta_t / delta_y;
							tmp[0][i][j][k] += ( ym - pphi ) * coulant;
						}
						fixwall = ( j==nMeshY ? nMeshY : j+1 );
						//fixwall = j+1 ;
						if ( Vel[y][i][fixwall][k] < 0 ) {
							coulant = -Vel[y][i][fixwall][k] * delta_t / delta_y;
							tmp[0][i][j][k] += ( yp - pphi ) * coulant;
						}
					}
					if ( maxcoulant < coulant ) maxcoulant = coulant;

					//一次精度　一次方向移流 Z
					//vijk = Vel[z][i][j][k];
					coulant = Vel[z][i][j][k] * delta_t / delta_z;
					if ( fgCalcTempAround == 1 ) {
						tmp[0][i][j][k] += 0.5 * (coulant * (zm - zp) + Math.abs(coulant) * (zp +zm - 2.0 * pphi));
					} else {
						fixwall = ( k==2 ? 2 : k-1 );
						//fixwall = k-1;
						if ( Vel[z][i][j][fixwall] > 0 ) {
							coulant = Vel[z][i][j][fixwall] * delta_t / delta_z;
							tmp[0][i][j][k] += ( zm - pphi ) * coulant;
						}
						fixwall = ( k==nMeshZ ? nMeshZ : k+1 );
						//fixwall =  k+1;
						if ( Vel[z][i][j][fixwall] < 0 ) {
							coulant = -Vel[z][i][j][k+1] * delta_t / delta_z;
							tmp[0][i][j][k] += ( zp - pphi ) * coulant;
						}
					}
					if ( maxcoulant < coulant ) maxcoulant = coulant;
	
					//外壁からの流入
					// 室内側熱抵抗0.11m2K/W 　空気比熱　1.006J/gK　
					// 170629 heatparm_w を使う場合には delta_*で割らない
					if ( meshtype[i-1][j][k] != INSIDE && meshtype[i-1][j][k] != CL ) {
						//左側が空気でない
						if ( meshtype[i-1][j][k] == OUTSIDE ) {
							//外壁（左）
							tmp[0][i][j][k] += ( xm - pphi ) * wallK * heatparm_w / delta_x;
							sumheatleft += ( xm - pphi ) * wallK * delta_y*delta_z ;
						} else if ( meshtype[i-1][j][k] == WINDOW ) {
							//窓（左）
							tmp[0][i][j][k] += ( xm - pphi )  * windowK * heatparm_w / delta_x;
							sumheatleft += ( xm - pphi )  * windowK * delta_y*delta_z ;
						} else {
							tmp[0][i][j][k] += ( xm - pphi ) / delta_x * heatparm / delta_x;
							sumheatleft += ( xm - pphi ) / delta_x * Riw * delta_y*delta_z ;
						}
					}
					if ( meshtype[i+1][j][k] != INSIDE ) {
						tmp[0][i][j][k] += ( xp - pphi ) / delta_x * heatparm;
					}

					if ( meshtype[i][j-1][k] != INSIDE && meshtype[i][j-1][k] != CL ) {
						//床だったら
						tmp[0][i][j][k] += ( ym - pphi )  / delta_y * heatparm_f;
					}
					if ( meshtype[i][j+1][k] != INSIDE ) {
						//天井だったら
						tmp[0][i][j][k] += ( yp - pphi ) / delta_y * heatparm_c;
					}

					if ( meshtype[i][j][k-1] != INSIDE && meshtype[i][j][k-1] != CL ) {
						tmp[0][i][j][k] += ( zm - pphi ) / delta_z * heatparm;
					}
					if ( meshtype[i][j][k+1] != INSIDE && meshtype[i][j][k+1] != CL) {
						//奥が空気でない
						if ( meshtype[i][j][k+1] == OUTSIDE ) {
							//外壁
							tmp[0][i][j][k] += ( zp - pphi ) * wallK  * heatparm_w;
							sumheatfront += ( zp - pphi ) * wallK* delta_y*delta_z ;
						} else if ( meshtype[i][j][k+1] == WINDOW ) {
							//窓（正面）
							tmp[0][i][j][k] += ( zp - pphi )  * windowK * heatparm_w;
							sumheatfront += ( zp - pphi ) * windowK* delta_y*delta_z ;
						} else {
							//内壁
							tmp[0][i][j][k] += ( zp - pphi )  / delta_z * heatparm;
							sumheatfront += ( zp - pphi ) / delta_z * Riw* delta_y*delta_z ;
						}
					}

				} else if ( meshtype[i][j][k] == OBSTACLE ) {
					//物体の空気からの熱移動を評価(-1 +1が有効)
					xp = Phi[i+1][j][k];
					xm = Phi[i-1][j][k];
					yp = Phi[i][j+1][k];
					ym = Phi[i][j-1][k];
					zp = Phi[i][j][k+1];
					zm = Phi[i][j][k-1];
					if ( ObsPhi != InsidePhi ) {
						//温度設定がされている場合には処理しない
					} else if ( meshtype[i-1][j][k] == INSIDE ||  meshtype[i+1][j][k] == INSIDE ) {
						tmp[0][i][j][k] = ( xp+ xm ) / 2;
					} else if ( meshtype[i][j-1][k] == INSIDE ||  meshtype[i][j+1][k] == INSIDE ) {
						tmp[0][i][j][k] = ( yp + ym ) / 2;
					} else if ( meshtype[i][j-1][k] == INSIDE ||  meshtype[i][j+1][k] == INSIDE ) {
						tmp[0][i][j][k] = ( zp + zm ) / 2;
					} else {
						tmp[0][i][j][k] = ( xp + xm + yp + ym +zp + zm ) / 6;
					}

				} else if ( meshtype[i][j][k] == SIDE ) {
					//壁の空気からの熱移動を評価
					// 温度は使わないので、空気温度を設定する
					if ( meshtype[i][j][Math.max(k-1,0)] == INSIDE) {
						//壁面温度を外気温として扱う（奥）
						//tmp[0][i][j][k] = Phi[i][j][k] + (Phi[i][j][k-1]-Phi[i][j][k]) / Riw * delta_t / ( sh_wall * sh_thick );
					} else if ( meshtype[i][j][Math.min(k+1,nMeshZ+1)] == INSIDE) {
						tmp[0][i][j][k] += (Phi[i][j][k+1]-pphi) / Riw * delta_t / ( sh_wall * sh_thick );
					} else if ( meshtype[Math.max(i-1,0)][j][k] == INSIDE) {
						tmp[0][i][j][k] += (Phi[i-1][j][k]-pphi) / Riw * delta_t / ( sh_wall * sh_thick );
					} else if ( meshtype[Math.min(i+1,nMeshX+1)][j][k] == INSIDE) {
						//壁面温度を外気温として扱う（左）
						//tmp[0][i][j][k] += (Phi[i+1][j][k]-Phi[i][j][k]) / Riw * delta_t / ( sh_wall * sh_thick );

					}
				} else if ( meshtype[i][j][k] == TOP ) {
					tmp[0][i][j][k] += (Phi[i][j-1][k]-pphi) / Ric * delta_t / ( sh_wall * sh_thick );
				} else if ( meshtype[i][j][k] == BOTTOM ) {
					tmp[0][i][j][k] += (Phi[i][j+1][k]-pphi) / Rif * delta_t / ( sh_wall * sh_thick );
				}
			}
			//窓・外壁については温度は評価しない（外部から固定設定する）
		}
	}
	heatleftcount++;

	for( i=0 ; i<=nMeshX+1 ; i++ ) {
		for( j=0 ; j<=nMeshY+1 ; j++ ) {
			for( k=0 ; k<=nMeshZ+1 ; k++ ) {
				if ( tmp[0][i][j][k] ) {
					Phi[i][j][k] = tmp[0][i][j][k];
				}
			}
		}
	}


	//クーラン条件による計算タイミングの見直し-----------------------------
	if ( fix_coulant ) {
		if ( maxcoulant > coulant_min ) {
			delta_t *= 0.95;
		}
		if ( maxcoulant < coulant_max ) {
			delta_t *= 1.05;
		}
	}

	//圧力/温度の最大値・最小値--------------------------
	var prscount = 0;
	var prssum = 0;
	for( i=1 ; i<=nMeshX ; i++ ) {
		for( j=1 ; j<=nMeshY ; j++ ) {
			for( k=1 ; k<=nMeshZ ; k++ ) {
				prssum += Prs[i][j][k];
				prscount++;
				if ( Prs[i][j][k] > maxPrs0 ) 
					maxPrs0 = Prs[i][j][k];
				if ( Prs[i][j][k] < minPrs0 )
					minPrs0 = Prs[i][j][k];
				if ( Phi[i][j][k] > maxPhi0 )
					maxPhi0 = Phi[i][j][k];
				if ( Phi[i][j][k] < minPhi0 )
					minPhi0 = Phi[i][j][k];
			}
		}
	}
	//圧力の平均化　不要

	return 0;
};


//速度輸送方程式一次差分（方向成分ごと）===================================
function methodSabun( target ) {
	var f = Vel[target];
	var maxcoulant = 0;
	var fijk;

	for( i=1 ; i<=nMeshX ; i++ ) {
		for( j=1 ; j<=nMeshY ; j++ ) {
			for( k=1 ; k<=nMeshZ ; k++ ) {
				if ( meshtype[i][j][k] == INSIDE || meshtype[i][j][k] == CL) {
					fijk = f[i][j][k];
/*
					xp = ( meshtype[i+1][j][k] == INSIDE ? f[i+1][j][k] : f[i][j][k] );
					xm = ( meshtype[i-1][j][k] == INSIDE ? f[i-1][j][k] : f[i][j][k] );
					yp = ( meshtype[i][j+1][k] == INSIDE ? f[i][j+1][k] : f[i][j][k] );
					ym = ( meshtype[i][j-1][k] == INSIDE ? f[i][j-1][k] : f[i][j][k] );
					zp = ( meshtype[i][j][k+1] == INSIDE ? f[i][j][k+1] : f[i][j][k] );
					zm = ( meshtype[i][j][k-1] == INSIDE ? f[i][j][k-1] : f[i][j][k] );
*/
					xp = f[i+1][j][k];
					xm = f[i-1][j][k];
					yp = f[i][j+1][k];
					ym = f[i][j-1][k];
					zp = f[i][j][k+1];
					zm = f[i][j][k-1];

					//風上差分
					//これを中央差分をとると、チェッカーボードとなる
					coulant = Vel[x][i][j][k] * delta_t / delta_x;
					newF[i][j][k] = fijk + 0.5 * (coulant * (xm - xp) + Math.abs(coulant) * (xp +xm - 2.0 * fijk));
					coulant = Vel[y][i][j][k] * delta_t / delta_y;
					newF[i][j][k] += 0.5 * (coulant * (ym - yp) + Math.abs(coulant) * (yp +ym - 2.0 * fijk));
					coulant = Vel[z][i][j][k] * delta_t / delta_z;
					newF[i][j][k] += 0.5 * (coulant * (zm - zp) + Math.abs(coulant) * (zp +zm - 2.0 * fijk));

					//粘性項に中央差分
					newF[i][j][k] += delta_t * ( (xm + xp - 2.0 * fijk) / delta_x2   +  (ym + yp - 2.0 * fijk) / delta_y2 +  (zm + zp - 2.0 * fijk) / delta_z2 ) / Re;
				}
			}
		}
	}

	//更新
	for( i=1 ; i<=nMeshX ; i++ ) {
		for( j=1 ; j<=nMeshY ; j++ ) {
			for( k=1 ; k<=nMeshZ ; k++ ) {
				if ( meshtype[i][j][k] == INSIDE || meshtype[i][j][k] == CL ) {
					Vel[target][i][j][k] = newF[i][j][k];
				}
			}
		}
	}
};


