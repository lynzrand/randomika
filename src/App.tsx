import React, { Context } from 'react'
import logo from './logo.svg'
import './App.scss'
import randomizer_styles from './randomizer.module.scss'
import 'rxjs'
import { Subject, observable, Observable } from 'rxjs'
import classNames from 'classnames'
import './randomizer'
import {
  ShuffleRenderer,
  RandomizerNumberState,
  RandomNamePicker,
  _emptyRandomizerState,
} from './randomizer'

const App: React.FC = () => {
  return (
    <div className="App">
      <RandomizerComponent ready={false}></RandomizerComponent>
    </div>
  )
}

interface RandomizerProp {
  ready: boolean
}

interface RandomizerState {
  provider: ShuffleRenderer
  number: RandomizerNumberState
  past: Array<RandomizerNumberState>
  observe?: Observable<RandomizerNumberState>
}

class RandomizerComponent extends React.Component<RandomizerProp, RandomizerState> {
  /**
   *
   */
  constructor(p: RandomizerProp, ctx: any) {
    super(p, ctx)

    let provider = new ShuffleRenderer(new RandomNamePicker())
    this.state = {
      provider: provider,
      number: _emptyRandomizerState,
      past: [],
    }

    provider.subscribe({
      next: x => this.setState({ number: x }),
    })
  }

  click = () => {
    if (!this.state.provider.doingShuffleRampUp && !this.state.provider.doingShuffle) {
      this.state.provider.startShuffle()
    } else {
      this.state.provider.stopShuffle()
    }
  }

  render() {
    return (
      <div
        onClick={this.click}
        className={classNames([
          randomizer_styles['randomizer-display'],
          {
            [`${randomizer_styles['highlight']}`]: this.state.number.shuffleEnds,
          },
        ])}
      >
        {this.state.number.num}
      </div>
    )
  }
}

export default App
