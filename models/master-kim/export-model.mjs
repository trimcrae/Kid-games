// Export the exact browser model specification for Blender or other tools.
import fs from 'node:fs';
import {kimModel,KIM} from '../../house-test/master-kim-layout.mjs?v=20261103-studio-life';
const path=process.argv[2];
if(!path)throw Error('Usage: node models/master-kim/export-model.mjs /absolute/model.json');
fs.writeFileSync(path,JSON.stringify({version:1,units:'metres',up:'Y',origin:KIM,...kimModel},null,2)+'\n');
console.log(path);
