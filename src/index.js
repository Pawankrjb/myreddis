import net from 'node:net';
import path from 'node:path';
import { parseEnv } from 'node:util';
import fs from 'node:fs';
// import { array } from 'node:stream/iter';

const database = new Map();
loadDatabase();
function saveDatabase(){
    const data=Object.fromEntries(database);
    fs.writeFileSync('database.json',JSON.stringify(data,null,2))
}
function loadDatabase(){
    if(!fs.existsSync('database.json')){
        return;
    }
    const data =JSON.parse(fs.readFileSync('database.json','utf-8'));
    for(const [key,entry] of Object.entries(data)){
        database.set(key,entry);
    }
}
function isExpired(entry) {
    if (entry.expiry === null) {
        return false;
    }
    return entry.expiry < Date.now();
}
function isvalidkey(key) {
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
            const key = parts[1];
            const value = parts[2];
            database.set(key, { type: "string", value: value, expiry: null });
            saveDatabase();
            c.write('OK\r\n');
        }
        else if (parts[0] === 'GET') {
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
            const key = parts[1];
            const time = parts[2];
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
            const key = parts[1];
            const start = Number(parts[2]);
            const end = Number(parts[3]);

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

