
import { database } from '../database/database.js';
import { saveDatabase } from '../database/persistence.js';
export function isvalidkey(key) {
    const entry = database.get(key);
    if (!entry) {
        return null;
    }
    if (isExpired(entry)) {
        database.delete(key);
        saveDatabase();
        return null;
    }
    return entry;
}
function isExpired(entry) {
    if (entry.expiry === null) {
        return false;
    }
    return entry.expiry < Date.now();
}

