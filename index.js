
//////////////// IMPORTS ///////////////////

const pmx = require('pmx'),
      pm2 = require('pm2'),
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
    console.log("Error running module:", err);
    return false;
  } else
    console.log("Module running:", config.module_conf);

  pm2.connect(err => {
    pm2.list((err, list) => {

      // run through the list and get the autohook config for each unique app
      let ecoConfigs = [], appNames = [];
      list.forEach(proc => {
        if (proc.pm2_env.env.autohook &&
            appNames.indexOf(proc.name) === -1) {

          let ecoConfig = JSON.parse(proc.pm2_env.env.autohook);
          ecoConfig.appName = proc.name;

          ecoConfigs.push(ecoConfig);
          appNames.push(proc.name);
        }
      });
     
      console.log("Starting servers for these configs:\n", ecoConfigs);
      ecoConfigs.forEach(startWebhookServer);

      pm2.disconnect();
    });
  });
});


