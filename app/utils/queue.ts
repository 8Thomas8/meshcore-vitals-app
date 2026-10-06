export function oneAtATime<T>(send: (value: T) => Promise<void>) {
  let sending = Promise.resolve()
  return (value: T) => {
    const sent = sending.then(() => send(value))
    sending = sent.catch(() => {})
    return sent
  }
}
