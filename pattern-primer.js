var util = require('util'),
	connect = require('connect'),
	server = connect.createServer(
		connect.static(__dirname + '/public'),
		function (req, resp) {
			if (req.url !== '/') {
				resp.writeHead(404, {
				  'Content-Length': 0,
				  'Content-Type': 'text/plain'
				});
				resp.end();
				return;
			}
			
			var fs = require('fs'),
				patternFolder = 'public/patterns',
				simpleEscaper = function (text) {
				   return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
				},
				beginProcess = function() {
					fs.readdir(patternFolder, function (err, contents) {
						if (err !== null && err.code === 'ENOENT') {
							util.puts('Cannot find patterns folder:', patternFolder);
							return;
						}
		
						var files = [],
							i,
							l;
		
						for (i = 0, l = contents.length; i < l; i += 1) {
							if (contents[i].substr(-5) === '.html') {
								files.push(contents[i]);
							}
						}
			
						handleFiles(files);
					});
				},
				handleFiles = function (files) {
					var i,
						l,
						file,
						patterns = [];
			
					// This was asyncronous, but we need the file names, which we can't get from the callback of 'readFile'
					for (i = 0, l = files.length; i < l; i += 1) {
						file = {
							filename : files[i]
						};
						
						file.content = fs.readFileSync(patternFolder + '/' + file.filename, 'utf-8');
						patterns.push(file);
					}
					
					outputPatterns(patterns);
				},
				outputPatterns = function (patterns) {
					fs.readFile('output.html', 'utf-8', function(err, content) {
						if (err !== null) {
							util.puts('There was an error when trying to read file:', 'output.html');
							return;
						}
			
						var i,
							l,
							file;
			
						for (i = 0, l = patterns.length; i < l; i += 1) {
							file = patterns[i];
							content += '<div class="pattern"><div class="display">';
							content += file.content;
						    content += '</div><div class="source"><textarea rows="6" cols="30">';
						    content += simpleEscaper(file.content);
						    content += '</textarea><p><a href="patterns/' + file.filename + '">' + file.filename + '</a></p></div></div>';
						}
			
						content +='</body></html>';
			
						resp.end(content);
					});
				};
			
			beginProcess();
		}
	).listen(8080);

util.puts('You can now visit http://localhost:8080/ to see your patterns.');
