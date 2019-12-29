/**
 * @Author: Ali
 * @Date:   2019-12-26T22:22:15+01:00
 * @Last modified by:   Ali
 * @Last modified time: 2019-12-29T13:48:49+01:00
 */
import React,{Component} from 'react'
import Square from './Square'
import './Game.css'
class Game extends Component {
  constructor(){
    super()
    this.state = {
      board:Array(9).fill(null),
      currentTurn:"X"
    }
  }
  handleClick = index => {
    console.log(index);
    if(this.state.board[index] === null){
      if(this.state.currentTurn === "X"){
        let newBoard = this.state.board
        newBoard[index] = this.state.currentTurn
        this.setState({
          currentTurn:"O",
          board:newBoard
         })
      } else {
        let newBoard = this.state.board
        newBoard[index] = this.state.currentTurn
        this.setState({
         currentTurn:"X",
         board:newBoard
        })
      }
    }
  }
  render(){
    console.log(this.state.board);
    return (
      <div className="board">
        {this.state.board.map((cell,index)=>{
          return <Square onClick={()=>this.handleClick(index)} key={index}/>
        })}
      </div>
    )
  }
}
export default Game
