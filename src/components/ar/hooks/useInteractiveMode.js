import { useState } from 'react'

export function useInteractiveMode() {
  const [interactiveMode, setInteractiveMode] = useState(false)
  return { interactiveMode, setInteractiveMode }
}
