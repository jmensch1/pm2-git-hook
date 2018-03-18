
module.exports = config => {

  if (!config.hookCommand)
    return Promise.reject('hookCommand is a required field.');
  else if (config.protocol === 'https' && (!config.sslKeyPath || !config.sslCertPath))
    return Promise.reject('To run a webhook server over https you must provide a sshKeyPath and sshCertPath in the config.')
  else
    return Promise.resolve(config);

};