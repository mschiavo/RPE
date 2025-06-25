// token-loader.js
const GIST_ID = "d8bee50bb41a6c3324f81c051ccccd1b";
const FALLBACK_GIST_TOKEN = FALLBACK_GIST_TOKEN || ""; // definito in secrets.js

async function initToken() {
  const saved = localStorage.getItem("github_token");
  if (saved) return saved;

  const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
    headers: {
      Authorization: `token ${FALLBACK_GIST_TOKEN}`
    }
  });

  const gist = await res.json();
  const content = JSON.parse(Object.values(gist.files)[0].content);
  const token = content.token;
  localStorage.setItem("github_token", token);
  return token;
}
