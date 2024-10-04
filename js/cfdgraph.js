//計算結果に対応するグラフ表示
//  フィールド定義
//  計算結果の画像・表での表示

class Graph {

    //フィールド定義==================================================
    constructor(cfd){
        this.cfd = cfd;

        this.mesh_result = {};		//毎回の計算結果
        this.precalc = 0;
        this.canvas = [];
    
        //計算フィールド
        this.meshtype = [];		//構造
        this.Phi = [];			//温度
        this.Prs = [];			//圧力
        this.Vel = [];			//速度ベクトル
    }

    init = function(paramsets){
        this.params = paramsets;
        this.canvasinit();    
        this.init_mesh();

        this.batch_end = true;
        this.cfd.meshset({ "val": this.params , "meshtype":this.meshtype });
    }

    //画面canvas初期設定
    canvasinit = function(){
        $("#wall_base").height(cy).width(cx);
        $("#wall2_base").height(cy).width(cx);
        $("#floor_base").height(cy).width(cx);
        $("#graphbase").height(cy).width(cx);

        for( var i=0 ; i<3 ; i++ ){
            this.canvas[i] = [];
            this.canvas[i].graph = document.getElementById('graph'+i);
            this.canvas[i].base = document.getElementById('graph'+i+'base');
            this.canvas[i].layout = document.getElementById('layout'+i);
            // if (typeof G_vmlCanvasManager != 'undefined') {
            //     this.canvas[i].graph = G_vmlCanvasManager.initElement(this.canvas[i].graph);
            //     this.canvas[i].base = G_vmlCanvasManager.initElement(this.canvas[i].base);
            //     this.canvas[i].layout = G_vmlCanvasManager.initElement(this.canvas[i].layout);
            // }
            this.canvas[i].ctxgraph = this.canvas[i].graph.getContext('2d');
            this.canvas[i].ctxbase = this.canvas[i].base.getContext('2d');
            this.canvas[i].ctxlayout = this.canvas[i].layout.getContext('2d');
        }

        //legend
        this.canvas[3] = [];
        this.canvas[3].camvas = document.getElementById('legend');
        if (typeof G_vmlCanvasManager != 'undefined') {
            this.canvas[3].camvas = G_vmlCanvasManager.initElement(this.canvas[3].camvas);
        }
        this.canvas[3].ctx = this.canvas[3].camvas.getContext('2d');
    };


    //フィールド初期設定　meshtype[][][] を設定
    init_mesh = function(){

        this.meshtype = this.init_3d();
        this.Phi = this.init_3d();
        this.Prs = this.init_3d();
        this.Vel = Array( 3 );
        this.Vel[0] = this.init_3d();
        this.Vel[1] = this.init_3d();
        this.Vel[2] = this.init_3d();

        var ObsX1 = parseInt(this.params.ObsX1r*nMeshX/size_x+0.49);		//障害物X=0(WINDOW)からの距離
        var ObsX2 = parseInt(this.params.ObsX2r*nMeshX/size_x+0.49);		//障害物の厚さ
        var ObsZr = parseInt(this.params.ObsZ1r*nMeshZ/size_z+0.49);		//障害物のZ開始位置
        var ObsZw = parseInt(this.params.ObsZwr*nMeshZ/size_z);				//障害物の幅
        var ObsY = parseInt(this.params.ObsYr*nMeshY/size_y+0.49);			//障害物の高さ

        var WindowY = parseInt(this.params.WindowYr*nMeshY/size_y+0.49);
        var WindowH = parseInt(this.params.WindowHr*nMeshY/size_y+0.49);
        var WindowZ = parseInt(this.params.WindowZr*nMeshZ/size_z+0.49);
        var WindowW = parseInt(this.params.WindowWr*nMeshZ/size_z+0.49);

        var Window2Y = parseInt(this.params.Window2Yr*nMeshY/size_y+0.49);
        var Window2H = parseInt(this.params.Window2Hr*nMeshY/size_y+0.49);
        var Window2X= parseInt(this.params.Window2Xr*nMeshX/size_x+0.49);
        var Window2W = parseInt(this.params.Window2Wr*nMeshZ/size_x+0.49);

        //エアコン口の面積
        var ac_outsize = ac_width * ac_height;
        var ac_mesh = ac_outsize / (size_x / nMeshX) / (size_z / nMeshZ);

        //格子点のタイプ・Phi初期値
        for( var i=0 ; i<=nMeshX+1 ; i++ ) {
            for( var j=0 ; j<=nMeshY+1 ; j++ ) {
                for( var k=0 ; k<=nMeshZ+1 ; k++ ) {
                    //標準は内点とする
                    this.meshtype[i][j][k] = INSIDE;		//内点
                    
                    //壁面の確認
                    if ( j == 0 )
                        this.meshtype[i][j][k] = BOTTOM;	//下側壁面
                    if ( j == nMeshY+1 )
                        this.meshtype[i][j][k] = TOP;		//上側壁面
                    if ( k == 0 ) 
                        this.meshtype[i][j][k] = SIDE;	//側面
                    if ( k == nMeshZ+1 ) 
                        if ( j>=Window2Y && j<= Window2Y + Window2H
                            && i >= Window2X && i<= Window2X + Window2W 
                        ) {
                            this.meshtype[i][j][k] = WINDOW;	//正面窓
                        } else {
                            this.meshtype[i][j][k] = OUTSIDE;	//正面外壁
                        }
                    if ( i == 0 )
                        if ( j>=WindowY && j<= WindowY + WindowH
                            && k >= WindowZ && k<= WindowZ + WindowW 
                        ) {
                            this.meshtype[i][j][k] = WINDOW;	//左端窓
                        } else {
                            this.meshtype[i][j][k] = OUTSIDE;	//左端壁
                        }
                    if ( i == nMeshX+1 )
                        this.meshtype[i][j][k] = SIDE;	//（右端）

                    //障害物
                    if ( i >= ObsX1 && i <= ObsX1 + ObsX2-1 
                        && k >= ObsZr + 0.5 && k <= ObsZr + ObsZw + 0.5
                        && j >0 && j <= ObsY && this.params.ObsSet == 1) 
                    {
                        this.meshtype[i][j][k] = OBSTACLE;	//障害物内部
                    }

                    //エアコンの設定（設置壁面と位置の設定）
                    if ( ACwall == 3 ){
                        if ( j == nMeshY-2			//天井から2つ下
                            && ( k > Math.ceil((nMeshZ - ac_mesh)/2)  && k <= Math.ceil((nMeshZ + ac_mesh)/2) ) 	//幅
                        ) {
                            if ( i == nMeshX-1 ) {					//右壁側
                                this.meshtype[i][j][k] = AC;
                            }
                        }

                    } else if ( ACwall == 2 ){
                        if ( j == nMeshY-2			//天井から2つ下
                            && (i > Math.ceil((nMeshX - ac_mesh)/2)  && i <= Math.ceil((nMeshX + ac_mesh)/2)) 	//幅
                        ) {
                            if ( k == nMeshZ -1 ) {					//正面壁
                                this.meshtype[i][j][k] = AC;
                            }
                        }

                    } else if ( ACwall == 1 ){
                        if ( j == nMeshY-2			//天井から2つ下
                            && ( k > Math.ceil((nMeshZ - ac_mesh)/2)  && k <= Math.ceil((nMeshZ + ac_mesh)/2)  ) 	//幅
                        ) {
                            if ( i == 2 ) {				//左壁（外壁）側
                                this.meshtype[i][j][k] = AC;
                            }
                        }
                    }
                    
                    //サーキュレータ設置
                    if ( this.params.CirculatorWind > 0 ){
                        if ( j == 1 
                            && k == parseInt(nMeshZ/2)
                            && i == 1  
                        ) {
                            //床面・左面、中央
                            this.meshtype[i][j][k] = CL;
                        }
                    }
                }
            }
        }
        
        this.showlayout();
        this.graph();
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

    //計算実行================================
    calc = function(recalc){
        if( recalc ){
            this.batch_end = false;
            this.mesh_result = this.cfd.meshcalc();		//単時間計算
        }

        if(this.mesh_result.calc != this.precalc){
            this.viewupdate();		    //結果があれば画面更新
            this.batch_end = true;
        }

        //全体の計算時間上限
		var endcalc = false;
        if( this.mesh_result.totaltime/60 > this.params.maxtime_minute ||
            this.mesh_result.count > this.params.maxtime 
        ) {
            endcalc = true;
        }
        return endcalc;
    }


    //グラフアップデート：================================
    // this.mesh_resultに結果が入っている
    viewupdate = function(){
        var data = this.mesh_result;

        this.precalc = data.count;
        this.Vel = data.Vel;
        this.Phi = data.Phi;
        this.Prs = data.Prs;    

        var totaltime = data.totaltime;
        var acheat = data.acheat;
        var heatleftin = data.heatin.heatleftin;
        var heatfrontin = data.heatin.heatfrontin;

        var temp = this.getTempMaxMin();

        var cop = 5.0;  //エアコンCOP

        sumwatt += 60/3600/cop * acheat;	
        var disp = Math.floor(totaltime / 60) +  "分後" + "　　計算回数:" + data.count + "回 <br>"
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
        $("#res").html( this.dump() );
        this.graph();
    
    }


    //結果表 表示================================================

    //マップ定義ダンプ
    dumpmap = function() {
        ret = "MAP\n";
        for( k=0 ; k<=nMeshZ ; k++ ) {
            ret += k + "\n";
            for( j=0 ; j<=nMeshY ; j++ ) {
                for( i=0 ; i<=nMeshX ; i++ ) {
                    ret += this.meshtype[i][nMeshY-j][k] + " ";
                }
                ret += "\n";
            }
        }
        return ret;
    };


    //結果一括ダンプ表示
    dump = function() {
        var ret = "";
        var max = 0;
        var min = 100;
        var i,j,k;
        var Phic = 0;
        var Phisum = 0;

        for( i=1 ; i<=nMeshX ; i++ ) {
            for( j=1 ; j<=nMeshY ; j++ ) {
                for( k=1 ; k<=nMeshZ ; k++ ) {
                    if ( this.Phi[i][j][k] > max ) max = this.Phi[i][j][k];
                    if ( this.Phi[i][j][k] < min ) min = this.Phi[i][j][k];
                    Phisum += this.Phi[i][j][k];
                    Phic++;
                }
            }
        }
        tmax = max;
        tmin = min;

        // k=Math.floor(nMeshZ/2,1);
        k = nowz;

        ret += "Z-layer:"+k+"\n\n";

        ret += "meshtype\n";
        for( j=0 ; j<=nMeshY+1 ; j++ ) {
            for( i=0 ; i<=nMeshX+1 ; i++ ) {
                ret += this.meshtype[i][nMeshY+1-j][k] + " ";
            }
            ret += "\n";
        }

        ret += "Phi-templature degree-C\n";

        ret += "max:" + Math.floor(tmax*10)/10 + 
            "  avg:" + Math.floor(Phisum/Phic*10)/10 +
            "  min:" + Math.floor(tmin*10)/10 +"\n";

        for( j=0 ; j<=nMeshY+1 ; j++ ) {
            for( i=0 ; i<=nMeshX+1 ; i++ ) {
                ret += this.Phi[i][nMeshY+1-j][k].toFixed(1) + " ";
            }
            ret += "\n";
        }

        ret += "Vel[x] m/s\n";
        for( j=0 ; j<=nMeshY+1 ; j++ ) {
            for( i=0 ; i<=nMeshX+1 ; i++ ) {
                ret += (this.Vel[x][i][nMeshY+1-j][k]>=0 ? " " : "" ) + (this.Vel[x][i][nMeshY+1-j][k]).toFixed(1) + " ";
            }
            ret += "\n";
        }

        ret += "Vel[y] m/s\n";
        for( j=0 ; j<=nMeshY+1 ; j++ ) {
            for( i=0 ; i<=nMeshX+1 ; i++ ) {
                ret += (this.Vel[y][i][nMeshY+1-j][k]>=0 ? " " : "" ) + (this.Vel[y][i][nMeshY+1-j][k]).toFixed(1) + " ";
            }
            ret += "\n";
        }


        ret += "Vel[z] m/s\n";
        for( j=0 ; j<=nMeshY+1 ; j++ ) {
            for( i=0 ; i<=nMeshX+1 ; i++ ) {
                ret += (this.Vel[z][i][nMeshY+1-j][k]>=0 ? " " : "" ) + (this.Vel[z][i][nMeshY+1-j][k]).toFixed(1) + " ";
            }
            ret += "\n";
        }

        ret += "Prs (10hPa)\n";
        for( j=1 ; j<=nMeshY ; j++ ) {
            for( i=1 ; i<=nMeshX ; i++ ) {
                ret += (this.Prs[i][nMeshY+1-j][k]>=0 ? " " : "" ) +(this.Prs[i][nMeshY+1-j][k]*100).toFixed(1) + " ";
            }
            ret +=  "\n";
        }

        return ret;
    };


    //結果グラフ描画 ===============================================

    //一括グラフ表示
    graph = function(){
        this.graph1();
        this.graph2();
        this.graph3();
    }

    //グラフの外部からのアクセス(iで画面指定)
    graphupdate = function(i){
        if( i==0 ){
            this.graph3();
        } else if( i==1 ){
            this.graph1();
        } else {
            this.graph2();
            $("#res").html( this.dump() );
        }
    }

    //個別平面描画
    //	ctx:対象canvas  xyz:1-3   layer:layer id
    vgraph = function(ctx, xyz, layer) {
        var x1, y1, x2, y2;
        var i,j,k;
        var maxMesh;

        maxMesh = Math.max( nMeshX, nMeshY, nMeshZ);

        var len = cx/maxMesh * arrowsize;

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
                    x2 = x1 + len * this.Vel[x][i][j][k];
                    y2 = y1 + len * this.Vel[y][i][j][k];

                    ctx.beginPath();
                    ctx.fillStyle = this.colorTemp(this.Phi[i][j][k]);
                    ctx.fillRect(x1-mesux/2, cy-(y1+mesuy/2), mesux, mesuy);
                    ctx.stroke();
                }
            }
            for ( i =1 ; i<= nMeshX ; i++ ) {
                for ( j =1 ; j<= nMeshY ; j++ ) {
                    x1 = (i -1/2 )* mesux;
                    y1 = (j -1/2 )* mesuy;	//y軸はメッシュと表示が逆のためcyから引く
                    x2 = x1 + len * this.Vel[x][i][j][k];
                    y2 = y1 + len * this.Vel[y][i][j][k];

                    //矢印（ベクトル）
                    if ( this.meshtype[i][j][k] == INSIDE ) {
                        this.arrow( ctx, x1, cy-y1 , x2, cy-y2 , "black" );
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
                    x2 = x1 + len * this.Vel[x][i][j][k];
                    y2 = y1 + len * this.Vel[z][i][j][k];
                    base =  cy - (nMeshZ)*mesuz;
                    ctx.beginPath();
                    ctx.fillStyle = this.colorTemp(this.Phi[i][j][k]);
                    ctx.fillRect(x1 - mesux/2, cy-( y1+mesuz/2) -base, mesux, mesuz);
                    ctx.stroke();
                }
            }
            for ( i =1 ; i<= nMeshX ; i++ ) {
                for ( k =1 ; k<= nMeshZ ; k++ ) {
                    x1 = (i -1/2 ) * mesux;
                    y1 = (k -1/2 ) * mesuz;
                    x2 = x1 + len * this.Vel[x][i][j][k];
                    y2 = y1 + len * this.Vel[z][i][j][k];
                    base =  cy - (nMeshZ)*mesuz;
                    //矢印（ベクトル）
                    if ( this.meshtype[i][j][k] == INSIDE ) {
                        this.arrow( ctx, x1, cy - y1 - base, x2, cy - y2 - base , "black");
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
                    x2 = x1 + len * this.Vel[z][i][j][k];
                    y2 = y1 + len * this.Vel[y][i][j][k];
                    base =  cx - (nMeshZ)*mesuz;
                    ctx.beginPath();
                    ctx.fillStyle = this.colorTemp(this.Phi[i][j][k]);
                    ctx.fillRect(x1 - mesuz/2 + base, cy-( y1+mesuy/2), mesuz, mesuy);
                    ctx.stroke();
                }
            }
            for ( j =1 ; j<= nMeshY ; j++ ) {
                for ( k =1 ; k<= nMeshZ ; k++ ) {
                    x1 = (k -1/2 ) * mesuz;
                    y1 = (j -1/2 ) * mesuy;
                    x2 = x1 + len * this.Vel[z][i][j][k];
                    y2 = y1 + len * this.Vel[y][i][j][k];
                    base =  cx - (nMeshZ)*mesuz;
                    //矢印（ベクトル）
                    if ( this.meshtype[i][j][k] == INSIDE ) {
                        this.arrow( ctx, x1 + base, cy - y1 , x2 + base, cy - y2 , "black");
                    }
                }
            }
        }
        this.hanrei(len);
        
        //枠を描画
        ctx.beginPath();
        ctx.fillStyle = this.colorTemp(this.Phi[i][j][k]);
        ctx.rect(0,0, cx-1, cy-1);
        ctx.stroke();
        
    };


    //底面--------------------------------------
    graph1 = function(){
        var ctx = this.canvas[1].ctxgraph;
        this.vgraph(ctx,1,nowy);
        this.vgraph(this.canvas[1].ctxbase,1,1);

        $("#layery").html(nowy + "層目(1-" + nMeshY +  ")" );

        //レイヤー名記載
        ctx.fillStyle = "black";
        ctx.font = "24px 'ＭＳ Ｐゴシック'";
        ctx.fillText("Y床面 " + nowy + "層目", 10, 380, 300);
        ctx.stroke();
        $(".floor.move").css( "top", parseInt( - (nowy-1) * mesuy *2 ) );
        $(".floor.move").css( "left", parseInt( -(nowy-1) * mesuy) );
    };

    //正面-------------------------------------
    graph2 = function(){
        var ctx = this.canvas[2].ctxgraph;
        this.vgraph(ctx,2,nowz);
        this.vgraph(this.canvas[2].ctxbase,2,nMeshZ);

        $("#layerz").html( nowz + "層目(1-" + nMeshZ +  ")" );

        //レイヤー名記載
        ctx.fillStyle = "black";
        ctx.font = "20px 'ＭＳ Ｐゴシック'";
        ctx.fillText("Z奥外壁面  " + nowz + "層目", 10, 40, 300);
        $(".front.move").css( "left", parseInt( - (nMeshZ - nowz) * mesuz/2 ) );
        $(".front.move").css( "top", parseInt( + (nMeshZ - nowz) * mesuz/2 ) );
        ctx.stroke();
    };

    //左面-------------------------------------
    graph3 = function(){
        var ctx = this.canvas[0].ctxgraph;
        this.vgraph(ctx,3,nowx);
        this.vgraph(this.canvas[0].ctxbase,3,1);

        $("#layerx").html( nowx + "層目(1-" + nMeshX +  ")" );

        //レイヤー名記載
        ctx.fillStyle = "black";
        ctx.font = "24px 'ＭＳ Ｐゴシック'";
        ctx.fillText("X窓面     " + nowx + "層目", 10, 40, 300);
        ctx.stroke();
        $(".left.move").css( "left", parseInt( (nowx-1) * mesux *2) );
        $(".left.move").css( "top", parseInt( (nowx-1) * mesux ) );
    };
    
    

    //色凡例表示-------------------------
    hanrei = function(len){
        var ctx = this.canvas[3].ctx;
        ctx.clearRect(0, 0, 800, 40);
        var st = 10;
        var ed = 25;
        var wid = 300/(ed-st);
        for ( var i=st ; i<=ed ; i++ ) {
            ctx.beginPath();
            ctx.fillStyle = this.colorTemp(i);
            ctx.fillRect((i-st)*wid, 10, wid, 20);
            ctx.stroke();
        }
        this.arrow( ctx, 350, 20, 350 + len , 20 , this.colorTemp(0) );
    };

    //矢印の描画------------------------------
    arrow = function(ctx, x1, y1, x2, y2, col ){
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
    colorTemp = function( temp ) {
        var rangemax = 25;
        var rangemin = 10;
        var col =  Math.max(Math.min((temp - rangemin)/(rangemax - rangemin),1),0);
        return "rgb( " + parseInt(Math.min(Math.max(col*1.4,0),1)*255) + "," 
                        + parseInt( Math.sqrt((1-Math.abs(col*2-1)))*255) +"," 
                        + parseInt( Math.min(Math.max( (1-col)*1.4,0 ),1)*255) + ")";
    };

    //最大速度・温度算出-------------
    getTempMaxMin = function(){
        var maxvf =0;
        var maxtmp =-100;
        var mintmp =100;
        var v;
        var ret = [];
        var floorsum=0, totalsum=0, leftsum=0, frontsum=0;
        var floorn = 0, totaln = 0, leftn = 0, frontn = 0;
        var i,j,k;
        var psi;

        for ( i =1 ; i<= nMeshX-1 ; i++ ) {
            for ( j =1 ; j<= nMeshY-1 ; j++ ) {
                for ( k =1 ; k<= nMeshZ-1 ; k++ ) {
                    psi =this. Phi[i][1][k];
                    if (
                        j == 1 
                        && i != 1 
                        && k != 1 
                        && this.meshtype[i][1][k] == INSIDE 
                        && this.meshtype[i-1][1][k] != CL 
                    ) {
                        //床：サーキュレータ吸い込み口を除く床面（壁面に接する部分も除く）
                        v = Math.sqrt(this.Vel[x][i][1][k]*this.Vel[x][i][1][k]+ this.Vel[z][i][1][k]*this.Vel[z][i][1][k] );
                        if( maxvf < v ) maxvf= v;
                        if( mintmp > psi ) mintmp= psi;
                        if( maxtmp < psi ) maxtmp= psi;
                        floorsum += psi;
                        floorn++;
                    }
                    if ( 
                        this.meshtype[i][j][k] == INSIDE 
                    ) {
                        //全体
                        totalsum += psi;
                        totaln++;
                    }
                    if ( 
                        i==1
                        && this.meshtype[i][j][k] == INSIDE 
                    ) {
                        //左
                        leftsum += psi;
                        leftn++;
                    }
                    if ( 
                        k==nMeshZ-1
                        && this.meshtype[i][j][k] == INSIDE 
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


    //レイアウトの描画 ==================================================
    showlayout = function(){
        var ret, ret2;
        var color_wall = 'rgb(250, 250, 200)'; //wall
        var color_floor = 'rgb(250, 230, 200)'; //wall
        var color_window = 'rgb(150, 220, 255)'; //window

        //floor
        var ctx = this.canvas[1].ctxlayout;
        ctx.beginPath();
        ctx.clearRect(0,0,399,399);
        ctx.strokeStyle = "black";
        ctx.fillStyle = color_floor;
        ret = this.meter2canvas( 0, 0 , 1);
        ret2 = this.meter2canvas( size_x, size_z , 1);
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
            ret = this.meter2canvas( $("#ObsX1r").val(), $("#ObsZ1r").val() , 1);
            ret2 = this.meter2canvas( $("#ObsX1r").val() *1+$("#ObsX2r").val()*1 ,  $("#ObsZ1r").val()*1 + $("#ObsZwr").val()*1 , 1);
            ctx.fillRect( Math.min(ret.x, ret2.x), Math.min(ret.y, ret2.y), Math.abs(ret2.x-ret.x), Math.abs(ret2.y-ret.y) );
            ctx.stroke();
        }

        if( $("#CirculatorWind").val() > 0 ) {
            //circulator
            ctx.beginPath();
            ctx.strokeStyle = "orange";
            ctx.lineWidth = 4;
            ret = this.meter2canvas(0.3, 1.5, 1);
            ctx.arc(ret.x, ret.y, 20, 0, 6.3, 0 );
            ctx.stroke();
        }
        
        //front
        ctx = this.canvas[2].ctxlayout;
        ctx.beginPath();
        ctx.clearRect(0,0,399,399);
        ctx.rect(0,0,399,399);
        ctx.strokeStyle = "black";
        ctx.fillStyle = color_wall;
        ret = this.meter2canvas( 0, 0 , 2);
        ret2 = this.meter2canvas( size_x, size_y , 2);
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
            ret = this.meter2canvas( $("#Window2Xr").val(), $("#Window2Yr").val() , 2);
            ret2 = this.meter2canvas( $("#Window2Xr").val()*1+$("#Window2Wr").val()*1 ,  $("#Window2Yr").val()*1 + $("#Window2Hr").val() *1, 2);
            ctx.fillRect( Math.min(ret.x, ret2.x), Math.min(ret.y, ret2.y), Math.abs(ret2.x-ret.x), Math.abs(ret2.y-ret.y) );
            ctx.stroke();
        }

        if ( $("#ACwall").val()== 2 ) {
            ctx.beginPath();
            ctx.fillStyle = "red";
            ret = this.meter2canvas( 1, 2 , 2);
            ret2 = this.meter2canvas( 2.2 , 2.3, 2);
            ctx.fillRect( Math.min(ret.x, ret2.x), Math.min(ret.y, ret2.y), Math.abs(ret2.x-ret.x), Math.abs(ret2.y-ret.y) );
            ctx.stroke();
        }
        if ( $("#ACwall").val()== 3) {
            ctx.beginPath();
            ctx.fillStyle = "red";
            ret = this.meter2canvas( 1, 2 , 3);
            ret2 = this.meter2canvas( 2.2 , 2.3, 3);
            ctx.moveTo(200+(Math.min(ret.x, ret2.x))/2, Math.min(ret.y, ret2.y)+(400-Math.min(ret.x, ret2.x))/2);
            ctx.lineTo(200+(Math.min(ret.x, ret2.x))/2, Math.min(ret.y, ret2.y)+(400-Math.min(ret.x, ret2.x))/2+40);
            ctx.lineTo(200+(Math.max(ret.x, ret2.x))/2, Math.min(ret.y, ret2.y)+(400-Math.max(ret.x, ret2.x))/2+40);
            ctx.lineTo(200+(Math.max(ret.x, ret2.x))/2, Math.min(ret.y, ret2.y)+(400-Math.max(ret.x, ret2.x))/2);
            ctx.fill();
            ctx.stroke();
        }

        // left
        ctx = this.canvas[0].ctxlayout;
        ctx.beginPath();
        ctx.clearRect(0,0,399,399);
        ctx.strokeStyle = "black";
        ctx.fillStyle = color_wall;
        ret = this.meter2canvas( 0, 0 , 3);
        ret2 = this.meter2canvas( size_z, size_y , 3);
        ctx.fillRect( Math.min(ret.x, ret2.x), Math.min(ret.y, ret2.y), Math.abs(ret2.x-ret.x), Math.abs(ret2.y-ret.y) );
        ctx.rect( Math.min(ret.x, ret2.x), Math.min(ret.y, ret2.y), Math.abs(ret2.x-ret.x), Math.abs(ret2.y-ret.y) );
        ctx.stroke();

        ctx.fillStyle = "black";
        ctx.font = "24px 'ＭＳ Ｐゴシック'";
        ctx.fillText("X窓面", 10, 40, 300);
        ctx.stroke();

        ctx.beginPath();
        ctx.fillStyle = color_window;
        ret = this.meter2canvas( $("#WindowZr").val(), $("#WindowYr").val() , 3);
        ret2 = this.meter2canvas( $("#WindowZr").val() *1+$("#WindowWr").val() *1,  $("#WindowYr").val()*1 + $("#WindowHr").val()*1 , 3);
        ctx.fillRect( Math.min(ret.x, ret2.x), Math.min(ret.y, ret2.y), Math.abs(ret2.x-ret.x), Math.abs(ret2.y-ret.y) );
        ctx.stroke();
        if ( $("#ACwall").val()== 1 ) {
            ctx.beginPath();
            ctx.fillStyle = "red";
            ret = this.meter2canvas( 1, 2, 3);
            ret2 = this.meter2canvas( 2.2 , 2.3, 3);
            ctx.fillRect( Math.min(ret.x, ret2.x), Math.min(ret.y, ret2.y), Math.abs(ret2.x-ret.x), Math.abs(ret2.y-ret.y) );
            ctx.stroke();
        }
    }

    //左下からの実距離mをcanvas座標(左上から）に変換する
    meter2canvas = function( x, y, xyz ) {
        var ret = [];
        var dpm = 1 / Math.max( size_x/dotx, size_y/doty, size_z/dotz);	// dot/meter

        if ( xyz == 2 ) {	//xy軸（正面）
            ret.x = x  * dpm;
            ret.y = doty - y * dpm;
        } else  if ( xyz == 1 ) {	//zx軸（平面）
            ret.x = x  * dpm;
            ret.y = ( size_z - y ) * dpm ;
        } else {	//yz軸（左面）
            ret.x = dotz - ( size_z - x ) * dpm;
            ret.y = doty - y * dpm;
        }
        return ret;
    }


}