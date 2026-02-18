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
//	meshset(data) メッシュデータから計算フィールドの構築
//	meshcalc()	  計算実行（指定時間）
//	

import { Config } from "@/assets/config.js"

export class CFD {
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
    this.sumheatleft = 0;			// left window heat lossF
    this.sumheatfront = 0;			// front window heat loss
    this.heatleftcount = 0;

    //物理定数
    this.Re = 1000.0;				//レイノルズ数

    this.Riw = 0.11;				//室内側熱伝導抵抗　壁	㎡・K／W
    this.Rif = 0.15;				//室内側熱伝導抵抗　床
    this.Ric = 0.09;				//室内側熱伝導抵抗　天井

    this.sh_air = 1.006;			//比熱　空気J/gK
    this.sh_obs = 783000;				//熱容量　障害物 J/m3K
    this.sh_wall = 783000;			//熱容量　壁 J/m3K
    this.sh_ceil = 783000;			//熱容量　天井 J/m3K
    this.sh_floor = 783000;			//熱容量　床 J/m3K
    this.sh_thick = 0.02;			//熱容量を考慮する厚さ m （2cm程度が適当）
    this.sh_thick_window = 0.005;		//窓の熱容量を考慮する厚さ m （0.5cm程度が適当） 
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
    this.Dd = 0.001	;				//拡散係数　m2/s
    this.nu = 0.000155;				//空気の動粘性係数 m2/s

    //計算条件
    this.ObsPhi =20;				//障害物の温度
    this.InletPhi = 10;				//窓の外の温度
    this.FloorPhi = 18;				//床の温度

    //圧力（空気の周囲の温度との差）YUP方向が上とする
    this.g = 9.8;					// m/s2
    this.tz = 273.15;
    this.prsair = 0;				//101325;	//標準気圧 Pa N/m2

    this.delta_t_max = 5;
    this.delta_t_min = 0.001;

    //サーキュレータ
    this.CirculatorWind = 0;
  }



  //計算呼び出し========================

  //パラメータ設定
  //	setval 		メッシュ計算条件設定
  //	meshtype	3Dメッシュ配列
  //
  //	返り値　なし
  init = function(setval, meshtype) {
    //呼び出し時のパラメータの設定
    this.setvallink = setval;         //リンク

    this.setval = {};
    for( var k in setval){
      this.setval[k] = setval[k];
    };

    this.delta_t = setval.delta_t;			  //1ステップ時間(s)
    this.InsidePhi = setval.InsidePhi;		//室内初期温度
    this.ACwind = setval.ACwind;			    //エアコン風速	
    this.CirculatorWind = setval.CirculatorWind;	//サーキュレータ風速
    this.WindowK = setval.windowKset;		  //窓の熱貫流率
    this.ObsPhi = setval.ObsPhi;			    //室内障害物温度
    this.InletPhi = setval.InletPhi;		  //外気温度
    this.FloorPhi = setval.FloorPhi;		  //床温度

    this.nMeshX = setval.nMeshX;				//メッシュ数X
    this.nMeshY = setval.nMeshY;				//メッシュ数Y
    this.nMeshZ = setval.nMeshZ;				//メッシュ数Z

    //config
    var conf = new Config();
    this.conf = conf.val;

    //copy meshtype (not reactive)
    this.meshtype = [];
    for( var i=0 ; i<=this.nMeshX+1 ; i++ ){
      this.meshtype[i] = [];
      for( var j=0 ; j<=this.nMeshY+1 ; j++ ){
        this.meshtype[i][j] = [];
        for( var k=0 ; k<=this.nMeshZ+1 ; k++ ){
          this.meshtype[i][j][k] = meshtype[i][j][k];
        }
      }
    }

    this.init_mesh();					//配列の作成

    this.batch_end = true;
  }

  paramset = function(data){
    //ex.途中時点でのパラメータ設定(時間軸に応じた外気温の低下）
  }

  //mesh initialize 
  //フィールドの設定
  // var StartTime //開始時間
  // var EndTime //終了時間
  // StartTime = performance.now() //詳細なミリ秒数
  init_mesh = function(){
    this.Phi = this.create_3d();
    this.Prs = this.create_3d();
    this.Vel = Array( 3 );
    this.tmp = Array( 3 );
    this.Vel[0] = this.create_3d();
    this.Vel[1] = this.create_3d();
    this.Vel[2] = this.create_3d();
    this.tmp[0] = this.create_3d();
    this.tmp[1] = this.create_3d();
    this.tmp[2] = this.create_3d();
    this.D = this.create_3d();
    this.newF = this.create_3d();
    // EndTime = performance.now() //詳細なミリ秒数

    //共通使用変数(実長さ)
    this.delta_x = this.setval.realX / this.nMeshX;
    this.delta_y = this.setval.realY / this.nMeshY;
    this.delta_z = this.setval.realZ / this.nMeshZ;
    this.delta_x2 = this.delta_x * this.delta_x;
    this.delta_y2 = this.delta_y * this.delta_y;
    this.delta_z2 = this.delta_z * this.delta_z;

    //initial value
    for( var i=0 ; i<=this.nMeshX+1 ; i++ ) {
      for( var j=0 ; j<=this.nMeshY+1 ; j++ ) {
        for( var k=0 ; k<=this.nMeshZ+1 ; k++ ) {
          //pressure
          this.Prs[i][j][k] = this.prsair;
          //temperature
          this.Phi[i][j][k] = this.InsidePhi;
          if ( this.meshtype[i][j][k] ==  this.conf.BOTTOM )
            this.Phi[i][j][k] = this.FloorPhi;
          if ( this.meshtype[i][j][k] ==  this.conf.OBSTACLE )
            this.Phi[i][j][k] = this.ObsPhi;
          if ( this.meshtype[i][j][k] ==  this.conf.WINDOW || this.meshtype[i][j][k] ==  this.conf.OUTSIDE )
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

  //create 3D array
  create_3d = function() {
    return [...Array(this.nMeshX+2)].map(k => [...Array(this.nMeshY+2)].map(k => [...Array(this.nMeshZ+2)].map(k=>0)));
  }


  //計算実行（外部から呼び出し）================================
  // recalc : 再計算フラグ(前のステップが終了している場合)
  calc = function(recalc){
    if( recalc ){
      this.batch_end = false;
      this.calc_loop();		//単時間計算
    }

    //全体の計算時間上限
    var endcalc = false;
    if( 
      this.totaltime/60 > this.setval.maxtime_minute ||
      this.count > this.setval.maxtime 
    ) {
      endcalc = true;
    }
    return endcalc;
  }

  //単位時間分の計算---------------------------------------
  // 終了時間は batch_secで渡される
  calc_loop = function() {
    var sec = this.setvallink.batch_sec;
    var error = 0;

    while(1){
      this.count++;
      this.totaltime += this.delta_t;
      
      if( this.cfd_calculate() > 0 ) {
        //stop in case of calculation error
        error = 1;
        break;
      }
      if ( Math.floor(this.totaltime/sec) > Math.floor((this.totaltime - this.delta_t)/sec ) ) {
        //stop by time over
        break;
      }
    }
    this.batch_end = true;

    //return result
    var heatin = {};
    heatin.heatleftin = ( this.heatleftcount ? this.sumheatleft / this.heatleftcount : 0 );
    heatin.heatfrontin = ( this.heatleftcount ? this.sumheatfront / this.heatleftcount : 0 );

    //シミュレーション結果（配列を一式返す）
    this.error = error;
    this.acheat = ( this.acheatcount ? this.acheatsum / this.acheatcount : 0 );
    this.heatin = heatin;

    //内部計算用バッチクリア
    this.sumheatleft = 0;
    this.sumheatfront = 0;
    this.acheatsum = 0;
    this.acheatcount = 0;
    this.heatleftcount = 0;
  }

  //計算ルーチン　フラクショナルステップ法
  cfd_calculate = function() {
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
    this.difference_method(this.conf.x);
    this.difference_method(this.conf.y);
    this.difference_method(this.conf.z);

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
    var x = this.conf.x;
    var y = this.conf.y;
    var z = this.conf.z;

    for( i=0 ; i<=this.nMeshX+1 ; i++ ) {
      for( j=0 ; j<=this.nMeshY+1 ; j++ ) {
        for( k=0 ; k<=this.nMeshZ+1 ; k++ ) {
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
    for( i=1 ; i<=this.nMeshX ; i++ ) {
      for( j=1 ; j<=this.nMeshY ; j++ ) {
        for( k=1 ; k<=this.nMeshZ ; k++ ) {
          if ( this.isCellAir( i,j,k ) ) {
            phicount += 1;
            phisum += this.Phi[i][j][k];
          }
        }
      }
    }

    var phiaverage = phisum / phicount;
    var around = phiaverage+ this.tz;
    var tmax = 0;

    for( i=1 ; i<=this.nMeshX ; i++ ) {
      for( j=1 ; j<=this.nMeshY ; j++ ) {
        for( k=1 ; k<=this.nMeshZ ; k++ ) {
          if ( this.isCellAir( i,j,k ) ) {

            if ( this.fgAround == 1 ) {
              //周囲の温度との差を使う場合（使わないときはフィールド平均）
              var neararound = 0;
              var neararoundc = 0;
              if ( this.isCellAir( i-1,j,k ) ) {
                neararound += this.Phi[i-1][j][k];
                neararoundc++;
              }
              if ( this.isCellAir( i+1,j,k ) ) {
                neararound += this.Phi[i+1][j][k];
                neararoundc++;
              }
              if ( this.isCellAir( i,j-1,k ) ) {
                neararound += this.Phi[i][j-1][k];
                neararoundc++;
              }
              if ( this.isCellAir( i,j+1,k ) ) {
                neararound += this.Phi[i][j+1][k];
                neararoundc++;
              }
              if ( this.isCellAir( i,j,k-1 ) ) {
                neararound += this.Phi[i][j][k-1];
                neararoundc++;
              }
              if ( this.isCellAir( i,j,k+1 ) ) {
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
            this.Vel[this.conf.y][i][j][k] += dv * (Math.random() * 0.1*2 + 0.9) ;
          }
        }
      }
    }
  }

  //3a エアコンの設定
  equip_airconditioner = function() {
    var i,j,k;
    var dir = this.dir;
    var acw = 2800;
    var hadj = 1; //出力熱調整

    //下方向に温風 壁と反対方向で同じ風速で吸収
    //エアコンの方向の設定
    var acx = 0;
    var acz = 0;		

    if ( this.ACwind > 0 ) {
      this.acv = this.ACwind;
    } else {
      this.acv = 3;	//強風
    }
    //暖房能力2.8kWと想定 act温度上昇 
    if ( this.addair ) {
      this.act = acw / ( this.sh_air * this.rou * 1000 * this.acv * this.conf.ac_width * this.conf.ac_height );
      // console.log(this.act);
      //吹き出し口
    } else {
      this.act = 0;
    }
    var adj = 1;
    
    for( i=1 ; i<=this.nMeshX ; i++ ) {
      for ( j=1 ; j<this.nMeshY ; j++ ){
        for( k=1 ; k<=this.nMeshZ ; k++ ) {
          //エアコン動作
          if ( this.meshtype[i][j][k] == this.conf.AC ) {

            if( this.setval.ACheat ) {
              hadj = Math.min(Math.max(( 22 - this.Phi[i][j+1][k] ) / 3,0),1);
            } else {
              hadj = Math.min(Math.max(( this.Phi[i][j+1][k] - 26 ) / 3,0),1);
            }

            if( this.setval.ACdir == 1 ){ 
              //下方向
              if( hadj > 0) {
                //冷暖房温度加算（出口＝下の温度を変化させる）
                if ( this.ACwind > 0 ) {
                  this.acheatsum += acw * hadj;
                  this.Phi[i][j][k] = ( this.Phi[i][j+1][k] * 4 + this.Phi[i+1][j+1][k] + this.Phi[i-1][j+1][k] + this.Phi[i][j+1][k+1] + this.Phi[i][j+1][k-1] ) / 8;
                  this.Phi[i][j-1][k] = this.Phi[i][j+1][k] + (this.setval.ACheat ? 1 : -1 ) * this.act * hadj;
                  adj = 1;
                } else {
                  //自動調整
                  if ( this.Phi[i][j+1][k] < 22 && this.totaltime > 300 ) {
                    //最初の5分はフル動作
                    this.acheatsum += acw/2 * hadj;
                    adj = 0.5;
                  } else {
                    this.acheatsum += acw * hadj;
                    adj = 1;
                  }
                  this.Phi[i][j][k] = ( this.Phi[i][j+1][k] * 4 + this.Phi[i+1][j+1][k] + this.Phi[i-1][j+1][k] + this.Phi[i][j+1][k+1] + this.Phi[i][j+1][k-1] ) / 8;
                  this.Phi[i][j-1][k] = this.Phi[i][j+1][k] + (this.setval.ACheat ? 1 : -1 ) * this.act * hadj;
                }
              } else {
                this.Phi[i][j][k] = ( this.Phi[i][j+1][k] * 4 + this.Phi[i+1][j+1][k] + this.Phi[i-1][j+1][k] + this.Phi[i][j+1][k+1] + this.Phi[i][j+1][k-1] ) / 8;
                this.Phi[i][j-1][k] = this.Phi[i][j+1][k];
                if ( this.ACwind > 0 ) {
                  adj = 1;
                } else {
                  adj = 0.5;
                }
              }
  
              //横方向(上下のセルは角度をつけて吸い込む)
              if ( i == 2 ) {
                acx = 1;
                this.Vel[this.conf.x][i][j-1][k] = this.acv * dir * adj;
                this.Vel[this.conf.x][i][j+1][k] = -this.acv * dir * adj;
              }
              if ( i == this.nMeshX-1 ) {
                acx = -1;
                this.Vel[this.conf.x][i][j-1][k] = -this.acv * dir * adj;
                this.Vel[this.conf.x][i][j+1][k] = this.acv * dir * adj;
              }
              if ( k == 2 ) {
                acz = 1;
                this.Vel[this.conf.z][i][j-1][k] = this.acv * dir * adj;
                this.Vel[this.conf.z][i][j+1][k] = -this.acv * dir * adj;
              }
              if ( k == this.nMeshZ-1 ) {
                acz = -1;
                this.Vel[this.conf.z][i][j-1][k] = -this.acv * dir * adj;
                this.Vel[this.conf.z][i][j+1][k] = this.acv * dir * adj;
              }
              //下方向（該当セルは速度、上下セルは角度考慮）
              this.Vel[this.conf.y][i][j+1][k] = -this.acv * Math.sqrt( 1 - dir*dir) * adj;
              this.Vel[this.conf.y][i][j][k] = -this.acv;
              this.Vel[this.conf.y][i][j-1][k] = -this.acv* Math.sqrt( 1 - dir*dir) * adj;

            } else {
              //横向き
              var dt = 0;
              if( hadj > 0) {
                if ( this.ACwind > 0 ) {
                  this.acheatsum += acw * hadj;
                  dt = (this.setval.ACheat ? 1 : -1 ) * this.act * hadj;
                  adj = 1;
                } else {
                  //自動調整
                  if ( this.Phi[i][j+1][k] < 22 && this.totaltime > 300 ) {
                    //最初の5分はフル動作
                    this.acheatsum += acw/2 * hadj;
                    adj = 0.5;
                  } else {
                    this.acheatsum += acw * hadj;
                    adj = 1;
                  }
                  dt = (this.setval.ACheat ? 1 : -1 ) * this.act * hadj;
                }
              } else {
                dt = 0;
                if ( this.ACwind > 0 ) {
                  adj = 1;
                } else {
                  adj = 0.5;
                }
              }

              //出口＝横温度を上下させる 横方向、本体横風、上下風
              if ( i == 2 ) {
                this.Vel[this.conf.y][i][j+1][k] = -this.acv * adj;
                this.Vel[this.conf.x][i+1][j][k] = this.acv * adj;
                this.Vel[this.conf.x][i][j][k] = this.acv * adj;
                this.Phi[i+1][j][k] = this.Phi[i][j+1][k] + dt;
              }
              if ( i == this.nMeshX-1 ) {
                this.Vel[this.conf.y][i][j+1][k] = this.acv * adj;
                this.Vel[this.conf.x][i-1][j][k] = -this.acv * adj;
                this.Vel[this.conf.x][i][j][k] = -this.acv * adj;
                this.Phi[i-1][j][k] = this.Phi[i][j+1][k] + dt;
              }
              if ( k == 2 ) {
                this.Vel[this.conf.y][i][j+1][k] = -this.acv * adj;
                this.Vel[this.conf.z][i][j][k+1] = this.acv * adj;
                this.Vel[this.conf.z][i][j][k] = this.acv * adj;
                this.Phi[i][j][k+1] = this.Phi[i][j+1][k] + dt;
              }
              if ( k == this.nMeshZ-1 ) {
                this.Vel[this.conf.y][i][j+1][k] = -this.acv * adj;
                this.Vel[this.conf.z][i][j][k-1] = -this.acv * adj;
                this.Vel[this.conf.z][i][j][k] = -this.acv * adj;
                this.Phi[i][j][k-1] = this.Phi[i][j+1][k] + dt;
              }

            }
            this.acheatcount++;
          }
        }
      }
    }
  }

  //3b サーキュレータの設定
  equip_circulator = function() {
    var i=1;
    var j=1;
    var k=Math.round(this.nMeshZ/2);

    if ( this.meshtype[i][j][k] == this.conf.CL ) {
      this.Vel[this.conf.y][i][j][k] = this.CirculatorWind;
    }
  }

  //3c 固定面垂直方向の風速
  wind_block = function() {
    var i,j,k;
    var vx, vy, vz;
    var va ,vd;
    var x = this.conf.x;
    var y = this.conf.y;
    var z = this.conf.z;

    //内部壁面の速度境界条件（壁等への垂直方向の風はない）
    //これをなくすと、壁面での圧力がなくなり、方向転換がされない
    // randam項はゆれ。不安定平衡を避けるため
    let vrandom = 0.001;
    for( i=1 ; i<=this.nMeshX ; i++ ) {
      for( j=1 ; j<=this.nMeshY ; j++ ) {
        for( k=1 ; k<=this.nMeshZ ; k++ ) {
          if ( this.isCellAir( i,j,k )) {
            if( i==1 || i==this.nMeshX || this.meshtype[i-1][j][k] == this.conf.OBSTACLE || this.meshtype[i+1][j][k] == this.conf.OBSTACLE ) {
              vx = this.Vel[x][i][j][k];
              vy = this.Vel[y][i][j][k];
              vz = this.Vel[z][i][j][k];
              va = Math.sqrt( vx*vx + vy*vy + vz*vz );
              vd = Math.sqrt( vy*vy + vz*vz );
              this.Vel[x][i][j][k] = 0.0;
              if(  vd < vrandom ) {
                this.Vel[y][i][j][k] = Math.random() * vrandom*2 - vrandom;
                this.Vel[z][i][j][k] = Math.random() * vrandom*2 - vrandom;
                vd = Math.sqrt( this.Vel[y][i][j][k]*this.Vel[y][i][j][k] + this.Vel[z][i][j][k]*this.Vel[z][i][j][k] );
              }
              this.Vel[y][i][j][k] *= va / vd;
              this.Vel[z][i][j][k] *= va / vd;
            }
            if( j==1 || j==this.nMeshY || this.meshtype[i][j-1][k] == this.conf.TOP || this.meshtype[i][j+1][k] == this.conf.TOP ) {
              vx = this.Vel[x][i][j][k];
              vy = this.Vel[y][i][j][k];
              vz = this.Vel[z][i][j][k];
              va = Math.sqrt( vx*vx + vy*vy + vz*vz );
              vd = Math.sqrt( vx*vx + vz*vz );
              this.Vel[y][i][j][k] = 0.0;
              if( vd < vrandom ) {
                this.Vel[x][i][j][k] = Math.random() * vrandom*2 - vrandom;
                this.Vel[z][i][j][k] = Math.random() * vrandom*2 - vrandom;
                vd = Math.sqrt( this.Vel[x][i][j][k]*this.Vel[x][i][j][k] + this.Vel[z][i][j][k]*this.Vel[z][i][j][k] );
              }
              this.Vel[x][i][j][k] *= va / vd;
              this.Vel[z][i][j][k] *= va / vd;
            }
            if( k==1 || k== this.nMeshZ) {
              vx = this.Vel[x][i][j][k];
              vy = this.Vel[y][i][j][k];
              vz = this.Vel[z][i][j][k];
              va = Math.sqrt( vx*vx + vy*vy + vz*vz );
              vd = Math.sqrt( vx*vx + vy*vy );
              this.Vel[z][i][j][k] = 0.0;
              if( vd < vrandom ) {
                this.Vel[x][i][j][k] = Math.random() * vrandom*2 - vrandom;
                this.Vel[y][i][j][k] = Math.random() * vrandom*2 - vrandom;
                vd = Math.sqrt( this.Vel[x][i][j][k]*this.Vel[x][i][j][k] + this.Vel[y][i][j][k]*this.Vel[y][i][j][k] );
              }
              this.Vel[x][i][j][k] *= va / vd;
              this.Vel[y][i][j][k] *= va / vd;
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

    for( i=1 ; i<=this.nMeshX ; i++ ) {
      for( j=1 ; j<=this.nMeshY ; j++ ) {
        for( k=1 ; k<=this.nMeshZ ; k++ ) {
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
            coulant = this.Vel[this.conf.x][i][j][k] * this.delta_t / this.delta_x;
            this.newF[i][j][k] = fijk + 0.5 * (coulant * (xm - xp) + Math.abs(coulant) * (xp +xm - 2.0 * fijk));
            coulant = this.Vel[this.conf.y][i][j][k] * this.delta_t / this.delta_y;
            this.newF[i][j][k] += 0.5 * (coulant * (ym - yp) + Math.abs(coulant) * (yp +ym - 2.0 * fijk));
            coulant = this.Vel[this.conf.z][i][j][k] * this.delta_t / this.delta_z;
            this.newF[i][j][k] += 0.5 * (coulant * (zm - zp) + Math.abs(coulant) * (zp +zm - 2.0 * fijk));

            //粘性項に中央差分
            this.newF[i][j][k] += this.delta_t * ( (xm + xp - 2.0 * fijk) / this.delta_x2   +  (ym + yp - 2.0 * fijk) / this.delta_y2 +  (zm + zp - 2.0 * fijk) / this.delta_z2 ) / this.Re;
          }
        }
      }
    }

    //更新
    for( i=1 ; i<=this.nMeshX ; i++ ) {
      for( j=1 ; j<=this.nMeshY ; j++ ) {
        for( k=1 ; k<=this.nMeshZ ; k++ ) {
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
    var x = this.conf.x;
    var y = this.conf.y;
    var z = this.conf.z;

    //Poisson方程式の右辺（対流項）
    // var maxD = 0;
    for( i=1 ; i<=this.nMeshX ; i++ ) {
      for( j=1 ; j<=this.nMeshY ; j++ ) {
        for( k=1 ; k<=this.nMeshZ ; k++ ) {
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

    //平均値を0とする
    var pav = 0;
    var pcount = 0;

    for( i=1 ; i<=this.nMeshX ; i++ ) {
      for( j=1 ; j<=this.nMeshY ; j++ ) {
        for( k=1 ; k<=this.nMeshZ ; k++ ) {
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
            pav += this.tmp[0][i][j][k];
            pcount++;
            if ( perror > maxError ) {
              maxError = perror;
            }
          }
        }
      }
    }

    //圧力の設定
    for( i=0 ; i<=this.nMeshX+1 ; i++ ) {
      for( j=0 ; j<=this.nMeshY+1 ; j++ ) {
        for( k=0 ; k<=this.nMeshZ+1 ; k++ ) {
          if ( this.isCellAir(i,j,k) ) {
            this.Prs[i][j][k] = this.tmp[0][i][j][k] - pav/pcount;
          }
        }
      }
    }
    for( i=0 ; i<=this.nMeshX+1 ; i++ ) {
      for( j=0 ; j<=this.nMeshY+1 ; j++ ) {
        for( k=0 ; k<=this.nMeshZ+1 ; k++ ) {
          //空気でない場合には、最も近い空気の圧力を設定
          if ( i==0 ) {
            this.Prs[i][j][k] = this.tmp[0][i+1][j][k];
          } else if ( i==this.nMeshX+1 ) {
            this.Prs[i][j][k] = this.tmp[0][i-1][j][k];
          } else if ( j==0 ) {
            this.Prs[i][j][k] = this.tmp[0][i][j+1][k];
          } else if ( j==this.nMeshY+1 ) {
            this.Prs[i][j][k] = this.tmp[0][i][j-1][k];
          } else if ( k==0 ) {
            this.Prs[i][j][k] = this.tmp[0][i][j][k+1];
          } else if ( k==this.nMeshZ+1 ) {
            this.Prs[i][j][k] = this.tmp[0][i][j][k-1];
          } else {
            //障害物など 170629　削除
            /*
            if ( meshtype[i-1][j][k] == this.conf.INSIDE ) {
              Prs[i][j][k] = tmp[0][i-1][j][k];
            } else if ( meshtype[i+1][j][k] == this.conf.INSIDE ) {
              Prs[i][j][k] = tmp[0][i+1][j][k];
            } else if ( meshtype[i][j-1][k] == this.conf.INSIDE ) {
              Prs[i][j][k] = tmp[0][i][j-1][k];
            } else if ( meshtype[i][j+1][k] == this.conf.INSIDE ) {
              Prs[i][j][k] = tmp[0][i][j+1][k];
            } else if ( meshtype[i][j][k-1] == this.conf.INSIDE ) {
              Prs[i][j][k] = tmp[0][i][j][k-1];
            } else if ( meshtype[i][j][k+1] == this.conf.INSIDE ) {
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
    var x = this.conf.x;
    var y = this.conf.y;
    var z = this.conf.z;
    var pp,pn;

    for( i=1 ; i<=this.nMeshX ; i++ ) {
      for( j=1 ; j<=this.nMeshY ; j++ ) {
        for( k=1 ; k<=this.nMeshZ ; k++ ) {
          if ( this.isCellAir(i,j,k) ) {
            //170629 比重rou を掛け合わせる
            if( this.isCellAir( i-1,j,k ) ) {
              pp = this.Prs[i-1][j][k];
            } else {
              pp = this.Prs[i][j][k];
            }
            if( this.isCellAir( i+1,j,k ) ) {
              pn = this.Prs[i+1][j][k];
            } else {
              pn = this.Prs[i][j][k];
            }
            this.tmp[x][i][j][k] = this.Vel[x][i][j][k] - 0.5 * this.delta_t * (pn - pp) / ( this.rou * this.delta_x);

            if( this.isCellAir( i,j-1,k ) ) {
              pp = this.Prs[i][j-1][k];
            } else {
              pp = this.Prs[i][j][k];
            }
            if( this.isCellAir( i,j+1,k ) ) {
              pn = this.Prs[i][j+1][k];
            } else {
              pn = this.Prs[i][j][k];
            }
            this.tmp[y][i][j][k] = this.Vel[y][i][j][k] - 0.5 * this.delta_t * (pn - pp) / ( this.rou * this.delta_y);	

            if( this.isCellAir( i,j,k-1 ) ) {
              pp = this.Prs[i][j][k-1];
            } else {
              pp = this.Prs[i][j][k];
            }
            if( this.isCellAir( i,j,k+1 ) ) {
              pn = this.Prs[i][j][k+1];
            } else {
              pn = this.Prs[i][j][k];
            }
            this.tmp[z][i][j][k] = this.Vel[z][i][j][k] - 0.5 * this.delta_t * (pn - pp) / ( this.rou * this.delta_z);
          }
        }
      }
    }
    for( i=1 ; i<=this.nMeshX ; i++ ) {
      for( j=1 ; j<=this.nMeshY ; j++ ) {
        for( k=1 ; k<=this.nMeshZ ; k++ ) {
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
        var x=this.conf.x;
        var y=this.conf.y;
        var z=this.conf.z;

    var coulant;
    var maxcoulant = 0;
    var fixwall;
    var dtemp = 0;

    var heatparm   = this.delta_t / ( this.Riw * this.sh_air * this.rou * 1000 );
    var heatparm_f = this.delta_t / ( this.Rif * this.sh_air * this.rou * 1000 );
    var heatparm_c = this.delta_t / ( this.Ric * this.sh_air * this.rou * 1000 );
    var heatparm_w = this.delta_t / ( this.sh_air * this.rou * 1000 );

    //温度の移動
    for( i=0 ; i<=this.nMeshX+1 ; i++ ) {
      for( j=0 ; j<=this.nMeshY+1 ; j++ ) {
        for( k=0 ; k<=this.nMeshZ+1 ; k++ ) {
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
              fixwall = ( i==this.nMeshX ? this.nMeshX : i+1 );
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
              fixwall = ( j==this.nMeshY ? this.nMeshY : j+1 );
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
              fixwall = ( k==this.nMeshZ ? this.nMeshZ : k+1 );
              //fixwall =  k+1;
              if ( vzij[fixwall] < 0 ) {
                coulant = -vzij[k+1] * this.delta_t / this.delta_z;
                this.tmp[0][i][j][k] += ( zp - pphi ) * coulant;
              }
            }
            if ( maxcoulant < coulant ) maxcoulant = coulant;
    
            //外壁・内壁・天井・床・物体との熱移動
            // 室内側熱抵抗: Riw=0.11m²K/W（壁）, Rif=0.15m²K/W（床）, Ric=0.09m²K/W（天井）
            // 空気: 比熱 sh_air 1.006J/gK, 密度 rou 1.293kg/m³
            // 壁・床・天井: 厚さ sh_thick 0.02m, 容積比熱 sh_wall 783kJ/m³K（杉材相当）
            // 熱流束: q = ΔT × K [W/m²] または q = ΔT / R [W/m²]
            // 温度変化: ΔT = q × Δt / (ρ × cp) [K]

            //X方向（左右）の熱移動
            if ( this.meshtype[i-1][j][k] != this.conf.INSIDE && this.meshtype[i-1][j][k] != this.conf.CL ) {
              //左側が空気でない
              if ( this.meshtype[i-1][j][k] == this.conf.OUTSIDE ) {
                //外壁（左）: 熱貫流率を使用
                dtemp = ( xm - pphi ) * this.wallK * heatparm_w / this.delta_x;
                this.tmp[0][i][j][k] += dtemp;
                this.tmp[0][i-1][j][k] -= dtemp *this.sh_air * this.rou * this.delta_x / (this.sh_wall/1000 * this.sh_thick);
                this.sumheatleft += ( xm - pphi ) * this.wallK * this.delta_y * this.delta_z;
              } else if ( this.meshtype[i-1][j][k] == this.conf.WINDOW ) {
                //窓（左）: 熱貫流率を使用
                dtemp = ( xm - pphi ) * this.WindowK * heatparm_w / this.delta_x;
                this.tmp[0][i][j][k] += dtemp;
                this.tmp[0][i-1][j][k] -= dtemp *this.sh_air * this.rou * this.delta_x / (this.sh_window/1000 * this.sh_thick_window);
                this.sumheatleft += ( xm - pphi ) * this.WindowK * this.delta_y * this.delta_z;
              } else {
                //内壁・障害物（左）: 熱抵抗を使用
                dtemp = ( xm - pphi ) / this.delta_x * heatparm;
                this.tmp[0][i][j][k] += dtemp;
                this.tmp[0][i-1][j][k] -= dtemp *this.sh_air * this.rou * this.delta_x / (this.sh_obs/1000 * this.sh_thick);
              }
            }
            if ( this.meshtype[i+1][j][k] != this.conf.INSIDE && this.meshtype[i+1][j][k] != this.conf.CL ) {
              //右側が空気でない
              if ( this.meshtype[i+1][j][k] == this.conf.OUTSIDE ) {
                //外壁（右）: 熱貫流率を使用
                dtemp = ( xp - pphi ) * this.wallK * heatparm_w / this.delta_x;
                this.tmp[0][i][j][k] += dtemp;
                this.tmp[0][i+1][j][k] -= dtemp *this.sh_air * this.rou * this.delta_x / (this.sh_wall/1000 * this.sh_thick);
                this.sumheatright += ( xp - pphi ) * this.wallK * this.delta_y * this.delta_z;
              } else if ( this.meshtype[i+1][j][k] == this.conf.WINDOW ) {
                //窓（右）: 熱貫流率を使用
                dtemp = ( xp - pphi ) * this.WindowK * heatparm_w / this.delta_x;
                this.tmp[0][i][j][k] += dtemp;
                this.tmp[0][i+1][j][k] -= dtemp *this.sh_air * this.rou * this.delta_x / (this.sh_window/1000 * this.sh_thick_window);
                this.sumheatright += ( xp - pphi ) * this.WindowK * this.delta_y * this.delta_z;
              } else {
                //内壁・障害物（右）: 熱抵抗を使用
                dtemp = ( xp - pphi ) / this.delta_x * heatparm;
                this.tmp[0][i][j][k] += dtemp;
                this.tmp[0][i+1][j][k] -= dtemp *this.sh_air * this.rou * this.delta_x / (this.sh_obs/1000 * this.sh_thick);
              }
            }

            //Z方向（前後）の熱移動
            if ( this.meshtype[i][j][k-1] != this.conf.INSIDE && this.meshtype[i][j][k-1] != this.conf.CL ) {
              //手前側が空気でない
              if ( this.meshtype[i][j][k-1] == this.conf.OUTSIDE ) {
                //外壁（手前）: 熱貫流率を使用
                dtemp = ( zm - pphi ) * this.wallK * heatparm_w / this.delta_z;
                this.tmp[0][i][j][k] += dtemp;
                this.tmp[0][i][j][k-1] -= dtemp *this.sh_air * this.rou * this.delta_z / (this.sh_wall/1000 * this.sh_thick);
              } else if ( this.meshtype[i][j][k-1] == this.conf.WINDOW ) {
                //窓（手前）: 熱貫流率を使用
                dtemp = ( zm - pphi ) * this.WindowK * heatparm_w / this.delta_z;
                this.tmp[0][i][j][k] += dtemp;
                this.tmp[0][i][j][k-1] -= dtemp *this.sh_air * this.rou * this.delta_z / (this.sh_window/1000 * this.sh_thick_window);
              } else {
                //内壁・障害物（手前）: 熱抵抗を使用
                dtemp = ( zm - pphi ) / this.delta_z * heatparm;
                this.tmp[0][i][j][k] += dtemp;
                this.tmp[0][i][j][k-1] -= dtemp *this.sh_air * this.rou * this.delta_z / (this.sh_obs/1000 * this.sh_thick);
              }
            }
            if ( this.meshtype[i][j][k+1] != this.conf.INSIDE && this.meshtype[i][j][k+1] != this.conf.CL ) {
              //奥側が空気でない
              if ( this.meshtype[i][j][k+1] == this.conf.OUTSIDE ) {
                //外壁（奥：正面）: 熱貫流率を使用
                dtemp = ( zp - pphi ) * this.wallK * heatparm_w / this.delta_z;
                this.tmp[0][i][j][k] += dtemp;
                this.tmp[0][i][j][k+1] -= dtemp *this.sh_air * this.rou * this.delta_z / (this.sh_wall/1000 * this.sh_thick);
                this.sumheatfront += ( zp - pphi ) * this.wallK * this.delta_x * this.delta_y;
              } else if ( this.meshtype[i][j][k+1] == this.conf.WINDOW ) {
                //窓（奥：正面）: 熱貫流率を使用
                dtemp = ( zp - pphi ) * this.WindowK * heatparm_w / this.delta_z;
                this.tmp[0][i][j][k] += dtemp;
                this.tmp[0][i][j][k+1] -= dtemp *this.sh_air * this.rou * this.delta_z / (this.sh_window/1000 * this.sh_thick_window);
                this.sumheatfront += ( zp - pphi ) * this.WindowK * this.delta_x * this.delta_y;
              } else {
                //内壁・障害物（奥）: 熱抵抗を使用
                dtemp = ( zp - pphi ) / this.delta_z * heatparm;
                this.tmp[0][i][j][k] += dtemp;
                this.tmp[0][i][j][k+1] -= dtemp *this.sh_air * this.rou * this.delta_z / (this.sh_obs/1000 * this.sh_thick);
              }
            }

            //Y方向（上下）の熱移動
            if ( this.meshtype[i][j-1][k] != this.conf.INSIDE && this.meshtype[i][j-1][k] != this.conf.CL ) {
              //床: 床用熱抵抗を使用
              dtemp = ( ym - pphi ) / this.delta_y * heatparm_f;
              this.tmp[0][i][j][k] += dtemp;
              this.tmp[0][i][j-1][k] -= dtemp *this.sh_air * this.rou * this.delta_y / (this.sh_floor/1000 * this.sh_thick_floor);
            }
            if ( this.meshtype[i][j+1][k] != this.conf.INSIDE && this.meshtype[i][j+1][k] != this.conf.CL ) {
              //天井: 天井用熱抵抗を使用
              dtemp = ( yp - pphi ) / this.delta_y * heatparm_c;
              this.tmp[0][i][j][k] += dtemp;
              this.tmp[0][i][j+1][k] -= dtemp *this.sh_air * this.rou * this.delta_y / (this.sh_ceiling/1000 * this.sh_thick_ceiling);
            }
          }
        }
        //窓・外壁については温度は評価しない（外部から固定設定する）
      }
    }

    this.heatleftcount++;

    for( i=0 ; i<=this.nMeshX+1 ; i++ ) {
      for( j=0 ; j<=this.nMeshY+1 ; j++ ) {
        for( k=0 ; k<=this.nMeshZ+1 ; k++ ) {
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
  };

  //7 時間ステップ補正
  time_step_correction = function(maxcoulant) {
    if ( this.fgFixCoulant ) {
      if ( maxcoulant > this.coulant_min ) {
        //計算ステップを短くして詳細に計算
        this.delta_t *= 0.9;
        if( this.delta_t < this.delta_t_min ) {
          this.delta_t = this.delta_t_min;
        }
      }
      if ( maxcoulant < this.coulant_max ) {
        //計算ステップを長くして効率的に計算
        this.delta_t *= 1.1;
        if( this.delta_t > this.delta_t_max ) {
          this.delta_t = this.delta_t_max;
        }
      }
    }
  }

  //空気セル判定
  isCellAir = function(i,j,k){
    return ( this.meshtype[i][j][k] == this.conf.INSIDE || this.meshtype[i][j][k] == this.conf.CL );
  }

}

