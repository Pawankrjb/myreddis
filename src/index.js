import net from 'node:net';
import path from 'node:path';
// import { array } from 'node:stream/iter';

const database= new Map();
const server= net.createServer((c) => {
    console.log('client connected');
    c.on('end', () => {
        console.log('client disconnected');
    });
    c.write('hello\r\n');
    c.on('data', (data) => {
        const command= data.toString().trim();
        const  parts= command.split(' ');
        if(parts[0]=== 'SET'){
           const key = parts[1];
            const value = parts[2];
            database.set(key, {value: value, expiry: null});
            c.write('OK\r\n');
        }
        else if(parts[0]=== 'GET'){
            const key = parts[1];
            const entry = database.get(key);
            if(entry){
                const currentTime = Date.now();
                if(entry.expiry && entry.expiry < currentTime){
                    database.delete(key);
                     c.write('NULL + \r\n');
                }
                else{
                    c.write(entry.value+'\r\n');
                }
               
            }else{
                c.write('NULL\r\n');
            }
        }
        else if(parts[0]==='DEL'){
            const key = parts[1];
            const value=database.delete(key);
            if(value){
                c.write(1+'\r\n');
            }
            else{
                c.write(0+'\r\n');
            }
        }
        else if(parts[0]==='EXISTS'){
            const key=parts[1];
            const value=database.has(key);
            if(value){
                c.write(1+'\r\n');
            }
            else{
                c.write(0+'\r\n');
            }
        }
        else if(parts[0]==='KEYS'){
           const value= database.keys();
           Array.from(value).forEach((key)=>{
            c.write(key+'\r\n');
           });
        }
        else if(parts[0]==='FLUSHDB'){
            database.clear();
            c.write('OK\r\n');
        }
        else if(parts[0]==='EXPIRE'){
            const key=parts[1];
            const time=parts[2];
            const entry=database.get(key);
             if(entry){
                entry.expiry=Date.now()+time*1000;
                c.write(1+'\r\n');
            }
            else{
                c.write(0+'\r\n');
            }
        }
        else if(parts[0]==='TTL'){
            const key=parts[1];
            const entry=database.get(key);
            const currentTime=Date.now();
            if(entry){
                 if(entry.expiry && entry.expiry < currentTime){
                    database.delete(key);
                     c.write(-2+' \r\n');
                }
              
               else if( entry.expiry>currentTime){
                const timeleft=(entry.expiry-currentTime)/1000;
                c.write(timeleft+'\r\n');
               }
               else{
                c.write(-1+'\r\n')
               }
            }else{
                c.write(-2+'\r\n');
            }

        }
        else if(parts[0]==='PERSIST'){
            const key=parts[1];
            const entry=database.get(key);
            
            if(entry){
                if(entry.expiry===null){
                c.write(0+'\r\n');
                
            }else{
                entry.expiry=null;
                c.write(1+'\r\n');
            }
            }
            else{
             c.write(0+'\r\n');
            }
        }
        else{
            c.write('unknown command\r\n');
        }
        console.log(parts);
    });
})
server.on('error', (err) => {
  throw err;
});
server.listen(6379, () => {
  console.log('server bound at port 6379');
});

