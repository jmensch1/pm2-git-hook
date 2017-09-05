
//////////////// IMPORTS ///////////////////

const Promise = require('bluebird'),
      crypto = require('crypto'),
      fs = require('fs'),
      https = require('https'),
      { exec } = require('child_process'),
      url = require('url'),
      httpHelpers = require('./httpHelpers');

//////////////// PRIVATE ///////////////////

function startWebhookServer(config) {

  /////////////////// CONFIG ////////////////////

  console.log(`---------------${config.appName}----------------`);

  // make sure all required fields are present
  const requiredFields = [
    'repoOwner',
    'repoName',
    'repoBranch',
    'port',
    'sslKeyPath',
    'sslCertPath',
    'gitUsername',
    'gitPassword',
    'hookCommand',
    'hookSecret'
  ];

  let missingFields = requiredFields.filter(rF => !config[rF]);
  if (missingFields.length) {
    console.log(`The configuration for ${config.appName} is missing these required fields: ${missingFields}.`);
    return Promise.resolve();
  } else
    console.log(config);

  // if they are, assign to constants
  const REPO_OWNER    = config.repoOwner,
        REPO_NAME     = config.repoName,
        REPO_BRANCH   = config.repoBranch,
        HOSTNAME      = config.hostName,
        PORT          = config.port,
        SSL_KEY_PATH  = config.sslKeyPath,
        SSL_CERT_PATH = config.sslCertPath,
        GIT_USERNAME  = config.gitUsername,
        GIT_PASSWORD  = config.gitPassword,
        HOOK_COMMAND  = config.hookCommand,
        HOOK_SECRET   = config.hookSecret,
        APP_NAME      = config.appName,
        PM_CWD        = config.pmCwd;

  ////////////////// FUNCTIONS //////////////////// 

  function getExternalIP() {
    return httpHelpers.get('http://ipinfo.io/ip')
      .then(ip => Promise.resolve(ip.replace('\n', '')));
  }

  function hooksUrl() {
    return `https://${GIT_USERNAME}:${GIT_PASSWORD}` + 
           `@api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/hooks`;
  }

  function getWebhookData() {
    return new Promise((resolve, reject) => {
      let curl = `curl ${hooksUrl()}`;
      let proc = exec(curl, (err, stdout, stderr) => {
        stdout = JSON.parse(stdout);
        if (err)
          reject(stderr);
        else if (stdout && stdout.message)
          reject(stdout.message);
        else
          resolve(stdout);
      });
    });
  }

  function webhookExists(externalIP, webhookData) {
    let thisHost = externalIP + `:${PORT}`;
    let existingHosts = webhookData.map(wh => wh.config.url.match(/:\/\/(.*?)\//)[1]);

    console.log(`${APP_NAME} host:`, thisHost);
    console.log('Existing webhook hosts:', existingHosts);

    return existingHosts.indexOf(thisHost) !== -1;
  }

  function createWebhook(externalIP) {
    return new Promise((resolve, reject) => {
      let payload = JSON.stringify({
        name:   'web',
        active: true,
        config: {
          url:          `https://${externalIP}:${PORT}/webhook`,
          content_type: 'json',
          insecure_ssl: '1',
          secret:       HOOK_SECRET
        }
      });
      let curl = `curl -H "Content-Type: application/json" -X POST -d '${payload}' ${hooksUrl()}`;
      let proc = exec(curl, (err, stdout, stderr) => {
        if (err)
          reject(stderr);
        else
          resolve(stdout);
      });
    }); 
  }

  function validSignature(xHubSig, body) {
    let hmac = crypto.createHmac('sha1', HOOK_SECRET);
    hmac.update(body);
    return xHubSig === 'sha1=' + hmac.digest('hex');
  }

  function webhookServer(request, response) {
    let urlInfo = url.parse(request.url, true);  
    switch(urlInfo.pathname) {
      case '/webhook':
        httpHelpers.getReqBody(request)
          .then(body => {
            let xHubSig = request.headers['x-hub-signature'],
                valid = validSignature(xHubSig, body),
                event = request.headers['x-github-event'];

            if (valid)
              switch(event) {
                case 'ping':
                  console.log(`${APP_NAME}: Webhook successfully created.`);
                  break;
                case 'push':
                  body = JSON.parse(body);
                  let branch = body.ref.replace('refs/heads/', '');

                  console.log(`${APP_NAME}: push to branch ${branch}.`);
                  console.log(`commit message: ${body.head_commit.message}.`);

                  if (branch === REPO_BRANCH) {
                    console.log(`running command: ${HOOK_COMMAND}`);
                    exec(HOOK_COMMAND, { cwd: PM_CWD }, (err, stdout, stderr) => {
                      console.log('ERROR:',  err);
                      console.log('STDOUT:', stdout);
                      console.log('STDERR:', stderr);
                    });
                  }
                  
                  break;
              }

            response.writeHead(valid ? 200 : 403);
            response.end();
          });
        break;

      case '/ping':
        response.writeHead(404);
        response.end('server is listening');
        break;

      default:
        response.writeHead(404);
        response.end();
        break;
    }
  }

  ///////////////////// MAIN ///////////////////////

  // start the webhook server, then check to see if a
  // webhook already exists on github. If not, create one.
  return new Promise((resolve, reject) => {
    https
      .createServer({
        key:  fs.readFileSync(SSL_KEY_PATH,  'utf8'),
        cert: fs.readFileSync(SSL_CERT_PATH, 'utf8')
      }, webhookServer)
      .listen(PORT, () => {

        console.log(`Webhook server for ${APP_NAME} running on port ${PORT}.`);
        console.log('Checking whether webhook is active.');

        Promise.all([
          getExternalIP(),
          getWebhookData()
        ])
        .spread((externalIP, webhookData) => {
          if (webhookExists(externalIP, webhookData)) {
            console.log('Webhook is active.');
            return Promise.resolve();
          } else {
            console.log('Creating webhook...');
            return createWebhook(externalIP);
          }
        })
        .catch(err => console.log("ERROR:", err))
        .then(resolve);

      });
  });

}

//////////////// EXPORTS ///////////////////

module.exports = startWebhookServer;

