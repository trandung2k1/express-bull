const Bull = require('bull');
const dotenv = require('dotenv');
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const { createBullBoard } = require('@bull-board/api');
const { BullAdapter } = require('@bull-board/api/bullAdapter');
const { ExpressAdapter } = require('@bull-board/express');
const Todo = require('./Todo.model');
const { todos } = require('./data');
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
const port = 4000;
dotenv.config();
const { REDIS_HOST, REDIS_PORT, MONGODB_URI } = process.env;
(async () => {
    try {
        await mongoose.connect(MONGODB_URI, {
            autoIndex: false,
            serverSelectionTimeoutMS: 4000,
            socketTimeoutMS: 45000,
        });
        console.log('Connected MongoDB successfully!!');
    } catch (error) {
        console.log('Message error: ' + error.message);
        console.log('Connected MongoDB failed!!');
        process.exit(0);
    }
})();
const redisOptions = {
    redis: { host: REDIS_HOST, port: REDIS_PORT },
};
// DEFINE QUEUE
const todoQueue = new Bull('todo', redisOptions);

const { addQueue, removeQueue, setQueues, replaceQueues } = createBullBoard({
    queues: [new BullAdapter(todoQueue)],
    serverAdapter: serverAdapter,
});

// REGISTER PROCESSER
async function insertRecord(item) {
    const record = new Todo({ title: item.title, completed: item.completed });
    return await record.save();
}
todoQueue.process((job, done) => {
    console.log('Preparing the todo!');
    const rows = job.data;
    while (job.data.length > 0) {
        try {
            const row = rows.shift();
            setTimeout(async () => {
                await insertRecord(row);
            }, 2000);
        } catch (error) {
            console.error(error);
            job.log(`const row error: ${error}`);
        }
    }
    setTimeout(() => {
        console.log('Todo ready!');
        done();
    }, 5000);
    job.progress(100 + '%');
});

app.use('/admin/queues', serverAdapter.getRouter());

//ADD JOB TO THE QUEUE
app.get('/', (req, res) => {
    todoQueue.add(todos);
    return res.status(200).json({
        msg: 'add job queue',
    });
});
app.get('/todos', async (req, res) => {
    const rs = await Todo.find();
    return res.status(200).json(rs);
});

app.get('/blocked', (req, res) => {
    let total = 0;
    for (let i = 0; i < 500000000000; i++) {
        total += i;
    }
    return res.status(200).json({ msg: 'blocked', total: total });
});

app.listen(port, function () {
    console.log(`App listening on http://localhost:${port}`);
});
// burgerQueue.add([
//   { bun: '🍔' },
//   { cheese: '🧀' },
//   { toppings: 'Oke' },
//   { bun: '🍔' },
//   { cheese: '🧀' },
//   { toppings: 'hehe' },
// ]);
