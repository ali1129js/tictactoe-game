/**
 * @Author: Ali
 * @Date:   2019-12-26T22:22:35+01:00
 * @Last modified by:   Ali
 * @Last modified time: 2019-12-26T22:58:12+01:00
 */
import React from 'react'

const Square = ({onClick}) => (
  <button
    className="sqaure"
    onClick={onClick}
    style={sqaureStyle}>
  </button>
)
const sqaureStyle = {
  width:"200px",
  height:"200px",
  background:"blue"
}
export default Square
