$(document).ready(function() {

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
			if((currentMenu == 2 || currentMenu == 6) && !drawIntermission) {
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