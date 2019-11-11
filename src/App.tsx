import React, { Context } from 'react'
import logo from './logo.svg'
import './App.scss'
import randomizer_styles from './randomizer.module.scss'
import 'rxjs'
import 'rxjs/operators'
import { Subject, observable, Observable, fromEvent, pipe } from 'rxjs'
import classNames from 'classnames'
import './randomizer'
import {
  ShuffleRenderer,
  RandomizerNumberState,
  DefaultPicker,
  _emptyRandomizerState,
} from './randomizer'
import { filter } from 'rxjs/operators'
import { clone } from '@babel/types'

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

    let provider = new ShuffleRenderer(new DefaultPicker())
    this.state = {
      provider: provider,
      number: _emptyRandomizerState,
      past: [],
    }

    provider.subscribe({
      next: x => this.setState({ number: x }),
    })

    fromEvent<KeyboardEvent>(document, 'keydown')
      .pipe()
      .subscribe({
        next: ev => {
          console.log(ev)
          switch (ev.key) {
            case ' ':
              this.click()
              break
            case 'ArrowUp':
              this.arrowUp()
              break
            case 'ArrowDown':
              this.arrowDown()
              break
          }
        },
      })
  }

  arrowUp = () => {
    this.setState(prev => {
      let past = prev.past
      past.push(prev.number)
      return { past: past }
    })
  }

  arrowDown = () => {
    this.setState({ past: [] })
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
      <div className={randomizer_styles['randomizer-wrapper']}>
        <div className={randomizer_styles['randomizer-past-wrapper']}>
          {this.state.past.map(it => (
            <div className={randomizer_styles['randomizer-past']}>
              {it.prefix}
              {it.num} {it.name}
            </div>
          ))}
        </div>
        <div
          onClick={this.click}
          className={classNames([
            randomizer_styles['randomizer-display'],
            {
              [`${randomizer_styles['highlight']}`]: this.state.number.shuffleEnds,
            },
          ])}
        >
          {this.state.number.prefix}
          {this.state.number.num}
        </div>
        <div
          onClick={this.click}
          className={classNames([
            randomizer_styles['randomizer-display'],
            {
              [`${randomizer_styles['highlight']}`]: this.state.number.shuffleEnds,
            },
          ])}
        >
          {this.state.number.name || <br></br>}
        </div>
      </div>
    )
  }
}

export default App
