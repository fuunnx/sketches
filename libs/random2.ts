import random from "random"

function randomSeed() {
  return Math.round(Math.random() * 1000000)
}

const params = new URLSearchParams(location.search)
const seed = params.get("seed") || randomSeed()
const searchParam = `?seed=${seed}`
if (searchParam !== location.search) {
  location.search = `?seed=${seed}`
}

console.log("Seed is", seed)

const button = document.createElement("a")
button.href = `${location.pathname}?seed=${randomSeed()}`
button.innerText = "Recharger"
button.style.setProperty("position", "fixed")
button.style.setProperty("top", "0")
button.style.setProperty("right", "0")

document.body.appendChild(button)

random.use(seed as any)
export { random }
