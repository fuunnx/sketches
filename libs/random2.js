"use strict";
exports.__esModule = true;
exports.random = void 0;
var random_1 = require("random");
exports.random = random_1["default"];
function randomSeed() {
    return Math.round(Math.random() * 1000000);
}
var params = new URLSearchParams(location.search);
var seed = params.get("seed") || randomSeed();
var searchParam = "?seed=" + seed;
if (searchParam !== location.search) {
    location.search = "?seed=" + seed;
}
console.log("Seed is", seed);
var button = document.createElement("a");
button.href = location.pathname + "?seed=" + randomSeed();
button.innerText = "Recharger";
button.style.setProperty("position", "fixed");
button.style.setProperty("top", "0");
button.style.setProperty("right", "0");
document.body.appendChild(button);
random_1["default"].use(seed);
