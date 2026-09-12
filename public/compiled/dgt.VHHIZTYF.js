import {
  Chess,
  INITIAL_FEN,
  board,
  castlingSide,
  defaultSetup,
  fen_exports,
  makeFen,
  makeSan,
  normalizeMove,
  parseFen,
  parseSan
} from "./lib.X7H2PLEK.js";
import {
  makeUci,
  parseUci
} from "./lib.53PYQRAK.js";
import "./lib.KO2KTNGK.js";

// ../dgt/src/config.ts
function config_default() {
  const form = document.getElementById("dgt-config"), voiceSelector = document.getElementById("dgt-speech-voice");
  (function populateVoiceList() {
    if (!voiceSelector || typeof speechSynthesis === "undefined") return;
    speechSynthesis.getVoices().forEach((voice, i) => {
      const option = document.createElement("option");
      option.value = voice.name;
      option.textContent = voice.name + " (" + voice.lang + ")";
      if (voice.default) option.textContent += " -- DEFAULT";
      voiceSelector.appendChild(option);
      if (voice.name === localStorage.getItem("dgt-speech-voice")) voiceSelector.selectedIndex = i;
    });
    speechSynthesis.onvoiceschanged = populateVoiceList;
  })();
  const defaultSpeechKeywords = {
    K: "King",
    Q: "Queen",
    R: "Rook",
    B: "Bishop",
    N: "Knight",
    P: "Pawn",
    x: "Takes",
    "+": "Check",
    "#": "Checkmate",
    "(=)": "Game ends in draw",
    "O-O-O": "Castles queenside",
    "O-O": "Castles kingside",
    white: "White",
    black: "Black",
    "wins by": "wins by",
    timeout: "timeout",
    resignation: "resignation",
    illegal: "illegal",
    move: "move"
  };
  function ensureDefaults() {
    [
      ["dgt-livechess-url", "ws://localhost:1982/api/v1.0"],
      ["dgt-speech-keywords", JSON.stringify(defaultSpeechKeywords, void 0, 2)],
      ["dgt-speech-synthesis", "true"],
      ["dgt-speech-announce-all-moves", "true"],
      ["dgt-speech-announce-move-format", "san"],
      ["dgt-verbose", "false"]
    ].forEach(([k, v]) => {
      if (!localStorage.getItem(k)) localStorage.setItem(k, v);
    });
  }
  function populateForm() {
    ["dgt-livechess-url", "dgt-speech-keywords"].forEach((k) => {
      form[k].value = localStorage.getItem(k);
    });
    ["dgt-speech-synthesis", "dgt-speech-announce-all-moves", "dgt-verbose"].forEach(
      (k) => [true, false].forEach((v) => {
        const input = document.getElementById(`${k}_${v}`);
        input.checked = localStorage.getItem(k) === v.toString();
      })
    );
    ["san", "uci"].forEach((v) => {
      const k = "dgt-speech-announce-move-format";
      const input = document.getElementById(`${k}_${v}`);
      input.checked = localStorage.getItem(k) === v;
    });
  }
  if (form) {
    ensureDefaults();
    populateForm();
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      Array.from(new FormData(form).entries()).forEach(([k, v]) => localStorage.setItem(k, v.toString()));
    });
  }
}

// ../dgt/src/play.ts
function play_default(token) {
  const root = document.getElementById("dgt-play-zone");
  const consoleOutput = document.getElementById("dgt-play-zone-log");
  const liveChessURL = localStorage.getItem("dgt-livechess-url");
  const announceAllMoves = localStorage.getItem("dgt-speech-announce-all-moves") === "true";
  const verbose = localStorage.getItem("dgt-verbose") === "true";
  const announceMoveFormat = localStorage.getItem("dgt-speech-announce-move-format") ? localStorage.getItem("dgt-speech-announce-move-format") : "san";
  const speechSynthesisOn = localStorage.getItem("dgt-speech-synthesis") === "true";
  const voice = localStorage.getItem("dgt-speech-voice");
  let keywords = {
    K: "King",
    Q: "Queen",
    R: "Rook",
    B: "Bishop",
    N: "Knight",
    P: "Pawn",
    x: "Takes",
    "+": "Check",
    "#": "Checkmate",
    "(=)": "Game ends in draw",
    "O-O-O": "Castles queenside",
    "O-O": "Castles kingside",
    white: "White",
    black: "Black",
    "wins by": "wins by",
    timeout: "timeout",
    resignation: "resignation",
    illegal: "illegal",
    move: "move"
  };
  try {
    if (JSON.parse(localStorage.getItem("dgt-speech-keywords")).K.length > 0) {
      keywords = JSON.parse(localStorage.getItem("dgt-speech-keywords"));
    } else {
      console.warn("JSON Object for Speech Keywords seems incomplete. Using English default.");
    }
  } catch (error) {
    console.error("Invalid JSON Object for Speech Keywords. Using English default. " + error);
  }
  const time = /* @__PURE__ */ new Date();
  let currentGameId = "";
  let currentGameColor = "";
  let me;
  const gameInfoMap = /* @__PURE__ */ new Map();
  const gameStateMap = /* @__PURE__ */ new Map();
  const gameConnectionMap = /* @__PURE__ */ new Map();
  const gameChessBoardMap = /* @__PURE__ */ new Map();
  let eventSteamStatus = { connected: false, lastEvent: time.getTime() };
  const keywordsBase = [
    "white",
    "black",
    "K",
    "Q",
    "R",
    "B",
    "N",
    "P",
    "x",
    "+",
    "#",
    "(=)",
    "O-O-O",
    "O-O",
    "wins by",
    "timeout",
    "resignation",
    "illegal",
    "move"
  ];
  let lastSanMove;
  let localBoard = startingPosition();
  let DGTgameId = "";
  let boards = Array();
  let liveChessConnection;
  let isLiveChessConnected = false;
  let currentSerialnr = "0";
  const subscription = {
    id: 2,
    call: "subscribe",
    param: { feed: "eboardevent", id: 1, param: { serialnr: "" } }
  };
  let lastLegalParam;
  let lastLiveChessBoard;
  rewireLoggingToElement(consoleOutput, root, true);
  function rewireLoggingToElement(eleLocator, eleOverflowLocator, autoScroll) {
    eleLocator.innerHTML = "";
    fixLoggingFunc("log");
    fixLoggingFunc("debug");
    fixLoggingFunc("warn");
    fixLoggingFunc("error");
    fixLoggingFunc("info");
    fixLoggingFunc("table");
    function fixLoggingFunc(name) {
      console["old" + name] = console[name];
      console[name] = function() {
        return new Promise((resolve) => {
          let output = "";
          for (let i = 0; i < arguments.length; i++) {
            const arg = arguments[i];
            if (arg === "*" || arg === ":") {
              output += arg;
            } else {
              output += '</br><span class="log-' + typeof arg + " log-" + name + '">';
              if (typeof arg === "object") {
                output += JSON.stringify(arg);
              } else {
                output += arg;
              }
              output += "</span>&nbsp;";
            }
          }
          const maxLogBytes = verbose ? -1048576 : -8192;
          let isScrolledToBottom = false;
          if (autoScroll) {
            isScrolledToBottom = eleOverflowLocator.scrollHeight - eleOverflowLocator.clientHeight <= eleOverflowLocator.scrollTop + 1;
          }
          eleLocator.innerHTML = eleLocator.innerHTML.slice(maxLogBytes) + output;
          if (isScrolledToBottom) {
            eleOverflowLocator.scrollTop = eleOverflowLocator.scrollHeight - eleOverflowLocator.clientHeight;
          }
          try {
            console["old" + name].apply(void 0, arguments);
          } catch (e) {
            console["olderror"].apply(void 0, ["Error when logging"]);
          }
          resolve();
        });
      };
    }
  }
  const sleep = (ms = 0) => new Promise((r) => setTimeout(r, ms));
  function getProfile() {
    if (verbose) console.log("getProfile - About to call /api/account");
    fetch("/api/account", {
      headers: { Authorization: "Bearer " + token }
    }).then((r) => r.json()).then((data) => {
      me = data;
      if (verbose) console.log("/api/account Response:" + JSON.stringify(data));
      console.log("\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510");
      console.log("\u2502 " + (typeof data.title === "undefined" ? "" : data.title) + " " + data.username);
      console.table(data.perfs);
    }).catch((err) => {
      console.error("getProfile - Error. " + err.message);
    });
  }
  async function connectToEventStream() {
    if (verbose) console.log("connectToEventStream - About to call /api/stream/event");
    const response = await fetch("/api/stream/event", {
      headers: { Authorization: "Bearer " + token }
    });
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (verbose && value.length > 1)
        console.log("connectToEventStream - Chunk received", decoder.decode(value));
      eventSteamStatus = { connected: true, lastEvent: time.getTime() };
      const jsonArray = value ? decoder.decode(value).split("\n") : [];
      for (let i = 0; i < jsonArray.length; i++) {
        if (jsonArray[i].length > 2) {
          try {
            const data = JSON.parse(jsonArray[i]);
            if (data.type === "gameStart") {
              if (verbose)
                console.log("connectToEventStream - gameStart event arrived. GameId: " + data.game.id);
              try {
                connectToGameStream(data.game.id);
              } catch (error) {
                console.error("connectToEventStream - Failed to connect to game stream. " + error);
              }
            } else if (data.type === "challenge") {
            } else if (data.type === "gameFinish") {
            } else if (response.status >= 400) {
              console.warn("connectToEventStream - " + data.error);
            }
          } catch (error) {
            console.error("connectToEventStream - Unable to parse JSON or Unexpected error. " + error);
          }
        } else {
          if (verbose) console.log("*");
        }
      }
    }
    console.warn("connectToEventStream - Event Stream ended by server");
    eventSteamStatus = { connected: false, lastEvent: time.getTime() };
  }
  async function connectToGameStream(gameId) {
    if (verbose) console.log("connectToGameStream - About to call /api/board/game/stream/" + gameId);
    const response = await fetch("/api/board/game/stream/" + gameId, {
      headers: { Authorization: "Bearer " + token }
    });
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    while (reader) {
      const { value, done } = await reader.read();
      if (done) break;
      if (verbose && value.length > 1)
        console.log("connectToGameStream - board game stream received:", decoder.decode(value));
      gameConnectionMap.set(gameId, { connected: true, lastEvent: time.getTime() });
      const jsonArray = decoder.decode(value).split("\n");
      for (let i = 0; i < jsonArray.length; i++) {
        if (jsonArray[i].length > 2) {
          try {
            const data = JSON.parse(jsonArray[i]);
            if (data.type === "gameFull") {
              if (!verbose) console.clear();
              gameInfoMap.set(gameId, data);
              gameStateMap.set(gameId, data.state);
              initializeChessBoard(gameId, data);
              logGameState(gameId);
              chooseCurrentGame();
            } else if (data.type === "gameState") {
              if (!verbose) console.clear();
              updateChessBoard(gameId, gameStateMap.get(gameId), data);
              gameStateMap.set(gameId, data);
              if (gameId === currentGameId) {
                logGameState(gameId);
              } else {
                if (verbose) console.log("connectToGameStream - State received was not for current game.");
              }
            } else if (data.type === "chatLine") {
            } else if (response.status >= 400) {
              console.log("connectToGameStream - " + data.error);
            }
          } catch (error) {
            console.error("connectToGameStream - No valid game data or Unexpected error. " + error);
          }
        } else {
          if (verbose) console.log(":");
        }
      }
    }
    console.warn("connectToGameStream - Game " + gameId + " Stream ended.");
    gameConnectionMap.set(gameId, { connected: false, lastEvent: time.getTime() });
  }
  function formattedTimer(timer) {
    const pad = (n, z = 2) => `00${n}`.slice(-z);
    return pad(timer / 36e5 | 0) + ":" + pad(timer % 36e5 / 6e4 | 0) + ":" + pad(timer % 6e4 / 1e3 | 0);
  }
  async function lichessConnectionLoop() {
    for (let attempts = 0; attempts < 20; attempts++) {
      connectToEventStream();
      await sleep(5e3);
      do {
        await sleep(5e3);
        for (const [gameId, networkState] of gameConnectionMap) {
          if (!networkState.connected && gameStateMap.get(gameId).status === "started") {
            if (verbose)
              console.log(`Started game is disconnected. Attempting reconnection for gameId: ${gameId}`);
            connectToGameStream(gameId);
          }
        }
      } while (eventSteamStatus.connected);
      console.warn("No connection to event stream. Attempting re-connection. Attempt: " + attempts);
    }
    console.error(
      "No connection to event stream after maximum number of attempts 20. Reload page to start again."
    );
  }
  async function chooseCurrentGame() {
    const playableGames = playableGamesArray();
    if (playableGames.length === 0) {
      console.log(
        "No started playable games, challenges or games are disconnected. Please start a new game or fix connection."
      );
    } else {
      if (playableGames.length > 1) {
        console.warn(
          "Multiple active games detected. Current game will be selected based on board position."
        );
        console.table(playableGames);
      }
      for (let w = 0; w < 10; w++) {
        if (lastLiveChessBoard !== void 0) break;
        await sleep(1e3);
      }
      if (verbose) console.log(`LiveChess FEN:        ${lastLiveChessBoard}`);
      let index = -1;
      for (let i = 0; i < playableGames.length; i++) {
        const tmpFEN = fen_exports.makeBoardFen(gameChessBoardMap.get(playableGames[i].gameId).board);
        if (verbose) console.log(`GameId: ${playableGames[i].gameId} FEN: ${tmpFEN}`);
        if (tmpFEN === lastLiveChessBoard) {
          index = i;
        }
      }
      if (index === -1) {
        console.error("Position on board does not match any ongoing game.");
        if (gameStateMap.has(currentGameId) && gameConnectionMap.get(currentGameId).connected && gameStateMap.get(currentGameId).status === "started") {
          if (verbose)
            console.log(
              "chooseCurrentGame - Board will remain attached to current game. currentGameId: " + currentGameId
            );
        } else {
          console.warn("Fix position and reload or start a new game. Automatically retrying in 5 seconds...");
          await sleep(5e3);
          chooseCurrentGame();
        }
      } else {
        if (currentGameId !== playableGames[index].gameId) {
          if (verbose)
            console.log("chooseCurrentGame - Position matched to gameId: " + playableGames[index].gameId);
          currentGameId = playableGames[index].gameId;
          attachCurrentGameIdToDGTBoard();
          console.log("Active game updated. currentGameId: " + currentGameId);
        } else {
          if (verbose)
            console.log(
              "chooseCurrentGame - Board will remain attached to current game. currentGameId: " + currentGameId
            );
        }
      }
    }
  }
  function initializeChessBoard(gameId, data) {
    try {
      let initialFen = INITIAL_FEN;
      if (data.initialFen !== "startpos") initialFen = data.initialFen;
      const setup = parseFen(initialFen).unwrap();
      const chess = Chess.fromSetup(setup).unwrap();
      const moves = data.state.moves.split(" ");
      for (let i = 0; i < moves.length; i++) {
        if (moves[i] !== "") {
          const uciMove = parseUci(moves[i]);
          const normalizedMove = normalizeMove(chess, uciMove);
          if (normalizedMove && chess.isLegal(normalizedMove)) chess.play(normalizedMove);
        }
      }
      gameChessBoardMap.set(gameId, chess);
      if (verbose) console.log(`initializeChessBoard - New Board for gameId: ${gameId}`);
      if (verbose) console.log(board(chess.board));
      if (verbose) console.log(chess.turn + "'s turn");
    } catch (error) {
      console.error(`initializeChessBoard - Error: ${error}`);
    }
  }
  function updateChessBoard(gameId, currentState, newState) {
    try {
      const chess = gameChessBoardMap.get(gameId);
      if (chess) {
        let pendingMoves;
        if (!currentState.moves) {
          pendingMoves = newState.moves;
        } else {
          pendingMoves = newState.moves.substring(currentState.moves.length, newState.moves.length);
        }
        const moves = pendingMoves.split(" ");
        for (let i = 0; i < moves.length; i++) {
          if (moves[i] !== "") {
            const uciMove = parseUci(moves[i]);
            const normalizedMove = normalizeMove(chess, uciMove);
            if (normalizedMove && chess.isLegal(normalizedMove)) {
              if (chess.turn === "black")
                lastSanMove = {
                  player: "black",
                  move: makeSan(chess, normalizedMove),
                  by: gameInfoMap.get(currentGameId).black.id
                };
              else
                lastSanMove = {
                  player: "white",
                  move: makeSan(chess, normalizedMove),
                  by: gameInfoMap.get(currentGameId).white.id
                };
              chess.play(normalizedMove);
            }
          }
        }
        if (verbose) console.log(`updateChessBoard - Updated Board for gameId: ${gameId}`);
        if (verbose) console.log(board(chess.board));
        if (verbose) console.log(chess.turn + "'s turn");
      }
    } catch (error) {
      console.error(`updateChessBoard - Error: ${error}`);
    }
  }
  function attachCurrentGameIdToDGTBoard() {
    if (!verbose) consoleOutput.innerHTML = "";
    if (me.id === gameInfoMap.get(currentGameId).white.id) currentGameColor = "white";
    else currentGameColor = "black";
    sendBoardToLiveChess(gameChessBoardMap.get(currentGameId));
  }
  function playableGamesArray() {
    var _a, _b;
    const playableGames = [];
    const keys = Array.from(gameConnectionMap.keys());
    for (let i = 0; i < keys.length; i++) {
      if (((_a = gameConnectionMap.get(keys[i])) == null ? void 0 : _a.connected) && ((_b = gameStateMap.get(keys[i])) == null ? void 0 : _b.status) === "started") {
        const gameInfo = gameInfoMap.get(keys[i]);
        const lastMove = getLastUCIMove(keys[i]);
        const versus = gameInfo.black.id === me.id ? (gameInfo.white.title ? gameInfo.white.title : "@") + " " + gameInfo.white.name : (gameInfo.black.title ? gameInfo.black.title : "@") + " " + gameInfo.black.name;
        playableGames.push({
          gameId: gameInfo.id,
          versus,
          "vs rating": gameInfo.black.id === me.id ? gameInfo.white.rating : gameInfo.black.rating,
          "game rating": gameInfo.variant.short + " " + (gameInfo.rated ? "rated" : "unrated"),
          Timer: gameInfo.speed + " " + (gameInfo.clock ? String(gameInfo.clock.initial / 6e4) + "'+" + String(gameInfo.clock.increment / 1e3) + "''" : "\u221E"),
          "Last Move": lastMove.player + " " + lastMove.move + " by " + lastMove.by
        });
      }
    }
    return playableGames;
  }
  function logGameState(gameId) {
    if (gameStateMap.has(gameId) && gameInfoMap.has(gameId)) {
      const gameInfo = gameInfoMap.get(gameId);
      const gameState = gameStateMap.get(gameId);
      const lastMove = getLastUCIMove(gameId);
      console.log("");
      const innerTable = `<table class="dgt-table"><tr><th> - </th><th>Title</th><th>Username</th><th>Rating</th><th>Timer</th><th>Last Move</th><th>gameId: ${gameInfo.id}</th></tr><tr><td>White</td><td>${gameInfo.white.title ? gameInfo.white.title : "@"}</td><td>${gameInfo.white.name}</td><td>${gameInfo.white.rating}</td><td>${formattedTimer(gameState.wtime)}</td><td>${lastMove.player === "white" ? lastMove.move : "?"}</td><td>${gameInfo.speed + " " + (gameInfo.clock ? String(gameInfo.clock.initial / 6e4) + "'+" + String(gameInfo.clock.increment / 1e3) + "''" : "\u221E")}</td></tr><tr><td>Black</td><td>${gameInfo.black.title ? gameInfo.black.title : "@"}</td><td>${gameInfo.black.name}</td><td>${gameInfo.black.rating}</td><td>${formattedTimer(gameState.btime)}</td><td>${lastMove.player === "black" ? lastMove.move : "?"}</td><td>Status: ${gameState.status}</td></tr>`;
      console.log(innerTable);
      switch (gameState.status) {
        case "started":
          if (me.id !== lastMove.by || announceAllMoves) {
            announcePlay(lastMove);
          }
          break;
        case "outoftime":
          announceWinner(
            "flag",
            keywords[gameState.winner] + " " + keywords["wins by"] + " " + keywords["timeout"]
          );
          break;
        case "resign":
          announceWinner(
            "resign",
            keywords[gameState.winner] + " " + keywords["wins by"] + " " + keywords["resignation"]
          );
          break;
        case "mate":
          announceWinner("mate", keywords[lastMove.player] + " " + keywords["wins by"] + " " + keywords["#"]);
          break;
        case "draw":
          announceWinner("draw", keywords["(=)"]);
          break;
        default:
          console.log(`Unknown status received: ${gameState.status}`);
      }
    }
  }
  function getLastUCIMove(gameId) {
    if (gameStateMap.has(gameId) && gameInfoMap.has(gameId)) {
      const gameInfo = gameInfoMap.get(gameId);
      const gameState = gameStateMap.get(gameId);
      if (String(gameState.moves).length > 1) {
        const moves = gameState.moves.split(" ");
        if (verbose)
          console.log(
            `getLastUCIMove - ${moves.length} moves detected. Last one: ${moves[moves.length - 1]}`
          );
        if (moves.length % 2 === 0)
          return { player: "black", move: moves[moves.length - 1], by: gameInfo.black.id };
        else return { player: "white", move: moves[moves.length - 1], by: gameInfo.white.id };
      }
    }
    if (verbose) console.log("getLastUCIMove - No moves.");
    return { player: "none", move: "none", by: "none" };
  }
  function announcePlay(lastMove) {
    let moveText;
    if ((announceMoveFormat == null ? void 0 : announceMoveFormat.toLowerCase()) === "san" && lastSanMove) {
      moveText = lastSanMove.move;
      ttsSay(replaceKeywords(padBeforeNumbers(lastSanMove.move)));
    } else {
      moveText = lastMove.move;
      ttsSay(padBeforeNumbers(lastMove.move));
    }
    if (lastMove.player === "white") {
      console.log(`<span class="dgt-white-move">${moveText} by White</span>`);
    } else {
      console.log(`<span class="dgt-black-move">${moveText} by Black</span>`);
    }
  }
  function announceWinner(status, message) {
    console.log("  " + status + "  -  " + message);
    ttsSay(replaceKeywords(message.toLowerCase()));
  }
  function announceInvalidMove() {
    if (currentGameColor === "white") {
      console.warn("  [ X X ]  - Illegal move by white.");
    } else {
      console.warn("  [ X X ]  - Illegal move by black.");
    }
    ttsSay(replaceKeywords("illegal move"));
  }
  async function connectToLiveChess() {
    let SANMove;
    liveChessConnection = new WebSocket(liveChessURL ? liveChessURL : "ws://localhost:1982/api/v1.0");
    liveChessConnection.onopen = () => {
      isLiveChessConnected = true;
      if (verbose) console.info("Websocket onopen: Connection to LiveChess was successful");
      liveChessConnection.send('{"id":1,"call":"eboards"}');
    };
    liveChessConnection.onerror = () => {
      console.error("Websocket ERROR: ");
    };
    liveChessConnection.onclose = () => {
      console.error("Websocket to LiveChess disconnected");
      currentSerialnr = "0";
      isLiveChessConnected = false;
      DGTgameId = "";
    };
    liveChessConnection.onmessage = async (e) => {
      if (verbose) console.info("Websocket onmessage with data:" + e.data);
      const message = JSON.parse(e.data);
      if (message.response === "feed" && !!message.param.board) {
        lastLiveChessBoard = message.param.board;
      }
      if (message.response === "call" && message.id === 1) {
        boards = message.param;
        console.table(boards);
        if (verbose) console.info(boards[0].serialnr);
        currentSerialnr = boards[0].serialnr;
        subscription.param.param.serialnr = currentSerialnr;
        if (verbose)
          console.info("Websocket onmessage[call]: board serial number updated to: " + currentSerialnr);
        if (verbose)
          console.info("Webscoket - about to send the following message \n" + JSON.stringify(subscription));
        liveChessConnection.send(JSON.stringify(subscription));
        if (boards[0].state !== "ACTIVE" && boards[0].state !== "INACTIVE")
          console.error(`Board with serial ${currentSerialnr} is not properly connected. Please fix`);
        if (gameStateMap.has(currentGameId) && gameConnectionMap.get(currentGameId).connected && gameStateMap.get(currentGameId).status === "started") {
          if (currentGameId !== DGTgameId) {
            if (verbose) console.info("There is a game in progress, calling liveChessBoardSetUp...");
            sendBoardToLiveChess(gameChessBoardMap.get(currentGameId));
          }
        }
      } else if (message.response === "feed" && !!message.param.san) {
        if (verbose) console.info("onmessage - san: " + message.param.san);
        const lastMove = getLastUCIMove(currentGameId);
        if (message.param.san.length === 0) {
          if (verbose) console.info("onmessage - san is empty");
        } else if (lastLegalParam !== void 0 && JSON.stringify(lastLegalParam.san) === JSON.stringify(message.param.san)) {
          if (verbose)
            console.info("onmessage - Duplicate position and san move received and will be ignored");
        } else {
          let movesToProcess = 1;
          if (lastLegalParam !== void 0)
            movesToProcess = message.param.san.length - lastLegalParam.san.length;
          if (movesToProcess > 1) {
            if (verbose)
              console.warn(
                "onmessage - Multiple moves received on single message - movesToProcess: " + movesToProcess
              );
            if (localBoard.turn === currentGameColor) {
              const quarantinedlastLegalParam = lastLegalParam;
              await sleep(2500);
              if (JSON.stringify(lastLegalParam.san) !== JSON.stringify(quarantinedlastLegalParam.san)) {
                console.warn(
                  "onmessage - Invalid moved quarantined and not sent to lichess. Newer move interpretation received."
                );
                return;
              } else if (lastLegalParam !== void 0 && JSON.stringify(lastLegalParam.san) === JSON.stringify(message.param.san)) {
                if (verbose)
                  console.info(
                    "onmessage - Duplicate position and san move received after quarantine and will be ignored"
                  );
                return;
              }
            }
          }
          lastLegalParam = message.param;
          for (let i = movesToProcess; i > 0; i--) {
            SANMove = String(message.param.san[message.param.san.length - i]).trim();
            if (verbose) console.info("onmessage - SANMove = " + SANMove);
            const moveObject = parseSan(localBoard, SANMove);
            if (moveObject && localBoard.isLegal(moveObject)) {
              if (verbose) console.info("onmessage - Move is legal");
              if (localBoard.turn === currentGameColor) {
                if (verbose) console.info("onmessage - Valid Move played: " + SANMove);
                await validateAndSendBoardMove(moveObject);
                lastSanMove = { player: localBoard.turn, move: SANMove, by: me.id };
                localBoard.play(moveObject);
              } else if (compareMoves(lastMove.move, moveObject)) {
                if (verbose) console.info("onmessage - Valid Adjustment: " + SANMove);
                localBoard.play(moveObject);
              } else {
                console.error("onmessage - Invalid Adjustment was made");
                if (compareMoves(lastMove.move, moveObject)) {
                  console.error("onmessage - Played move has not been received by Lichess.");
                } else {
                  console.error("onmessage - Expected:" + lastMove.move + " by " + lastMove.player);
                  console.error("onmessage - Detected:" + makeUci(moveObject) + " by " + localBoard.turn);
                }
                announceInvalidMove();
                await sleep(1e3);
                announcePlay(lastMove);
              }
            } else {
              if (verbose) console.info("onmessage - Move is NOT legal");
              if (lastMove.move === SANMove) {
                if (verbose)
                  console.warn("onmessage - Move received is the same as the last move played: " + SANMove);
              } else if (SANMove.startsWith("O-")) {
                if (verbose)
                  console.warn("onmessage - Castling may be duplicated as the last move played: " + SANMove);
              } else {
                if (verbose)
                  console.error(
                    "onmessage - invalidMove - Position Mismatch between DGT Board and internal in-memory Board. SAN: " + SANMove
                  );
                announceInvalidMove();
                console.info(board(localBoard.board));
              }
            }
          }
        }
      } else if (message.response === "feed") {
        if (verbose) console.info("onmessage - No move received on feed event.");
      }
    };
  }
  async function DGTliveChessConnectionLoop() {
    connectToLiveChess();
    for (let attempts = 0; attempts < 20; attempts++) {
      do {
        await sleep(5e3);
      } while (currentSerialnr !== "0" && isLiveChessConnected);
      if (!isLiveChessConnected) {
        console.warn("No connection to DGT Live Chess. Attempting re-connection. Attempt: " + attempts);
        connectToLiveChess();
      } else {
        console.warn(
          "Connection to DGT Live Chess is Fine but no board is detected. Attempting re-connection. Attempt: " + attempts
        );
        liveChessConnection.send('{"id":1,"call":"eboards"}');
      }
    }
    console.error(
      "No connection to DGT Live Chess after maximum number of attempts (20). Reload page to start again."
    );
  }
  async function sendBoardToLiveChess(chess) {
    const fen = makeFen(chess.toSetup());
    const setupMessage = {
      id: 3,
      call: "call",
      param: {
        id: 1,
        method: "setup",
        param: {
          fen
        }
      }
    };
    if (verbose) console.log("setUp -: " + JSON.stringify(setupMessage));
    if (isLiveChessConnected && currentSerialnr !== "0") {
      liveChessConnection.send(JSON.stringify(setupMessage));
      DGTgameId = currentGameId;
      localBoard = chess.clone();
      lastLegalParam = { board: "", san: [] };
      if (verbose) console.log("setUp -: Sent.");
    } else {
      console.error("WebSocket is not open or is not ready to receive setup - cannot send setup command.");
      console.error(
        `isLiveChessConnected: ${isLiveChessConnected} - DGTgameId: ${DGTgameId} - currentSerialnr: ${currentSerialnr} - currentGameId: ${currentGameId}`
      );
    }
  }
  async function validateAndSendBoardMove(boardMove) {
    while (!(gameStateMap.has(currentGameId) && gameConnectionMap.get(currentGameId).connected && gameStateMap.get(currentGameId).status === "started")) {
      console.warn(
        "validateAndSendBoardMove - Cannot send move while disconnected. Re-Trying in 2 seconds..."
      );
      await sleep(2e3);
      await chooseCurrentGame();
    }
    const command = makeUci(boardMove);
    sendMove(currentGameId, command);
  }
  function sendMove(gameId, uciMove) {
    if (uciMove.length > 1) {
      const url = `/api/board/game/${gameId}/move/${uciMove}?offeringDraw=false`;
      if (verbose) console.log("sendMove - About to call " + url);
      fetch(url, {
        method: "POST",
        headers: { Authorization: "Bearer " + token }
      }).then((response) => {
        try {
          if (response.status === 200 || response.status === 201) {
            if (verbose) console.log("sendMove - Move successfully sent.");
          } else {
            response.json().then((errorJson) => {
              console.error("sendMove - Failed to send move. " + errorJson.error);
            });
          }
        } catch (error) {
          console.error("sendMove - Unexpected error. " + error);
        }
      }).catch((err) => {
        console.error("sendMove - Error. " + err.message);
      });
    }
  }
  function replaceKeywords(sanMove) {
    let extendedSanMove = sanMove;
    for (let i = 0; i < keywordsBase.length; i++) {
      try {
        extendedSanMove = extendedSanMove.replace(
          keywordsBase[i],
          " " + keywords[keywordsBase[i]].toLowerCase() + " "
        );
      } catch (error) {
        console.error(`raplaceKeywords - Error replacing keyword. ${keywordsBase[i]} . ${error}`);
      }
    }
    return extendedSanMove;
  }
  function padBeforeNumbers(moveString) {
    let paddedMoveString = "";
    for (const c of moveString) {
      if (Number.isInteger(Number(c))) {
        paddedMoveString += ` ${c} `;
      } else {
        paddedMoveString += c;
      }
    }
    return paddedMoveString;
  }
  async function ttsSay(text) {
    if (verbose) console.log("TTS - for text: " + text);
    if (!speechSynthesisOn) return;
    const utterThis = new SpeechSynthesisUtterance(text);
    const selectedOption = voice;
    const availableVoices = speechSynthesis.getVoices();
    for (let i = 0; i < availableVoices.length; i++) {
      if (availableVoices[i].name === selectedOption) {
        utterThis.voice = availableVoices[i];
        break;
      }
    }
    utterThis.rate = 0.6;
    speechSynthesis.speak(utterThis);
  }
  function startingPosition() {
    return Chess.fromSetup(defaultSetup()).unwrap();
  }
  function compareMoves(lastMove, moveObject) {
    try {
      const uciMove = makeUci(moveObject);
      if (verbose) console.log(`Comparing ${lastMove} with ${uciMove}`);
      if (lastMove === uciMove) {
        return true;
      }
      if (verbose) console.log("Moves look different. Check if this is a castling mismatch.");
      if (lastMove.length > 2 && castlingSide(localBoard, moveObject)) {
        if (lastMove.startsWith(uciMove.substring(0, 2))) {
          if (lastMove.startsWith("e1g1") || lastMove.startsWith("e1c1") || lastMove.startsWith("e8c8") || lastMove.startsWith("e8g8")) {
            return true;
          }
        }
      }
    } catch (err) {
      console.warn("compareMoves - " + err);
    }
    return false;
  }
  function start() {
    console.log("Lichess.org - DGT Electronic Board Connector");
  }
  start();
  getProfile();
  lichessConnectionLoop();
  DGTliveChessConnectionLoop();
}

// ../dgt/src/dgt.ts
function initModule(token) {
  if (token) {
    play_default(token);
  } else {
    config_default();
  }
}
export {
  initModule
};
//# sourceMappingURL=dgt.VHHIZTYF.js.map
