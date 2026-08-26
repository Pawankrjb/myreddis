import { database } from '../database/database.js';
import{saveDatabase} from '../database/persistence.js'
export function check(parts, required){
    return parts.length===required;
}
export function isvalid(value){
    return !isNaN(value)&& Number(value)>=0; 
}
