const fakeHazelcastClient = function () {
    let self = this;
    let maps = {};

    const SaveMap = function () {
        let mapObj = this;
        let mapCont = {};

        mapObj.put = function (id, value) {
            // console.log('PUT value', id, value);
            mapCont[id] = value;
        };
        mapObj.get = function (id) {
            // console.log('GET value', id, mapCont[id]);
            return mapCont[id];
            // return typeof mapCont[id] === 'undefined' ? null : mapCont[id];
        };
    };

    self.newHazelcastClient = function (hazelcastCfg) {
        return self;
    };
    self.getMap = function (mapName) {
        // console.log('GET map', mapName);
        if (!maps[mapName]) maps[mapName] = new SaveMap();
        return maps[mapName];
    };
    self.shutdown = function () { };

    // return self;
};

module.exports = new fakeHazelcastClient();
