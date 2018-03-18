
const pm2 = require('pm2');

module.exports = (appName) => {
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
};