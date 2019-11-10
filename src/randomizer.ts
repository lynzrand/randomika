import 'rxjs'
import { Subject } from 'rxjs'

export interface RandomizationProvider<T> {
  pickObject(): T
}

export interface NamePickResult {
  id: string
  name: string
  prefix: string
  suffix: string
}

export class RandomNamePicker implements RandomizationProvider<NamePickResult> {
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

export interface RandomizerNumberState {
  num: string
  suffix: string
  name: string
  shuffleEnds: boolean
}

export class ShuffleRenderer extends Subject<RandomizerNumberState> {
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
