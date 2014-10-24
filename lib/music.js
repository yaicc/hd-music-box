
/* require */
var uri = require('url');
var qsi = require('querystring');
var http = require('http');
var fs = require('fs')

function remove_filter(str) {
	str = str.replace(/[ | ]*\n/g,'\n');
    str = str.replace(/&nbsp;/ig,'');
    str = str.replace(/[\r\n]/ig,'');
    str = str.replace(/<script[^>]*?>.+?<\/script>/gi,'');
    str = str.replace(/&#039;/gi,"'");
    return str;
}

function trim(str) {
	str = str.replace(/<[^>].*?>/g, "");
	str = str.replace(/(^\s*\t*)|(\s*\t*$)/g, '');
	str = str.replace("'", '’');
	//str = str.replace(/(^\t*)|(\t*$)/g, '');
	return str;
}

function check_url(url){
	if (/^(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/.test(url)) {
    	return true;
	} else {
		return false;
	}
}

function file_format(file) {
	var url = file.url, format = file.format.toLowerCase(), size = file.size, rate = file.kbps, i = 0, ratetitle = ['无损','超高','高','标准','低','其他'];
    size = Math.round(size/1048576*10)/10+'M';
    if (rate > 320 && format != "mp3"){
        i = 0;
    } else if (rate > 256 && rate <= 320){
        i = 1;
    } else if (rate > 128 && rate <= 256){
        i = 2;
    } else if (rate > 64 && rate <= 128){
        i = 3;
    } else if (rate <= 64){
        i = 4;
    } else{
        i = 5;
    }
    return {
        "format":format,
        "rate":rate,
        "ratetitle":ratetitle[i],
        "size":size,
        "url":check_url(url) ? url : ''
    };
}

var search = function(key, callback) {
	/* main */
	var status = true;
	var search = encodeURIComponent(key);
	var get_url = "";
	for (var t = 1; t < 10; t++) {
		get_url = "http://musicmini.baidu.com/app/search/searchList.php?qword=" + search + "&page=" + t;
		var data = uri.parse(get_url);
		data.method = "GET";
		data.headers = {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Referer':'http://music.baidu.com/',
			'Accept-Language':'en-US,en;q=0.8,zh-CN;q=0.6,zh;q=0.4,zh-TW;q=0.2',
			'Cache-Control':'max-age=0',
			'Connection':'keep-alive',
			'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
		}
		if (status) {
			var req = http.request(data, function(res) {
				if (res.statusCode == 200) {
					var content = "";
					res.setEncoding('utf8');
					res.on('data', function (chunk) {
						content = content + chunk;
					});
					res.on('end', function() {
						content = remove_filter(content);
						var patt = /<td\sclass="num"><i\stitle.*?<td\sclass='aName'><a.*?>(.+?)<\/a>.*?playSong\('(.*?)','(.*?)','(.*?)','?(.*?)'?,'?(.*?)'?,'?(.*?)'?,'?(.*?)'?\)/ig;
						var re;
						while ((re = patt.exec(content)) != null) {
							//console.log(re);
							/* song info*/

							var return_data = {
								"songId": re[2].toString(),
								"songTitle": re[4],
								"songArtist": re[3],
								"songAlbum": trim(re[1]),
								"songAppend": re[5],
								"isHq": parseInt(re[6]),
								"hasMV": re[7],
								"isCloud": re[8]
							}

							callback({
								'ret': true,
								'data': return_data
							});
						}
					});
				}
			}).on('error', function(msg){
				//error message
			});
			req.end();
		}
	}
}

function download(opt, callback) {
	
	/* post */
	var song = {
		"songId": opt.songId,
        "songArtist": opt.rate ? '' : opt.songArtist,
        "songTitle": opt.rate ? '' : opt.songTitle,
		"songAppend": opt.rate ? '' :opt.songAppend,
		"linkType": opt.rate ? 2 : 1,
		"isLogin": 1,
		"isHq": opt.isHq,
		"isCloud": opt.isCloud,
		"hasMV": opt.hasMV,
		"noFlac": 0,
		"rate": opt.rate ? opt.rate : 0
	}
	//console.log(encodeURIComponent(Buffer(JSON.stringify(song)).toString('base64')));
	var post = "param=" + encodeURIComponent(Buffer(JSON.stringify(song)).toString('base64'));
	var data = uri.parse('http://musicmini.baidu.com/app/link/getLinks.php');
	data.method = "POST";
	data.headers = {
		"Content-Type": "application/x-www-form-urlencoded",
        "Host":"musicmini.baidu.com",
        "Referer":"http://musicmini.baidu.com/",
        "X-Requested-With":"XMLHttpRequest"
	}

	var req = http.request(data, function(res){
		if (res.statusCode) {
			res.setEncoding('utf8');
			var content = '';
			res.on('data', function(d){
				content += d;
			});
			res.on('end', function(){
				if (content && content != '[]') {
					var tmp = JSON.parse(content)[0];
					var files = [];
					for (var i in tmp.file_list) {
						files[i] = file_format(tmp.file_list[i]);
					}
					opt.album_image_url = tmp.album_image_url;
					opt.files = files;
					callback({'ret': true, 'data': opt});
				} else {
					callback({'ret': false, 'msg': '源地址错误'});
				}
			})
		}
	});

	req.write(post + "\n");
	req.end();
}

function savefile(url, file, callback) {

	var fileWriteStream = fs.createWriteStream(file, {flags: 'w',  encoding: null,  mode: 0666 });

	var req = http.get(url, function(res){
		//console.log(res.headers);
		res.pipe(fileWriteStream);
		fileWriteStream.on('close',function(){
			//console.log(fileWriteStream);
			callback();
		});
	});

}

exports.search = search;
exports.download = download;
exports.savefile = savefile;