export const defaultConfig = {
    interval: 1000,
    protocols: [],
    tryTimes: 5,
};
export default class AutoWebSocket {
    URI;
    config;
    intervalID;
    isClosed = false;
    isPinged = false;
    // @ts-ignore
    ws;
    binaryType = "blob";
    _onclose = null;
    _onerror = null;
    _onmessage = null;
    _onopen = null;
    constructor(uri, config) {
        this.URI = uri;
        this.config = { ...defaultConfig, ...config };
        this.connect();
    }
    get bufferedAmount() {
        return this.ws.bufferedAmount;
    }
    get extensions() {
        return this.ws.extensions;
    }
    get protocol() {
        return this.ws.protocol;
    }
    get readyState() {
        return this.ws.readyState;
    }
    get url() {
        return this.ws.url;
    }
    close(code, reason) {
        this.ws.close(code, reason);
        this.isClosed = true;
    }
    send(data) {
        this.ws.send(data);
    }
    get onclose() {
        return this.ws.onclose;
    }
    set onclose(newValue) {
        this.ws.onclose = newValue;
        this._onclose = newValue;
    }
    get onerror() {
        return this.ws.onerror;
    }
    set onerror(newValue) {
        this.ws.onerror = newValue;
        this._onerror = newValue;
    }
    get onmessage() {
        return this.ws.onmessage;
    }
    set onmessage(newValue) {
        this._onmessage = newValue;
    }
    set onopen(newValue) {
        this.ws.onopen = newValue;
        this._onopen = newValue;
    }
    addEventListener = (type, listener, _) => {
        switch (type) {
            case "close":
                this.onclose = listener;
                break;
            case "error":
                this.onerror = listener;
                break;
            case "message":
                this.onmessage = listener;
                break;
            case "open":
                this.onopen = listener;
        }
    };
    connect = () => {
        this.ws = this.trySocketConnect();
        this.setProperty();
        this.continuation();
    };
    setProperty = () => {
        this.ws.binaryType = this.binaryType;
        this.ws.onclose = this._onclose;
        this.ws.onerror = this._onerror;
        const self = this;
        this.ws.onmessage = function (ev) {
            if (ev.data === 'pong' && self.isPinged) {
                self.isPinged = false;
            }
            else {
                if (self._onmessage == null)
                    return;
                self._onmessage.call(this, ev);
            }
        };
        this.ws.onopen = this._onopen;
    };
    trySocketConnect = () => {
        for (let i = 0; i < this.config.tryTimes; i++) {
            try {
                return new WebSocket(this.URI, this.config.protocols);
            }
            catch (e) {
                if (i + 1 === this.config.tryTimes)
                    throw e;
            }
        }
        throw Error('Library Error');
    };
    continuation = () => {
        this.intervalID = setInterval(() => {
            if (this.isPinged) {
                this.stopContinuation();
                this.connect();
                return;
            }
            this.send("ping");
            this.isPinged = true;
        }, this.config.interval);
    };
    stopContinuation = () => {
        clearInterval(this.intervalID);
    };
}
