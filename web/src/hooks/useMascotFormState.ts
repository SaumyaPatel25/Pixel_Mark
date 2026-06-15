import { useState, useEffect, useRef, useCallback } from 'react'
import { SentinelState } from '@/components/auth/PixelSentinel'

interface UseMascotFormStateProps {
  isSubmitting: boolean
  isSuccess: boolean
  isError: boolean
  passwordLength: number
  passwordStrength?: 'none' | 'weak' | 'strong'
}

export function useMascotFormState({
  isSubmitting,
  isSuccess,
  isError,
  passwordLength,
  passwordStrength = 'none',
}: UseMascotFormStateProps) {
  const [focusedField, setFocusedField] = useState<'email' | 'password' | 'other' | null>(null)
  const [isTyping, setIsTyping] = useState(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleFocus = useCallback((field: 'email' | 'password' | 'other') => {
    setFocusedField(field)
  }, [])

  const handleBlur = useCallback(() => {
    setFocusedField(null)
  }, [])

  const handleInputChange = useCallback(() => {
    setIsTyping(true)
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
    }, 600)
  }, [])

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])

  // Derive SentinelState
  let state: SentinelState = 'idle'

  if (isSuccess) {
    state = 'success'
  } else if (isSubmitting) {
    state = 'submitting'
  } else if (isError) {
    state = 'error'
  } else if (isTyping) {
    state = 'typing'
  } else if (focusedField === 'password') {
    if (passwordLength > 0) {
      state = passwordStrength === 'strong' ? 'valid' : 'weak'
    } else {
      state = 'passwordFocus'
    }
  } else if (focusedField === 'email') {
    state = 'emailFocus'
  } else {
    // Non-focused or other-focused state
    if (passwordLength > 0) {
      state = passwordStrength === 'strong' ? 'valid' : 'weak'
    } else {
      state = 'idle'
    }
  }

  return {
    mascotState: state,
    focusedField,
    emailProps: {
      onFocus: () => handleFocus('email'),
      onBlur: handleBlur,
      onChange: handleInputChange,
    },
    passwordProps: {
      onFocus: () => handleFocus('password'),
      onBlur: handleBlur,
      onChange: handleInputChange,
    },
    otherProps: {
      onFocus: () => handleFocus('other'),
      onBlur: handleBlur,
      onChange: handleInputChange,
    },
  }
}
