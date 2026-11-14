const { app } = require('electron');

function registerSecurity() {
  app.on('web-contents-created', (_event, contents) => {
    contents.setWindowOpenHandler(() => ({ action: 'deny' }));
  });
}

module.exports = { registerSecurity };
