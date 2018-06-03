const fs = require('fs')
const path = require('path')
const Koa = require('koa')
const logger = require('koa-logger')
const bodyParser = require('koa-bodyparser')
const serve = require('koa-static')
const Router = require('koa-router')
const Boom = require('boom')

const start = Date.now()
const createId = () => {
  return (Date.now() - start + Math.random()).toString(36).replace('.', '')
}

const app = new Koa()
const api = new Router()
const router = new Router()

let lobby = null
let games = {}
let players = {}

try {
  fs.readFileSync(__dirname + '../players.jsonl', 'utf8')
    .split('\n')
    .filter(l => l)
    .forEach(player => {
      player = JSON.parse(player)
      players[player.id] = player
    })
} catch (e) {}

var gamesFile = path.resolve(__dirname, '../games.jsonl')
var playersFile = path.resolve(__dirname, '../players.jsonl')

const streams = {}
const appendToFile = (path, data) => {
  if (!streams[path]) {
    if (!fs.existsSync(path)) fs.closeSync(fs.openSync(path, 'w'))
    streams[path] = {
      size: fs.statSync(path).size,
      stream: fs.createWriteStream(path, {flags: 'a'})
    }
  }
  streams[path].stream.write(data, () => {
    fs.stat(path, (e, stats) => {
      if (stats.size <= streams[path].size) {
        streams[path].stream.close()
        streams[path] = {
          size: stats.size,
          stream: fs.createWriteStream(path, {flags: 'a'})
        }
        streams[path].stream.write(data)
      }
    })
  })
}

const dialog = (open, timeout = () => {}) => {
  return new Promise((resolve, reject) => {
    let done = false
    open(message => reply => {
      if (done) return
      done = true
      resolve(reply)
      return message
    })
    setTimeout(() => {
      done = true
      timeout()
      reject(Boom.clientTimeout())
    }, 15000)
  })
}

const assert = ({prediction, message, game, user}) => {
  if (prediction != null && prediction !== 'robot' && prediction !== 'human') {
    throw Boom.badRequest('Invalid prediction')
  }
  if (message != null && typeof message !== 'string') {
    throw Boom.badRequest('Invalid message')
  }
  if (game != null && !games[game]) {
    throw Boom.notFound('Game not found')
  }
  if (user != null && !players[user]) {
    throw Boom.notFound('User not found')
  }
}

const findPlayers = ({game, user}) => {
  const {player1, player2} = games[game]
  return {
    viewerKey: user === player1.id ? 'player1' : 'player2',
    viewer: user === player1.id ? player1 : player2,
    other: user === player1.id ? player2 : player1
  }
}

api.get('/poll', async ctx => {
  const {game, user} = ctx.request.query
  assert({game, user})
  const {viewer} = findPlayers({game, user})
  const data = await dialog(start => (viewer.data = start()))
  ctx.body = data
})

api.post('/start-typing', async (ctx, next) => {
  const {game, user} = ctx.request.body
  assert({game, user})
  const {other} = findPlayers({game, user})
  other.data({action: 'typing'})
  ctx.body = 'ok'
})

api.post('/send-message', async (ctx, next) => {
  const {message, game, user} = ctx.request.body
  assert({message, game, user})
  const {viewerKey, other} = findPlayers({game, user})
  games[game].messages.push({text: message, from: viewerKey, date: Date.now()})
  other.data({action: 'message', data: message})
  ctx.body = 'ok'
})

api.post('/predict', async (ctx, next) => {
  const {prediction, game, user} = ctx.request.body
  assert({prediction, game, user})
  const {viewer, other} = findPlayers({game, user})

  viewer.prediction = prediction
  viewer.predictionAt = Date.now()

  if (other.correct === 'human') {
    other.data({action: 'prediction', data: prediction})
  }
  ctx.body = {data: viewer.correct}

  if (viewer.prediction && other.prediction) {
    appendToFile(gamesFile, JSON.stringify(games[game]) + '\n')
    delete games[game]
  }
})

api.post('/create-player', async (ctx, next) => {
  const player = {
    id: createId(),
    robotChance: Math.random()
  }
  players[player.id] = player
  appendToFile(playersFile, JSON.stringify(player) + '\n')
  ctx.body = {data: player.id}
})

const createGame = ({player1, player2, id}) => {
  const game = {
    player1: {
      id: player1,
      correct: Math.random() < players[player1].robotChance ? 'robot' : 'human',
      prediction: null,
      predictionAt: null,
      data: () => {}
    },
    player2: {
      id: player2,
      correct: Math.random() < players[player2].robotChance ? 'robot' : 'human',
      prediction: null,
      predictionAt: null,
      data: () => {}
    },
    messages: [],
    started: Date.now(),
    id
  }

  games[game.id] = game
}

api.post('/join-game', async (ctx, next) => {
  const {user} = ctx.request.body
  assert({user})
  let game
  if (lobby) {
    game = createId()
    const other = lobby(game)
    lobby = null
    createGame({player1: user, player2: other, id: game})
  } else {
    game = await dialog(start => (lobby = start(user)), () => (lobby = null))
  }

  ctx.body = {data: game}

  const tenMinutes = 10 * 60 * 1000
  setTimeout(() => {
    if (!games[game.id]) return
    appendToFile(gamesFile, JSON.stringify(game) + '\n')
    delete games[game.id]
  }, tenMinutes)
})

router.use(
  '/api',
  api.routes(),
  api.allowedMethods({
    notImplemented: () => Boom.notImplemented(),
    methodNotAllowed: () => Boom.methodNotAllowed()
  }),
  () => {}
)
router.get('/*', serve(path.resolve(__dirname, '../../client/build')))

app.use(logger())
app.use(async (ctx, next) => {
  ctx.set('Access-Control-Allow-Origin', '*')
  ctx.set('Access-Control-Allow-Credentials', 'true')
  ctx.set('Access-Control-Allow-Methods', 'POST, HEAD, GET')
  ctx.set('Access-Control-Allow-Headers', 'content-type')

  await next()
})
app.use(async (ctx, next) => {
  try {
    await next()
  } catch (err) {
    ctx.status = err.isBoom ? err.output.statusCode : 500
    ctx.body = err.message
  }
})
app.use(bodyParser())
app.use(router.routes())
app.use(router.allowedMethods())

app.listen(3001)
