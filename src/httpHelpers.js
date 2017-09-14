
////////////////////// IMPORTS //////////////////////////

const http = require('http'),
      https = require('https'),
      Promise = require('bluebird');

///////////////////// FUNCTIONS /////////////////////////

function get(url, parseResponse=false) {
  return new Promise((resolve, reject) => {
    let module = url.startsWith('https://') ? https : http;

    module.get(url, res => {
      if (res.statusCode !== 200) {
        reject(new Error(res.statusCode));
        return false;
      }

      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        let output = parseResponse ? JSON.parse(rawData) : rawData;
        resolve(output);
      });
    });
  });
}

function getReqBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', data => body += data);
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}

////////////////////// EXPORTS //////////////////////////

module.exports = {
  get,
  getReqBody
};

