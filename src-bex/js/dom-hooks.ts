// Hooks added here have a bridge allowing communication between the Web Page and the BEX Content Script.
// More info: https://quasar.dev/quasar-cli/developing-browser-extensions/dom-hooks

import { stringify } from "@bitauth/libauth";
import { BexBridge, BexPayload } from "@quasar/app-webpack";
import { bexDom } from "quasar/wrappers";
import { SignMessageOptions, SignMessageResponse, OriginInfo, SignTransactionOptions, SignTransactionResponse } from "./interface";

declare global {
  interface Window {
    paytaca?: Paytaca
  }
}

class Paytaca extends EventTarget {
  private callbackMap: any = {};

  constructor (public bridge: BexBridge) {
    super();
    this.bridge = bridge;

    this.bridge.on("window.paytaca.addressChanged", ({data} : BexPayload<{address?: string}, any>) => {
      this.dispatchEvent(new CustomEvent("addressChanged", { detail: data.address }));
    });
  }

  addEventListener (event: string, callback: any, options: AddEventListenerOptions): void {
    const wrapper = (event: any) => callback(event.detail);
    this.callbackMap[callback as any] = wrapper;
    super.addEventListener(event, wrapper, options);
  }

  on (event: string, callback: any, options: AddEventListenerOptions): void {
    this.addEventListener(event, callback, options);
  }

  once (event: string, callback: any, options: AddEventListenerOptions): void {
    this.addEventListener(event, callback, { ...options, once: true });
  }

  off (event: string, callback: any): void {
    this.removeEventListener(event, this.callbackMap[callback]);
    delete this.callbackMap[callback];
  }

  async send (assetId, amount, recipient): Promise<void> {
    this.bridge.send('window.paytaca.send', {
      assetId: assetId,
      amount: amount,
      recipient: recipient
    })
  }

  async payToConnecta (paymentRequestData, orderId): Promise<void> {
    this.bridge.send('window.paytaca.connecta', {
      paymentRequestData,
      orderId
    })
  }

  async connect (): Promise<void> {
    const response = await this.bridge.send('window.paytaca.connect', {
      origin: window.location.origin
    })

    this.dispatchEvent(new CustomEvent("addressChanged", { detail: response.data.address }));

    return response.data
  }

  async connected (): Promise<boolean> {
    const response = await this.bridge.send('window.paytaca.connected', {
      origin: window.location.origin
    })
    return response.data
  }

  async disconnect (): Promise<void> {
    const response = await this.bridge.send('window.paytaca.disconnect', {
      origin: window.location.origin
    })

    this.dispatchEvent(new CustomEvent("addressChanged", { detail: response.data.address }));

    return response.data
  }

  async address (assetId: string): Promise<string | undefined> {
    const connected = await this.connected();

    if (!connected) {
      return undefined;
    }

    const response = await this.bridge.send('window.paytaca.address', {
      origin: window.location.origin,
      assetId: assetId
    })
    return response.data
  }

  async signMessage (options: SignMessageOptions): Promise<SignMessageResponse | undefined> {
    const connected = await this.connected();

    if (!connected) {
      return undefined;
    }

    const response = await this.bridge.send('window.paytaca.signMessage', {
      origin: window.location.origin,
      assetId: options.assetId,
      message: options.message,
      userPrompt: options.userPrompt,
    } as SignMessageOptions | OriginInfo)
    return response.data
  }

  async signTransaction (options: SignTransactionOptions): Promise<SignTransactionResponse | undefined> {
    const connected = await this.connected();

    if (options.assetId?.toLowerCase() === "sbch") {
      throw Error("Not supported yet");
    }

    if (!connected) {
      return undefined;
    }

    const response = await this.bridge.send('window.paytaca.signTransaction', {
      origin: window.location.origin,
      assetId: options.assetId,
      transaction: typeof options.transaction === "string" ? options.transaction : stringify(options.transaction, 0),
      sourceOutputs: stringify(options.sourceOutputs, 0),
      broadcast: options.broadcast,
      userPrompt: options.userPrompt,
    } as SignTransactionOptions | OriginInfo)
    return response.data
  }
}

export default bexDom((bridge) => {
  // Inject Paytaca object into the window
  window.paytaca = new Paytaca(bridge)

  const connectaRegex = /^(app|http|https):\/\/(www.)?paytaca.com\/(payment-request|apps\/connecta)\/?/
  if (connectaRegex.test(location.href)) {
    const url = new URL(location.href)
    window.paytaca.payToConnecta(
      url.searchParams.get('d'),
      url.searchParams.get('orderId')
    )
    location.replace(location.origin)
  }
});
