import 'antd/lib/date-picker/style/css'
import './index.css'
import React from 'react'
import ReactDOM from 'react-dom'
import axios from 'axios'
import App from './App'

if (process.env.NODE_ENV === 'production') {
  axios.defaults.baseURL = process.env.REACT_APP_HOST
}

ReactDOM.render(<App />, document.getElementById('root'))
