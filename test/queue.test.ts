import { describe, expect, it } from 'vitest'
import { oneAtATime } from '~/utils/queue'

function deferred() {
  let resolve!: () => void
  let reject!: (e: Error) => void
  const promise = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('oneAtATime', () => {
  it('sends the next value once the previous one is done, in call order', async () => {
    const pending = [deferred(), deferred()]
    const sent: number[] = []
    const send = oneAtATime((value: number) => {
      sent.push(value)
      return pending[value]!.promise
    })
    const first = send(0)
    const second = send(1)
    await Promise.resolve()
    expect(sent).toEqual([0])
    pending[0]!.resolve()
    await first
    await Promise.resolve()
    expect(sent).toEqual([0, 1])
    pending[1]!.resolve()
    await second
  })

  it('keeps sending after a failure and reports it to its caller', async () => {
    const sent: number[] = []
    const send = oneAtATime(async (value: number) => {
      sent.push(value)
      if (value === 0) throw new Error('failed')
    })
    await expect(send(0)).rejects.toThrow('failed')
    await send(1)
    expect(sent).toEqual([0, 1])
  })
})
