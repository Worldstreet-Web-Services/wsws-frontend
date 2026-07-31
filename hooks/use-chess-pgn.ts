"use client";

import { useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { fetchPgn } from "@/lib/casino/api/chess";

// Saves a finished game as a PGN file. The service composes the document, so
// this only names the download: a game is worth keeping, and PGN is what every
// chess tool reads.
//
// The blob lives here rather than in the screen because a component has no
// business calling the API client directly.
export function useChessPgn(matchId: string | null) {
  const mutation = useMutation({
    mutationFn: () => fetchPgn(matchId as string),
  });

  const { mutateAsync } = mutation;
  const download = useCallback(async () => {
    if (!matchId) return;
    const pgn = await mutateAsync();
    const url = URL.createObjectURL(new Blob([pgn], { type: "application/x-chess-pgn" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `chess-${matchId}.pgn`;
    link.click();
    // Revoking immediately can cancel the download in some browsers, so the
    // object URL is released on the next tick instead.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }, [matchId, mutateAsync]);

  return { download, downloading: mutation.isPending };
}
