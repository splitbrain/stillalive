document.addEventListener('DOMContentLoaded', function() {
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
});