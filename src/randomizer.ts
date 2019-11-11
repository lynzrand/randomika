import 'rxjs'
import { Subject } from 'rxjs'

export interface RandomizationProvider<T> extends Subject<T> {
  requestNewObject(): void
}

export interface NamePickResult {
  id: string
  name: string
  prefix: string
  suffix: string
}

export class DefaultPicker extends Subject<NamePickResult>
  implements RandomizationProvider<NamePickResult> {
  requestNewObject() {
    this.next({
      id: '17370000',
      name: 'Matt',
      prefix: '',
      suffix: '',
    })
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

export const _emptyRandomizerState: RandomizerNumberState = {
  name: '',
  num: '00000000',
  suffix: '',
  shuffleEnds: true,
}

export class ShuffleRenderer extends Subject<RandomizerNumberState> {
  constructor(private provider: RandomizationProvider<NamePickResult>) {
    super()
    this.provider.subscribe({
      next: data => {
        this.shouldEndShuffle = true
        this.setSelected(data)
      },
    })
  }

  doingShuffleRampUp: boolean = false
  doingShuffleRampDown: boolean = false
  doingShuffle: boolean = false

  shouldEndShuffle: boolean = false
  animationStart: number = 0
  currentAnimation?: number

  //   selectedNumber: string = '00000000'
  selectedNumber: RandomizerNumberState = _emptyRandomizerState

  get selected() {
    return this.selectedNumber.num ? this.selectedNumber.num : '0'.repeat(this.totalDigits)
  }

  setSelected(input: NamePickResult) {
    this.selectedNumber = {
      num: input.id,
      suffix: input.suffix,
      name: input.name,
      shuffleEnds: true,
    }
  }

  readonly totalDigits = 8

  startShuffle() {
    this.animationStart = 0
    this.doingShuffleRampUp = true
    this.currentAnimation = requestAnimationFrame(this.doShuffleRampUp.bind(this))
  }

  stopShuffle() {
    this.doingShuffleRampUp = false
    this.provider.requestNewObject()
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
    this.next(this.selectedNumber)
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
