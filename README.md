# socialmedia chat backend

```bash
npm init -y
```

```bash
npm init -y
npm install socket.io express
npm install bcrypt cors dotenv ioredis jsonwebtoken pg swagger-ui-express yamljs
npm install -D typescript ts-node nodemon
npm install -D @types/node @types/express @types/cors @types/jsonwebtoken
npm install -D @types/bcrypt @types/pg @types/yamljs @types/swagger-ui-express
npm install -D @types/socket.io
```

```bash
psql -h 127.0.0.1 -p 5432 -d socialmedia_chat_database -U spc
```

```bash
openssl rand -base64 64
```

```powershell
$bytes = New-Object byte[] 64
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

```sql
UPDATE accounts
SET role = 'admin'
WHERE id = 1;
```

```sql
INSERT INTO chat_rooms
(id, "name", is_private)
VALUES(1, 'public', false);
```