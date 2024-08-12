import { WebSocketServer, WebSocket } from "ws";
import { v4 as uuidv4 } from "uuid";
import url from 'url';
import { IncomingMessage } from 'http';
import dotenv from 'dotenv';

dotenv.config();
const PORT = Number(process.env.PORT) || 8000;

// INTERFACE REPRESENTING CONNECTION DETAILS
interface ConnectionDetails {
    username: string | string[] | undefined;
    id: string;
}

// TYPE REPRESENTING THE CONNECTIONS AND MEMBERS 
type Connections = Record<string, WebSocket>;
type Members = Record<string, string | string[] | undefined>;

// ACTIVE CONNECTIONS AND MEMBERS
const connections: Connections = {};
const members: Members = {};

// BROADCAST
const broadcast = (message: string) => {
    Object.keys(connections).forEach((uuid) => {
        const connection = connections[uuid];
        try {
            connection.send(message);
        } catch (error) {
            console.error(`Error broadcasting:`, error);
        }
    });
};

// SEND TO SPECIFIC
const send = (from: string, to: string, message: string) => {
    const connection = connections[to];
    if (connection) {
        try {
            connection.send(`${members[from]}: ${message}`);
        } catch (error) {
            console.error(`Error sending message to ${to} from ${from}:`, error);
        }
    } else {
        console.log(`No connection found for UUID ${to}`);
    }
};

// WEBSOCKET SERVER
const wss = new WebSocketServer({ port: PORT }, () => {
    console.log("Server running on port:", PORT);
});

// HANDLE NEW CONNECTIONS
wss.on("connection", (connection: WebSocket, req: IncomingMessage) => {
    // GENERATE A UNIQUE IDENTIFIER (UUID) FOR THE CONNECTION
    const uuid = uuidv4();

    try {
        // EXTRACT THE USERNAME AND 'TO' PARAMETER FROM THE QUERY PARAMETERS IN THE REQUEST URL
        const { username } = url.parse(req.url || '', true).query;

        if (!username) {
            throw new Error("Username is required");
        }

        // STORE THE CONNECTION AND ITS ASSOCIATED USERNAME
        connections[uuid] = connection;
        members[uuid] = username;
        console.log('Members :', members);

        // SEND CONNECTION DETAILS TO THE CLIENT
        const connectionDetails: ConnectionDetails = { username, id: uuid };
        connection.send(JSON.stringify(connectionDetails));

    } catch (error) {
        console.error("Error in while connection:", error);
        // connection.close(1003, "Invalid connection setup");
        connection.send(JSON.stringify({error: "Invalid connection setup"}));
        return;
    }

    // HANDLE INCOMING MESSAGES
    connection.on("message", (data: string) => {
        try {
            const message = JSON.parse(data);
            const { type = "server", text, id } = message;

            if (!text) {
                throw new Error("Message text is required");
            }

            switch (type) {
                case "broadcast":
                    broadcast(text);
                    console.log(`${members[uuid]} - broadcast - ${text}`)
                    break;
                    
                    case "person":
                        if (!id) {
                            throw new Error("Receiver ID is required");
                        }
                        send(uuid, id, text);
                        console.log(`${members[uuid]} - dm( ${members[id]} ) - ${text}`)
                    break;

                case "server":
                    console.log(`${members[uuid]} - server - ${text}`);
                    break;

                default:
                    console.log("Unknown message type:", type);
                    break;
            }
        } catch (error) {
            console.error("Error handling message:", error);
            connection.send(JSON.stringify({ error: "Failed to process the message" }));
        }
    });

    // HANDLE CONNECTION CLOSE
    connection.on("close", () => {
        console.log(`Connection closed for ID: ${uuid}`);

        // REMOVE THE CONNECTION AND MEMBER
        delete connections[uuid];
        delete members[uuid];
    });

    // HANDLE ERRORS ON THE CONNECTION
    connection.on("error", (error) => {
        console.error(`Connection error for ID ${uuid}:`, error);
    });
});
