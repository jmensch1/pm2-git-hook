Set up a git webhook for your pm2 app in 5 minutes. Start, stop, or check the status of the webhook whenever you want. Use SSL verification if you need it.

### Easy install

#### 1. Install this  module.

`pm2 install pm2-git-hook`

#### 2. Specify a command to run when the hook fires.

Add a command to your `ecosystem.json` file, for example:

```
apps:[{
  name: 'myApp',
  ...

  githook: {
    command: 'git pull && npm install && pm2 restart myApp'
  }
}]
```

#### 3. Start the webhook server.

`pm2 trigger pm2-git-hook start myApp`

This will start an `http` server running on port `9000` that listens for push notifications from github. It will run the command in the root directory of your app whenever you push to `master`.

If you want to make sure server is working, run `curl http://localhost:9000/status`. Alternatively, run `pm2 trigger pm2-git-hook status myApp`, which simply executes the `curl` command.

#### 4. Create the hook on github.

Go to Settings -> Webhook on github. Create a hook with payload URL `http://{hostName}:9000/`, content-type `application-json`, and no secret. Click `Disable SSL Verification` and then `Add Webhook`. Github will then ping the webhook server, and activate the hook.

### Configurable Properties

| Property | Description | Required | Default |
| ------------| ----------- | -------- | ------- |
| command | The command to run when github sends a push notification. | true |
| branch | The branch to listen for pushes on. | false | master |
| port | The port to run the server on. | false | 9000 |
| protocol | `http` or `https`. Use `https` if you want SSL verification on your hook.| false | http |
| sslCertPath | the full path of your SSL cert | if protocol is `https` |
| sslKeyPath | the full path of your SSL private key | if protocol is `https` |
| secret | the webhook secret on github | if you create a webhook with a secret |

### Commands

1. `pm2 trigger pm2-git-hook start myApp` -- start the webhook server
2. `pm2 trigger pm2-git-hook status myApp` -- get a status report on the server
3. `pm2 trigger pm2-git-hook stop myApp` -- stop the webhook server

### Notes

#### 1. git credentials

If your `command` contains commands that require github credentials (e.g., `git pull`), the command will fail unless your server is set up to take the creds from the `.git-credentials` file, or from some other credentials helper program. You can use `git config credential.helper store` to create a `.git-credentials` file. (See [here](https://stackoverflow.com/questions/5343068/is-there-a-way-to-skip-password-typing-when-using-https-on-github) and [here](https://git-scm.com/docs/gitcredentials).)

#### 2. multiple apps

You can run webhook servers for as many apps as you want. Just make sure the ports are different for each app.
