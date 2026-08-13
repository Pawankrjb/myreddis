      else if (parts[0] === 'KEYS') {

            const value = database.keys()


            const currentTime = Date.now();
            if (value) {

                Array.from(value).forEach((key) => {
                    const entry = database.get(key);
                    if (entry.expiry && entry.expiry < currentTime) {
                        database.delete(key);

                    } else {
                        c.write(key + '\r\n');
                    }
                });
            }
            else {
                c.write(0 + ' \r\n');
            }
        }
