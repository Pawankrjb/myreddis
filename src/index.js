import net from 'node:net';
import path from 'node:path';
import { parseEnv } from 'node:util';
import fs from 'node:fs';
import { database } from './database/database.js';
import { check, isvalid } from './utils/validation.js';
import { saveDatabase } from './database/persistence.js';
import { isvalidkey } from './utils/expiry.js';

// import { array } from 'node:stream/iter';


loadDatabase();

function loadDatabase(){
    if(!fs.existsSync('database.json')){
        return;
    }
    const data =JSON.parse(fs.readFileSync('database.json','utf-8'));
    for(const [key,entry] of Object.entries(data)){
        database.set(key,entry);
    }
}

setInterval(() => {
     let changed=false;
    for (const [key, entry] of database) {
       
        if (isExpired(entry)) {
            database.delete(key);
            changed=true;

        }
    }
    if(changed){
        saveDatabase();
    }
}, 1000);
const server = net.createServer((c) => {
    console.log('client connected');
    c.on('end', () => {
        console.log('client disconnected');
    });
    c.write('hello\r\n');
    c.on('data', (data) => {
        const command = data.toString().trim();
        const parts = command.split(' ');

        if (parts[0] === 'SET') {
             if (!check(parts, 3)) {
              c.write('Err wrong number of arguments\r\n');
             return;
           }
            const key = parts[1];
            const value = parts[2];
            
            database.set(key, { type: "string", value: value, expiry: null });
            saveDatabase();
            c.write('OK\r\n');
        }
        else if (parts[0] === 'GET') {
            if (!check(parts, 2)) {
              c.write('Err wrong number of arguments\r\n');
             return;
           }
            const key = parts[1];
            const entry = isvalidkey(key);

            if (!entry) {
                c.write('NULL\r\n');
            } else if (entry.type === 'string') {
                c.write(entry.value + '\r\n');
            }
            else {
                c.write('NULL\r\n');
            }

        }
        else if (parts[0] === 'DEL') {
            if (!check(parts, 2)) {
              c.write('Err wrong number of arguments\r\n');
             return;
           }
            const key = parts[1];
            const value = database.delete(key);

            if (value) {
                saveDatabase();
                c.write(1 + '\r\n');
            }
            else {
                c.write(0 + '\r\n');
            }
        }
        else if (parts[0] === 'EXISTS') {
            if (!check(parts, 2)) {
              c.write('Err wrong number of arguments\r\n');
             return;
           }
            const key = parts[1];

            const entry = isvalidkey(key)

            if (!entry) {
                c.write(0 + '\r\n');
            }
            else {
                c.write(1 + '\r\n');
            }


        }
        else if (parts[0] === 'KEYS') {
    if (!check(parts, 1)) {
              c.write('Err wrong number of arguments\r\n');
             return;
           }
            const value = database.keys()


            const currentTime = Date.now();
            if (value) {

                Array.from(value).forEach((key) => {
                    const entry = isvalidkey(key);
                    if (entry) {

                        c.write(key + '\r\n');
                    }
                });
            }
            else {
                c.write(0 + ' \r\n');
            }
        }
        else if (parts[0] === 'FLUSHALL') {
            database.clear();
            saveDatabase();
            c.write('OK\r\n');
        }

        else if (parts[0] === 'EXPIRE') {
            if (!check(parts, 3)) {
              c.write('Err wrong number of arguments\r\n');
             return;
           }
            const key = parts[1];
            const time = parts[2];
            if(!isvalid(time)){
                c.write('Invalid expire time');
                return;
            }
            const currentTime = Date.now();
            const entry = database.get(key);
            if (entry) {
                if (entry.expiry === null) {
                    entry.expiry = currentTime + time * 1000;
                    saveDatabase();
                    c.write(1 + '\r\n');
                } else {
                    if (entry.expiry < currentTime) {
                        database.delete(key);
                        saveDatabase();
                        c.write(0 + '\r\n');
                    }
                    else {
                        entry.expiry = currentTime + time * 1000;
                        saveDatabase();
                        c.write(1 + '\r\n');
                    }
                }
            }
            else {
                c.write(0 + '\r\n');
            }
        }
        else if (parts[0] === 'TTL') {
            if (!check(parts, 2)) {
              c.write('Err wrong number of arguments\r\n');
             return;
           }
            const key = parts[1];
            const entry = isvalidkey(key);

            const currentTime = Date.now();
            if (!entry) {
                c.write(-2 + '\r\n');
            }
            else if (entry.expiry === null) {
                c.write(-1 + '\r\n');
            } else {
                const timeleft = (entry.expiry - Date.now()) / 1000;
                c.write(Math.floor(timeleft) + '\r\n');
            }
        }
        else if (parts[0] === 'PERSIST') {
            if (!check(parts, 2)) {
              c.write('Err wrong number of arguments\r\n');
             return;
           }
            const key = parts[1];
            const entry = database.get(key);
            const currentTime = Date.now();

            if (entry) {

                if (entry.expiry === null) {
                    c.write(0 + '\r\n');

                } else {
                    if (entry.expiry < currentTime) {
                        database.delete(key);
                        saveDatabase()
                        c.write(0 + ' \r\n');
                    }
                    else {
                        entry.expiry = null;
                        saveDatabase();
                        c.write(1 + '\r\n');
                    }
                }
            }
            else {
                c.write(0 + '\r\n');
            }
        }
        else if (parts[0] === 'LPUSH') {
            if (!check(parts, 3)) {
              c.write('Err wrong number of arguments\r\n');
             return;
           }
            const key = parts[1];
            const value = parts[2];
            const entry = database.get(key);

            if (!entry) {
                database.set(key, { type: "list", value: [value], expiry: null })
                c.write(1 + '\r\n');
            }
            else if (entry.type === 'list') {

                entry.value.unshift(value);
                c.write(1 + '\r\n');
            }
            else {
                c.write(0 + '\r\n');
            }


        }

        else if (parts[0] === 'LRANGE') {
            if (!check(parts, 4)) {
              c.write('Err wrong number of arguments\r\n');
             return;
           }
            const key = parts[1];
            const start = Number(parts[2]);
            const end = Number(parts[3]);
           if(!isvalid(start)){
              c.write('invalid range\r\n');
                   return;
           }
           if(isNaN(end) ||end<-1){
             c.write('invalid range\r\n');
            return;
           }
            const entry = isvalidkey(key);

            if (entry) {
                if (entry.type === 'list') {
                    let result;
                    if (end === -1) {
                        result = entry.value.slice(start);
                    } else {
                        result = entry.value.slice(start, end + 1);
                    }
                    result.forEach((item) => {
                        c.write(item + '\r\n');
                    })

                }
                else {
                    c.write('NULL\r\n');
                }
            }
            else {
                c.write('NULL\r\n');
            }
        }
        else if (parts[0] === 'LPOP') {
            if (!check(parts, 2)) {
              c.write('Err wrong number of arguments\r\n');
             return;
           }
            const key = parts[1];
            const entry = isvalidkey(key);
            if (entry) {
                if (entry.type === 'list') {

                   
                    if (entry.value.length === 0) {
                        database.delete(key)
                        
                    }
                     const remove = entry.value.shift();
                    saveDatabase()
                    c.write(remove + '\r\n');
                }
                else {
                    c.write(0 + '\r\n');
                }
            }
            else {
                c.write(0 + '\r\n');
            }
        }
        else if (parts[0] === 'RPOP') {
            if (!check(parts, 2)) {
              c.write('Err wrong number of arguments\r\n');
             return;
           }
            const key = parts[1];
            const entry = isvalidkey(key);
            if (entry) {
                if (entry.type === 'list') {

                  
                    if (entry.value.length === 0) {

                        database.delete(key);
                    }
                      const remove = entry.value.pop();
                      saveDatabase();
                    c.write(remove + '\r\n');
                }
                else {
                    c.write(0 + '\r\n');
                }
            }
            else {
                c.write(0 + '\r\n');
            }
        }
        else if (parts[0] === 'RPUSH') {
            if (!check(parts, 3)) {
              c.write('Err wrong number of arguments\r\n');
             return;
           }
            const key = parts[1];
            const value = parts[2];
            const entry = isvalidkey(key);

            if (!entry) {
                database.set(key, { type: "list", value: [value], expiry: null })
                saveDatabase();
                c.write(1 + '\r\n');
            }
            else if (entry.type === 'list') {

                entry.value.push(value);
                saveDatabase();
                c.write(1 + '\r\n');
            }
            else {
                c.write(0 + '\r\n');
            }


        }
        else if (parts[0] === 'LLEN') {
            if (!check(parts, 2)) {
              c.write('Err wrong number of arguments\r\n');
             return;
           }
            const key = parts[1];
            const entry = isvalidkey(key);

            if (entry) {
                if (entry.type === 'list') {
                    c.write(entry.value.length + '\r\n');
                } else {
                    c.write(0 + '\r\n');
                }
            } else {
                c.write(0 + '\r\n');
            }
        }
        else if (parts[0] === 'HSET') {
            if (!check(parts, 4)) {
              c.write('Err wrong number of arguments\r\n');
             return;
           }
            const key = parts[1];
            const field = parts[2];
            const data = parts[3];
            const entry = isvalidkey(key);
            if (!entry) {
                database.set(key, {
                    type: "hash",
                    value: { [field]: data },
                    expiry: null
                })
                saveDatabase();
                c.write(1 + '\r\n');
            }
            else if (entry.type === 'hash') {
                entry.value[field] = data;
                saveDatabase();
                c.write(1 + '\r\n');
            }
            else {
                c.write(0 + '\r\n');
            }
        }
        else if (parts[0] == 'HGET') {
            if (!check(parts, 3)) {
              c.write('Err wrong number of arguments\r\n');
             return;
           }
            const key = parts[1];
            const field = parts[2];
            const entry = isvalidkey(key);
            if (entry) {
                if (entry.type === 'hash') {
                    const result = entry.value[field];
                    if (result !== undefined) {

                        c.write(result + '\r\n');

                    } else {

                        c.write('NULL\r\n');

                    }

                }
                else {
                    c.write('NULL\r\n');
                }
            }
            else {
                c.write('NULL\r\n');
            }
        }
        else if (parts[0] === 'HDEL') {
            if (!check(parts, 3)) {
              c.write('Err wrong number of arguments\r\n');
             return;
           }
            const key = parts[1];
            const field = parts[2];
            const entry = database.get(key);
            if (entry) {
                if (entry.type === 'hash') {
                    if (entry.value[field] !== undefined) {

                        delete entry.value[field];
                   

                        if (Object.keys(entry.value).length === 0) {
                            database.delete(key);
                        }
                    }
                         saveDatabase();
                    c.write(1 + '\r\n');
                }
                else {
                    c.write(0 + '\r\n');
                }

            }
            else {
                c.write(0 + '\r\n');
            }
        }
        else if (parts[0] === 'HGETALL') {
            if (!check(parts, 2)) {
              c.write('Err wrong number of arguments\r\n');
             return;
           }
            const key = parts[1];
            const entry = isvalidkey(key);
            if (entry) {
                if (entry.type === 'hash') {
                    for (const field in entry.value) {
                        c.write(field + '\r\n');
                        c.write(entry.value[field] + '\r\n');
                    }
                }
                else {
                    c.write(0 + '\r\n');
                }
            }
            else {
                c.write(0 + '\r\n');
            }
        }
        else if (parts[0] === 'HLEN') {
            if (!check(parts, 2)) {
              c.write('Err wrong number of arguments\r\n');
             return;
           }
            const key = parts[1];
            const entry = isvalidkey(key);

            if (entry) {
                if (entry.type === 'hash') {
                    c.write(Object.keys(entry.value).length + '\r\n');
                } else {
                    c.write(0 + '\r\n');
                }
            } else {
                c.write(0 + '\r\n');
            }
        }
        else {
            c.write('unknown command\r\n');
        }
        console.log(parts);
    });
});

server.on('error', (err) => {
    throw err;
});
server.listen(6379, () => {
    console.log('server bound at port 6379');
});

