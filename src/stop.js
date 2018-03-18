
const { exec } = require('child_process');

function deleteWebhook(config, webhook) {
  return new Promise((resolve, reject) => {
    let { gitUsername, gitPassword, repoOwner, repoName } = config;
    let { id } = webhook;
    let deleteUrl = `https://${gitUsername}:${gitPassword}@api.github.com` +
                    `/repos/${repoOwner}/${repoName}/hooks/${id}`;

    let curl = `curl -X DELETE ${deleteUrl}`;
    let proc = exec(curl, (err, stdout, stderr) => {
      if (err)
        reject(stderr);
      else
        resolve(stdout);
    });
  });
}

function stopServer(config, server, webhook) {
  return new Promise((resolve, reject) => {
    deleteWebhook(config, webhook)
      .then(out => {
        console.log('out:', out);
        server.close(() => {
          resolve();
        })
      })
      .catch(err => {
        console.log('err:', err);
        reject();
      });
  })
}

module.exports = stopServer;
