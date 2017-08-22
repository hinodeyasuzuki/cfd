<?php
session_start();

if ( $_SESSION["code2"] != $_GET["p"] ) {
	die();
}

$randval2 = mt_rand();
$_SESSION["code2"] = $randval2;

readfile("./hiddenpage/cfdcalc.min.js");


