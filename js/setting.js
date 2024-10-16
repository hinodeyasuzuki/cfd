//グローバル変数定義

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

//方向
var x = 0;
var y = 1;
var z = 2;

//表示ドット数
var dotx = 400;
var doty = 400;
var dotz = 400;

//初期値
var nMeshX = 12;			//メッシュ数(入力値で変更)
var nMeshY = 8;
var nMeshZ = 9;
var size_x = 3.6;			//物理スケール （m）
var size_y = 2.4;
var size_z = 2.7;

//エアコン吹き出しサイズ m
var ac_width = 0.8;
var ac_height = 0.2;

//ctxサイズ
var cx = 400;
var cy = 400;

//計算バッチの時間(秒) 5-20
var batch_sec = 20;

//1メッシュあたりの画面上のドット数（軸ごと）
var mesux, mesuy, mesuz;

//メッシュユニットサイズ計算(メッシュサイズが変更となった場合）-------------------
meshUnitCalc = function(){
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
