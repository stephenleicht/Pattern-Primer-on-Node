/*jslint nomen: true */
'use strict';

var util = require('util'),
    settings = require('./pp-settings.json'),
	connect = require('connect'),
	primer = function (serverResponse, tofile, tofileCallback) {
		tofile = tofile || false;

		var fs = require('fs'),
			patternFolder = './' + settings.pattern_path,
			simpleEscaper = function (text) {
				return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
			},
			outputPatterns = function (patterns) {
				fs.readFile(settings.source_html_file, 'utf-8', function (err, content) {
                    if (err !== null) {
                        util.puts('There was an error when trying to read file:', 'output.html');
                        return;
                    }

                    content += generatePatterns(patterns);

                    content += '</body></html>';

					if (tofile) {
						tofileCallback(content);
					} else {
						serverResponse.end(content);
					}
				});
			},
            generatePatterns = function(patterns)
            {
                var content = "";
                var i,
                    l,
                    file;

                for (i = 0, l = patterns.length; i < l; i += 1)
                {
                    file = patterns[i];

                    if(!file.isFile)
                    {
                        content += '<h2>' + file.filename + '</h2>';
                        content += generatePatterns(file.subFiles);
                    }
                    else
                    {
                        var fileNameNoExt = file.filename.replace('.html', '');

                        content += '<h3>' + fileNameNoExt +'</h3>';
                        content += '<div class="pattern"><div class="display">';
                        content += file.content;
                        content += '</div><div class="source"><textarea rows="6" cols="30">';
                        content += simpleEscaper(file.content);
                        content += '</textarea>';

                        content += '</div></div>';
                    }
                }

                return content;

            },
			handleFiles = function (items, pathPrefix) {
                var file,
                    patterns = [];

                // This was asyncronous, but we need the file names, which we can't get from the callback of 'readFile'
                for (var i = 0, len = items.length; i < len; i += 1)
                {
                    var item = items[i];
                    var path = pathPrefix == "" ? item : pathPrefix + "/" + item;
                    var stat = fs.statSync(patternFolder + "/" + path);

                    if(stat.isDirectory())
                    {
                        var subFiles = fs.readdirSync(patternFolder + "/" + path);

                        file =
                        {
                            isFile: false,
                            filename: item
                        };

                        file.subFiles = handleFiles(subFiles, path);

                        if(file.subFiles.length != 0)
                            patterns.push(file);
                    }
                    else if(stat.isFile() && item.substr(-5) === '.html')
                    {
                        file = {
                            isFile: true,
                            filename: item
                        };

                        file.content = fs.readFileSync(patternFolder + '/' + path, 'utf-8');
                        patterns.push(file);
                    }
                }

                return patterns;
			},
			beginProcess = function () {
				fs.readdir(patternFolder, function (err, contents) {
                    if (err !== null && err.code === 'ENOENT') {
                        util.puts('Cannot find patterns folder:', patternFolder);
                        return;
                    }

                    var patterns = handleFiles(contents, "");

                    outputPatterns(patterns);
				});
			};

		beginProcess();
	},
	server = connect.createServer(
		connect.static(__dirname + '/' + settings.wwwroot),
		function (req, resp) {
			if (req.url !== '/') {
				resp.writeHead(404, {
					'Content-Length': 0,
					'Content-Type': 'text/plain'
				});
				resp.end();
				return;
			}

			primer(resp);
		}
	);

if (process.argv[2] === '--tofile') {

	primer(null, true, function (content) {
		var fs = require('fs');
		fs.writeFile('./' + settings.tofile_outputpath + '/index.html', content, 'utf-8', function () {
			fs.createReadStream('./' + settings.wwwroot + '/global.css').pipe(fs.createWriteStream('./' + settings.tofile_outputpath + '/global.css'));
			util.puts('Stand-alone output can now be found in "' + settings.tofile_outputpath + '/"');
		});
	});

} else {

	server.listen(settings.webserverport);
	util.puts('You can now visit http://localhost:' + settings.webserverport + '/ to see your patterns.');
	util.puts('To kill this server, just press Ctrl + C');

}