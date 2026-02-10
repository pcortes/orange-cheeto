const nicknames = [
  "Orange Cheeto",
  "Mango Unchained",
  "The Citrus Golem",
  "Tiny Hands",
  "Cheeto Jesus",
  "Agent Orange",
];

const chromeStoreUrl =
  "https://chromewebstore.google.com/detail/orange-cheeto/ahlkccapbjplgjanggoclfmoodmlceda";
const safariStoreUrl =
  "https://apps.apple.com/us/app/orange-cheeto/id6758311109?mt=12";
const firefoxStoreUrl =
  "https://addons.mozilla.org/en-US/firefox/addon/orange-cheeto/";

const target = document.getElementById("target-word");
const toggle = document.getElementById("modeToggle");
const toggleLabel = document.getElementById("toggleLabel");
const storeLinkNav = document.getElementById("storeLinkNav");
const storeLinkHero = document.getElementById("storeLinkHero");

function getBrowser() {
  const ua = navigator.userAgent;
  if (/Firefox/i.test(ua)) {
    return "firefox";
  }
  if (/Safari/i.test(ua) && !/Chrome|Chromium|Edg|OPR/i.test(ua)) {
    return "safari";
  }
  return "chrome";
}

function setupStoreLinks() {
  const browser = getBrowser();
  let storeUrl, navLabel, heroLabel;

  if (browser === "firefox") {
    storeUrl = firefoxStoreUrl;
    navLabel = "Add to Firefox";
    heroLabel = "Install for Firefox";
  } else if (browser === "safari") {
    storeUrl = safariStoreUrl;
    navLabel = "Add to Safari";
    heroLabel = "Install for Safari";
  } else {
    storeUrl = chromeStoreUrl;
    navLabel = "Add to Chrome";
    heroLabel = "Install Extension";
  }

  if (storeLinkNav) {
    storeLinkNav.href = storeUrl;
    storeLinkNav.textContent = navLabel;
  }

  if (storeLinkHero) {
    storeLinkHero.href = storeUrl;
    storeLinkHero.textContent = heroLabel;
  }

}

let index = 0;
let showingNickname = false;
let intervalId = null;

function cycleText() {
  if (!target) return;

  target.classList.add("warp-anim");

  setTimeout(() => {
    if (!showingNickname) {
      target.textContent = nicknames[index];
      target.style.color = "var(--c-orange)";
      target.style.textTransform = "uppercase";
      index = (index + 1) % nicknames.length;
      showingNickname = true;
    } else {
      target.textContent = "Trump";
      target.style.color = "inherit";
      target.style.textTransform = "none";
      showingNickname = false;
    }
  }, 200);

  setTimeout(() => {
    target.classList.remove("warp-anim");
  }, 500);
}

function startAnimation() {
  if (intervalId) return;
  intervalId = setInterval(cycleText, 2500);
}

function stopAnimation() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  showingNickname = false;
  if (target) {
    target.textContent = "Trump";
    target.style.color = "inherit";
    target.style.textTransform = "none";
  }
}

if (toggle) {
  toggle.addEventListener("click", () => {
    const isActive = toggle.classList.toggle("active");
    toggle.setAttribute("aria-pressed", String(isActive));
    if (toggleLabel) {
      toggleLabel.textContent = `Animation Mode: ${isActive ? "ON" : "OFF"}`;
    }
    if (isActive) {
      startAnimation();
    } else {
      stopAnimation();
    }
  });
}

setupStoreLinks();
startAnimation();
