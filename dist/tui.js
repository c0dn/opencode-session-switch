// @bun
// src/tui.tsx
import { effect as _$effect } from "@opentui/solid";
import { createComponent as _$createComponent } from "@opentui/solid";
import { createTextNode as _$createTextNode } from "@opentui/solid";
import { insertNode as _$insertNode } from "@opentui/solid";
import { insert as _$insert } from "@opentui/solid";
import { memo as _$memo } from "@opentui/solid";
import { setProp as _$setProp } from "@opentui/solid";
import { createElement as _$createElement } from "@opentui/solid";
import { MouseButton, TextAttributes } from "@opentui/core";
import { createMemo, createSignal, For, onCleanup, Show } from "solid-js";
var PLUGIN_ID = "opencode-session-switch";
var SESSION_CACHE_TTL_MS = 1e4;
var SESSION_FETCH_TIMEOUT_MS = 5000;
var SESSION_LIST_LIMIT = 50;
var SWITCH_GUARD_MS = 350;
var SPINNER_FRAMES = ["\u280B", "\u2819", "\u2839", "\u2838", "\u283C", "\u2834", "\u2826", "\u2827", "\u2807", "\u280F"];
var SPINNER_INTERVAL_MS = 80;
var cachedSessions = [];
var cachedAt = 0;
var cacheDirty = true;
var refreshPromise;
function asRecord(value) {
  return value && typeof value === "object" ? value : undefined;
}
function numberValue(value) {
  return typeof value === "number" ? value : undefined;
}
function sessionArray(value) {
  if (Array.isArray(value)) {
    return value;
  }
  const result = asRecord(value);
  if (!result || result.error) {
    return;
  }
  if (Array.isArray(result.data)) {
    return result.data;
  }
  const data = asRecord(result.data);
  if (Array.isArray(data?.sessions)) {
    return data.sessions;
  }
  if (Array.isArray(data?.items)) {
    return data.items;
  }
  return;
}
function withTimeout(promise, timeoutMs) {
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve(undefined), timeoutMs);
  });
  promise.then(() => timer && clearTimeout(timer), () => timer && clearTimeout(timer));
  return Promise.race([promise, timeout]);
}
function toSessionView(value) {
  const session = asRecord(value);
  if (!session || typeof session.id !== "string") {
    return;
  }
  const parentID = session.parentID ?? session.parentId;
  if (typeof parentID === "string" && parentID.trim()) {
    return;
  }
  const time = asRecord(session.time);
  const created = numberValue(time?.created) ?? numberValue(session.created) ?? 0;
  const updated = numberValue(time?.updated) ?? numberValue(session.updated) ?? created;
  const title = typeof session.title === "string" && session.title.trim() ? session.title.trim() : "Untitled session";
  return {
    id: session.id,
    title,
    created,
    updated,
    current: false
  };
}
function shortTitle(title) {
  return title.length > 26 ? `${title.slice(0, 25)}...` : title;
}
function sortSessions(left, right) {
  const title = left.title.localeCompare(right.title, undefined, {
    sensitivity: "base"
  });
  if (title !== 0) {
    return title;
  }
  return left.id.localeCompare(right.id);
}
function getSessionStatus(api, sessionID) {
  const status = api.state.session.status(sessionID);
  if (status?.type === "busy") {
    return "busy";
  }
  if (status?.type === "retry") {
    return "retry";
  }
  return "idle";
}
function spinnerFrame(index) {
  return SPINNER_FRAMES[index % SPINNER_FRAMES.length] ?? SPINNER_FRAMES[0];
}
function withCurrentSession(sessions, currentSessionID) {
  return sessions.map((session) => ({
    ...session,
    current: session.id === currentSessionID
  }));
}
async function fetchRecentSessions(api) {
  let result;
  try {
    result = await withTimeout(api.client.session.list({
      roots: true,
      limit: SESSION_LIST_LIMIT
    }), SESSION_FETCH_TIMEOUT_MS);
  } catch {
    return cachedSessions;
  }
  const data = sessionArray(result);
  if (!data) {
    return cachedSessions;
  }
  cachedSessions = data.map(toSessionView).filter((session) => Boolean(session)).sort(sortSessions);
  cachedAt = Date.now();
  cacheDirty = false;
  return cachedSessions;
}
function getCachedSessions(currentSessionID) {
  return withCurrentSession(cachedSessions, currentSessionID);
}
function shouldRefreshSessions() {
  return cacheDirty || cachedSessions.length === 0 || Date.now() - cachedAt > SESSION_CACHE_TTL_MS;
}
async function refreshRecentSessions(api, currentSessionID) {
  refreshPromise ??= fetchRecentSessions(api).finally(() => {
    refreshPromise = undefined;
  });
  return withCurrentSession(await refreshPromise, currentSessionID);
}
function clickPrimary(event) {
  if (event.button !== MouseButton.LEFT) {
    return false;
  }
  event.preventDefault();
  event.stopPropagation();
  return true;
}
function switchSession(api, sessionID) {
  try {
    api.route.navigate("session", {
      sessionID
    });
  } catch {
    api.ui.toast({
      message: "Failed to switch session",
      variant: "error",
      duration: 2500
    });
  }
}
function SidebarSessionSwitch(props) {
  const theme = props.api.theme.current;
  const [sessions, setSessions] = createSignal(getCachedSessions(props.sessionID));
  const [loading, setLoading] = createSignal(cachedSessions.length === 0);
  const [expanded, setExpanded] = createSignal(true);
  const [switchingSessionID, setSwitchingSessionID] = createSignal();
  const [spinnerIndex, setSpinnerIndex] = createSignal(0);
  const visibleSessions = createMemo(() => withCurrentSession(sessions(), props.sessionID));
  const refresh = async (force = false) => {
    if (!force && !shouldRefreshSessions()) {
      setSessions(getCachedSessions(props.sessionID));
      setLoading(false);
      return;
    }
    setLoading(cachedSessions.length === 0);
    try {
      setSessions(await refreshRecentSessions(props.api, props.sessionID));
    } catch {
      setSessions(getCachedSessions(props.sessionID));
    } finally {
      setLoading(false);
    }
  };
  const selectSession = (sessionID) => {
    if (switchingSessionID() || sessionID === props.sessionID) {
      return;
    }
    setSwitchingSessionID(sessionID);
    switchSession(props.api, sessionID);
    setTimeout(() => setSwitchingSessionID(undefined), SWITCH_GUARD_MS);
  };
  refresh();
  const spinnerTimer = setInterval(() => {
    setSpinnerIndex((index) => index + 1);
  }, SPINNER_INTERVAL_MS);
  const sessionEvents = ["session.created", "session.updated", "session.deleted"];
  const disposers = sessionEvents.map((event) => props.api.event.on(event, () => {
    cacheDirty = true;
    refresh(true);
  }));
  onCleanup(() => {
    clearInterval(spinnerTimer);
    disposers.forEach((dispose) => dispose());
  });
  return (() => {
    var _el$ = _$createElement("box"), _el$2 = _$createElement("box"), _el$3 = _$createElement("text"), _el$4 = _$createElement("text");
    _$insertNode(_el$, _el$2);
    _$setProp(_el$, "flexDirection", "column");
    _$setProp(_el$, "gap", 0);
    _$setProp(_el$, "paddingTop", 1);
    _$setProp(_el$, "paddingBottom", 1);
    _$insertNode(_el$2, _el$3);
    _$insertNode(_el$2, _el$4);
    _$setProp(_el$2, "flexDirection", "row");
    _$setProp(_el$2, "gap", 1);
    _$setProp(_el$2, "alignItems", "center");
    _$setProp(_el$2, "onMouseUp", (event) => {
      if (clickPrimary(event)) {
        setExpanded((value) => !value);
      }
    });
    _$insert(_el$3, () => expanded() ? "\u25BC" : "\u25B6");
    _$insertNode(_el$4, _$createTextNode(`Sessions`));
    _$insert(_el$, _$createComponent(Show, {
      get when() {
        return expanded();
      },
      get children() {
        return _$createComponent(Show, {
          get when() {
            return !loading();
          },
          get fallback() {
            return (() => {
              var _el$8 = _$createElement("text");
              _$insertNode(_el$8, _$createTextNode(` Loading sessions...`));
              _$effect((_$p) => _$setProp(_el$8, "fg", theme.textMuted, _$p));
              return _el$8;
            })();
          },
          get children() {
            return _$createComponent(Show, {
              get when() {
                return visibleSessions().length > 0;
              },
              get fallback() {
                return (() => {
                  var _el$0 = _$createElement("text");
                  _$insertNode(_el$0, _$createTextNode(` No other recent sessions`));
                  _$effect((_$p) => _$setProp(_el$0, "fg", theme.textMuted, _$p));
                  return _el$0;
                })();
              },
              get children() {
                var _el$6 = _$createElement("scrollbox"), _el$7 = _$createElement("box");
                _$insertNode(_el$6, _el$7);
                _$setProp(_el$6, "maxHeight", 12);
                _$setProp(_el$7, "flexDirection", "column");
                _$setProp(_el$7, "gap", 0);
                _$insert(_el$7, _$createComponent(For, {
                  get each() {
                    return visibleSessions();
                  },
                  children: (session) => {
                    const status = () => getSessionStatus(props.api, session.id);
                    return (() => {
                      var _el$10 = _$createElement("box"), _el$11 = _$createElement("text");
                      _$insertNode(_el$10, _el$11);
                      _$setProp(_el$10, "flexDirection", "row");
                      _$setProp(_el$10, "gap", 1);
                      _$setProp(_el$10, "onMouseUp", (event) => {
                        if (clickPrimary(event)) {
                          selectSession(session.id);
                        }
                      });
                      _$insert(_el$11, () => `  ${shortTitle(session.title)}`);
                      _$insert(_el$10, _$createComponent(Show, {
                        get when() {
                          return status() === "busy";
                        },
                        get fallback() {
                          return _$createComponent(Show, {
                            get when() {
                              return status() === "retry";
                            },
                            get children() {
                              var _el$13 = _$createElement("text");
                              _$insertNode(_el$13, _$createTextNode(`retry`));
                              _$effect((_$p) => _$setProp(_el$13, "fg", theme.warning, _$p));
                              return _el$13;
                            }
                          });
                        },
                        get children() {
                          var _el$12 = _$createElement("text");
                          _$insert(_el$12, () => spinnerFrame(spinnerIndex()));
                          _$effect((_$p) => _$setProp(_el$12, "fg", theme.textMuted, _$p));
                          return _el$12;
                        }
                      }), null);
                      _$effect((_$p) => _$setProp(_el$11, "fg", session.current || switchingSessionID() === session.id ? theme.primary : theme.text, _$p));
                      return _el$10;
                    })();
                  }
                }));
                return _el$6;
              }
            });
          }
        });
      }
    }), null);
    _$effect((_p$) => {
      var { text: _v$, text: _v$2 } = theme, _v$3 = TextAttributes.BOLD;
      _v$ !== _p$.e && (_p$.e = _$setProp(_el$3, "fg", _v$, _p$.e));
      _v$2 !== _p$.t && (_p$.t = _$setProp(_el$4, "fg", _v$2, _p$.t));
      _v$3 !== _p$.a && (_p$.a = _$setProp(_el$4, "attributes", _v$3, _p$.a));
      return _p$;
    }, {
      e: undefined,
      t: undefined,
      a: undefined
    });
    return _el$;
  })();
}
var tui = async (api) => {
  api.slots.register({
    order: 175,
    slots: {
      sidebar_content(_ctx, props) {
        return _$createComponent(SidebarSessionSwitch, {
          api,
          get sessionID() {
            return props.session_id;
          }
        });
      }
    }
  });
};
var plugin = {
  id: PLUGIN_ID,
  tui
};
var tui_default = plugin;
export {
  tui_default as default
};
