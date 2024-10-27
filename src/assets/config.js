// config.js
//    program setting

export class Config {

  constructor() {
    //selected value
    this.val ={
      //形式定義
      INSIDE : 1,		//室内空気
      BOTTOM : 2,		//床
      TOP : 3,		  //天井
      WINDOW : 4,		//窓
      OUTSIDE : 5,	//外壁
      SIDE : 6,		  //屋内壁
      OBSTACLE : 7,	//障害物
      AC : 8,			  //エアコン（下面から送風、上面から吸収）
      CL : 9,			  //サーキュレータ（Xプラスから吸収、上面Yから送風）

      //方向
      x : 0,
      y : 1,
      z : 2,

      //エアコン吹き出しサイズ m
      ac_width : 0.8,
      ac_height : 0.2,
    };
  }
}
