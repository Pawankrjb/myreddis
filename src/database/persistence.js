 import { database } from './database.js';
 import fs from 'node:fs';
 export function saveDatabase(){
    const data=Object.fromEntries(database);
    fs.writeFileSync('database.json',JSON.stringify(data,null,2))
}