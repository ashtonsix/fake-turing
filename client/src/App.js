import React, {Component} from 'react'
import axios from 'axios'
import Spinner from 'react-spinkit'
import Trianglify from 'trianglify'
import {Intro, Legal, Retry} from './Explainers'

const createGame = id => ({
  id,
  stage: 'chat',
  messages: [],
  answer: null,
  myPrediction: null,
  strangerPrediction: null,
  strangerTyping: null
})

const getUser = async forceRefresh => {
  let user
  if (!forceRefresh) window.localStorage.getItem('user')
  if (!user) {
    const response = await axios.post('/api/create-player')
    user = response.data.data
    window.localStorage.setItem('user', user)
  }
  return user
}

class Store extends Component {
  state = {
    game: null,
    joining: false,
    user: null,
    score: 0,
    screen: 'intro',
    legalAccepted: false
  }
  constructor() {
    super()

    this.onReadIntro = this.onReadIntro.bind(this)
    this.onAcceptLegal = this.onAcceptLegal.bind(this)
    this.onRetryConnect = this.onRetryConnect.bind(this)
    this.onType = this.onType.bind(this)
    this.onMessage = this.onMessage.bind(this)
    this.onPrediction = this.onPrediction.bind(this)
    this.onNextStage = this.onNextStage.bind(this)
    this.joinGame = this.joinGame.bind(this)
    this.poll = this.poll.bind(this)
    this.setState = this.setState.bind(this)
  }
  async componentDidMount() {
    let user = await getUser()
    const score = parseInt(window.localStorage.getItem('score'), 10) || 0
    this.setState({user, score})
  }
  onReadIntro() {
    const nextScreen = this.state.legalAccepted ? 'game' : 'legal'
    this.setState({screen: nextScreen})
  }
  onAcceptLegal() {
    this.setState({screen: 'game', legalAccepted: true})
  }
  onRetryConnect() {
    this.setState({screen: 'game'})
  }
  componentDidUpdate(prevProps, prevState) {
    window.localStorage.setItem('score', this.state.score.toString())
    if (this.state.joining) return
    // prettier-ignore
    if (prevState.screen === 'game' && this.state.screen !== 'game') {
      this.setState({game: null})
    } else if (prevState.screen !== 'game' && this.state.screen === 'game') {
      this.joinGame()
    } else if (this.state.screen === 'game' && prevState.game && !this.state.game) {
      this.joinGame()
    }
  }
  onTypeLastCalled = 0
  async onType() {
    if (Date.now() - this.onTypeLastCalled < 2000) return
    this.onTypeLastCalled = Date.now()

    const {user, game} = this.state
    axios.post('/api/start-typing', {user, game: game.id})
  }
  async onMessage(message) {
    const {user, game} = this.state
    axios.post('/api/send-message', {message, user, game: game.id})
    this.setState(({game}) => {
      const messages = game.messages.concat({from: 'me', text: message})
      return {game: {...game, messages}}
    })
  }
  async onPrediction(prediction) {
    const {user, game} = this.state
    const response = await axios.post('/api/predict', {
      prediction,
      user,
      game: game.id
    })
    const answer = response.data.data
    this.setState(({game, score}) => ({
      game: {
        ...game,
        myPrediction: prediction,
        answer
      },
      score: score + (answer === prediction ? 1 : -1)
    }))
  }
  async onNextStage() {
    this.setState(({game, score}) => {
      if (game.stage === 'end') return {game: null}
      const nextStage = game.stage === 'chat' ? 'predict' : 'end'
      if (game.strangerPrediction && nextStage === 'end') {
        score += game.strangerPrediction === 'robot' ? 2 : -1
      }
      return {game: {...game, stage: nextStage}, score}
    })
  }
  async joinGame() {
    const {user} = this.state
    this.setState({joining: true})
    let response
    try {
      response = await axios.post('/api/join-game', {user})
    } catch (e) {
      if (e.response.data === 'User not found') {
        const user = await getUser(true)
        this.setState({user}, () => this.joinGame())
      } else {
        this.setState({screen: 'retry', joining: false})
      }
      return
    }
    const game = response.data.data
    this.setState(
      () => ({game: createGame(game), joining: false}),
      () => this.poll(this.state.game.id)
    )
  }
  async poll(game) {
    const {user} = this.state
    let response
    try {
      response = await axios.get('/api/poll', {params: {game, user}})
    } catch (err) {
      if (!this.state.game || game !== this.state.game.id) return
      setTimeout(
        () => this.poll(game),
        err.response && err.response.status === 408 ? 0 : 3000
      )
      return
    }
    if (!this.state.game || game !== this.state.game.id) return
    const {action, data} = response.data
    switch (action) {
      case 'typing':
        this.setState(({game}) => ({
          game: {...game, strangerTyping: Date.now()}
        }))
        setTimeout(() => {
          this.setState(({game}) => {
            const strangerTyping =
              Date.now() - game.strangerTyping < 3000
                ? game.strangerTyping
                : false
            return {game: {...game, strangerTyping}}
          })
        }, 3500)

        break
      case 'message':
        this.setState(({game}) => {
          const messages = game.messages.concat({from: 'other', text: data})
          return {game: {...game, messages, strangerTyping: null}}
        })
        break
      case 'prediction':
        this.setState(({game, score}) => ({
          game: {
            ...game,
            strangerPrediction: data
          }
        }))
        break
      default:
        break
    }
    this.poll(game)
  }
  render() {
    const {children} = this.props
    return children(this)
  }
}

const Link = ({to, setState, children}) => (
  <a
    href={'/' + to}
    onClick={e => {
      e.preventDefault()
      setState({screen: to})
    }}
  >
    {children}
  </a>
)

class Timer extends React.Component {
  state = {time: 0}
  interval = null
  finished = false
  componentDidMount() {
    this.interval = setInterval(() => {
      const {duration, onFinish} = this.props
      const {time} = this.state
      if (time >= duration && !this.finished) {
        this.finished = true
        onFinish()
      }
      this.setState(({time}) => ({time: Math.min(time + 1, duration)}))
    }, 1000)
  }
  componentWillUnmount() {
    this.interval = null
  }
  render() {
    const {duration} = this.props
    const {time} = this.state
    return `Time: ${(duration - time).toString(10)}`
  }
}

const Game = ({game, onType, onMessage, onPrediction, onNextStage}) => {
  const formatScore = score => `(${score} point${score === 1 ? '' : 's'})`
  const scores = {
    correct:
      !!game.myPrediction && (game.myPrediction === game.answer ? 1 : -1),
    stranger: {robot: 2, human: -1}[game.strangerPrediction] || false
  }

  return (
    <>
      <Timer
        key={game.stage}
        duration={
          game.stage === 'chat' ? 30 : game.stage === 'predict' ? 10 : null
        }
        onFinish={() => game.stage !== 'end' && onNextStage()}
      />
      <br />
      <ul style={{width: '100%'}}>
        {game.messages.map(({from, text}, i) => (
          <li key={i} style={{wordWrap: 'break-word'}}>
            <strong>{from === 'me' ? 'Me' : 'Stranger'}</strong>: {text}
          </li>
        ))}
      </ul>
      {game.stage !== 'chat' && (
        <ul>
          <li>
            You predicted: <strong>{game.myPrediction || 'nothing'}</strong>
          </li>
          <li>
            Correct answer:{' '}
            <strong>
              {game.answer || '?'}{' '}
              {scores.correct && formatScore(scores.correct)}
            </strong>
          </li>
          {game.stage === 'end' && (
            <li>
              Stranger predicted:{' '}
              <strong>
                {game.strangerPrediction || 'nothing'}{' '}
                {scores.stranger && formatScore(scores.stranger)}
              </strong>
            </li>
          )}
        </ul>
      )}
      {game.stage === 'chat' && (
        <>
          {game.strangerTyping ? (
            <>
              <span>Stranger is typing...</span>
              <br />
            </>
          ) : null}
          <input
            style={{width: 300}}
            onKeyPress={e => {
              if (e.key === 'Enter') {
                onMessage(e.target.value)
                e.target.value = ''
              } else {
                onType()
              }
            }}
            autoFocus
          />
          <span>Press Enter to send</span>
        </>
      )}
      {game.stage === 'predict' && (
        <>
          <strong>Make prediction:</strong>
          <br />
          <div>
            <button
              onClick={() => onPrediction('human')}
              style={{marginRight: 10}}
            >
              Human
            </button>
            <button onClick={() => onPrediction('robot')}>Robot</button>
          </div>
        </>
      )}
      {game.stage === 'end' && (
        <>
          <span>End of game</span>
          <div>
            <button onClick={() => onNextStage()}>Play Again</button>
          </div>
        </>
      )}
    </>
  )
}

const Lobby = () => (
  <>
    <h1>Connecting</h1>
    <Spinner name="cube-grid" />
  </>
)

class Background extends React.Component {
  componentDidMount() {
    Trianglify({
      width: window.innerWidth,
      height: window.innerHeight
    }).canvas(document.getElementById('background'))
  }
  componentWillUnmount() {
    this.particles.destroy()
  }
  render() {
    return <canvas id="background" />
  }
}

const App = () => (
  <>
    <div className="outer-container">
      <div className="inner-container">
        <Store>
          {({
            state: {game, screen, score},
            setState,
            onType,
            onMessage,
            onPrediction,
            onNextStage,
            onReadIntro,
            onAcceptLegal,
            onRetryConnect
          }) => {
            if (screen === 'intro') return <Intro onNext={onReadIntro} />
            if (screen === 'legal') return <Legal onNext={onAcceptLegal} />
            if (screen === 'retry') return <Retry onNext={onRetryConnect} />

            return (
              <>
                <header>
                  <Link to="intro" setState={setState}>
                    Intro / Rules
                  </Link>
                  <br />
                  <Link to="legal" setState={setState}>
                    Legal
                  </Link>
                  <p>Score: {score}</p>
                </header>
                {game ? (
                  <Game
                    game={game}
                    onType={onType}
                    onMessage={onMessage}
                    onPrediction={onPrediction}
                    onNextStage={onNextStage}
                  />
                ) : (
                  <Lobby />
                )}
              </>
            )
          }}
        </Store>
      </div>
    </div>
    <Background />
  </>
)

export default App
