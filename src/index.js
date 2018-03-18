
/////////////////// IMPORTS ///////////////////

const pmx = require('pmx'),
      initConfig = require('./initConfig'),
      getAppConfig = require('./getAppConfig'),
      validateConfig = require('./validateConfig'),
      startServer = require('./start');

///////////////// THE MODULE //////////////////

pmx.initModule(initConfig, function(err, config) {

  if (err) {
    console.log('Error running pm2-autohook:', err);
    return false;
  } else
    console.log('pm2-autohook is running.');

  ////////////// ACTIONS /////////////

  let servers = {};

  pmx.action('start', (appName, reply) => {
    if (servers[appName])
      reply({ error: `Webhook server already running for ${appName}.` });
    else
      getAppConfig(appName)
        .then(validateConfig)
        .then(startServer)
        .then(server => {
          servers[appName] = server;
          reply({ success: true });
        })
        .catch(error => {
          reply({ error });
        });
  });

  pmx.action('stop', (appName, reply) => {
    if (!servers[appName])
      reply({ error: `There is no webhook server running for ${appName}.` });
    else
      servers[appName].close(() =>{
        delete servers[appName];
        reply({ success: true });
      });
  });

  pmx.action('list', reply => {
    reply({ servers: Object.keys(servers) });
  });

});


