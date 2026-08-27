export function createSidebarController({ sidebar, toggle, close }) {
  let isOpen = !sidebar.hidden;

  function setOpen(nextOpen, { restoreFocus = true } = {}) {
    isOpen = nextOpen;
    sidebar.hidden = !nextOpen;
    toggle.setAttribute('aria-expanded', String(nextOpen));

    if (nextOpen) {
      close.focus();
    } else if (restoreFocus) {
      toggle.focus();
    }
  }

  function handleKeyDown(event) {
    if (event.key !== 'Escape' || !isOpen) {
      return;
    }

    event.preventDefault();
    setOpen(false);
  }

  return {
    open: () => setOpen(true),
    close: (options) => setOpen(false, options),
    toggle: () => setOpen(!isOpen),
    handleKeyDown,
  };
}

export function initializeSidebar({ sidebar, toggle, close }) {
  const controller = createSidebarController({ sidebar, toggle, close });
  const handleToggle = () => controller.toggle();
  const handleClose = () => controller.close();

  toggle.addEventListener('click', handleToggle);
  close.addEventListener('click', handleClose);
  sidebar.addEventListener('keydown', controller.handleKeyDown);

  return () => {
    toggle.removeEventListener('click', handleToggle);
    close.removeEventListener('click', handleClose);
    sidebar.removeEventListener('keydown', controller.handleKeyDown);
  };
}
