import { describe, expect, it } from 'vitest'
import { fitText } from '~/utils/share'

const context = { measureText: (text: string) => ({ width: Array.from(text).length * 10 }) } as CanvasRenderingContext2D

describe('fitText', () => {
  it('keeps a text that fits', () => {
    expect(fitText(context, 'Paris', 50)).toBe('Paris')
  })

  it('cuts it short with an ellipsis', () => {
    expect(fitText(context, 'Montparnasse', 50)).toBe('Mont…')
  })

  it('never splits an emoji', () => {
    expect(fitText(context, 'Tour 🗼🗼🗼', 70)).toBe('Tour 🗼…')
  })
})
