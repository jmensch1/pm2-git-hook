
//////////////// IMPORTS ///////////////////

const pmx = require('pmx'),
      pm2 = require('pm2'),
      Promise = require('bluebird'),
      startWebhookServer = require('./webhook');

///////////////// THE MODULE //////////////////

pmx.initModule({

  // Options related to the display style on Keymetrics
  widget : {

    // Logo displayed
    logo: 'https://app.keymetrics.io/img/logo/keymetrics-300.png',

    // Module colors
    // 0 = main element
    // 1 = secondary
    // 2 = main border
    // 3 = secondary border
    theme: ['#141A1F', '#222222', '#3ff', '#3ff'],

    // Section to show / hide
    el: {
      probes  : false,
      actions : false
    },

    // Main block to show / hide
    block : {
      actions: true,
      issues:  false,
      meta:    true,

      // Custom metrics to put in BIG
      main_probes : []
    }
  }

}, function(err, config) {

  if (err) {
    console.log('Error running pm2-autohook:', err);
    return false;
  } else
    console.log('pm2-autohook is running.');

  ////////////////////// FUNCTIONS //////////////////////

  function getConfig(appName) {
    return new Promise((resolve, reject) => {
      pm2.connect(err => {
        pm2.list((err, list) => {

          let proc = (() => {
            for (let i = 0; i < list.length; i++)
              if (list[i].name === appName)
                return list[i];
            return null;
          })();

          if (!proc) {
            reject(`There is no running process with the name: ${appName}.`);
            return;
          }

          if (!proc.pm2_env.env.autohook) {
            reject(`There is no pm2-autohook configuration for ${appName}.`);
            return;
          }

          let config = JSON.parse(proc.pm2_env.env.autohook);
          config.appName = appName;
          config.pmCwd = proc.pm2_env.pm_cwd;

          resolve(config);
        });
      });
    });
  }

  //////////////////////// MAIN /////////////////////////

  pmx.action('start', (appName, reply) => {
    getConfig(appName)
      .then(config => {
        console.log('config:', config);
        reply({ success: true });
      })
      .catch(err => {
        console.log('error starting pm2-autohook:', err);
        reply({ success: false, error: err });
      });
  });
});


