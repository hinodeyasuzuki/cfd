//CFD�v�Z���C�����W�b�N
//�{�̂���worker�Ƃ��ČĂяo��
// copyright(C) 2015-2017  Hinodeya Insititute for Ecolife co.ltd. Yausufumi Suzuki
//
//�@�Ƃ��Ƃ����Ȃ��͌��Ă��܂��܂����ˁB��������ɂ͉��P�̋��͂����肢���܂��B
//
//�@�E3D�@���M�����[�i�q�A�t���N�V���i���X�e�b�v�ACIP�g�킸���㍷��
//�@�E�V�~�����[�V���������Ԃ�1�b���ƂɃf�[�^��Ԃ��A�ő厞�ԂŏI��
//
//�ۑ�
// �@Prs���͂��ɒ[�ɑ傫���Ȃ��Ă���->����
// �@�ǖʂƐ��������̑��x�����܂�Ă��܂�->�����I�Ƀ[���ɂ���B�G�A�R���͕ǂ��痣��
//
//
// packer��min�ɂ��Ă��烍�[�h
//

var fgAround = 2;				//1:���͂Ŏ��͂̉��x���g�� 2:���ω��x���g��
var Re = 1000.0;				//���C�m���Y��
var fgCalcTempAround = 2;		//���x�v�Z�@1:�ꎟ���x 2:���㍷���ł̕]��
var acv = 1;					//�G�A�R������ m/s�i���ݒ�j
var act = 5;					//�G�A�R�� �������i���ʂōČv�Z�j
var dir = 0.3;					//�G�A�R���p�x
var delta_t = 0.01;			//�^�C���X�e�b�v s  10���Ȃ�0.5,20����0.1(�����ϓ��j

var addair = true;				//�G�A�R���ɂ����� �ʏ�� true
var fix_coulant = true;		//coulant�����ɂ�鎩���^�C���X�e�b�v�ύX �ʏ��true
var coulant_min = 0.7;			//�@�ŏ��
var coulant_max = 0.8;			//  �ő��@1�Ŕ��U


var iteration = 100;		//�ő�␳�J��Ԃ���
var tolerance = 0.001;		//���e�덷

var totaltime = 0;			//�o�ߎ���
var acheatsum = 0;			//�G�A�R���o��(W)
var acheatcount = 0;		//�G�A�R���o��(W)
var sumheatleft = 0;		// left window heat loss
var sumheatfront = 0;		// front window heat loss
var heatleftcount = 0;

var Riw = 0.11;				//�������M�`����R�@��	�u�EK�^W
var Rif = 0.15;				//�������M�`����R�@��
var Ric = 0.09;				//�������M�`����R�@�V��

var sh_air = 1.006;				//��M�@��CJ/gK
var sh_obs = 0;					//�M�e�ʁ@��Q�� J/m3K
var sh_wall = 783000;			//�M�e�ʁ@�� J/m3K
var sh_ceil = 783000;			//�M�e�ʁ@�V�� J/m3K
var sh_floor = 783000;			//�M�e�ʁ@�� J/m3K
var sh_thick = 0.02;			//�M�e�ʂ��l��������� m �i2cm���x���K���j
var windowK = 6.0;				//�M�ї����@W/m2K
var wallK = 2.5;				//�M�ї����@W/m2K


//�e�ϔ�M�@
//�R���N���[�g�@ �@�@�@2013�@KJ/m3k
//�y�ǁ@�@�@�@�@ �@�@�@1327�@KJ/m3k
//�v���X�^�[�{�[�h�@�@	854�@KJ/m3k
//���@�@�@�@�@�@�@�@�@	783�@KJ/m3k
//�O���X�E�[�� 			420�@KJ/m3k


//�s�g�p�ݒ�
var flagExecute = 1;		//�����s
var Dd = 0.001	;			//�g�U�W���@m2/s
var nu = 0.000155;			//��C�̓��S���W�� m2/s
var rou = 1.293;			// kg/m3

//�v�Z����
var maxtime = 100;		//�ő��

var InsidePhi = 20;	//�������x
var ObsPhi =20;		//��Q���̉��x
var InletPhi = 10;	//���̊O�̉��x
var FloorPhi = 18;	//���̉��x

//���b�V��(�l�͏����l�j
var nMeshX = 8;
var nMeshY = 8;
var nMeshZ = 8;
var size_x = 3;			//�����X�P�[�� m
var size_y = 3;
var size_z = 3;


//���́i��C�̎��͂̉��x�Ƃ̍��jYUP��������Ƃ���
var g = 9.8;			// m/s2
var tz = 273.15;
var prsair = 0;	//101325;	//�W���C�� Pa N/m2

//�`����`
var INSIDE = 1;
var BOTTOM = 2;
var TOP = 3;
var WINDOW = 4;
var OUTSIDE = 5;
var SIDE = 6;
var OBSTACLE = 7;
var AC = 8;
var CL = 9;			//�T�[�L�����[�^�iX�v���X����z���A���Y���瑗���j

var x = 0;
var y = 1;
var z = 2;


//�v�Z�t�B�[���h
var meshtype;
var Phi;
var Prs;
var Vel;
var D;
var newF;
var tmp;

var delta_x ;
var delta_y ;
var delta_z ;

var delta_x2 ;
var delta_y2 ;
var delta_z2 ;

//���ʃO���t
var vmax = 1;
var tmax = 0;
var tmin = 0;

var CirculatorWind = 0;


//worker�Ăяo��========================
onmessage = function (event) {
  
	//�Ăяo�����̃p�����[�^�̐ݒ�
	var ret = event.data.val;
	var totaltime = 0;
	maxtime = ret.maxtime;
	maxtime_sec = ret.maxtime_minute * 60;
	delta_t = ret.delta_t;
	size_x = ret.size_x;
	size_y = ret.size_y;
	size_z = ret.size_z;
	nMeshX = ret.nMeshX;
	nMeshY = ret.nMeshY;
	nMeshZ = ret.nMeshZ;
	InsidePhi = ret.InsidePhi;
	ACwind = ret.ACwind;
	CirculatorWind = ret.CirculatorWind;
	windowK = ret.windowKset;
	wallK = ret.wallKset;
	ObsPhi = ret.ObsPhi;
	InletPhi = ret.InletPhi;
	FloorPhi = ret.FloorPhi;
	meshtype = event.data.meshtype;

	init();							//������

	//���ԃ��[�v
	for( var i=0 ; i<=maxtime ; i++ ) {
		var ret = calculate();		//�P���Ԍv�Z
		var heatin = {};
		totaltime += delta_t;
		if ( ret>0 ) break;
		if ( Math.round(totaltime/60) !=  Math.round((totaltime-delta_t)/60) ) {
			heatin.heatleftin = ( heatleftcount ? sumheatleft / heatleftcount : 0 );
			heatin.heatfrontin = ( heatleftcount ? sumheatfront / heatleftcount : 0 );
			//�V�~�����[�V����������1�����Ƃɒl��Ԃ�
			postMessage({ 
				"count": i,
				"totaltime": totaltime,
				"acheat": ( acheatcount ? acheatsum / acheatcount : 0 ),
				"heatin" : heatin,
				"Vel":Vel,
				"Phi":Phi,
				"Prs":Prs
			});
			sumheatleft = 0;
			sumheatfront = 0;
			acheatsum = 0;
			acheatcount = 0;
			heatleftcount = 0;
		}
		if ( maxtime_sec < totaltime ) break;
	}
	var count = i-1;

	//�I�����ɕԂ�
	heatin.heatleftin = ( heatleftcount ? sumheatleft / heatleftcount : 0 );
	heatin.heatfrontin = ( heatleftcount ? sumheatfront / heatleftcount : 0 );
	postMessage({ 
				"count": count,
				"totaltime": totaltime,
				"heatin" : heatin,
				"acheat": ( acheatcount ? acheatsum / acheatcount : 0 ),
				"Vel":Vel,
				"Phi":Phi,
				"Prs":Prs
	});

};


//�����ݒ�========================
function init(){
	//�t�B�[���h�T�C�Y
	var NUM_MAX_X = nMeshX+1;
	var NUM_MAX_Y = nMeshY+1;
	var NUM_MAX_Z = nMeshZ+1;

	//�t�B�[���h�̐ݒ�
	Phi = Array( NUM_MAX_X );
	Prs = Array( NUM_MAX_X );
	Vel = Array( 3 );
	tmp = Array( 3 );
	Vel[0] = Array( NUM_MAX_X );
	Vel[1] = Array( NUM_MAX_X );
	Vel[2] = Array( NUM_MAX_X );
	tmp[0] = Array( NUM_MAX_X );
	tmp[1] = Array( NUM_MAX_X );
	tmp[2] = Array( NUM_MAX_X );
	D = Array( NUM_MAX_X );
	newF = Array( NUM_MAX_X );
	for( var i=0 ; i<=NUM_MAX_X; i++ ){
		Phi[i] = Array( NUM_MAX_Y );
		Prs[i] = Array( NUM_MAX_Y );
		Vel[0][i] = Array( NUM_MAX_Y );
		Vel[1][i] = Array( NUM_MAX_Y );
		Vel[2][i] = Array( NUM_MAX_Y );
		tmp[0][i] = Array( NUM_MAX_Y );
		tmp[1][i] = Array( NUM_MAX_Y );
		tmp[2][i] = Array( NUM_MAX_Y );
		D[i] = Array( NUM_MAX_Y );
		newF[i] = Array( NUM_MAX_Y );
		for( var j=0 ; j<=NUM_MAX_Y; j++ ){
			Phi[i][j] = Array( NUM_MAX_Z );
			Prs[i][j] = Array( NUM_MAX_Z );
			Vel[0][i][j] = Array( NUM_MAX_Z );
			Vel[1][i][j] = Array( NUM_MAX_Z );
			Vel[2][i][j] = Array( NUM_MAX_Z );
			tmp[0][i][j] = Array( NUM_MAX_Z );
			tmp[1][i][j] = Array( NUM_MAX_Z );
			tmp[2][i][j] = Array( NUM_MAX_Z );
			D[i][j] = Array( NUM_MAX_Z );
			newF[i][j] = Array( NUM_MAX_Z );
		}
	}

	//���ʎg�p�ϐ�
	delta_x = size_x / nMeshX;
	delta_y = size_y / nMeshY;
	delta_z = size_z / nMeshZ;

	delta_x2 = delta_x * delta_x;
	delta_y2 = delta_y * delta_y;
	delta_z2 = delta_z * delta_z;

	//���x�ݒ�
	for( i=0 ; i<=nMeshX+1 ; i++ ) {
		for( j=0 ; j<=nMeshY+1 ; j++ ) {
			for( k=0 ; k<=nMeshZ+1 ; k++ ) {
				Phi[i][j][k] = InsidePhi;			//�������x
				Vel[x][i][j][k] = 0.0;
				Vel[y][i][j][k] = 0.0;
				Vel[z][i][j][k] = 0.0;
				Prs[i][j][k] = prsair;
				if ( meshtype[i][j][k] ==  BOTTOM )
					Phi[i][j][k] = FloorPhi;
				if ( meshtype[i][j][k] ==  OBSTACLE )
					Phi[i][j][k] = ObsPhi;
				if ( meshtype[i][j][k] ==  WINDOW || meshtype[i][j][k] ==  OUTSIDE )
					Phi[i][j][k] = InletPhi;
			}
		}
	}

/*
	//�G�A�R������
	var ace =0;
	for( i=0 ; i<=nMeshX+1 ; i++ ) {
		for( j=0 ; j<=nMeshY+1 ; j++ ) {
			for( k=0 ; k<=nMeshZ+1 ; k++ ) {
				if ( meshtype[i][j][k] == AC ) {
					ace = 1;
					break;
				}
			}
		}
	}
	if ( ace == 1 ) {
		coulant_min = 0.6;
		coulant_max = 0.8;
	} else {
		coulant_min = 0.5;
		coulant_max = 0.6;
	}
*/
	acheatsum = 0;
	acheatcount = 0;

};




//�v�Z���[�`���@�t���N�V���i���X�e�b�v�@========================
function calculate() {
	var cnt = 0;
	var perror = 0.0;
	var maxError = 0.0;
	var maxPrs0 = -1000.0;
	var minPrs0 = 1000.0;
	var maxPhi0 = -1000.0;
	var minPhi0 = 1000.0;
	var phiaverage = 0;
	var tmprature = 0;
	var dv = 0;


	//���x���E����
	for( i=0 ; i<=nMeshX+1 ; i++ ) {
		for( j=0 ; j<=nMeshY+1 ; j++ ) {
			for( k=0 ; k<=nMeshZ+1 ; k++ ) {
				if ( meshtype[i][j][k] != INSIDE &&  meshtype[i][j][k] != CL ) {
					Vel[x][i][j][k] = 0.0;
					Vel[y][i][j][k] = 0.0;
					Vel[z][i][j][k] = 0.0;	//Vel[y][1][j];
				}
			}
		}
	}


	//���x����̕��͂ɂ�鑬�x�X�V---------------------------
	//���ω��x
	var phisum = 0;
	var phicount = 0;
	for( i=1 ; i<=nMeshX ; i++ ) {
		for( j=1 ; j<=nMeshY ; j++ ) {
			for( k=1 ; k<=nMeshZ ; k++ ) {
				if ( meshtype[i][j][k] == INSIDE ) {
					phicount += 1;
					phisum += Phi[i][j][k];
				}
			}
		}
	}

	var phiaverage = phisum / phicount;
	var around = phiaverage+ tz;
	var tmax = 0;

	for( i=1 ; i<=nMeshX ; i++ ) {
		for( j=1 ; j<=nMeshY ; j++ ) {
			for( k=1 ; k<=nMeshZ ; k++ ) {
				if ( meshtype[i][j][k] == INSIDE ) {

				  if ( fgAround == 1 ) {
					//���͂̉��x�Ƃ̍����g���ꍇ�i�g��Ȃ��Ƃ��̓t�B�[���h���ρj
					var neararound = 0;
					var neararoundc = 0;
					if ( meshtype[i-1][j][k] == INSIDE ) {
						neararound += Phi[i-1][j][k];
						neararoundc++;
					}
					if ( meshtype[i+1][j][k] == INSIDE ) {
						neararound += Phi[i+1][j][k];
						neararoundc++;
					}
					if ( meshtype[i][j-1][k] == INSIDE ) {
						neararound += Phi[i][j-1][k];
						neararoundc++;
					}
					if ( meshtype[i][j+1][k] == INSIDE ) {
						neararound += Phi[i][j+1][k];
						neararoundc++;
					}
					if ( meshtype[i][j][k-1] == INSIDE ) {
						neararound += Phi[i][j][k-1];
						neararoundc++;
					}
					if ( meshtype[i][j][k+1] == INSIDE ) {
						neararound += Phi[i][j][k+1];
						neararoundc++;
					}
					if ( neararoundc > 0 ){
						around = ( neararound / neararoundc + phiaverage ) /2 + tz;
					} else {
						around = phiaverage+ tz;
					}
				  }
					//���x���ɂ�镂��
					tmprature = Phi[i][j][k] + tz;
					dv = g  * ( tmprature - around ) / around * delta_t;
					//�ő�l
					if ( tmax < dv ) tmax = dv;
					//�Ԃ�������
					Vel[y][i][j][k] += dv * (Math.random() * 0.1*2 + 0.9) ;
				}
			}
		}
	}


	//�G�A�R���i���x�ƕ����̐ݒ�j--------------------------
	//�������ɉ��� �ǂƔ��Ε����œ��������ŋz��
	//�G�A�R���̕����̐ݒ�
	var acx = 0;
	var acz = 0;
	j=nMeshY-2;

	if ( ACwind > 0 ) {
		acv = ACwind;
	} else {
		acv = 2;	//����
	}
	//�g�[�\��2.8kW�Ƒz�� act���x�㏸ 
	if ( addair ) {
		act = 2800 / ( sh_air * rou * 1000 * acv * 1 * delta_x );
		//��1m�~delta_x�̐����o����
	} else {
		act = 0;
	}
	var adj = 1;
	
	for( i=1 ; i<=nMeshX ; i++ ) {
		for( k=1 ; k<=nMeshZ ; k++ ) {
			if ( meshtype[i][j][k] == AC ) {
				if ( Phi[i][j+1][k] < 22 ) {
					if ( ACwind > 0 ) {
						acheatsum += 2800;
						Phi[i][j][k] = Phi[i][j+1][k]+act;
						Phi[i][j-1][k] = Phi[i][j+1][k]+act;
						adj = 1;
					} else {
						//��������
						if ( Phi[i][j+1][k] < 20 && totaltime > 300 ) {
							//�ŏ���5���̓t������
							acheatsum += 1400;
							adj = 0.5;
						} else {
							acheatsum += 2800;
							adj = 1;
						}
						Phi[i][j][k] = Phi[i][j+1][k]+act;
						Phi[i][j-1][k] = Phi[i][j+1][k]+act;
					}
				} else {
					Phi[i][j][k] = Phi[i][j+1][k];
					Phi[i][j-1][k] = Phi[i][j+1][k];
					if ( ACwind > 0 ) {
						adj = 1;
					} else {
						adj = 0.5;
					}
				}

				if ( i == 2 ) {
					acx = 1;
					Vel[x][i][j-1][k] = acv * dir * adj;
					Vel[x][i][j+1][k] = -acv * dir * adj;
				}
				if ( i == nMeshX-1 ) {
					acx = -1;
					Vel[x][i][j-1][k] = -acv * dir * adj;
					Vel[x][i][j+1][k] = acv * dir * adj;
				}
				if ( k == 2 ) {
					acz = 1;
					Vel[z][i][j-1][k] = acv * dir * adj;
					Vel[z][i][j+1][k] = -acv * dir * adj;
				}
				if ( k == nMeshX-1 ) {
					acz = -1;
					Vel[z][i][j-1][k] = -acv * dir * adj;
					Vel[z][i][j+1][k] = acv * dir * adj;
				}
				Vel[y][i][j+1][k] = -acv * Math.sqrt( 1 - dir*dir) * adj;
				Vel[y][i][j][k] = -acv;
				Vel[y][i][j-1][k] = -acv* Math.sqrt( 1 - dir*dir) * adj;
				acheatcount++;
			}
		}
	}

	//�T�[�L�����[�^�����ݒ�
	i=1;
	j=1;
	k=Math.round(nMeshZ/2);
	if ( meshtype[i][j][k] == CL ) {
		//�����ݒ肵�Ă����A���ڃZ���̐ݒ�������ق����������ʂ��o�� 161025
		//Vel[y][i][j][k] = CirculatorWind;		//1�i�ڂ͂��Ƃő��x0�ɂ���Ă��܂��@���͂����������Ȃ�
		Vel[y][i][j+1][k] = CirculatorWind;
	}

	//�����ǖʂ̑��x���E�����i�Ǔ��ւ̐��������̕��͂Ȃ��j
	//������Ȃ����ƁA�ǖʂł̈��͂��Ȃ��Ȃ�A�����]��������Ȃ�
	for( i=1 ; i<=nMeshX ; i++ ) {
		for( j=1 ; j<=nMeshY ; j++ ) {
			for( k=1 ; k<=nMeshZ ; k++ ) {
				if ( meshtype[i][j][k] == INSIDE || meshtype[i][j][k] == OBSTACLE ) {
					if( i==1 || i==nMeshX || meshtype[i-1][j][k] == OBSTACLE || meshtype[i+1][j][k] == OBSTACLE ) {
						Vel[x][i][j][k] = 0.0;
					}
					if( j==1 || j==nMeshY) {
						Vel[y][i][j][k] = 0.0;
					}
					if( k==1|| k== nMeshZ) {
						Vel[z][i][j][k] = 0.0;
					}
				}
			}
		}
	}
	

	//NS�������ɂ�鑬�x�X�V�i���㍷���j-----------
	methodSabun(x);
	methodSabun(y);
	methodSabun(z);


	//Poisson�������i���x�E���͂���A������x���x�j----------------------
	//Poisson�������̉E�Ӂi�Η����j
	var maxD = 0;
	var a,b,c;
	for( i=1 ; i<=nMeshX ; i++ ) {
		for( j=1 ; j<=nMeshY ; j++ ) {
			for( k=1 ; k<=nMeshZ ; k++ ) {
				if ( meshtype[i][j][k] == INSIDE || meshtype[i][j][k] == CL ) {
					//1611 CL�ǉ�

				  if ( 1 ) {	
					// 160210 ���S�����łȂ��ƒl���łȂ�
					//���S����
					a = (Vel[x][i+1][j][k] - Vel[x][i-1][j][k]) /2 / delta_x;
					b = (Vel[y][i][j+1][k] - Vel[y][i][j-1][k]) /2 / delta_y;
					c = (Vel[z][i][j][k+1] - Vel[z][i][j][k-1]) /2 / delta_z;

				  } else {
					//�O�i����
					if( Vel[x][i][j][k] > 0 ) {
						a = (Vel[x][i][j][k] - Vel[x][i-1][j][k]) / delta_x;
					} else {
						a = (Vel[x][i+1][j][k] - Vel[x][i][j][k]) / delta_x;
					}
					if( Vel[y][i][j][k] > 0 ) {
						b = (Vel[y][i][j][k] - Vel[y][i][j-1][k]) / delta_y;
					} else {
						b = (Vel[y][i][j+1][k] - Vel[y][i][j][k]) / delta_y;
					}
					if( Vel[z][i][j][k] > 0 ) {
						c = (Vel[z][i][j][k] - Vel[z][i][j][k-1]) / delta_z;
					} else {
						c = (Vel[z][i][j][k+1] - Vel[z][i][j][k]) / delta_z;
					}
				  }

				  //170630 rou�ǉ�
					D[i][j][k] = (a + b + c) * rou / delta_t;
					if ( D[i][j][k] > maxD )
						maxD = D[i][j][k];
				}
			}
		}
	}

	//Poisson�̕�����������
	var cnt = 0;
	var A4 = 2 * ( 1 / delta_x2 + 1 / delta_y2 + 1 / delta_z2 );

	while ( cnt < iteration ) {
		maxError = 0.0;

		//���͏����ݒ�@�v�Z���ŋ�C�ȊO�𔻒肵�Ă���̂ŕs�v

		//�����v�Z GS�@�ASOR�@�ASIP�@
		var pp;

		var xp,xm, yp,ym,zp,zm;
		for( i=1 ; i<=nMeshX ; i++ ) {
			for( j=1 ; j<=nMeshY ; j++ ) {
				for( k=1 ; k<=nMeshZ ; k++ ) {
					if ( meshtype[i][j][k] == INSIDE || meshtype[i][j][k] == CL ) {
						//1611 CL�ǉ�
						//D���ӂ��߂Ă܂Ƃ߂�6�Ŋ���i���̓W�J���j
						xp = Prs[i+1][j][k];
						xm = Prs[i-1][j][k];
						yp = Prs[i][j+1][k];
						ym = Prs[i][j-1][k];
						zp = Prs[i][j][k+1];
						zm = Prs[i][j][k-1];
						tmp[0][i][j][k] = ( ( xp + xm ) / delta_x2 +  ( yp + ym ) / delta_y2 + ( zp + zm ) / delta_z2 - D[i][j][k] ) / A4;
						perror = Math.abs(tmp[0][i][j][k] -  Prs[i][j][k]);
						if ( perror > maxError ) {
							maxError = perror;
						}
					}
				}
			}
		}

		//���͂̐ݒ�
		for( i=0 ; i<=nMeshX+1 ; i++ ) {
			for( j=0 ; j<=nMeshY+1 ; j++ ) {
				for( k=0 ; k<=nMeshZ+1 ; k++ ) {
					if ( meshtype[i][j][k] == INSIDE || meshtype[i][j][k] == CL ) {
						// 1611CL���ǉ�
						Prs[i][j][k] = tmp[0][i][j][k];
					}
				}
			}
		}
		for( i=0 ; i<=nMeshX+1 ; i++ ) {
			for( j=0 ; j<=nMeshY+1 ; j++ ) {
				for( k=0 ; k<=nMeshZ+1 ; k++ ) {
						//��C�łȂ��ꍇ�ɂ́A�ł��߂���C�̈��͂�ݒ�
						if ( i==0 ) {
							Prs[i][j][k] = tmp[0][i+1][j][k];
						} else if ( i==nMeshX+1 ) {
							Prs[i][j][k] = tmp[0][i-1][j][k];
						} else if ( j==0 ) {
							Prs[i][j][k] = tmp[0][i][j+1][k];
						} else if ( j==nMeshY+1 ) {
							Prs[i][j][k] = tmp[0][i][j-1][k];
						} else if ( k==0 ) {
							Prs[i][j][k] = tmp[0][i][j][k+1];
						} else if ( k==nMeshZ+1 ) {
							Prs[i][j][k] = tmp[0][i][j][k-1];
						} else {
							//��Q���Ȃ� 170629�@�폜
							/*
							if ( meshtype[i-1][j][k] == INSIDE ) {
								Prs[i][j][k] = tmp[0][i-1][j][k];
							} else if ( meshtype[i+1][j][k] == INSIDE ) {
								Prs[i][j][k] = tmp[0][i+1][j][k];
							} else if ( meshtype[i][j-1][k] == INSIDE ) {
								Prs[i][j][k] = tmp[0][i][j-1][k];
							} else if ( meshtype[i][j+1][k] == INSIDE ) {
								Prs[i][j][k] = tmp[0][i][j+1][k];
							} else if ( meshtype[i][j][k-1] == INSIDE ) {
								Prs[i][j][k] = tmp[0][i][j][k-1];
							} else if ( meshtype[i][j][k+1] == INSIDE ) {
								Prs[i][j][k] = tmp[0][i][j][k+1];
							}
							*/
						}
					
				}
			}
		}
		
		if ( maxError < tolerance ) {
			break;
		} else {
			//return maxError;
		}
		cnt+=1;
	}
	
	function absolutemax( a, b ){
		return Math.abs(a) > Math.abs(b) ? a/3 : b/3;
	}


	//���x�x�N�g���̍X�V
	for( i=1 ; i<=nMeshX ; i++ ) {
		for( j=1 ; j<=nMeshY ; j++ ) {
			for( k=1 ; k<=nMeshZ ; k++ ) {
				if ( meshtype[i][j][k] == INSIDE || meshtype[i][j][k] == CL) {
					//170629 ��drou ���|�����킹��
					tmp[x][i][j][k] = Vel[x][i][j][k] - 0.5 * delta_t * (Prs[i+1][j][k] - Prs[i-1][j][k]) / (rou * delta_x);
					tmp[y][i][j][k] = Vel[y][i][j][k] - 0.5 * delta_t * (Prs[i][j+1][k] - Prs[i][j-1][k]) / ( rou  * delta_y);	
					tmp[z][i][j][k] = Vel[z][i][j][k] - 0.5 * delta_t * (Prs[i][j][k+1] - Prs[i][j][k-1]) / ( rou * delta_z);

				}
			}
		}
	}
	for( i=1 ; i<=nMeshX ; i++ ) {
		for( j=1 ; j<=nMeshY ; j++ ) {
			for( k=1 ; k<=nMeshZ ; k++ ) {
				if ( meshtype[i][j][k] == INSIDE ) {
					Vel[x][i][j][k] = tmp[x][i][j][k];
					Vel[y][i][j][k] = tmp[y][i][j][k];
					Vel[z][i][j][k] = tmp[z][i][j][k];
				}
			}
		}
	}

	//���x���E���� �Ăѐݒ肷�邱�ƂŃT�[�L�����[�^���K�؂ɂȂ� 170629�Ȃ����Ă��ω��Ȃ�
	/*
	for( i=0 ; i<=nMeshX+1 ; i++ ) {
		for( j=0 ; j<=nMeshY+1 ; j++ ) {
			for( k=0 ; k<=nMeshZ+1 ; k++ ) {
				if ( meshtype[i][j][k] != INSIDE &&  meshtype[i][j][k] != CL ) {
					Vel[x][i][j][k] = 0.0;
					Vel[y][i][j][k] = 0.0;
					Vel[z][i][j][k] = 0.0;	//Vel[y][1][j];
				}
			}
		}
	}
	*/


	//���x-----------------------------------------------
	var coulant;
	var maxcoulant;
	maxcoulant = 0;
	var vijk;
	var fixwall;

	var heatparm = delta_t / ( Riw * sh_air * rou * 1000 );
	var heatparm_f = delta_t / ( Rif * sh_air * rou * 1000 );
	var heatparm_c = delta_t / ( Ric * sh_air * rou * 1000 );
	var heatparm_w = delta_t / ( sh_air * rou * 1000 );

	//���x�̈ړ�
	for( i=0 ; i<=nMeshX+1 ; i++ ) {
		for( j=0 ; j<=nMeshY+1 ; j++ ) {
			for( k=0 ; k<=nMeshZ+1 ; k++ ) {
				var pphi =  Phi[i][j][k];
				tmp[0][i][j][k] = pphi;
				if ( meshtype[i][j][k] == INSIDE || meshtype[i][j][k] == CL ) {
					//��C�̏ꍇ�i+1�A-1�͂��肤��j
					xp = Phi[i+1][j][k];
					xm = Phi[i-1][j][k];
					yp = Phi[i][j+1][k];
					ym = Phi[i][j-1][k];
					zp = Phi[i][j][k+1];
					zm = Phi[i][j][k-1];
					
					//170630 NOT ���㍷���� ���b�V���Ⴂ�ł͂Ȃ��A���b�V���̕��ϒl��p�������A �T�[�L�����[�^���ł��Ȃ��A�G�A�R���̔M�������x��
					//170630 �[�̏ꍇ�ɂ́A�����̑��x���g��
					//�ꎟ���x�@�ꎟ�����ڗ� X
					coulant = Vel[x][i][j][k] * delta_t / delta_x;
					//vijk = Vel[x][i][j][k];
					if ( fgCalcTempAround == 1 ) {
						//�ꎟ���x
						tmp[0][i][j][k] += 0.5 * (coulant * (xm - xp) + Math.abs(coulant) * (xp + xm - 2.0 * pphi));
					} else {
						//���㍷��
						fixwall = ( i==2 ? 2 : i-1 );
						//fixwall = i-1;
						if ( Vel[x][fixwall][j][k] > 0 ) {
							coulant = Vel[x][fixwall][j][k] * delta_t / delta_x;
							tmp[0][i][j][k] += ( xm - pphi ) * coulant;
						}
						fixwall = ( i==nMeshX ? nMeshX : i+1 );
						//fixwall = i+1;
						if ( Vel[x][fixwall][j][k] < 0 ) {
							coulant = -Vel[x][fixwall][j][k] * delta_t / delta_x;
							tmp[0][i][j][k] += ( xp - pphi ) * coulant;
						}
					}
					if ( maxcoulant < coulant ) maxcoulant = coulant;

					//�ꎟ���x�@�ꎟ�����ڗ� Y
					vijk = Vel[y][i][j][k];
					coulant = Vel[y][i][j][k] * delta_t / delta_y;
					if ( fgCalcTempAround == 1 ) {
						tmp[0][i][j][k] += 0.5 * (coulant * (ym - yp) + Math.abs(coulant) * (yp +ym - 2.0 * pphi));
					} else {
						fixwall = ( j==2 ? 2 : j-1 );
						//fixwall =j-1;
						if ( Vel[y][i][fixwall][k] > 0 ) {
							coulant = Vel[y][i][fixwall][k] * delta_t / delta_y;
							tmp[0][i][j][k] += ( ym - pphi ) * coulant;
						}
						fixwall = ( j==nMeshY ? nMeshY : j+1 );
						//fixwall = j+1 ;
						if ( Vel[y][i][fixwall][k] < 0 ) {
							coulant = -Vel[y][i][fixwall][k] * delta_t / delta_y;
							tmp[0][i][j][k] += ( yp - pphi ) * coulant;
						}
					}
					if ( maxcoulant < coulant ) maxcoulant = coulant;

					//�ꎟ���x�@�ꎟ�����ڗ� Z
					//vijk = Vel[z][i][j][k];
					coulant = Vel[z][i][j][k] * delta_t / delta_z;
					if ( fgCalcTempAround == 1 ) {
						tmp[0][i][j][k] += 0.5 * (coulant * (zm - zp) + Math.abs(coulant) * (zp +zm - 2.0 * pphi));
					} else {
						fixwall = ( k==2 ? 2 : k-1 );
						//fixwall = k-1;
						if ( Vel[z][i][j][fixwall] > 0 ) {
							coulant = Vel[z][i][j][fixwall] * delta_t / delta_z;
							tmp[0][i][j][k] += ( zm - pphi ) * coulant;
						}
						fixwall = ( k==nMeshZ ? nMeshZ : k+1 );
						//fixwall =  k+1;
						if ( Vel[z][i][j][fixwall] < 0 ) {
							coulant = -Vel[z][i][j][k+1] * delta_t / delta_z;
							tmp[0][i][j][k] += ( zp - pphi ) * coulant;
						}
					}
					if ( maxcoulant < coulant ) maxcoulant = coulant;
	
					//�O�ǂ���̗���
					// �������M��R0.11m2K/W �@��C��M�@1.006J/gK�@
					// 170629 heatparm_w ���g���ꍇ�ɂ� delta_*�Ŋ���Ȃ�
					if ( meshtype[i-1][j][k] != INSIDE && meshtype[i-1][j][k] != CL ) {
						//��������C�łȂ�
						if ( meshtype[i-1][j][k] == OUTSIDE ) {
							//�O�ǁi���j
							tmp[0][i][j][k] += ( xm - pphi ) * wallK * heatparm_w / delta_x;
							sumheatleft += ( xm - pphi ) * wallK * delta_y*delta_z ;
						} else if ( meshtype[i-1][j][k] == WINDOW ) {
							//���i���j
							tmp[0][i][j][k] += ( xm - pphi )  * windowK * heatparm_w / delta_x;
							sumheatleft += ( xm - pphi )  * windowK * delta_y*delta_z ;
						} else {
							tmp[0][i][j][k] += ( xm - pphi ) / delta_x * heatparm / delta_x;
							sumheatleft += ( xm - pphi ) / delta_x * Riw * delta_y*delta_z ;
						}
					}
					if ( meshtype[i+1][j][k] != INSIDE ) {
						tmp[0][i][j][k] += ( xp - pphi ) / delta_x * heatparm;
					}

					if ( meshtype[i][j-1][k] != INSIDE && meshtype[i][j-1][k] != CL ) {
						//����������
						tmp[0][i][j][k] += ( ym - pphi )  / delta_y * heatparm_f;
					}
					if ( meshtype[i][j+1][k] != INSIDE ) {
						//�V�䂾������
						tmp[0][i][j][k] += ( yp - pphi ) / delta_y * heatparm_c;
					}

					if ( meshtype[i][j][k-1] != INSIDE && meshtype[i][j][k-1] != CL ) {
						tmp[0][i][j][k] += ( zm - pphi ) / delta_z * heatparm;
					}
					if ( meshtype[i][j][k+1] != INSIDE && meshtype[i][j][k+1] != CL) {
						//������C�łȂ�
						if ( meshtype[i][j][k+1] == OUTSIDE ) {
							//�O��
							tmp[0][i][j][k] += ( zp - pphi ) * wallK  * heatparm_w;
							sumheatfront += ( zp - pphi ) * wallK* delta_y*delta_z ;
						} else if ( meshtype[i][j][k+1] == WINDOW ) {
							//���i���ʁj
							tmp[0][i][j][k] += ( zp - pphi )  * windowK * heatparm_w;
							sumheatfront += ( zp - pphi ) * windowK* delta_y*delta_z ;
						} else {
							//����
							tmp[0][i][j][k] += ( zp - pphi )  / delta_z * heatparm;
							sumheatfront += ( zp - pphi ) / delta_z * Riw* delta_y*delta_z ;
						}
					}

				} else if ( meshtype[i][j][k] == OBSTACLE ) {
					//���̂̋�C����̔M�ړ���]��(-1 +1���L��)
					xp = Phi[i+1][j][k];
					xm = Phi[i-1][j][k];
					yp = Phi[i][j+1][k];
					ym = Phi[i][j-1][k];
					zp = Phi[i][j][k+1];
					zm = Phi[i][j][k-1];
					if ( ObsPhi != InsidePhi ) {
						//���x�ݒ肪����Ă���ꍇ�ɂ͏������Ȃ�
					} else if ( meshtype[i-1][j][k] == INSIDE ||  meshtype[i+1][j][k] == INSIDE ) {
						tmp[0][i][j][k] = ( xp+ xm ) / 2;
					} else if ( meshtype[i][j-1][k] == INSIDE ||  meshtype[i][j+1][k] == INSIDE ) {
						tmp[0][i][j][k] = ( yp + ym ) / 2;
					} else if ( meshtype[i][j-1][k] == INSIDE ||  meshtype[i][j+1][k] == INSIDE ) {
						tmp[0][i][j][k] = ( zp + zm ) / 2;
					} else {
						tmp[0][i][j][k] = ( xp + xm + yp + ym +zp + zm ) / 6;
					}

				} else if ( meshtype[i][j][k] == SIDE ) {
					//�ǂ̋�C����̔M�ړ���]��
					// ���x�͎g��Ȃ��̂ŁA��C���x��ݒ肷��
					if ( meshtype[i][j][Math.max(k-1,0)] == INSIDE) {
						//�ǖʉ��x���O�C���Ƃ��Ĉ����i���j
						//tmp[0][i][j][k] = Phi[i][j][k] + (Phi[i][j][k-1]-Phi[i][j][k]) / Riw * delta_t / ( sh_wall * sh_thick );
					} else if ( meshtype[i][j][Math.min(k+1,nMeshZ+1)] == INSIDE) {
						tmp[0][i][j][k] += (Phi[i][j][k+1]-pphi) / Riw * delta_t / ( sh_wall * sh_thick );
					} else if ( meshtype[Math.max(i-1,0)][j][k] == INSIDE) {
						tmp[0][i][j][k] += (Phi[i-1][j][k]-pphi) / Riw * delta_t / ( sh_wall * sh_thick );
					} else if ( meshtype[Math.min(i+1,nMeshX+1)][j][k] == INSIDE) {
						//�ǖʉ��x���O�C���Ƃ��Ĉ����i���j
						//tmp[0][i][j][k] += (Phi[i+1][j][k]-Phi[i][j][k]) / Riw * delta_t / ( sh_wall * sh_thick );

					}
				} else if ( meshtype[i][j][k] == TOP ) {
					tmp[0][i][j][k] += (Phi[i][j-1][k]-pphi) / Ric * delta_t / ( sh_wall * sh_thick );
				} else if ( meshtype[i][j][k] == BOTTOM ) {
					tmp[0][i][j][k] += (Phi[i][j+1][k]-pphi) / Rif * delta_t / ( sh_wall * sh_thick );
				}
			}
			//���E�O�ǂɂ��Ă͉��x�͕]�����Ȃ��i�O������Œ�ݒ肷��j
		}
	}
	heatleftcount++;

	for( i=0 ; i<=nMeshX+1 ; i++ ) {
		for( j=0 ; j<=nMeshY+1 ; j++ ) {
			for( k=0 ; k<=nMeshZ+1 ; k++ ) {
				if ( tmp[0][i][j][k] ) {
					Phi[i][j][k] = tmp[0][i][j][k];
				}
			}
		}
	}


	//�N�[���������ɂ��v�Z�^�C�~���O�̌�����-----------------------------
	if ( fix_coulant ) {
		if ( maxcoulant > coulant_min ) {
			delta_t *= 0.95;
		}
		if ( maxcoulant < coulant_max ) {
			delta_t *= 1.05;
		}
	}

	//����/���x�̍ő�l�E�ŏ��l--------------------------
	var prscount = 0;
	var prssum = 0;
	for( i=1 ; i<=nMeshX ; i++ ) {
		for( j=1 ; j<=nMeshY ; j++ ) {
			for( k=1 ; k<=nMeshZ ; k++ ) {
				prssum += Prs[i][j][k];
				prscount++;
				if ( Prs[i][j][k] > maxPrs0 ) 
					maxPrs0 = Prs[i][j][k];
				if ( Prs[i][j][k] < minPrs0 )
					minPrs0 = Prs[i][j][k];
				if ( Phi[i][j][k] > maxPhi0 )
					maxPhi0 = Phi[i][j][k];
				if ( Phi[i][j][k] < minPhi0 )
					minPhi0 = Phi[i][j][k];
			}
		}
	}
	//���͂̕��ω��@�s�v

	return 0;
};


//���x�A���������ꎟ�����i�����������Ɓj===================================
function methodSabun( target ) {
	var f = Vel[target];
	var maxcoulant = 0;
	var fijk;

	for( i=1 ; i<=nMeshX ; i++ ) {
		for( j=1 ; j<=nMeshY ; j++ ) {
			for( k=1 ; k<=nMeshZ ; k++ ) {
				if ( meshtype[i][j][k] == INSIDE || meshtype[i][j][k] == CL) {
					fijk = f[i][j][k];
/*
					xp = ( meshtype[i+1][j][k] == INSIDE ? f[i+1][j][k] : f[i][j][k] );
					xm = ( meshtype[i-1][j][k] == INSIDE ? f[i-1][j][k] : f[i][j][k] );
					yp = ( meshtype[i][j+1][k] == INSIDE ? f[i][j+1][k] : f[i][j][k] );
					ym = ( meshtype[i][j-1][k] == INSIDE ? f[i][j-1][k] : f[i][j][k] );
					zp = ( meshtype[i][j][k+1] == INSIDE ? f[i][j][k+1] : f[i][j][k] );
					zm = ( meshtype[i][j][k-1] == INSIDE ? f[i][j][k-1] : f[i][j][k] );
*/
					xp = f[i+1][j][k];
					xm = f[i-1][j][k];
					yp = f[i][j+1][k];
					ym = f[i][j-1][k];
					zp = f[i][j][k+1];
					zm = f[i][j][k-1];

					//���㍷��
					//����𒆉��������Ƃ�ƁA�`�F�b�J�[�{�[�h�ƂȂ�
					coulant = Vel[x][i][j][k] * delta_t / delta_x;
					newF[i][j][k] = fijk + 0.5 * (coulant * (xm - xp) + Math.abs(coulant) * (xp +xm - 2.0 * fijk));
					coulant = Vel[y][i][j][k] * delta_t / delta_y;
					newF[i][j][k] += 0.5 * (coulant * (ym - yp) + Math.abs(coulant) * (yp +ym - 2.0 * fijk));
					coulant = Vel[z][i][j][k] * delta_t / delta_z;
					newF[i][j][k] += 0.5 * (coulant * (zm - zp) + Math.abs(coulant) * (zp +zm - 2.0 * fijk));

					//�S�����ɒ�������
					newF[i][j][k] += delta_t * ( (xm + xp - 2.0 * fijk) / delta_x2   +  (ym + yp - 2.0 * fijk) / delta_y2 +  (zm + zp - 2.0 * fijk) / delta_z2 ) / Re;
				}
			}
		}
	}

	//�X�V
	for( i=1 ; i<=nMeshX ; i++ ) {
		for( j=1 ; j<=nMeshY ; j++ ) {
			for( k=1 ; k<=nMeshZ ; k++ ) {
				if ( meshtype[i][j][k] == INSIDE || meshtype[i][j][k] == CL ) {
					Vel[target][i][j][k] = newF[i][j][k];
				}
			}
		}
	}
};


