import assert from 'node:assert/strict';
import {readStudio,saveStudio,studioKey} from '../house-test/taekwondo-uniform.mjs';

const initial={uniform:true,belt:'blue',signedIn:'2026-11-03'};
const values=new Map([[studioKey('cory'),JSON.stringify(initial)],[studioKey('ellie'),'private sibling bytes']]);
let failRead=false,failWrite=false,writes=0;
const storage={
  getItem(key){if(failRead)throw Error('Unavailable storage');return values.get(key)??null;},
  setItem(key,value){if(failWrite)throw Error('Full storage');writes++;values.set(key,value);}
};
const snapshot=()=>JSON.stringify([...values]);

// A failed read must never be mistaken for a new profile and written over.
failRead=true;
let before=snapshot();
assert.deepEqual(readStudio('cory',storage),{uniform:false,belt:'white',signedIn:null});
assert.throws(()=>saveStudio('cory',{belt:'red'},storage));
assert.equal(snapshot(),before);
assert.equal(writes,0);
failRead=false;

for(const raw of ['{ broken','null','[]','42','"text"','{"uniform":"yes"}','{"belt":"purple"}','{"signedIn":9}']){
  values.set(studioKey('cory'),raw);before=snapshot();
  assert.throws(()=>saveStudio('cory',{uniform:true},storage),raw);
  assert.equal(snapshot(),before,raw+' must remain recoverable');
}

values.set(studioKey('cory'),JSON.stringify(initial));failWrite=true;before=snapshot();
assert.throws(()=>saveStudio('cory',{belt:'red'},storage));
assert.equal(snapshot(),before);
failWrite=false;
assert.deepEqual(saveStudio('cory',{belt:'red'},storage),{...initial,belt:'red'});
assert.deepEqual(readStudio('cory',storage),{...initial,belt:'red'});
assert.equal(values.get(studioKey('ellie')),'private sibling bytes');

// Missing and valid older partial records remain supported.
assert.deepEqual(saveStudio('guest',{uniform:true},storage),{uniform:true,belt:'white',signedIn:null});
values.set(studioKey('guest'),'{"belt":"green"}');
assert.deepEqual(saveStudio('guest',{signedIn:'2026-11-06'},storage),{uniform:false,belt:'green',signedIn:'2026-11-06'});
assert.deepEqual(saveStudio('guest',{belt:'unknown'},storage),{uniform:false,belt:'white',signedIn:'2026-11-06'});

// Some privacy modes throw when the localStorage property itself is read.
const old=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
try{
  Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw Error('Storage disabled');}});
  assert.deepEqual(readStudio('cory'),{uniform:false,belt:'white',signedIn:null});
  assert.throws(()=>saveStudio('cory',{belt:'red'}));
}finally{if(old)Object.defineProperty(globalThis,'localStorage',old);else delete globalThis.localStorage;}
console.log('PASS studio save preservation: read errors, malformed records, write failures, retry, family isolation, partial records and disabled storage');
