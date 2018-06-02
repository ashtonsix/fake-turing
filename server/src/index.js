const path = require('path')
const Koa = require('koa')
const bodyParser = require('koa-bodyparser')
const serve = require('koa-static')
const Router = require('koa-router')
const Boom = require('boom')

const start = Date.now()

const app = new Koa()
const api = new Router()
const router = new Router()

let lobby = null
let games = {}
let players = {}

api.post('/join-game', async (ctx, next) => {
  const {user} = ctx.request.body
  let other
  if (lobby) {
    other = lobby(user)
    lobby = null
  } else {
    other = await new Promise((resolve, reject) => {
      lobby = other => (resolve(other), user)
      setTimeout(
        () => ((lobby = null), reject(new Boom.gatewayTimeout())),
        10000
      )
    })
  }

  const game = {
    player1: {
      id: user,
      typing: false,
      prediction: null
    },
    player2: {
      id: other,
      typing: false,
      prediction: null
    },
    messages: [],
    started: Date.now(),
    id: (Date.now() - start + Math.random()).toString(36).replace('.', '')
  }

  games[game.id] = game
  ctx.body = {game: game.id, player1: game.player1, player2: game.player2}
})

router.use(
  '/api',
  api.routes(),
  api.allowedMethods({
    notImplemented: () => new Boom.notImplemented(),
    methodNotAllowed: () => new Boom.methodNotAllowed()
  }),
  () => {}
)
router.get('/*', serve(path.resolve(__dirname, '../../client/build')))

app.use(bodyParser())
app.use(router.routes())

app.listen(3001)
