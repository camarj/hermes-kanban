import { describe, it, expect } from 'vitest'

describe('Example Unit Test', () => {
  it('should pass a simple test', () => {
    expect(true).toBe(true)
  })

  it('should handle basic math', () => {
    expect(2 + 2).toBe(4)
  })

  it('should work with strings', () => {
    const greeting = 'Hello Hermes'
    expect(greeting).toContain('Hermes')
    expect(greeting).toHaveLength(12)
  })
})
