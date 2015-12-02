var app = require('app');  // Module to control application life.
var fs = require('fs');
var ipc = require('ipc');
var log = require(__dirname + '/node_modules/cw-log/lib/log.js').logger(3);
var BrowserWindow = require('browser-window');  // Module to create native browser window.

// Report crashes to our server.
// require('crash-reporter').start();

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is GCed.
var mainWindow = null;
ipc.on('asynchronous-message', function(event, filepath) {
  // log.debug(filepath);  
	fs.readFile(filepath, 'utf8', function(err, text) {
			//	log.debug('text file:')
			// log.debug(text);
   	  event.sender.send('asynchronous-reply', text);
	});
});


// Quit when all windows are closed.
app.on('window-all-closed', function() {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform != 'darwin') {
    app.quit();
  }
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', function() {
		// Create the browser window.
		mainWindow = new BrowserWindow({width: 800, height: 600});
		
		// mainWindow.loadUrl('file://' + __dirname + '/index.html');
		mainWindow.loadUrl('file://' + __dirname + '/index.html');
		
		// Open the devtools.
		// mainWindow.openDevTools();
		
		// Emitted when the window is closed.
		mainWindow.on('closed', function() {
				// Dereference the window object, usually you would store windows
				// in an array if your app supports multi windows, this is the time
				// when you should delete the corresponding element.
				mainWindow = null;
		});
});