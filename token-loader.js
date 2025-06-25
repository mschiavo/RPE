// token-loader.js

async function initToken() {
  const urlToken = new URLSearchParams(window.location.search).get("token");

  if (urlToken) {
    localStorage.setItem("github_token", urlToken);
    return urlToken;
  }

  const cached = localStorage.getItem("github_token");
  if (cached) return cached;

  alert("Token non presente. Aggiungilo all'URL come ?token=ghp_XXXXX");
  throw new Error("Token mancante");
}
