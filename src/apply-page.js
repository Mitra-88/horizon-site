// The application form (/apply#<token>): the link Kira DMs with /apply says who applies and for which role; the
// questions come from Kira (applications.js there), the answers go back to it, and the vote happens on the staff
// dashboards.
import { setUpTheme, setUpMenu } from "./chrome.js";
import { api, escape } from "./staff-api.js";

const $ = (sel) => document.querySelector(sel);

function field(q) {
  const input = q.short
    ? `<input name="${escape(q.id)}" maxlength="${q.max}"${q.required ? " required" : ""}>`
    : `<textarea name="${escape(q.id)}" rows="5" maxlength="${q.max}"${q.required ? " required" : ""}></textarea>`;
  return `<label class="hub-field"><span>${escape(q.label)}${q.required ? "" : " (optional)"}</span>${input}</label>`;
}

async function start() {
  const intro = $("[data-apply-intro]");
  const form = $("[data-apply-form]");
  // The token is the link's #fragment: kept for this tab only and taken out of the address bar at once.
  if (location.hash.length > 1) {
    sessionStorage.setItem("apply:token", location.hash.slice(1));
    history.replaceState(null, "", "/apply");
  }
  const token = sessionStorage.getItem("apply:token");
  if (!token) {
    intro.innerHTML = "To apply for 🤝 Support or 🛡️ Mod, run <code>/apply</code> on Horizon's Discord server: Kira DMs you a link to this form.";
    return;
  }
  let link;
  try {
    link = await api("POST", "apply/peek", { token });
  } catch (e) {
    sessionStorage.removeItem("apply:token");
    intro.textContent = e.message;
    return;
  }
  $("[data-apply-title]").textContent = `Apply for ${link.roleName}`;
  intro.innerHTML = `${link.name ? `As <strong>${escape(link.name)}</strong> on Discord. ` : ""}Take your time: the link works once, until ${escape(new Date(link.expiresAt).toLocaleString([], { weekday: "long", hour: "2-digit", minute: "2-digit" }))}.${link.role === "team" ? " If you linked your GitHub account with <code>/link-github</code> and proved it with <code>/verify-github</code>, your merged pull requests in Horizon are shown with your application." : ""}`;
  $("[data-questions]").innerHTML = link.questions.map(field).join("");
  form.hidden = false;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = form.querySelector("button[type=submit]");
    const status = form.querySelector("[data-status]");
    const answers = Object.fromEntries(link.questions.map((q) => [q.id, form.elements[q.id].value]));
    button.disabled = true;
    status.textContent = "Sending…";
    try {
      await api("POST", "apply/submit", { token, answers });
      sessionStorage.removeItem("apply:token");
      form.hidden = true;
      intro.hidden = true;
      $("[data-apply-done]").hidden = false;
    } catch (e) {
      button.disabled = false;
      status.textContent = e.message;
    }
  });
}

setUpTheme();
setUpMenu();
start();
