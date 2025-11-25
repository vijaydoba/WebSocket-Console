# WebSocket Console

Test and debug WebSocket endpoints directly from VS Code.

This extension provides a simple WebSocket console inside VS Code, so you can quickly connect to a server, send messages, inspect responses, and reuse common payloads.

---

## Features

- 🔌 **Connect to any WebSocket endpoint**
  - Supports `ws://` and `wss://` URLs.
- 💬 **Send and receive messages**
  - Console-style log with timestamps.
- 🧩 **JSON pretty-print**
  - If a message is valid JSON, it is automatically formatted with indentation.
- ⭐ **Message presets**
  - Save frequently used messages as presets.
  - Click a preset to quickly load it back into the input.
  - Presets are persisted between panel sessions.

---

## Getting Started

### Command

Open the WebSocket Console via the Command Palette:

1. Press `Ctrl+Shift+P` / `Cmd+Shift+P`.
2. Run: **WebSocket: Open WebSocket Console**.

This opens a panel with:

- WebSocket URL input
- Connect / Disconnect buttons
- Status display
- Message log
- Presets section
- Message input and Send button

---

## Usage

1. **Enter a WebSocket URL**

   Example:

   ```text
   ws://localhost:8080
   ```

   or

   ```text
   wss://your-server.example.com/socket
   ```

2. **Click `Connect`**

   - The status text will change (Connecting → Connected).
   - Connection events are logged in the console area.

3. **Send messages**

   - Type plain text or JSON in the message input.
   - Click **Send**.
   - Outgoing messages are logged as `>>`.
   - Incoming messages are logged as `<<`.
   - JSON payloads are pretty-printed automatically if possible.

4. **Use presets**

   - Type a message in the input.
   - Click **Save current as preset**.
   - A small button appears under “Presets”.
   - Click a preset button to load that message back into the input.

---

## Example: Local echo server (for testing)

You can spin up a simple local WebSocket echo server with Node.js:

```js
// server.js
const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8080 });

wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.on("message", (message) => {
    console.log("received:", message.toString());
    ws.send(message.toString()); // echo back
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

console.log("WebSocket server running on ws://localhost:8080");
```

Then:

```bash
npm init -y
npm install ws
node server.js
```

In VS Code:

- Open **WebSocket Console**
- URL: `ws://localhost:8080`
- Click **Connect**
- Send any message and see it echoed back.

---

## Requirements

- VS Code `1.80.0` or later.
- A reachable WebSocket server (local or remote) to connect to.

---

## Extension Settings

This extension currently does **not** add any custom settings.  
Future versions may provide configuration options for:

- Default URL
- Auto-reconnect behavior
- Log size / trimming

---

## Known Issues

- Some public WebSocket test servers may block connections from VS Code’s webview environment.
- Error details for WebSocket failures are limited by the browser/WebSocket API and may appear as generic errors.

If you run into issues, try testing with a local WebSocket server first.

---

## Release Notes

### 0.1.0

- Initial release.
- WebSocket console panel.
- JSON pretty-print for messages.
- Message presets with persistence.

---

## Contributing

Suggestions and contributions are welcome!

- Open an issue or pull request on the repository:
  - \`https://github.com/your-username/vscode-ws-console\` (replace with your actual repo URL)
