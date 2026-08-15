# MyRedis

A small Redis-like in-memory database server built from scratch using Node.js and TCP.

I built this project to understand how a database server works internally instead of only using Redis as a dependency.

The server accepts commands over a TCP connection and stores data in memory using JavaScript's `Map`.

## Features

- TCP-based client-server communication
- String data type
- List data type
- Hash data type
- Key expiration
- TTL and PERSIST support
- Background expiration cleanup
- File-based persistence
- Data restoration after server restart
- Redis-like command interface

## Supported Commands

### Strings

SET key value
GET key

Example:

SET name Pawan
GET name

### Lists

LPUSH key value
RPUSH key value
LPOP key
RPOP key
LLEN key
LRANGE key start end

Example:

LPUSH users Pawan
LPUSH users Rahul
LRANGE users 0 -1

### Hashes

HSET key field value
HGET key field
HDEL key field
HGETALL key
HLEN key

Example:

HSET user name Pawan
HSET user age 22
HGET user name

### Key Management

DEL key
EXISTS key
KEYS

### Expiration

EXPIRE key seconds
TTL key
PERSIST key

Example:

SET session abc
EXPIRE session 10
TTL session

After expiration:

GET session
NULL

## How It Works

Client
  |
  | TCP
  v
Node.js TCP Server
  |
  v
Command Parser
  |
  v
In-Memory Database
  Map()
  |
  +----------+----------+
  |          |          |
String      List       Hash
  |
  v
Expiration System
  |
  v
Persistence
  |
  v
database.json

## Data Storage

Each key stores an object containing its type, value and expiry time.

String:

{
    type: "string",
    value: "Pawan",
    expiry: null
}

List:

{
    type: "list",
    value: ["Pawan", "Rahul"],
    expiry: null
}

Hash:

{
    type: "hash",
    value: {
        name: "Pawan",
        age: "22"
    },
    expiry: null
}

## Expiration

Each database entry can have an expiry timestamp.

For example:

EXPIRE name 20

The server stores the expiry time using the current timestamp.

Before accessing a key, the server checks whether it has expired.

Expired keys are deleted automatically when accessed and are also removed by a background cleanup process.

Basic flow:

Key requested
     |
     v
Check key
     |
     v
Check expiry
   /       \
Expired    Valid
   |         |
   v         v
Delete     Return
   |
   v
NULL

## Persistence

The database is stored in memory using JavaScript's Map.

Without persistence, all data would disappear when the server stops.

To avoid this, the database is saved to database.json.

Saving:

Map
 |
 v
Object.fromEntries()
 |
 v
JSON.stringify()
 |
 v
database.json

Loading:

database.json
 |
 v
fs.readFileSync()
 |
 v
JSON.parse()
 |
 v
Object.entries()
 |
 v
Map

This allows the database to restore its previous state after a server restart.

## Project Structure

myreddis/
|
|-- src/
|   |-- index.js
|
|-- database.json
|-- package.json
|-- package-lock.json
|-- .gitignore
|-- README.md

## Requirements

- Node.js
- Netcat (nc)

## How to Run

1. Clone the repository:

git clone <your-github-repository-url>

cd myreddis

2. Install dependencies:

npm install

3. Start the server:

node src/index.js

The server runs on:

127.0.0.1:6379

4. Open another terminal and connect:

nc 127.0.0.1 6379

Now you can enter commands directly.

## Example Session

SET name Pawan
OK

GET name
Pawan

LPUSH users Rahul

1

LPUSH users Pawan

1

LRANGE users 0 -1
Pawan
Rahul

HSET student name Pawan
1

HSET student age 22
1

HGET student name
Pawan

HGETALL student
name
Pawan
age
22

HLEN student
2

EXPIRE name 5
1

TTL name
4

After expiration:

GET name
NULL

## Persistence Example

SET username Pawan
OK

Stop the server using:

Ctrl + C

Start it again:

node src/index.js

Then:

GET username
Pawan

The value is restored from database.json.

## Empty Collection Cleanup

When the last item is removed from a list, the key is deleted.

Example:

LPUSH users Pawan
1

LPOP users
Pawan

EXISTS users
0

Similarly, when the last field of a hash is deleted:

HSET user name Pawan
1

HDEL user name
1

EXISTS user
0

## Tech Stack

- Node.js
- JavaScript
- TCP
- JavaScript Map
- Node.js File System (fs)
- JSON
- Netcat

## Why I Built This

I wanted to understand what happens behind commands such as:

SET
GET
LPUSH
HSET
EXPIRE
TTL

Instead of only using Redis as a dependency, I tried to implement the basic ideas myself.

Through this project I worked with:

- TCP client-server communication
- Command parsing
- In-memory data structures
- String, List and Hash storage
- Key expiration
- Background cleanup
- File persistence
- Data restoration after restart

## Limitations

This is an educational Redis-like server and is not intended to replace Redis in production.

Some Redis features are not implemented yet:

- RESP protocol
- Authentication
- Replication
- Clustering
- Transactions
- Pub/Sub
- Advanced persistence mechanisms
- Many Redis commands

## Future Improvements

- Implement the RESP protocol
- Add automated tests
- Add more Redis commands
- Add more data types
- Improve persistence performance
- Add benchmarking
- Explore replication
- Support multiple server instances
- Improve error handling and command validation

## Learning Outcome

This project helped me understand how an in-memory database server can be built from the ground up using Node.js, TCP and basic data structures.

The goal was not to recreate the complete Redis implementation, but to understand the core ideas behind a Redis-like database server.

## License

This project is created for learning and experimentation.
