<?php
session_start();

if ( $_SESSION["code"] != $_GET["p"] ) {
	die();
}

$randval = mt_rand();
$_SESSION["code"] = $randval;

readfile("./hiddenpage/cfdview.js");


