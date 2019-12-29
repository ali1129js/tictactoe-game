/**
 * @Author: Ali
 * @Date:   2019-12-26T22:22:35+01:00
 * @Last modified by:   Ali
 * @Last modified time: 2019-12-29T15:29:19+01:00
 */
import React from 'react'

const Square = ({onClick,value}) => (
  <button
    className="sqaure"
    onClick={onClick}
    style={sqaureStyle}>
    {value}
  </button>
)
const sqaureStyle = {
  width:"150px",
  height:"150px",
  background:"blue",
  fontSize:"3rem",
  boxShadow:"10px 10px 5px #000"
}
export default Square
