<?php
// cfd main code
//					Hinodeya Insittute for Ecolife.co. 2016
//	js file is defined in index.php
//
//--div structure--------------------------
//	.header
//	.field
//		#graphs
//			wall
//			wall_base
//			wall2
//			wall2_base
//			floor
//			floor_base
//		table
//	.control	
//		.tab
//		.tabcontents #tab1c
//		.tabcontents #tab2c
//		.tabcontents #tab3c
//	.detail_matrix
//	.footer
//
//
?><!DOCTYPE html>
<html lang="ja">
<head>
		<meta charset="UTF-8">
		<title>室内空気の流れ計算（エアコン、送風、断熱の効果）</title>
		<link rel="stylesheet" href="" media="screen">
		<link rel="stylesheet" href="https://ajax.googleapis.com/ajax/libs/jqueryui/1.14.0/themes/smoothness/jquery-ui.css">
		<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js"></script>
		<script src="https://ajax.googleapis.com/ajax/libs/jqueryui/1.14.0/jquery-ui.min.js"></script>
		<script src="./js/cfdcalc.js"></script>
		<script src="./js/cfdview.js"></script>
		<link href="./cfd.css" rel="stylesheet" type="text/css" />

</head>

<body>

<div class="header">

<?php
if( strcmp($_SERVER['HTTP_HOST'] , 'localhost') != 0 ){
?>
<!-- google translation -->
<div style="text-align:right;" id="google_translate_element"></div><script type="text/javascript">
function googleTranslateElementInit() {
  new google.translate.TranslateElement({pageLanguage: 'ja', includedLanguages: 'de,en,es,fr,id,ko,pt,ru,th,zh-CN,zh-TW', layout: google.translate.TranslateElement.InlineLayout.SIMPLE}, 'google_translate_element');
}
</script><script type="text/javascript" src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"></script>
<?php
}
?>

	<h1>室内空気の流れ計算（エアコン、送風、断熱の効果）</h1>

	<div style="text-align: right;top: -20px;position: relative;line-height: 0px;"><a href="about.html">[解説]</a>  <a href="https://www.hinodeya-ecolife.com/">有限会社ひのでやエコライフ研究所</a> </div>
</div><!--// header -->


<!-----------------------　field - display result　-------------->
<div class="field">

<div id="graphs"><!-- display wall graphs -->

	<div class="gtab">
		<span id="gtab1" class="selected" onclick="gtabChange(1);">レイアウト</span>
		<span id="gtab2" onclick="gtabChange(2);">結果</span>
	</div>

	<!-- wall left side with window -->
	<div class="wall vresult" id="left">
		<div >
			<canvas class="vresult" id="graph3" width="400" height="400"></canvas>
		</div>
	</div>

	<div class="wall_base ">
		<div class="setting" >
			<canvas id="window_in_wall" width="400" height="400"></canvas>
		</div>
		<canvas  class="vresult" id="graph3base" width="400" height="400"></canvas>
	</div>

	<!-- wall2 front view of wall, code is top -->
	<div class="wall2 vresult" id="top">
		<div>
			<canvas  class="vresult" id="graph2" width="400" height="400"></canvas>
		</div>
	</div>

	<div class="wall2_base">
		<div class="setting">
			<canvas  id="window_in_wall2" width="400" height="400"></canvas>
		</div>
		<canvas  class="vresult" id="graph2base" width="400" height="400"></canvas>
	</div>

	
	<!-- floor -->
	<div class="floor vresult" id="floor">
		<div>
			<canvas  class="vresult" id="graph" width="400" height="400"></canvas>
		</div>
	</div>

	<div class="floor_base ">
		<div class="setting">
			<canvas  id="window_in_floor" width="400" height="400"></canvas>
		</div>
		<canvas  class="vresult" id="graphbase" width="400" height="400"></canvas>
	</div>
</div>

	<!-- legend -->
	<table border=0 style="position:absolute;top:0px;">
	<tr>
		<td>
		<canvas id="graph4" width="600" height="40" style="position:relative"></canvas>
		<table border=0><tr>
			<td width="120px">10℃←</td>
			<td width="100px">15℃</td>
			<td width="80px" align="right">→25℃</td>
			<td width="250px">　　　1m/sの長さ</td>
		</tr></table>
		</td>
		<td></td>
	</tr>
	</table>


<div style="position:relative;top:700px;margin:10px;padding:10px;background-color:#fff;">
<h3>表示フィールドの概要</h3>
<p>　家屋のうちの、壁で囲われた直方体の一部屋を計算エリアとしています。表示では立方体の3面が表示されていますが、部屋のサイズに応じて実際に計算・表示されるのは、白色を除いた薄黄色の範囲です。表示サイズは最長軸の長さに合わせて自動的に調整されています。</p>
<p>　画面設定で、レイアウトと結果画面のレイヤー表示をON/OFFできます。レイアウト画面では、水色が窓、薄黄色が壁面と床面を表します。</p>
<p>　結果画面では、メッシュの色を温度、矢印の長さを風速で表示します。</p>
<p>　計算等に関する詳しい説明は、<a href="about.html">解説ページ</a>を参照してください。</p>
</div>

	
</div><!--// field with legend-->



<!----------------------- control - settings　-------------->

<div class="control">
	<div class="tab">
		<span id="tab1" class="selected" onclick="tabChange(1);">簡易設定</span>
		<span id="tab2" onclick="tabChange(2);">詳細設定</span>
		<span id="tab3" onclick="tabChange(3);">計算結果</span>
	</div>

	<!-- control - easy setting -->
	<div class="tabcontents" id="tab1c">
	<h2>簡易シナリオ設定</h2>
	<p>　条件設定を選択してください。必要に応じて「詳細設定」で確認・設定できます。</p>
	<div style="text-align:right;"><input type="button" value="計算開始" style="height:30px;" onclick="calcStart();"></div>
	<div id="senarioButtons"></div>
	</div>
	

	<!-- control - detail setting -->
	<div class="tabcontents" id="tab2c" style="display:none;">
	<h2>詳細設定値</h2>
	<p>　詳細な条件設定ができます。</p>
	<div style="text-align:right;"><input type="button" value="計算開始" style="height:30px;" onclick="calcStart();"></div>
	<table id="detailSet">
	<tr>
		<th>部屋横X(m)</th><td><input type="text" id="size_x" value="3"></td>
	</tr>
	<tr>
		<th>部屋高さY(m)</th><td><input type="text" id="size_y" value="3"></td>
	</tr>
	<tr>
		<th>部屋奥行Z(m)</th><td><input type="text" id="size_z" value="3"></td>
	</tr>
	<tr>
		<th>計算分割数X</th><td><input type="text" id="nMeshX" value="8"></td>
	</tr>
	<tr>
		<th>計算分割数Y</th><td><input type="text" id="nMeshY" value="8"></td>
	</tr>
	<tr>
		<th>計算分割数Z</th><td><input type="text" id="nMeshZ" value="8"></td>
	</tr>
	<tr>
		<th>屋外気温（℃）</th><td><input type="text" id="InletPhi" value="5"></td>
	</tr>
	<tr>
		<th>室内気温（℃）</th><td><input type="text" id="InsidePhi" value="17"></td>
	</tr>
	<tr>
		<th>床面温度（℃）</th><td><input type="text" id="FloorPhi" value="17"></td>
	</tr>

	<tr>
		<th>障害物温度（℃）</th><td><input type="text" id="ObsPhi" value="17"></td>
	</tr>

	<tr>
		<th>窓の断熱性能</th><td>
			<select id="windowKset">
				<option value="6">アルミ枠単板ガラス</option>
				<option value="3">アルミ枠複層ガラス</option>
				<option value="2">樹脂枠複層ガラス</option>
				<option value="1.5">樹脂枠Low-e複層ガラス</option>
			</select>
		</td>
	</tr>
	<tr>
		<th>外壁の断熱性能</th><td>
			<select id="wallKset">
				<option value="2.5">無断熱</option>
				<option value="1">グラスウール30mm</option>
				<option value="0.6">グラスウール50mm</option>
				<option value="0.3">グラスウール100mm</option>
				<option value="0.15">グラスウール200mm</option>
			</select>
		</td>
	</tr>
	<tr>
		<th>障害物設置</th><td>
			<select id="ObsSet">
				<option value=1>設置する</option>
				<option value=2>設置しない</option>
			</select>
		</td>
	</tr>
	<tr>
		<th>エアコン設置</th><td>
			<select id="ACwall">
				<option value=1>窓側</option>
				<option value=2>正面</option>
				<option value=3>右面</option>
				<option value=4 selected>設置しない</option>
			</select>
		</td>
	</tr>
	<tr>
		<th>エアコン風速(m/s)</th><td><input type="text" id="ACwind" value="2"></td>
	</tr>
	<tr>
		<th>サーキュレータ風速(m/s)</th><td><input type="text" id="CirculatorWind" value="0"></td>
	</tr>
	<tr>
		<th>最大計算時間（分）</th><td><input type="text" id="maxtime_minute" value="10"></td>
	</tr>
	<tr>
	<td colspan=2></td>
	</tr>
	</table>
	</div>

	<!-- control - calclation execute -->
	<div class="tabcontents" id="tab3c" style="display:none">
	<h2>計算実行状況</h2>
	<table border=0>
	<tr>
	<td>
		<input type="button" value="計算開始" style="height:30px;" onclick="calcStart();"><br>
	</td>
	<td>
		<div id="step">設定した条件で、計算を実行します。</div>
	</td>
	</tr>
	</table>
	</div>

	<!-- control - display setting ( common ) -->
	<h2>画面設定</h2>
	<p>　表示する内容とレイヤー（層）を変更できます。計算中でも変更可能です。</p>
	<table>
<!--
	<tr>
		<th>画面表示</th>
		<td>
			<input type="checkbox" id="v_settei" checked="checked" onclick="setteiviewChange();">レイアウト・設定画面<br>
			<input type="checkbox" id="v_result" onclick="resultviewChange();">結果画面
		</td>
	</tr>
-->
	<tr>
		<td><br>水平面の移動<br>
			<div id="layery"></div><br>
			<input type="button" value="　上　" onclick="layerup(1);"><br>
			↑<br>
			↓<br>
			<input type="button" value="　下　" onclick="layerup(-1);">
		</td>
		<td><br>正面の移動（奥行き）<br>
			<div id="layerz"></div><br>
			　　　　　<input type="button" value="　奥　" onclick="layerz(1);"><br>
			　　　　／<br>
			　　　／<br>
			<input type="button" value="　手前　" onclick="layerz(-1);">
		</td>
	</tr>
	<tr>
		<td>左側面の移動</td>
		<td><input type="button" value="　左　" onclick="layerx(-1);">←→<input type="button" value="　右　" onclick="layerx(1);"></td>
	</tr>
	<tr>
		<td>矢印の大きさ</td>
		<td><input type="button" value="　拡大　"  onclick="graphresize(0.7);">←→<input type="button" value="　縮小　" onclick="graphresize(1.3);"></td>
	</tr>
	</table>
	
	
</div><!--// control -->


<!-- detail setting not use -->
<div id="detail" style="display:none">
	<table border=0>
	<tr>
		<th>計算単位時間（秒）</th><td><input type="text" id="delta_t" value="0.3"></td>
		<th>最大計算回数</th><td><input type="text" id="maxtime" value="40000"></td>
		<th></th><td></td>
	</tr>
	<tr>
		<th>窓の腰高さ</th><td><input type="text" id="WindowYr" value="1"></td>
		<th>窓の高さ</th><td><input type="text" id="WindowHr" value="1"></td>
	</tr>
	<tr>
		<th></th><td></td>
		<th>窓の左からの位置</th><td><input type="text" id="WindowZr" value="1"></td>
		<th>窓の幅</th><td><input type="text" id="WindowWr" value="1"></td>
	</tr>
	<tr>
		<th>正面窓の腰高さ</th><td><input type="text" id="Window2Yr" value="0"></td>
		<th>正面窓の高さ</th><td><input type="text" id="Window2Hr" value="0"></td>
	</tr>
	<tr>
		<th></th><td></td>
		<th>正面窓の左からの位置</th><td><input type="text" id="Window2Xr" value="0"></td>
		<th>正面窓の幅</th><td><input type="text" id="Window2Wr" value="0"></td>
	</tr>
	<tr>
		<th>障害物のX座標</th><td><input type="text" id="ObsX1r" value="1"></td>
	</tr>
	<tr>
		<th>障害物のY高さ</th><td><input type="text" id="ObsYr" value="0.4"></td>
	</tr>
	<tr>
		<th>障害物のX厚さ</th><td><input type="text" id="ObsX2r" value="0.4"></td>
	</tr>
	<tr>
		<th>障害物のZ幅</th><td><input type="text" id="ObsZwr" value="1.5"></td>
	</tr>
	<tr>
		<th>障害物のZ位置</th><td><input type="text" id="ObsZ1r" value="0.5"></td>
	</tr>
	<tr>
		<th></th><td></td>
	</tr>
	<tr>
		<th></th><td></td>
	</tr>
	</table>
</div><!--// detail setting not use -->



<!-- detail result -->
<div class="detail_matrix">
	<p style="clear:both;"></p>
	<h2>計算結果の数値表  <input type="button" value="表示/非表示" onclick="$('#res').toggle();"></h2>
	<textarea id="res" style="display:none"  rows=20 cols=80></textarea>
</div><!--// detail_matrix -->


<!-- footer -->
<div class="footer">
	<hr>
	<div align="right">Ver.1.77 2024/9/27  (C)2015-2024 <a href="https://www.hinodeya-ecolife.com/">有限会社ひのでやエコライフ研究所</a> </div>
</div><!--// footer -->


<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-3WP4L1RRF1"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-3WP4L1RRF1');
</script>

</body>
</html>