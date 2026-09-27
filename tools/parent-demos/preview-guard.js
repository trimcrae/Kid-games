// Deliberately local-only until a parent approves release into the arcade.
// This is a visibility gate, not authentication: the source is in the public repo.
export const previewAllowed = ['127.0.0.1', 'localhost', '[::1]'].includes(location.hostname)
  && ['http:', 'https:'].includes(location.protocol);

if (previewAllowed) {
  document.getElementById('demo')?.removeAttribute('hidden');
  document.getElementById('preview-lock')?.remove();
} else {
  const lock = document.getElementById('preview-lock');
  if (lock) lock.textContent = 'This demo is awaiting parent review. It is only available on the local preview server.';
  document.getElementById('demo')?.remove();
}
