export const SAVE_KEY = 'parent-spellbound-v1';
export const freshState = () => ({ archive:false, roots:false, potion:false, complete:false, started:false });
export function normalizeState(value) {
  const s = freshState();
  if (!value || typeof value !== 'object') return s;
  s.started = value.started === true;
  s.archive = value.archive === true;
  s.roots = s.archive && value.roots === true;
  s.potion = s.roots && value.potion === true;
  s.complete = s.potion && value.complete === true;
  return s;
}
export function checkMixture(dew, mint) {
  if (dew + mint !== 6) return { correct:false, message:`You have ${dew + mint} drops. The recipe needs exactly 6 altogether. Try making two equal groups of 2 dew + 1 mint.` };
  if (dew !== mint * 2) return { correct:false, message:'Six drops is the right total! Now check the ratio: there must be twice as much stardew as moonmint. Each group has 2 dew and 1 mint.' };
  return { correct:true, message:'Perfect: 4 stardew + 2 moonmint. Two groups of (2 + 1) make 6, so the recipe keeps its 2 : 1 ratio.' };
}
export const correctOrder = order => order.length === 3 && order.join(',') === 'warm,stir,ring';
