
module.exports = config => {

  if (!config.command)
    return Promise.reject('command is a required field.');
  else if (config.protocol === 'https' && (!config.sslKeyPath || !config.sslCertPath))
    return Promise.reject('To run a webhook server over https you must provide a sshKeyPath and sshCertPath in the config.')
  else
    return Promise.resolve(config);

};
