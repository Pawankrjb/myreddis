import net from 'node:net';

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
            database.set(key, value);
            c.write('OK\r\n');
        }
        else if(parts[0]=== 'GET'){
            const key = parts[1];
            const value = database.get(key);
            if(value){
                c.write(value + '\r\n');
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
        else if(parts[0]==='KEY'){
           const  
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

