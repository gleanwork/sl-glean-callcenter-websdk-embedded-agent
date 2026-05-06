(function () {
  const DEFAULTS = {
    webAppUrl: "https://app.glean.com",
    backend: "",
    agentId: "",
  };

  const elements = {
    workspace: document.getElementById("workspace"),
    agentPanel: document.getElementById("agent-panel"),
    toggleAgent: document.getElementById("toggle-agent"),
    closeAgent: document.getElementById("close-agent"),
    configDialog: document.getElementById("config-dialog"),
    openConfig: document.getElementById("open-config"),
    configTriggers: document.querySelectorAll("[data-config-trigger]"),
    closeConfigButtons: document.querySelectorAll("#close-config, [data-close-config]"),
    chat: document.getElementById("glean-chat"),
    status: document.getElementById("chat-status"),
    form: document.getElementById("config-form"),
    webAppUrl: document.getElementById("web-app-url"),
    backend: document.getElementById("backend-url"),
    agentId: document.getElementById("agent-id"),
    transcript: document.getElementById("transcript"),
    sendTranscript: document.getElementById("send-transcript"),
    quickActions: document.querySelector(".quick-actions"),
  };

  let latestConfig = readConfig();
  let chatRendered = false;
  let lastConfigTrigger = null;

  function readConfig() {
    const params = new URLSearchParams(window.location.search);
    const stored = safeJsonParse(localStorage.getItem("glean-example-config")) || {};

    return {
      webAppUrl: params.get("webAppUrl") || stored.webAppUrl || DEFAULTS.webAppUrl,
      backend: params.get("backend") || stored.backend || DEFAULTS.backend,
      agentId: params.get("agentId") || stored.agentId || DEFAULTS.agentId,
    };
  }

  function writeConfig(config) {
    localStorage.setItem("glean-example-config", JSON.stringify(config));

    const url = new URL(window.location.href);
    setOrDeleteParam(url, "webAppUrl", config.webAppUrl === DEFAULTS.webAppUrl ? "" : config.webAppUrl);
    setOrDeleteParam(url, "backend", config.backend);
    setOrDeleteParam(url, "agentId", config.agentId);
    window.history.replaceState({}, "", url);
  }

  function setOrDeleteParam(url, key, value) {
    if (value) {
      url.searchParams.set(key, value);
    } else {
      url.searchParams.delete(key);
    }
  }

  function safeJsonParse(value) {
    try {
      return value ? JSON.parse(value) : null;
    } catch (_error) {
      return null;
    }
  }

  function updateForm(config) {
    elements.webAppUrl.value = config.webAppUrl;
    elements.backend.value = config.backend;
    elements.agentId.value = config.agentId;
  }

  function setStatus(message, type) {
    elements.status.textContent = message;
    elements.status.className = type === "error" ? "status-pill error" : "status-pill neutral";
  }

  function isAgentOpen() {
    return !elements.agentPanel.hidden;
  }

  function setAgentOpen(open, initialMessage) {
    elements.agentPanel.hidden = !open;
    elements.workspace.classList.toggle("agent-open", open);
    elements.toggleAgent.setAttribute("aria-expanded", String(open));

    if (open && (!chatRendered || initialMessage)) {
      renderChat(initialMessage);
    }
  }

  function openConfigDialog() {
    if (elements.configDialog.open) {
      return;
    }

    lastConfigTrigger = document.activeElement;
    updateForm(latestConfig);

    if (typeof elements.configDialog.showModal === "function") {
      elements.configDialog.showModal();
    } else {
      elements.configDialog.setAttribute("open", "");
    }

    elements.webAppUrl.focus();
  }

  function closeConfigDialog() {
    elements.configDialog.close();

    if (lastConfigTrigger && typeof lastConfigTrigger.focus === "function") {
      lastConfigTrigger.focus();
    }
  }

  function waitForGleanWebSDK() {
    if (window.GleanWebSDK) {
      return Promise.resolve(window.GleanWebSDK);
    }

    return new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        reject(new Error("Glean Web SDK did not load. Check the script URL and network access."));
      }, 10000);

      window.addEventListener(
        "glean:ready",
        () => {
          window.clearTimeout(timeout);
          resolve(window.GleanWebSDK);
        },
        { once: true },
      );
    });
  }

  function buildChatOptions(config, initialMessage) {
    const options = {
      webAppUrl: config.webAppUrl,
      enable3PCookieAccessRequest: true,
      externalSessionId: getSessionId(),
      source: "solutions-library-call-center-agent-assist",
      customizations: {
        features: {
          chatMenu: false,
          chatSettings: false,
          createPrompt: false,
          clearChat: true,
          feedback: true,
          applicationLibrary: false,
          promptLibrary: false,
        },
      },
    };

    if (config.backend) {
      options.backend = config.backend;
    }

    if (config.agentId) {
      options.agentId = config.agentId;
    }

    if (initialMessage) {
      options.initialMessage = initialMessage;
    }

    return options;
  }

  function getSessionId() {
    const key = "glean-example-session-id";
    let sessionId = sessionStorage.getItem(key);

    if (!sessionId) {
      sessionId = `session-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      sessionStorage.setItem(key, sessionId);
    }

    return sessionId;
  }

  async function renderChat(initialMessage) {
    setStatus("Loading", "neutral");
    elements.chat.innerHTML = '<div class="empty-state">Loading the embedded Glean Agent...</div>';

    try {
      const sdk = await waitForGleanWebSDK();
      elements.chat.innerHTML = "";
      sdk.renderChat(elements.chat, buildChatOptions(latestConfig, initialMessage));
      chatRendered = true;
      setStatus(latestConfig.agentId ? "Agent ready" : "Assistant ready", "neutral");
    } catch (error) {
      console.error(error);
      chatRendered = false;
      setStatus("Error", "error");
      elements.chat.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
    }
  }

  function sendMessageToChat(message) {
    if (!message) {
      return;
    }

    setAgentOpen(true, message);
  }

  function buildTranscriptPrompt() {
    const transcriptText = elements.transcript.innerText.trim();
    return [
      "You are embedded in a customer support workspace.",
      "Use the case details and call transcript below to help the support agent respond accurately.",
      "",
      "Case context:",
      "- Customer: Maya Johnson, enterprise account",
      "- Issue: contractors cannot access a shared workspace",
      "- Account note: renewal owner asked support to flag blockers within one business day",
      "",
      "Transcript:",
      transcriptText,
      "",
      "Please summarize the likely cause, recommend the next best action, and draft a short customer response.",
    ].join("\n");
  }

  function escapeHtml(value) {
    return value.replace(/[&<>"']/g, (char) => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };
      return entities[char];
    });
  }

  function bindEvents() {
    elements.toggleAgent.addEventListener("click", () => {
      setAgentOpen(!isAgentOpen());
    });

    elements.closeAgent.addEventListener("click", () => {
      setAgentOpen(false);
      elements.toggleAgent.focus();
    });

    elements.openConfig.addEventListener("click", openConfigDialog);
    elements.configTriggers.forEach((trigger) => {
      trigger.addEventListener("click", openConfigDialog);
    });

    elements.closeConfigButtons.forEach((button) => {
      button.addEventListener("click", closeConfigDialog);
    });

    elements.configDialog.addEventListener("click", (event) => {
      if (event.target === elements.configDialog) {
        closeConfigDialog();
      }
    });

    elements.form.addEventListener("submit", (event) => {
      event.preventDefault();
      latestConfig = {
        webAppUrl: elements.webAppUrl.value.trim() || DEFAULTS.webAppUrl,
        backend: elements.backend.value.trim(),
        agentId: elements.agentId.value.trim(),
      };
      writeConfig(latestConfig);
      chatRendered = false;
      closeConfigDialog();
      if (isAgentOpen()) {
        renderChat();
      }
    });

    elements.sendTranscript.addEventListener("click", () => {
      sendMessageToChat(buildTranscriptPrompt());
    });

    elements.quickActions.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-prompt]");
      if (!button) {
        return;
      }

      sendMessageToChat(button.dataset.prompt);
    });
  }

  updateForm(latestConfig);
  bindEvents();
  setAgentOpen(false);
})();
