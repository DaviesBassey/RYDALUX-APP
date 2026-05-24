let WebSocketGatewayDec: any = (_opts?: any) => (cls: any) => cls;
let WebSocketServerDec: any = () => (target: any, propKey: string) => {};

try {
  // optional dependency: only require if available (tests may not install it)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ws = require('@nestjs/websockets');
  WebSocketGatewayDec = ws.WebSocketGateway || WebSocketGatewayDec;
  WebSocketServerDec = ws.WebSocketServer || WebSocketServerDec;
} catch (e) {
  // noop - leave decorators as no-ops when package missing
}

@WebSocketGatewayDec({ namespace: '/trips', cors: { origin: '*' } })
export class TripsGateway {
  @WebSocketServerDec()
  server: any;

  publishDriverLocation(tripId: string, payload: any) {
    this.server?.emit?.(`trip:${tripId}:location`, payload);
  }
}
