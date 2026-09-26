import crypto from 'node:crypto';
const secret = process.argv[2];
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const head = b64({ alg: 'HS256', typ: 'JWT' }), body = b64({ role: 'anon', iss: 'local', exp: 4102444800 });
const sig = crypto.createHmac('sha256', secret).update(`${head}.${body}`).digest('base64url');
process.stdout.write(`${head}.${body}.${sig}`);
