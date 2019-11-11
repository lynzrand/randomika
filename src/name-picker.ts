import { RandomizerNumberState, RandomizationProvider } from './randomizer'
import { Subject } from 'rxjs'
import Axios from 'axios-observable'

export class RemoteNamePicker extends Subject<RandomizerNumberState>
  implements RandomizationProvider<RandomizerNumberState> {
  constructor(private src: string) {
    super()
  }

  requestNewObject() {
    Axios.get<RandomizerNumberState>(this.src).subscribe(data => this.next(data.data))
  }
}
