// The staff pages (/staff, /staff/setup, /staff/team, /staff/mod): signing in, setting one's password with the link
// Kira DMs, signing out, and the dashboard switch. Each dashboard's content is its own module, loaded when opened.
// The session is an HttpOnly cookie this script never sees; the API says who is signed in (GET me).
import { setUpTheme, setUpMenu } from "./chrome.js";
import { api, setCsrf, escape, placePill } from "./staff-api.js";

const NAMES = { team: "Team", mod: "Moderation" };
const TITLES = { team: "Team dashboard", mod: "Moderation dashboard" };
const LOADERS = {
  team: () => import("./staff-team.js"),
  mod: () => import("./staff-mod.js"),
};

const $ = (sel) => document.querySelector(sel);
const show = (sel) => {
  for (const s of ["[data-staff-login]", "[data-staff-setup]", "[data-staff-app]"]) $(s).hidden = s !== sel;
};
const message = (text) => {
  const m = $("[data-staff-message]");
  m.textContent = text || "";
  m.hidden = !text;
};
const where = () => location.pathname.replace(/\/+$/, "").split("/")[2] || "";

function busy(form, on, text = "") {
  form.querySelector("button[type=submit]").disabled = on;
  form.querySelector("[data-status]").textContent = text;
}

async function me() {
  try {
    const who = await api("GET", "me");
    setCsrf(who.csrf);
    return who;
  } catch (e) {
    if (e.status === 401) return null;
    throw e;
  }
}

function login() {
  show("[data-staff-login]");
  $("[data-staff-title]").textContent = "Staff dashboards";
  $("[data-login-form] input[name=username]").focus();
}

async function open(who) {
  const page = where();
  if (!NAMES[page]) return location.replace(`/staff/${who.dashboards[0]}`);
  show("[data-staff-app]");
  $("[data-who]").textContent = `Signed in as ${who.name}`;
  const nav = $("[data-dashboards]");
  nav.innerHTML = `<span class="tab-pill" aria-hidden="true"></span>` + who.dashboards.map((d) => `<a href="/staff/${d}"${d === page ? ' aria-current="page"' : ""}>${escape(NAMES[d])}</a>`).join("");
  nav.hidden = who.dashboards.length < 2;
  requestAnimationFrame(() => placePill(nav));
  $("[data-staff-kicker]").textContent = NAMES[page];
  $("[data-staff-title]").textContent = TITLES[page];
  document.title = `${TITLES[page]} · Horizon`;
  const content = $("[data-staff-content]");
  if (!who.dashboards.includes(page)) {
    content.innerHTML = `<p class="lede">This dashboard is for the ${page === "team" ? "🌌 Horizon Team" : "🛡️ Mods"}. ${who.dashboards.map((d) => `<a href="/staff/${d}">Open the ${escape(NAMES[d])} dashboard</a>`).join(" or ")}.</p>`;
    return;
  }
  const load = LOADERS[page];
  if (!load) {
    content.innerHTML = `<p class="lede">You are signed in. This dashboard's content comes in the next update.</p>`;
    return;
  }
  const mod = await load();
  await mod.render(content, who);
}

async function route() {
  message("");
  try {
    if (where() === "setup") return setup();
    const who = await me();
    if (!who) return login();
    await open(who);
  } catch (e) {
    show(null);
    message(e.message);
  }
}

async function setup() {
  show("[data-staff-setup]");
  $("[data-staff-title]").textContent = "Your staff password";
  // The token is the link's #fragment: never sent to a server in a URL, and taken out of the address bar at once.
  const token = sessionStorage.getItem("staff:setup") || location.hash.slice(1);
  if (location.hash) {
    sessionStorage.setItem("staff:setup", location.hash.slice(1));
    history.replaceState(null, "", "/staff/setup");
  }
  const who = $("[data-setup-who]");
  const form = $("[data-setup-form]");
  try {
    if (!token) throw new Error("This page needs the link Kira DMs you. Run /staff password on Discord to get one.");
    const link = await api("POST", "setup/peek", { token });
    who.innerHTML = `For <strong>${escape(link.name)}</strong>: the link works once and expires ${escape(new Date(link.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))}.`;
    form.username.value = link.name;
    form.hidden = false;
    form.password.focus();
  } catch (e) {
    sessionStorage.removeItem("staff:setup");
    who.textContent = e.message;
  }
  form.onsubmit = async (event) => {
    event.preventDefault();
    if (form.password.value !== form.again.value) return busy(form, false, "The two passwords differ.");
    busy(form, true, "Saving…");
    try {
      const signed = await api("POST", "setup", { token, password: form.password.value });
      sessionStorage.removeItem("staff:setup");
      setCsrf(signed.csrf);
      form.reset();
      location.replace(`/staff/${signed.dashboards[0]}`);
    } catch (e) {
      busy(form, false, e.message);
    }
  };
}

function setUpForms() {
  const form = $("[data-login-form]");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    busy(form, true, "Signing in…");
    try {
      const who = await api("POST", "login", { name: form.elements.username.value, password: form.password.value });
      setCsrf(who.csrf);
      form.reset();
      busy(form, false);
      if (!NAMES[where()]) return location.replace(`/staff/${who.dashboards[0]}`);
      await open(who);
    } catch (e) {
      busy(form, false, e.message);
      form.password.select();
    }
  });
  const out = (all) => async () => {
    try {
      await api("POST", all ? "logout-all" : "logout");
    } catch {}
    setCsrf("");
    $("[data-staff-content]").innerHTML = "";
    message(all ? "Signed out on every device." : "Signed out.");
    login();
  };
  $("[data-logout]").addEventListener("click", out(false));
  $("[data-logout-all]").addEventListener("click", out(true));
}

setUpTheme();
setUpMenu();
setUpForms();
route();
