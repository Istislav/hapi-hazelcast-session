# hapi-hazelcast-session

Server-side session for hapi, stored in Hazelcast cache server. Based on [hapi-server-session](https://github.com/btmorex/hapi-server-session). 

## Install

    $ npm install hapi-hazelcast-session

## Example

```javascript
'use strict';

const hapi = require('hapi');

const main = async () => {
  const server = new hapi.Server({
    host: 'localhost',
    address: '127.0.0.1',
    port: 8000,
  });

  await server.register({
    plugin: require('hazelcast-server-session'),
    options: {
      host: '127.0.0.1',
      login: 'cluster_login',
      password: 'cluster_password',
      cookie: {
        isSecure: false, // never set to false in production
      },
    },
  });

  server.route({
    method: 'GET',
    path: '/',
    handler: (request, h) => {
      request.session.views = request.session.views + 1 || 1;
      return 'Views: ' + request.session.views;
    },
  });

  await server.start();
};

main().catch(console.error);
```

## Options

      host: '127.0.0.1',
      login: 'cluster_login',
      password: 'cluster_password',
- `host`: [Default: `'127.0.0.1'`] host of the Hazelcast server
- `login`: [Default: `''`] group name of the Hazelcast server 
- `password`: [Default: `''`] password of the Hazelcast server 

- `algorithm`: [Default: `'sha256'`] algorithm to use during signing
- `cache`: supports the same options as [`server.cache(options)`](<https://hapijs.com/api#server.cache()>)
  - `expiresIn`: [Default: session `expiresIn` if set or `2147483647`] session cache expiration in milliseconds
  - `segment`: [Default: `'session'`] session cache segment
- `cookie`: supports the same options as [`server.state(name, [options])`](<https://hapijs.com/api#server.state()>)
  - `isSameSite`: [Default: `'Lax'`] sets the `SameSite` flag
  - `path`: [Default: `'/'`] sets the `Path` flag
  - `ttl`: [Default: session `expiresIn` if set] sets the `Expires` and `Max-Age` flags
- `expiresIn`: session expiration in milliseconds
- `name`: [Default: `'id'`] name of the cookie
- `key`: signing key. Prevents weaknesses in randomness from affecting overall security
- `size`: [Default: `16`] number of random bytes in the session id


