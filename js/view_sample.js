var canvas = document.getElementById('myCanvas');
var ctx = canvas.getContext('2d');

//画面移動
var posx = 0;
var posy = 0;
function move(x,y){
    posx += x;
    posy += y;
    ctx.clearRect(0,0,600,600);
    drawArrow();
}


//参考値(結果として得られた配列）
//XYZ各軸方向のサイズ
var xdatasize = data.Vel[0].length;
var ydatasize = data.Vel[0][0].length;
var zdatasize = data.Vel[0][0][0].length;   //あとまわし

//温度の最大値、最小値
var tmax = -100;
var tmin = 100;
for (var i = 0; i < xdatasize; i++) {
    for (var j = 0; j < ydatasize; j++) {
        for (var k = 0; k < zdatasize; k++) {
            if (data.Phi[i][j][k] > tmax) {
                tmax = data.Phi[i][j][k];
            }
            if (data.Phi[i][j][k] < tmin) {
                tmin = data.Phi[i][j][k];
            }
        }
    }
}
console.log(tmax);
console.log(tmin);

//速度の最大値
var vmax = 0;
for (var i = 0; i < xdatasize; i++) {
    for (var j = 0; j < ydatasize; j++) {
        for (var k = 0; k < zdatasize; k++) {
            //その点での速さを求める Math.sqrtは平方根をとる関数
            var temp = Math.sqrt(data.Vel[0][i][j][k] * data.Vel[0][i][j][k] + data.Vel[1][i][j][k] * data.Vel[1][i][j][k] + data.Vel[2][i][j][k] * data.Vel[2][i][j][k]);
            if (temp > vmax) {
                vmax = temp;
            }
        }
    }
}
console.log(vmax);


// 600×600
ctx.beginPath();
ctx.fillStyle = "#aaaaaa";
ctx.fillRect(0,0,600,600);
ctx.stroke();

//ctx.strokeStyle
//ctx.fillStyle = "#00FFFF";

// ctx.beginPath();
// ctx.fillStyle = "#000000";
// ctx.fillRect(580,0,20,20);
// ctx.stroke();

//ctx.fillRect(x横位置,y縦位置,w横の長さ,h縦の長さ);

// data.Phi[i][j][7] 温度


var radious = Math.min(600/xdatasize, 600/ydatasize) /2;

function getColor(temp){
    var r = 255;
    var g = 0;
    var b = 255;
    b = 255 - Math.floor((temp - tmin) / (tmax - tmin) * 255);
    r = Math.floor((temp - tmin) / (tmax - tmin) * 255);
    var c = ((r*256 + g)*256 + b).toString(16);
    return "#" + ("0000" + c).slice(-6);
}

function drawArrow(time){
    ctx.clearRect(0,0,600,600);
    for (var i = 0; i < xdatasize; i++) {
        for (var j = 0; j < ydatasize; j++) {
           for (var k = 0; k < zdatasize; k++) {

                // if ( k<zdatasize-2) continue;
                // ctx.beginPath();
                // ctx.fillStyle = "#000000";
                // ctx.fillRect(i*60+10,j*60+10,40,20);
                // ctx.stroke();
                
                ctx.beginPath();
                ctx.fillStyle = getColor(data.Phi[i][j][k]);
                var layer = zdatasize - k - 1;
                var scale = (50+layer)/50;

                //矢印の長さ、角度を求める
                var vx = data.Vel[0][i][j][k];
                var vy = data.Vel[1][i][j][k];
                var speed = Math.sqrt(vx*vx + vy*vy);
                //Math.atan2() 関数は、Math.atan2(y, x) に対して点 (0, 0) から点 (x, y) までの半直線と、正の x 軸の間の平面上での角度 (ラジアン単位) を返す
                var angle = Math.atan2(vy,vx);
                var arrowlength = speed/vmax*50;

                //矢印をどこから書いてどこまで書くのかを求める
                var centerX = scale*i*400/xdatasize+200 - layer*(100/zdatasize+posx);
                var centerY = scale*(400-(j+1)*400/ydatasize)+10 + layer*(100/zdatasize+posy);
                var startX = centerX + ( (vx*time/0.6) % 1 -0.5 ) * 400/xdatasize;
                var startY = centerY - ( (vy*time/0.6) % 1 -0.5 ) * 400/ydatasize;
                var endX = startX + vx/vmax*20;
                var endY = startY - vy/vmax*20;

                //風の矢印を描画
                ctx.beginPath();
                ctx.strokeStyle = getColor(data.Phi[i][j][k]);
                ctx.moveTo(startX,startY);
                ctx.lineTo(endX,endY);
                ctx.stroke()
                
                //矢印の先端を書く
                ctx.beginPath()
                if( vx == 0 && vy == 0 ) {
                    ctx.fillRect(
                    (scale*i*400/xdatasize+200 - layer*(100/zdatasize+posx)),
                    (scale*(400-(j+1)*400/ydatasize)+10 + layer*(100/zdatasize+posy)),
                    2,2);
                } else {
                    ctx.strokeStyle = getColor(data.Phi[i][j][k]);
                    ctx.moveTo(endX,endY);
                    ctx.lineTo(endX+5*Math.cos(angle+15), endY-5*Math.sin(angle+15));
                    ctx.moveTo(endX,endY)
                    ctx.lineTo(endX+5*Math.cos(angle-15), endY-5*Math.sin(angle-15));
                }
                ctx.stroke();
            }
        }
    }
}
            
function draw(){
     ctx.clearRect(0,0,600,600)
     var count = 0;
     drawArrow(count++)
    requestAnimationFrame(draw)
    if( count >50 ){
        cancelAnimationFrame(draw)
    }
}

                // ctx.arc(i*600/xdatasize+300/xdatasize,
                //     j*600/ydatasize+300/ydatasize,
                //     (data.Phi[i][j][7] - tmin ) / ( tmax - tmin ) * radious, 
                //     0, 2 * Math.PI);