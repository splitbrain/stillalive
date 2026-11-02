var timeoutAjax = 1500;

function loadTotalHighscores() {
	$('#highscores_in').html('<img style="padding-left:15px" src="decor/ajax-loader.gif" />');
	$.ajax({
		type: "POST",
		url: AJAX_URL,
		timeout: timeoutAjax,
		async: true,
		cache: false,
		data: "function=getTotalHighscores&lvlType=" + lvlType,
		success: function(lhmsg) {
			$('#highscores_in').html(lhmsg);
		},
		error: function() {
			if($('#highscores_in').html().indexOf('ajax-loader.gif') > -1) {
				$('#highscores_in').html("<span style='color:white'>Timeout Reached<br />Please retry</span>");
			}
		}
	});
}

function loadPreviewHighscores(level) {
	$('#highscores_in').html('<img style="padding-left:15px" src="decor/ajax-loader.gif" />');
	$.ajax({
		type: "POST",
		url: AJAX_URL,
		timeout: timeoutAjax,
		async: true,
		cache: false,
		data: "function=getHighscores&time=1000&lvl=" + level + "&lvlType=" + lvlType + "&nick=" + USR_NICK,
		success: function(lhmsg) {
			$('#highscores_in').html(lhmsg);
			if(level >= maxLevel[lvlType]) {
				$("#highscores_in table tr td.replay").remove();
			}
			//$("#highscores").slideDown("slow");
		},
		error: function() {
			if($('#highscores_in').html().indexOf('ajax-loader.gif') > -1) {
				$('#highscores_in').html("<span style='color:white'>Timeout Reached<br />Please retry</span>");
			}
		}
	});
}

function loadOnlinePreviewHighscores(level, time) {
	$('#highscores_in').html('<img style="padding-left:15px" src="decor/ajax-loader.gif" />');
	$.ajax({
		type: "POST",
		url: AJAX_URL,
		timeout: timeoutAjax,
		async: true,
		cache: false,
		data: "function=getOnlineHighscores&time=1000&mapMD5=" + level + "&nick=" + USR_NICK,
		success: function(lhmsg) {
			$('#highscores_in').html(lhmsg);
			//$("#highscores").slideDown("slow");
		},
		error: function() {
			if($('#highscores_in').html().indexOf('ajax-loader.gif') > -1) {
				$('#highscores_in').html("<span style='color:white'>Timeout Reached<br />Please retry</span>");
			}
		}
	});
}

function loadHighscores(level) {
	$.ajax({
		type: "POST",
		url: AJAX_URL,
		timeout: timeoutAjax,
		async: true,
		cache: false,
		data: "function=getHighscores&time=15&lvl=" + level + "&lvlType=" + lvlType,
		success: function(lhmsg) {
			$('#highscores_in').html(lhmsg);
			var nickToShow = USR_NICK;
			if(USR_REPLAY) nickToShow = USR_REPLAY;
			if($("#highscores_in tr").length > (place)) {
				nextTime = parseInt($("#highscores_in tr:nth(0) td:last").text());
				$("#highscores_in tr:nth(" + place + ")").before("<tr class=\"red\"><td>" + (place+1) + "</td><td class=\"nick\">" + nickToShow + "</td><td>??:??:???</td></tr>");
				$("#highscores_in table tr td.replay").remove();
			}else {
				nextTime = -1;
				$("#highscores_in table").append("<tr class=\"red\"><td>" + (place+1) + "</td><td class=\"nick\">" + nickToShow + "</td><td>??:??:???</td></tr>");
			}
		},
		error: function() {
			if($('#highscores_in').html().indexOf('ajax-loader.gif') > -1) {
				$('#highscores_in').html("<span style='color:white'>Timeout Reached<br />Please retry</span>");
			}
		}
	});
}

function loadOnlineHighscores(level) {
	$.ajax({
		type: "POST",
		url: AJAX_URL,
		timeout: timeoutAjax,
		async: true,
		cache: false,
		data: "function=getOnlineHighscores&time=15&mapMD5=" + level,
		success: function(lhmsg) {
			var nickToShow = USR_NICK;
			if(USR_REPLAY) nickToShow = USR_REPLAY;
			$('#highscores_in').html(lhmsg);
			if($("#highscores_in tr").length > (place)) {
				nextTime = parseInt($("#highscores_in tr:nth(0) td:last").text());
				$("#highscores_in tr:nth(" + place + ")").before("<tr class=\"red\"><td>" + (place+1) + "</td><td class=\"nick\">" + nickToShow + "</td><td>??:??:???</td></tr>");
			}else {
				nextTime = -1;
				$("#highscores_in table").append("<tr class=\"red\"><td>" + (place+1) + "</td><td class=\"nick\">" + nickToShow + "</td><td>??:??:???</td></tr>");
			}
		},
		error: function() {
			if($('#highscores_in').html().indexOf('ajax-loader.gif') > -1) {
				$('#highscores_in').html("<span style='color:white'>Timeout Reached<br />Please retry</span>");
			}
		}
	});
}

function sendHighscore(level) {
	//console.log(replay.toString());
	$.ajax({
		type: "POST",
		url: AJAX_URL,
		async: true,
		cache: false,
		data: "function=setHighscore&replay=" + replay.toString() + "&avgfps=" + AVGFPS + "&lvl=" + level + "&lvlType=" + lvlType + "&time=" + TIME + "&nick=" + USR_NICK + "&pwd=" + USR_PWD,
		success: function(shmsg) {
			var score = jQuery.parseJSON(shmsg);
			if(score) {
				if(score.newbest != null) {
					highscoreMessage = "New Highscore !  Ranked #" + score.newbest;
				}
				else if(score.nonewbest != null) {
					highscoreMessage = "No Highscore !  Still ranked #" + score.nonewbest + " with " + score.oldtime;
				}
				else if(score.newscore != null) {
					highscoreMessage = "New Entry. Ranked #" + score.newscore;
				}
				else if(score.nonick != null) {
					highscoreMessage = "Unknown nickname, can't save highscores";
				}
				else if(score.error != null) {
					highscoreMessage = "Stop Cheating !!!";
				}
			}
			//alert(shmsg);
			//highscoreMessage
		}
	});
}

function sendOnlineHighscore(level) {
	$.ajax({
		type: "POST",
		url: AJAX_URL,
		async: true,
		cache: false,
		data: "function=setOnlineHighscore&replay=" + replay.toString() + "&avgfps=" + AVGFPS + "&mapMD5=" + level + "&time=" + TIME + "&nick=" + USR_NICK + "&pwd=" + USR_PWD,
		success: function(shmsg) {
			var score = jQuery.parseJSON(shmsg);
			if(score) {
				if(score.newbest != null) {
					highscoreMessage = "New Highscore !  Ranked #" + score.newbest;
				}
				else if(score.nonewbest != null) {
					highscoreMessage = "No Highscore !  Still ranked #" + score.nonewbest + " with " + score.oldtime;
				}
				else if(score.newscore != null) {
					highscoreMessage = "New Entry. Ranked #" + score.newscore;
				}
				else if(score.nonick != null) {
					highscoreMessage = "Unknown nickname, can't save highscores";
				}
				else if(score.error != null) {
					highscoreMessage = "Stop Cheating !!!";
				}
			}
			//alert(shmsg);
			//highscoreMessage
		}
	});
}

function manageHighscore() {
	if(nextTime != -1) {
		if(TIME > nextTime) {
			var nickToShow = USR_NICK;
			if(USR_REPLAY) nickToShow = USR_REPLAY;
			$("#highscores_in tr:nth(" + place + ")").remove();
			$("#highscores_in tr:nth(" + place + ")").after("<tr class=\"red\"><td>" + (place+2) + "</td><td class=\"nick\">" + nickToShow + "</td><td>" + toTime(TIME) + "</td></tr>");
			place++;
			if($("#highscores_in tr").length > (place+1)) {
				nextTime = parseInt($("#highscores_in tr:nth(" + (place+1) + ") td:last").text());
			}else nextTime = -1;
		}
	}
	
	if((TIME > 0 && TIME % 30 == 0) || (finNiveau() && perso.fadeNextLevel == 120)) {
		$("#highscores_in tr:nth(" + place + ") td:last").text(toTime(TIME));
	}
}