/**
 * @Author: Ali
 * @Date:   2019-12-26T22:20:05+01:00
 * @Last modified by:   Ali
 * @Last modified time: 2019-12-26T22:22:06+01:00
 */

import React from 'react';
import ReactDOM from 'react-dom';
import Game from './components/Game';
import * as serviceWorker from './serviceWorker';

ReactDOM.render(<Game />, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
