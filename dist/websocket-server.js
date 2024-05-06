"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebsocketServer = exports.websocketServerInstance = void 0;
const socket_io_1 = require("socket.io");
const logger_1 = __importDefault(require("./logger"));
const config_1 = require("./config");
const utils_1 = require("./utils");
const dotenv_1 = __importDefault(require("dotenv"));
const keccak256 = require('keccak256');
dotenv_1.default.config();
const jwt = require("jsonwebtoken");
//@ts-ignore
exports.websocketServerInstance = undefined;
class WebsocketServer {
    constructor() {
        this.players = new Map(); // backendId => playerId
        this.games = new Map();
        this.playersCount = 0;
        this.sockets = new Map(); // gameId=> socket
        this.lastMatchId = 0;
        this.lastTournamentId = "0";
        const config = (0, config_1.Config)();
        config.linkedPlayers.forEach((playerId) => {
            this.linkUser(playerId);
        });
        exports.websocketServerInstance = this;
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const io = new socket_io_1.Server();
                io.use((socket, next) => {
                    const token = socket.handshake.auth.token;
                    const decoded = this.verifyToken(token);
                    if (!decoded) {
                        logger_1.default.error("Invalid authorization token signature, connection will be closed");
                        socket.disconnect(true);
                        const err = new Error("not authorized"); //@ts-ignore
                        err.data = { content: "Invalid authorization token signature" };
                        next(err);
                    }
                    if ((decoded === null || decoded === void 0 ? void 0 : decoded.gameId) !== (0, config_1.Config)().gameId) {
                        logger_1.default.error("Invalid gameId in authorization token, connection will be closed");
                        socket.disconnect(true);
                        const err = new Error("not authorized"); //@ts-ignore
                        err.data = { content: "Invalid gameId in authorization token" };
                        next(err);
                    }
                    next();
                });
                io.on("connection", (socket) => __awaiter(this, void 0, void 0, function* () {
                    const gameId = (0, config_1.Config)().gameId;
                    this.games.set(gameId, {
                        id: gameId,
                        syd: (0, config_1.Config)().syd,
                        matches: new Map(),
                        tournaments: new Map()
                    });
                    this.sockets.set(gameId, socket); //@ts-ignore
                    socket["gameId"] = gameId;
                    logger_1.default.success("Game connected:", gameId);
                    socket.on("disconnect", () => {
                        logger_1.default.warn("Game disconnected:", gameId);
                        this.sockets.delete(gameId);
                    });
                    socket.on("gameStarted", (data) => {
                        if (!this.checkMatchStart(data))
                            return;
                        logger_1.default.debug("Match started:", data.matchId, "at", data.timestamp);
                    });
                    socket.on("gameEnded", (data) => {
                        if (!this.checkMatchResult(data))
                            return;
                        logger_1.default.debug("Match ended:", data.matchId, "winners:", ...data.winners['0'].players);
                        this.processMatchResult(data);
                    });
                }));
                logger_1.default.debug("Socket server starts on PORT:", process.env.SOCKET_PORT);
                //@ts-ignore
                io.listen(process.env.SOCKET_PORT);
            });
        });
    }
    linkUser(playerId) {
        this.players.set(playerId, this.playersCount);
        this.playersCount += 1;
        logger_1.default.success("Player:", playerId, "linked to user:", this.playersCount - 1);
        return this.playersCount - 1;
    }
    createQuickgame(teamsCount, teams) {
        return __awaiter(this, void 0, void 0, function* () {
            const gameId = (0, config_1.Config)().gameId; //@ts-ignore
            const socket = this.sockets.get(gameId);
            if (!teams) {
                teams = [];
                const iter = this.players.keys();
                for (let i = 0; i < (0, config_1.Config)().teamsInMatch; i++) {
                    let players = [];
                    for (let j = 0; j < (0, config_1.Config)().playersInTeam; j++) {
                        players.push(iter.next().value);
                    }
                    teams.push({
                        players: players
                    });
                }
            }
            const match = {
                id: this.nextMatchId(),
                teams: teams
            }; //@ts-ignore
            this.games.get(gameId).matches.set(match.id, match);
            yield (0, utils_1.delay)((0, config_1.Config)().delayBeforeGames * 1000);
            socket.emit("startGame", {
                games: [
                    {
                        matchId: match.id,
                        rivals: match.teams
                    }
                ]
            });
            logger_1.default.debug("startGame event sent with matchId:", match.id);
        });
    }
    sendTournamentStage(tournamentId) {
        return __awaiter(this, void 0, void 0, function* () {
            const gameId = (0, config_1.Config)().gameId; //@ts-ignore
            const socket = this.sockets.get(gameId); //@ts-ignore
            const game = this.games.get(gameId); //@ts-ignore
            const tournament = game.tournaments.get(tournamentId);
            let matches = [];
            tournament.gamesInStageLeft = 0;
            if (tournament.nextStagePlayers.length == 1) {
                logger_1.default.success("Tournament ended:", tournamentId, "with winners:", ...tournament.nextStagePlayers[0].players);
                return;
            }
            while (tournament.nextStagePlayers.length >= (0, config_1.Config)().teamsInMatch) {
                const match = {
                    id: this.nextMatchId(),
                    tournamentId: tournamentId,
                    teams: tournament.nextStagePlayers.slice(0, (0, config_1.Config)().teamsInMatch)
                };
                matches.push(match);
                tournament.nextStagePlayers = tournament.nextStagePlayers.slice((0, config_1.Config)().teamsInMatch);
                tournament.gamesInStageLeft++;
                game.matches.set(match.id, match);
            }
            if (tournament.nextStagePlayers.length > 1) {
                const match = {
                    id: this.nextMatchId(),
                    tournamentId: tournamentId,
                    teams: tournament.nextStagePlayers
                };
                matches.push(match);
                tournament.nextStagePlayers = [];
                tournament.gamesInStageLeft++;
                game.matches.set(match.id, match);
            }
            yield (0, utils_1.delay)((0, config_1.Config)().delayBeforeGames * 1000);
            socket.emit("startGame", {
                games: matches.map((match) => {
                    return {
                        tournamentId: tournamentId,
                        matchId: match.id,
                        rivals: match.teams
                    };
                })
            });
            logger_1.default.debug("Started tournament stage with matchIds:", ...matches.map(match => match.id));
        });
    }
    createTournament(teamsCount, teams) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!teams) {
                teams = [];
                const iter = this.players.keys();
                for (let i = 0; i < teamsCount; i++) {
                    let players = [];
                    for (let j = 0; j < (0, config_1.Config)().playersInTeam; j++) {
                        players.push(iter.next().value);
                    }
                    teams.push({
                        players: players
                    });
                }
            }
            const tournament = {
                id: this.nextTournamentId(),
                gamesInStageLeft: 0,
                nextStagePlayers: teams,
            }; //@ts-ignore
            this.games.get((0, config_1.Config)().gameId).tournaments.set(tournament.id, tournament);
            this.sendTournamentStage(tournament.id);
        });
    }
    playerExists(playerId) {
        return this.players.has(playerId);
    }
    checkMatchStart(data) {
        if (!data) {
            logger_1.default.debug("Invalid start match event payload");
            return false;
        } //@ts-ignore
        if (!this.games.get((0, config_1.Config)().gameId).matches.has(data.matchId)) {
            logger_1.default.debug("Invalid matchId on GameStarted Event");
            return false;
        } //@ts-ignore
        this.games.get((0, config_1.Config)().gameId).matches.get(data.matchId).timestamp = data.timestamp;
        return true;
    }
    checkMatchResult(data) {
        try {
            const gameId = (0, config_1.Config)().gameId; //@ts-ignore
            const game = this.games.get(gameId);
            if (!game.matches.has(data.matchId)) {
                logger_1.default.error("Match not exists, matchId", data.matchId);
                return false;
            } //@ts-ignore
            const match = game.matches.get(data.matchId);
            if (match.tournamentId !== data.tournamentId) {
                logger_1.default.error("Tournament Id's not matches:", data.tournamentId, "~", match.tournamentId, "for match:", data.matchId);
                return false;
            }
            if (!match.timestamp) {
                logger_1.default.error("Match finishes before being started:", data.matchId);
                return false;
            }
            if (Object.keys(data.winners).length != match.teams.length) {
                logger_1.default.error("Winners length not matches initial rivals length for match: ", data.matchId);
                return false;
            }
            const usedPlayers = new Set();
            const unUsedTeams = new Set();
            match.teams.forEach((team) => {
                const set = new Set();
                team.players.forEach((playerId) => {
                    set.add(playerId);
                });
                unUsedTeams.add(set);
            });
            for (let i = 0; i < match.teams.length; i++) { //@ts-ignore
                const team = data.winners[i.toString()];
                if (team.players.length !== team.scores.length) {
                    logger_1.default.error("Players array and their score array not match in length for team:", i, "in match:", data.matchId);
                    return false;
                }
                const firstPlayer = team.players[0];
                let foundTeam = undefined;
                unUsedTeams.forEach((unPlayer) => {
                    if (foundTeam)
                        return;
                    if (unPlayer.has(firstPlayer)) {
                        foundTeam = unPlayer;
                    }
                });
                if (!foundTeam) {
                    logger_1.default.error("Failed to match teams for winner:", i, "in match:", match.id);
                    return false;
                }
                team.players.forEach((player) => {
                    if (usedPlayers.has(player)) {
                        logger_1.default.error("Player in the wrong team:", player, "in match:", match.id);
                        return false;
                    }
                    usedPlayers.add(player); //@ts-ignore
                    if (!foundTeam.has(player)) {
                        logger_1.default.error("Player mit in team:", player, "in match:", match.id);
                        return false;
                    }
                });
                unUsedTeams.delete(foundTeam);
            }
            return true;
        }
        catch (e) {
            logger_1.default.error("Failed to check match result with error:", e);
            return false;
        }
    }
    verifyToken(token) {
        try {
            return jwt.verify(token, (0, config_1.Config)().syd);
        }
        catch (e) {
            logger_1.default.error("Invalid signature");
            return undefined;
        }
    }
    nextMatchId() {
        this.lastMatchId = Math.round(Math.random() * 1000) + Math.round(Math.random() * 1000) % 1000000000000000000;
        return this.lastMatchId.toString();
    }
    nextTournamentId() {
        this.lastTournamentId = keccak256(this.lastTournamentId).toString('hex');
        return this.lastTournamentId;
    }
    processMatchResult(data) {
        if (data.tournamentId) { //@ts-ignore
            const tournament = this.games.get((0, config_1.Config)().gameId).tournaments.get(data.tournamentId);
            tournament.gamesInStageLeft--;
            tournament.nextStagePlayers.push(data.winners['0']);
            logger_1.default.success("Ended match:", data.matchId, "with winners:", ...data.winners['0'].players);
            if (tournament.gamesInStageLeft <= 0) {
                logger_1.default.success("Tournament stage ended for:", data.tournamentId);
                this.sendTournamentStage(data.tournamentId);
            }
        }
        else {
            logger_1.default.success("Ended match:", data.matchId, "with winners:", ...data.winners['0'].players);
        }
    }
}
exports.WebsocketServer = WebsocketServer;
new WebsocketServer();
