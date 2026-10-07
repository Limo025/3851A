import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    uid: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    username: { type: String, default: '' },
    isBanned: { type: Boolean, default: false },
    banReason: { type: String, default: '', trim: true, maxlength: 1000 },
    createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('User', userSchema);
