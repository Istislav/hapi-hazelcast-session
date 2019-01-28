const hapi = require('hapi');
const hoek = require('hoek');

const fakeHazel = require('./fakeHazelcastClient');

const extractCookie = (res) => {
    const cookie = res.headers['set-cookie'][0];
    return cookie.slice(0, cookie.indexOf(';'));
};

const runServer = async (options, callback) => {
    const server = new hapi.Server({
        host: 'localhost',
        address: '127.0.0.1'
    });

    server.route({
        method: 'GET',
        path: '/test',
        handler: (request, h) => {
            if (request.query.test) {
                if (request.query.test === 'delete') {
                    delete request.session;
                } else {
                    request.session.test = request.query.test;
                }
            }
            return '';
        }
    });

    hoek.merge(options, { hazelClient: fakeHazel });

    await server.register({ plugin: require('../session'), options });

    server.decorate('server', 'testInject', (options) => {
        options = options || {};
        let url = '/test';
        if (options.value) {
            url += '?test=' + options.value;
        }
        const headers = options.cookie ? { cookie: options.cookie } : {};
        return server.inject({ url, headers });
    });
    server.decorate('server', 'testInjectWithValue', () => server.testInject({ value: '1' }));
    server.decorate('server', 'testInjectWithCookie', async () => {
        const res = await server.testInjectWithValue();
        return server.testInject({ cookie: extractCookie(res) });
    });
    server.decorate('server', 'testInjectWithCookieAndValue', async () => {
        const res = await server.testInjectWithValue();
        return server.testInject({ cookie: extractCookie(res), value: '2' });
    });

    await server.start();
    try {
        await callback(server);
    } finally {
        await server.stop();
    }
};

module.exports = { runServer, extractCookie };
