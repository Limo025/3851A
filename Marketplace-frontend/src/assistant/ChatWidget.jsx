import { useReducer, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthenticationError } from '../auth/session.js';
import { sendAssistantMessage } from './assistantApi.js';
import { assistantReducer, buildAssistantPayload, initialChatState } from './assistantState.js';
import ChatPanel from './ChatPanel.jsx';
import './assistant.css';

const EMPTY_RESPONSE = Object.freeze({
  inventorySummary: undefined,
  listings: [],
  draftReady: false,
});

export default function ChatWidget() {
  const [state, dispatch] = useReducer(assistantReducer, undefined, initialChatState);
  const [responseDetails, setResponseDetails] = useState(EMPTY_RESPONSE);
  const navigate = useNavigate();
  const location = useLocation();

  async function submit(message) {
    dispatch({ type: 'assistant-submitted', payload: { message } });

    try {
      const response = await sendAssistantMessage(buildAssistantPayload(state, message));
      setResponseDetails({
        inventorySummary: response.inventorySummary,
        listings: response.listings ?? [],
        draftReady: response.draftReady ?? false,
      });
      dispatch({ type: 'assistant-received', payload: response });
    } catch (error) {
      if (error instanceof AuthenticationError) {
        navigate('/login', {
          state: {
            from: location.pathname,
            message: 'Please log in to prepare a listing draft.',
          },
        });
        return;
      }

      dispatch({
        type: 'assistant-failed',
        payload: {
          error: error instanceof Error
            ? error.message
            : 'The assistant is temporarily unavailable.',
        },
      });
    }
  }

  function reviewDraft() {
    navigate('/sell', { state: { assistantDraft: state.workflow.draft } });
  }

  return (
    <div className="marketplace-assistant">
      <button
        className="marketplace-assistant__launcher"
        type="button"
        aria-expanded={state.open}
        aria-controls="marketplace-assistant-panel"
        onClick={() => dispatch({ type: state.open ? 'close' : 'open' })}
      >
        Assistant
      </button>
      {state.open ? (
        <ChatPanel
          {...state}
          {...responseDetails}
          onSubmit={submit}
          onClose={() => dispatch({ type: 'close' })}
          onReviewDraft={reviewDraft}
        />
      ) : null}
    </div>
  );
}
