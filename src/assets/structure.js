// structure.js メッシュ（構造設定・描画）
//    create boxcel by parameters
//
//    initi() meshtype の構築
//    draw_mesh() 簡易3D画面作成

import { Store } from "@/stores/store"
import { Config } from "@/assets/config.js"

export class Structure {

  //create 3D array
  create_3d = function() {
    return [...Array(this.nMeshX+2)].map(k => [...Array(this.nMeshY+2)].map(k => [...Array(this.nMeshZ+2)].map(k=>0)));
  }

  //meshset by setval
  //フィールド初期設定　meshtype[][][] を設定
  init = function(setval){
    this.setval = setval;
    this.nMeshX = setval.nMeshX;
    this.nMeshY = setval.nMeshY;
    this.nMeshZ = setval.nMeshZ;

    var conf = new Config();
    this.conf = conf.val;;

    this.store = Store();
    this.meshtype = this.create_3d();

    //tempolary
    var nMeshX = this.nMeshX;
    var nMeshY = this.nMeshY;
    var nMeshZ = this.nMeshZ;
    var realX = this.setval.realX;
    var realY = this.setval.realY;
    var realZ = this.setval.realZ;
    var ACwall = this.setval.ACwall;

    var unitX = realX / nMeshX;
    var unitY = realY / nMeshY;
    var unitZ = realZ / nMeshZ;

    //表示画面
    var maxreal = Math.max(this.setval.realX,this.setval.realY,this.setval.realZ);
    this.setval.canvasfieldX = 400 * this.setval.realX / maxreal;
    this.setval.canvasfieldY = 400 * this.setval.realY / maxreal;


    //障害物・窓のメッシュ範囲
    var ObsX1 = Math.round(this.setval.ObsX1r/unitX);		//障害物X=0(WINDOW)からの距離
    var ObsX2 = Math.round(this.setval.ObsX2r/unitX);		//障害物の厚さ
    var ObsZr = Math.round(this.setval.ObsZ1r/unitZ);		//障害物のZ開始位置
    var ObsZw = Math.round(this.setval.ObsZwr/unitZ);				//障害物の幅
    var ObsY = Math.round(this.setval.ObsYr/unitY);			//障害物の高さ

    var WindowY = Math.round(this.setval.WindowYr/unitY);
    var WindowH = Math.round(this.setval.WindowHr/unitY);
    var WindowZ = Math.round((realZ - this.setval.WindowWr)/2/unitZ);
    var WindowW = Math.round(this.setval.WindowWr/unitZ);

    var Window2Y = Math.round(this.setval.Window2Yr/unitY);
    var Window2H = Math.round(this.setval.Window2Hr/unitY);
    var Window2X= Math.round((realX -this.setval.Window2Xr)/2/unitX);
    var Window2W = Math.round(this.setval.Window2Wr/unitZ);

    //エアコン送風口
    var ac_outsize = this.conf.ac_width * this.conf.ac_height;
    var ac_mesh = ac_outsize /unitX / unitZ;

    //A フィールド指定がある場合------------------------------
    if( this.setval.meshtype ){
      //格子点のタイプ・Phi初期値(属性による設定)
      //XZのあとにYで送られてくる
      for( var j=0 ; j<=nMeshY+1 ; j++ ) {
        for( var i=0 ; i<=nMeshX+1 ; i++ ) {
          for( var k=0 ; k<=nMeshZ+1 ; k++ ) {
            this.meshtype[i][j][k] = this.setval.meshtype[i][j][k];
          }
        }
      }
      console.log(this.meshtype);
      return;
    }

    //B 以下フィールド指定がない場合（フィールド構造から生成する）----------

    //格子点のタイプ・Phi初期値(属性による設定)
    for( var i=0 ; i<=nMeshX+1 ; i++ ) {
      for( var j=0 ; j<=nMeshY+1 ; j++ ) {
        for( var k=0 ; k<=nMeshZ+1 ; k++ ) {
          //標準は内点とする
          this.meshtype[i][j][k] = this.conf.INSIDE;		//内点
          
          //壁面の設定
          //Y面（上下）
          if ( j == 0 )
            this.meshtype[i][j][k] = this.conf.BOTTOM;	//床面
          if ( j == nMeshY+1 )
            this.meshtype[i][j][k] = this.conf.TOP;		//天井面
          //Z面（正面）
          if ( k == 0 ) 
            this.meshtype[i][j][k] = this.conf.SIDE;	//室内側面
          if ( k == nMeshZ+1 ) {
            if ( 
              ( (j>=Window2Y && j<= Window2Y + Window2H) || 
                ( this.setval.floor > 1 && j>=Window2Y+this.nMeshY/2 && j<= Window2Y + Window2H + this.nMeshY/2) )
              && i >= Window2X && i<= Window2X + Window2W 
            ) {
              this.meshtype[i][j][k] = this.conf.WINDOW;	//正面窓
            } else {
              this.meshtype[i][j][k] = this.conf.OUTSIDE;	//正面外壁
            }
          }
          //X面（左右）
          if ( i == 0 )
            if ( 
              ( (j>=WindowY && j<= WindowY + WindowH ) ||
                ( this.setval.floor > 1 && j>=WindowY+this.nMeshY/2 && j<= WindowY + WindowH + this.nMeshY/2) )
              && k >= WindowZ && k<= WindowZ + WindowW 
            ) {
              this.meshtype[i][j][k] = this.conf.WINDOW;	//左端窓
            } else {
              this.meshtype[i][j][k] = this.conf.OUTSIDE;	//左端壁
            }
          if ( i == nMeshX+1 )
            this.meshtype[i][j][k] = this.conf.SIDE;	//室内側面
  
          //障害物
          if ( i >= ObsX1 && i <= ObsX1 + ObsX2-1 
            && k >= ObsZr + 0.5 && k <= ObsZr + ObsZw + 0.5
            && j >0 && j <= ObsY && this.setval.ObsSet == 1) 
          {
            this.meshtype[i][j][k] = this.conf.OBSTACLE;	//障害物内部
          }

          //エアコンの設定（設置壁面と位置の設定）
          var ypos = nMeshY - 2;
          if( this.setval.floor > 1 ){
            ypos = Math.floor(nMeshY/2) -2;
          }
          if ( ACwall == 3 ){
            if ( j == ypos			//天井から2つ下
              && ( k >= Math.round((nMeshZ - ac_mesh)/2)  && k <= Math.ceil((nMeshZ + ac_mesh)/2) ) 	//幅
            ) {
              if ( i == nMeshX-1 ) {					//右壁側
                this.meshtype[i][j][k] = this.conf.AC;
              }
            }

          } else if ( ACwall == 2 ){
            if ( j == ypos			//天井から2つ下
              && (i >= Math.round((nMeshX - ac_mesh)/2)  && i <= Math.ceil((nMeshX + ac_mesh)/2)) 	//幅
            ) {
              if ( k == nMeshZ -1 ) {					//正面壁
                this.meshtype[i][j][k] = this.conf.AC;
              }
            }

          } else if ( ACwall == 1 ){
            if ( j == ypos			//天井から2つ下
              && ( k >= Math.round((nMeshZ - ac_mesh)/2)  && k <= Math.ceil((nMeshZ + ac_mesh)/2)  ) 	//幅
            ) {
              if ( i == 2 ) {				//左壁（外壁）側
                this.meshtype[i][j][k] = this.conf.AC;
              }
            }
          }
          
          //サーキュレータ設置
          if ( this.setval.CirculatorWind > 0 ){
            if ( j == 1 
              && k == parseInt(nMeshZ/2)
              && i == 1  
            ) {
              //床面・左面、中央
              this.meshtype[i][j][k] = this.conf.CL;
            }
          }

          //2階
          if( this.setval.floor > 1 ){
            if ( j == Math.floor(nMeshY/2) ){
              if( !this.setval.atrium || i > Math.floor(nMeshX*1/3) ){
                this.meshtype[i][j][k] = this.conf.TOP;
              }
            }
          }
        }
      }
    }
    console.log(this.meshtype);
  };


  //draw mesh ======================================
  draw_mesh = function(ctx){
    this.draw_mesh_back(ctx);
    this.draw_mesh_front(ctx);
  }

  //back side of mesh
  draw_mesh_back = function(ctx){
    var p0 = this.store.posxy(0.5,0.5,0.5);
    var p1 = this.store.posxy(0.5,0.5,this.nMeshZ+1.5);
    var p2 = this.store.posxy(0.5,this.nMeshY+1.5,0.5);
    var p3 = this.store.posxy(0.5,this.nMeshY+1.5,this.nMeshZ+1.5);
    var p4 = this.store.posxy(this.nMeshX+1.5,0.5,0.5);
    var p5 = this.store.posxy(this.nMeshX+1.5,0.5,this.nMeshZ+1.5);
    var p6 = this.store.posxy(this.nMeshX+1.5,this.nMeshY+1.5,0.5);
    var p7 = this.store.posxy(this.nMeshX+1.5,this.nMeshY+1.5,this.nMeshZ+1.5);

    this.draw_panel(ctx,p0,p1,p3,p2,"rgba(255,245,225,0.5)");
    this.draw_panel(ctx,p1,p5,p7,p3,"rgba(245,235,225,0.6)"); //正面
    this.draw_panel(ctx,p0,p1,p5,p4,"rgba(255,245,245,0.5)"); //床
    this.draw_panel(ctx,p4,p5,p7,p6,"rgba(255,245,225,0.5)");
  }  
  //front side of mesh
  draw_mesh_front = function(ctx){
    var p0 = this.store.posxy(0.5,0.5,0.5);
    var p1 = this.store.posxy(0.5,0.5,this.nMeshZ+1.5);
    var p2 = this.store.posxy(0.5,this.nMeshY+1.5,0.5);
    var p3 = this.store.posxy(0.5,this.nMeshY+1.5,this.nMeshZ+1.5);
    var p4 = this.store.posxy(this.nMeshX+1.5,0.5,0.5);
    var p5 = this.store.posxy(this.nMeshX+1.5,0.5,this.nMeshZ+1.5);
    var p6 = this.store.posxy(this.nMeshX+1.5,this.nMeshY+1.5,0.5);
    var p7 = this.store.posxy(this.nMeshX+1.5,this.nMeshY+1.5,this.nMeshZ+1.5);

    this.draw_panel(ctx,p0,p4,p6,p2,"rgba(255,245,225,0.1)");
    this.draw_panel(ctx,p2,p6,p7,p3,"rgba(255,245,225,0.1)");
  }

  //draw wall setting, windows, air conditiner ============
  draw_wall = function(ctx){
    var p0,p1,p2,p3;
    //x=0面
    for( var j=1 ; j<=this.nMeshY ; j++ ) {
      for( var k=1 ; k<=this.nMeshZ ; k++ ) {
        if ( this.meshtype[0][j][k] == this.conf.WINDOW || this.meshtype[2][j][k] == this.conf.AC ) {
          p0 = this.store.posxy(0.5,j-0.5,k-0.5);
          p1 = this.store.posxy(0.5,j-0.5,k+0.5);
          p2 = this.store.posxy(0.5,j+0.5,k+0.5);
          p3 = this.store.posxy(0.5,j+0.5,k-0.5);
          if ( this.meshtype[2][j][k] == this.setval.AC ){
            this.draw_panel(ctx,p0,p1,p2,p3,"rgba(255,0,0,0.5)");
          } else {
            this.draw_panel(ctx,p0,p1,p2,p3,"rgba(205,205,255,0.5)");
          }
        }
      }
    }
    //z=nMeshZ面
    for( var i=1 ; i<=this.nMeshX ; i++ ) {
      for( var j=1 ; j<=this.nMeshY ; j++ ) {
        if ( this.meshtype[i][j][this.nMeshZ+1] == this.conf.WINDOW || this.meshtype[i][j][this.nMeshZ-1] == this.conf.AC ) {
          p0 = this.store.posxy(i-0.5,j-0.5,this.nMeshZ+1.5);
          p1 = this.store.posxy(i+0.5,j-0.5,this.nMeshZ+1.5);
          p2 = this.store.posxy(i+0.5,j+0.5,this.nMeshZ+1.5);
          p3 = this.store.posxy(i-0.5,j+0.5,this.nMeshZ+1.5);
          if ( this.meshtype[i][j][this.nMeshZ-1] == this.conf.AC ){
            this.draw_panel(ctx,p0,p1,p2,p3,"rgba(255,0,0,0.5)");
          } else {
            this.draw_panel(ctx,p0,p1,p2,p3,"rgba(205,205,255,0.5)");
          }
        }
      }
    }
    //x=nMeshX面
    for( var j=1 ; j<=this.nMeshY ; j++ ) {
      for( var k=1 ; k<=this.nMeshZ ; k++ ) {
        if ( this.meshtype[this.nMeshX+1][j][k] == this.conf.WINDOW || this.meshtype[this.nMeshX-1][j][k] == this.conf.AC ) {
          p0 = this.store.posxy(this.nMeshX + 1.5,j-0.5,k-0.5);
          p1 = this.store.posxy(this.nMeshX + 1.5,j-0.5,k+0.5);
          p2 = this.store.posxy(this.nMeshX + 1.5,j+0.5,k+0.5);
          p3 = this.store.posxy(this.nMeshX + 1.5,j+0.5,k-0.5);
          if ( this.meshtype[this.nMeshX-1][j][k] == this.conf.AC ){
            this.draw_panel(ctx,p0,p1,p2,p3,"rgba(255,0,0,0.5)");
          } else {
            this.draw_panel(ctx,p0,p1,p2,p3,"rgba(205,205,255,0.5)");
          }
        }
      }
    }
  }

  // paint squere
  draw_panel = function(ctx,p0,p1,p2,p3,col){
    ctx.beginPath();
    ctx.strokeStyle = col;
    ctx.fillStyle = col;
    ctx.moveTo(p0[0], p0[1]);
    ctx.lineTo(p1[0], p1[1]);
    ctx.lineTo(p2[0], p2[1]);
    ctx.lineTo(p3[0], p3[1]);
    ctx.lineTo(p0[0], p0[1]);
    ctx.fill();
    ctx.stroke();
  }

}

