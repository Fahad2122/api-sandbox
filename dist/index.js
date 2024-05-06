"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const websocket_server_1 = require("./websocket-server");
const methods_1 = require("./methods");
methods_1.app.listen(process.env.APP_PORT, () => {
    console.log("Server listening at PORT:", process.env.APP_PORT);
    websocket_server_1.websocketServerInstance.start();
});
