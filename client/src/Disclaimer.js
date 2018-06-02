import React from 'react'

const Disclaimer = ({onAccept}) => (
  <React.Fragment>
    <h2>Disclaimer</h2>
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
    </ul>
    <button onClick={() => onAccept()}>Continue</button>
  </React.Fragment>
)

export default Disclaimer
