const https = require('https');
const fs = require('fs');
const jsonpath = require('jsonpath');

const Games = [
	{"title": "Mega Candy Cash"},
	{"title": "Mega Solitaire"},
	{"title": "Mega Bingo Cash"}
];

const Params = {
	"platform":
	{	"nirex":
		{	"casino":
			{	"betandreas.com":
				[	{	"url": "https://betandreas.com/api/v2/casino/providers?productTypes[]=casino&productTypes[]=virtual_sport&productTypes[]=fast_games&currency=UZS&platform=desktop",
						"tests":
						{	"provider exists": '$.elements[?(@.title=="Megafair")]'
						}
					},
					{	"url": "https://betandreas.com/api/v1/casino/games?page=1&itemsOnPage=36&platform=desktop&productTypes[]=casino&productTypes[]=virtual_sport&productTypes[]=fast_games&provider[]=564",
						"tests":
						{	"game_exists": '$.elements[?(@.name=="<GAME>")]'
						}
					},
					{	"iterator" : {"from":1, "to":5, "step":1, "type":"page"},
						"url": "https://betandreas.com/api/v1/fast-games/games?page=<ITERATOR>&itemsOnPage=100&platform=desktop",
						"tests":
						{	"fast_games": '$.elements[?(@.name=="<GAME>")]'
						}
					},
					{	"iterator" : {"from":1, "to":5, "step":1, "type":"page"},
						"url": "https://betandreas.com/api/v1/casino/games/top?page=<ITERATOR>&platform=desktop&itemsOnPage=100",
						"tests":
						{	"top": '$.elements[?(@.name=="<GAME>")]'
						}
					},
					{	"iterator" : {"from":1, "to":5, "step":1, "type":"page"},
						"url": "https://betandreas.com/api/v1/casino/games/recommended?page=<ITERATOR>&platform=desktop&itemsOnPage=100",
						"tests":
						{	"recommended": '$.elements[?(@.name=="<GAME>")]'
						}
					},
					{	"iterator" : {"from":1, "to":5, "step":1, "type":"page"},
						"url": "https://betandreas.com/api/v1/casino/games/new?page=<ITERATOR>&itemsOnPage=50&platform=desktop",
						"tests":
						{	"new": '$.elements[?(@.name=="<GAME>")]'
						}
					},
					{	"iterator" : {"from":1, "to":5, "step":1, "type":"page"},
						"url": "https://betandreas.com/api/v1/casino/games?page=<ITERATOR>&itemsOnPage=100&platform=desktop&category[]=1&category[]=2&category[]=89",
						"tests":
						{	"slots": '$.elements[?(@.name=="<GAME>")]'
						}
					}
				]
			}
		}
	}
};

/*
	4rabet:
		(TOP): https://4rabetsite.com/casino/popular
		(NEW): https://4rabetsite.com/casino/new-games
	NIREX:
		VIVI
			(TOP): https://vivi.bet/ru/popular-games
			(NEW): https://vivi.bet/ru/new-games
		Banzai
			(TOP): https://banzai.bet/ru/casino/popular
			(NEW): https://banzai.bet/ru/casino/new
		Mostbet
			(TOP): https://plth1nig3zba.com/casino
			(NEW): https://plth1nig3zba.com/casino/new
		BetAndreas
			(TOP): https://betandreas.com/casino
			(NEW): https://betandreas.com/casino/new
*/

function FinalResult(res)
{
	for(var k in res)
		console.log(k + " = " + (res[k].success?"FOUND":"error"));
}

function Check(platform, casino, param)
{	var locker=0, result = {},
	loaded_ok = function(txt, response, iteration)
	{	var json = false;
		if(200 == response.statusCode)
		{	try { json=JSON.parse(txt); } catch(e) {json=false;}
			if(json) check_tests(json, iteration);
				else manage_error("wrong_json", iteration);
		} else manage_error("http:"+response.statusCode, iteration);
		if(0 == (--locker)) finished();
	},
	loaded_err = function(e, iteration)
	{	locker--;
		manage_error(e.code, iteration);
	},
	check_tests = function(json, iteration)
	{	for(var t in param.tests)
		{	if(param.tests[t].indexOf("<GAME>") < 0)
				check_one_test(json, t, param.tests[t], null, iteration);
			else for(var g=0; g<Games.length; g++)
				check_one_test(json, t, param.tests[t].replace(/<GAME>/g, Games[g].title), Games[g].title, iteration);
		}
	},
	check_one_test = function(json, test_title, path, game, iteration)
	{	var res = jsonpath.query(json, path);
		if(res && res.length) set_result(platform, casino, test_title, game, true, "found", iteration);
			else set_result(platform, casino, test_title, game, false, "not_found", iteration);
	},
	manage_error = function(descr, iteration)
	{	set_result(platform, casino, null, false, null, descr, iteration);
	},
	set_result = function(platform, casino, test, game, success, descr, iteration)
	{	var key = platform + ", " + casino + ", " + test + (game?", "+game:"");
		if(result[key] && result[key].success) return;
		result[key] = {
			"platform": platform,
			"casino": casino,
			"test": test,
			"game": game,
			"iteration": iteration,
			"success": success,
			"descr": descr
		};
	},
	loader = function(u, iteration)
	{	locker++;
		try
		{	const res = https.get(u, function(response)
			{	var data = "";
				response.on("data", append => data += append)
						.on("error", e => loaded_err(e, iteration))
						.on("end", () => loaded_ok(data, response, iteration));
			}).on('error', e => loaded_err(e,iteration));
		} catch(e)
		{	manage_error("exception", iteration);
		}
	},
	finished = function()
	{	FinalResult(result);
	};
	if(param.iterator)
	{	for(iteration=param.iterator.from; iteration<=param.iterator.to; iteration += param.iterator.step)
			loader(param.url.replace(/<ITERATOR>/g, iteration), iteration);
	} else loader(param.url, false);
}

for(var p in Params.platform)
{	for(var casino in Params.platform[p])
		for(var c in Params.platform[p].casino)
			for(var i=0; i<Params.platform[p].casino[c].length; i++)
				Check(p, c, Params.platform[p].casino[c][i]);
}
