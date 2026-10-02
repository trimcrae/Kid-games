// Local recovery navigation shared by the real house startup and its checks.
export function showSavedDataRecovery(container,gameMode){
  const link=document.createElement('a'),url=new URL('./activity.html',import.meta.url);
  if(gameMode)url.searchParams.set('from','game');
  link.href=url.href;link.textContent='Open saved-data recovery';
  link.style.display='inline-block';link.style.minHeight='44px';
  container.append(document.createElement('br'),link);
  return link;
}
