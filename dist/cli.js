// @bun
// src/cli.tsx
import { effect as _$effect } from "@opentui/solid";
import { createComponent as _$createComponent } from "@opentui/solid";
import { createTextNode as _$createTextNode } from "@opentui/solid";
import { insertNode as _$insertNode } from "@opentui/solid";
import { insert as _$insert } from "@opentui/solid";
import { memo as _$memo } from "@opentui/solid";
import { setProp as _$setProp } from "@opentui/solid";
import { createElement as _$createElement } from "@opentui/solid";
import { MouseButton, TextAttributes } from "@opentui/core";
import { Plugin } from "@opencode/plugin/tui";
import { createEffect, createMemo, createSignal, For, onCleanup, Show } from "solid-js";
var PLUGIN_ID = "opencode-session-switch";
var SWITCH_GUARD_MS = 350;
var SESSION_FETCH_LIMIT = 30;
var RECENT_LIMIT = 8;
var SPINNER_FRAMES = ["\u280B", "\u2819", "\u2839", "\u2838", "\u283C", "\u2834", "\u2826", "\u2827", "\u2807", "\u280F"];
var SPINNER_INTERVAL_MS = 80;
function asRecord(value) {
  return value && typeof value === "object" ? value : undefined;
}
function toSessionView(value) {
  const session = asRecord(value);
  if (!session || typeof session.id !== "string")
    return;
  const parentID = session.parentID ?? session.parentId;
  if (typeof parentID === "string" && parentID.trim())
    return;
  const time = asRecord(session.time);
  const created = typeof time?.created === "number" ? time.created : 0;
  const updated = typeof time?.updated === "number" ? time.updated : created;
  if (typeof time?.archived === "number")
    return;
  const viewed = typeof time?.viewed === "number" ? time.viewed : 0;
  return {
    id: session.id,
    title: typeof session.title === "string" && session.title.trim() ? session.title.trim() : "Untitled session",
    updated: Math.max(updated, viewed)
  };
}
function orderSessions(sessions, tabs, currentID) {
  const byID = new Map(sessions.map((session) => [session.id, session]));
  const open = tabs.map((tab) => byID.get(tab.sessionID)).filter((session) => Boolean(session));
  const openIDs = new Set(open.map((session) => session.id));
  const recent = sessions.filter((session) => !openIDs.has(session.id)).sort((left, right) => right.updated - left.updated).slice(0, RECENT_LIMIT);
  const current = byID.get(currentID);
  if (current && !openIDs.has(currentID) && !recent.includes(current))
    recent.push(current);
  return [...open, ...recent];
}
function age(time) {
  const minutes = Math.floor((Date.now() - time) / 60000);
  if (minutes < 60)
    return `${Math.max(minutes, 1)}m`;
  if (minutes < 24 * 60)
    return `${Math.floor(minutes / 60)}h`;
  return `${Math.floor(minutes / (24 * 60))}d`;
}
function shortTitle(title) {
  return title.length > 26 ? `${title.slice(0, 25)}...` : title;
}
function clickPrimary(event) {
  if (event.button !== MouseButton.LEFT)
    return false;
  event.preventDefault();
  event.stopPropagation();
  return true;
}
function SidebarSessionSwitch(props) {
  const theme = props.context.theme;
  const [sessions, setSessions] = createSignal([]);
  const [loading, setLoading] = createSignal(true);
  const [expanded, setExpanded] = createSignal(true);
  const [switchingSessionID, setSwitchingSessionID] = createSignal();
  const [spinnerIndex, setSpinnerIndex] = createSignal(0);
  let refreshing;
  const directory = async () => props.context.data.session.get(props.sessionID)?.location.directory ?? (await props.context.client.session.get({
    sessionID: props.sessionID
  }).catch(() => {
    return;
  }))?.location.directory ?? props.context.location?.directory;
  const refresh = async () => {
    refreshing ??= directory().then((dir) => props.context.client.session.list({
      parentID: null,
      directory: dir,
      limit: SESSION_FETCH_LIMIT,
      order: "desc"
    })).then((result) => {
      setSessions(result.data.map(toSessionView).filter((session) => Boolean(session)));
    }).catch(() => {
      props.context.ui.toast.show({
        message: "Failed to load sessions",
        variant: "error",
        duration: 2500
      });
    }).finally(() => {
      refreshing = undefined;
      setLoading(false);
    });
    return refreshing;
  };
  const tabs = () => props.context.ui.tabs.enabled() ? props.context.ui.tabs.list() : [];
  const ordered = createMemo(() => orderSessions(sessions(), tabs(), props.sessionID));
  const isOpen = (sessionID) => tabs().some((tab) => tab.sessionID === sessionID);
  createEffect(() => {
    props.sessionID;
    refresh();
  });
  const stopCreated = props.context.data.on("session.created", () => void refresh());
  const stopRenamed = props.context.data.on("session.renamed", () => void refresh());
  const stopDeleted = props.context.data.on("session.deleted", () => void refresh());
  const stopIdle = props.context.data.on("session.idle", () => void refresh());
  const spinnerTimer = setInterval(() => setSpinnerIndex((index) => index + 1), SPINNER_INTERVAL_MS);
  const switchTimers = new Set;
  onCleanup(() => {
    clearInterval(spinnerTimer);
    switchTimers.forEach(clearTimeout);
    stopCreated();
    stopRenamed();
    stopDeleted();
    stopIdle();
  });
  const selectSession = (sessionID) => {
    if (switchingSessionID() || sessionID === props.sessionID)
      return;
    setSwitchingSessionID(sessionID);
    if (!props.context.ui.tabs.focus(sessionID))
      props.context.ui.router.navigate({
        type: "session",
        sessionID
      });
    const timer = setTimeout(() => {
      switchTimers.delete(timer);
      setSwitchingSessionID(undefined);
    }, SWITCH_GUARD_MS);
    switchTimers.add(timer);
  };
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
      if (clickPrimary(event))
        setExpanded((value) => !value);
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
              _$effect((_$p) => _$setProp(_el$8, "fg", theme.text.subdued, _$p));
              return _el$8;
            })();
          },
          get children() {
            return _$createComponent(Show, {
              get when() {
                return ordered().length > 0;
              },
              get fallback() {
                return (() => {
                  var _el$0 = _$createElement("text");
                  _$insertNode(_el$0, _$createTextNode(` No other recent sessions`));
                  _$effect((_$p) => _$setProp(_el$0, "fg", theme.text.subdued, _$p));
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
                    return ordered();
                  },
                  children: (session) => {
                    const running = () => props.context.data.session.status(session.id) === "running";
                    const current = () => session.id === props.sessionID;
                    return (() => {
                      var _el$10 = _$createElement("box"), _el$11 = _$createElement("text");
                      _$insertNode(_el$10, _el$11);
                      _$setProp(_el$10, "flexDirection", "row");
                      _$setProp(_el$10, "justifyContent", "space-between");
                      _$setProp(_el$10, "gap", 1);
                      _$setProp(_el$10, "onMouseUp", (event) => {
                        if (clickPrimary(event))
                          selectSession(session.id);
                      });
                      _$insert(_el$11, () => `  ${shortTitle(session.title)}`);
                      _$insert(_el$10, _$createComponent(Show, {
                        get when() {
                          return running();
                        },
                        get fallback() {
                          return (() => {
                            var _el$13 = _$createElement("text");
                            _$insert(_el$13, (() => {
                              var _c$ = _$memo(() => !!isOpen(session.id));
                              return () => _c$() ? "open" : age(session.updated);
                            })());
                            _$effect((_$p) => _$setProp(_el$13, "fg", theme.text.subdued, _$p));
                            return _el$13;
                          })();
                        },
                        get children() {
                          var _el$12 = _$createElement("text");
                          _$insert(_el$12, () => SPINNER_FRAMES[spinnerIndex() % SPINNER_FRAMES.length]);
                          _$effect((_$p) => _$setProp(_el$12, "fg", theme.text.subdued, _$p));
                          return _el$12;
                        }
                      }), null);
                      _$effect((_$p) => _$setProp(_el$11, "fg", current() || switchingSessionID() === session.id ? theme.text.action.primary.default : theme.text.default, _$p));
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
      var _v$ = theme.text.default, _v$2 = theme.text.default, _v$3 = TextAttributes.BOLD;
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
var cli_default = Plugin.define({
  id: PLUGIN_ID,
  setup(context) {
    return context.ui.slot({
      append: "sidebar.content",
      render: (props) => _$createComponent(SidebarSessionSwitch, {
        context,
        get sessionID() {
          return props.sessionID;
        }
      })
    });
  }
});
export {
  orderSessions,
  cli_default as default
};
