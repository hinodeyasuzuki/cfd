<?php
// CFD Home air flow simulation 
//					Javascirpt  Hinodeya Insititute for Ecolife.co. 2016
//
//
// in order to read javascript and index_template.php
//
//
//  js is loaded by load.php, load2.php
//

session_start();

// read javascript code
function make_seed()
{
  list($usec, $sec) = explode(' ', microtime());
  return (float) $sec + ((float) $usec * 100000);
}
mt_srand(make_seed());
$randval = mt_rand();
$_SESSION["code"] = $randval;

$randval2 = mt_rand();
$_SESSION["code2"] = $randval2;

//save log
$fp = fopen("./log/logcfdindex.log", "a");
fwrite($fp, 
	date("Y-m-d H:i:s") . ", " .
	( isset($_SERVER['HTTP_X_FORWARDED_FOR']) ? gethostbyaddr($_SERVER['HTTP_X_FORWARDED_FOR']) : "") . ", ".
	( isset($_SERVER['HTTP_X_FORWARDED_FOR']) ? $_SERVER['HTTP_X_FORWARDED_FOR'] : "" ) . "\n"
);
fclose($fp);

include "index_template.php";
