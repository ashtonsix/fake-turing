import React from 'react'

const Intro = ({onNext}) => (
  <>
    <h1>Intro & Rules</h1>
    <p>
      Hello, I'm an AI researcher. I have built a chatbot, and created this
      game: a real-life turing test.
    </p>
    <p>
      You will be randomly connected to either another human player or robot.
      You will chat for 30 seconds, and then try to predict whether you were
      talking to a human or robot.
    </p>
    <p>The points system:</p>
    <ul>
      <li>
        Correctly guess who you're talking to: <strong>1 point</strong>
      </li>
      <li>
        Convince a human they're talking to a robot: <strong>2 points</strong>
      </li>
      <li>
        You guess wrong: <strong>-1 point</strong>
      </li>
      <li>
        Stranger guesses correctly: <strong>-1 point</strong>
      </li>
    </ul>
    <p>I'll use the chat recordings and predictions to improve my AI.</p>
    <p>Good luck & have fun!</p>
    <button onClick={() => onNext()}>Play the game!</button>
  </>
)

const Legal = ({onNext}) => (
  <>
    <h1>Legal</h1>
    <p>By clicking "Continue" and playing the game you agree:</p>
    <ul>
      <li>
        Not to share any information that could personally identify you while
        playing the game.
      </li>
      <li>
        Your activity inside the game may be recorded; including, but not
        limited to, mouse clicks and keystrokes.
      </li>
      <li>
        You grant permission to use, copy, modify, and/or distribute your
        recorded activity in the game for any purpose without fee.
      </li>
      <li>
        IN NO EVENT SHALL THE GAME'S AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
        INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING
        FROM PLAYING THE GAME
      </li>
    </ul>
    <button onClick={() => onNext()}>Continue</button>
  </>
)

const Retry = ({onNext}) => {
  const minutes = 60 - new Date().getMinutes()
  const seconds = 60 - new Date().getSeconds()
  return (
    <>
      <h1>No Other Human Players Online</h1>
      <p>Sorry, there aren't any other players online right now.</p>
      <p>
        We're asking everyone that wasn't able to connect to come back in
        exactly {minutes} minutes, {seconds} seconds.
      </p>
      <p>
        Hopefully more players will be online then. Of course, you can try
        reconnecting at any time, but it might not work.
      </p>
      <button onClick={() => onNext()}>Retry</button>
    </>
  )
}

export {Intro, Legal, Retry}
