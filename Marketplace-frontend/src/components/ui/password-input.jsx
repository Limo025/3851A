import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

function PasswordInput({ id, disabled, ...props }) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="password-input">
      <Input {...props} id={id} disabled={disabled} type={visible ? 'text' : 'password'} />
      <Button
        type="button"
        variant="outline"
        className="password-input-toggle"
        disabled={disabled}
        aria-controls={id}
        aria-label={visible ? 'Hide password' : 'Show password'}
        onClick={() => setVisible(current => !current)}
      >
        {visible ? 'Hide' : 'Show'}
      </Button>
    </div>
  )
}

export { PasswordInput }
