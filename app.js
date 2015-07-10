
/*
 * youtube video proxy - vpx - alpha 2
 * © 2014 / 2015 noferi mickaël -- r043v / dph
 * 
 */

var	http	= require('http'),
	util	= require('util'),
	spawn	= require('child_process').spawn,
	express	= require('express'),
	tss	= require('tss').tss,
	cachr	= require('./js/cachr.js');

var	app	= express(),
	server = app.listen(3333),
	io = require('socket.io').listen(server),
	files	= cachr(),
	exec	= function(cmd,args,callback){
		if(callback === undefined) callback = {};
		var call = spawn(cmd,args);
		call.stdout.on('data',callback.out===undefined?console.log:callback.out);
		call.stderr.on('data',callback.err===undefined?console.log:callback.err);
		call.on('exit',callback.end===undefined?console.log:callback.end);
	};

app.use(express.static(__dirname + '/public'));

var tmpl = {
	fill:function(content,js){ return tss( files.get('tmpl.tss'), { content:content,js:js } ); }
};

app.get('/:youtube',function(req,res){
	res.send( tmpl.fill( "downloading "+req.params.youtube,'socket.emit("youtube","'+req.params.youtube+'"); ' ) );
});

var pregex = /\s([\d\.]+)%\sof\s+([\d\.]+\w+)\sat\s+([\d\.]+\w+)\/s\s+ETA\s+([\d:]+)$/;
var fregex = /.+ination:\s(.+)/;
var tregex = /.+thumbnail\sto:\s(.+)/;
var jregex = /.+JSON\sto:\s(.+)/;
var alreadydlregex = /\[download\]\s(.+)\shas\salready\sbeen\sdownloaded/;
var mergeregex = /\[ffmpeg\]\sMerging\sformats\sinto\s\"(.+)\"/;

io.on('connection',function (socket){
  //console.log("io connected!");
  socket.on('youtube',function(id){
	//console.log("downloading youtube : "+id);
	var out = '', err = '';
	
	var filename=null, thumbnail=null, metadata=null;
	
	exec('youtube-dl',
	[	'http://www.youtube.com/watch?v='+id,
		'-o','public/v/%(title)s-%(id)s.%(ext)s',
		'--restrict-filenames','--write-thumbnail','--write-info-json',
		'-f','bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4'
	],{
		out:function(data){
			var txt = data.toString('utf8');
			
			nfo = fregex.exec(txt);
			if(nfo === null){
				nfo = alreadydlregex.exec(txt);
				if(nfo !== null)
					socket.emit("log", txt );
			}
			
			if(nfo !== null){
				filename = nfo[1].replace("public","");
				socket.emit('filename',filename);
				return;
			}
			
			nfo = tregex.exec(txt);
			if(nfo !== null){
				thumbnail = nfo[1].replace("public","");
				socket.emit('thumbnail',thumbnail);
				return;
			}
			
			nfo = jregex.exec(txt);
			if(nfo !== null){
				metadata = nfo[1].replace("public","");
				socket.emit('metadata',metadata);
				return;
			}
			
			nfo = pregex.exec(txt);
			if(nfo !== null){
				var o = {
					percent:nfo[1],
					size:nfo[2],
					speed:nfo[3],
					time:nfo[4]
				};
				
				socket.emit('update',o);
				return;
			}
			
			nfo = mergeregex.exec(txt);
			if(nfo !== null){
				filename = nfo[1].replace("public","");
				socket.emit('filename',filename);
				return;
			}
			
			socket.emit("log", txt );
		},
		err:function(data){ socket.emit("log","err "+data); },
		end:function(code){
			var html = tss(
				files.get('yt.tss'),
				{ out:out,err:err,code:code,yt:id }
			);	socket.emit("done",html);
		}
	});
  });
});
