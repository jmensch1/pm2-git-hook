
//////////////// IMPORTS ///////////////////

const crypto = require('crypto'),
      fs = require('fs'),
      http = require('http'),
      https = require('https'),
      { exec } = require('child_process'),
      url = require('url'),
      { execCmd, getReqBody } = require('./utils');

//////////////// PRIVATE ///////////////////

function startServer(config) {

  /////////////////// CONFIG ////////////////////

  config = {
    command:      config.command,
    branch:       config.branch || 'master',
    port:         config.port || 9000,
    protocol:     config.protocol || 'http',
    sslKeyPath:   config.sslKeyPath,
    sslCertPath:  config.sslCertPath,
    secret:       config.secret,
    pmCwd:        config.pmCwd,
    appName:      config.appName
  };

  /////////////////// GLOBALS /////////////////////

  let lastHook = null;

  ////////////////// FUNCTIONS ////////////////////

  function validSignature(xHubSig, body) {
    let hmac = crypto.createHmac('sha1', config.secret || '');
    hmac.update(body);
    return xHubSig === 'sha1=' + hmac.digest('hex');
  }

  function webhookServer(request, response) {
    let urlInfo = url.parse(request.url, true);

    switch(urlInfo.pathname) {

      case '/':
        getReqBody(request)
          .then(body => {
            let xHubSig = request.headers['x-hub-signature'],
                valid = !xHubSig || validSignature(xHubSig, body),
                event = request.headers['x-github-event'];

            if (!valid) {
              response.writeHead(403);
              response.end('Wrong secret.');
              return;
            }

            switch(event) {
              case 'ping':
                console.log(`${config.appName}: received ping from github.`);
                break;

              case 'push':
                body = JSON.parse(body);
                let branch = body.ref.replace('refs/heads/', '');

                if (branch === config.branch) {
                  console.log(`------- ${config.appName} --------`)
                  console.log(`push to branch: ${branch}.`);
                  console.log(`commit message: ${body.head_commit.message}.`);
                  console.log(`running command: ${config.command}`);
                  console.log(`in directory: ${config.pmCwd}`);

                  lastHook = {
                    dateTime: new Date(),
                    commitMessage: body.head_commit.message
                  };

                  execCmd(config.command, { cwd: config.pmCwd })
                    .then(stdout => {
                      console.log('Hook command succeeded.');
                      console.log(stdout);
                      lastHook.success = true;
                    })
                    .catch(stderr => {
                      console.log('Hook command failed.');
                      console.log(stderr);
                      lastHook.success = false;
                      lastHook.error = stderr;
                    });
                }
                break;
            }

            response.writeHead(200);
            response.end();
          });
        break;

      case '/status':
        response.writeHead(200);
        response.end(JSON.stringify({
          status:   'OK',
          protocol: config.protocol,
          port:     config.port,
          branch:   config.branch,
          lastHook
        }));
        break;

      default:
        response.writeHead(404);
        response.end();
        break;
    }
  }

  function createServer(webhookServer) {
    if (config.protocol === 'https')
      return https.createServer({
        key:  fs.readFileSync(config.sslKeyPath,  'utf8'),
        cert: fs.readFileSync(config.sslCertPath, 'utf8')
      }, webhookServer);
    else
      return http.createServer(webhookServer);
  }

  ///////////////////// MAIN ///////////////////////

  return new Promise((resolve, reject) => {

    let server;
    try {
      server = createServer(webhookServer);
    } catch(error) {
      reject(error);
      return;
    }

    server.listen(config.port, () => {
      console.log(`${config.appName}: webhook server running on port ${config.port}.`);
      resolve({
        close: server.close.bind(server),
        statusUrl: `${config.protocol}://localhost:${config.port}/status`
      });
    });

    server.on('error', error => {
      console.log(`${config.appName}: error starting webhook server.`);
      console.log(error);
      reject(error);
    });
  });
}

//////////////// EXPORTS ///////////////////

module.exports = startServer;
