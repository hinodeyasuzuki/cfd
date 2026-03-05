<html>
<head>
  <title>空気の流れ3Dシミュレーション：設定サンプル</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 20px;
      max-width:1200px;
      margin:0 auto 0;
    }
    .video{
      text-align: center;
    }
    h1 {
      font-size: 1.5em;
    }
    h2 {
      font-size: 1.2em;
    }
    p {
      font-size: 1em;
      margin-left:2em;
    }
    hr {
      margin: 20px 0;
    }
    .right{
      text-align:right;
    }
  </style>
</head>
<body>
  <h1>空気の流れ3Dシミュレーション</h1>
  <p class="right">　有限会社ひのでやエコライフ研究所 2026年3月5日</p>
  <ul>
      <li><a href="./index.html">シミュレーションソフト Ver.3 (2026/03/04)</a><br />
      部屋設計と、結果表示を同じ3D回転座標で操作・閲覧することができます。
      <br>&nbsp;
      </li>
      
      <li><a href="./cfd2025/index.html">シミュレーションソフト Ver.2</a>　<a href="./cfd2025/voxel/">▶3D部屋構造設定ソフト</a><br />
      　シミュレーションソフトでも比較条件など、任意の設定ができます。3D部屋構造設定ソフトでマインクラフト風に設計して、ファイルを通じてシミュレーションソフトに読み込むこともできます。計算はリアルタイムでシミュレーション結果がアニメーションで表示されます。
      <br>&nbsp;
      </li>
      <li><a href="./cfd2020">旧版シミュレーションソフト ver1.77以前</a><br>
      　昔のDOSソフトのような操作性です。何をしているのかはわかりやすく、安定しています。
      <br>&nbsp;
    </li>
  </ul>


  <div class="video">
    <iframe width="640" height="480" src="https://www.youtube.com/embed/IeOZPcOplO4?si=_xlLywIFsVd53mTo" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
  </div>
  <div class="video">
    <iframe width="640" height="480" src="https://www.youtube.com/embed/jyDNxVD4fVQ?si=U2w_1bYNxS-ZFzKd" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
  </div>


  <hr>
  <h1>空気の流れ3Dシミュレーション：設定済みシナリオ(Ver.2での実行)</h1>

<?php

$url = './cfd2025/index.html';

$params = [
  [
    "name" => "エアコンの風速の強弱の違い",
    "caption" => "8畳間、風速3m/sと1m/sの違い。弱風では床まで風が届かない。",
    "json" => '{"setval":{"maxtime":40000,"maxtime_minute":20,"delta_t":0.01,"batch_sec":2,"realX":3.6,"realY":2.4,"realZ":3.6,"maxreal":3,"canvasfieldX":400,"canvasfieldY":266.6666666666667,"nMeshX":12,"nMeshY":8,"nMeshZ":12,"InsidePhi":10,"ObsPhi":10,"InletPhi":5,"FloorPhi":10,"WindowYr":0.9,"WindowHr":0.9,"WindowZr":0.9,"WindowWr":0.9,"Window2Yr":0.9,"Window2Hr":0.9,"Window2Xr":0.5,"Window2Wr":2,"ACwall":3,"ACwind":3,"ACheat":true,"ACdir":1,"CirculatorWind":0,"windowKset":6,"wallKset":2.5,"atrium":false,"floor":1},"setval2":{"maxtime":40000,"maxtime_minute":20,"delta_t":0.01,"batch_sec":3.9506172839506175,"realX":3.6,"realY":2.4,"realZ":3.6,"maxreal":3,"canvasfieldX":400,"canvasfieldY":266.6666666666667,"nMeshX":12,"nMeshY":8,"nMeshZ":12,"InsidePhi":10,"ObsPhi":10,"InletPhi":5,"FloorPhi":10,"WindowYr":0.9,"WindowHr":0.9,"WindowZr":0.9,"WindowWr":0.9,"Window2Yr":0.9,"Window2Hr":0.9,"Window2Xr":0.5,"Window2Wr":2,"ACwall":3,"ACwind":"1","ACheat":true,"ACdir":1,"CirculatorWind":0,"windowKset":6,"wallKset":2.5,"atrium":false,"floor":1},"graph":{"temperature":[11,23],"colordelete":[false,false],"arrowunit_multi":3,"startfix":false,"onlytemp":false,"showz":false,"layerz":6,"pararel":2}}',
  ],
  [
    "name" => "広い部屋での、エアコンの風速設定の違い",
    "caption" => "15畳間、風速自動と弱1m/sの違い。3m/sの風速でもエアコンの反対側の床には暖風が届かない。",
    "json" => '{"setval":{"maxtime":40000,"maxtime_minute":20,"delta_t":0.01,"batch_sec":7.5,"realX":3.6,"realY":2.4,"realZ":3.6,"maxreal":3,"canvasfieldX":400,"canvasfieldY":266.6666666666667,"nMeshX":12,"nMeshY":8,"nMeshZ":12,"InsidePhi":10,"ObsPhi":10,"InletPhi":5,"FloorPhi":10,"WindowYr":0.9,"WindowHr":0.9,"WindowZr":0.9,"WindowWr":0.9,"Window2Yr":0.9,"Window2Hr":0.9,"Window2Xr":0.5,"Window2Wr":2,"ACwall":3,"ACwind":3,"ACheat":true,"ACdir":1,"CirculatorWind":0,"windowKset":6,"wallKset":2.5,"atrium":false,"floor":1},"setval2":{"maxtime":40000,"maxtime_minute":20,"delta_t":0.01,"batch_sec":7.5,"realX":3.6,"realY":2.4,"realZ":3.6,"maxreal":3,"canvasfieldX":400,"canvasfieldY":266.6666666666667,"nMeshX":12,"nMeshY":8,"nMeshZ":12,"InsidePhi":10,"ObsPhi":10,"InletPhi":5,"FloorPhi":10,"WindowYr":0.9,"WindowHr":0.9,"WindowZr":0.9,"WindowWr":0.9,"Window2Yr":0.9,"Window2Hr":0.9,"Window2Xr":0.5,"Window2Wr":2,"ACwall":3,"ACwind":"1","ACheat":true,"ACdir":1,"CirculatorWind":0,"windowKset":6,"wallKset":2.5,"atrium":false,"floor":1},"graph":{"temperature":[11,23],"colordelete":[false,false],"arrowunit_multi":3,"startfix":false,"onlytemp":false,"showz":false,"layerz":6,"pararel":2}}',
  ],
  [
    "name" => "窓の断熱の違い（流れ表示）",
    "caption" => "シングルガラス（左）は冷気が床をつたって入ってくる。",
    "json" => '{"setval":{"maxtime":40000,"maxtime_minute":120,"delta_t":0.005,"batch_sec":227.8125,"realX":3.6,"realY":2.4,"realZ":3.6,"maxreal":3,"canvasfieldX":400,"canvasfieldY":266.6666666666667,"nMeshX":12,"nMeshY":8,"nMeshZ":12,"InsidePhi":18,"ObsPhi":18,"InletPhi":5,"FloorPhi":18,"WindowYr":0.2,"WindowHr":1.8,"WindowZr":0.5,"WindowWr":2,"Window2Yr":0.2,"Window2Hr":1.8,"Window2Xr":0.5,"Window2Wr":2,"ACwall":4,"ACwind":0,"ACheat":true,"ACdir":1,"CirculatorWind":0,"windowKset":6,"wallKset":2.5,"atrium":false,"title":"200×200","floor":1},"setval2":{"maxtime":40000,"maxtime_minute":60,"delta_t":0.005,"batch_sec":227.8125,"realX":3.6,"realY":2.4,"realZ":3.6,"maxreal":3,"canvasfieldX":400,"canvasfieldY":266.6666666666667,"nMeshX":12,"nMeshY":8,"nMeshZ":12,"InsidePhi":18,"ObsPhi":18,"InletPhi":5,"FloorPhi":18,"WindowYr":0.2,"WindowHr":1.8,"WindowZr":0.5,"WindowWr":2,"Window2Yr":0.2,"Window2Hr":1.8,"Window2Xr":0.5,"Window2Wr":2,"ACwall":4,"ACwind":0,"ACheat":true,"ACdir":1,"CirculatorWind":0,"windowKset":3,"wallKset":0.6,"atrium":false,"title":"200×200","floor":1},"graph":{"temperature":[12,19],"colordelete":[false,false],"arrowunit_multi":0,"startfix":false,"onlytemp":false,"showz":false,"layerz":6,"pararel":2}}',
  ],
  [
    "name" => "窓の断熱の違い（温度分布表示）",
    "caption" => "シングルガラス（左）は冷気が床をつたって入ってくる。",
    "json" => '{"setval":{"maxtime":40000,"maxtime_minute":120,"delta_t":0.005,"batch_sec":341.71875,"realX":3.6,"realY":2.4,"realZ":3.6,"maxreal":3,"canvasfieldX":400,"canvasfieldY":266.6666666666667,"nMeshX":12,"nMeshY":8,"nMeshZ":12,"InsidePhi":18,"ObsPhi":18,"InletPhi":5,"FloorPhi":18,"WindowYr":0.2,"WindowHr":1.8,"WindowZr":0.5,"WindowWr":2,"Window2Yr":0.2,"Window2Hr":1.8,"Window2Xr":0.5,"Window2Wr":2,"ACwall":4,"ACwind":0,"ACheat":true,"ACdir":1,"CirculatorWind":0,"windowKset":6,"wallKset":2.5,"atrium":false,"title":"200×200","floor":1},"setval2":{"maxtime":40000,"maxtime_minute":60,"delta_t":0.005,"batch_sec":341.71875,"realX":3.6,"realY":2.4,"realZ":3.6,"maxreal":3,"canvasfieldX":400,"canvasfieldY":266.6666666666667,"nMeshX":12,"nMeshY":8,"nMeshZ":12,"InsidePhi":18,"ObsPhi":18,"InletPhi":5,"FloorPhi":18,"WindowYr":0.2,"WindowHr":1.8,"WindowZr":0.5,"WindowWr":2,"Window2Yr":0.2,"Window2Hr":1.8,"Window2Xr":0.5,"Window2Wr":2,"ACwall":4,"ACwind":0,"ACheat":true,"ACdir":1,"CirculatorWind":0,"windowKset":3,"wallKset":0.6,"atrium":false,"title":"200×200","floor":1},"graph":{"temperature":[12,16],"colordelete":[false,true],"arrowunit_multi":0,"startfix":false,"onlytemp":true,"showz":false,"layerz":6,"pararel":2}}',
  ],
  [
    "name" => "部屋の温度がやや高めの場合には、エアコン弱運転でも機能するか",
    "caption" => "室温16℃開始の場合も、あまり違いがない。風を強くすることが重要。",
    "json" => '{"setval":{"maxtime":40000,"maxtime_minute":20,"delta_t":0.005,"batch_sec":50.625,"realX":3.6,"realY":2.4,"realZ":2.7,"maxreal":3,"canvasfieldX":400,"canvasfieldY":266.6666666666667,"nMeshX":12,"nMeshY":8,"nMeshZ":9,"InsidePhi":16,"ObsPhi":10,"InletPhi":5,"FloorPhi":16,"WindowYr":0.9,"WindowHr":0.9,"WindowZr":0.9,"WindowWr":0.9,"Window2Yr":0.9,"Window2Hr":0.9,"Window2Xr":0.5,"Window2Wr":2,"ACwall":3,"ACwind":1,"ACheat":true,"ACdir":1,"CirculatorWind":0,"windowKset":6,"wallKset":2.5,"atrium":false,"floor":1},"setval2":{"maxtime":40000,"maxtime_minute":20,"delta_t":0.005,"batch_sec":50.625,"realX":3.6,"realY":2.4,"realZ":2.7,"maxreal":3,"canvasfieldX":400,"canvasfieldY":266.6666666666667,"nMeshX":12,"nMeshY":8,"nMeshZ":9,"InsidePhi":10,"ObsPhi":10,"InletPhi":5,"FloorPhi":10,"WindowYr":0.9,"WindowHr":0.9,"WindowZr":0.9,"WindowWr":0.9,"Window2Yr":0.9,"Window2Hr":0.9,"Window2Xr":0.5,"Window2Wr":2,"ACwall":3,"ACwind":1,"ACheat":true,"ACdir":1,"CirculatorWind":0,"windowKset":6,"wallKset":2.5,"atrium":false,"floor":1},"graph":{"temperature":[15,20],"colordelete":[false,false],"arrowunit_multi":2,"startfix":false,"onlytemp":false,"showz":false,"layerz":4,"pararel":2}}',
  ],
  [
    "name" => "吹き抜けがある場合のエアコン暖房",
    "caption" => "15畳部屋で左が吹き抜けあり。吹き抜けがあるほうが消費電力が多くなるが、2Fも一定暖まる。吹き抜けなしも、エアコンと反対側の床にはなかなか暖気が届かない状態で、温度設定で止まる。温度表示にチェックしても面白いです。",
    "json" => '{"setval":{"maxtime":40000,"maxtime_minute":20,"delta_t":0.005,"batch_sec":0.6584362139917695,"realX":5.4,"realY":4.8,"realZ":4.5,"maxreal":3,"canvasfieldX":400,"canvasfieldY":355.55555555555554,"nMeshX":13,"nMeshY":16,"nMeshZ":11,"InsidePhi":10,"ObsPhi":10,"InletPhi":5,"FloorPhi":10,"WindowYr":0.9,"WindowHr":0.9,"WindowZr":0.9,"WindowWr":0.9,"Window2Yr":0.9,"Window2Hr":0.9,"Window2Xr":0.5,"Window2Wr":2,"ACwall":3,"ACwind":3,"ACheat":true,"ACdir":1,"CirculatorWind":0,"windowKset":6,"wallKset":2.5,"atrium":true,"floor":2},"setval2":{"maxtime":40000,"maxtime_minute":20,"delta_t":0.005,"batch_sec":0.6584362139917695,"realX":5.4,"realY":4.8,"realZ":4.5,"maxreal":3,"canvasfieldX":400,"canvasfieldY":355.55555555555554,"nMeshX":13,"nMeshY":16,"nMeshZ":11,"InsidePhi":10,"ObsPhi":10,"InletPhi":5,"FloorPhi":10,"WindowYr":0.9,"WindowHr":0.9,"WindowZr":0.9,"WindowWr":0.9,"Window2Yr":0.9,"Window2Hr":0.9,"Window2Xr":0.5,"Window2Wr":2,"ACwall":3,"ACwind":3,"ACheat":true,"ACdir":1,"CirculatorWind":0,"windowKset":6,"wallKset":2.5,"atrium":false,"floor":2},"graph":{"temperature":[12,20],"colordelete":[true,false],"arrowunit_multi":2,"startfix":false,"onlytemp":false,"showz":false,"layerz":5,"pararel":2}}',
  ],
  [
    "name" => "冷房の風は横向きか下向きか",
    "caption" => "冷房の場合は床を伝わるので、いずれでも部屋全体を冷やせる。ただし横向きのほうが温度むらが少ない",
    "json" => '{"setval":{"maxtime":40000,"maxtime_minute":20,"delta_t":0.005,"batch_sec":22.5,"realX":5.4,"realY":2.4,"realZ":4.5,"maxreal":3,"canvasfieldX":400,"canvasfieldY":177.7,"nMeshX":13,"nMeshY":8,"nMeshZ":11,"InsidePhi":30,"ObsPhi":30,"InletPhi":35,"FloorPhi":30,"WindowYr":0.9,"WindowHr":0.9,"WindowZr":0.9,"WindowWr":0.9,"Window2Yr":0.9,"Window2Hr":0.9,"Window2Xr":0.5,"Window2Wr":2,"ACwall":3,"ACwind":1,"ACheat":false,"ACdir":2,"CirculatorWind":0,"windowKset":6,"wallKset":2.5,"atrium":false,"title":"35℃","floor":1},"setval2":{"maxtime":40000,"maxtime_minute":20,"delta_t":0.005,"batch_sec":22.5,"realX":5.4,"realY":2.4,"realZ":4.5,"maxreal":3,"canvasfieldX":400,"canvasfieldY":177.7,"nMeshX":13,"nMeshY":8,"nMeshZ":11,"InsidePhi":30,"ObsPhi":30,"InletPhi":35,"FloorPhi":30,"WindowYr":0.9,"WindowHr":0.9,"WindowZr":0.9,"WindowWr":0.9,"Window2Yr":0.9,"Window2Hr":0.9,"Window2Xr":0.5,"Window2Wr":2,"ACwall":3,"ACwind":1,"ACheat":false,"ACdir":1,"CirculatorWind":0,"windowKset":6,"wallKset":2.5,"atrium":false,"title":"35℃","floor":1},"graph":{"temperature":[17,29],"colordelete":[false,false],"arrowunit_multi":2,"startfix":false,"onlytemp":false,"showz":false,"layerz":5,"pararel":2}}',
  ],

    
];

echo '<ul>';
foreach ($params as $param) {
  echo '<li><a href="' . $url .'?param='. urlencode($param['json']) . '">' . $param['name'] . '</a></li>';
  echo '<p>' . $param['caption'] . '</p><br></li>';
}
echo '</ul>';

?>

<hr>
<h2>技術情報</h2>
<p>　パソコンやスマホ上でブラウザのJavaScriptで計算しています。</p>
<p>　メッシュが多い（目が細かい、もしくは計算体積が大きい）場合、風速が速い（エアコンシミュレーション）場合には時間がかかります。画面表示は1秒以内に更新するようになっています。シミュレート対象内では、表示の間に10分進む場合もあれば、1秒程度しか進まない場合もあります。</p>
<p>　計算方法は、H.K.Versteeg (著), W.Malalasekera (著), 松下 洋介 (翻訳), 齋藤 泰洋 (翻訳)：<a href="https://www.amazon.co.jp/%E6%95%B0%E5%80%A4%E6%B5%81%E4%BD%93%E5%8A%9B%E5%AD%A6-%E7%AC%AC2%E7%89%88-H-K-Versteeg/dp/4627919727/ref=asc_df_4627919727/?tag=jpgo-22&linkCode=df0&hvadid=707442558912&hvpos=&hvnetw=g&hvrand=3455289300825250417&hvpone=&hvptwo=&hvqmt=&hvdev=c&hvdvcmdl=&hvlocint=&hvlocphy=9198729&hvtargid=pla-524368042710&psc=1&mcid=ecde72957f36357d8661c871f934fd50&th=1&psc=1&gad_source=1">数値流体力学（森北出版、2011)</a>などを参考に作成しています。</p>
</body>
</html>
