"use client";

import { predictionCombos } from "./service";
import type { HouseTicket, HouseTicketsPage, PrepareHouseLeg } from "./types";

export function prepareHouseTicket(stakeE6: bigint, legs: PrepareHouseLeg[]): Promise<HouseTicket> {
  return predictionCombos.post<HouseTicket>("/house/tickets/prepare", {
    stakeE6: stakeE6.toString(),
    legs,
  });
}

export function confirmHouseTicket(
  ticketId: string,
  transactionHash: string
): Promise<HouseTicket> {
  return predictionCombos.post<HouseTicket>(
    `/house/tickets/${encodeURIComponent(ticketId)}/confirm`,
    { transactionHash }
  );
}

export function fetchHouseTickets(): Promise<HouseTicketsPage> {
  return predictionCombos.authedGet<HouseTicketsPage>("/house/tickets");
}
