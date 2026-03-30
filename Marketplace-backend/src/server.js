import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/mongodb.js';
import authRoutes from './routes/auth.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);

app.post('/hello', (req, res) => {
    console.log(req.body);
    res.send(`hello ${req.body.name}`);
});

connectDB().then(() => {
    app.listen(8000, () => {
        console.log('Server is listening on port 8000');
    });
});
