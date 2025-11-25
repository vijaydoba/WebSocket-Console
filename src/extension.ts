import * as vscode from "vscode";

/**
 * This function is called when your extension is activated.
 */
export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand("wsConsole.open", () => {
    WebSocketPanel.createOrShow(context.extensionUri);
  });

  context.subscriptions.push(disposable);
}

/**
 * This function is called when your extension is deactivated.
 */
export function deactivate() {}

/**
 * WebSocketPanel manages the WebView for the WebSocket console.
 */
class WebSocketPanel {
  public static currentPanel: WebSocketPanel | undefined;
  public static readonly viewType = "wsConsole";

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor?.viewColumn ?? vscode.ViewColumn.One;
  
    const panel = vscode.window.createWebviewPanel(
      WebSocketPanel.viewType,
      "WebSocket Console",
      column,
      {
        enableScripts: true
      }
    );
  
    WebSocketPanel.currentPanel = new WebSocketPanel(panel, extensionUri);
  }


  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    // Set HTML content
    this._panel.webview.html = this._getHtmlForWebview(this._panel.webview);

    // Handle panel disposal
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Handle messages from the webview (if needed later)
    this._panel.webview.onDidReceiveMessage(
      (message) => {
        switch (message.type) {
          case "info":
            vscode.window.showInformationMessage(message.text);
            break;
          case "error":
            vscode.window.showErrorMessage(message.text);
            break;
        }
      },
      null,
      this._disposables
    );
  }

  public dispose() {
    WebSocketPanel.currentPanel = undefined;

    // Clean up
    this._panel.dispose();

    while (this._disposables.length) {
      const d = this._disposables.pop();
      if (d) {
        d.dispose();
      }
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const nonce = getNonce();

    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta
    http-equiv="Content-Security-Policy"
    content="default-src 'none'; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}'; style-src ${webview.cspSource} 'unsafe-inline'; connect-src ws: wss: https:;"
  />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>WebSocket Console</title>
  <style>
    body {
      font-family: sans-serif;
      margin: 0;
      padding: 10px;
    }
    h1 {
      font-size: 18px;
      margin-bottom: 8px;
    }
    .row {
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
    }
    input[type="text"] {
      flex: 1;
      padding: 4px 6px;
      font-size: 13px;
    }
    button {
      padding: 4px 8px;
      font-size: 13px;
      cursor: pointer;
    }
    #log {
      width: 100%;
      height: 240px;
      font-family: monospace;
      font-size: 12px;
      padding: 4px;
      box-sizing: border-box;
      border: 1px solid #555;
      background: #111;
      color: #eee;
      white-space: pre-wrap;
      overflow-y: auto;
    }
    .status {
      font-size: 12px;
      margin-bottom: 8px;
    }
    .status span {
      font-weight: bold;
    }
  </style>
</head>

<body>
  <h1>WebSocket Console</h1>

  <div class="row">
    <input id="url" type="text" placeholder="wss://example.com/socket" />
    <button id="connectBtn">Connect</button>
    <button id="disconnectBtn" disabled>Disconnect</button>
  </div>

  <div class="status">
    Status: <span id="statusText">Disconnected</span>
  </div>

   <textarea id="log" readonly></textarea>

  <!-- NEW: Presets / History section -->
  <div style="margin-top: 8px;">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
      <span style="font-size:12px; font-weight:bold;">Presets</span>
      <button id="savePresetBtn" style="font-size:11px; padding:2px 6px;">Save current as preset</button>
    </div>
    <div id="presets" style="display:flex; flex-wrap:wrap; gap:4px; min-height:22px; font-size:11px;">
      <!-- preset buttons rendered here -->
    </div>
  </div>

  <div class="row" style="margin-top: 8px;">
    <input id="messageInput" type="text" placeholder='{"type":"ping"} or plain text' />
    <button id="sendBtn" disabled>Send</button>
  </div>


      <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();

    let socket = null;
    let presets = [];

    const urlInput = document.getElementById("url");
    const connectBtn = document.getElementById("connectBtn");
    const disconnectBtn = document.getElementById("disconnectBtn");
    const logEl = document.getElementById("log");
    const statusText = document.getElementById("statusText");
    const messageInput = document.getElementById("messageInput");
    const sendBtn = document.getElementById("sendBtn");
    const presetsContainer = document.getElementById("presets");
    const savePresetBtn = document.getElementById("savePresetBtn");

    function log(message) {
      const time = new Date().toLocaleTimeString();
      logEl.textContent += "[" + time + "] " + message + "\\n";
      logEl.scrollTop = logEl.scrollHeight;
    }

    function setStatus(text) {
      statusText.textContent = text;
    }

    // Pretty-print JSON if possible
    function formatData(data) {
      try {
        const obj = JSON.parse(data);
        return JSON.stringify(obj, null, 2);
      } catch {
        return data;
      }
    }

    // ------ PRESETS / HISTORY ------

    function loadState() {
      const state = vscode.getState();
      if (state && Array.isArray(state.presets)) {
        presets = state.presets;
      }
      renderPresets();
    }

    function saveState() {
      vscode.setState({ presets });
    }

    function renderPresets() {
      presetsContainer.innerHTML = "";
      if (!presets.length) {
        presetsContainer.textContent = "No presets saved yet.";
        return;
      }
      presets.forEach((msg, index) => {
        const btn = document.createElement("button");
        const label = msg.length > 24 ? msg.slice(0, 21) + "..." : msg;
        btn.textContent = label || "(empty)";
        btn.title = msg;
        btn.style.fontSize = "11px";
        btn.style.padding = "2px 6px";
        btn.addEventListener("click", () => {
          messageInput.value = msg;
          messageInput.focus();
        });
        presetsContainer.appendChild(btn);
      });
    }

    savePresetBtn.addEventListener("click", () => {
      const value = messageInput.value.trim();
      if (!value) {
        vscode.postMessage({ type: "error", text: "Cannot save an empty preset." });
        return;
      }
      // avoid duplicates
      if (!presets.includes(value)) {
        presets.unshift(value);
        // keep at most 10 presets
        presets = presets.slice(0, 10);
        saveState();
        renderPresets();
        vscode.postMessage({ type: "info", text: "Preset saved." });
      }
    });

    // ------ WEBSOCKET LOGIC ------

    connectBtn.addEventListener("click", () => {
      const url = urlInput.value.trim();
      if (!url) {
        vscode.postMessage({ type: "error", text: "Please enter a WebSocket URL." });
        return;
      }

      try {
        socket = new WebSocket(url);

        setStatus("Connecting...");
        log("Connecting to " + url + " ...");
        connectBtn.disabled = true;
        disconnectBtn.disabled = false;
        sendBtn.disabled = true;

        socket.onopen = () => {
          setStatus("Connected");
          log("Connected.");
          sendBtn.disabled = false;
        };

        socket.onmessage = (event) => {
          log("<< " + formatData(event.data));
        };

        socket.onerror = (event) => {
          setStatus("Error");
          log("ERROR: " + JSON.stringify({ isTrusted: event.isTrusted }));
          vscode.postMessage({ type: "error", text: "WebSocket error occurred. Check the log." });
        };

        socket.onclose = () => {
          setStatus("Disconnected");
          log("Disconnected.");
          connectBtn.disabled = false;
          disconnectBtn.disabled = true;
          sendBtn.disabled = true;
        };
      } catch (err) {
        vscode.postMessage({ type: "error", text: String(err) });
        setStatus("Error");
        connectBtn.disabled = false;
        disconnectBtn.disabled = true;
        sendBtn.disabled = true;
      }
    });

    disconnectBtn.addEventListener("click", () => {
      if (socket) {
        socket.close();
        socket = null;
      }
    });

    sendBtn.addEventListener("click", () => {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        vscode.postMessage({ type: "error", text: "Socket is not connected." });
        return;
      }
      const message = messageInput.value;
      if (!message) return;
      socket.send(message);
      log(">> " + formatData(message));
      messageInput.value = "";
    });

    // Init presets from saved state
    loadState();
  </script>


</body>
</html>`;
  }
}

/**
 * Generates a random nonce for the Content-Security-Policy.
 */
function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
