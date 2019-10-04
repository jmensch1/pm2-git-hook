
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

        if (!proc.pm2_env.env.githook) {
          reject(`There is no pm2-git-hook configuration for ${appName}.`);
          return;
        }
        let config
        if (typeof proc.pm2_env.env.githook === 'string') {
          try {
            config = JSON.parse(proc.pm2_env.env.githook);
          }
          catch (error) {
            if (error instanceof SyntaxError) {
              // bad json
            }
            else {
              reject(error.message);
              return;
            }
          }
        }
        if (typeof config === 'undefined') {
          config = proc.pm2_env.env.githook;
        }
        config.appName = appName;
        config.pmCwd = proc.pm2_env.pm_cwd;

        resolve(config);
      });
    });
  });
};
