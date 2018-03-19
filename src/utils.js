
const { exec } = require('child_process');

function getReqBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', data => body += data);
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}

function execCmd(cmd, opts={}) {
  return new Promise((resolve, reject) => {
    exec(cmd, opts, (err, stdout, stderr) => {
      if (err)
        reject(stderr);
      else
        resolve(stdout);
    });
  });
}

module.exports = {
  getReqBody,
  execCmd
};