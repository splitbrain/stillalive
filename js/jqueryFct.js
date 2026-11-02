$(document).ready(function() {

	$('.whyRegister').click(function() {
		jAlert('Registering an account allows you to :<br />' +
				'<ul>' + 
					'<li>Save your progression and highscores</li>' + 
					'<li>Automatically upload replays of your highscores</li>' +
					'<li>Upload maps created with the Level Editor</li>' + 
					'<li>Mark online maps as favorite for easy retrieval</li>' + 
				'</ul>' +
				"If you don't need these features, you don't need to register."
				
				, 'Why Register ?');
		return false;
	});

	$('#infos #refreshCaptcha').click(function() {
		resetCaptcha();
	});
	
	$('td.replay img').live('click', function() {
		var repFile = $(this).attr('val');
		var idRep = $(this).attr('id');
		
		try {
			REPLAY_ID = parseInt(idRep);
		}catch(e) {
			REPLAY_ID = -1;
		}
		USR_REPLAY = $(this).parent('td').parent('tr').find('td.nick').text();
		if(USR_REPLAY == 'Your time') USR_REPLAY = USR_NICK;
		
		$.ajax({
			type: "POST",
			url: AJAX_URL,
			async: false,
			cache: false,
			data: "function=getReplayData&replay=" + repFile,
			success: function(msg) {
				replay = new Replay();
				var d = msg.split(';');
				
				for(i=0; i<d.length; i++) {
					var spl = d[i].split('|');
					replay.inputs.push(parseInt(spl[0]));
					replay.mouseX.push(parseInt(spl[1]));
					replay.mouseY.push(parseInt(spl[2]));
				}
				
				if(currentMenu == 1) {
					replayMode = true;
					ECART_X = 64;
					ECART_Y = 96;
					currentMenu = 2;
					currentLevel = previewMap;
					loadLevel(currentLevel);
					//$("#highscores").slideDown("slow");
					//selectMenu = 0;
					finishedLastDraw = true;
					unclick();
				}else if(currentMenu == 4) {
					replayMode = true;
					ECART_X = 64;
					ECART_Y = 96;
					currentMenu = 5;
					oldMap = new Array();
					for(i in map) oldMap.push(map[i]);
					currentLevel = previewMap-1;
					loadLevel(-1);
					//selectMenu = 0;
					finishedLastDraw = true;
					$("#onlineFilter").slideUp("slow");
					unclick();
				}
			},
			error: function(msg) {
				jAlert('Unable to download replay', 'Error');
			}
		});
	});


	$('#show').change(function() {
		filter_show = $(this).val() + "";
	});
	
	$('#orderBy').change(function() {
		filter_orderBy = $(this).val() + "";
	});

	$('input[type=radio][name=order]').change(function() {
		filter_order = $(this).val();
	});
	
	$('#author').change(function() {
		filter_author = $(this).val() + "";
	});
	
	$('#name').change(function() {
		filter_name = $(this).val() + "";
	});
	
	$('#filterButton').click(function() {
		onlinePage = 0;
		previewMap = 0;
		setupDownloadMaps();
		prepareOnlineTxt();
	});
	
	$('#clearFilterButton').click(function() {
		filter_show = "all";
		filter_author = "";
		filter_name = "";
		filter_orderBy = "id";
		filter_order = "desc";
		previewMap = 0;
		
		$('#show').val('all');
		$('#orderBy').val('id');
		$('#author').val('');
		$('#name').val('');
		
		$('input[type=radio][name=order][value=desc]').attr('checked', true);
		
		onlinePage = 0;
		setupDownloadMaps();
		prepareOnlineTxt();
	});


	maxLevel = new Array();
	maxLevel[0] = 1;
	maxLevel[1] = 1;
	maxLevel[2] = 1;
	maxLevel[4] = 1;

	for(var i=0; i<5; i++) {
		if(localStorage.getItem('sajs_maxLevel_' + i) != null) {
			maxLevel[i] = parseInt(localStorage.getItem('sajs_maxLevel_' + i));
		}else {
			maxLevel[i] = 1;
			localStorage.setItem('sajs_maxLevel_' + i, maxLevel[i]);
		}
	}

	$('#canvas').mousemove(function(e){
		var offset = $(this).offset();
		if(!replayMode || escapeMenu) {
			mouseX = e.clientX - offset.left + $(document).scrollLeft();
			mouseY = e.clientY - offset.top + $(document).scrollTop();
		}
	});
	
	$('#canvas').mousedown(function(e) {
		if( (!$.browser.msie && e.button == 0) || ($.browser.msie && e.button == 1) ) {
			keys |= MSE_L;
		}
		else if(e.button == 2){
			keys |= MSE_R;
		}else if(e.button == 1){
			keys |= MSE_M;
		}
		e.preventDefault();
		e.stopPropagation();
	});
	
	$('#canvas').mouseup(function(e) {
		if( (!$.browser.msie && e.button == 0) || ($.browser.msie && e.button == 1) ) {
			keys &= ~MSE_L;
		}
		else if(e.button == 2){
			keys &= ~MSE_R;
		}else if(e.button == 1){
			keys &= ~MSE_M;
		}
		e.preventDefault();
		e.stopPropagation();
	});
	
	if(localStorage.getItem('sajs_usr_nick') != null && localStorage.getItem('sajs_usr_pwd') != null) {
		if(localStorage.getItem('sajs_usr_nick') != '' && localStorage.getItem('sajs_usr_pwd') != '') {
			if(localStorage.getItem('sajs_usr_nick') != 'null') {
				USR_NICK = localStorage.getItem('sajs_usr_nick');
				USR_PWD = localStorage.getItem('sajs_usr_pwd');
				getMaxLevelFromDB();
				$("#aLogin").text('Auto logged as ' + USR_NICK + ". Click here to logout.");
				$("#aLogin").next('fieldset').hide();
			}else {
				USR_NICK = '';
				USR_PWD = '';
			}
		} else {
			USR_NICK = '';
			USR_PWD = '';
		}
	}else {
		USR_NICK = '';
		USR_PWD = '';
	}
	
	$("#aLogin").click(function(e) {
		e.preventDefault();
		e.stopPropagation();
		if($(this).text() == "Click here to hide") {
			$(this).text("Click here to Log-in or Register");
			$(this).next('fieldset').hide('fast');
			resetCaptcha();
		} else if($(this).text() == "Click here to Log-in or Register") {
			$(this).text("Click here to hide");
			$(this).next('fieldset').show('fast');
			resetCaptcha();
		} else {
			$(this).text("Click here to Log-in or Register");
			localStorage.setItem('sajs_usr_nick', null);
			localStorage.setItem('sajs_usr_pwd', null);
			USR_NICK = "";
			USR_PWD = "";
		}
	});
	
	$('#bRegister').click(function() {
		if($('#nick').val().length > 0 && $('#pwd').val().length > 0) {
			var pass = SHA1($('#pwd').val());
			$.ajax({
				type: "POST",
				url: AJAX_URL,
				async: true,
				cache: false,
				data: "function=register&nick=" + $('#nick').val() + "&pwd=" + pass,
				success: function(msg) {
					var ans = jQuery.parseJSON(msg);
					if(ans) {
						if(ans.msg == "ok") {
							USR_NICK = $('#nick').val();
							USR_PWD = pass;
							$('#infos').find('fieldset').hide('fast');
							$("#aLogin").text('Logged as ' + USR_NICK + ". Click here to logout.");
							localStorage.setItem('sajs_usr_nick', USR_NICK);
							localStorage.setItem('sajs_usr_pwd', USR_PWD);
							$('#nick').val('');
							$('#pwd').val('');
						}else if(ans.msg == "ko") {
							jAlert('Nickname already taken', 'Error');
						}else if(ans.error == "nick") {
							jAlert('Invalid characters in nickname', 'Error');
						}
					}
				},
				error: function(msg) {
					jAlert(msg, 'Error');
				}
			});
		}else {
			jAlert('Please enter at least 1 character for nick and password', 'Error');
		}
	});
	
	$("#nick, #pwd").keyup(function(evt) {
		if($('#nick').val() && $('#pwd').val()) {
			var keyCode = evt.which || evt.keyCode;
			if(keyCode == 13) {
				$('#bLogin').trigger('click');
			}
		}
	});
	
	$('#bLogin').click(function() {
		if($('#nick').val().length > 2 && $('#pwd').val().length > 2) {
			var pass = SHA1($('#pwd').val());
			$.ajax({
				type: "POST",
				url: AJAX_URL,
				async: true,
				cache: false,
				data: "function=login&nick=" + $('#nick').val() + "&pwd=" + pass,
				success: function(msg) {
					var ans = jQuery.parseJSON(msg);
					if(ans) {
						if(ans.msg == "ok") {
							USR_NICK = $('#nick').val();
							USR_PWD = pass;
							$('#infos').find('fieldset').hide('fast');
							$("#aLogin").text('Logged as ' + USR_NICK + ". Click here to logout.");
							$('#nick').val('');
							$('#pwd').val('');
							localStorage.setItem('sajs_usr_nick', USR_NICK);
							localStorage.setItem('sajs_usr_pwd', USR_PWD);
							
							getMaxLevelFromDB();
							
						}else if(ans.msg == "ko") {
							jAlert('Wrong nickname or password', 'Error');
						}else if(ans.error == "nick") {
							jAlert('Invalid characters in nickname', 'Error');
						}
					}
				}
			});
		}else {
			jAlert('Please enter at least 3 character for nick and password', 'Error');
		}
	});


	var offset = $('#canvas').offset();

	/*$(window).resize(function() {
		replaceDecor();
	});
	
	{
		$("#imgPerso").css('display','block').css('left',offset.left - 200).css('top',offset.top + 350);
		$("#imgLogo").css('display','block').css('left',offset.left - 300).css('top',offset.top + 50);
		$('#portalGun').css('display','block').css('left',offset.left + 640 + 30).css('top',offset.top + 50);
		$('#etagere').css('display','block').css('left',offset.left + 640 + 30).css('top',offset.top + 50 + 256);
		$('#tuyauDroit').css('display','block').css('left',offset.left + 640).css('top',offset.top - 40);
		$('#tuyauGauche').css('display','block').css('left',offset.left - 320).css('top',offset.top - 20);
		$('#highscores').css('left',offset.left + 650).css('top',offset.top);
		$('#onlineFilter').css('left',offset.left - 203).css('top',offset.top + 32);
		$('#infos').css('display','block').css('left',offset.left - 290).css('top',offset.top);
		
		replaceDecor();
	}*/
	
	$('*').keydown(function(evt) {
		evt.stopImmediatePropagation();
		evt.stopPropagation();
		
		var keyCode = evt.which || evt.keyCode;
		
		if(keyCode == 69) {	//e
			keys |= KEY_E;
		}
		if (keyCode == 81 || keyCode == 65) {//q
			keys |= KEY_Q;
		}
		if (keyCode == 68) {//d
			keys |= KEY_D;
		}
		if (keyCode == 90 || keyCode == 87) {//z
			keys |= KEY_Z;
		}
		if(keyCode == 83) {	//s
			keys |= KEY_S;
		}
		if (keyCode == 77 || keyCode == 59) {//m
			sound = !sound;
		}
	});
	
	$('*').keyup(function(evt) {
		evt.stopImmediatePropagation();
		evt.stopPropagation();
	
		var keyCode = evt.which || evt.keyCode;
		
		if (keyCode == 81 || keyCode == 65) {//q
			keys &= ~KEY_Q;
		}
		if (keyCode == 68) {//d
			keys &= ~KEY_D;
		}
		if(keyCode == 83) {	//s
			keys &= ~KEY_S;
		}
		if ((keyCode == 90) && evt.ctrlKey) {//ctrl + z
			leftReleased = 1;
		}else if ((keyCode == 90 || keyCode == 87)) {//z
			keys &= ~KEY_Z;
		}
		if (keyCode == 27) {//escape
			if((currentMenu == 2 || currentMenu == 5 || currentMenu == 6) && !drawIntermission) {
				escapeMenu = !escapeMenu;
				
				if(replayMode) {
					if(escapeMenu) {
						oldmousePressed = mousePressed;
						oldmouseReleased = mouseReleased;
						oldmouseButton = mouseButton;
						unclick();
						keys = 0;
					}else rescaleReplay();
				}
			}else if(currentMenu == 3) {
				if(isTestingLevel) stopPlayingLevel();
			}
		}
		
		if (keyCode == 90 && evt.ctrlKey) {//ctrl + z
			leftReleased = 1;
		}
		if (keyCode == 89 && evt.ctrlKey) {//ctrl + y
			rightReleased = 1;
		}
		if (keyCode == 13) {//enter
			if(currentMenu == 3) {
				if(isTestingLevel) stopPlayingLevel();
				else startPlayingLevel();
			}
		}
		
		//console.log(keyCode);
	});
});

function resetCaptcha() {
	$('#captchaImg').attr('src','php/captcha.php?t=' + (new Date().getTime()));
	$('#captcha').val('');
}

function captchaOK() {
	var ret = false;
	$.ajax({
		type: "POST",
		url: "./../php/captcha_test.php",
		async: false,
		cache: false,
		data: "code=" + $('#captcha').val(),
		success: function(msg) {
			var ans = jQuery.parseJSON(msg);
			ret = (ans.msg == "ok");
		}
	});
	return ret;
}

function replaceDecor() {
	var offset = $('#canvas').offset();
	$('#imgPerso').css('left',offset.left - 200).css('top',offset.top + 350);
	$('#imgLogo').css('left',offset.left - 300).css('top',offset.top + 50);
	$('#portalGun').css('left',offset.left + 640 + 30).css('top',offset.top + 50);
	$('#etagere').css('left',offset.left + 640 + 30).css('top',offset.top + 50 + 256);
	$('#tuyauDroit').css('left',offset.left + 640).css('top',offset.top - 40);
	$('#tuyauGauche').css('left',offset.left - 320).css('top',offset.top - 20);
	
	$('#highscores').css('left',offset.left + 650).css('top',offset.top);
	$('#onlineFilter').css('left',offset.left - 203).css('top',offset.top + 40);
	$('#infos').css('left',offset.left - 290).css('top',offset.top);
}