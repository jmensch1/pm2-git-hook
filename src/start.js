
//////////////// IMPORTS ///////////////////

const crypto = require('crypto'),
      fs = require('fs'),
      http = require('http'),
      https = require('https'),
      { exec } = require('child_process'),
      url = require('url'),
      httpHelpers = require('./httpHelpers');

//////////////// PRIVATE ///////////////////

function startServer(config) {

  /////////////////// CONFIG ////////////////////

  config = {
    hookCommand:  config.hookCommand,
    branch:       config.branch || 'master',
    port:         config.port || 9000,
    protocol:     config.protocol || 'http',
    sslKeyPath:   config.sslKeyPath,
    sslCertPath:  config.sslCertPath,
    hookSecret:   config.hookSecret,
    appName:      config.appName,
    pmCwd:        config.pmCwd
  };

  /////////////////// GLOBALS /////////////////////

  let lastHook = null;

  ////////////////// FUNCTIONS ////////////////////

  function validSignature(xHubSig, body) {
    let hmac = crypto.createHmac('sha1', config.hookSecret);
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
                  console.log(`${config.appName}: received ping from github.`);
                  break;
                case 'push':
                  body = JSON.parse(body);
                  let branch = body.ref.replace('refs/heads/', '');

                  if (branch === config.branch) {
                    console.log(`${config.appName}: push to branch ${branch}.`);
                    console.log(`commit message: ${body.head_commit.message}.`);
                    console.log(`running hook command: "${config.hookCommand}"`);

                    exec(config.hookCommand, { cwd: config.pmCwd }, (err, stdout, stderr) => {
                      console.log('STDOUT:', stdout);
                      console.log('STDERR:', stderr);

                      lastHook = {
                        dateTime: new Date(),
                        commitMessage: body.head_commit.message,
                        stdout,
                        stderr
                      };
                    });
                  }

                  break;
              }

            response.writeHead(valid ? 200 : 403);
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
      resolve(server);
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

