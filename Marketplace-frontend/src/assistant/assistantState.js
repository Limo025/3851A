function emptyResponseDetails() {
  return { inventorySummary: undefined, listings: [], draftReady: false };
}

export function initialChatState() {
  return {
    open: false,
    messages: [],
    workflow: { mode: null, stage: 'start', criteria: {}, draft: {} },
    loading: false,
    error: '',
    responseDetails: emptyResponseDetails(),
  };
}

export function assistantReducer(state, action) {
  switch (action.type) {
    case 'open':
      return { ...state, open: true };
    case 'close':
      // Keep the in-flight lock while the panel is closed. The original request
      // may still resolve, and allowing a second request would permit stale data
      // to overwrite the newer conversation state.
      return { ...state, open: false };
    case 'assistant-submitted':
      return {
        ...state,
        messages: [...state.messages, { role: 'user', content: action.payload.message }],
        loading: true,
        error: '',
        responseDetails: emptyResponseDetails(),
      };
    case 'assistant-received':
      return {
        ...state,
        messages: [...state.messages, { role: 'assistant', content: action.payload.message }],
        workflow: action.payload.state,
        loading: false,
        error: '',
        responseDetails: {
          inventorySummary: action.payload.inventorySummary,
          listings: action.payload.listings ?? [],
          draftReady: action.payload.draftReady ?? false,
        },
      };
    case 'assistant-failed':
      return { ...state, loading: false, error: action.payload.error, responseDetails: emptyResponseDetails() };
    case 'authentication-required':
      return { ...state, loading: false, error: action.payload.error, responseDetails: emptyResponseDetails() };
    case 'clear-error':
      return { ...state, error: '' };
    default:
      return state;
  }
}

export function buildAssistantPayload(state, message) {
  return {
    message: message.trim(),
    history: state.messages.slice(-10).map(({ role, content }) => ({ role, content })),
    state: state.workflow,
  };
}
