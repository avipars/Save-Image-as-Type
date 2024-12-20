
function getSuggestedFilename(src, type) {
	//special for chrome web store apps
	if (src.match(/googleusercontent\.com\/[0-9a-zA-Z]{30,}/)) {
		return 'screenshot.' + type;
	}
	var filename = src.replace(/[?#].*/, '').replace(/.*[\/]/, '').replace(/\+/g, ' ');
	filename = decodeURIComponent(filename);
	filename = filename.replace(/[\x00-\x7f]+/g, function (s) {
		return s.replace(/[^\w\-\.\,@ ]+/g, '');
	});
	while (filename.match(/\.[^0-9a-z]*\./)) {
		filename = filename.replace(/\.[^0-9a-z]*\./g, '.');
	}
	filename = filename.replace(/\s\s+/g, ' ').trim();
	filename = filename.replace(/\.(jpe?g|png|gif|webp|svg)$/gi, '').trim();
	if (filename.length > 32) {
		filename = filename.substr(0, 32);
	}
	filename = filename.replace(/[^0-9a-z]+$/i, '').trim(); //去除末尾的非词符号
	if (!filename) {
		filename = 'image';
	}
	return filename + '.' + type;
}

var lastFolderChoice = localStorage.getItem("lastFolderChoice");

function download(url, filename, tabId) {
	if (lastFolderChoice == null) { //no entry 
		chrome.fileSystem.chooseEntry({ type: 'openDirectory' }, function (folder) {
			if (!folder) {
				console.log('No folder selected.');
				return;
			}
			// Get the folder's path and store it in lastFolderChoice
			folder.getDisplayPath(function (path) {
				lastFolderChoice = path;
				chrome.downloads.download({
					url: url,
					filename: filename,
					saveAs: true,
					directory: lastFolderChoice
				}, function () {
					if (chrome.runtime.lastError) {
						alert(chrome.i18n.getMessage("errorOnSaving") + ": \n" + chrome.runtime.lastError.message);
					} else {
						// Update the last folder choice in local storage
						localStorage.setItem("lastFolderChoice", lastFolderChoice);
					}
				});
			});
		});
	}
	else {
		chrome.downloads.download({
			url: url,
			filename: filename,
			directory: lastFolderChoice
		}, function () {
			if (chrome.runtime.lastError) {
				alert(chrome.i18n.getMessage("errorOnSaving") + ": \n" + chrome.runtime.lastError.message);
			} else {
				// Update the last folder choice in local storage
				localStorage.setItem("lastFolderChoice", lastFolderChoice);
			}
		});
	}
}



function download(url, filename, tabId) {
	chrome.downloads.download(
		{
			url: url,
			filename: filename,
			saveAs: true
		},
		function () {
			if (chrome.runtime.lastError) {
				alert(chrome.i18n.getMessage("errorOnSaving") + ': \n' + chrome.runtime.lastError.message);
			}
		}
	);
}

function saveAsType(img, type, tabId) {
	if (!canvas) {
		canvas = document.createElement('canvas');
	}
	canvas.width = img.width;
	canvas.height = img.height;
	var context = canvas.getContext('2d');
	var mimeType = 'image/' + (type == 'jpg' ? 'jpeg' : type);
	context.drawImage(img, 0, 0);

	if (type === 'gif') {
		var data = canvas.toDataURL('image/gif');
		var gif = new GIF({
			workers: 2,
			quality: 10
		});
		gif.addFrame(data, {
			delay: 200
		});
		gif.on('finished', function (blob) {
			var filename = getSuggestedFilename(img.src, type);
			download(URL.createObjectURL(blob), filename, tabId);
		});
		gif.render();
	}
	else {
		var dataurl = canvas.toDataURL(mimeType, 0.98);
		var filename = getSuggestedFilename(img.src, type);
		download(dataurl, filename, tabId);
	}
}

// Use the saved last folder choice as the default directory
function imageLoadCallback(info, type, tabId) {
	var img = new Image();
	img.onload = function () {
		saveAsType(this, type, tabId);
	};
	img.onerror = function () {
		alert(chrome.i18n.getMessage("errorOnLoading") + ": \n" + this.src);
	};
	img.src = info.srcUrl;
}

var canvas;

//chrome.contextMenus.onClicked.addListener(function callback(info, tab){
//	console.log(info);
//});

["GIF", 'JPG', 'PNG', 'WebP'].forEach(function (type) {
	chrome.contextMenus.create({
		"title": chrome.i18n.getMessage("Save_as") + ' ' + type + "...",
		"type": "normal",
		"contexts": ["image"],
		"onclick": function (info, tab) {
			if (info.mediaType == 'image' && info.srcUrl) {
				imageLoadCallback(info, type.toLowerCase(), tab.id);
			} else {
				alert(chrome.i18n.getMessage("errorIsNotImage"));
			}
		}
	});
});

chrome.contextMenus.create({
	"type": "separator",
	"contexts": ["image"]
});
// chrome.contextMenus.create({
// 	"title": chrome.i18n.getMessage("View_in_store") + "...",
// 	"type": "normal",
// 	"contexts": ["image"],
// 	"onclick": function (info, tab) {
// 		var url = "https://chrome.google.com/webstore/detail/" + chrome.i18n.getMessage("@@extension_id");
// 		window.open(url, '_blank');
// 	}
// });

// https://developer.chrome.com/extensions/i18n