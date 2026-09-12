"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth/auth-guard";
import { ChessProfileBalance } from "@/features/casino/components/chess-app/chess-profile-balance";
import {
  friendTimeControl,
  useFundedChessChallenge,
} from "@/features/casino/hooks/use-funded-chess-challenge";
import { useFundedChessComputer } from "@/features/casino/hooks/use-funded-chess-computer";
import {
  exceedsUsdcBalance,
  normalizeUsdcAmount,
} from "@/features/casino/lib/api/cashier";
import type { ChessVariant, CreateComputerMatchInput } from "@/features/casino/lib/api/types";
import { copyTextWhenReady } from "@/lib/clipboard";
import { friendlyError } from "@/lib/errors";
import { shareOrigin } from "@/lib/site-url";
import { toast } from "@/lib/toast";

export function chessAppRouteForUrl(
  url: URL,
  label = "",
  appOrigin = window.location.origin
): string | null {
  if (url.origin !== appOrigin) return null;

  const path = url.pathname.replace(/^\/api\/chess/, "");
  if (path === "/casino") {
    return `${path}${url.search}${url.hash}`;
  }
  if (path === "/casino/chess") {
    return `${path}${url.search}${url.hash}`;
  }
  if (path.startsWith("/casino/chess/")) {
    return `${path}${url.search}${url.hash}`;
  }
  if (path === "/play") {
    const setup = url.searchParams.get("setup");
    return setup
      ? `/casino/chess?setup=${encodeURIComponent(setup)}${url.hash}`
      : "/casino/chess";
  }
  if (path === "/tournament/new") return "/casino/chess/tournaments/create";
  if (path === "/tournament") return "/casino/chess/tournaments";
  if (path === "/swiss/new") return "/casino/chess/swiss/create";
  if (path === "/competition") return "/casino/chess/tournaments";
  if (path === "/competition/arenas") return "/casino/chess/tournaments";
  if (path.startsWith("/competition/arenas/")) {
    const arenaId = path.slice("/competition/arenas/".length);
    return `/casino/chess/tournaments/${arenaId}${url.search}${url.hash}`;
  }
  if (path === "/competition/swiss") return "/casino/chess/swiss";
  if (path.startsWith("/competition/swiss/")) {
    const swissId = path.slice("/competition/swiss/".length);
    return `/casino/chess/swiss/${swissId}${url.search}${url.hash}`;
  }
  if (path === "/games" || path === "/tv" || path === "/broadcasts") {
    return "/casino/chess/watch";
  }
  if (path === "/tools/analysis") return "/casino/chess/review";
  if (path === "/learn/practice") {
    return label === "practice"
      ? "/casino/chess/learn/practice"
      : "/casino/chess/learn";
  }
  if (path === "/learn" || label === "chess basics") return "/casino/chess/learn";
  if (path === "/learn/studies" || path === "/learn/practice/studies") {
    return "/casino/chess/learn/studies";
  }
  if (path === "/learn/puzzles" || path === "/learn/practice/puzzles") {
    return "/casino/chess/puzzles";
  }
  if (path.includes("/puzzles/")) return "/casino/chess/puzzles";
  if (path.endsWith("/coordinates")) return "/casino/chess/learn#/coord";
  if (path.endsWith("/coaches")) return "/casino/chess/learn/practice";
  return null;
}

function appRouteFor(anchor: HTMLAnchorElement): string | null {
  return chessAppRouteForUrl(
    new URL(anchor.href, window.location.origin),
    anchor.textContent?.trim().toLowerCase() ?? "",
  );
}

export function chessFrameSourceForAppRoute(destination: string): string | null {
  const url = new URL(destination, "http://ark.local");
  if (url.pathname !== "/casino/chess") return null;

  const setup = url.searchParams.get("setup");
  if (!setup && !url.search) return "/api/chess/play";
  if (setup !== "ai" && setup !== "friend" && setup !== "hook") return null;
  return `/api/chess/play?setup=${encodeURIComponent(setup)}#game-setup`;
}

export function chessLobbyUrlAfterSetupConsumed(url: URL): string | null {
  if (url.pathname !== "/casino/chess") return null;
  const setup = url.searchParams.get("setup");
  if (setup !== "ai" && setup !== "friend" && setup !== "hook") return null;

  const clean = new URL(url.href);
  clean.searchParams.delete("setup");
  if (clean.hash === "#game-setup") clean.hash = "";
  return `${clean.pathname}${clean.search}${clean.hash}`;
}

export function rewriteChessFrameLinks(
  frameDocument: Document,
  appOrigin = window.location.origin
): void {
  for (const anchor of frameDocument.querySelectorAll<HTMLAnchorElement>("a[href]")) {
    const destination = chessAppRouteForUrl(
      new URL(anchor.href, appOrigin),
      anchor.textContent?.trim().toLowerCase() ?? "",
      appOrigin
    );
    if (!destination) continue;
    anchor.setAttribute("href", destination);
    anchor.setAttribute("target", "_top");
  }
}

export function ChessLobbyFrame({ source }: { source: string }) {
  const router = useRouter();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [frameSource, setFrameSource] = useState(source);
  const computer = useFundedChessComputer();
  const startComputer = computer.start;
  const baseUsdcBalance = computer.availableUsdc;
  const balanceLoading = computer.balanceLoading;
  const friend = useFundedChessChallenge();
  const createFriend = friend.create;
  const acceptFriend = friend.accept;
  const friendUsdcBalance = friend.availableUsdc;
  const friendBalanceLoading = friend.balanceLoading;
  const friendConfigured = friend.configured;

  useEffect(() => {
    const cleanUrl = chessLobbyUrlAfterSetupConsumed(new URL(window.location.href));
    if (cleanUrl) window.history.replaceState(window.history.state, "", cleanUrl);
  }, []);

  useEffect(() => {
    setFrameSource(source);
  }, [source]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    let frameDocument: Document | null = null;
    let lobbyForm: HTMLFormElement | null = null;
    let computerForm: HTMLFormElement | null = null;
    let friendForm: HTMLFormElement | null = null;
    let fundedFriendAcceptForm: HTMLFormElement | null = null;
    const onFrameClick = (event: MouseEvent) => {
      // Nodes created by the iframe fail `instanceof Element` against the parent realm.
      const anchor = (event.target as Element | null)?.closest?.<HTMLAnchorElement>("a[href]");
      if (!anchor) return;
      const destination = appRouteFor(anchor);
      if (!destination) return;
      event.preventDefault();
      event.stopPropagation();
      const nextFrameSource = chessFrameSourceForAppRoute(destination);
      if (nextFrameSource) {
        // The iframe must navigate now; waiting for the parent RSC refresh caused
        // setup modals to appear only after a full page reload.
        frame.src = nextFrameSource;
        setFrameSource(nextFrameSource);
      }
      router.push(destination);
    };
    const onComputerSubmit = (event: SubmitEvent) => {
      const form = event.currentTarget as HTMLFormElement;
      const formData = new FormData(form);
      const rawStake = String(formData.get("stake_usdc") ?? "").trim();
      const stakeUsdc = normalizeUsdcAmount(rawStake);
      const zeroStake = /^0*(?:\.0*)?$/.test(rawStake);
      if (!rawStake || zeroStake) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      const error = form.querySelector<HTMLElement>("[data-computer-stake-error]");
      const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
      const submitLabel = form.querySelector<HTMLElement>(".submit-label");
      const showError = (message: string) => {
        if (!error) return;
        error.textContent = message;
        error.hidden = false;
      };

      if (!stakeUsdc) {
        showError("Enter a valid USDC stake with no more than 6 decimal places.");
        return;
      }

      const variant = String(formData.get("variant") ?? "standard") as ChessVariant;
      if (variant !== "standard") {
        showError("Funded computer games currently use Standard chess only.");
        return;
      }

      if (error) error.hidden = true;
      if (submit) submit.disabled = true;
      if (submitLabel) submitLabel.textContent = "Funding on Base...";
      const toastId = toast.loading("Funding your computer game on Base...");
      const color = String(formData.get("color") ?? "random");
      const input: CreateComputerMatchInput = {
        level: 8,
        color: color === "white" || color === "black" ? color : "random",
        variant: "standard",
        timeMode: "unlimited",
        stakeUsdc,
        coachEnabled: false,
      };

      void startComputer(input)
        .then((match) => {
          toast.success("Funded game ready.", { id: toastId });
          router.push(`/casino/chess/play?match=${match.id}`);
        })
        .catch((cause) => {
          const message = friendlyError(cause, "Couldn't start the funded computer game.");
          showError(message);
          toast.error(message, { id: toastId });
          if (submit) submit.disabled = false;
          if (submitLabel) submitLabel.textContent = "Play against computer";
        });
    };
    const onLobbySubmit = (event: SubmitEvent) => {
      const form = event.currentTarget as HTMLFormElement;
      const formData = new FormData(form);
      const rawStake = String(formData.get("stake_usdc") ?? "").trim();
      const stakeUsdc = normalizeUsdcAmount(rawStake);
      const zeroStake = /^0*(?:\.0*)?$/.test(rawStake);
      if (!rawStake || zeroStake) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      const error = form.querySelector<HTMLElement>("[data-lobby-stake-error]");
      const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
      const submitLabel = form.querySelector<HTMLElement>(".submit-label");
      const showError = (message: string) => {
        if (!error) return;
        error.textContent = message;
        error.hidden = false;
      };
      if (!stakeUsdc) {
        showError("Enter a valid USDC stake with no more than 6 decimal places.");
        return;
      }

      const [initialRaw, incrementRaw] = String(
        formData.get("time_control") ?? "300+3"
      ).split("+");
      const initialSeconds = Number.parseInt(initialRaw ?? "", 10);
      const incrementSeconds = Number.parseInt(incrementRaw ?? "", 10);
      if (!Number.isFinite(initialSeconds) || !Number.isFinite(incrementSeconds)) {
        showError("Choose a valid time control.");
        return;
      }

      if (error) error.hidden = true;
      if (submit) submit.disabled = true;
      if (submitLabel) submitLabel.textContent = "Funding on Base...";
      const toastId = toast.loading("Funding your lobby game on Base...");
      const color = String(formData.get("color") ?? "random");
      const input: CreateComputerMatchInput = {
        level: 8,
        color: color === "white" || color === "black" ? color : "random",
        variant: "standard",
        timeMode: "real_time",
        initialSeconds,
        incrementSeconds,
        stakeUsdc,
        coachEnabled: false,
        lobbyBot: true,
      };

      void startComputer(input)
        .then((match) => {
          toast.success("Funded lobby game ready.", { id: toastId });
          router.push(`/casino/chess/play?match=${match.id}`);
        })
        .catch((cause) => {
          const message = friendlyError(cause, "Couldn't start the funded lobby game.");
          showError(message);
          toast.error(message, { id: toastId });
          if (submit) submit.disabled = false;
          if (submitLabel) submitLabel.textContent = "Create a lobby game";
        });
    };
    const onFriendSubmit = (event: SubmitEvent) => {
      const form = event.currentTarget as HTMLFormElement;
      const formData = new FormData(form);
      const rawStake = String(formData.get("stake_usdc") ?? "").trim();
      const stakeUsdc = normalizeUsdcAmount(rawStake);
      const zeroStake = /^0*(?:\.0*)?$/.test(rawStake);
      if (!rawStake || zeroStake) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      const error = form.querySelector<HTMLElement>("[data-friend-stake-error]");
      const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
      const submitLabel = form.querySelector<HTMLElement>(".submit-label");
      const showError = (message: string) => {
        if (!error) return;
        error.textContent = message;
        error.hidden = false;
      };

      if (!stakeUsdc) {
        showError("Enter a valid USDC stake with no more than 6 decimal places.");
        return;
      }

      if (error) error.hidden = true;
      if (submit) submit.disabled = true;
      if (submitLabel) submitLabel.textContent = "Funding on Base...";
      const toastId = toast.loading("Funding your friend challenge on Base...");
      const color = String(formData.get("color") ?? "random");
      const mode = String(formData.get("mode") ?? "rated");
      const timeControl = friendTimeControl(String(formData.get("time_control") ?? "300+3"));
      const created = createFriend({
        timeControl,
        mode: "invite",
        rated: mode === "rated",
        color: color === "white" || color === "black" ? color : "random",
        allowTimeExtensions: false,
        videoEnabled: true,
        stakeUsdc,
      });
      const copied = copyTextWhenReady(
        created.then(
          ({ challenge }) =>
            `${shareOrigin()}/casino/chess/invite?code=${encodeURIComponent(challenge.id)}`
        )
      );

      void created
        .then(async ({ challenge }) => {
          const linkCopied = await copied;
          toast.success(linkCopied ? "Challenge funded and link copied." : "Challenge funded.", {
            id: toastId,
          });
          router.push(`/casino/chess/invite?code=${encodeURIComponent(challenge.id)}`);
        })
        .catch((cause) => {
          const message = friendlyError(cause, "Couldn't fund the friend challenge.");
          showError(message);
          toast.error(message, { id: toastId });
          if (submit) submit.disabled = false;
          if (submitLabel) submitLabel.textContent = "Challenge a friend";
        });
    };
    const onFundedFriendAccept = (event: SubmitEvent) => {
      event.preventDefault();
      event.stopImmediatePropagation();

      const form = event.currentTarget as HTMLFormElement;
      const formData = new FormData(form);
      const matchId = form.dataset.matchId ?? "";
      const stakeUsdc = normalizeUsdcAmount(String(formData.get("stake_usdc") ?? ""));
      const status = form.querySelector<HTMLElement>("[data-funded-friend-status]");
      const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
      const submitLabel = form.querySelector<HTMLElement>(".submit-label");
      const showError = (message: string) => {
        if (status) status.textContent = message;
      };

      if (!matchId || !stakeUsdc) {
        showError("This funded challenge is missing its wager details.");
        return;
      }
      if (!friendConfigured) {
        showError("Funded chess games are not available right now.");
        return;
      }
      if (friendBalanceLoading) {
        showError("Your Base USDC balance is still loading.");
        return;
      }
      if (exceedsUsdcBalance(stakeUsdc, friendUsdcBalance)) {
        showError(`You need ${stakeUsdc} USDC on Base to join this game.`);
        return;
      }

      showError("Funding and locking your seat on Base...");
      if (submit) submit.disabled = true;
      if (submitLabel) submitLabel.textContent = "Funding on Base...";
      const toastId = toast.loading("Funding your seat on Base...");
      void acceptFriend(matchId, stakeUsdc)
        .then((match) => {
          toast.success("Challenge accepted.", { id: toastId });
          router.push(`/casino/chess/play?match=${match.id}`);
        })
        .catch((cause) => {
          const message = friendlyError(cause, "Couldn't accept the funded challenge.");
          showError(message);
          toast.error(message, { id: toastId });
          if (submit) submit.disabled = false;
          if (submitLabel) submitLabel.textContent = "▶ Join the game";
        });
    };
    const attach = () => {
      frameDocument?.removeEventListener("click", onFrameClick, true);
      lobbyForm?.removeEventListener("submit", onLobbySubmit, true);
      computerForm?.removeEventListener("submit", onComputerSubmit, true);
      friendForm?.removeEventListener("submit", onFriendSubmit, true);
      fundedFriendAcceptForm?.removeEventListener("submit", onFundedFriendAccept, true);
      frameDocument = frame.contentDocument;
      if (frameDocument) rewriteChessFrameLinks(frameDocument);
      frameDocument?.addEventListener("click", onFrameClick, true);
      lobbyForm = frameDocument?.querySelector<HTMLFormElement>("form[data-lobby-setup]") ?? null;
      lobbyForm?.addEventListener("submit", onLobbySubmit, true);
      computerForm =
        frameDocument?.querySelector<HTMLFormElement>("form[data-computer-setup]") ?? null;
      computerForm?.addEventListener("submit", onComputerSubmit, true);
      friendForm = frameDocument?.querySelector<HTMLFormElement>("form[data-friend-setup]") ?? null;
      friendForm?.addEventListener("submit", onFriendSubmit, true);
      fundedFriendAcceptForm =
        frameDocument?.querySelector<HTMLFormElement>("form[data-funded-friend-accept]") ?? null;
      fundedFriendAcceptForm?.addEventListener("submit", onFundedFriendAccept, true);
      const balance = frameDocument?.querySelector<HTMLElement>("[data-computer-balance]");
      if (balance) {
        balance.textContent = balanceLoading ? "loading" : baseUsdcBalance;
      }
      const lobbyBalance = frameDocument?.querySelector<HTMLElement>("[data-lobby-balance]");
      if (lobbyBalance) {
        lobbyBalance.textContent = balanceLoading ? "loading" : baseUsdcBalance;
      }
      const friendBalance = frameDocument?.querySelector<HTMLElement>("[data-friend-balance]");
      if (friendBalance) {
        friendBalance.textContent = friendBalanceLoading ? "loading" : friendUsdcBalance;
      }
    };

    frame.addEventListener("load", attach);
    attach();
    return () => {
      frame.removeEventListener("load", attach);
      frameDocument?.removeEventListener("click", onFrameClick, true);
      lobbyForm?.removeEventListener("submit", onLobbySubmit, true);
      computerForm?.removeEventListener("submit", onComputerSubmit, true);
      friendForm?.removeEventListener("submit", onFriendSubmit, true);
      fundedFriendAcceptForm?.removeEventListener("submit", onFundedFriendAccept, true);
    };
  }, [
    balanceLoading,
    acceptFriend,
    baseUsdcBalance,
    createFriend,
    frameSource,
    friendBalanceLoading,
    friendConfigured,
    friendUsdcBalance,
    router,
    startComputer,
  ]);

  return (
    <AuthGuard>
      <>
        <iframe
          ref={frameRef}
          src={frameSource}
          title="Ark Chess"
          className="fixed inset-0 h-dvh w-full border-0 bg-black"
        />
        <div className="pointer-events-none fixed top-0 right-0 z-[120] flex h-[60px] items-center">
          <span className="pointer-events-auto">
            <ChessProfileBalance />
          </span>
        </div>
      </>
    </AuthGuard>
  );
}
