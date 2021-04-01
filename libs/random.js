const seedRandom = require("seed-random")

const params = new URLSearchParams(location.search)
const seed = params.get("seed") || Math.round(Math.random() * 1000000)
const searchParam = `?seed=${seed}`
if (searchParam !== location.search) {
  location.search = `?seed=${seed}`
}

export const getRandom = seedRandom()

// function to generate a random number between min and max
export const randomInterval = (min, max) => getRandom() * (max - min) + min
