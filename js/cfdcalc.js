//CFD Main Calculation Logic
//CFD計算メインロジック
//
//copyright(C) 2015-2024 Yasufumi Suzuki, Hinodeya Insititute for Ecolife co.ltd.
//					鈴木靖文, 有限会社ひのでやエコライフ研究所										
//Released under the MIT license
//http://www.hinodeya-ecolife.com
//
//　・3D　レギュラー格子、フラクショナルステップ、CIP使わず風上差分
//　・シミュレーション内時間で1秒ごとにデータを返し、最大時間で終了
//
//
//
class CFD {
	constructor() {
		//計算方法フラグ
		this.fgAround = 2;				//1:浮力で周囲の温度を使う 2:平均温度を使う
		this.fgCalcTempAround = 2;		//温度計算　1:一次精度 2:風上差分での評価
		this.fgPoissonConvection = 1;	//Poisson対流項  1:中心差分 2:前進差分
		this.fgFixCoulant = true;		//coulant条件による自動タイムステップ変更 通常はtrue
		this.coulant_min = 0.7;			//　最小基準
		this.coulant_max = 0.8;			//  最大基準　1で発散

		this.acv = 1;					//エアコン流速 m/s（仮設定）
		this.act = 5;					//エアコン 加温℃（流量で再計算）
		this.dir = 0.4;					//エアコン角度
		this.delta_t = 0.1;				//タイムステップ s  10℃なら0.5,20℃で0.1(自動変動）
		this.addair = true;				//エアコンによる加温 通常は true

		this.iteration = 100;			//最大補正繰り返し回数
		this.tolerance = 0.001;			//許容誤差

		//記録
		this.totaltime = 0;				//経過時間
		this.acheatsum = 0;				//エアコン出力(W)
		this.acheatcount = 0;			//エアコン出力(W)
		this.sumheatleft = 0;			// left window heat loss
		this.sumheatfront = 0;			// front window heat loss
		this.heatleftcount = 0;

		//物理定数
		this.Re = 1000.0;				//レイノルズ数

		this.Riw = 0.11;					//室内側熱伝導抵抗　壁	㎡・K／W
		this.Rif = 0.15;					//室内側熱伝導抵抗　床
		this.Ric = 0.09;					//室内側熱伝導抵抗　天井

		this.sh_air = 1.006;				//比熱　空気J/gK
		this.sh_obs = 0;					//熱容量　障害物 J/m3K
		this.sh_wall = 783000;			//熱容量　壁 J/m3K
		this.sh_ceil = 783000;			//熱容量　天井 J/m3K
		this.sh_floor = 783000;			//熱容量　床 J/m3K
		this.sh_thick = 0.02;			//熱容量を考慮する厚さ m （2cm程度が適当）
		this.WindowK = 6.0;				//熱貫流率　W/m2K
		this.wallK = 2.5;				//熱貫流率　W/m2K

		this.rou = 1.293;				// kg/m3

		//refference 容積比熱　
		//コンクリート　 　　　2013　KJ/m3k
		//土壁　　　　　 　　　1327　KJ/m3k
		//プラスターボード　　	854　KJ/m3k
		//杉　　　　　　　　　	783　KJ/m3k
		//グラスウール 			420　KJ/m3k


		//不使用設定
		this.Dd = 0.001	;			//拡散係数　m2/s
		this.nu = 0.000155;			//空気の動粘性係数 m2/s

		//計算条件
		this.ObsPhi =20;				//障害物の温度
		this.InletPhi = 10;			//窓の外の温度
		this.FloorPhi = 18;			//床の温度

		//圧力（空気の周囲の温度との差）YUP方向が上とする
		this.g = 9.8;				// m/s2
		this.tz = 273.15;
		this.prsair = 0;			//101325;	//標準気圧 Pa N/m2

		this.delta_t_max = 5;
		this.delta_t_min = 0.001;

		this.CirculatorWind = 0;
	}



	//計算呼び出し========================

	//パラメータ設定
	meshset = function(data) {
		//呼び出し時のパラメータの設定
		var ret = data.val;
		this.delta_t = ret.delta_t;
		this.InsidePhi = ret.InsidePhi;
		this.ACwind = ret.ACwind;
		this.CirculatorWind = ret.CirculatorWind;
		this.WindowK = ret.windowKset;
		this.ObsPhi = ret.ObsPhi;
		this.InletPhi = ret.InletPhi;
		this.FloorPhi = ret.FloorPhi;
		this.meshtype = data.meshtype;

		this.init();						//初期化
	}

	//mesh initialize 
	init = function(){
		//フィールドサイズ
		var NUM_MAX_X = nMeshX+1;
		var NUM_MAX_Y = nMeshY+1;
		var NUM_MAX_Z = nMeshZ+1;

		//フィールドの設定
		this.Phi = this.init_3d();
		this.Prs = this.init_3d();
		this.Vel = Array( 3 );
		this.tmp = Array( 3 );
		this.Vel[0] = this.init_3d();
		this.Vel[1] = this.init_3d();
		this.Vel[2] = this.init_3d();
		this.tmp[0] = this.init_3d();
		this.tmp[1] = this.init_3d();
		this.tmp[2] = this.init_3d();
		this.D = this.init_3d();
		this.newF = this.init_3d();

		//共通使用変数
		this.delta_x = size_x / nMeshX;
		this.delta_y = size_y / nMeshY;
		this.delta_z = size_z / nMeshZ;
		this.delta_x2 = this.delta_x * this.delta_x;
		this.delta_y2 = this.delta_y * this.delta_y;
		this.delta_z2 = this.delta_z * this.delta_z;

		//initial value
		for( var i=0 ; i<=NUM_MAX_X ; i++ ) {
			for( var j=0 ; j<=NUM_MAX_Y ; j++ ) {
				for( var k=0 ; k<=NUM_MAX_Z ; k++ ) {
					//pressure
					this.Prs[i][j][k] = this.prsair;
					//temperature
					this.Phi[i][j][k] = this.InsidePhi;
					if ( this.meshtype[i][j][k] ==  BOTTOM )
						this.Phi[i][j][k] = this.FloorPhi;
					if ( this.meshtype[i][j][k] ==  OBSTACLE )
						this.Phi[i][j][k] = this.ObsPhi;
					if ( this.meshtype[i][j][k] ==  WINDOW || this.meshtype[i][j][k] ==  OUTSIDE )
						this.Phi[i][j][k] = this.InletPhi;
				}
			}
		}

		//counts
		this.acheatsum = 0;
		this.acheatcount = 0;
		this.count = 0;
		this.totaltime = 0;
	};

	//initialize 3D array
	init_3d = function() {
		var d = [];
		//フィールドサイズ
		var NUM_MAX_X = nMeshX+1;
		var NUM_MAX_Y = nMeshY+1;
		var NUM_MAX_Z = nMeshZ+1;
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


	//単位時間分の計算---------------------------------------
	meshcalc = function() {
		var sec = 20;
		var error = 0;
		while(1){
			this.count++;
			this.totaltime += this.delta_t;
			if( this.calculate() > 0 ) {
				error = 1;
				break;
			}
			if ( Math.floor(this.totaltime/sec) > Math.floor((this.totaltime - this.delta_t)/sec ) ) {
				//sec seconds
				break;
			}
		}

		//return result
		var heatin = {};
		heatin.heatleftin = ( this.heatleftcount ? this.sumheatleft / this.heatleftcount : 0 );
		heatin.heatfrontin = ( this.heatleftcount ? this.sumheatfront / this.heatleftcount : 0 );
		//シミュレーション内時間1分ごとに値を返す
		var returntoview = { 
			"error": error,
			"count": this.count,
			"totaltime": this.totaltime,
			"acheat": ( this.acheatcount ? this.acheatsum / this.acheatcount : 0 ),
			"heatin" : heatin,
			"Vel":this.Vel,
			"Phi":this.Phi,
			"Prs":this.Prs
		};
		this.sumheatleft = 0;
		this.sumheatfront = 0;
		this.acheatsum = 0;
		this.acheatcount = 0;
		this.heatleftcount = 0;

		return returntoview
	}

	//計算ルーチン　フラクショナルステップ法
	calculate = function() {
		//速度境界条件
		this.vel_boundary_conditions();

		//温度からの浮力による速度更新
		this.buoyancy();

		//エアコン（温度と風速の設定）
		this.equip_airconditioner();

		//サーキュレータ風速設定
		this.equip_circulator();

		//固定面垂直方向の風速
		this.wind_block();

		//NS方程式による速度更新（風上差分）
		this.difference_method(x);
		this.difference_method(y);
		this.difference_method(z);

		//Poisson方程式（速度・圧力から、もう一度速度）
		this.poisson_conditions();

		//速度境界条件
		this.vel_boundary_conditions();

		//Poisson方程式を解く
		var maxcoulant = this.solve_poisson();

		//時間ステップ補正
		this.time_step_correction(maxcoulant);
	}

	//calculate poisson equation-------------------------------------------------------
	//1速度境界条件
	vel_boundary_conditions = function() {
		var i,j,k;

		for( i=0 ; i<=nMeshX+1 ; i++ ) {
			for( j=0 ; j<=nMeshY+1 ; j++ ) {
				for( k=0 ; k<=nMeshZ+1 ; k++ ) {
					if ( !this.isCellAir(i,j,k) ) {
						this.Vel[x][i][j][k] = 0.0;
						this.Vel[y][i][j][k] = 0.0;
						this.Vel[z][i][j][k] = 0.0;	//this.Vel[y][1][j];
					}
				}
			}
		}
	}

	//2温度差による浮力
	buoyancy = function() {
		var i,j,k;
		var tmprature = 0;
		var dv;

		//平均温度
		var phisum = 0;
		var phicount = 0;
		for( i=1 ; i<=nMeshX ; i++ ) {
			for( j=1 ; j<=nMeshY ; j++ ) {
				for( k=1 ; k<=nMeshZ ; k++ ) {
					if ( this.meshtype[i][j][k] == INSIDE ) {
						phicount += 1;
						phisum += this.Phi[i][j][k];
					}
				}
			}
		}

		var phiaverage = phisum / phicount;
		var around = phiaverage+ this.tz;
		var tmax = 0;

		for( i=1 ; i<=nMeshX ; i++ ) {
			for( j=1 ; j<=nMeshY ; j++ ) {
				for( k=1 ; k<=nMeshZ ; k++ ) {
					if ( this.meshtype[i][j][k] == INSIDE ) {

						if ( this.fgAround == 1 ) {
							//周囲の温度との差を使う場合（使わないときはフィールド平均）
							var neararound = 0;
							var neararoundc = 0;
							if ( this.meshtype[i-1][j][k] == INSIDE ) {
								neararound += this.Phi[i-1][j][k];
								neararoundc++;
							}
							if ( this.meshtype[i+1][j][k] == INSIDE ) {
								neararound += this.Phi[i+1][j][k];
								neararoundc++;
							}
							if ( this.meshtype[i][j-1][k] == INSIDE ) {
								neararound += this.Phi[i][j-1][k];
								neararoundc++;
							}
							if ( this.meshtype[i][j+1][k] == INSIDE ) {
								neararound += this.Phi[i][j+1][k];
								neararoundc++;
							}
							if ( this.meshtype[i][j][k-1] == INSIDE ) {
								neararound += this.Phi[i][j][k-1];
								neararoundc++;
							}
							if ( this.meshtype[i][j][k+1] == INSIDE ) {
								neararound += this.Phi[i][j][k+1];
								neararoundc++;
							}
							if ( neararoundc > 0 ){
								// around = ( neararound / neararoundc + phiaverage ) /2 + tz;
								around = neararound / neararoundc + tz;
							} else {
								around = phiaverage+ tz;
							}
						}
						//温度差による浮力
						tmprature = this.Phi[i][j][k] + this.tz;
						dv = this.g  * ( tmprature - around ) / around * this.delta_t;
						//最大値
						if ( tmax < dv ) tmax = dv;
						//ぶれをいれる
						this.Vel[y][i][j][k] += dv * (Math.random() * 0.1*2 + 0.9) ;
					}
				}
			}
		}
	}

	//3a エアコンの設定
	equip_airconditioner = function() {
		var i,j,k;
		var dir = this.dir;

		//下方向に温風 壁と反対方向で同じ風速で吸収
		//エアコンの方向の設定
		var acx = 0;
		var acz = 0;		
		j = nMeshY-2;

		if ( this.ACwind > 0 ) {
			this.acv = this.ACwind;
		} else {
			this.acv = 2;	//強風
		}
		//暖房能力2.8kWと想定 act温度上昇 
		if ( this.addair ) {
			this.act = 2800 / ( this.sh_air * this.rou * 1000 * this.acv * ac_width * ac_height );
			//吹き出し口
		} else {
			this.act = 0;
		}
		var adj = 1;
		
		for( i=1 ; i<=nMeshX ; i++ ) {
			for( k=1 ; k<=nMeshZ ; k++ ) {
				if ( this.meshtype[i][j][k] == AC ) {
					if ( this.Phi[i][j+1][k] < 22 ) {	//入口温度
						if ( this.ACwind > 0 ) {
							this.acheatsum += 2800;
							this.Phi[i][j][k] = this.Phi[i][j+1][k];
							this.Phi[i][j-1][k] = this.Phi[i][j+1][k]+this.act;
							adj = 1;
						} else {
							//自動調整
							if ( this.Phi[i][j+1][k] < 20 && this.totaltime > 300 ) {
								//最初の5分はフル動作
								this.acheatsum += 1400;
								adj = 0.5;
							} else {
								this.acheatsum += 2800;
								adj = 1;
							}
							this.Phi[i][j][k] = this.Phi[i][j+1][k];
							this.Phi[i][j-1][k] = this.Phi[i][j+1][k]+this.act;
						}
					} else {
						this.Phi[i][j][k] = this.Phi[i][j+1][k];
						this.Phi[i][j-1][k] = this.Phi[i][j+1][k];
						if ( this.ACwind > 0 ) {
							adj = 1;
						} else {
							adj = 0.5;
						}
					}

					if ( i == 2 ) {
						acx = 1;
						this.Vel[x][i][j-1][k] = this.acv * dir * adj;
						this.Vel[x][i][j+1][k] = -this.acv * dir * adj;
					}
					if ( i == nMeshX-1 ) {
						acx = -1;
						this.Vel[x][i][j-1][k] = -this.acv * dir * adj;
						this.Vel[x][i][j+1][k] = this.acv * dir * adj;
					}
					if ( k == 2 ) {
						acz = 1;
						this.Vel[z][i][j-1][k] = this.acv * dir * adj;
						this.Vel[z][i][j+1][k] = -this.acv * dir * adj;
					}
					if ( k == nMeshZ-1 ) {
						acz = -1;
						this.Vel[z][i][j-1][k] = -this.acv * dir * adj;
						this.Vel[z][i][j+1][k] = this.acv * dir * adj;
					}
					this.Vel[y][i][j+1][k] = -this.acv * Math.sqrt( 1 - dir*dir) * adj;
					this.Vel[y][i][j][k] = -this.acv;
					this.Vel[y][i][j-1][k] = -this.acv* Math.sqrt( 1 - dir*dir) * adj;
					this.acheatcount++;
				}
			}
		}
	}

	//3b サーキュレータの設定
	equip_circulator = function() {
		var i=1;
		var j=1;
		var k=Math.round(nMeshZ/2);

		if ( this.meshtype[i][j][k] == CL ) {
			this.Vel[y][i][j][k] = this.CirculatorWind;
		}
	}

	//3c 固定面垂直方向の風速
	wind_block = function() {
		var i,j,k;
		//内部壁面の速度境界条件（壁等への垂直方向の風はない）
		//これをなくすと、壁面での圧力がなくなり、方向転換がされない
		for( i=1 ; i<=nMeshX ; i++ ) {
			for( j=1 ; j<=nMeshY ; j++ ) {
				for( k=1 ; k<=nMeshZ ; k++ ) {
					if ( this.meshtype[i][j][k] == INSIDE) {
						if( i==1 || i==nMeshX || this.meshtype[i-1][j][k] == OBSTACLE || this.meshtype[i+1][j][k] == OBSTACLE ) {
							this.Vel[x][i][j][k] = 0.0;
						}
						if( j==1 || j==nMeshY) {
							this.Vel[y][i][j][k] = 0.0;
						}
						if( k==1 || k== nMeshZ) {
							this.Vel[z][i][j][k] = 0.0;
						}
					}
				}
			}
		}
	}
	
	//4 速度輸送方程式一次差分（方向成分ごと） upwind===================================
	difference_method = function( target ) {
		var f = this.Vel[target];
		var fijk;
		var coulant;
		var i,j,k;

		for( i=1 ; i<=nMeshX ; i++ ) {
			for( j=1 ; j<=nMeshY ; j++ ) {
				for( k=1 ; k<=nMeshZ ; k++ ) {
					if ( this.isCellAir(i,j,k)) {
						fijk = f[i][j][k];
						var xp = f[i+1][j][k];
						var xm = f[i-1][j][k];
						var yp = f[i][j+1][k];
						var ym = f[i][j-1][k];
						var zp = f[i][j][k+1];
						var zm = f[i][j][k-1];

						//風上差分
						//これを中央差分をとると、チェッカーボードとなる
						coulant = this.Vel[x][i][j][k] * this.delta_t / this.delta_x;
						this.newF[i][j][k] = fijk + 0.5 * (coulant * (xm - xp) + Math.abs(coulant) * (xp +xm - 2.0 * fijk));
						coulant = this.Vel[y][i][j][k] * this.delta_t / this.delta_y;
						this.newF[i][j][k] += 0.5 * (coulant * (ym - yp) + Math.abs(coulant) * (yp +ym - 2.0 * fijk));
						coulant = this.Vel[z][i][j][k] * this.delta_t / this.delta_z;
						this.newF[i][j][k] += 0.5 * (coulant * (zm - zp) + Math.abs(coulant) * (zp +zm - 2.0 * fijk));

						//粘性項に中央差分
						this.newF[i][j][k] += this.delta_t * ( (xm + xp - 2.0 * fijk) / this.delta_x2   +  (ym + yp - 2.0 * fijk) / this.delta_y2 +  (zm + zp - 2.0 * fijk) / this.delta_z2 ) / this.Re;
					}
				}
			}
		}

		//更新
		for( i=1 ; i<=nMeshX ; i++ ) {
			for( j=1 ; j<=nMeshY ; j++ ) {
				for( k=1 ; k<=nMeshZ ; k++ ) {
					if ( this.isCellAir(i,j,k) ) {
						this.Vel[target][i][j][k] = this.newF[i][j][k];
					}
				}
			}
		}
	};

	//5 ポアソン方程式 対流項の計算
	poisson_conditions = function() {
		var i,j,k;
		var a,b,c;
		//Poisson方程式の右辺（対流項）
		// var maxD = 0;
		for( i=1 ; i<=nMeshX ; i++ ) {
			for( j=1 ; j<=nMeshY ; j++ ) {
				for( k=1 ; k<=nMeshZ ; k++ ) {
					if ( this.isCellAir(i,j,k) ) {
						//1611 CL追加

					if ( this.fgPoissonConvection == 1 ) {	
						// 160210 中心差分でないと値がでない
						//中心差分
						a = (this.Vel[x][i+1][j][k] - this.Vel[x][i-1][j][k]) /2 / this.delta_x;
						b = (this.Vel[y][i][j+1][k] - this.Vel[y][i][j-1][k]) /2 / this.delta_y;
						c = (this.Vel[z][i][j][k+1] - this.Vel[z][i][j][k-1]) /2 / this.delta_z;

					} else {
						//前進差分
						if( this.Vel[x][i][j][k] > 0 ) {
							a = (this.Vel[x][i][j][k] - this.Vel[x][i-1][j][k]) / this.delta_x;
						} else {
							a = (this.Vel[x][i+1][j][k] - this.Vel[x][i][j][k]) / this.delta_x;
						}
						if( this.Vel[y][i][j][k] > 0 ) {
							b = (this.Vel[y][i][j][k] - this.Vel[y][i][j-1][k]) / this.delta_y;
						} else {
							b = (this.Vel[y][i][j+1][k] - this.Vel[y][i][j][k]) / this.delta_y;
						}
						if( this.Vel[z][i][j][k] > 0 ) {
							c = (this.Vel[z][i][j][k] - this.Vel[z][i][j][k-1]) / this.delta_z;
						} else {
							c = (this.Vel[z][i][j][k+1] - this.Vel[z][i][j][k]) / this.delta_z;
						}
					}

					//170630 rou追加
					this.D[i][j][k] = (a + b + c) * this.rou / this.delta_t;
					// if ( this.D[i][j][k] > maxD )
					// 	maxD = this.D[i][j][k];
					}
				}
			}
		}
	}

	//6a ポアソン方程式:圧力計算
	poisson_pressure = function() {
		var i,j,k;
		var maxError = 0.0;
		var perror = 0.0;
		var A4 = 2 * ( 1 / this.delta_x2 + 1 / this.delta_y2 + 1 / this.delta_z2 );

		//圧力条件設定　計算中で空気以外を判定しているので不要

		//反復計算 GS法、SOR法、SIP法
		var pp;

		var xp,xm, yp,ym,zp,zm;

		for( i=1 ; i<=nMeshX ; i++ ) {
			for( j=1 ; j<=nMeshY ; j++ ) {
				for( k=1 ; k<=nMeshZ ; k++ ) {
					if ( this.isCellAir(i,j,k) ) {
						//Dをふくめてまとめて6で割る（式の展開より）
						xp = this.Prs[i+1][j][k];
						xm = this.Prs[i-1][j][k];
						yp = this.Prs[i][j+1][k];
						ym = this.Prs[i][j-1][k];
						zp = this.Prs[i][j][k+1];
						zm = this.Prs[i][j][k-1];
						this.tmp[0][i][j][k] = ( ( xp + xm ) / this.delta_x2 +  ( yp + ym ) / this.delta_y2 + ( zp + zm ) / this.delta_z2 - this.D[i][j][k] ) / A4;
						perror = Math.abs(this.tmp[0][i][j][k] -  this.Prs[i][j][k]);
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
					if ( this.isCellAir(i,j,k) ) {
						this.Prs[i][j][k] = this.tmp[0][i][j][k];
					}
				}
			}
		}
		for( i=0 ; i<=nMeshX+1 ; i++ ) {
			for( j=0 ; j<=nMeshY+1 ; j++ ) {
				for( k=0 ; k<=nMeshZ+1 ; k++ ) {
					//空気でない場合には、最も近い空気の圧力を設定
					if ( i==0 ) {
						this.Prs[i][j][k] = this.tmp[0][i+1][j][k];
					} else if ( i==nMeshX+1 ) {
						this.Prs[i][j][k] = this.tmp[0][i-1][j][k];
					} else if ( j==0 ) {
						this.Prs[i][j][k] = this.tmp[0][i][j+1][k];
					} else if ( j==nMeshY+1 ) {
						this.Prs[i][j][k] = this.tmp[0][i][j-1][k];
					} else if ( k==0 ) {
						this.Prs[i][j][k] = this.tmp[0][i][j][k+1];
					} else if ( k==nMeshZ+1 ) {
						this.Prs[i][j][k] = this.tmp[0][i][j][k-1];
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
		
		return maxError;
	}

	//6b ポアソン方程式:速度更新
	poisson_update_velocity = function() {
		var i,j,k;

		for( i=1 ; i<=nMeshX ; i++ ) {
			for( j=1 ; j<=nMeshY ; j++ ) {
				for( k=1 ; k<=nMeshZ ; k++ ) {
					if ( this.isCellAir(i,j,k) ) {
						//170629 比重rou を掛け合わせる
						this.tmp[x][i][j][k] = this.Vel[x][i][j][k] - 0.5 * this.delta_t * (this.Prs[i+1][j][k] - this.Prs[i-1][j][k]) / ( this.rou * this.delta_x);
						this.tmp[y][i][j][k] = this.Vel[y][i][j][k] - 0.5 * this.delta_t * (this.Prs[i][j+1][k] - this.Prs[i][j-1][k]) / ( this.rou * this.delta_y);	
						this.tmp[z][i][j][k] = this.Vel[z][i][j][k] - 0.5 * this.delta_t * (this.Prs[i][j][k+1] - this.Prs[i][j][k-1]) / ( this.rou * this.delta_z);
					}
				}
			}
		}
		for( i=1 ; i<=nMeshX ; i++ ) {
			for( j=1 ; j<=nMeshY ; j++ ) {
				for( k=1 ; k<=nMeshZ ; k++ ) {
					if ( this.isCellAir(i,j,k) ) {
						this.Vel[x][i][j][k] = this.tmp[x][i][j][k];
						this.Vel[y][i][j][k] = this.tmp[y][i][j][k];
						this.Vel[z][i][j][k] = this.tmp[z][i][j][k];
					}
				}
			}
		}
	}

	//6c ポアソン方程式:温度計算
	poisson_calc_temperature = function() {
		var i,j,k;
		var xp,xm, yp,ym,zp,zm;

		var coulant;
		var maxcoulant = 0;
		var fixwall;

		var heatparm   = this.delta_t / ( this.Riw * this.sh_air * this.rou * 1000 );
		var heatparm_f = this.delta_t / ( this.Rif * this.sh_air * this.rou * 1000 );
		var heatparm_c = this.delta_t / ( this.Ric * this.sh_air * this.rou * 1000 );
		var heatparm_w = this.delta_t / ( this.sh_air * this.rou * 1000 );

		//温度の移動
		for( i=0 ; i<=nMeshX+1 ; i++ ) {
			for( j=0 ; j<=nMeshY+1 ; j++ ) {
				for( k=0 ; k<=nMeshZ+1 ; k++ ) {
					var pphi =  this.Phi[i][j][k];
					this.tmp[0][i][j][k] = pphi;
					if ( this.isCellAir(i,j,k) ) {
						//空気の場合（+1、-1はありうる）
						xp = this.Phi[i+1][j][k];
						xm = this.Phi[i-1][j][k];
						yp = this.Phi[i][j+1][k];
						ym = this.Phi[i][j-1][k];
						zp = this.Phi[i][j][k+1];
						zm = this.Phi[i][j][k-1];
						
						//170630 NOT 風上差分で メッシュ違いではなく、メッシュの平均値を用いたが、 サーキュレータができない、エアコンの熱供給が遅い
						//170630 端の場合には、自分の速度を使う
						//一次精度　一次方向移流 X
						coulant = this.Vel[x][i][j][k] * this.delta_t / this.delta_x;
						if ( this.fgCalcTempAround == 1 ) {
							//一次精度
							this.tmp[0][i][j][k] += 0.5 * (coulant * (xm - xp) + Math.abs(coulant) * (xp + xm - 2.0 * pphi));
						} else {
							//風上差分
							fixwall = ( i==2 ? 2 : i-1 );
							//fixwall = i-1;
							if ( this.Vel[x][fixwall][j][k] > 0 ) {
								coulant = this.Vel[x][fixwall][j][k] * this.delta_t / this.delta_x;
								this.tmp[0][i][j][k] += ( xm - pphi ) * coulant;
							}
							fixwall = ( i==nMeshX ? nMeshX : i+1 );
							//fixwall = i+1;
							if ( this.Vel[x][fixwall][j][k] < 0 ) {
								coulant = -this.Vel[x][fixwall][j][k] * this.delta_t / this.delta_x;
								this.tmp[0][i][j][k] += ( xp - pphi ) * coulant;
							}
						}
						if ( maxcoulant < coulant ) maxcoulant = coulant;

						//一次精度　一次方向移流 Y
						coulant = this.Vel[y][i][j][k] * this.delta_t / this.delta_y;
						if ( this.fgCalcTempAround == 1 ) {
							this.tmp[0][i][j][k] += 0.5 * (coulant * (ym - yp) + Math.abs(coulant) * (yp +ym - 2.0 * pphi));
						} else {
							fixwall = ( j==2 ? 2 : j-1 );
							//fixwall =j-1;
							if ( this.Vel[y][i][fixwall][k] > 0 ) {
								coulant = this.Vel[y][i][fixwall][k] * this.delta_t / this.delta_y;
								this.tmp[0][i][j][k] += ( ym - pphi ) * coulant;
							}
							fixwall = ( j==nMeshY ? nMeshY : j+1 );
							//fixwall = j+1 ;
							if ( this.Vel[y][i][fixwall][k] < 0 ) {
								coulant = -this.Vel[y][i][fixwall][k] * this.delta_t / this.delta_y;
								this.tmp[0][i][j][k] += ( yp - pphi ) * coulant;
							}
						}
						if ( maxcoulant < coulant ) maxcoulant = coulant;

						//一次精度　一次方向移流 Z
						var vzij = this.Vel[z][i][j];
						coulant = vzij[k] * this.delta_t / this.delta_z;
						if ( this.fgCalcTempAround == 1 ) {
							this.tmp[0][i][j][k] += 0.5 * (coulant * (zm - zp) + Math.abs(coulant) * (zp +zm - 2.0 * pphi));
						} else {
							fixwall = ( k==2 ? 2 : k-1 );
							//fixwall = k-1;
							if ( vzij[fixwall] > 0 ) {
								coulant = vzij[fixwall] * this.delta_t / this.delta_z;
								this.tmp[0][i][j][k] += ( zm - pphi ) * coulant;
							}
							fixwall = ( k==nMeshZ ? nMeshZ : k+1 );
							//fixwall =  k+1;
							if ( vzij[fixwall] < 0 ) {
								coulant = -vzij[k+1] * this.delta_t / this.delta_z;
								this.tmp[0][i][j][k] += ( zp - pphi ) * coulant;
							}
						}
						if ( maxcoulant < coulant ) maxcoulant = coulant;
		
						//外壁からの流入
						// 室内側熱抵抗0.11m2K/W 　空気比熱　1.006J/gK　
						// 170629 heatparm_w を使う場合には delta_*で割らない
						if ( this.meshtype[i-1][j][k] != INSIDE && this.meshtype[i-1][j][k] != CL ) {
							//左側が空気でない
							if ( this.meshtype[i-1][j][k] == OUTSIDE ) {
								//外壁（左）
								this.tmp[0][i][j][k] += ( xm - pphi ) * this.wallK * heatparm_w / this.delta_x;
								this.sumheatleft += ( xm - pphi ) * this.wallK * this.delta_x*this.delta_z ;
							} else if ( this.meshtype[i-1][j][k] == WINDOW ) {
								//窓（左）
								this.tmp[0][i][j][k] += ( xm - pphi )  * this.WindowK * heatparm_w / this.delta_x;
								this.sumheatleft += ( xm - pphi )  * this.WindowK * this.delta_x*this.delta_z ;
							} else {
								this.tmp[0][i][j][k] += ( xm - pphi ) / this.delta_x * heatparm / this.delta_x;
								this.sumheatleft += ( xm - pphi ) / this.delta_y * this.Riw * this.delta_x*this.delta_z ;
							}
						}
						if ( this.meshtype[i+1][j][k] != INSIDE ) {
							this.tmp[0][i][j][k] += ( xp - pphi ) / this.delta_x * heatparm;
						}

						if ( this.meshtype[i][j-1][k] != INSIDE && this.meshtype[i][j-1][k] != CL ) {
							//床だったら
							this.tmp[0][i][j][k] += ( ym - pphi )  / this.delta_y * heatparm_f;
						}
						if ( this.meshtype[i][j+1][k] != INSIDE ) {
							//天井だったら
							this.tmp[0][i][j][k] += ( yp - pphi ) / this.delta_y * heatparm_c;
						}

						if ( this.meshtype[i][j][k-1] != INSIDE && this.meshtype[i][j][k-1] != CL ) {
							this.tmp[0][i][j][k] += ( zm - pphi ) / this.delta_z * heatparm;
						}
						if ( this.meshtype[i][j][k+1] != INSIDE && this.meshtype[i][j][k+1] != this.CL) {
							//奥が空気でない
							if ( this.meshtype[i][j][k+1] == OUTSIDE ) {
								//外壁
								this.tmp[0][i][j][k] += ( zp - pphi ) * this.wallK  * heatparm_w;
								this.sumheatfront += ( zp - pphi ) * this.wallK* this.delta_y*this.delta_x ;
							} else if ( this.meshtype[i][j][k+1] == WINDOW ) {
								//窓（正面）
								this.tmp[0][i][j][k] += ( zp - pphi )  * this.WindowK * heatparm_w;
								this.sumheatfront += ( zp - pphi ) * this.WindowK* this.delta_y*this.delta_x ;
							} else {
								//内壁
								this.tmp[0][i][j][k] += ( zp - pphi )  / this.delta_z * heatparm;
								this.sumheatfront += ( zp - pphi ) / this.delta_z * this.Riw* this.delta_y*this.delta_x ;
							}
						}

					} else if ( this.meshtype[i][j][k] == OBSTACLE ) {
						//物体の空気からの熱移動を評価(-1 +1が有効)
						xp = this.Phi[i+1][j][k];
						xm = this.Phi[i-1][j][k];
						yp = this.Phi[i][j+1][k];
						ym = this.Phi[i][j-1][k];
						zp = this.Phi[i][j][k+1];
						zm = this.Phi[i][j][k-1];
						if ( this.ObsPhi != this.InsidePhi ) {
							//温度設定がされている場合には処理しない
						} else if ( this.meshtype[i-1][j][k] == INSIDE ||  this.meshtype[i+1][j][k] == INSIDE ) {
							this.tmp[0][i][j][k] = ( xp+ xm ) / 2;
						} else if ( this.meshtype[i][j-1][k] == INSIDE ||  this.meshtype[i][j+1][k] == INSIDE ) {
							this.tmp[0][i][j][k] = ( yp + ym ) / 2;
						} else if ( this.meshtype[i][j-1][k] == INSIDE ||  this.meshtype[i][j+1][k] == INSIDE ) {
							this.tmp[0][i][j][k] = ( zp + zm ) / 2;
						} else {
							this.tmp[0][i][j][k] = ( xp + xm + yp + ym +zp + zm ) / 6;
						}

					} else if ( this.meshtype[i][j][k] == SIDE ) {
						//壁の空気からの熱移動を評価
						// 温度は使わないので、空気温度を設定する
						if ( this.meshtype[i][j][Math.max(k-1,0)] == INSIDE) {
							//壁面温度を外気温として扱う（奥）
							//tmp[0][i][j][k] = Phi[i][j][k] + (Phi[i][j][k-1]-Phi[i][j][k]) / Riw * delta_t / ( sh_wall * sh_thick );
						} else if ( this.meshtype[i][j][Math.min(k+1,nMeshZ+1)] == INSIDE) {
							this.tmp[0][i][j][k] += (this.Phi[i][j][k+1]-pphi) / this.Riw * this.delta_t / ( this.sh_wall * this.sh_thick );
						} else if ( this.meshtype[Math.max(i-1,0)][j][k] == INSIDE) {
							this.tmp[0][i][j][k] += (this.Phi[i-1][j][k]-pphi) / this.Riw * this.delta_t / ( this.sh_wall * this.sh_thick );
						} else if ( this.meshtype[Math.min(i+1,nMeshX+1)][j][k] == INSIDE) {
							//壁面温度を外気温として扱う（左）
							//tmp[0][i][j][k] += (Phi[i+1][j][k]-Phi[i][j][k]) / Riw * delta_t / ( sh_wall * sh_thick );

						}
					} else if ( this.meshtype[i][j][k] == TOP ) {
						this.tmp[0][i][j][k] += (this.Phi[i][j-1][k]-pphi) / this.Ric * this.delta_t / ( this.sh_wall * this.sh_thick );
					} else if ( this.meshtype[i][j][k] == BOTTOM ) {
						this.tmp[0][i][j][k] += (this.Phi[i][j+1][k]-pphi) / this.Rif * this.delta_t / ( this.sh_wall * this.sh_thick );
					}
				}
				//窓・外壁については温度は評価しない（外部から固定設定する）
			}
		}
		this.heatleftcount++;

		for( i=0 ; i<=nMeshX+1 ; i++ ) {
			for( j=0 ; j<=nMeshY+1 ; j++ ) {
				for( k=0 ; k<=nMeshZ+1 ; k++ ) {
					if ( this.tmp[0][i][j][k] ) {
						this.Phi[i][j][k] = this.tmp[0][i][j][k];
					}
				}
			}
		}

		return maxcoulant;
	}

	//6 ポアソン方程式を解く
	solve_poisson = function() {

		//圧力計算(繰り返し)
		var repeat_count = 0;
		while ( this.poisson_pressure() > this.tolerance ) {
			if( repeat_count++ > this.iteration )  break;
		}
		
		//速度ベクトルの更新
		this.poisson_update_velocity();

		//温度計算
		return this.poisson_calc_temperature();

		//圧力/温度の最大値・最小値--------------------------
		// var prscount = 0;
		// var prssum = 0;
		// var maxPrs0 = -1000.0;
		// var minPrs0 = 1000.0;
		// var maxPhi0 = -1000.0;
		// var minPhi0 = 1000.0;

		// for( i=1 ; i<=nMeshX ; i++ ) {
		// 	for( j=1 ; j<=nMeshY ; j++ ) {
		// 		for( k=1 ; k<=nMeshZ ; k++ ) {
		// 			prssum += this.Prs[i][j][k];
		// 			prscount++;
		// 			if ( this.Prs[i][j][k] > maxPrs0 ) 
		// 				maxPrs0 = this.Prs[i][j][k];
		// 			if ( this.Prs[i][j][k] < minPrs0 )
		// 				minPrs0 = this.Prs[i][j][k];
		// 			if ( Phi[i][j][k] > maxPhi0 )
		// 				maxPhi0 = this.Phi[i][j][k];
		// 			if ( Phi[i][j][k] < minPhi0 )
		// 				minPhi0 = this.Phi[i][j][k];
		// 		}
		// 	}
		// }

	};

	//7 時間ステップ補正
	time_step_correction = function(maxcoulant) {
		if ( this.fgFixCoulant ) {
			if ( maxcoulant > this.coulant_min ) {
				this.delta_t *= 0.9;
				if( this.delta_t < this.delta_t_min ) {
					this.delta_t = this.delta_t_min;
				}
			}
			if ( maxcoulant < this.coulant_max ) {
				this.delta_t *= 1.1;
				if( this.delta_t > this.delta_t_max ) {
					this.delta_t = this.delta_t_max;
				}
			}
		}
	}

	//セル判定
	isCellAir = function(i,j,k){
		return ( this.meshtype[i][j][k] == INSIDE || this.meshtype[i][j][k] == CL );
	}

}

