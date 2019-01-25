const crypto = require('crypto');
const hoek = require('hoek');

const defaultOptions = {
    algorithm: 'sha256',
    host: '',
    cache: {
        segment: 'session'
    },
    cookie: {
        isSameSite: 'Lax',
        path: '/'
    },
    name: 'id',
    size: 16
};


let HazelcastConfig = require('hazelcast-client').Config;

let hazelcastCfg = new HazelcastConfig.ClientConfig();

const register = (server, options) => {
    const MAP_NAME = 'hapi_user_session';
    let hazelClient;

    options = hoek.applyToDefaults(defaultOptions, options, true);
    if (options.host != '') {
        hazelcastCfg.networkConfig.addresses.push(options.host);
    }
    if (typeof options.login != 'undefined' && options.login != '') {
        hazelcastCfg.groupConfig.name = options.login;
        if (typeof options.password != 'undefined' && options.password != '') {
            hazelcastCfg.groupConfig.password = options.password;
        }
    }
    if (options.hazelClient) {
        hazelClient = options.hazelClient;
    } else {
        hazelClient = require('hazelcast-client').Client;
    }

    if (options.cache.expiresIn === undefined) {
        const maxExpiresIn = 2 ** 31 - 1;
        options.cache.expiresIn = Math.min(options.expiresIn || maxExpiresIn, maxExpiresIn);
    }
    if (options.cookie.ttl === undefined) {
        options.cookie.ttl = options.expiresIn;
    }

    server.state(options.name, options.cookie);

    const createSessionId = (randomBytes, expiresAt) => {
        const sessionId = [randomBytes || crypto.randomBytes(options.size)];

        if (options.key) {
            if (options.expiresIn) {
                const buffer = new Buffer(8);
                buffer.writeDoubleBE(expiresAt || Date.now() + options.expiresIn);
                sessionId.push(buffer);
            }
            // console.log('*****************', options);

            const hmac = crypto.createHmac(options.algorithm, options.key);
            sessionId.forEach(value => hmac.update(value));
            sessionId.push(hmac.digest());
        }
        return hoek.base64urlEncode(Buffer.concat(sessionId));
    };


    const saveSession2Hazel = async function (sessionId, sess) {
        let client = await hazelClient.newHazelcastClient(hazelcastCfg);
        let session_map = await client.getMap(MAP_NAME);
        await session_map.put(sessionId, sess);
        client.shutdown();
        return sess;
    };


    const loadSessionFromHazel = async function (sessionId) {
        let client = await hazelClient.newHazelcastClient(hazelcastCfg);
        let session_map = await client.getMap(MAP_NAME);
        let sess = await session_map.get(sessionId);
        client.shutdown();
        return sess;
    };

    const isValidSessionId = (sessionId) => {
        let minSize = options.size;
        if (options.key && options.expiresIn) {
            minSize += 8;
        }
        let decodedSessionId;
        try {
            decodedSessionId = hoek.base64urlDecode(sessionId, 'buffer');
        } catch (err) {
            return false;
        }
        if (decodedSessionId.length < minSize) {
            return false;
        }
        const randomBytes = decodedSessionId.slice(0, options.size);
        let expiresAt;
        if (options.key && options.expiresIn) {
            expiresAt = decodedSessionId.readDoubleBE(options.size);
            let dt = Date.now();
            console.log('*********&&&&&&&&&', expiresAt, dt, dt >= expiresAt, dt - expiresAt);
            if (Date.now() >= expiresAt) {
                console.log('*********&&&&&&&&& OOOKKK');
                return false;
            }
        }
        return sessionId === createSessionId(randomBytes, expiresAt);
    };

    const loadSession = async (request, h) => {
        const sessionId = request.state[options.name];
        if (sessionId) {
            if (isValidSessionId(sessionId)) {
                const session = await loadSessionFromHazel(sessionId);
                if (session) {
                    console.log('SESSION EXISTS and VALID hazel', session);
                    request._sessionId = sessionId;
                    request.session = session;
                    request._session = hoek.clone(request.session);

                    return h.continue;
                }
            }
            // session is invalid or expired
            h.unstate(options.name);
        }
        request.session = {};
        request._session = {};
        return h.continue;
    };
    server.ext('onPreAuth', loadSession);

    const storeSession = async (request, h) => {
        if (hoek.deepEqual(request.session, request._session)) {
            return h.continue;
        }
        let sessionId = request._sessionId;
        if (!sessionId) {
            sessionId = createSessionId();
            h.state(options.name, sessionId);
        }
        if (request.session === undefined) {
            h.unstate(options.name);
            await saveSession2Hazel(sessionId, null);
            request.session = {};
            request._session = {};
            return h.continue;
        }
        await saveSession2Hazel(sessionId, request.session);
        return h.continue;
    };
    server.ext('onPreResponse', storeSession);
};

exports.plugin = {
    pkg: require('./package.json'),
    register
};
