$(function($) {

	/* require */
	var gui = require('nw.gui');
	var music = require('./lib/music');

	var song;
	var loading = 0;

	/* node-webkit */
	var win = gui.Window.get();
	win.on('close', function(){
		if (loading != 0) {
			if (confirm("当前还有 "+loading+" 个任务下载中，确定要关闭应用吗？")) {
				this.close(true);
			}
		} else {
			this.close(true);
		}
	});

	$('.win_min').click(function(){
		win.minimize();
	});

	$('.win_close').click(function(){
		win.close();
	});

	/* search enter*/
	$('#search').keyup(function(e){
		if (event.which == 13) {
			$('#sbtn').trigger('click');
		}
	});

	/* sbtn */
	$('#sbtn').click(function(){
		var search = $('#search').val();
		if (!search) {
			$('#song-list tbody tr').remove();
		} else {
			search = $.trim(search);
			var dom = $('#song-list tbody');

			if (loading == 0)$('.footer').html("HD音乐盒 - 当前搜索：" + search);
			$('.index').css('display', 'none');
			$('.main').css('display', 'block');
			dom.html("<tr><td colspan='5' class='loading'></td></tr>");

			var status = false;
			var key = 0;

			/* main */
			search = encodeURIComponent(search);
			music.search(search, function(res) {

				if (!status) {
					$('#song-list tbody tr').remove();
					status = true;
				}
				
				data = res.data;
				if (key%2 == 1) var tr = $("<tr class='even'></tr>");
				else var tr = $("<tr></tr>");
				tr.append($("<td id='"+data.songId+"'>"+data.songTitle+"</td>"));
				tr.append($("<td>"+data.songArtist+"</td>"));
				tr.append($("<td>"+data.songAlbum+"</td>"));
				tr.append($("<td><a href='javascript:;' class='download' data-song='"+JSON.stringify(data)+"'>下载</a></td>"));
				dom.append(tr);
				key++;
			});
		}
	});

	/* download */
	$('#song-list').on("click", ".download", function() {
		music.download($(this).data('song'), function(data){
			if (data.ret) {
				song = data.data;
				$('#down img').attr('src', song.album_image_url);
				$('#down_name').html(song.songTitle);
				$('#down_artist').html(song.songArtist);
				$('#down_album').html(song.songAlbum);
				var dom = $('.downSel');
				for (var i in song.files) {
					var li = $("<li id='file"+i+"'></li>");
					if (i == 0) {
						$('#fileDialog').attr('nwsaveas', song.songTitle + '.' + song.files[i].format);
						li.append($("<input hidefocus='true' type='radio' name='song' id='radio"+i+"' data-format='"+song.files[i].format+"' data-rate='"+song.files[i].rate+"' checked>"));
					} else {
						li.append($("<input hidefocus='true' type='radio' name='song' id='radio"+i+"' data-format='"+song.files[i].format+"' data-rate='"+song.files[i].rate+"'>"));
					}
					li.append($("<label for='radio"+i+"'><span class='name'>"+song.files[i].ratetitle+"品质</span><span class='value'><b>"+song.files[i].size+"</b>( <span class='rate'>"+song.files[i].rate+"kbps</span> / "+song.files[i].format+" )</span></label>"));
					dom.append(li);
				}
				$('#down').css('display', 'block');
				$('#downbg').css('display', 'block');
			} else {
				$('.footer').html("提示："+ data.msg);
			}
		});
	});

	$('input:radio[name="song"]').click(function(){
		$('#fileDialog').attr('nwsaveas', $('#down_name').html() + '.' + $(this).data('format'));
	});

	$('#download').click(function(){
		if (localStorage.path) {
			$('#fileDialog').attr('nwworkingdir', localStorage.path);
		}
		$('#fileDialog').change(function(){
			var file = this.files[0];
			localStorage.path = file.path;
			song.rate = $('input:radio[name="song"]:checked').data('rate');
			music.download(song, function(data){
				if (data.ret) {
					data = data.data;
					if (data.files[0].url && file.path) {
						loading++;
						$('.footer').html("提示："+loading+" 个任务下载中...");
						music.savefile(data.files[0].url, file.path, function(res){
							//download
							loading--;
							if (loading == 0) {
								$('.footer').html("下载已完成");
							} else {
								$('.footer').html("提示："+loading+" 个任务下载中...");
							}
						});
					} else {
						$('.footer').html("提示：源地址错误");
					}
				}
			});
			$('.close').click();
		});
	});

	/* close download*/
	$('.close').click(function(){
		$('#down').css('display', 'none');
		$('#downbg').css('display', 'none');
		$('.downSel li').remove();
	});

});