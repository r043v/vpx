/* * * 
 * * cach'r
  *   alpha one
 *   (c) 2k14 noferi mickaël ; r043v/dph
 * *
 * * * */

var	_	= require("lodash"),
	watch	= require("watch"),
	fs	= require('fs');

var jsregex = /.\.js$/;

function srequire(f){
	this.log("require",f,"js ?",jsregex.exec(f) !== null ? "js" : "text");
	try {
		if( jsregex.exec(f) !== null ){
		  //console.log(f, require(f) );
		  return require('../'+f);
		}
		return fs.readFileSync('./'+f,{ encoding:'utf8' });
	}
	catch(e){
		console.log("error in",__dirname,process.cwd(),f,e);
		if(e.code === 'MODULE_NOT_FOUND' || e.code === 'ENOENT') return false;
		return {error:e};
	}
}

var commons = {
	options : {
		folder:"cachr",
		debug:false,
		require:srequire,
		search:function(env,f){
			var e = {
				site : env.site === undefined ? 'default' : env.site,
				page : env.page === undefined ? 'default' : env.page
			};
			return [
				
			];
		}
	}
};

function getFirst(f){
	var a = _.isArray(f) ? f : arguments, t = this;
	_.each(a,function(f){
		var d = t.get(f);
		if(d !== undefined && d !== false) return d;
	});	return false;
}

function get(f){
	var t = this;
	
	if( _.isArray(f) ){
		t.log("multiple cache get",f);
		var out = [];
		_.each(f,function(file){
			var d = t.get(file);
			if(d !== undefined && d !== false) out.push(d);
		});	return out;
	}
	  
	f = t.folder+"/"+f;
	  
	if( t.cache[f] !== undefined ){
		var c = t.cache[f];
		t.log( "take",f,"from cache,",typeof(c));
		if( c !== true && c !== false ) return t.cache[f];
	}
	
	t.cache[f] = t.require(f);
	
	t.log( "put",f,"in cache",typeof(t.cache[f]));//,t.cache[f]);
	//t.log( t.cache[f] );
	return t.cache[f];
}

var cache = function(options){
	var opts = _.extend( commons.options, _.isObject(options) ? options : {});
	var t = {
		folder : opts.folder,
		cache : {},
		log : opts.debug ? console.log : function(){},
		require:opts.require,
		get : get,
		getFirst : getFirst,
		opts:opts
	};
	
	t.log("cach'r started, watching '"+t.folder+"'");
	
	watch.createMonitor("./"+t.folder,function(monitor){
		monitor.files[t.folder+'/.stat'] // Stat object for my zshrc.
		
		monitor.on("created", function(f, stat){
			t.log("* create",f); var c = t.cache[f];
			if( c === false || c === undefined ) t.cache[f] = true; // true, exist
			if( _.isFunction(opts.created) ) opts.create.call(t,f);
		});
		
		monitor.on("changed", function(f, curr, prev){
			var c = t.cache[f];
			t.log("* file",f,"change, in cache ?",c===undefined?"no":"yes, "+typeof(c));
			
			if( c !== undefined && c !== true && c !== false ){
				t.log("* reload",f);
				
				if( jsregex.exec(f) !== null ){
					t.log("reload js, delete require cache ..");
					var i = require.resolve('../'+f);
					delete require.cache[i];
				}
				
				t.cache[f] = t.require(f);
				if( _.isFunction(opts.reloaded) ) opts.reloaded.call(t,f,t.cache[f]);
			} else t.cache[f] = true; // true, file exist
				
			if( _.isFunction(opts.changed) )
				opts.changed.call(t,f,t.cache[f]);
		});
		
		monitor.on("removed", function (f, stat) {
			var c = t.cache[f];
			
			if( c !== undefined && c !== true && c !== false )
				t.cache[f] = false; // false, file not exist
			
			//t.log("* delete",f);
		
			if( _.isFunction(opts.removed) )
				opts.removed.call(t,f);
		});
	});

	return t;
};

module.exports = cache;
