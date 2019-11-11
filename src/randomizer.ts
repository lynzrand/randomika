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

/**
 * A mock-up picker. Returns a result of a random-generated id number
 */
export class DefaultPicker extends Subject<NamePickResult>
  implements RandomizationProvider<NamePickResult> {
  namePoolFamily =
    '王李张刘陈杨黄赵吴周徐孙马朱胡郭何高林郑谢罗梁宋唐许韩冯邓曹彭曾萧田董袁潘于蒋蔡余杜叶程苏魏吕丁任沈姚卢姜崔钟谭陆汪范金石廖贾夏韦付方白邹孟熊秦邱江尹薛闫段雷侯龙史陶黎贺顾毛郝龚邵万钱严覃武戴莫孔向汤'

  namePoolGiven = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

  requestNewObject() {
    let isY = Math.random() < 0.2

    let id =
      '1737' +
      Math.floor(Math.random() * 10000).toLocaleString(undefined, {
        minimumIntegerDigits: 4,
        useGrouping: false,
      })
    // (isY ? 'Y' : '')

    let name =
      this.namePoolFamily.charAt(Math.floor(this.namePoolFamily.length * Math.random())) +
      this.namePoolGiven.charAt(Math.floor(this.namePoolGiven.length * Math.random())).repeat(2)

    this.next({
      id: id,
      name: name,
      prefix: isY ? 'SY' : '',
      suffix: '',
    })
  }
}

/// Ramp up time, in milliseconds
const RandomizationRampUpTime = 1000
/// Ramp down time, in milliseconds
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
  prefix: string
  name: string
  shuffleEnds: boolean
}

export const _emptyRandomizerState: RandomizerNumberState = {
  name: '',
  num: '00000000',
  suffix: '',
  prefix: '',
  shuffleEnds: true,
}

/**
 * A
 */
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
      prefix: input.prefix,
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
      prefix: '',
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
      prefix: '',
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
      prefix: '',
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
