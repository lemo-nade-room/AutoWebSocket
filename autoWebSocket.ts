/** AutoWebSocket Setting */
export interface Config {
    /** send ping interval [ms] */
    interval?: number;

    protocols?: string | string[];

    /** wait pong time [ms] */
    waitTime?: number;

    /** how many times should we re-try when connect failed */
    tryTimes?: number;
}

export const defaultConfig: Config = {
    interval: 1000,
    protocols: [],
    tryTimes: 5,
};

export interface IAutoWebSocket {
    onclose: (this: WebSocket, ev: CloseEvent) => any;
    onerror: (this:WebSocket, ev: Event) => any;
    onmessage: (this:WebSocket, ev: MessageEvent<any>) => any;
    onopen: (this:WebSocket, ev: Event) => any;
    binaryType: BinaryType;
    readonly bufferedAmount: number
    readonly extensions: string
    readonly protocol: string
    readonly readyState: number
    readonly url: string
    close(code?: number, reason?: string): void
    send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void
    addEventListener(
        type: keyof WebSocketEventMap,
        listener: (this:WebSocket, ev: (CloseEvent | Event | MessageEvent<any>)) => any,
        _?: boolean | AddEventListenerOptions
    ): void;
}

export default class AutoWebSocket implements IAutoWebSocket {

    private readonly URI: string;
    private readonly config: Config;

    private intervalID: any;

    private isClosed: boolean = false;
    private isPinged: boolean = false;

    private ws: WebSocket;

    public binaryType: BinaryType = "blob";

    private _onclose: (this: WebSocket, ev: CloseEvent) => any = () => {};
    private _onerror: (this:WebSocket, ev: Event) => any = () => {};
    private _onmessage: (this:WebSocket, ev: MessageEvent<any>) => any = () => {};
    private _onopen: (this:WebSocket, ev: Event) => any = () => {};

    public constructor(uri: string, config: Config) {
        this.URI = uri;
        this.config = { ...defaultConfig, ...config };
        this.connect();
    }

    public get bufferedAmount(): number {
        return this.ws.bufferedAmount;
    }

    public get extensions(): string {
        return this.ws.extensions;
    }

    public get protocol(): string {
        return this.ws.protocol;
    }

    public get readyState(): number {
        return this.ws.readyState;
    }

    public get url(): string {
        return this.ws.url;
    }

    public close(code?: number, reason?: string): void {
        this.ws.close(code, reason);
        this.isClosed = true;
    }

    public send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
        this.ws.send(data);
    }

    public get onclose(): (this: WebSocket, ev: CloseEvent) => any {
        return this.ws.onclose
    }

    public set onclose(newValue: ((this: WebSocket, ev: CloseEvent) => any)) {
        this.ws.onclose = newValue;
        this._onclose = newValue;
    }

    public get onerror(): ((this:WebSocket, ev: Event) => any) {
        return this.ws.onerror;
    }

    public set onerror(newValue: ((this:WebSocket, ev: Event) => any)) {
        this.ws.onerror = newValue;
        this._onerror = newValue;
    }

    public get onmessage(): ((this:WebSocket, ev: MessageEvent<any>) => any) {
        return this.ws.onmessage;
    }

    public set onmessage(newValue: ((this:WebSocket, ev: MessageEvent<any>) => any)) {
        this._onmessage = newValue;
    }

    public set onopen(newValue: ((this:WebSocket, ev: Event) => any)) {
        this.ws.onopen = newValue;
        this._onopen = newValue;
        this.ws.addEventListener('error', () => {}, {})
    }

    public readonly addEventListener = (
        type: keyof WebSocketEventMap,
        listener: (this:WebSocket, ev: (CloseEvent | Event | MessageEvent<any>)) => any,
        _?: boolean | AddEventListenerOptions
    ): void => {
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
    }

    private readonly connect = (): void => {
        this.ws = this.trySocketConnect();
        this.setProperty();
        this.continuation();
    };

    private readonly setProperty = () => {
        this.ws.binaryType = this.binaryType;
        this.ws.onclose = this._onclose;
        this.ws.onerror = this._onerror;
        const self = this;
        this.ws.onmessage = function (ev) {
            if (ev.data === 'pong' && self.isPinged) {
                self.isPinged = false;
            } else {
                self._onmessage.call(this, ev);
            }
        }
        this.ws.onopen = this._onopen;
    };

    private readonly trySocketConnect = (): WebSocket => {
        for (let i = 0; i < this.config.tryTimes; i++) {
            try {
                return new WebSocket(this.URI, this.config.protocols);
            } catch (e) {
                if (i + 1 === this.config.tryTimes) throw e;
            }
        }
    }

    private readonly continuation = () => {
        this.intervalID = setInterval(() => {
            if (this.isPinged) {
                this.stopContinuation();
                this.connect();
                return;
            }
            this.send("ping")
            this.isPinged = true;
        }, this.config.interval)
    }

    private readonly stopContinuation = () => {
        clearInterval(this.intervalID);
    }

}