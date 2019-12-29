/**
 * @Author: Ali
 * @Date:   2019-12-29T15:02:14+01:00
 * @Last modified by:   Ali
 * @Last modified time: 2019-12-29T15:27:13+01:00
 */
import React from 'react'

const CheckWin = ({board}) => {
    const winLines = [
         ["0", "1", '2'],
         ["3", "4", '5'],
         ["6", "7", '8'],
         ["0", "3", '6'],
         ["1", "4", '7'],
         ["2", "5", '8'],
         ["0", "4", '8'],
         ["2", "4", '6'],
       ]
       for (let index = 0; index < winLines.length; index++) {
        const [a, b, c] = winLines[index];
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
          alert('You won');

        }
      }
    return (
      <h1>The Winner</h1>
    )
}

export default CheckWin
