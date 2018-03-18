
//////////////// IMPORTS ///////////////////

const pmx = require('pmx'),
      initConfig = require('./initConfig'),
      getAppConfig = require('./getAppConfig'),
      startServer = require('./start'),
      stopServer = require('./stop');

///////////////// THE MODULE //////////////////

pmx.initModule(initConfig, function(err, config) {

  if (err) {
    console.log('Error running pm2-autohook:', err);
    return false;
  } else
    console.log('pm2-autohook is running.');

  //////////////////////// MAIN /////////////////////////

  let servers = {};

  pmx.action('start', (appName, reply) => {
    if (servers[appName]) {
      let error = `Webhook server already running for ${appName}.`;
      console.log(error);
      reply({ success: false, error});
    } else {
      getAppConfig(appName)
        .then(startServer)
        .then(data => {
          servers[appName] = data;
          reply({ success: true });
        })
        .catch(error => {
          reply({ success: false }, error);
        });
    }
  });

  pmx.action('stop', (appName, reply) => {
    if (!servers[appName]) {
      let error = `There is no webhook server running for ${appName}.`;
      console.log(error);
      reply({ success: false, error });
    } else {
      getAppConfig(appName)
        .then(config => {
          return stopServer(
            config,
            servers[appName].server,
            servers[appName].webhook
          );
        })
        .then(() => {
          delete servers[appName];
          reply({ success: true });
        })
        .catch(error => {
          reply({ success: false }, error);
        });
    }
  });

  pmx.action('list', reply => {
    reply({ servers: Object.keys(servers) });
  });

});


