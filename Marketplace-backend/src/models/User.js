import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    uid: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    username: { type: String, default: '' },
    avatar: { url: String, publicId: String },
    lastAppealAt: { type: Date, default: null },
    appeal: {
        reason: { type: String, maxlength: 2000 },
        status: { type: String, enum: ['pending', 'approved', 'rejected'] },
        submittedAt: Date,
        reviewedAt: Date,
    },
    isBanned: { type: Boolean, default: false },
    banReason: { type: String, default: '', trim: true, maxlength: 1000 },
    createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('User', userSchema);
