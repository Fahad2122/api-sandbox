"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const websocket_server_1 = require("./websocket-server");
const logger_1 = __importDefault(require("./logger"));
const config_1 = require("./config");
exports.app = (0, express_1.default)();
dotenv_1.default.config();
exports.app.use(express_1.default.json());
exports.app.use((0, cors_1.default)());
exports.app.post('/link-user', (req, res) => {
    try {
        const data = req.body;
        const decoded = websocket_server_1.websocketServerInstance.verifyToken(data.token);
        if (decoded) {
            if (decoded.gameId != (0, config_1.Config)().gameId) {
                logger_1.default.error("Invalid gameId in Link Token");
                throw "";
            }
            if (websocket_server_1.websocketServerInstance.playerExists(decoded.playerId)) {
                logger_1.default.warn("User already exits");
                throw "";
            }
            websocket_server_1.websocketServerInstance.linkUser(decoded.playerId);
        }
        else {
            logger_1.default.error("Invalid Link Token");
            throw "";
        }
    }
    catch (_e) { }
    return res.status(200).json({ msg: logger_1.default.lastMessage });
});
exports.app.post('/create-quickgame', (req, res) => {
    try {
        const data = req.body;
        if (data.teamsCount !== (0, config_1.Config)().teamsInMatch) {
            logger_1.default.error("Invalid number of teams for a single match");
            throw "";
        }
        if (websocket_server_1.websocketServerInstance.playersCount < (0, config_1.Config)().teamsInMatch * (0, config_1.Config)().playersInTeam) {
            logger_1.default.error("Insufficient number of players for a match");
            throw "";
        }
        if (data.teams) {
            if (data.teamsCount !== data.teams.length) {
                logger_1.default.error("Invalid number of provided teams");
                throw "";
            }
            let index = 0;
            let players = new Set();
            data.teams.forEach((team) => {
                if (team.players.length != (0, config_1.Config)().playersInTeam) {
                    logger_1.default.error("Invalid number of player in team:", index);
                    throw "";
                }
                team.players.forEach((player) => {
                    if (!websocket_server_1.websocketServerInstance.playerExists(player)) {
                        logger_1.default.error("Player not exists:", player);
                        throw "";
                    }
                    if (players.has(player)) {
                        logger_1.default.error("Player was used twice:", player);
                        throw "";
                    }
                    players.add(player);
                });
                index++;
            });
        }
        websocket_server_1.websocketServerInstance.createQuickgame(data.teamsCount, data.teams);
        logger_1.default.success("Successfully created Quikcgame");
    }
    catch (_e) { }
    return res.status(200).json({ msg: logger_1.default.lastMessage });
});
exports.app.post('/create-tournament', (req, res) => {
    try {
        const data = req.body;
        if (data.teamsCount < (0, config_1.Config)().teamsInMatch) {
            logger_1.default.error("Invalid number of teams for a tournament");
            throw "";
        }
        if (websocket_server_1.websocketServerInstance.playersCount < (0, config_1.Config)().teamsInMatch * (0, config_1.Config)().playersInTeam) {
            logger_1.default.error("Insufficient number of players for a tournament");
            throw "";
        }
        if (data.teams) {
            if (data.teamsCount !== data.teams.length) {
                logger_1.default.error("Invalid number of provided teams");
                throw "";
            }
            let index = 0;
            let players = new Set();
            data.teams.forEach((team) => {
                if (team.players.length != (0, config_1.Config)().playersInTeam) {
                    logger_1.default.error("Invalid number of player in team:", index);
                    throw "";
                }
                team.players.forEach((player) => {
                    if (!websocket_server_1.websocketServerInstance.playerExists(player)) {
                        logger_1.default.error("Player not exists:", player);
                        throw "";
                    }
                    if (players.has(player)) {
                        logger_1.default.error("Player was used twice:", player);
                        throw "";
                    }
                    players.add(player);
                });
                index++;
            });
        }
        websocket_server_1.websocketServerInstance.createTournament(data.teamsCount, data.teams);
        logger_1.default.success("Successfully created Tournament");
    }
    catch (_e) { }
    return res.status(200).json({ msg: logger_1.default.lastMessage });
});
exports.default = exports.app;
