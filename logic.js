
/**
 * http://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
 * Randomize array element order in-place.
 * Using Durstenfeld shuffle algorithm.
**/
function shuffleArray(array) {
  for (var i = array.length - 1; i > 0; i--) {
	var j = Math.floor(Math.random() * (i + 1));
	var temp = array[i];
	array[i] = array[j];
	array[j] = temp;
  }
  return array;
}

function getStripe(i) {
  if(i % 2 == 1) {
	return "odd";
  } else {
	return "even";
  }
}

function renderTeams(teams) {
  var d = document.getElementById("teamlist");
  d.innerHTML = "<h3>Example Teams</h3>";

  var t = document.createElement("table");

  var head = document.createElement("thead");
  head.innerHTML = "<th>Seed</th>"
	+ "<th>Rank</th>"
	+ "<th>Abbr</th>"
	+ "<th>Name</th>"
	+ "<th>GP</th>"
	+ "<th>W</th>"
	+ "<th>L</th>"
	+ "<th>Pct</th>"
	+ "<th>SWIM</th>"
	+ "<th>Perf</th>"
  ;
  t.appendChild(head);

  for(var i=0; i<teams.length; i++) {
	team = teams[i];

	var row = document.createElement("tr");
	row.setAttribute("class", getStripe(i));
	row.innerHTML = "<td>" + (i+1) + "</td>"
	  + "<td>" + team.rank + "</td>"
	  + "<td>" + team.abbr + "</td>"
	  + "<td>" + team.name + "</td>"
	  + "<td>" + team.gplayed + "</td>"
	  + "<td>" + team.gwon + "</td>"
	  + "<td>" + team.glost + "</td>"
	  + "<td>" + team.gpct + "%</td>"
	  + "<td>" + team.swim + "%</td>"
	  + "<td>" + team.perf + "%</td>"
	;
	t.appendChild(row);
  }

  d.appendChild(t);
}

// Stable sort
function mergeSort(list, fn, s, e) {
  if(s === undefined || e === undefined) {
	s = 0;
	e = list.length - 1;
  }

  if(s >= e ) {
	return;
  }

  var m = Math.floor((s + e) / 2);

  mergeSort(list, fn, s, m);
  mergeSort(list, fn, m+1, e);

  var copy = list.slice(s, s+m+2);
  var i=0, j=m+1, k=s;
  while(s+i <= m && j <= e) {
	list[k++] = (fn(list[j], copy[i]) < 0) ? list[j++] : copy[i++];
  }
  while(s+i <= m) {
	list[k++] = copy[i++];
  }
}

function sortByField(teams, field, ascending) {
  mergeSort(teams, function(a, b) { return (ascending ? -1 : 1) * (b[field] - a[field]); });
}

function renderStandings(sim, teams) {
  sortByField(teams, "won");
  sim.html += "<h4>Standings:</h4>"
  sim.html += "<table class=\"sortable\"><thead>";
  sim.html += "<th>Rank</th><th>Team</th>";
  sim.html += "</thead>";
  for(var i=0; i<teams.length; i++) {
	var team = teams[i];
	sim.html += "<tr class=\"" + getStripe(i) + "\">";
	sim.html += "<td>" + (i+1) + "</td>"
	  + "<td>" + team.abbr + " (" + team.won + "-" + team.lost + ")";
	sim.html += "</tr>";
  }
  sim.html += "</table>";
}

function deepCopy(obj) {
  return JSON.parse(JSON.stringify(obj));
}

var id = 0;
function startSim(teams) {
  var sim = {};
  sim.html = "";
  sim.games = 0;
  sim.competitive = 0;
  sim.timeslots = [];
  sim.firstslot = 0;
  sim.rematches = 0;
  sim.teams = deepCopy(teams);
  sim.id = (id++);

  for(var i=0; i<sim.teams.length; i++) {
	var team = sim.teams[i];
	team.won = 0;
	team.lost = 0;
	team.played = 0;
	team.opponents = [];
  }

  return sim;
}

function havePlayed(a, b) {
  for(var i=0; i<a.opponents.length; i++) {
	if(a.opponents[i][0] == b) {
	  return true;
	}
  }
  return false;
}

function upsetChance(a, b) {
  var pct_diff = Math.abs(a.perf - b.perf);
  var upset_chance = Math.pow((100.0 - pct_diff) / 100.0, 3.0) / 2.0; // range from 0.5 to 0
  //  pct_diff ranges from 0 to 100
  //  upset_chance ranges from 0.5 to 0.0
  //  At 0, upset chance should be 0.5
  //  At 25, upset chance by above formula would be 0.21
  //  At 50, upset chance by above formula would be 0.06
  //  At 75, upset chance by above formula would be 0.01
  //  At 100, upset chance should be 0.0
  return upset_chance;
}

// Returns true if there is a 20% chance of an upset
function isCompetitive(a, b) {
  var upset_chance = upsetChance(a, b);
  if(upset_chance > 0.2) {
	return true;
  } else {
	return false;
  }
}

function playGame(sim, a, b, num_pitches) {
  sim.games++;
  if(isCompetitive(a, b)) {
	sim.competitive++;
  }

  if(havePlayed(a, b)) {
	sim.rematches++;
  }

  //console.log("playGame", a.abbr, b.abbr);

  var scheduled = false;
  if(sim.timeslots.length == 0 || sim.timeslots[sim.timeslots.length-1].length != 0) {
	sim.timeslots.push([]);
  }

  for(var i=sim.firstslot; scheduled == false && i<sim.timeslots.length; i++) {
	var timeslot = sim.timeslots[i];
	//console.log("timeslot", i, "length", sim.timeslots[i].length);
	if(timeslot.length != num_pitches) {
	  var good_slot = true;
	  for(var j=0; scheduled == false && j<timeslot.length; j++) {
		if(timeslot[j][0] == a || timeslot[j][1] == a
			|| timeslot[j][0] == b || timeslot[j][1] == b) {
		  good_slot = false;
		}
	  }
	  if(good_slot) {
		timeslot.push([a, b]);
		scheduled = true;
	  }
	}
  }

  if(!scheduled) {
	console.log("failed to schedule", a.abbr, b.abbr);
  }

  a.played++;
  b.played++;

  var upset_chance = upsetChance(a, b);
  //console.log("a", a.perf, "b", b.perf, "upset_chance", upset_chance);
  if(a.perf > b.perf && (state.deterministic || (Math.random() > upset_chance))) {
	a.won++;
	b.lost++;
	a.opponents.push([b, 1]);
	b.opponents.push([a, 0]);
	return true;
  } else {
	a.lost++;
	b.won++;
	a.opponents.push([b, 0]);
	b.opponents.push([a, 1]);
	return false;
  }
}

function getNumTimeslots(timeslots) {
  var num = 0;
  for(var i=0; i<timeslots.length; i++) {
	if(timeslots[i].length > 0) {
	  num++;
	}
  }

  return num;
}

function getMinGames(teams) {
  //console.log("teams", teams);
  var min = null;
  for(var i=0; i<teams.length; i++) {
	if(min == null || teams[i].played < min) {
	  //console.log("min", min, teams[i], teams[i].played);
	  min = teams[i].played;
	}
  }
  return min;
}

function getMaxGames(teams) {
  var max = null;
  for(var i=0; i<teams.length; i++) {
	if(max == null || teams[i].played > max) {
	  max = teams[i].played;
	}
  }
  return max;
}

function simBracket(sim, teams, num_pitches) {
  sortByField(teams, "won");
  var levels = Math.floor(Math.log2(teams.length));
  var playin = teams.length - Math.pow(2, levels);
  //console.log("playin", playin);
  for(var i=0; i<teams.length; i++) {
	teams[i].seed = i+1;
  }

  sim.html += "<h4>Bracket:</h4>";
  sim.html += "<table>";
  sim.html += "<thead>";

  if(playin != 0) {
	sim.html += "<th>Play-in</th>";
  }

  for(var i=levels; i>0; i--) {
	sim.html += "<th>";
	if(i == 1) {
	  sim.html += "Finals";
	} else if(i == 2) {
	  sim.html += "Semifinals";
	} else if(i == 3) {
	  sim.html += "Quarterfinals";
	} else {
	  sim.html += "Round of " + Math.pow(2, i);
	}
	sim.html += "</th>";
  }
  sim.html += "</thead><tr>";

  //console.log("teams", teams.length, "playin", playin);
  var playing = [];
  var new_playing = [];
  for(var i=0; i<teams.length - 2*playin; i++) {
	new_playing.push(teams[i]);
  }
  //console.log("BYEs", new_playing);

  if(playin != 0) {
	sim.html += "<td style=\"vertical-align: top\">";
	//sim.html += playin + " games<br/>";
	for(var i=playin-1; i>=0; i--) {
	  var seed1 = teams.length - playin - i;
	  var seed2 = teams.length - i;
	  //console.log("seed1", seed1, "seed2", seed2);
	  var a = teams[seed1-1];
	  var b = teams[seed2-1];
	  //console.log("a", a, "b", b);
	  var render_a = "";
	  var render_b = "";
	  if(playGame(sim, a, b, num_pitches)) {
		new_playing.push(a);
		render_a = "<b>" + a.abbr + "</b>&nbsp;(#" + a.seed + ")&nbsp;";
		render_b = b.abbr + "&nbsp;(#" + b.seed + ")&nbsp;";
	  } else {
		new_playing.push(b);
		render_a = a.abbr + "&nbsp;(#" + a.seed + ")&nbsp;";
		render_b = "<b>" + b.abbr + "</b>&nbsp;(#" + b.seed + ")&nbsp;";
	  }
	  sim.html += render_a + "&nbsp;vs&nbsp;" + render_b + "<br/>";
	}
	sim.html += "</td>";
  }
  playing = new_playing;
  //console.log("after play-in round", playing);

  for(var i=levels; i>0; i--) {
	new_playing = [];
	sim.html += "<td style=\"vertical-align: top\">";
	var games = Math.pow(2, i-1);
	//console.log("games", games, "playing", playing.length, playing);
	for(var j=0; j<games; j++) {
	  var seed1 = j+1;
	  var seed2 = 2*games - j;
	  //console.log("seed1", seed1, "seed2", seed2);
	  var a = playing[seed1-1];
	  var b = playing[seed2-1];
	  //console.log("a", a, "b", b);
	  var render_a = "";
	  var render_b = "";
	  if(playGame(sim, a, b, num_pitches)) {
		new_playing.push(a);
		render_a = "<b>" + a.abbr + "</b>&nbsp;(#" + a.seed + ")&nbsp;";
		render_b = b.abbr + "&nbsp;(#" + b.seed + ")&nbsp;";
	  } else {
		new_playing.push(b);
		render_a = a.abbr + "&nbsp;(#" + a.seed + ")&nbsp;";
		render_b = "<b>" + b.abbr + "</b>&nbsp;(#" + b.seed + ")&nbsp;";
	  }
	  sim.html += render_a + "&nbsp;vs&nbsp;" + render_b + "<br/>";
	}
	sim.html += "</td>";
	playing = new_playing;
  }
  sim.html += "</tr></table>";

  if(playing.length == 1) {
	sim.winner = playing[0];
  }
}

/**
 * Simulation functions are given an object with the following properties and can modify it as they need:
 *   name: Simulation name
 *   html: Simulation HTML
 *   games: Number of games
 *   competitive: Number of competitive games
 *   timeslots: Timeslots required (array)
 *   mingames: Minimum games played by a team
 *   maxgames: Maximum games played by a team
 *   rematches: Number of rematches
**/

function simPools(sim, teams, num_pitches, pool_size) {
  sim.name = "Pools of " + pool_size + " and Bracket";
  //console.log(sim.name);

  // Divide teams into pools
  var pools = [];
  var pool = null;
  var num_pools = Math.ceil(teams.length / pool_size);
  for(var i=0; i<num_pools; i++) {
	var pool = [];
	for(var j=i; j<teams.length; j+=num_pools) {
	  pool.push(teams[j]);
	}
	pools.push(pool);
  }

  sim.html += "<h4>Pool play:</h4>";
  sim.html += "There are " + num_pools + " pools.";
  if(teams.length % pool_size != 0) {
	sim.html += " There are " + (teams.length % num_pools) + " pools of " + pool_size
	  + " and " + (num_pools - (teams.length % num_pools)) + " with " + pools[pools.length-1].length + " teams.";
  } else {
	sim.html += " All of them have " + pool_size + " teams.";
  }

  // Play games
  for(var i=0; i<pools.length; i++) {
	var pool = pools[i];
	//console.log("pool", i);
	for(var j=0; j<pool.length; j++) {
	  for(var k=j+1; k<pool.length; k++) {
		playGame(sim, pool[j], pool[k], num_pitches);
	  }
	}
  }

  // Render pools and pool play standings
  sim.html += "<br/>";
  sim.html += "<table>";
  sim.html += "<thead>";
  for(var i=0; i<pools.length; i++) {
	sim.html += "<th>Pool " + (i+1) + "</th>";
  }
  sim.html += "</thead><tr>";
  for(var i=0; i<pools.length; i++) {
	sim.html += "<td style=\"vertical-align: top\">";

	var pool = pools[i];
	sortByField(pool, "won");
	var pool_size = pool.length;

	for(var j=0; j<pool_size; j++) {
	  var team = pool[j];
	  sim.html += team.abbr + " (" + team.won + "-" + team.lost + ") <br/>";
	}
	sim.html += "</td>";
  }
  sim.html += "</tr></table>";

  // Bracket
  simBracket(sim, teams, num_pitches);
  
  //console.log("sim", sim);

  sim.mingames = getMinGames(teams);
  sim.maxgames = getMaxGames(teams);
  sim.slots = getNumTimeslots(sim.timeslots);

  return sim;
}

function simSwiss(sim, teams, num_pitches, bracket_size, hybrid, pairFIDE) {
  if(pairFIDE === undefined || pairFIDE == 0) {
	sim.name = "Swiss (Monrad)";
  } else {
	sim.name = "Swiss (FIDE)";
  }

  var num_rounds = Math.ceil(Math.log2(teams.length));
  num_rounds -= hybrid;

  sim.name = num_rounds + "-round " + sim.name;

  //console.log("bracket_size", bracket_size, "teams.length", teams.length);
  if(bracket_size == teams.length) {
	sim.name += " and Full Bracket";
  } else if(bracket_size == 0 && hybrid == 0) {
	sim.name += " and Tiebreakers";
  } else if(bracket_size > 0) {
	sim.name += " and " + bracket_size + "-team Bracket";
  }

  //console.log(sim.name);

  sim.html += "<h4>Gameplay:</h4>"
  sim.html += "<table><thead>";
  for(var i=0; i<num_rounds; i++) {
	sim.html += "<th>Round " + (i+1) + "</th>";
  }
  sim.html += "</thead><tr>";

  var round_results = [];
  for(var i=0; i<teams.length; i++) {
	round_results[i] = [[teams[i], 0, 0]];
  }

  var matchups = [];
  for(var i=0; i<num_rounds; i++) {
	sim.html += "<td style=\"vertical-align: top\">";

	matchups = [];
	var done = new Map();
	for(var j=0; j<teams.length; j++) {
	  //console.log("done", done);
	  if(done.has(j)) {
		continue;
	  }

	  var opponent = null;

	  if(pairFIDE == 1) {
		var numSameRecord = 0;
		for(var k=0; k<teams.length; k++) {
		  if(teams[k].won == teams[j].won) {
			numSameRecord++;
		  }
		}

		if(numSameRecord == 1) {
		  for(var k=j+1; k<teams.length; k++) {
			if(k != j && !done.has(k) && !havePlayed(teams[j], teams[k])) {
			  opponent = k;
			  break;
			}
		  }
		} else {
		  var offset = Math.floor(numSameRecord/2);
		  for(var k=j+offset; k<teams.length; k++) {
			if(k != j && !done.has(k) && !havePlayed(teams[j], teams[k])) {
			  opponent = k;
			  break;
			}
		  }
		}
	  } else {
		for(var k=j+1; k<teams.length; k++) {
		  if(k != j && !done.has(k) && !havePlayed(teams[j], teams[k])) {
			opponent = k;
			break;
		  }
		}
	  }

	  if(opponent) {
		//console.log("matching up", j, k);
		//console.log(teams[j].abbr, teams[k].abbr);
		matchups.push([j, k]);
		done.set(j, true);
		done.set(k, true);
	  }
	}

	for(var j=0; j<matchups.length; j++) {
	  //console.log("matchup", j, matchups[j]);
	  var a_seed = matchups[j][0] + 1;
	  var b_seed = matchups[j][1] + 1;
	  var a = teams[a_seed-1];
	  var b = teams[b_seed-1];
	  var render_a = "";
	  var render_b = "";

	  var a_desc = "(#" + a_seed + ", " + a.won + "-" + a.lost + ")";
	  var b_desc = "(#" + b_seed + ", " + b.won + "-" + b.lost + ")";

	  if(playGame(sim, a, b, num_pitches)) {
		render_a = "<b>" + a.abbr + "</b>";
		render_b = b.abbr;
	  } else {
		render_a = a.abbr;
		render_b = "<b>" + b.abbr + "</b>";
	  }

	  render_a = render_a + "&nbsp;" + a_desc;
	  render_b = render_b + "&nbsp;" + b_desc;

	  sim.html += render_a + "&nbsp;vs&nbsp;" + render_b + "<br/>";
	}

	sim.html += "</td>";
	sortByField(teams, "won");

	for(var j=0; j<teams.length; j++) {
	  round_results[j].push([teams[j], teams[j].won, teams[j].lost]);
	}

	//if(teams[0].won != teams[1].won) {
	//  break;
	//}
  }
  sim.html += "</tr></table>";
  
  sim.html += "<h4>Standings:</h4>"
  sim.html += "<table class=\"sortable\"><thead>";
  sim.html += "<th>Rank</th><th>Initial Seeding</th>";
  for(var i=1; i<round_results[0].length; i++) {
	sim.html += "<th>Round " + i + "</th>";
  }
  sim.html += "</thead>";
  sim.html += "<tbody>";
  //console.log("round_results", round_results);
  for(var i=0; i<round_results.length; i++) {
	sim.html += "<tr class=\"" + getStripe(i) + "\">";
	sim.html += "<td>" + (i+1) + "</td>";
	var round = round_results[i];
	for(var j=0; j<round.length; j++) {
	  var team = round[j][0];
	  var won = round[j][1];
	  var lost = round[j][2];
	  var render_team = team.abbr;
	  if(j > 0) {
		render_team += "&nbsp;(" + won + "-" + lost + ")";
	  }
	  sim.html += "<td>" + render_team + "</td>";
	}
	sim.html += "</tr>";
  }
  sim.html += "</tbody>";
  sim.html += "</table>";

  // How big a bracket?
  var winning_teams = 0;
  for(var i=0; i<teams.length; i++) {
	if(teams[i].won == teams[0].won) {
	  winning_teams++;
	}
  }

  //console.log(sim.name);
  if(bracket_size < winning_teams) {
	bracket_size = winning_teams;
  }

  if(bracket_size < 2) {
	sim.html += "<h4>Bracket:</h4><b>There is a clear winner, no bracket is necessary.</b>";
	sim.winner = teams[0];
  } else {
	var bracket_teams = teams.slice(0, bracket_size);
	simBracket(sim, bracket_teams, num_pitches);
  }

  sim.mingames = getMinGames(teams);
  sim.maxgames = getMaxGames(teams);
  sim.slots = getNumTimeslots(sim.timeslots);

  return sim;
}

function simRoundRobin(sim, teams, num_pitches, playoff_teams) {
  sim.name = "Round Robin";

  if(playoff_teams == 0) {
	sim.name += " and Tiebreakers";
  } else if(playoff_teams == 2) {
	sim.name += " and 2-team playoff";
  } else if(playoff_teams == 4) {
	sim.name += " and 4-team playoff";
  } else {
	return null;
  }

  // Play games
  for(var i=0; i<teams.length; i++) {
	for(var j=i+1; j<teams.length; j++) {
	  var a = teams[i];
	  var b = teams[j];
	  playGame(sim, a, b, num_pitches);
	}
  }

  // Standings
  renderStandings(sim, teams);

  // How big a bracket?
  var winning_teams = 0;
  for(var i=0; i<teams.length; i++) {
	if(teams[i].won == teams[0].won) {
	  winning_teams++;
	}
  }

  if(playoff_teams < winning_teams) {
	playoff_teams = winning_teams;
  }
  
  // Bracket
  if(playoff_teams > 1) {
	var bracket_teams = teams.slice(0, playoff_teams);
	//console.log("bracket_teams", bracket_teams.length, bracket_teams);
	simBracket(sim, bracket_teams, num_pitches);
  } else if(winning_teams == 1) {
	sim.html += "<h4>Bracket:</h4><b>There is a clear winner, no bracket is necessary.</b>";
	sim.winner = teams[0];
  }

  sim.mingames = getMinGames(teams);
  sim.maxgames = getMaxGames(teams);
  sim.slots = getNumTimeslots(sim.timeslots);

  return sim;
}

function renderFormats(results) {
  var d = document.getElementById("simulations");
  d.innerHTML = "<h3>Tournament Simulations</h3>";

  for(var i=0; i<results.length; i++) {
	var sim = results[i];

	var s = document.createElement("div");
	var html = "";
	html += "<a id=\"" + sim.id + "\" name=\"" + sim.id + "\"/>";
	html += "<h3>Format: " + sim.name + "</h3>";
	//console.log("sim", sim);
	html += sim.html;
	html += "<h4>Summary:</h4>";
	html += "<ul>";
	html += "<li>Games: " + sim.games + "</li>";
	html += "<li>Competitive games: " + sim.competitive + "</li>";
	html += "<li>Timeslots needed: " + sim.slots + "</li>";
	html += "<li>Min games for a team: " + sim.mingames + "</li>";
	html += "<li>Max games for a team: " + sim.maxgames + "</li>";

	if(sim.winner) {
	  html += "<li>Winner's path:";
	  html += "<ul>";
	  for(var j=0; j<(sim.winner.opponents.length); j++) {
		match = sim.winner.opponents[j];
		if(match[1] == 1) {
		  render_a = "<b>" + sim.winner.abbr + "</b>";
		  render_b = match[0].abbr;
		} else {
		  render_a = sim.winner.abbr;
		  render_b = "<b>" + match[0].abbr + "</b>";
		}
		html += "<li>" + render_a + " vs " + render_b + "</li>";
	  }
	  html += "</ul></li>";
	}

	html += "</ul>";

	s.innerHTML = html;
	d.appendChild(s);
  }
}

function renderSummary(formats, skipped) {
  var d = document.getElementById("summary");
  d.innerHTML = "<h3>Summary</h3>";

  var t = document.createElement("table");
  t.className = "sortable";

  var thead = document.createElement("thead");
  thead.innerHTML = "<th>Format</th><th>Games</th><th>Competitive games</th><th><u>% Competitive</u></th><th>Rematches</th><th>Timeslots</th><th>Min games</th><th>Max games</th>";
  t.appendChild(thead);

  formats.sort(function(a, b) { return b.competitive / b.games
	  - a.competitive / a.games; });

  //formats.sort(function(a, b) { return a.games - b.games; });

  var tbody = document.createElement("tbody");
  for(var i = 0; i < formats.length; i++) {
	res = formats[i];

	var row = document.createElement("tr");
	row.setAttribute("class", getStripe(i));
	row.innerHTML = "<td><a href=\"#" + res.id + "\">" + res.name + "</a></td>"
	  + "<td>" + res.games + "</td>"
	  + "<td>" + res.competitive + "</td>"
	  + "<td>" + Math.round((100.0 * res.competitive / res.games)) + "%</td>"
	  + "<td>" + res.rematches + "</td>"
	  + "<td>" + res.slots + "</td>"
	  + "<td>" + res.mingames + "</td>"
	  + "<td>" + res.maxgames + "</td>";
	tbody.appendChild(row);
  }

  t.appendChild(tbody);

  t.id = "summaryTable";
  d.appendChild(t);
  sorttable.makeSortable(document.getElementById("summaryTable"));

  var ul = document.createElement("ul");
  ul.innerHTML = "";
  for(var i=0; i < skipped.length; i++) {
	res = skipped[i];
	ul.innerHTML += "<li><i>" + res.error + "</i></li>";
  }
  d.appendChild(ul);
}

function loadFormState(formId) {
  var elements = document.getElementById(formId).elements;

  var ret = {};
  for(var i=0; i<elements.length; i++) {
	var key = elements[i].id;
	ret[key] = elements[i].value;
  }

  return ret;
}

function setFormValues(formId, params) {
  var elements = document.getElementById(formId).elements;

  for(var i=0; i<elements.length; i++) {
	var key = elements[i].id;
	if(params[key] !== undefined) {
	  var val = params[key];
	  if(typeof val == "number") {
		elements[i].value = val;
	  } else if(typeof val == "boolean") {
		elements[i].value = val ? "yes" : "no";
	  }
	}
  }
}

function loadUrlState() {
  var queryStr = window.location.search.substring(1);
  var params = queryStr.split("&");

  var rawState = {};
  for(var i=0; i<params.length; i++) {
	var kv = params[i].split("=");
	var key = kv[0];
	var val = decodeURIComponent(kv[1]);
	rawState[key] = val;
  }

  return rawState;
}

function updateUrl(oldState, state) {
  var allowedParams = getDefaultState();
  var state_changed = false;
  for (var key in allowedParams) {
	if (allowedParams.hasOwnProperty(key) && oldState[key] != state[key]) {
	  state_changed = true;
	  break;
	}
  }

  if(state_changed) {
	var newQueryStr = "?";
	for(var key in state) {
	  if (state.hasOwnProperty(key)) {
		newQueryStr += key + "=" + encodeURIComponent(state[key]) + "&";
	  }
	}

	if(newQueryStr.endsWith("&")) {
	  newQueryStr = newQueryStr.slice(0, -1);
	}
	
	//console.log(newQueryStr);

	try {
	  if(window.location.search == "") {
		window.history.replaceState('', '', newQueryStr);
		//console.log("replaceState", newQueryStr);
	  } else {
		window.history.pushState('', '', newQueryStr);
		//console.log("pushState", newQueryStr);
	  }
	} catch(e) {
	  //console.log(e);
	}
  }
}

function mergeLeft(a, b) {
  var ret = {};

  for(var key in a) {
	if(a.hasOwnProperty(key)) {
	  ret[key] = a[key];
	}
  }

  for(var key in b) {
	if(b.hasOwnProperty(key) && ret[key] === undefined) {
	  ret[key] = b[key];
	}
  }

  return ret;
}

function parseParams(params) {
  var ret = {};

  var allowedParams = getDefaultState();

  for (var key in params) {
	if (params.hasOwnProperty(key) && allowedParams[key] !== undefined) {
	  var val = params[key];

	  if(val == "yes" || val == "no") {
		// Boolean
		ret[key] = (val == "yes");
	  } else if(!isNaN(parseInt(val))) {
		// Number
		ret[key] = parseInt(val);
	  }
	}
  }

  return ret;
}

function getDefaultState() {
  return {
	"teams": 20,
	"pitches": 4,
	"deterministic": true,
	"randomTeams": true,
	"allFormats": false,
  };
}

var initUrlState = null;
function loadState() {
  // On first load or popstate, use URL params
  if(initUrlState === null) {
	initUrlState = mergeLeft(parseParams(loadUrlState()), getDefaultState());
	//console.log("initUrlState", initUrlState);
	setFormValues("controls", initUrlState);

	return initUrlState;
  } else {
	var formState = mergeLeft(parseParams(loadFormState("controls"), getDefaultState()));
	//console.log("formState", formState);

	return formState;
  }
}

function popstate(event) {
  // Don't fire if only the # part changes
  if(event.state === null) {
	event.preventDefault();
	return false;
  }

  console.log("popstate");
  // Clear initUrlState so parameters are reloaded from the URL
  initUrlState = null;
  state = loadState();
  validateState(state);
  recalculate();
}

var state = {};
function stateChanged() {
  var oldState = state;
  state = loadState();
  validateState(state);
  updateUrl(oldState, state);
  recalculate();
}

function validateState(state) {
  var valid = true;
  if(state.teams < 4) {
	state.teams = 3;
	valid = false;
  } else if(state.teams > teams.length) {
	state.teams = teams.length;
	valid = false;
  }

  if(state.pitches < 1) {
	state.pitches = 1;
	valid = false;
  }

  if(!valid) {
	setFormValues("controls", state);
  }
}

function recalculate() {
  var sel_teams = teams.slice(0, state.teams);

  if(state.randomTeams) {
	// Select a random set of teams
	var teams_copy = teams.slice(0);
	shuffleArray(teams_copy);
	sel_teams = teams_copy.slice(0, state.teams);
	sortByField(sel_teams, "rank", true);
  }

  renderTeams(sel_teams);

  var results = [];
  var skipped = [];
  var sim = {};
  var last_num_pools = null;
  var last_pool_size = null;
  for(pool_size=3; pool_size<=12; pool_size++) {
	var num_pools = Math.ceil(state.teams / pool_size);

	if(num_pools < 2) {
	  skipped.push({"error": "Can't simulate pools of " + pool_size
		  + " because there would only be 1 pool."});
	  break;
	}

	if(num_pools != last_num_pools) {
	  sim = startSim(sel_teams.slice(0));
	  //console.log("sim", sim);
	  results.push(simPools(sim, sim.teams, state.pitches, pool_size));
	  last_pool_size = pool_size;
	} else {
	  skipped.push({"error": "Skipping pools of " + pool_size + " as number of pools ("
		  + num_pools + ") would be the same as with pools of " + last_pool_size + "."});
	}

	last_num_pools = num_pools;
  }

  if(state.teams % 2 == 0) {
	for(var pairFIDE=0; pairFIDE < 2; pairFIDE++) {
	  if(state.allFormats == false && pairFIDE == 0) {
		continue;
	  }

	  var maxFewerRounds = Math.ceil(Math.log2(sel_teams.length)/2.0);
	  for(var i=0; true; i++) {
		if(i < maxFewerRounds) {
		  //for(var bracket=0; bracket<5; bracket+=2) {
		  //  sim = startSim(sel_teams.slice(0));
		  //  results.push(simSwiss(sim, sim.teams, state.pitches, bracket, i, pairFIDE));
		  //}

		  sim = startSim(sel_teams.slice(0));
		  results.push(simSwiss(sim, sim.teams, state.pitches, 4, i, pairFIDE));

		  sim = startSim(sel_teams.slice(0));
		  results.push(simSwiss(sim, sim.teams, state.pitches, 8, i, pairFIDE));

		  sim = startSim(sel_teams.slice(0));
		  results.push(simSwiss(sim, sim.teams, state.pitches, state.teams, i, pairFIDE));
		} else {
		  break;
		}
	  }
	}
  } else {
	skipped.push({"error": "Skipping Swiss formats as there are an odd number of teams. (" + state.teams + ")"});
  }

  if(state.teams <= 12) {
	for(var i=0; i<5; i+=2) {
	  sim = startSim(sel_teams.slice(0));
	  results.push(simRoundRobin(sim, sim.teams, state.pitches, i));
	}
  } else {
	skipped.push({"error": "Skipping round-robin simulations as there are more than 12 teams."});
  }

  renderFormats(results);
  renderSummary(results, skipped);
}