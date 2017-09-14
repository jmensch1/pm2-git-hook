
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

  // extract the config params from all the ecosystem configs
  // that have an env.autohook property
  function getEcoConfigs(cb) {
    pm2.connect(err => {
      pm2.list((err, list) => {

        // the array to be returned
        let ecoConfigs = [];

        // run through the list and get the config for each unique app name
        let appNames = [];
        list.forEach(proc => {
          if (proc.pm2_env.env.autohook &&
              appNames.indexOf(proc.name) === -1) {

            let ecoConfig = JSON.parse(proc.pm2_env.env.autohook);
            ecoConfig.appName = proc.name;
            ecoConfig.pmCwd = proc.pm2_env.pm_cwd;

            ecoConfigs.push(ecoConfig);
            appNames.push(proc.name);
          }
        });
       
        pm2.disconnect();
        cb(ecoConfigs);
      });
    });
  }

  //////////////////////// MAIN /////////////////////////

  pmx.action('start', reply => {
    getEcoConfigs(configs => {
      console.log('Apps that configure an autohook:', configs.map(c => c.appName));

      // serially start webhook servers for each config 
      Promise
        .mapSeries(configs, startWebhookServer)
        .then(() => {
          console.log('Done starting webhook server(s).');
          reply({ success: true });
        });
    });
  });

});


