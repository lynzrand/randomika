import React, { Context } from 'react'
import logo from './logo.svg'
import './App.scss'
import randomizer_styles from './randomizer.module.scss'
import 'rxjs'
import { Subject, observable, Observable } from 'rxjs'
import classNames from 'classnames'

const App: React.FC = () => {
  return (
    <div className="App">
      <RandomizerComponent ready={false}></RandomizerComponent>
    </div>
  )
}

interface RandomizationProvider<T> {
  pickObject(): T
}

interface NamePickResult {
  id: string
  name: string
  prefix: string
  suffix: string
}

class RandomNamePicker implements RandomizationProvider<NamePickResult> {
  pickObject(): NamePickResult {
    return {
      id: '17370000',
      name: 'Matt',
      prefix: '',
      suffix: '',
    }
  }
}

/// Ramp up time, in milliseconds
const RandomizationRampUpTime = 1000
const RandomizationRampDownTime = 6000

function animationProgress(start: number, duration: number, now: number): number {
  return (now - start) / duration
}

function randomDigit(): number {
  return Math.floor(Math.random() * 10)
}

class ShuffleRenderer extends Subject<RandomizerNumberState> {
  constructor(private provider: RandomizationProvider<NamePickResult>) {
    super()
  }

  doingShuffleRampUp: boolean = false
  doingShuffleRampDown: boolean = false
  doingShuffle: boolean = false

  shouldEndShuffle: boolean = false
  animationStart: number = 0
  currentAnimation?: number

  selectedNumber: string = '00000000'

  get selected() {
    return this.selectedNumber ? this.selectedNumber : '0'.repeat(this.totalDigits)
  }

  readonly totalDigits = 8

  startShuffle() {
    this.animationStart = 0
    this.doingShuffleRampUp = true
    this.currentAnimation = requestAnimationFrame(this.doShuffleRampUp.bind(this))
  }

  stopShuffle() {
    this.doingShuffleRampUp = false
    this.shouldEndShuffle = true
  }

  calculateRampUpDigits(prog: number) {
    return Math.ceil(Math.max(Math.min(prog ** 1.5, 1), 0) * this.totalDigits)
  }

  calculateRampDownDigits(prog: number) {
    return Math.floor((1 - Math.max(Math.min((1 - prog) ** 1.3, 1), 0)) * this.totalDigits)
  }

  doShuffleRampUp(time: number) {
    if (!this.animationStart) this.animationStart = time
    const progress = animationProgress(this.animationStart, RandomizationRampUpTime, time)

    this.next({
      num: this.generateShuffle(this.calculateRampUpDigits(progress), this.totalDigits),
      name: '',
      suffix: '',
      shuffleEnds: false,
    })

    if (progress < 1) {
      requestAnimationFrame(this.doShuffleRampUp.bind(this))
    } else {
      this.doingShuffleRampUp = false
      this.doingShuffle = true
      requestAnimationFrame(this.doShuffleRun.bind(this))
    }
  }

  doShuffleRun(time: number) {
    this.next({
      num: this.generateShuffle(0, 0),
      name: '',
      suffix: '',
      shuffleEnds: false,
    })

    if (this.shouldEndShuffle) {
      this.selectedNumber = this.provider.pickObject().id
      this.animationStart = 0
      this.doingShuffle = false
      this.doingShuffleRampDown = true
      this.shouldEndShuffle = false
      requestAnimationFrame(this.doShuffleRampDown.bind(this))
    } else {
      requestAnimationFrame(this.doShuffleRun.bind(this))
    }
  }

  doShuffleRampDown(time: number) {
    if (!this.animationStart) this.animationStart = time

    const progress = animationProgress(this.animationStart, RandomizationRampDownTime, time)

    this.next({
      num: this.generateShuffle(0, this.calculateRampDownDigits(progress)),
      name: '',
      suffix: '',
      shuffleEnds: false,
    })

    if (progress < 1) {
      requestAnimationFrame(this.doShuffleRampDown.bind(this))
    } else {
      this.doingShuffleRampDown = false
      requestAnimationFrame(this.doFinalize.bind(this))
    }
  }

  doFinalize() {
    this.doingShuffle = false
    this.doingShuffleRampDown = false
    this.next({
      num: this.generateShuffle(0, this.totalDigits),
      name: '',
      suffix: '',
      shuffleEnds: true,
    })
    // this.complete()
  }

  generateShuffle(selectedStart: number, selectedEnd: number): string {
    let buf = ''

    for (let i = 0; i < selectedStart; i++) buf += randomDigit().toString()

    buf += this.selected.substr(selectedStart, selectedEnd)

    for (let i = selectedEnd; i < this.totalDigits; i++) buf += randomDigit().toString()

    return buf
  }
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

interface RandomizerNumberState {
  num: string
  suffix: string
  name: string
  shuffleEnds: boolean
}

const _emptyRandomizerState: RandomizerNumberState = {
  name: '',
  num: '00000000',
  suffix: '',
  shuffleEnds: true,
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
