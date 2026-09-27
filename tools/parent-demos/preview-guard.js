// Parent-approved direct-link previews, deliberately absent from arcade discovery.
// These are unlisted, not authenticated: anyone with the link can play.
const localPreview = ['127.0.0.1', 'localhost', '[::1]'].includes(location.hostname)
  && ['http:', 'https:'].includes(location.protocol);
const hostedPreview = location.hostname === 'trimcrae.github.io' && location.protocol === 'https:';
export const previewAllowed = localPreview || hostedPreview;

if (previewAllowed) {
  document.getElementById('demo')?.removeAttribute('hidden');
  document.getElementById('preview-lock')?.remove();
} else {
  const lock = document.getElementById('preview-lock');
  if (lock) lock.textContent = 'Open this demo using the online parent-preview link or the local preview server.';
  document.getElementById('demo')?.remove();
}
