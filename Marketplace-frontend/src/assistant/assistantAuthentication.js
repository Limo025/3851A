import { AuthenticationError } from '../auth/session.js';

const LOGIN_MESSAGE = 'Please log in to prepare a listing draft.';

export function handleAssistantAuthenticationError(error, {
  dispatch,
  navigate,
  returnPath,
}) {
  if (!(error instanceof AuthenticationError)) return false;
  if (error.code === 'ACCOUNT_BANNED') {
    dispatch({ type: 'authentication-required', payload: { error: error.message } });
    navigate('/appeal');
    return true;
  }

  dispatch({
    type: 'authentication-required',
    payload: { error: LOGIN_MESSAGE },
  });
  navigate('/login', {
    state: {
      from: returnPath,
      message: LOGIN_MESSAGE,
    },
  });
  return true;
}
