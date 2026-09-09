import { describe, it, expect } from "vitest";
import { chessClient, draughtsClient, vaultClient } from "./casino";
import { pouchClient, paymentClient, rampingClient } from "./funds";
import { tradeClient } from "./trade";

describe("Domain Service Clients", () => {
  it("initializes all domain service clients with expected interfaces", () => {
    const clients = [
      chessClient,
      draughtsClient,
      vaultClient,
      pouchClient,
      paymentClient,
      rampingClient,
      tradeClient,
    ];

    for (const client of clients) {
      expect(typeof client.get).toBe("function");
      expect(typeof client.authedGet).toBe("function");
      expect(typeof client.post).toBe("function");
      expect(typeof client.put).toBe("function");
      expect(typeof client.del).toBe("function");
      expect(typeof client.postForm).toBe("function");
    }
  });
});
